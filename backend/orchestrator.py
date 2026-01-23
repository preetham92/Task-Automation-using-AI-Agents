import os
import json
import time
from datetime import datetime
from typing import List, Dict, Any, Optional
from collections import defaultdict

from agents.extraction_agent import extraction_agent
from agents.ingestion_agent import ingestion_agent
from agents.validation_agent import ValidationAgent
from agents.exception_agent import exception_agent


# ============================================================================
# UPLOAD FLOW: Document Processing Orchestrator
# ============================================================================

class DocumentProcessingOrchestrator:
    """
    Orchestrates the document upload and processing pipeline.
    
    RESPONSIBILITIES:
    - Coordinate agent calls for each uploaded document
    - Measure processing times
    - Capture audit events
    - Produce immutable claim summaries
    
    DOES NOT:
    - Compute analytics
    - Maintain counters
    - Aggregate data
    
    TRIGGERED BY: Document upload events
    """
    
    def __init__(self, input_folder: str, db_path: str = "data/expense_claims.csv"):
        self.input_folder = input_folder
        self.validator = ValidationAgent(db_path)
    
    def process_documents(self, employee_id: str, claim_id_prefix: str) -> Dict[str, Any]:
        """
        Process uploaded documents through the agent pipeline.
        
        Args:
            employee_id: Employee submitting the claim
            claim_id_prefix: Base claim ID for this upload batch
            
        Returns:
            {
                "status": "COMPLETED" | "FAILED",
                "processing_time_seconds": float,
                "documents_processed": int,
                "claim_summaries": List[dict],
                "audit_logs": List[dict]
            }
        """
        start_time = time.time()
        
        claim_summaries = []
        audit_logs = []
        
        documents = ingestion_agent(self.input_folder)
        
        if not documents:
            elapsed = time.time() - start_time
            return {
                "status": "FAILED",
                "reason": "No documents found in upload",
                "processing_time_seconds": round(elapsed, 3),
                "documents_processed": 0,
                "claim_summaries": [],
                "audit_logs": []
            }
        
        for idx, doc_info in enumerate(documents, 1):
            file_path = os.path.join(self.input_folder, doc_info['file'])
            unique_claim_id = f"{claim_id_prefix}_{idx:03d}"
            
            self._process_single_document(
                file_path=file_path,
                doc_type=doc_info['doc_type'],
                employee_id=employee_id,
                claim_id=unique_claim_id,
                claim_summaries=claim_summaries,
                audit_logs=audit_logs
            )
        
        elapsed = time.time() - start_time
        
        return {
            "status": "COMPLETED",
            "processing_time_seconds": round(elapsed, 3),
            "documents_processed": len(claim_summaries),
            "claim_summaries": claim_summaries,
            "audit_logs": audit_logs
        }
    
    def _process_single_document(
        self,
        file_path: str,
        doc_type: str,
        employee_id: str,
        claim_id: str,
        claim_summaries: List[dict],
        audit_logs: List[dict]
    ) -> None:
        """Process ONE document through the agent pipeline."""
        
        # STAGE 1: EXTRACTION
        extraction_start = time.time()
        extracted = extraction_agent(file_path, doc_type)
        extraction_time = time.time() - extraction_start
        
        if "error" in extracted:
            self._log_audit(
                audit_logs, claim_id, employee_id,
                agent="extraction_agent",
                action="extract",
                status="exception",
                confidence=extracted.get("confidence", 0),
                proc_time=extraction_time,
                api_calls=["ocr_api", "llm_api"],
                notes=extracted['error']
            )
            
            self._add_exception_claim(
                claim_summaries, extracted, employee_id, claim_id,
                exc_type="SYSTEM_EXCEPTION",
                reason=extracted['error']
            )
            return
        
        confidence = extracted.get("confidence", 0)
        
        self._log_audit(
            audit_logs, claim_id, employee_id,
            agent="extraction_agent",
            action="extract",
            status="success",
            confidence=confidence,
            proc_time=extraction_time,
            api_calls=["ocr_api", "llm_api"],
            notes=None
        )
        
        # STAGE 2: TECHNICAL VALIDATION
        tech_start = time.time()
        tech_result = self._validate_technical(extracted)
        tech_time = time.time() - tech_start
        
        if not tech_result["is_valid"]:
            exc_type = tech_result['exception_type']
            reason = tech_result['reason']
            
            self._log_audit(
                audit_logs, claim_id, employee_id,
                agent="technical_validation_agent",
                action="validate",
                status="exception",
                confidence=None,
                proc_time=tech_time,
                api_calls=[],
                notes=reason
            )
            
            self._add_exception_claim(
                claim_summaries, extracted, employee_id, claim_id,
                exc_type=exc_type,
                reason=reason
            )
            return
        
        self._log_audit(
            audit_logs, claim_id, employee_id,
            agent="technical_validation_agent",
            action="validate",
            status="success",
            confidence=None,
            proc_time=tech_time,
            api_calls=[],
            notes=None
        )
        
        # STAGE 3: BUSINESS VALIDATION
        business_start = time.time()
        business_result = self._validate_business(extracted)
        business_time = time.time() - business_start
        
        if not business_result["is_valid"]:
            reason = business_result['reason']
            
            self._log_audit(
                audit_logs, claim_id, employee_id,
                agent="business_validation_agent",
                action="validate",
                status="exception",
                confidence=None,
                proc_time=business_time,
                api_calls=["business_rules_engine"],
                notes=reason
            )
            
            self._add_exception_claim(
                claim_summaries, extracted, employee_id, claim_id,
                exc_type="BUSINESS_EXCEPTION",
                reason=reason
            )
            return
        
        self._log_audit(
            audit_logs, claim_id, employee_id,
            agent="business_validation_agent",
            action="validate",
            status="success",
            confidence=None,
            proc_time=business_time,
            api_calls=["business_rules_engine"],
            notes=None
        )
        
        # ALL STAGES PASSED
        self._add_validated_claim(
            claim_summaries, extracted, employee_id, claim_id
        )
    
    def _validate_technical(self, data: dict) -> dict:
        """Apply technical validation rules."""
        mandatory_fields = [
            "passenger_name",
            "ticket_number_or_pnr",
            "date",
            "from_location",
            "to_location"
        ]
        
        confidence = data.get("confidence", 0)
        if confidence < 0.7:
            return {
                "is_valid": False,
                "exception_type": "CONFIDENCE_EXCEPTION",
                "reason": f"Confidence too low: {confidence:.2f} (minimum: 0.70)"
            }
        
        missing = [
            field for field in mandatory_fields
            if not data.get(field) or str(data.get(field)).lower() == "null"
        ]
        
        if missing:
            return {
                "is_valid": False,
                "exception_type": "EXTRACTION_EXCEPTION",
                "reason": f"Missing mandatory fields: {', '.join(missing)}"
            }
        
        return {"is_valid": True}
    
    def _validate_business(self, data: dict) -> dict:
        """Apply business validation rules."""
        try:
            validation_input = {
                "passenger_name": data.get("passenger_name", ""),
                "date": data.get("date", ""),
                "fare_amount": self._parse_amount(data.get("fare_amount")),
                "ticket_number_or_pnr": data.get("ticket_number_or_pnr", ""),
                "from_location": data.get("from_location", ""),
                "to_location": data.get("to_location", ""),
                "doc_type": data.get("doc_type", "unknown"),
                "confidence": data.get("confidence", 0)
            }
            
            result = self.validator.validate(validation_input)
            
            # Handle both dict and object responses for backward compatibility
            if isinstance(result, dict):
                # New dict-based response
                if not result.get("is_valid", False):
                    return {
                        "is_valid": False,
                        "reason": result.get("reason", "Unknown validation error")
                    }
            else:
                # Legacy object-based response
                if not result.is_valid:
                    return {
                        "is_valid": False,
                        "reason": "; ".join(result.remarks) if hasattr(result, 'remarks') else "Validation failed"
                    }
            
            return {"is_valid": True}
            
        except Exception as e:
            return {
                "is_valid": False,
                "reason": f"Business validation error: {str(e)}"
            }
    
    def _parse_amount(self, value) -> float:
        """Parse currency amount from string."""
        if not value or str(value).lower() == "null":
            return 0.0
        try:
            cleaned = str(value).replace("₹", "").replace("$", "").replace(",", "").strip()
            return float(cleaned)
        except:
            return 0.0
    
    @staticmethod
    def _log_audit(
        audit_logs: List[dict],
        claim_id: str,
        employee_id: str,
        agent: str,
        action: str,
        status: str,
        confidence: Optional[float],
        proc_time: float,
        api_calls: List[str],
        notes: Optional[str]
    ) -> None:
        """Append single audit log entry."""
        audit_logs.append({
            "timestamp": datetime.now().isoformat(),
            "claim_id": claim_id,
            "employee_id": employee_id,
            "agent": agent,
            "action": action,
            "confidence_score": confidence,
            "processing_time_seconds": round(proc_time, 3),
            "api_calls": api_calls,
            "status": status,
            "notes": notes
        })
    
    @staticmethod
    def _add_exception_claim(claim_summaries: List[dict], data: dict, employee_id: str, claim_id: str, exc_type: str, reason: str) -> None:
        """Append exception claim summary WITH extracted data."""
        normalized = exception_agent(
            data={**data, "employee_id": employee_id, "claim_id": claim_id},
            validation={"reason": reason},
            exception_type=exc_type
        )
        
        missing_fields = normalized.get("exception", {}).get("missing_fields", [])
        
        claim_summaries.append({
            "claim_id": claim_id,
            "employee_id": employee_id,
            "claim_status": "REQUIRES_REVIEW",
            "travel_details": {
                # Save this so Analytics can see the 'estimated' cost
                "fare_amount": data.get("fare_amount"), 
                "doc_type": data.get("doc_type"),
                "date": data.get("date")
            },
            "quality_signals": {
                "exception_type": exc_type,
                "exception_reason": reason,
                "confidence": data.get("confidence"),
                "doc_type": data.get("doc_type")
            }
        })
    
    @staticmethod
    def _add_validated_claim(
        claim_summaries: List[dict],
        data: dict,
        employee_id: str,
        claim_id: str
    ) -> None:
        """Append validated claim summary."""
        claim_summaries.append({
            "claim_id": claim_id,
            "employee_id": employee_id,
            "claim_status": "READY_FOR_FINANCE_APPROVAL",
            "travel_details": {
                "passenger_name": data.get("passenger_name"),
                "ticket_number_or_pnr": data.get("ticket_number_or_pnr"),
                "date": data.get("date"),
                "from_location": data.get("from_location"),
                "to_location": data.get("to_location"),
                "fare_amount": data.get("fare_amount"),
                "doc_type": data.get("doc_type")
            },
            "quality_signals": {
                "confidence": data.get("confidence"),
                "exception_type": None,
                "exception_reason": None,
                "missing_fields": [],
                "doc_type": data.get("doc_type")
            }
        })


