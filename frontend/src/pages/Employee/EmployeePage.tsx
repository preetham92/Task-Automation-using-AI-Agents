import React, { useState } from "react";
import { api, endpoints } from "@/api";
import { Claim } from "@/types";
import { EmployeeLayout } from "@/components/layout/EmployeeLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";


const mapClaimToTable = (data: any) => {
  if (!data?.claim_summary) return [];

  const qs = data.claim_summary.quality_signals;

  return [
    { label: "Claim ID", value: data.claim_id },
    { label: "File Name", value: data.file_name },
    { label: "Document Type", value: data.doc_type },
    { label: "Claim Status", value: data.claim_summary.claim_status },
    {
      label: "Exception Reason",
      value: qs?.exception_reason || "—",
    },
    {
      label: "Confidence",
      value: qs?.confidence ? `${qs.confidence * 100}%` : "—",
    },
    {
      label: "Processing Time",
      value: `${data.processing_time_seconds}s`,
    },
  ];
};

export default function EmployeePage() {
  const [file, setFile] = useState<File | null>(null);

  const [status, setStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");

  const [result, setResult] = useState<Claim | any | null>(null);

  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setStatus("idle");
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
      setResult(null);
      setStatus("idle");
    }
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a file first!");

    setStatus("uploading");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("employee_id", "EMP001");

    try {
      const response = await api.post(endpoints.upload, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult(response.data);
      setStatus("success");
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { detail?: string } };
        message?: string;
      };

      setResult({
        error: err.response?.data?.detail || err.message || "Upload failed",
      });
      setStatus("error");
    }
  };

  return (
    <EmployeeLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
        <PageHeader
          title="Upload Travel Document"
          description="Submit your receipts and travel documents for AI-powered processing"
          icon={Upload}
        />

        <GlassCard className="mb-6">
          {/* Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={cn(
              "relative border-2 border-dashed rounded-xl p-8 md:p-12 text-center transition-all duration-300",
              dragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-card/50",
              file && "border-success/50 bg-success/5"
            )}
          >
            <input
              type="file"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".pdf,.jpg,.jpeg,.png"
            />

            <div className="space-y-4">
              <div
                className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto transition-colors",
                  file
                    ? "bg-success/10 text-success"
                    : "bg-primary/10 text-primary"
                )}
              >
                {file ? <FileText size={28} /> : <Upload size={28} />}
              </div>

              {file ? (
                <>
                  <p className="text-lg font-medium text-foreground">
                    {file.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB • Click or drag to replace
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium text-foreground">
                    Drop your file here
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse • PDF, JPG, PNG supported
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Upload Button */}
          <div className="mt-6 flex justify-center">
            <Button
              onClick={handleUpload}
              disabled={!file || status === "uploading"}
              size="lg"
              className={cn(
                "min-w-[200px] gap-2",
                status === "success" && "bg-success hover:bg-success/90",
                status === "error" && "bg-destructive hover:bg-destructive/90"
              )}
            >
              {status === "uploading" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : status === "success" ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Upload Complete
                </>
              ) : status === "error" ? (
                <>
                  <AlertCircle className="w-4 h-4" />
                  Try Again
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload & Analyze
                </>
              )}
            </Button>
          </div>
        </GlassCard>

        {/* Result Table */}
        {!!result && status === "success" && (
          <GlassCard className="animate-scale-in">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
              Claim Details
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full border border-border/50 rounded-lg">
                <tbody>
                  {mapClaimToTable(result).map((row) => (
                    <tr
                      key={row.label}
                      className="border-b last:border-b-0 border-border/50"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-muted-foreground bg-background/40 w-1/3">
                        {row.label}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setResult(null);
                  setStatus("idle");
                }}
              >
                Edit & Re-upload
              </Button>
            </div>
          </GlassCard>
        )}
      </div>
    </EmployeeLayout>
  );
}
