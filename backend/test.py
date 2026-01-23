#!/usr/bin/env python3
"""
Test runner for orchestrator.py

Usage:
    python test_orchestrator.py
    
This script:
1. Creates a test document in the input folder
2. Runs the orchestrator
3. Displays the results
4. Shows analytics computed from storage
"""

import os
import sys
import shutil
from datetime import datetime

# Add parent directory to path if needed
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from orchestrator import (
    DocumentProcessingOrchestrator,
    ClaimDataStore,
    AnalyticsService
)


def setup_test_environment():
    """Create necessary directories and test file."""
    
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    INPUT_DIR = os.path.join(BASE_DIR, "data", "input_docs")
    STORAGE_DIR = os.path.join(BASE_DIR, "data", "storage")
    
    # Create directories
    os.makedirs(INPUT_DIR, exist_ok=True)
    os.makedirs(STORAGE_DIR, exist_ok=True)
    
    # Create a test file (you can replace this with your actual test file)
    test_file_path = os.path.join(INPUT_DIR, "test_ticket.pdf")
    
    # If you have a real test file, copy it here:
    # shutil.copy("/path/to/your/test_ticket.pdf", test_file_path)
    
    # Or create a dummy file for testing
    if not os.path.exists(test_file_path):
        with open(test_file_path, 'w') as f:
            f.write("Test ticket document")
        print(f"✓ Created test file: {test_file_path}")
    else:
        print(f"✓ Test file already exists: {test_file_path}")
    
    return INPUT_DIR, STORAGE_DIR


def print_section(title):
    """Print formatted section header."""
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)


def main():
    """Run the orchestrator with test data."""
    
    print_section("ORCHESTRATOR TEST RUNNER")
    
    # Setup
    INPUT_DIR, STORAGE_DIR = setup_test_environment()
    
    print(f"\nInput Directory:   {INPUT_DIR}")
    print(f"Storage Directory: {STORAGE_DIR}")
    
    # Initialize components
    print_section("INITIALIZING COMPONENTS")
    
    orchestrator = DocumentProcessingOrchestrator(
        input_folder=INPUT_DIR,
        db_path="data/expense_claims.csv"
    )
    
    data_store = ClaimDataStore(storage_dir=STORAGE_DIR)
    analytics_service = AnalyticsService(data_store)
    
    print("✓ Orchestrator initialized")
    print("✓ Data store initialized")
    print("✓ Analytics service initialized")
    
    # Run upload flow
    print_section("UPLOAD FLOW: Processing Documents")
    
    claim_id_prefix = f"CLM{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    result = orchestrator.process_documents(
        employee_id="EMP001",
        claim_id_prefix=claim_id_prefix
    )
    
    if result["status"] == "FAILED":
        print(f"\n❌ Processing failed: {result.get('reason')}")
        return
    
    print(f"\n✓ Processing completed successfully")
    print(f"  - Processing time: {result['processing_time_seconds']}s")
    print(f"  - Documents processed: {result['documents_processed']}")
    print(f"  - Claim summaries: {len(result['claim_summaries'])}")
    print(f"  - Audit logs: {len(result['audit_logs'])}")
    
    # Persist to storage
    print_section("PERSISTING TO STORAGE")
    
    claims_written = data_store.append_claims(result["claim_summaries"])
    logs_written = data_store.append_audit_logs(result["audit_logs"])
    
    print(f"✓ Persisted {claims_written} claim files")
    print(f"✓ Persisted {logs_written} audit log files")
    
    # Show claim details
    print_section("CLAIM DETAILS")
    
    for claim in result["claim_summaries"]:
        print(f"\nClaim ID: {claim['claim_id']}")
        print(f"Employee: {claim['employee_id']}")
        print(f"Status:   {claim['claim_status']}")
        
        if claim['claim_status'] == "READY_FOR_FINANCE_APPROVAL":
            travel = claim.get('travel_details', {})
            print(f"  Passenger: {travel.get('passenger_name')}")
            print(f"  Route: {travel.get('from_location')} → {travel.get('to_location')}")
            print(f"  Date: {travel.get('date')}")
            print(f"  Amount: {travel.get('fare_amount')}")
        else:
            signals = claim.get('quality_signals', {})
            print(f"  Exception: {signals.get('exception_type')}")
            print(f"  Reason: {signals.get('exception_reason')}")
    
    # Compute analytics from storage
    print_section("DASHBOARD FLOW: Computing Analytics from Storage")
    
    analytics = analytics_service.get_full_analytics()
    
    # Display analytics
    print_section("ANALYTICS DASHBOARD")
    
    metrics = analytics['processing_metrics']
    print(f"\n📊 Processing Metrics:")
    print(f"   Total Claims:      {metrics['total_claims_processed']}")
    print(f"   Validated:         {metrics['validated_claims']}")
    print(f"   Requires Review:   {metrics['requires_review_claims']}")
    print(f"   Validation Rate:   {metrics['validation_rate_percentage']}%")
    
    exceptions = analytics['exception_breakdown']
    print(f"\n⚠️  Exception Breakdown:")
    print(f"   Total Exceptions:  {exceptions['total_exceptions']}")
    for exc_type, count in exceptions['exceptions_by_type'].items():
        if count > 0:
            print(f"   - {exc_type}: {count}")
    
    perf = analytics['performance_metrics']
    if perf['average_processing_time_seconds']:
        print(f"\n⚡ Performance Metrics:")
        print(f"   Total Time:        {perf['total_processing_time_seconds']}s")
        print(f"   Average Time:      {perf['average_processing_time_seconds']}s")
        print(f"   Min Time:          {perf['min_processing_time_seconds']}s")
        print(f"   Max Time:          {perf['max_processing_time_seconds']}s")
    
    api_usage = analytics['api_usage']
    print(f"\n🔌 API Usage:")
    print(f"   Total API Calls:   {api_usage['total_api_calls']}")
    print(f"   By Agent:")
    for agent, calls in api_usage['api_calls_by_agent'].items():
        print(f"   - {agent}: {calls}")
    
    agent_behavior = analytics['agent_behavior']
    print(f"\n🤖 Agent Behavior:")
    for agent, count in agent_behavior['agent_executions'].items():
        success = agent_behavior['agent_success_count'].get(agent, 0)
        exceptions = agent_behavior['agent_exception_count'].get(agent, 0)
        print(f"   {agent}:")
        print(f"     Executions: {count} | Success: {success} | Exceptions: {exceptions}")
    
    print_section("TEST COMPLETE")
    print("\nYou can now:")
    print("1. Check storage files:")
    print(f"   - Claims: {data_store.claims_dir}")
    print(f"   - Audit Logs: {data_store.audit_dir}")
    print("2. Run the FastAPI server: uvicorn server:app --reload")
    print("3. Query analytics: curl http://localhost:8000/analytics")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()