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
            
            # FIX: result is a dict, not an object
            if not result["is_valid"]:
                return {
                    "is_valid": False,
                    "reason": result["reason"]
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
    def _add_exception_claim(
        claim_summaries: List[dict],
        data: dict,
        employee_id: str,
        claim_id: str,
        exc_type: str,
        reason: str
    ) -> None:
        """Append exception claim summary."""
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
            "quality_signals": {
                "exception_type": exc_type,
                "exception_reason": reason,
                "confidence": data.get("confidence"),
                "missing_fields": missing_fields,
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
    
    RESPONSIBILITIES:
    - Read claims and audit logs from storage
    - Compute all metrics fresh on every request
    - Return complete analytics JSON
    
    DOES NOT:
    - Store computed values
    - Maintain state
    - Trigger orchestrator
    
    TRIGGERED BY: Dashboard page load/refresh
    """
    
    def __init__(self, data_store: ClaimDataStore):
        self.data_store = data_store
    
    def get_full_analytics(self) -> dict:
        """
        Compute complete analytics from storage.
        
        Returns complete analytics report with all metrics.
        """
        claims = self.data_store.read_all_claims()
        audit_logs = self.data_store.read_all_audit_logs()
        
        return self._compute_analytics(claims, audit_logs)
    
    def get_employee_analytics(self, employee_id: str) -> dict:
        """Compute analytics for specific employee."""
        claims = self.data_store.read_claims_by_employee(employee_id)
        all_logs = self.data_store.read_all_audit_logs()
        audit_logs = [l for l in all_logs if l.get("employee_id") == employee_id]
        
        return self._compute_analytics(claims, audit_logs)
    
    def get_exception_summary(self) -> dict:
        """Get exception breakdown."""
        analytics = self.get_full_analytics()
        return analytics.get("exception_breakdown", {})
    
    def get_performance_metrics(self) -> dict:
        """Get performance metrics."""
        analytics = self.get_full_analytics()
        return analytics.get("performance_metrics", {})
    
    def _compute_analytics(self, claims: List[dict], audit_logs: List[dict]) -> dict:
        """
        Pure function to compute all analytics from claims and audit logs.
        
        Computes:
        - Processing metrics (counts, percentages)
        - Exception breakdown by type
        - Performance metrics (processing times)
        - API usage statistics
        - Agent behavior metrics
        - Timestamp information
        """
        
        # CLAIMS METRICS
        total_claims = len(claims)
        validated_claims = sum(
            1 for c in claims 
            if c.get("claim_status") == "READY_FOR_FINANCE_APPROVAL"
        )
        requires_review = sum(
            1 for c in claims 
            if c.get("claim_status") == "REQUIRES_REVIEW"
        )
        validation_rate = (validated_claims / total_claims * 100) if total_claims > 0 else 0
        
        # EXCEPTION BREAKDOWN
        exception_counts = defaultdict(int)
        for claim in claims:
            exc_type = claim.get("quality_signals", {}).get("exception_type")
            if exc_type:
                exception_counts[exc_type] += 1
        
        # PROCESSING TIME METRICS (per claim from audit logs)
        claim_processing_times = defaultdict(float)
        for log in audit_logs:
            claim_id = log.get("claim_id")
            proc_time = log.get("processing_time_seconds", 0)
            claim_processing_times[claim_id] += proc_time
        
        processing_times = list(claim_processing_times.values())
        
        avg_processing_time = sum(processing_times) / len(processing_times) if processing_times else None
        min_processing_time = min(processing_times) if processing_times else None
        max_processing_time = max(processing_times) if processing_times else None
        
        # API USAGE METRICS
        total_api_calls = 0
        api_calls_by_agent = defaultdict(int)
        api_calls_per_claim = defaultdict(int)
        
        for log in audit_logs:
            api_calls = log.get("api_calls", [])
            claim_id = log.get("claim_id")
            agent = log.get("agent")
            
            call_count = len(api_calls)
            total_api_calls += call_count
            api_calls_by_agent[agent] += call_count
            api_calls_per_claim[claim_id] += call_count
        
        # AGENT BEHAVIOR METRICS
        agent_executions = defaultdict(int)
        agent_success = defaultdict(int)
        agent_exceptions = defaultdict(int)
        
        for log in audit_logs:
            agent = log.get("agent")
            status = log.get("status")
            
            agent_executions[agent] += 1
            
            if status == "success":
                agent_success[agent] += 1
            elif status == "exception":
                agent_exceptions[agent] += 1
        
        # TIMESTAMP METRICS
        claim_timestamps = defaultdict(lambda: {"first": None, "last": None})
        
        for log in audit_logs:
            claim_id = log.get("claim_id")
            timestamp = log.get("timestamp")
            
            if not claim_timestamps[claim_id]["first"]:
                claim_timestamps[claim_id]["first"] = timestamp
            claim_timestamps[claim_id]["last"] = timestamp
        
        # BUILD COMPLETE ANALYTICS RESPONSE
        return {
            "processing_metrics": {
                "total_claims_processed": total_claims,
                "validated_claims": validated_claims,
                "requires_review_claims": requires_review,
                "validation_rate_percentage": round(validation_rate, 2)
            },
            "exception_breakdown": {
                "total_exceptions": requires_review,
                "exceptions_by_type": {
                    "SYSTEM_EXCEPTION": exception_counts.get("SYSTEM_EXCEPTION", 0),
                    "EXTRACTION_EXCEPTION": exception_counts.get("EXTRACTION_EXCEPTION", 0),
                    "CONFIDENCE_EXCEPTION": exception_counts.get("CONFIDENCE_EXCEPTION", 0),
                    "BUSINESS_EXCEPTION": exception_counts.get("BUSINESS_EXCEPTION", 0),
                    "DOCUMENT_TYPE_EXCEPTION": exception_counts.get("DOCUMENT_TYPE_EXCEPTION", 0),
                    "DUPLICATE_EXCEPTION": exception_counts.get("DUPLICATE_EXCEPTION", 0)
                }
            },
            "performance_metrics": {
                "total_processing_time_seconds": round(sum(processing_times), 3) if processing_times else None,
                "average_processing_time_seconds": round(avg_processing_time, 3) if avg_processing_time else None,
                "min_processing_time_seconds": round(min_processing_time, 3) if min_processing_time else None,
                "max_processing_time_seconds": round(max_processing_time, 3) if max_processing_time else None,
                "claim_processing_times": {
                    claim_id: round(time, 3) 
                    for claim_id, time in claim_processing_times.items()
                }
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
            "timestamps": {
                claim_id: {
                    "first_timestamp": ts["first"],
                    "last_timestamp": ts["last"]
                }
                for claim_id, ts in claim_timestamps.items()
            }
        }