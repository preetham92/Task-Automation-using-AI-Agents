from agents.ingestion_agent import ingestion_agent
from agents.extraction_agent import extraction_agent
import os
import json
from datetime import datetime

INPUT_DIR = "data/input_docs"
OUTPUT_DIR = "data/output"

os.makedirs(OUTPUT_DIR, exist_ok=True)

def run_pipeline():
    audit_log = []
    final_output = []

    ingestion_results = ingestion_agent(INPUT_DIR)

    for item in ingestion_results:
        file_name = item["file"]
        file_path = os.path.join(INPUT_DIR, file_name)

        try:
            start_time = datetime.utcnow().isoformat()

            extracted = extraction_agent(file_path, item["doc_type"])
            extracted["file"] = file_name
            extracted["processed_at"] = start_time

            final_output.append(extracted)

            audit_log.append({
                "agent": "ExtractionAgent",
                "file": file_name,
                "status": "success",
                "timestamp": start_time
            })

        except Exception as e:
            audit_log.append({
                "agent": "ExtractionAgent",
                "file": file_name,
                "status": "failed",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            })

    #store extracted data
    with open(f"{OUTPUT_DIR}/extracted_results.json", "w") as f:
        json.dump(final_output, f, indent=2)

    #audit log
    with open(f"{OUTPUT_DIR}/audit_log.json", "w") as f:
        json.dump(audit_log, f, indent=2)

    print("✅ Processing complete")

if __name__ == "__main__":
    run_pipeline()
