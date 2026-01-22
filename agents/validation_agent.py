import os
import pandas as pd
from datetime import datetime
from models.data_models import TravelDocument, ValidationResult

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class ValidationAgent:
    def __init__(self, db_path=None):
        if db_path is None:
            db_path = os.path.join(BASE_DIR, "data", "expense_claims.csv")

        self.db = pd.read_csv(db_path)

        self.db['travel_start'] = pd.to_datetime(self.db['travel_start'])
        self.db['travel_end'] = pd.to_datetime(self.db['travel_end'])

    def validate(self, doc: TravelDocument) -> ValidationResult:
        remarks = []
        is_valid = True
        status = "Approved"

        employee_record = self.db[
            self.db['employee_name']
            .str.contains(doc.passenger_name or "", case=False, na=False)
        ]

        if employee_record.empty:
            return ValidationResult(
                is_valid=False,
                status="Rejected",
                remarks=[f"Employee '{doc.passenger_name}' not found in active claims."]
            )

        record = employee_record.iloc[0]

        # Budget check
        if doc.amount and doc.amount > record['approved_budget']:
            is_valid = False
            status = "Rejected"
            remarks.append(
                f"Amount {doc.amount} exceeds limit {record['approved_budget']}"
            )

        # Date check
        if doc.travel_date:
            doc_date = pd.to_datetime(doc.travel_date)
            if not (record['travel_start'] <= doc_date <= record['travel_end']):
                status = "Review"
                remarks.append(
                    f"Travel date {doc.travel_date} is outside claim period."
                )

        return ValidationResult(
            is_valid=is_valid,
            status=status,
            remarks=remarks
        )
