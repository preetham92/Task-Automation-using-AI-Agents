import { useEffect, useState } from "react";
import { api, endpoints } from "@/api";
import { FinancierLayout } from "@/components/layout/FinancierLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { BarChart3, Database, Plane, Train, Car } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Parallel fetching for better performance
      const [statsRes, claimsRes] = await Promise.all([
        api.get(endpoints.analytics),
        api.get(endpoints.claims),
      ]);

      setAnalytics(statsRes.data);
      setClaims(claimsRes.data.claims);
    } catch (err) {
      console.error("Dashboard Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Use pre-processed data from backend
  const expenseByType = analytics?.expense_by_type || [];
  const expenseTimeline = analytics?.expense_timeline || [];

  console.log("Chart Data Check:", { expenseByType, expenseTimeline });

  const getDocIcon = (type: string) => {
    const t = type?.toLowerCase() || "";
    if (t.includes("airline") || t.includes("boarding"))
      return <Plane className="text-blue-400" size={18} />;
    if (t.includes("rail") || t.includes("train"))
      return <Train className="text-orange-400" size={18} />;
    return <Car className="text-yellow-400" size={18} />;
  };

  if (loading)
    return (
      <FinancierLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <LoadingSpinner size="lg" text="Fetching Agent Analysis..." />
        </div>
      </FinancierLayout>
    );

  return (
    <FinancierLayout>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <PageHeader
          title="Summary Agent Analytics"
          description="Intelligence report generated from all processed claims"
          icon={BarChart3}
        />

        {/* --- PERFORMANCE METRICS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard className="p-5 border-l-4 border-l-purple-500">
            <span className="text-sm text-gray-400 font-medium">
              Auto-Validated
            </span>
            <div className="text-3xl font-bold mt-1">
              {analytics?.processing_metrics?.validated_claims || 0}
            </div>
          </GlassCard>

          <GlassCard className="p-5 border-l-4 border-l-blue-500">
            <span className="text-sm text-gray-400 font-medium">
              Avg Velocity
            </span>
            <div className="text-3xl font-bold mt-1">
              {analytics?.performance_metrics
                ?.average_processing_time_seconds || 0}
              s
            </div>
          </GlassCard>

          <GlassCard className="p-5 border-l-4 border-l-emerald-500">
            <span className="text-sm text-gray-400 font-medium">
              Success Rate
            </span>
            <div className="text-3xl font-bold mt-1">
              {analytics?.processing_metrics?.validation_rate_percentage || 0}%
            </div>
          </GlassCard>

          <GlassCard className="p-5 border-l-4 border-l-red-500">
            <span className="text-sm text-gray-400 font-medium">
              System Exceptions
            </span>
            <div className="text-3xl font-bold mt-1 text-red-400">
              {analytics?.exception_breakdown?.total_exceptions || 0}
            </div>
          </GlassCard>
        </div>

        {/* --- EXPENSE ANALYTICS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GlassCard className="p-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-4">
              Expenses by Transport Type
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseByType}>
                  <XAxis
                    dataKey="type"
                    tick={{ fill: "#9CA3AF", fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111827",
                      border: "1px solid #374151",
                    }}
                    itemStyle={{ color: "#A78BFA" }}
                  />
                  <Bar dataKey="amount" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-4">
              Expense Trend Over Time
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={expenseTimeline}>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#9CA3AF", fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111827",
                      border: "1px solid #374151",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    dot={{ fill: "#3B82F6", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>

        {/* --- PROCESSED DOCUMENTS REPORT TABLE --- */}
        <GlassCard>
          <h3 className="text-lg font-semibold p-6 border-b border-gray-800 flex items-center gap-2">
            <Database size={20} className="text-purple-400" /> Processed
            Documents Report
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-900/50 text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="p-4 pl-6">Doc Type</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">From</th>
                  <th className="p-4">To</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">PNR / ID</th>
                  <th className="p-4 text-right">Fare</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {claims.map((claim) => (
                  <tr
                    key={claim.claim_id}
                    className="hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="p-4 pl-6 flex items-center gap-3">
                      {getDocIcon(claim.doc_type)}
                      <span className="capitalize">
                        {claim.doc_type?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-4 font-medium">
                      {claim.travel_details?.passenger_name || "N/A"}
                    </td>
                    <td className="p-4 text-gray-400">
                      {claim.travel_details?.from_location || "-"}
                    </td>
                    <td className="p-4 text-gray-400">
                      {claim.travel_details?.to_location || "-"}
                    </td>
                    <td className="p-4 text-gray-500">
                      {claim.travel_details?.date || "-"}
                    </td>
                    <td className="p-4 font-mono text-purple-400">
                      {claim.travel_details?.ticket_number_or_pnr || "-"}
                    </td>
                    <td className="p-4 text-right font-bold text-white">
                      ₹{claim.travel_details?.fare_amount || 0}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-2 py-1 rounded text-[10px] font-bold ${
                          claim.claim_status === "READY_FOR_FINANCE_APPROVAL"
                            ? "text-emerald-400 bg-emerald-400/10"
                            : "text-yellow-400 bg-yellow-400/10"
                        }`}
                      >
                        {claim.claim_status === "READY_FOR_FINANCE_APPROVAL"
                          ? "VALIDATED"
                          : "REVIEW"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </FinancierLayout>
  );
}
