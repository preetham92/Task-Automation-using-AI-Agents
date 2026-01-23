import React, { useEffect, useState } from "react";
import { api } from "@/api";
import { EmployeeLayout } from "@/components/layout/EmployeeLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  FileText,
  Calendar,
  Clock,
  Zap,
  MapPin,
  BadgeIndianRupee,
} from "lucide-react";

// Matches backend Summary Agent JSON structure
interface ClaimData {
  claim_id: string;
  claim_status: string;
  doc_type: string;
  processing_time_seconds?: number; // Performance metric
  travel_details?: {
    passenger_name?: string;
    date?: string;
    from_location?: string;
    to_location?: string;
    fare_amount?: number;
    ticket_number_or_pnr?: string;
  };
  quality_signals?: {
    confidence: number;
  };
}

export default function History() {
  const [claims, setClaims] = useState<ClaimData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // Fetching real data from the Summary Agent via FastAPI
        const response = await api.get("/claims/employee/EMP001");
        if (response.data.status === "success") {
          setClaims(response.data.claims);
        }
      } catch (error) {
        console.error("Failed to sync history with backend:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <EmployeeLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
        <PageHeader
          title="Claim History"
          description="Analysis and validation status of your travel documents"
          icon={Clock}
        />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" text="Syncing Records..." />
          </div>
        ) : claims.length === 0 ? (
          <GlassCard className="text-center py-20">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium text-foreground">
              No Claims Processed
            </h3>
          </GlassCard>
        ) : (
          <div className="grid gap-6">
            {claims.map((claim, index) => (
              <GlassCard
                key={claim.claim_id}
                hover
                className="animate-slide-up border-l-4 border-l-primary/30"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* --- TRAVEL TYPE & PASSENGER INFO --- */}
                  <div className="flex gap-4 items-start">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {claim.doc_type?.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          #{claim.claim_id}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-foreground">
                        {claim.travel_details?.passenger_name ||
                          "Unidentified Passenger"}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />{" "}
                          {claim.travel_details?.date || "N/A"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />{" "}
                          {claim.travel_details?.from_location} →{" "}
                          {claim.travel_details?.to_location}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* --- EXPENSE & PERFORMANCE METRICS --- */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-4 border-t md:border-t-0 pt-4 md:pt-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-2xl font-black text-foreground">
                        <BadgeIndianRupee className="w-5 h-5 text-emerald-500" />
                        {claim.travel_details?.fare_amount || "0"}
                      </div>
                      <div className="mt-2">
                        <StatusBadge status={claim.claim_status} />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] font-mono uppercase tracking-tight text-muted-foreground">
                      {/* Summary Agent Performance Metric */}
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-secondary/50 rounded-md">
                        <Zap className="w-3 h-3 text-yellow-500" />
                        <span>
                          {claim.processing_time_seconds?.toFixed(2)}s
                        </span>
                      </div>
                      {/* Extraction Agent Confidence Metric */}
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-secondary/50 rounded-md">
                        <Clock className="w-3 h-3 text-blue-500" />
                        <span>
                          {claim.quality_signals?.confidence
                            ? (claim.quality_signals.confidence * 100).toFixed(
                                0,
                              )
                            : "0"}
                          % AI Match
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </EmployeeLayout>
  );
}
