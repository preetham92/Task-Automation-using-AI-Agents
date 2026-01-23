import os
import pandas as pd
from datetime import datetime
from typing import Dict, Any

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class ValidationAgent:
    """
    Business Validation Agent for expense claims.
    
    Validates extracted travel documents against:
    - Employee database records
    - Budget limits
    - Travel date ranges
    - Policy compliance rules
    """
    
    def __init__(self, db_path: str = None):
        if db_path is None:
            db_path = os.path.join(BASE_DIR, "data", "expense_claims.csv")
        
        self.db_path = db_path
        self.db = self._load_database()
    
    def _load_database(self) -> pd.DataFrame:
        """Load and prepare employee expense claims database."""
        try:
            db = pd.read_csv(self.db_path)
            db['travel_start'] = pd.to_datetime(db['travel_start'])
            db['travel_end'] = pd.to_datetime(db['travel_end'])
            return db
        except Exception as e:
            raise RuntimeError(f"Failed to load expense claims database: {e}")
    
    def validate(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate extracted document data against business rules.
        
        Args:
            data: Dictionary containing:
                - passenger_name: str
                - date: str (travel date)
                - fare_amount: float
                - ticket_number_or_pnr: str
                - from_location: str
                - to_location: str
                - doc_type: str
                - confidence: float
        
        Returns:
            {
                "is_valid": bool,
                "reason": str | None  # Combined remarks if invalid
            }
        """
        remarks = []
        is_valid = True
        
        passenger_name = data.get("passenger_name", "")
        travel_date = data.get("date", "")
        fare_amount = data.get("fare_amount", 0.0)
        
        # ────────────────────────────────────────────────────────────────
        # RULE 1: Employee must exist in active claims database
        # ────────────────────────────────────────────────────────────────
        if not passenger_name or str(passenger_name).lower() == "null":
            return {
                "is_valid": False,
                "reason": "Passenger name is required for validation"
            }
        
        employee_record = self.db[
            self.db['employee_name'].str.contains(
                passenger_name, case=False, na=False, regex=False
            )
        ]
        
        if employee_record.empty:
            return {
                "is_valid": False,
                "reason": f"Employee '{passenger_name}' not found in active claims database"
            }
        
        record = employee_record.iloc[0]
        
        # ────────────────────────────────────────────────────────────────
        # RULE 2: Fare amount must not exceed approved budget
        # ────────────────────────────────────────────────────────────────
        if fare_amount > 0:
            approved_budget = float(record['approved_budget'])
            
            if fare_amount > approved_budget:
                is_valid = False
                remarks.append(
                    f"Fare amount ₹{fare_amount:.2f} exceeds approved budget ₹{approved_budget:.2f}"
                )
        
        # ────────────────────────────────────────────────────────────────
        # RULE 3: Travel date must fall within claim period
        # ────────────────────────────────────────────────────────────────
        if travel_date and str(travel_date).lower() != "null":
            try:
                doc_date = pd.to_datetime(travel_date)
                travel_start = record['travel_start']
                travel_end = record['travel_end']
                
                if not (travel_start <= doc_date <= travel_end):
                    is_valid = False
                    remarks.append(
                        f"Travel date {travel_date} is outside approved claim period "
                        f"({travel_start.strftime('%Y-%m-%d')} to {travel_end.strftime('%Y-%m-%d')})"
                    )
            except Exception as e:
                is_valid = False
                remarks.append(f"Invalid travel date format: {travel_date}")
        
        # ────────────────────────────────────────────────────────────────
        # RULE 4: Fare amount must be positive
        # ────────────────────────────────────────────────────────────────
        if fare_amount <= 0:
            is_valid = False
            remarks.append("Fare amount must be greater than zero")
        
        # ────────────────────────────────────────────────────────────────
        # RULE 5: Route validation (optional - can be extended)
        # ────────────────────────────────────────────────────────────────
        from_location = data.get("from_location", "")
        to_location = data.get("to_location", "")
        
        if from_location and to_location:
            if from_location.lower() == to_location.lower():
                is_valid = False
                remarks.append("Origin and destination cannot be the same")
        
        # ────────────────────────────────────────────────────────────────
        # Return validation result
        # ────────────────────────────────────────────────────────────────
        if is_valid:
            return {
                "is_valid": True,
                "reason": None
            }
        else:
            return {
                "is_valid": False,
                "reason": "; ".join(remarks)
            }


# ============================================================================
# Legacy Compatibility (if needed for other parts of codebase)
# ============================================================================

class ValidationResult:
    """Legacy validation result class for backward compatibility."""
    
    def __init__(self, is_valid: bool, status: str, remarks: list):
        self.is_valid = is_valid
        self.status = status
        self.remarks = remarks