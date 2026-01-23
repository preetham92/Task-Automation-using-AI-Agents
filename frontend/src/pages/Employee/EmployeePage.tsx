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

export default function EmployeePage() {
  const [file, setFile] = useState<File | null>(null);

  // Maps to 'isUploading' from your snippet
  const [status, setStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");

  // Typed with Claim (and 'any' to allow for error objects in the UI catch block)
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

    setStatus("uploading"); // Equivalent to setIsUploading(true)

    const formData = new FormData();
    formData.append("file", file);
    formData.append("employee_id", "EMP001"); // Hardcoded as per snippet

    try {
      const response = await api.post(endpoints.upload, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("Upload Success:", response.data);
      setResult(response.data); // Matches setUploadResult(response.data)
      setStatus("success");
    } catch (error: unknown) {
      console.error("Upload failed:", error);
      const err = error as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      // Preserving UI error display logic
      setResult({
        error: err.response?.data?.detail || err.message || "Upload failed",
      });
      setStatus("error");
    }
    // 'finally' block logic is handled by the setStatus calls above to maintain UI states
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
              file && "border-success/50 bg-success/5",
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
                    : "bg-primary/10 text-primary",
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
                    {(file.size / 1024).toFixed(1)} KB • Click or drag to
                    replace
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
                status === "error" && "bg-destructive hover:bg-destructive/90",
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

        {/* Result Display */}
        {!!result && (
          <GlassCard className="animate-scale-in">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              Analysis Result
            </h3>
            <pre className="bg-background/50 p-4 rounded-lg overflow-x-auto text-sm font-mono text-muted-foreground border border-border/50">
              {JSON.stringify(result, null, 2)}
            </pre>
          </GlassCard>
        )}
      </div>
    </EmployeeLayout>
  );
}
