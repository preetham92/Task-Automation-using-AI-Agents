import { useEffect, useState } from "react";
import { api, endpoints } from "../../api";
import { EmployeeLayout } from "@/components/layout/EmployeeLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  FileEdit,
  ArrowRight,
  BadgeIndianRupee,
  User,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// Data interfaces matching your Summary Agent output
interface DraftClaim {
  claim_id: string;
  claim_status: string;
  quality_signals: {
    exception_type: string;
    exception_reason: string;
    missing_fields: string[];
    doc_type: string;
  };
  travel_details?: {
    passenger_name: string | null;
    fare_amount: number | null;
    from_location: string | null;
    to_location: string | null;
  };
}

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<DraftClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDrafts = async () => {
      try {
        const response = await api.get(endpoints.employeeClaims("EMP001"));
        if (response.data.status === "success") {
          // Summary Agent identifies drafts as claims requiring manual review
          const pendingItems = response.data.claims.filter(
            (c: any) => c.claim_status === "REQUIRES_REVIEW",
          );
          setDrafts(pendingItems);
        }
      } catch (error) {
        console.error("Failed to load drafts", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDrafts();
  }, []);

  return (
    <EmployeeLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
        <PageHeader
          title="Action Required"
          description="Claims flagged by AI agents for missing information or policy review"
          icon={FileEdit}
        />

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner size="lg" text="Syncing Exception Logs..." />
          </div>
        ) : drafts.length === 0 ? (
          <GlassCard className="text-center py-20 bg-emerald-500/5 border-emerald-500/10">
            <h3 className="text-xl font-medium text-foreground">Inbox Clean</h3>
            <p className="text-muted-foreground mt-2">
              All your previous uploads passed automated validation.
            </p>
          </GlassCard>
        ) : (
          <div className="grid gap-6">
            {drafts.map((draft) => (
              <GlassCard
                key={draft.claim_id}
                className="border-l-4 border-l-yellow-500 p-0 overflow-hidden"
              >
                {/* Header: Exception Type */}
                <div className="bg-yellow-500/10 px-6 py-3 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-yellow-500 font-bold text-[10px] uppercase tracking-widest">
                    <AlertTriangle size={14} />
                    {draft.quality_signals.exception_type.replace(/_/g, " ")}
                  </div>
                  <span className="font-mono text-[10px] text-gray-500">
                    ID: {draft.claim_id}
                  </span>
                </div>

                <div className="p-6 flex flex-col md:flex-row justify-between gap-6">
                  {/* Draft Structure: Displaying what was extracted vs what is missing */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">
                        {draft.quality_signals.doc_type
                          ?.replace(/_/g, " ")
                          .toUpperCase() || "UNIDENTIFIED DOCUMENT"}
                      </h3>
                      <p className="text-sm text-red-400 font-medium">
                        {draft.quality_signals.exception_reason}
                      </p>
                    </div>

                    {/* Extracted Format (Partial Data) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-white/5">
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-500 uppercase font-bold">
                          Passenger
                        </span>
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <User size={14} className="text-gray-600" />
                          {draft.travel_details?.passenger_name || "???"}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-500 uppercase font-bold">
                          Amount
                        </span>
                        <div className="flex items-center gap-2 text-sm text-white font-bold">
                          <BadgeIndianRupee
                            size={14}
                            className="text-emerald-500"
                          />
                          {draft.travel_details?.fare_amount || "0.00"}
                        </div>
                      </div>
                      <div className="space-y-1 col-span-2">
                        <span className="text-[10px] text-gray-500 uppercase font-bold">
                          Inferred Route
                        </span>
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <MapPin size={14} className="text-gray-600" />
                          {draft.travel_details?.from_location ||
                            "Unknown"} →{" "}
                          {draft.travel_details?.to_location || "Unknown"}
                        </div>
                      </div>
                    </div>

                    {/* Missing Fields Flags */}
                    <div className="flex flex-wrap gap-2">
                      {draft.quality_signals.missing_fields.map((field) => (
                        <span
                          key={field}
                          className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-black uppercase rounded"
                        >
                          Missing {field.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex items-center justify-center md:border-l md:border-white/5 md:pl-6">
                    <button
                      onClick={() => navigate("/employee/upload")}
                      className="group flex flex-col items-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all"
                    >
                      <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-black group-hover:scale-110 transition-transform">
                        <ArrowRight size={20} />
                      </div>
                      <span className="text-xs font-bold text-white">
                        FIX DRAFT
                      </span>
                    </button>
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
