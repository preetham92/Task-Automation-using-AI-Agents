import shutil
import os
import json
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List

from orchestrator import (
    DocumentProcessingOrchestrator,
    ClaimDataStore,
    AnalyticsService
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080/", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMP_DIR = os.path.join(BASE_DIR, "temp")
STORAGE_DIR = os.path.join(BASE_DIR, "data", "storage")
DISCARDED_DIR = os.path.join(STORAGE_DIR, "discarded")
INPUT_DIR = os.path.join(TEMP_DIR, "input_docs")
SUBMISSIONS_DIR = os.path.join(BASE_DIR, "data", "submissions")

os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(INPUT_DIR, exist_ok=True)
os.makedirs(DISCARDED_DIR, exist_ok=True)
os.makedirs(SUBMISSIONS_DIR, exist_ok=True)

orchestrator = DocumentProcessingOrchestrator(
    input_folder=INPUT_DIR,
    db_path=os.path.join(BASE_DIR, "data", "expense_claims.csv")
)

data_store = ClaimDataStore(storage_dir=STORAGE_DIR)
analytics_service = AnalyticsService(data_store)


# Pydantic model for employee verification
class EmployeeVerification(BaseModel):
    employee_id: str
    employee_name: str
    employee_role: str
    ticket_number_or_pnr: str
    source: str
    destination: str
    travel_start_date: str
    travel_end_date: str
    total_amount: float


# Pydantic model for confirm submission
class ConfirmSubmission(BaseModel):
    employee_id: str
    employee_name: str
    employee_role: str
    ticket_number_or_pnr: str
    source: str
    destination: str
    travel_start_date: str
    travel_end_date: str
    total_amount: float
    filename: str


# Pydantic model for finance decision
class FinanceDecision(BaseModel):
    decision: str  # "APPROVED" or "REJECTED"
    approved_amount: Optional[float] = None
    notes: Optional[str] = None


def generate_claim_id() -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    return f"CLM{timestamp}"


def discard_existing_claim(ticket_number: str):
    """
    Move existing active claim with same ticket number to discarded/ directory
    and mark as DISCARDED
    """
    if not ticket_number:
        return
    
    # Find existing claim with this ticket number
    all_claims = data_store.read_all_claims()
    existing_claim = None
    
    for claim in all_claims:
        travel_details = claim.get("travel_details", {})
        claim_ticket = travel_details.get("ticket_number_or_pnr", "")
        if claim_ticket == ticket_number and claim.get("claim_status") != "DISCARDED":
            existing_claim = claim
            break
    
    if existing_claim:
        claim_id = existing_claim.get("claim_id")
        
        # Update claim status to DISCARDED
        data_store.update_claim(claim_id, {
            "claim_status": "DISCARDED",
            "discarded_at": datetime.now().isoformat(),
            "discarded_reason": "Replaced by new upload with same ticket number"
        })
        
        # Move claim file to discarded directory if it exists
        claim_file = os.path.join(STORAGE_DIR, f"{claim_id}.json")
        if os.path.exists(claim_file):
            discarded_file = os.path.join(DISCARDED_DIR, f"{claim_id}.json")
            shutil.move(claim_file, discarded_file)
        
        # Create audit log for discard action
        audit_log = {
            "timestamp": datetime.now().isoformat(),
            "claim_id": claim_id,
            "employee_id": existing_claim.get("employee_id"),
            "agent": "system",
            "action": "discard",
            "confidence_score": None,
            "processing_time_seconds": 0.0,
            "api_calls": [],
            "status": "discarded",
            "notes": f"Discarded due to duplicate ticket number: {ticket_number}"
        }
        data_store.append_audit_logs([audit_log])


@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    employee_id: str = "EMP001"
):
    """
    Upload and extract employee/travel details from document.
    Returns employee-focused verification object for user review.
    Does NOT persist claim or show claim-related data.
    The uploaded file is kept in temp directory for later confirmation.
    """
    temp_path = None
    claim_id_prefix = generate_claim_id()
    
    try:
        temp_path = os.path.join(INPUT_DIR, file.filename)
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Process document to extract fields
        result = orchestrator.process_documents(
            employee_id=employee_id,
            claim_id_prefix=claim_id_prefix
        )

        if result["status"] == "FAILED":
            # Clean up temp file on failure
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
            return {
                "status": "error",
                "message": result.get("reason", "Processing failed")
            }

        claim_summary = result["claim_summaries"][0] if result["claim_summaries"] else None
        
        if not claim_summary:
            # Clean up temp file on failure
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
            return {
                "status": "error",
                "message": "No data could be extracted from the document"
            }

        # Extract travel details
        travel_details = claim_summary.get("travel_details", {})
        
        # Parse fare amount
        fare_amount_raw = travel_details.get("fare_amount", "0")
        try:
            total_amount = float(
                str(fare_amount_raw)
                .replace("₹", "")
                .replace("$", "")
                .replace(",", "")
                .strip()
            )
        except:
            total_amount = 0.0

        # Return ONLY employee-focused verification object
        # Keep the file in temp directory - don't delete it yet
        return {
            "status": "extracted",
            "message": "Document processed. Please verify the extracted details below.",
            "employee_verification": {
                "employee_id": employee_id,
                "employee_name": travel_details.get("passenger_name", ""),
                "employee_role": claim_summary.get("employee_role", ""),
                "ticket_number_or_pnr": travel_details.get("ticket_number_or_pnr", ""),
                "source": travel_details.get("from_location", ""),
                "destination": travel_details.get("to_location", ""),
                "travel_start_date": travel_details.get("travel_start", ""),
                "travel_end_date": travel_details.get("travel_end", ""),
                "total_amount": total_amount
            },
            "filename": file.filename  # Return filename for confirmation
        }

    except Exception as e:
        # Clean up temp file on error
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        return {
            "status": "error",
            "message": str(e)
        }


