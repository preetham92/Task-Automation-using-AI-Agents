import { useEffect, useState } from "react";
<<<<<<< HEAD
import { api } from "@/api";
=======
import { mockClaimsData } from "@/data/mockClaims";
>>>>>>> 007cd4261468c478c0da23605f6f00a6f623047e
import { FinancierLayout } from "@/components/layout/FinancierLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  FileSearch,
  User,
  Calendar,
  DollarSign,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
<<<<<<< HEAD
  DialogDescription,
  DialogHeader,
  DialogTitle,
=======
  DialogHeader,
  DialogTitle,
  DialogDescription,
>>>>>>> 007cd4261468c478c0da23605f6f00a6f623047e
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Submission {
  claim_id: string;
  employee_id: string;
  employee_name: string;
  employee_role: string;
  ticket_number_or_pnr: string;
  source: string;
  destination: string;
  travel_start_date: string;
  travel_end_date: string;
  total_amount: number;
  status: string;
  submission_timestamp: string;
  document_filename: string;
  original_filename: string;
  document_url?: string;
  approved_amount?: number;
  finance_notes?: string;
  finance_decision_timestamp?: string;
}

export default function ReviewPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [approvedAmount, setApprovedAmount] = useState("");
  const [financeNotes, setFinanceNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
<<<<<<< HEAD
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PENDING_FINANCE_REVIEW" | "APPROVED" | "REJECTED"
  >("ALL");
=======
>>>>>>> 007cd4261468c478c0da23605f6f00a6f623047e

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
<<<<<<< HEAD
      const response = await api.get("/submissions");
      setSubmissions(response.data?.submissions || []);
=======
      // Simulate network delay to make it feel real
      await new Promise((resolve) => setTimeout(resolve, 600));
      // Use Mock Data directly
      setSubmissions(mockClaimsData);
>>>>>>> 007cd4261468c478c0da23605f6f00a6f623047e
    } catch (err) {
      console.error("Failed to load submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

<<<<<<< HEAD
  const handleViewSubmission = async (submission: Submission) => {
    try {
      const response = await api.get(`/submissions/${submission.claim_id}`);
      const fullSubmission = response.data?.submission || submission;
      setSelectedSubmission(fullSubmission);
      setApprovedAmount(fullSubmission.total_amount?.toString() || "");
      setFinanceNotes(fullSubmission.finance_notes || "");
      setModalOpen(true);
    } catch (err) {
      console.error("Failed to load submission details:", err);
    }
=======
  const handleViewSubmission = (submission: Submission) => {
    setSelectedSubmission(submission);
    setApprovedAmount(submission.total_amount?.toString() || "");
    setFinanceNotes(submission.finance_notes || "");
    setModalOpen(true);
>>>>>>> 007cd4261468c478c0da23605f6f00a6f623047e
  };

  const handleDecision = async (decision: "APPROVED" | "REJECTED") => {
    if (!selectedSubmission) return;

<<<<<<< HEAD
    // Validate approved amount for approval
=======
>>>>>>> 007cd4261468c478c0da23605f6f00a6f623047e
    if (decision === "APPROVED") {
      const amount = parseFloat(approvedAmount);
      if (isNaN(amount) || amount <= 0) {
        alert("Please enter a valid approved amount");
        return;
      }
    }

<<<<<<< HEAD
    try {
      setSubmitting(true);
      await api.post(`/submissions/${selectedSubmission.claim_id}/decision`, {
        decision,
        approved_amount:
          decision === "APPROVED" ? parseFloat(approvedAmount) : 0,
        notes: financeNotes,
      });

      // Close modal and refresh submissions
      setModalOpen(false);
      setSelectedSubmission(null);
      setApprovedAmount("");
      setFinanceNotes("");
      await fetchSubmissions();
    } catch (err) {
      console.error("Failed to submit decision:", err);
      alert("Failed to submit decision. Please try again.");
    } finally {
      setSubmitting(false);
    }
=======
    setSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Update local state since we don't have a backend
    const updatedSubmissions = submissions.map((s) =>
      s.claim_id === selectedSubmission.claim_id
        ? {
            ...s,
            status: decision,
            approved_amount:
              decision === "APPROVED" ? parseFloat(approvedAmount) : 0,
            finance_notes: financeNotes,
            finance_decision_timestamp: new Date().toISOString(),
          }
        : s,
    );
    setSubmissions(updatedSubmissions);

    setModalOpen(false);
    setSelectedSubmission(null);
    setApprovedAmount("");
    setFinanceNotes("");
    setSubmitting(false);
>>>>>>> 007cd4261468c478c0da23605f6f00a6f623047e
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      APPROVED: {
        icon: <CheckCircle size={14} />,
        color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
        label: "APPROVED",
      },
      REJECTED: {
        icon: <XCircle size={14} />,
        color: "text-red-400 bg-red-400/10 border-red-400/30",
        label: "REJECTED",
      },
      PENDING_FINANCE_REVIEW: {
        icon: <Clock size={14} />,
        color: "text-blue-400 bg-blue-400/10 border-blue-400/30",
        label: "PENDING REVIEW",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig.PENDING_FINANCE_REVIEW;

    return (
      <div
        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full border ${config.color} font-bold text-[10px] tracking-wide`}
      >
        {config.icon}
        <span>{config.label}</span>
      </div>
    );
  };

<<<<<<< HEAD
  // Calculate summary stats
=======
>>>>>>> 007cd4261468c478c0da23605f6f00a6f623047e
  const pendingCount = submissions.filter(
    (s) => s.status === "PENDING_FINANCE_REVIEW",
  ).length;
  const approvedCount = submissions.filter(
    (s) => s.status === "APPROVED",
  ).length;
  const rejectedCount = submissions.filter(
    (s) => s.status === "REJECTED",
  ).length;
  const totalApprovedAmount = submissions
    .filter((s) => s.status === "APPROVED")
<<<<<<< HEAD
    .reduce((sum, s) => sum + (s.approved_amount || 0), 0);

  const filteredSubmissions =
    statusFilter === "ALL"
      ? submissions
      : submissions.filter((s) => s.status === statusFilter);
=======
    .reduce((sum, s) => sum + (s.approved_amount || s.total_amount || 0), 0);
>>>>>>> 007cd4261468c478c0da23605f6f00a6f623047e

  if (loading)
    return (
      <FinancierLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <LoadingSpinner size="lg" text="Loading Submissions..." />
        </div>
      </FinancierLayout>
    );

  return (
    <FinancierLayout>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <PageHeader
          title="Finance Review Dashboard"
          description="Review and approve employee expense submissions"
          icon={FileSearch}
        />

<<<<<<< HEAD
        {/* Summary Stats */}
=======
>>>>>>> 007cd4261468c478c0da23605f6f00a6f623047e
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <GlassCard className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="text-blue-400" size={18} />
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                  Pending Review
                </p>
                <p className="text-lg font-bold text-blue-400">
                  {pendingCount}
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="text-emerald-400" size={18} />
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                  Approved
                </p>
                <p className="text-lg font-bold text-emerald-400">
                  {approvedCount}
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-3">
            <div className="flex items-center gap-2">
              <XCircle className="text-red-400" size={18} />
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                  Rejected
                </p>
                <p className="text-lg font-bold text-red-400">
                  {rejectedCount}
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-3">
            <div className="flex items-center gap-2">
              <DollarSign className="text-purple-400" size={18} />
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                  Total Approved
                </p>
                <p className="text-lg font-bold text-purple-400">
                  ₹{(totalApprovedAmount / 1000).toFixed(1)}K
                </p>
              </div>
            </div>
          </GlassCard>
        </div>

<<<<<<< HEAD
        {/* Submissions Table */}
        <GlassCard>
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <label
                htmlFor="statusFilter"
                className="text-xs text-gray-400 font-medium"
              >
                Filter by Status:
              </label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as typeof statusFilter)
                }
                className="bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">All</option>
                <option value="PENDING_FINANCE_REVIEW">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
=======
        <GlassCard>
>>>>>>> 007cd4261468c478c0da23605f6f00a6f623047e
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-separate border-spacing-0">
              <thead className="bg-gray-900/50 text-gray-500 uppercase font-bold text-[10px] tracking-widest border-b border-gray-800">
                <tr>
                  <th className="p-4 pl-6">Claim ID</th>
                  <th className="p-4">Employee</th>
                  <th className="p-4">Travel Details</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4">Submitted</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
<<<<<<< HEAD
                {filteredSubmissions.length > 0 ? (
                  filteredSubmissions.map((submission) => (
=======
                {submissions.length > 0 ? (
                  submissions.map((submission) => (
>>>>>>> 007cd4261468c478c0da23605f6f00a6f623047e
                    <tr
                      key={submission.claim_id}
                      className="hover:bg-gray-800/30 transition-colors group"
                    >
                      <td className="p-4 pl-6 font-mono text-purple-400 font-bold text-[10px]">
                        {submission.claim_id}
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User size={12} className="text-blue-400" />
                            <span className="font-medium text-gray-200">
                              {submission.employee_name}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            {submission.employee_id}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1 text-[11px]">
                          <div className="text-gray-300">
                            {submission.source} → {submission.destination}
                          </div>
                          <div className="text-gray-500 font-mono">
                            {submission.ticket_number_or_pnr}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-mono font-bold">
                          <DollarSign size={12} />
                          {submission.total_amount.toLocaleString()}
                        </div>
<<<<<<< HEAD
                        {submission.approved_amount !== undefined &&
                          submission.approved_amount !==
                            submission.total_amount && (
                            <div className="text-[10px] text-gray-500 mt-1">
                              Approved: ₹
                              {submission.approved_amount.toLocaleString()}
                            </div>
                          )}
=======
>>>>>>> 007cd4261468c478c0da23605f6f00a6f623047e
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center">
                          {getStatusBadge(submission.status)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-gray-400 font-mono text-[10px]">
                          <Calendar size={12} />
                          {new Date(
                            submission.submission_timestamp,
<<<<<<< HEAD
                          ).toLocaleString()}
=======
                          ).toLocaleDateString()}
>>>>>>> 007cd4261468c478c0da23605f6f00a6f623047e
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewSubmission(submission)}
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                          >
                            <Eye size={14} className="mr-1" />
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-gray-500 italic"
                    >
                      No submissions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      {/* Submission Details Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] bg-gray-950 border-gray-800 text-gray-100 overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="text-blue-400" />
              Submission Details
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Review the submission and make a decision
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6 py-4">
<<<<<<< HEAD
              {/* Two Column Layout: Info + Document Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Employee & Travel Info */}
                <div className="space-y-4">
                  {/* Employee Information */}
=======
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
>>>>>>> 007cd4261468c478c0da23605f6f00a6f623047e
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">
                      Employee Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-500">Name:</span>{" "}
                        <span className="text-gray-200 font-medium">
                          {selectedSubmission.employee_name}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">ID:</span>{" "}
                        <span className="text-gray-200 font-mono">
                          {selectedSubmission.employee_id}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Role:</span>{" "}
                        <span className="text-gray-200 capitalize">
                          {selectedSubmission.employee_role}
                        </span>
                      </div>
                    </div>
                  </div>

<<<<<<< HEAD
                  {/* Travel Information */}
=======
>>>>>>> 007cd4261468c478c0da23605f6f00a6f623047e
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">
                      Travel Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-500">Route:</span>{" "}
                        <span className="text-gray-200">
                          {selectedSubmission.source} →{" "}
                          {selectedSubmission.destination}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Ticket:</span>{" "}
                        <span className="text-gray-200 font-mono">
                          {selectedSubmission.ticket_number_or_pnr}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Dates:</span>{" "}
                        <span className="text-gray-200">
                          {selectedSubmission.travel_start_date} to{" "}
                          {selectedSubmission.travel_end_date}
                        </span>
                      </div>
                    </div>
                  </div>

<<<<<<< HEAD
                  {/* Claimed Amount */}
=======
>>>>>>> 007cd4261468c478c0da23605f6f00a6f623047e
                  <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">
                        Claimed Amount:
                      </span>
                      <span className="text-2xl font-bold text-emerald-400">
                        ₹{selectedSubmission.total_amount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Decision Section - Only show if pending */}
                  {selectedSubmission.status === "PENDING_FINANCE_REVIEW" && (
                    <div className="space-y-4 pt-4 border-t border-gray-800">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">
                        Finance Decision
                      </h3>

                      <div className="space-y-3">
                        <div>
                          <label className="text-sm text-gray-400 block mb-2">
                            Approved Amount *
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            value={approvedAmount}
                            onChange={(e) => setApprovedAmount(e.target.value)}
                            placeholder="Enter approved amount"
                            className="bg-gray-900/50 border-gray-800 text-gray-100"
                          />
                        </div>

                        <div>
                          <label className="text-sm text-gray-400 block mb-2">
                            Notes (Optional)
                          </label>
                          <Textarea
                            value={financeNotes}
                            onChange={(e) => setFinanceNotes(e.target.value)}
                            placeholder="Add any notes about this decision..."
                            className="bg-gray-900/50 border-gray-800 text-gray-100 min-h-[80px]"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button
                          onClick={() => handleDecision("APPROVED")}
                          disabled={submitting}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle size={16} className="mr-2" />
                          {submitting ? "Processing..." : "Approve"}
                        </Button>
                        <Button
                          onClick={() => handleDecision("REJECTED")}
                          disabled={submitting}
                          variant="destructive"
                          className="flex-1"
                        >
                          <XCircle size={16} className="mr-2" />
                          {submitting ? "Processing..." : "Reject"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Already Decided - Show decision info */}
                  {selectedSubmission.status !== "PENDING_FINANCE_REVIEW" && (
                    <div className="space-y-3 pt-4 border-t border-gray-800">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">
                        Decision Information
                      </h3>
                      <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">Status:</span>
                          {getStatusBadge(selectedSubmission.status)}
                        </div>
<<<<<<< HEAD
                        {selectedSubmission.approved_amount !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">
                              Approved Amount:
                            </span>
                            <span className="text-lg font-bold text-emerald-400">
                              ₹
                              {selectedSubmission.approved_amount.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {selectedSubmission.finance_decision_timestamp && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">
                              Decision Date:
                            </span>
                            <span className="text-sm text-gray-300 font-mono">
                              {new Date(
                                selectedSubmission.finance_decision_timestamp,
                              ).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {selectedSubmission.finance_notes && (
                          <div className="pt-2 border-t border-gray-800">
                            <span className="text-sm text-gray-400 block mb-1">
                              Notes:
                            </span>
                            <span className="text-sm text-gray-300 italic">
                              {selectedSubmission.finance_notes}
                            </span>
                          </div>
                        )}
=======
>>>>>>> 007cd4261468c478c0da23605f6f00a6f623047e
                      </div>
                    </div>
                  )}
                </div>

<<<<<<< HEAD
                {/* Right Column: Document Preview */}
=======
>>>>>>> 007cd4261468c478c0da23605f6f00a6f623047e
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide flex items-center gap-2">
                    <FileText className="text-blue-400" size={16} />
                    Document Preview
                  </h3>
                  <div className="bg-gray-900/50 rounded-lg border border-gray-800 overflow-hidden">
                    <div className="p-3 bg-gray-900/70 border-b border-gray-800 flex items-center justify-between">
                      <span className="text-xs text-gray-400 font-mono">
                        {selectedSubmission.original_filename}
                      </span>
<<<<<<< HEAD
                      <a
                        href={`http://localhost:9002/files/${selectedSubmission.claim_id}/${selectedSubmission.document_filename}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 underline"
                      >
                        Open in new tab
                      </a>
                    </div>
                    <iframe
                      src={`http://localhost:9002/files/${selectedSubmission.claim_id}/${selectedSubmission.document_filename}`}
                      className="w-full h-[500px] bg-white"
                      title="Document Preview"
                    />
=======
                    </div>
                    {/* Placeholder for iframe - in a real app this would point to a file URL */}
                    <div className="w-full h-[500px] bg-white flex items-center justify-center text-gray-500">
                      [Document Preview: {selectedSubmission.original_filename}]
                    </div>
>>>>>>> 007cd4261468c478c0da23605f6f00a6f623047e
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </FinancierLayout>
  );
}
