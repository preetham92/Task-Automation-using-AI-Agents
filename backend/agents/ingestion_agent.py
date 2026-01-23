import os

def detect_document_type_from_filename(filename):
    name = filename.lower()

    if "boarding" in name:
        return "boarding_pass"
    if "train" in name or "irctc" in name:
        return "railway_ticket"
    if "cab" in name or "uber" in name or "ola" in name:
        return "cab_invoice"
    if "flight" in name or "air" in name or "ticket" in name:
        return "airline_ticket"

    return "unknown"


def ingestion_agent(folder_path):
    print("Ingestion Agent reading from:", folder_path)

    if not os.path.exists(folder_path):
        raise FileNotFoundError(f"Input directory not found: {folder_path}")

    results = []

    for file in os.listdir(folder_path):
        print("Found file:", repr(file))

        if not file.lower().endswith((".pdf", ".png", ".jpg", ".jpeg")):
            continue

        doc_type = detect_document_type_from_filename(file)

        results.append({
            "file": file,
            "doc_type": doc_type
        })

    return results
