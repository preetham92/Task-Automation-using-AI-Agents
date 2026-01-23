import { useEffect, useState, useMemo } from "react";
import { mockClaimsData } from "@/data/mockClaims";
import { api } from "@/api";
import { FinancierLayout } from "@/components/layout/FinancierLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  BarChart3,
  Database,
  Plane,
  Train,
  Car,
  Activity,
  Bot,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts";

// --- Types ---
interface AuditLog {
  agent: string;
  timestamp: string;
  confidence_score: number | null;
  api_calls: string[];
  processing_time_seconds: number;
  status: string;
  claim_id: string;
}

interface AgentMetrics {
  totalCalls: number;
  avgConfidence: number;
  avgLatency: number;
  successRate: number;
}

interface VehicleTrend {
  date: string;
  plane: number;
  train: number;
  car: number;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [claims, setClaims] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Inspector State
  const [selectedAgent, setSelectedAgent] =
    useState<string>("extraction_agent");

  // --- Data Loading Logic ---
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Transform Mock Data into standard Claim format
      const mappedClaims = mockClaimsData.map((item) => ({
        claim_id: item.claim_id,
        claim_status:
          item.status === "PENDING_FINANCE_REVIEW"
            ? "REQUIRES_REVIEW"
            : item.status === "APPROVED"
              ? "READY_FOR_FINANCE_APPROVAL"
              : item.status,
        doc_type: item.doc_type,
        travel_details: {
          passenger_name: item.employee_name,
          date: item.travel_start_date,
          from_location: item.source,
          to_location: item.destination,
          fare_amount: item.total_amount,
          ticket_number_or_pnr: item.ticket_number_or_pnr,
        },
      }));

      setClaims(mappedClaims);

      // 2. Calculate Analytics Metrics from Mock Data
      const approvedCount = mappedClaims.filter(
        (c) => c.claim_status === "READY_FOR_FINANCE_APPROVAL",
      ).length;
      const reviewCount = mappedClaims.filter(
        (c) => c.claim_status === "REQUIRES_REVIEW",
      ).length;
      const total = mappedClaims.length;

      setAnalytics({
        processing_metrics: {
          validated_claims: approvedCount,
          validation_rate_percentage:
            total > 0 ? (approvedCount / total) * 100 : 0,
        },
        performance_metrics: {
          average_processing_time_seconds: 1.45, // Mocked latency
        },
        exception_breakdown: {
          total_exceptions: reviewCount,
          exceptions_by_type: {
            BUSINESS_EXCEPTION: Math.round(reviewCount * 0.6),
            CONFIDENCE_EXCEPTION: Math.round(reviewCount * 0.4),
          },
        },
      });

