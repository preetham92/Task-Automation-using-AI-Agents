from agents.ingestion_agent import ingestion_agent
from agents.extraction_agent import extraction_agent
from agents.validation_agent import ValidationAgent
from models.data_models import TravelDocument

import os
import json
from datetime import datetime

# -------------------------
# PATH-SAFE SETUP
# -------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

INPUT_DIR = os.path.join(BASE_DIR, "data", "input_docs")
OUTPUT_DIR = os.path.join(BASE_DIR, "data", "output")

os.makedirs(OUTPUT_DIR, exist_ok=True)

# -------------------------
# HELPERS
# -------------------------
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
# PIPELINE
# -------------------------
def run_pipeline():
    audit_log = []
    final_output = []

    validator = ValidationAgent()

    ingestion_results = ingestion_agent(INPUT_DIR)

    for item in ingestion_results:
        file_name = item["file"]
        file_path = os.path.join(INPUT_DIR, file_name)
        start_time = datetime.utcnow().isoformat()

        try:
            # -------- Extraction --------
            extracted = extraction_agent(file_path, item["doc_type"])
            extracted["file"] = file_name
            extracted["processed_at"] = start_time

            # -------- Validation --------
            if "error" not in extracted:
                doc = dict_to_travel_document(extracted)
                validation_result = validator.validate(doc)

                extracted["validation_status"] = validation_result.status
                extracted["validation_remarks"] = validation_result.remarks
            else:
                extracted["validation_status"] = "Skipped"
                extracted["validation_remarks"] = ["Extraction failed"]

            final_output.append(extracted)

            audit_log.append({
                "agent": "Pipeline",
                "file": file_name,
                "status": "success",
                "timestamp": start_time
            })

        except Exception as e:
            audit_log.append({
                "agent": "Pipeline",
                "file": file_name,
                "status": "failed",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            })

    # -------------------------
    # SAVE OUTPUTS
    # -------------------------
    with open(os.path.join(OUTPUT_DIR, "extracted_results.json"), "w") as f:
        json.dump(final_output, f, indent=2)

    with open(os.path.join(OUTPUT_DIR, "audit_log.json"), "w") as f:
        json.dump(audit_log, f, indent=2)

    print("✅ Processing complete")

# -------------------------
# ENTRY POINT
# -------------------------
if __name__ == "__main__":
    run_pipeline()