# ============================================================================
# PERSISTENCE LAYER: Individual File Storage
# ============================================================================

class ClaimDataStore:
    """
    Manages persistent storage with each entry as an individual file.
    
    STORAGE STRUCTURE:
    storage/
    ├── claims/
    │   ├── CLM2026001_001.json
    │   ├── CLM2026001_002.json
    └── audit_logs/
        ├── CLM2026001_001_extraction_agent_20260123143025.json
        └── ...
    """
    
    def __init__(self, storage_dir: str = "./data/storage"):
        self.storage_dir = storage_dir
        self.claims_dir = os.path.join(storage_dir, "claims")
        self.audit_dir = os.path.join(storage_dir, "audit_logs")
        
        os.makedirs(self.claims_dir, exist_ok=True)
        os.makedirs(self.audit_dir, exist_ok=True)
    
    def append_claims(self, claim_summaries: List[dict]) -> int:
        """Write claim summaries as individual files."""
        for claim in claim_summaries:
            claim_id = claim.get("claim_id", "UNKNOWN")
            filename = f"{claim_id}.json"
            filepath = os.path.join(self.claims_dir, filename)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(claim, f, indent=2, ensure_ascii=False)
        
        return len(claim_summaries)
    
    def append_audit_logs(self, audit_logs: List[dict]) -> int:
        """Write audit logs as individual files."""
        for log in audit_logs:
            claim_id = log.get("claim_id", "UNKNOWN")
            agent = log.get("agent", "unknown_agent")
            timestamp = log.get("timestamp", datetime.now().isoformat())
            
            ts_safe = timestamp.replace(":", "").replace("-", "").split(".")[0]
            
            filename = f"{claim_id}_{agent}_{ts_safe}.json"
            filepath = os.path.join(self.audit_dir, filename)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(log, f, indent=2, ensure_ascii=False)
        
        return len(audit_logs)
    
    def read_all_claims(self) -> List[dict]:
        """Read all claim summaries from individual files."""
        claims = []
        
        if not os.path.exists(self.claims_dir):
            return claims
        
        for filename in sorted(os.listdir(self.claims_dir)):
            if filename.endswith('.json'):
                filepath = os.path.join(self.claims_dir, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        claims.append(json.load(f))
                except Exception:
                    pass
        
        return claims
    
    def read_all_audit_logs(self) -> List[dict]:
        """Read all audit logs from individual files."""
        logs = []
        
        if not os.path.exists(self.audit_dir):
            return logs
        
        for filename in sorted(os.listdir(self.audit_dir)):
            if filename.endswith('.json'):
                filepath = os.path.join(self.audit_dir, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        logs.append(json.load(f))
                except Exception:
                    pass
        
        return logs
    
    def read_claims_by_employee(self, employee_id: str) -> List[dict]:
        """Read claims for specific employee."""
        all_claims = self.read_all_claims()
        return [c for c in all_claims if c.get("employee_id") == employee_id]
    
    def read_claims_by_status(self, status: str) -> List[dict]:
        """Read claims with specific status."""
        all_claims = self.read_all_claims()
        return [c for c in all_claims if c.get("claim_status") == status]
    
    def get_claim_by_id(self, claim_id: str) -> Optional[dict]:
        """Read a specific claim by ID."""
        filename = f"{claim_id}.json"
        filepath = os.path.join(self.claims_dir, filename)
        
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        return None
    
    def get_audit_logs_for_claim(self, claim_id: str) -> List[dict]:
        """Read all audit logs for a specific claim."""
        logs = []
        
        if not os.path.exists(self.audit_dir):
            return logs
        
        for filename in sorted(os.listdir(self.audit_dir)):
            if filename.startswith(claim_id) and filename.endswith('.json'):
                filepath = os.path.join(self.audit_dir, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        logs.append(json.load(f))
                except Exception:
                    pass
        
        return logs


# ============================================================================
# DASHBOARD FLOW: Analytics Service (Pure Computation from Storage)
# ============================================================================

class AnalyticsService:
    """
    Generates analytics dynamically from storage.
    """
    
    def __init__(self, data_store: ClaimDataStore):
        self.data_store = data_store
    
    def get_full_analytics(self) -> dict:
        claims = self.data_store.read_all_claims()
        audit_logs = self.data_store.read_all_audit_logs()
        return self._compute_analytics(claims, audit_logs)
    
    def get_employee_analytics(self, employee_id: str) -> dict:
        claims = self.data_store.read_claims_by_employee(employee_id)
        all_logs = self.data_store.read_all_audit_logs()
        audit_logs = [l for l in all_logs if l.get("employee_id") == employee_id]
        return self._compute_analytics(claims, audit_logs)

    def _compute_analytics(self, claims: List[dict], audit_logs: List[dict]) -> dict:
        """
        Calculates all metrics in a single pass for efficiency.
        """
        # --- 1. INITIALIZE DATA STRUCTURES ---
        total_claims = len(claims)
        validated_claims = 0
        requires_review = 0
        
        by_type_map = defaultdict(float)
        timeline_data = []
        exception_counts = defaultdict(int)
        
        claim_processing_times = defaultdict(float)
        total_api_calls = 0
        api_calls_by_agent = defaultdict(int)
        api_calls_per_claim = defaultdict(int)
        
        agent_executions = defaultdict(int)
        agent_success = defaultdict(int)
        agent_exceptions = defaultdict(int)
        
        claim_timestamps = defaultdict(lambda: {"first": None, "last": None})

        # --- 2. PROCESS CLAIMS DATA ---
        for claim in claims:
            status = claim.get("claim_status")
            if status == "READY_FOR_FINANCE_APPROVAL":
                validated_claims += 1
            else:
                requires_review += 1
            
            # --- IMPROVED AGGREGATION LOGIC ---
            details = claim.get("travel_details", {})
            quality = claim.get("quality_signals", {})
            
            # 1. Fallback for doc_type
            doc_type = details.get("doc_type") or quality.get("doc_type") or "other"
            
            # 2. Robust amount parsing
            try:
                # Check travel_details first, then quality_signals for raw extracted data
                raw_amt = details.get("fare_amount") or quality.get("fare_amount") or 0
                
                # Sanitize the string (remove symbols and commas)
                if isinstance(raw_amt, str):
                    clean_amt = raw_amt.replace("₹", "").replace("$", "").replace(",", "").strip()
                    amount = float(clean_amt) if clean_amt else 0.0
                else:
                    amount = float(raw_amt)
            except (ValueError, TypeError):
                amount = 0.0

            clean_type = str(doc_type).replace("_", " ").title()
            by_type_map[clean_type] += amount

            # 3. Timeline Data with fallback date
            date_val = details.get("date") or quality.get("date")
            if date_val and str(date_val).lower() != "null":
                timeline_data.append({"date": date_val, "amount": amount})
            # ----------------------------------

            # Exception Counts
            exc_type = quality.get("exception_type")
            if exc_type:
                exception_counts[exc_type] += 1

        # --- 3. PROCESS AUDIT LOGS ---
        for log in audit_logs:
            c_id = log.get("claim_id")
            agent = log.get("agent")
            status = log.get("status")
            ts = log.get("timestamp")
            calls = log.get("api_calls", [])

            # Processing Times
            proc_time = log.get("processing_time_seconds", 0)
            claim_processing_times[c_id] += proc_time

            # API Usage
            call_count = len(calls)
            total_api_calls += call_count
            api_calls_by_agent[agent] += call_count
            api_calls_per_claim[c_id] += call_count

            # Agent Behavior
            agent_executions[agent] += 1
            if status == "success":
                agent_success[agent] += 1
            else:
                agent_exceptions[agent] += 1

            # Timestamps
            if not claim_timestamps[c_id]["first"]:
                claim_timestamps[c_id]["first"] = ts
            claim_timestamps[c_id]["last"] = ts

        # --- 4. FINAL CALCULATIONS ---
        validation_rate = (validated_claims / total_claims * 100) if total_claims > 0 else 0
        timeline_data.sort(key=lambda x: x['date'])
        
        proc_list = list(claim_processing_times.values())
        avg_proc = sum(proc_list) / len(proc_list) if proc_list else 0

        # --- 5. RETURN UNIFIED RESPONSE ---
        return {
            "processing_metrics": {
                "total_claims_processed": total_claims,
                "validated_claims": validated_claims,
                "requires_review_claims": requires_review,
                "validation_rate_percentage": round(validation_rate, 2)
            },
            "expense_by_type": [{"type": k, "amount": round(v, 2)} for k, v in by_type_map.items()],
            "expense_timeline": timeline_data,
            "exception_breakdown": {
                "total_exceptions": requires_review,
                "exceptions_by_type": dict(exception_counts)
            },
            "performance_metrics": {
                "total_processing_time_seconds": round(sum(proc_list), 3) if proc_list else 0,
                "average_processing_time_seconds": round(avg_proc, 3),
                "claim_processing_times": {k: round(v, 3) for k, v in claim_processing_times.items()}
            },
            "api_usage": {
                "total_api_calls": total_api_calls,
                "api_calls_by_agent": dict(api_calls_by_agent),
                "api_calls_per_claim": dict(api_calls_per_claim)
            },
            "agent_behavior": {
                "agent_executions": dict(agent_executions),
                "agent_success_count": dict(agent_success),
                "agent_exception_count": dict(agent_exceptions)
            },
            "timestamps": dict(claim_timestamps)
        }