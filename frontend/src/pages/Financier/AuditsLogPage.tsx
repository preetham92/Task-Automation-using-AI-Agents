import { useEffect, useState } from "react";
import { api, endpoints } from "@/api";
import { FinancierLayout } from "@/components/layout/FinancierLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  ShieldCheck,
  Cpu,
  Globe,
  Zap,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface AuditLog {
  timestamp: string;
  claim_id: string;
  agent: string;
  action: string;
  confidence_score: number | null;
  processing_time_seconds: number;
  api_calls: string[];
  status: string;
  notes: string | null;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await api.get(endpoints.auditLogs);
        if (response.data.status === "success") {
          setLogs(response.data.audit_logs);
        }
      } catch (err) {
        console.error("Failed to load audit trail:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const getStatusIcon = (status: string) => {
    if (status === "success")
      return <CheckCircle className="text-emerald-400" size={14} />;
    if (status === "exception")
      return <AlertTriangle className="text-orange-400" size={14} />;
    return <Zap className="text-blue-400" size={14} />;
  };

  if (loading)
    return (
      <FinancierLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <LoadingSpinner size="lg" text="Retrieving AI Decision Trail..." />
        </div>
      </FinancierLayout>
    );

  return (
    <FinancierLayout>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <PageHeader
          title="System Audit Logs"
          description="Transparent trail of AI Agent actions and external API integrations"
          icon={ShieldCheck}
        />

        <GlassCard>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-separate border-spacing-0">
              <thead className="bg-gray-900/50 text-gray-500 uppercase font-bold text-[10px] tracking-widest border-b border-gray-800">
                <tr>
                  <th className="p-4 pl-6">Timestamp</th>
                  <th className="p-4">AI Agent</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">API Calls</th>
                  <th className="p-4">Confidence</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4">Execution Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {logs.map((log, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-800/30 transition-colors group"
                  >
                    <td className="p-4 pl-6 font-mono text-gray-500 text-[10px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="p-4 flex items-center gap-2">
                      <Cpu size={14} className="text-purple-400" />
                      <span className="capitalize font-medium text-gray-200">
                        {log.agent.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-gray-300 capitalize">
                      {log.action}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {log.api_calls.map((call, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-[9px] text-gray-400 flex items-center gap-1"
                          >
                            <Globe size={8} /> {call}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 font-mono">
                      {log.confidence_score
                        ? (log.confidence_score * 100).toFixed(0) + "%"
                        : "-"}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1 uppercase font-bold text-[9px]">
                        {getStatusIcon(log.status)}
                        <span
                          className={
                            log.status === "success"
                              ? "text-emerald-400"
                              : "text-orange-400"
                          }
                        >
                          {log.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 italic text-gray-500 max-w-xs truncate">
                      {log.notes || "No exceptions detected."}
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