@app.post("/confirm")
async def confirm_submission(submission: ConfirmSubmission):
    """
    Confirm and persist verified employee details and uploaded document.
    
    Workflow:
    1. Generate unique claim_id
    2. Create submission directory: data/submissions/<claim_id>/
    3. Move uploaded document from temp to submission directory
    4. Save metadata.json with all verified details
    5. Return success response
    
    Does NOT:
    - Re-extract data
    - Re-validate data
    - Update expense_claims.csv
    - Trigger analytics
    """
    try:
        # Step 1: Generate unique claim ID
        claim_id = generate_claim_id()
        
        # Step 2: Create submission directory
        submission_dir = os.path.join(SUBMISSIONS_DIR, claim_id)
        os.makedirs(submission_dir, exist_ok=True)
        
        # Step 3: Move uploaded document from temp to submission directory
        temp_file_path = os.path.join(INPUT_DIR, submission.filename)
        
        if not os.path.exists(temp_file_path):
            raise HTTPException(
                status_code=404, 
                detail=f"Uploaded file '{submission.filename}' not found. Please re-upload."
            )
        
        # Get file extension
        file_ext = os.path.splitext(submission.filename)[1]
        document_path = os.path.join(submission_dir, f"document{file_ext}")
        
        # Move file from temp to submission directory
        shutil.move(temp_file_path, document_path)
        
        # Step 4: Create metadata.json
        metadata = {
            "claim_id": claim_id,
            "employee_id": submission.employee_id,
            "employee_name": submission.employee_name,
            "employee_role": submission.employee_role,
            "ticket_number_or_pnr": submission.ticket_number_or_pnr,
            "source": submission.source,
            "destination": submission.destination,
            "travel_start_date": submission.travel_start_date,
            "travel_end_date": submission.travel_end_date,
            "total_amount": submission.total_amount,
            "status": "PENDING_FINANCE_REVIEW",
            "submission_timestamp": datetime.now().isoformat(),
            "document_filename": f"document{file_ext}",
            "original_filename": submission.filename
        }
        
        metadata_path = os.path.join(submission_dir, "metadata.json")
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)
        
        # Step 5: Return success response
        return {
            "status": "success",
            "message": "Document and details saved successfully for finance review",
            "claim_id": claim_id,
            "submission": {
                "employee_id": submission.employee_id,
                "employee_name": submission.employee_name,
                "ticket_number": submission.ticket_number_or_pnr,
                "total_amount": submission.total_amount,
                "status": "PENDING_FINANCE_REVIEW"
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========== FINANCE REVIEW ENDPOINTS ==========

@app.get("/submissions")
async def get_all_submissions():
    """
    Get all submissions by reading metadata.json files from submissions directory.
    Returns list of submissions with their metadata.
    """
    try:
        submissions = []
        
        # Check if submissions directory exists
        if not os.path.exists(SUBMISSIONS_DIR):
            return {
                "status": "success",
                "count": 0,
                "submissions": []
            }
        
        # Iterate through all subdirectories in submissions
        for claim_id in os.listdir(SUBMISSIONS_DIR):
            submission_dir = os.path.join(SUBMISSIONS_DIR, claim_id)
            
            # Skip if not a directory
            if not os.path.isdir(submission_dir):
                continue
            
            # Read metadata.json
            metadata_path = os.path.join(submission_dir, "metadata.json")
            if os.path.exists(metadata_path):
                with open(metadata_path, "r") as f:
                    metadata = json.load(f)
                    submissions.append(metadata)
        
        # Sort by submission_timestamp (most recent first)
        submissions.sort(
            key=lambda x: x.get("submission_timestamp", ""),
            reverse=True
        )
        
        return {
            "status": "success",
            "count": len(submissions),
            "submissions": submissions
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/submissions/{claim_id}")
async def get_submission(claim_id: str):
    """
    Get a specific submission's metadata and document URL.
    """
    try:
        submission_dir = os.path.join(SUBMISSIONS_DIR, claim_id)
        
        # Check if submission exists
        if not os.path.exists(submission_dir):
            raise HTTPException(
                status_code=404,
                detail=f"Submission {claim_id} not found"
            )
        
        # Read metadata
        metadata_path = os.path.join(submission_dir, "metadata.json")
        if not os.path.exists(metadata_path):
            raise HTTPException(
                status_code=404,
                detail=f"Metadata for submission {claim_id} not found"
            )
        
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
        
        # Add document URL
        document_filename = metadata.get("document_filename", "")
        metadata["document_url"] = f"/submissions/{claim_id}/document"
        
        return {
            "status": "success",
            "submission": metadata
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/submissions/{claim_id}/document")
async def get_submission_document(claim_id: str):
    """
    Serve the uploaded document file for a submission.
    """
    try:
        submission_dir = os.path.join(SUBMISSIONS_DIR, claim_id)
        
        # Check if submission exists
        if not os.path.exists(submission_dir):
            raise HTTPException(
                status_code=404,
                detail=f"Submission {claim_id} not found"
            )
        
        # Read metadata to get document filename
        metadata_path = os.path.join(submission_dir, "metadata.json")
        if not os.path.exists(metadata_path):
            raise HTTPException(
                status_code=404,
                detail=f"Metadata for submission {claim_id} not found"
            )
        
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
        
        document_filename = metadata.get("document_filename", "")
        document_path = os.path.join(submission_dir, document_filename)
        
        if not os.path.exists(document_path):
            raise HTTPException(
                status_code=404,
                detail=f"Document file not found for submission {claim_id}"
            )
        
        return FileResponse(
            document_path,
            media_type="application/octet-stream",
            filename=metadata.get("original_filename", document_filename)
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/submissions/{claim_id}/decision")
async def submit_finance_decision(claim_id: str, decision: FinanceDecision):
    """
    Finance team approves or rejects a submission.
    Updates metadata.json with decision, approved_amount, and notes.
    """
    try:
        submission_dir = os.path.join(SUBMISSIONS_DIR, claim_id)
        
        # Check if submission exists
        if not os.path.exists(submission_dir):
            raise HTTPException(
                status_code=404,
                detail=f"Submission {claim_id} not found"
            )
        
        # Read current metadata
        metadata_path = os.path.join(submission_dir, "metadata.json")
        if not os.path.exists(metadata_path):
            raise HTTPException(
                status_code=404,
                detail=f"Metadata for submission {claim_id} not found"
            )
        
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
        
        # Validate decision
        if decision.decision not in ["APPROVED", "REJECTED"]:
            raise HTTPException(
                status_code=400,
                detail="Decision must be either 'APPROVED' or 'REJECTED'"
            )
        
        # Update metadata with finance decision
        metadata["status"] = decision.decision
        metadata["finance_decision_timestamp"] = datetime.now().isoformat()
        metadata["finance_notes"] = decision.notes or ""
        
        if decision.decision == "APPROVED":
            # Approved amount must be provided for approval
            if decision.approved_amount is None:
                raise HTTPException(
                    status_code=400,
                    detail="Approved amount is required for approval"
                )
            metadata["approved_amount"] = decision.approved_amount
        else:
            # For rejection, approved amount is 0
            metadata["approved_amount"] = 0.0
        
        # Write updated metadata
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)
        
        return {
            "status": "success",
            "message": f"Submission {decision.decision.lower()} successfully",
            "claim_id": claim_id,
            "decision": decision.decision,
            "approved_amount": metadata["approved_amount"]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========== LEGACY ENDPOINTS (UNCHANGED) ==========

@app.post("/verify-and-submit")
async def verify_and_submit(verification: EmployeeVerification):
    """
    Legacy endpoint - kept for backward compatibility.
    Final verification and submission step.
    
    Workflow:
    1. Discard any existing active claim with same ticket_number_or_pnr
    2. Create new claim with verified/edited data
    3. Run business validation
    4. Persist claim with appropriate status
    5. Log audit trail
    """
    try:
        # Step 1: Discard existing claim with same ticket number
        discard_existing_claim(verification.ticket_number_or_pnr)
        
        # Step 2: Generate new claim ID
        claim_id = generate_claim_id()
        
        # Step 3: Build claim object from verified data
        claim_data = {
            "claim_id": claim_id,
            "employee_id": verification.employee_id,
            "employee_name": verification.employee_name,
            "employee_role": verification.employee_role,
            "travel_details": {
                "passenger_name": verification.employee_name,
                "ticket_number_or_pnr": verification.ticket_number_or_pnr,
                "from_location": verification.source,
                "to_location": verification.destination,
                "travel_start": verification.travel_start_date,
                "travel_end": verification.travel_end_date,
                "fare_amount": str(verification.total_amount),
                "doc_type": "verified_upload"
            },
            "claim_status": "PENDING_VALIDATION",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        # Step 4: Run business validation (basic validation)
        validation_result = {"success": True, "reason": ""}
        
        # Basic validation checks
        if not verification.employee_name or not verification.ticket_number_or_pnr:
            validation_result = {
                "success": False,
                "reason": "Missing required fields: employee_name or ticket_number"
            }
        elif verification.total_amount <= 0:
            validation_result = {
                "success": False,
                "reason": "Invalid amount: must be greater than 0"
            }
        elif not verification.source or not verification.destination:
            validation_result = {
                "success": False,
                "reason": "Missing travel locations"
            }
        elif not verification.travel_start_date or not verification.travel_end_date:
            validation_result = {
                "success": False,
                "reason": "Missing travel dates"
            }
        
        # Step 5: Update claim status based on validation
        if validation_result.get("success", False):
            claim_data["claim_status"] = "READY_FOR_FINANCE_APPROVAL"
            claim_data["quality_signals"] = {
                "confidence": 1.0,
                "exception_type": None,
                "exception_reason": None,
                "missing_fields": [],
                "doc_type": "verified_upload"
            }
            status_message = "Claim verified and submitted successfully"
        else:
            claim_data["claim_status"] = "REQUIRES_REVIEW"
            claim_data["quality_signals"] = {
                "confidence": 1.0,
                "exception_type": "BUSINESS_EXCEPTION",
                "exception_reason": validation_result.get("reason", "Validation failed"),
                "missing_fields": [],
                "doc_type": "verified_upload"
            }
            status_message = validation_result.get("reason", "Validation failed - requires review")
        
        # Step 6: Persist claim
        data_store.append_claims([claim_data])
        
        # Step 7: Create audit log
        audit_log = {
            "timestamp": datetime.now().isoformat(),
            "claim_id": claim_id,
            "employee_id": verification.employee_id,
            "agent": "user_verification",
            "action": "verify_and_submit",
            "confidence_score": 1.0,
            "processing_time_seconds": 0.0,
            "api_calls": [],
            "status": "success" if validation_result.get("success", False) else "exception",
            "notes": f"User verified and submitted. {status_message}"
        }
        data_store.append_audit_logs([audit_log])
        
        # Step 8: Return employee-focused confirmation
        return {
            "status": "success",
            "message": status_message,
            "employee_confirmation": {
                "employee_id": verification.employee_id,
                "employee_name": verification.employee_name,
                "ticket_number": verification.ticket_number_or_pnr,
                "total_amount": verification.total_amount
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/claims/{claim_id}/confirm")
async def confirm_claim(claim_id: str, confirmation: dict):
    """Legacy endpoint - kept for backward compatibility"""
    try:
        claim = data_store.get_claim_by_id(claim_id)
        
        if not claim:
            raise HTTPException(status_code=404, detail=f"Claim {claim_id} not found")
        
        if claim.get("claim_status") != "DRAFT":
            raise HTTPException(
                status_code=400, 
                detail=f"Claim {claim_id} is not in DRAFT status"
            )
        
        # Update claim status
        data_store.update_claim(claim_id, {
            "claim_status": "READY_FOR_FINANCE_APPROVAL",
            "updated_at": datetime.now().isoformat()
        })
        
        return {
            "status": "confirmed",
            "claim_id": claim_id,
            "message": "Claim confirmed successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/analytics")
async def get_analytics():
    try:
        analytics = analytics_service.get_full_analytics()
        return analytics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/claims")
async def get_all_claims():
    try:
        claims = data_store.read_all_claims()
        return {
            "status": "success",
            "count": len(claims),
            "claims": claims
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/claims/{claim_id}")
async def get_claim(claim_id: str):
    try:
        claim = data_store.get_claim_by_id(claim_id)
        if not claim:
            raise HTTPException(status_code=404, detail=f"Claim {claim_id} not found")
        
        audit_logs = data_store.get_audit_logs_for_claim(claim_id)
        
        return {
            "status": "success",
            "claim": claim,
            "audit_logs": audit_logs
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/claims/status/{status}")
async def get_claims_by_status(status: str):
    try:
        filtered = data_store.read_claims_by_status(status)
        return {
            "status": "success",
            "filter": status,
            "count": len(filtered),
            "claims": filtered
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/claims/employee/{employee_id}")
async def get_claims_by_employee(employee_id: str):
    try:
        filtered = data_store.read_claims_by_employee(employee_id)
        return {
            "status": "success",
            "employee_id": employee_id,
            "count": len(filtered),
            "claims": filtered
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/audit-logs")
async def get_all_audit_logs():
    try:
        logs = data_store.read_all_audit_logs()
        return {
            "status": "success",
            "count": len(logs),
            "audit_logs": logs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/audit-logs/{claim_id}")
async def get_audit_logs_for_claim(claim_id: str):
    try:
        logs = data_store.get_audit_logs_for_claim(claim_id)
        return {
            "status": "success",
            "claim_id": claim_id,
            "count": len(logs),
            "audit_logs": logs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/exceptions")
async def get_exception_summary():
    try:
        exception_data = analytics_service.get_exception_summary()
        return {
            "status": "success",
            "data": exception_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/performance")
async def get_performance_metrics():
    try:
        performance_data = analytics_service.get_performance_metrics()
        return {
            "status": "success",
            "data": performance_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/employees")
async def get_all_employees():
    try:
        claims = data_store.read_all_claims()
        employees_dict = {}
        
        for claim in claims:
            employee_id = claim.get("employee_id")
            if not employee_id:
                continue
            
            if employee_id not in employees_dict:
                travel_details = claim.get("travel_details", {})
                
                employees_dict[employee_id] = {
                    "employee_id": employee_id,
                    "employee_name": claim.get("employee_name", "Unknown"),
                    "employee_role": claim.get("employee_role", "unknown"),
                    "travel_start": travel_details.get("travel_start", ""),
                    "travel_end": travel_details.get("travel_end", ""),
                    "approved_budget": claim.get("approved_budget", 0)
                }
        
        employees = list(employees_dict.values())
        
        return {
            "status": "success",
            "count": len(employees),
            "employees": employees
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/employees/{employee_id}")
async def get_employee(employee_id: str):
    try:
        employee_claims = data_store.read_claims_by_employee(employee_id)
        
        if not employee_claims:
            raise HTTPException(status_code=404, detail=f"Employee {employee_id} not found")
        
        latest_claim = employee_claims[0]
        travel_details = latest_claim.get("travel_details", {})
        
        employee = {
            "employee_id": employee_id,
            "employee_name": latest_claim.get("employee_name", "Unknown"),
            "employee_role": latest_claim.get("employee_role", "unknown"),
            "travel_start": travel_details.get("travel_start", ""),
            "travel_end": travel_details.get("travel_end", ""),
            "approved_budget": latest_claim.get("approved_budget", 0),
            "total_claims": len(employee_claims)
        }
        
        return {
            "status": "success",
            "employee": employee
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/employee/{employee_id}/analytics")
async def get_employee_analytics(employee_id: str):
    try:
        analytics = analytics_service.get_employee_analytics(employee_id)
        return {
            "status": "success",
            "employee_id": employee_id,
            "data": analytics
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "storage_dir": STORAGE_DIR,
        "submissions_dir": SUBMISSIONS_DIR
    }


# Mount static files AFTER all API routes to avoid conflicts
# This allows direct access to documents via URLs like:
# http://localhost:9002/files/<claim_id>/<document_filename>
app.mount("/files", StaticFiles(directory=SUBMISSIONS_DIR), name="files")