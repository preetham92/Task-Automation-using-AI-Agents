from datetime import datetime

def exception_agent(data: dict, validation: dict = None, exception_type: str = None) -> dict:
    """
    Normalizes extraction output and adds exception metadata.
    
    Args:
        data: Extracted data from upstream agent
        validation: Validation result (if failed)
        exception_type: Type of exception (if any)
        
    Returns:
        Normalized output with exception info
    """
    
    # Base output schema
    output = {
        "employee_id": data.get("employee_id"),
        "claim_id": data.get("claim_id"),
        "passenger_name": data.get("passenger_name"),
        "ticket_number_or_pnr": data.get("ticket_number_or_pnr"),
        "date": data.get("date"),
        "time": data.get("time"),
        "from_location": data.get("from_location"),
        "to_location": data.get("to_location"),
        "airline_or_train_name_or_any_other_provider": data.get("airline_or_train_name_or_any_other_provider"),
        "fare_amount": data.get("fare_amount"),
        "confidence": data.get("confidence"),
        "doc_type": data.get("doc_type"),
        "exception": {
            "type": exception_type,
            "reason": validation.get("reason") if validation else None,
            "missing_fields": []
        }
    }
    
    # Populate missing fields for EXTRACTION_EXCEPTION
    if exception_type == "EXTRACTION_EXCEPTION":
        mandatory_fields = ["passenger_name", "ticket_number_or_pnr", "date", "from_location", "to_location"]
        output["exception"]["missing_fields"] = [f for f in mandatory_fields if not output.get(f)]
    
    return output