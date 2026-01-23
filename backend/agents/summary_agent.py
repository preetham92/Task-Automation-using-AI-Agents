from datetime import datetime

def summary_agent(claim_summaries: list, audit_logs: list = None) -> dict:
    """
    Generates detailed analytics from processed claims.
    
    Args:
        claim_summaries: List of claim summary dictionaries
        audit_logs: List of audit log entries
        
    Returns:
        Detailed analytics report matching the required format
    """
    
    if not claim_summaries:
        return _empty_analytics()
    
    total = len(claim_summaries)
    validated = sum(1 for c in claim_summaries if c.get("claim_status") == "READY_FOR_FINANCE_APPROVAL")
    requires_review = total - validated
    validation_rate = round(validated / total * 100, 2) if total > 0 else 0.0
    
    # Count exceptions by type
    exception_counts = {
        "EXTRACTION_EXCEPTION": 0,
        "BUSINESS_EXCEPTION": 0,
        "CONFIDENCE_EXCEPTION": 0,
        "DOCUMENT_TYPE_EXCEPTION": 0,
        "DATA_QUALITY_EXCEPTION": 0,
        "SYSTEM_EXCEPTION": 0,
        "INPUT_EXCEPTION": 0,
        "UNKNOWN_EXCEPTION": 0
    }
    
    exception_details = []
    
    for claim in claim_summaries:
        signals = claim.get("quality_signals", {})
        exc_type = signals.get("exception_type")
        
        if exc_type:
            exception_counts[exc_type] = exception_counts.get(exc_type, 0) + 1
            
            exception_details.append({
                "claim_id": claim.get("claim_id"),
                "employee_id": claim.get("employee_id"),
                "exception_type": exc_type,
                "exception_reason": signals.get("exception_reason"),
                "missing_fields": signals.get("missing_fields", [])
            })
    
    total_exceptions = sum(exception_counts.values())
    
    # Calculate performance metrics from audit logs
    performance = _calculate_performance(audit_logs) if audit_logs else _empty_performance()
    
    return {
        "generated_at": datetime.now().isoformat(),
        "processing_metrics": {
            "total_claims_processed": total,
            "validated_claims": validated,
            "requires_review_claims": requires_review,
            "validation_rate_percentage": validation_rate,
            "exception_rate_percentage": round(100 - validation_rate, 2)
        },
        "exception_breakdown": {
            "total_exceptions": total_exceptions,
            "exceptions_by_type": exception_counts,
            "exception_details": exception_details
        },
        "performance_metrics": performance,
        "audit_log": audit_logs if audit_logs else []
    }


def _calculate_performance(audit_logs: list) -> dict:
    """Calculate performance metrics from audit logs."""
    times = [log.get("processing_time_seconds") for log in audit_logs if log.get("processing_time_seconds")]
    
    if not times:
        return _empty_performance()
    
    return {
        "average_processing_time_seconds": round(sum(times) / len(times), 3),
        "min_processing_time_seconds": round(min(times), 3),
        "max_processing_time_seconds": round(max(times), 3),
        "total_processing_time_seconds": round(sum(times), 3)
    }


def _empty_performance() -> dict:
    """Return empty performance metrics."""
    return {
        "average_processing_time_seconds": None,
        "min_processing_time_seconds": None,
        "max_processing_time_seconds": None,
        "total_processing_time_seconds": None
    }


def _empty_analytics() -> dict:
    """Return empty analytics structure."""
    return {
        "generated_at": datetime.now().isoformat(),
        "processing_metrics": {
            "total_claims_processed": 0,
            "validated_claims": 0,
            "requires_review_claims": 0,
            "validation_rate_percentage": 0.0,
            "exception_rate_percentage": 0.0
        },
        "exception_breakdown": {
            "total_exceptions": 0,
            "exceptions_by_type": {
                "EXTRACTION_EXCEPTION": 0,
                "BUSINESS_EXCEPTION": 0,
                "CONFIDENCE_EXCEPTION": 0,
                "DOCUMENT_TYPE_EXCEPTION": 0,
                "DATA_QUALITY_EXCEPTION": 0,
                "SYSTEM_EXCEPTION": 0,
                "INPUT_EXCEPTION": 0,
                "UNKNOWN_EXCEPTION": 0
            },
            "exception_details": []
        },
        "performance_metrics": _empty_performance(),
        "audit_log": []
    }