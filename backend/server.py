import shutil
import os
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from orchestrator import (
    DocumentProcessingOrchestrator,
    ClaimDataStore,
    AnalyticsService
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080/","*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMP_DIR = os.path.join(BASE_DIR, "temp")
STORAGE_DIR = os.path.join(BASE_DIR, "data", "storage")
INPUT_DIR = os.path.join(TEMP_DIR, "input_docs")

os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(INPUT_DIR, exist_ok=True)

orchestrator = DocumentProcessingOrchestrator(
    input_folder=INPUT_DIR,
    db_path=os.path.join(BASE_DIR, "data", "expense_claims.csv")
)

data_store = ClaimDataStore(storage_dir=STORAGE_DIR)
analytics_service = AnalyticsService(data_store)


def generate_claim_id() -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    return f"CLM{timestamp}"


@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    employee_id: str = "EMP001"
):
    temp_path = None
    claim_id_prefix = generate_claim_id()
    
    try:
        temp_path = os.path.join(INPUT_DIR, file.filename)
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = orchestrator.process_documents(
            employee_id=employee_id,
            claim_id_prefix=claim_id_prefix
        )

        if result["status"] == "FAILED":
            return {
                "status": "error",
                "message": result.get("reason", "Processing failed"),
                "file_name": file.filename
            }

        data_store.append_claims(result["claim_summaries"])
        data_store.append_audit_logs(result["audit_logs"])

        claim_summary = result["claim_summaries"][0] if result["claim_summaries"] else None
        
        if not claim_summary:
            return {
                "status": "error",
                "message": "No claim summary generated",
                "file_name": file.filename
            }

        doc_type = claim_summary.get("quality_signals", {}).get("doc_type") or \
                   claim_summary.get("travel_details", {}).get("doc_type") or \
                   "unknown"

        claim_status = claim_summary.get("claim_status")
        
        base_response = {
            "claim_id": claim_summary["claim_id"],
            "file_name": file.filename,
            "doc_type": doc_type,
            "claim_summary": claim_summary,
            "audit_logs": result["audit_logs"],
            "processing_time_seconds": result["processing_time_seconds"]
        }
        
        if claim_status == "READY_FOR_FINANCE_APPROVAL":
            return {"status": "success", **base_response}
        else:
            return {"status": "requires_review", **base_response}

    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "file_name": file.filename
        }

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


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
        "storage_dir": STORAGE_DIR
    }