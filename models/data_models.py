from dataclasses import dataclass
from typing import List, Optional

@dataclass
class TravelDocument:
    doc_type: str
    passenger_name: Optional[str]
    travel_date: Optional[str]
    amount: Optional[float]
    pnr_number: Optional[str]
    origin: Optional[str]
    destination: Optional[str]

@dataclass
class ValidationResult:
    is_valid: bool
    status: str
    remarks: List[str]