      // 3. Try to fetch real audit logs, fallback to empty array if backend is down
      const logsRes = await api
        .get("/audit-logs")
        .catch(() => ({ data: { audit_logs: [] } }));
      setAuditLogs(logsRes.data?.audit_logs || []);
    } catch (err) {
      console.error("Dashboard Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- 1. Compute Unique Agents for Dropdown ---
  const availableAgents = useMemo(() => {
    const agents = new Set(auditLogs.map((log) => log.agent));
    if (agents.size === 0) return ["extraction_agent", "validation_agent"]; // Fallback
    return Array.from(agents).sort();
  }, [auditLogs]);

  // --- 2. Transform Data for Selected Agent Graph ---
  const agentGraphData = useMemo(() => {
    return auditLogs
      .filter((log) => log.agent === selectedAgent)
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      )
      .map((log) => ({
        timestamp: new Date(log.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        fullDate: new Date(log.timestamp).toLocaleString(),
        confidence: (log.confidence_score || 0) * 100,
        apiCallCount: log.api_calls ? log.api_calls.length : 0,
        latency: log.processing_time_seconds,
        status: log.status,
        claimId: log.claim_id,
      }));
  }, [auditLogs, selectedAgent]);

  // --- 3. Calculate Summary Metrics for Legend ---
  const agentMetrics: AgentMetrics = useMemo(() => {
    const data = agentGraphData;
    if (data.length === 0)
      return { totalCalls: 0, avgConfidence: 0, avgLatency: 0, successRate: 0 };

    const totalCalls = data.reduce((acc, curr) => acc + curr.apiCallCount, 0);
    const avgConfidence =
      data.reduce((acc, curr) => acc + curr.confidence, 0) / data.length;
    const avgLatency =
      data.reduce((acc, curr) => acc + curr.latency, 0) / data.length;
    const successCount = data.filter((d) => d.status === "success").length;

    return {
      totalCalls,
      avgConfidence,
      avgLatency,
      successRate: (successCount / data.length) * 100,
    };
  }, [agentGraphData]);

  // --- 4. Vehicle Trend Data Logic ---
  const vehicleTrendData = useMemo(() => {
    const groupedByDate: Record<string, VehicleTrend> = {};

    claims.forEach((claim) => {
      const date = claim.travel_details?.date;
      if (!date || date.toLowerCase() === "null") return;

      if (!groupedByDate[date])
        groupedByDate[date] = { date, plane: 0, train: 0, car: 0 };

      let amount = 0;
      const rawAmt = claim.travel_details?.fare_amount;
      if (rawAmt) {
        const cleanAmt = String(rawAmt).replace(/[^0-9.]/g, "");
        amount = parseFloat(cleanAmt) || 0;
      }

      const type = (claim.doc_type || "").toLowerCase();

      if (
        type.includes("airline") ||
        type.includes("flight") ||
        type.includes("boarding")
      )
        groupedByDate[date].plane += amount;
      else if (type.includes("rail") || type.includes("train"))
        groupedByDate[date].train += amount;
      else groupedByDate[date].car += amount;
    });

    return Object.values(groupedByDate).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [claims]);

  const getDocIcon = (type: string) => {
    const t = type?.toLowerCase() || "";
    if (t.includes("airline") || t.includes("boarding"))
      return <Plane className="text-blue-400" size={18} />;
    if (t.includes("rail") || t.includes("train"))
      return <Train className="text-orange-400" size={18} />;
    return <Car className="text-yellow-400" size={18} />;
  };

  const CustomAgentTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-xl text-xs">
          <p className="font-bold text-gray-200 mb-2">{data.fullDate}</p>
          <div className="space-y-1">
            <p className="flex justify-between gap-4 text-purple-300">
              <span>Confidence:</span>
              <span className="font-mono font-bold">
                {data.confidence.toFixed(1)}%
              </span>
            </p>
            <p className="flex justify-between gap-4 text-blue-300">
              <span>API Calls:</span>
              <span className="font-mono">{data.apiCallCount}</span>
            </p>
            <p className="flex justify-between gap-4 text-emerald-300">
              <span>Latency:</span>
              <span className="font-mono">{data.latency.toFixed(3)}s</span>
            </p>
            <p className="flex justify-between gap-4 text-gray-400 border-t border-gray-800 pt-1 mt-1">
              <span>Claim ID:</span>
              <span className="font-mono">{data.claimId}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading)
    return (
      <FinancierLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <LoadingSpinner size="lg" text="Analyzing Agent Neural Pathways..." />
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

        {/* --- KPI CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard className="p-5 border-l-4 border-l-purple-500 flex flex-col justify-center">
            <span className="text-sm text-gray-400 font-medium">
              Auto-Validated
            </span>
            <div className="text-3xl font-bold mt-1 text-white">
              {analytics?.processing_metrics?.validated_claims || 0}
            </div>
          </GlassCard>

          <GlassCard className="p-5 border-l-4 border-l-blue-500 flex flex-col justify-center">
            <span className="text-sm text-gray-400 font-medium">
              Avg Velocity
            </span>
            <div className="text-3xl font-bold mt-1 text-white">
              {analytics?.performance_metrics
                ?.average_processing_time_seconds || 0}
              s
            </div>
          </GlassCard>

          <GlassCard className="p-5 border-l-4 border-l-emerald-500 flex flex-col justify-center">
            <span className="text-sm text-gray-400 font-medium">
              Success Rate
            </span>
            <div className="text-3xl font-bold mt-1 text-white">
              {analytics?.processing_metrics?.validation_rate_percentage?.toFixed(
                0,
              ) || 0}
              %
            </div>
          </GlassCard>

          <GlassCard className="relative group p-5 border-l-4 border-l-red-500 transition-all duration-300 ease-in-out hover:h-auto min-h-[100px] overflow-hidden cursor-default bg-gray-900/60 hover:bg-gray-900 hover:shadow-lg hover:shadow-red-900/20 hover:ring-1 hover:ring-red-500/30">
            <div className="flex flex-col h-full">
              <div>
                <span className="text-sm text-gray-400 font-medium flex items-center gap-2">
                  System Exceptions
                  <Activity
                    size={14}
                    className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </span>
                <div className="text-3xl font-bold mt-1 text-red-400 group-hover:text-red-300 transition-colors">
                  {analytics?.exception_breakdown?.total_exceptions || 0}
                </div>
              </div>

              <div className="max-h-0 opacity-0 group-hover:max-h-64 group-hover:opacity-100 transition-all duration-500 ease-in-out">
                <div className="pt-4 mt-2 border-t border-red-500/20 space-y-2">
                  <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                    Error Breakdown
                  </p>
                  {Object.entries(
                    analytics?.exception_breakdown?.exceptions_by_type || {},
                  ).map(([key, count]) => {
                    const val = count as number;
                    if (val === 0) return null;
                    return (
                      <div
                        key={key}
                        className="flex justify-between items-center text-xs"
                      >
                        <span className="text-gray-300 capitalize">
                          {key
                            .replace(/_/g, " ")
                            .replace("EXCEPTION", "")
                            .toLowerCase()}
                        </span>
                        <span className="font-mono font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">
                          {val}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* --- AGENT PERFORMANCE INSPECTOR --- */}
        <GlassCard className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-6">
            <div className="flex-1">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                <Bot size={20} className="text-cyan-400" />
                Agent Performance Inspector
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Analyze confidence stability and API consumption per agent.
              </p>
              <div className="relative w-64">
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="w-full bg-gray-900/50 border border-gray-700 text-cyan-400 font-medium text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block p-2.5"
                >
                  {availableAgents.map((agent) => (
                    <option key={agent} value={agent}>
                      {agent.replace(/_/g, " ").toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-4 md:gap-8 bg-gray-900/30 p-4 rounded-xl border border-gray-800">
              <div className="text-center">
                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">
                  Avg Confidence
                </div>
                <div
                  className={`text-xl font-bold ${agentMetrics.avgConfidence > 80 ? "text-emerald-400" : "text-yellow-400"}`}
                >
                  {agentMetrics.avgConfidence.toFixed(1)}%
                </div>
              </div>
              <div className="w-px bg-gray-700 h-10 self-center"></div>
              <div className="text-center">
                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">
                  Avg Latency
                </div>
                <div className="text-xl font-bold text-pink-400">
                  {agentMetrics.avgLatency.toFixed(2)}s
                </div>
              </div>
            </div>
          </div>

          <div className="h-72 w-full bg-gray-900/20 rounded-lg p-4 relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={agentGraphData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#374151"
                  vertical={false}
                />
                <XAxis dataKey="timestamp" stroke="#6B7280" fontSize={11} />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={11}
                  domain={[0, 100]}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip content={<CustomAgentTooltip />} />
                <ReferenceLine
                  y={80}
                  stroke="#10B981"
                  strokeDasharray="3 3"
                  label={{
                    value: "Target",
                    position: "insideTopRight",
                    fill: "#10B981",
                    fontSize: 10,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="confidence"
                  stroke="#22D3EE"
                  strokeWidth={3}
                  dot={{ fill: "#0891B2", r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 6, stroke: "#22D3EE", strokeWidth: 2 }}
                  animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
            {agentGraphData.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                No audit data available for this agent (Backend Offline).
              </div>
            )}
          </div>
        </GlassCard>

        {/* --- STATUS & VEHICLE GRAPHS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GlassCard className="p-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-6 flex items-center gap-2">
              <Activity size={16} className="text-purple-400" />
              Claim Status Distribution
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    {
                      name: "Approved",
                      count: claims.filter(
                        (c) => c.claim_status === "READY_FOR_FINANCE_APPROVAL",
                      ).length,
                      fill: "#10B981",
                    },
                    {
                      name: "Review",
                      count: claims.filter(
                        (c) => c.claim_status === "REQUIRES_REVIEW",
                      ).length,
                      fill: "#FACC15",
                    },
                    {
                      name: "Rejected",
                      count: claims.filter((c) => c.claim_status === "REJECTED")
                        .length,
                      fill: "#EF4444",
                    },
                    {
                      name: "Pending",
                      count: claims.filter((c) => c.claim_status === "PENDING")
                        .length,
                      fill: "#9CA3AF",
                    },
                  ]}
                  layout="horizontal"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#374151"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#D1D5DB", fontSize: 12, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    tick={{ fill: "#9CA3AF", fontSize: 12 }}
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    contentStyle={{
                      backgroundColor: "#111827",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                    itemStyle={{ color: "#fff" }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                    <Cell fill="#10B981" />
                    <Cell fill="#FACC15" />
                    <Cell fill="#EF4444" />
                    <Cell fill="#9CA3AF" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-4">
              Expense Trend by Vehicle Type
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={vehicleTrendData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#374151"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#9CA3AF", fontSize: 11 }}
                    tickMargin={10}
                  />
                  <YAxis
                    tick={{ fill: "#9CA3AF", fontSize: 11 }}
                    tickFormatter={(val) => `₹${val / 1000}k`}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111827",
                      border: "1px solid #374151",
                    }}
                    itemStyle={{ color: "#fff" }}
                    formatter={(val: any) =>
                      `₹${Number(val || 0).toLocaleString()}`
                    }
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    content={({ payload }) => (
                      <div className="flex justify-end gap-6 text-xs font-medium mb-4">
                        {payload?.map((entry, index) => (
                          <div
                            key={`item-${index}`}
                            className="flex items-center gap-2"
                            style={{ color: entry.color }}
                          >
                            {entry.value === "Airlines" && <Plane size={14} />}
                            {entry.value === "Rail" && <Train size={14} />}
                            {entry.value === "Cab" && <Car size={14} />}
                            <span>{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="plane"
                    name="Airlines"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="train"
                    name="Rail"
                    stroke="#F97316"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="car"
                    name="Cab"
                    stroke="#FACC15"
                    strokeWidth={3}
                    dot={false}
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
