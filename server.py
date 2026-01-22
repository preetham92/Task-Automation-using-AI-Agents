import shutil
import os
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

from agents.extraction_agent import extraction_agent
from agents.validation_agent import ValidationAgent
from models.data_models import TravelDocument

app = FastAPI()

# -------------------------
# CORS (React → FastAPI)
# -------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# PATH SETUP
# -------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMP_DIR = os.path.join(BASE_DIR, "temp")
os.makedirs(TEMP_DIR, exist_ok=True)

# -------------------------
# INIT AGENTS
# -------------------------
validator = ValidationAgent()

# -------------------------
# HELPERS
# -------------------------
def detect_doc_type(filename: str) -> str:
    name = filename.lower()
    if "train" in name or "irctc" in name:
        return "railway_ticket"
    if "boarding" in name:
        return "boarding_pass"
    if "cab" in name or "uber" in name or "ola" in name:
        return "cab_invoice"
    if "flight" in name or "air" in name or "ticket" in name:
        return "airline_ticket"
    return "unknown"


def dict_to_travel_document(extracted: dict) -> TravelDocument:
    return TravelDocument(
        doc_type=extracted.get("doc_type"),
        passenger_name=extracted.get("passenger_name"),
        travel_date=extracted.get("date"),
        amount=extracted.get("fare_amount"),
        pnr_number=extracted.get("ticket_number_or_pnr"),
        origin=extracted.get("from_location"),
        destination=extracted.get("to_location")
    )

# -------------------------
# API ENDPOINT
# -------------------------
@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    temp_path = os.path.join(TEMP_DIR, file.filename)

    try:
        # 1️⃣ Save uploaded file
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 2️⃣ Detect document type
        doc_type = detect_doc_type(file.filename)

        # 3️⃣ Run extraction agent
        extracted_data = extraction_agent(temp_path, doc_type)

        # 4️⃣ Run validation (if extraction succeeded)
        if "error" not in extracted_data:
            doc = dict_to_travel_document(extracted_data)
            validation_result = validator.validate(doc)

            extracted_data["validation_status"] = validation_result.status
            extracted_data["validation_remarks"] = validation_result.remarks
        else:
            extracted_data["validation_status"] = "Skipped"
            extracted_data["validation_remarks"] = ["Extraction failed"]

        return {
            "status": "success",
            "file_name": file.filename,
            "doc_type": doc_type,
            "data": extracted_data
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

    finally:
        # Optional cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)
