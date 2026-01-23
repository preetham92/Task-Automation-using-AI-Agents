export interface ExtractionData {
  passenger_name: string | null;
  ticket_number_or_pnr: string | null;
  date: string | null;
  time: string | null;
  from_location: string | null;
  to_location: string | null;
  airline_or_train_name_or_any_other_provider: string | null;
  fare_amount: number | null;
}

export interface Claim {
  claim_id: string;
  status: "APPROVED" | "REJECTED" | "PENDING" | "REQUIRES_REVIEW" | "FAILED";
  doc_type: string;
  file_name: string;
  processing_time_seconds: number;
  extraction_data: ExtractionData;
  created_at?: string;
}

export interface AuditLog {
  timestamp: string;
  event_type: string;
  claim_id: string;
  description: string;
  status: "INFO" | "WARNING" | "ERROR" | "SUCCESS";
  details?: any;
}

export interface AnalyticsData {
  total_claims: number;
  total_approved_amount: number;
  pending_review_count: number;
  auto_approval_rate: number;
  average_processing_time: number;
}
