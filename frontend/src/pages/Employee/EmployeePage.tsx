import React, { useState } from "react";
import { api, endpoints } from "@/api";
import { EmployeeLayout } from "@/components/layout/EmployeeLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function EmployeePage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [result, setResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>(null);
  const [amountError, setAmountError] = useState<string>("");
  const [isAmountValid, setIsAmountValid] = useState(true);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [uploadedFilename, setUploadedFilename] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setStatus("idle");
      setErrorMessage("");
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
      setErrorMessage("");
    }
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a file first!");

    setStatus("uploading");
    setErrorMessage("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("employee_id", "EMP001");

    try {
      const response = await api.post(endpoints.upload, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (
        response.data.status === "extracted" &&
        response.data.employee_verification
      ) {
        setResult(response.data);
        setEditedData(response.data.employee_verification);
        setUploadedFilename(response.data.filename || file.name);
        setStatus("success");
      } else if (response.data.status === "error") {
        setErrorMessage(response.data.message || "Extraction failed");
        setStatus("error");
      }
    } catch (error: any) {
      setErrorMessage(
        error.response?.data?.message || error.message || "Upload failed",
      );
      setStatus("error");
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setStatus("idle");
    setErrorMessage("");
    setIsEditing(false);
    setEditedData(null);
    setShowSuccessNotification(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedData(result?.employee_verification);
    setAmountError("");
    setIsAmountValid(true);
  };

  const handleConfirm = async () => {
    try {
      // Prepare confirmation data
      const confirmationData = {
        employee_id: editedData.employee_id,
        employee_name: editedData.employee_name,
        employee_role: editedData.employee_role,
        ticket_number_or_pnr: editedData.ticket_number_or_pnr,
        source: editedData.source,
        destination: editedData.destination,
        travel_start_date: editedData.travel_start_date,
        travel_end_date: editedData.travel_end_date,
        total_amount: parseFloat(editedData.total_amount),
        filename: uploadedFilename,
      };

      // Call the /confirm endpoint
      const response = await api.post(endpoints.confirm, confirmationData);

      if (response.data.status === "success") {
        // Show success notification
        setShowSuccessNotification(true);
        setTimeout(() => {
          setShowSuccessNotification(false);
        }, 5000); // Hide after 5 seconds

        // Reset everything to prepare for another document
        setIsEditing(false);
        setFile(null);
        setResult(null);
        setStatus("idle");
        setErrorMessage("");
        setEditedData(null);
        setUploadedFilename("");
      } else {
        setErrorMessage(response.data.message || "Confirmation failed");
      }
    } catch (error: any) {
      setErrorMessage(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          error.message ||
          "Failed to confirm submission",
      );
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    // Validate total_amount to accept only valid numbers
    if (field === "total_amount") {
      // Allow empty string or valid positive numbers with up to 2 decimal places
      if (value === "") {
        setAmountError("Amount is required");
        setIsAmountValid(false);
        setEditedData((prev: any) => ({
          ...prev,
          [field]: value,
        }));
      } else if (/^\d+(\.\d{0,2})?$/.test(value)) {
        // Valid number with optional up to 2 decimal places
        setAmountError("");
        setIsAmountValid(true);
        setEditedData((prev: any) => ({
          ...prev,
          [field]: value,
        }));
      } else {
        // Invalid format
        setAmountError(
          "Enter a valid positive number (up to 2 decimal places)",
        );
        setIsAmountValid(false);
      }
    } else {
      setEditedData((prev: any) => ({
        ...prev,
        [field]: value,
      }));
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

        {/* Success Notification */}
        {showSuccessNotification && (
          <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg flex items-start gap-3 animate-scale-in">
            <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-success">
                Document Uploaded Successfully!
              </p>
              <p className="text-xs text-success/80 mt-1">
                Your travel document has been processed and data extracted
                successfully.
              </p>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <GlassCard className="mb-6">
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
              disabled={status === "uploading"}
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

          <div className="mt-6 flex justify-center">
            <Button
              onClick={handleUpload}
              disabled={!file || status === "uploading"}
              size="lg"
              className="min-w-[200px] gap-2"
            >
              {status === "uploading" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload & Extract
                </>
              )}
            </Button>
          </div>

          {errorMessage && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              <p className="text-sm text-destructive">{errorMessage}</p>
            </div>
          )}
        </GlassCard>

        {/* Extracted Details Table */}
        {status === "success" && result?.employee_verification && (
          <GlassCard className="animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Extracted Travel Details
              </h3>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  Edit Details
                </Button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border border-border/50 rounded-lg">
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="px-4 py-3 text-sm font-medium text-muted-foreground bg-background/20 w-1/3">
                      Employee ID
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedData?.employee_id || ""}
                          onChange={(e) =>
                            handleFieldChange("employee_id", e.target.value)
                          }
                          className="w-full px-2 py-1 border border-border rounded bg-background text-foreground"
                        />
                      ) : (
                        editedData?.employee_id
                      )}
                    </td>
                  </tr>

                  <tr className="border-b border-border/50">
                    <td className="px-4 py-3 text-sm font-medium text-muted-foreground bg-background/20">
                      Employee Name
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedData?.employee_name || ""}
                          onChange={(e) =>
                            handleFieldChange("employee_name", e.target.value)
                          }
                          className="w-full px-2 py-1 border border-border rounded bg-background text-foreground"
                        />
                      ) : (
                        editedData?.employee_name
                      )}
                    </td>
                  </tr>

                  <tr className="border-b border-border/50">
                    <td className="px-4 py-3 text-sm font-medium text-muted-foreground bg-background/20">
                      Employee Role
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedData?.employee_role || ""}
                          onChange={(e) =>
                            handleFieldChange("employee_role", e.target.value)
                          }
                          className="w-full px-2 py-1 border border-border rounded bg-background text-foreground"
                        />
                      ) : (
                        editedData?.employee_role
                      )}
                    </td>
                  </tr>

                  <tr className="border-b border-border/50">
                    <td className="px-4 py-3 text-sm font-medium text-muted-foreground bg-background/20">
                      Ticket Number / PNR
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedData?.ticket_number_or_pnr || ""}
                          onChange={(e) =>
                            handleFieldChange(
                              "ticket_number_or_pnr",
                              e.target.value,
                            )
                          }
                          className="w-full px-2 py-1 border border-border rounded bg-background text-foreground"
                        />
                      ) : (
                        editedData?.ticket_number_or_pnr
                      )}
                    </td>
                  </tr>

                  <tr className="border-b border-border/50">
                    <td className="px-4 py-3 text-sm font-medium text-muted-foreground bg-background/20">
                      From
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedData?.source || ""}
                          onChange={(e) =>
                            handleFieldChange("source", e.target.value)
                          }
                          className="w-full px-2 py-1 border border-border rounded bg-background text-foreground"
                        />
                      ) : (
                        editedData?.source
                      )}
                    </td>
                  </tr>

                  <tr className="border-b border-border/50">
                    <td className="px-4 py-3 text-sm font-medium text-muted-foreground bg-background/20">
                      To
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedData?.destination || ""}
                          onChange={(e) =>
                            handleFieldChange("destination", e.target.value)
                          }
                          className="w-full px-2 py-1 border border-border rounded bg-background text-foreground"
                        />
                      ) : (
                        editedData?.destination
                      )}
                    </td>
                  </tr>

                  <tr className="border-b border-border/50">
                    <td className="px-4 py-3 text-sm font-medium text-muted-foreground bg-background/20">
                      Travel Start Date
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {isEditing ? (
                        <input
                          type="date"
                          value={editedData?.travel_start_date || ""}
                          onChange={(e) =>
                            handleFieldChange(
                              "travel_start_date",
                              e.target.value,
                            )
                          }
                          className="w-full px-2 py-1 border border-border rounded bg-background text-foreground"
                        />
                      ) : (
                        editedData?.travel_start_date
                      )}
                    </td>
                  </tr>

                  <tr className="border-b border-border/50">
                    <td className="px-4 py-3 text-sm font-medium text-muted-foreground bg-background/20">
                      Travel End Date
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {isEditing ? (
                        <input
                          type="date"
                          value={editedData?.travel_end_date || ""}
                          onChange={(e) =>
                            handleFieldChange("travel_end_date", e.target.value)
                          }
                          className="w-full px-2 py-1 border border-border rounded bg-background text-foreground"
                        />
                      ) : (
                        editedData?.travel_end_date
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-muted-foreground bg-background/20">
                      Total Amount
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground font-semibold">
                      {isEditing ? (
                        <div>
                          <div className="flex items-center gap-1">
                            <span>₹</span>
                            <input
                              type="text"
                              value={editedData?.total_amount || ""}
                              onChange={(e) =>
                                handleFieldChange(
                                  "total_amount",
                                  e.target.value,
                                )
                              }
                              className={cn(
                                "w-full px-2 py-1 border rounded bg-background text-foreground font-semibold",
                                amountError
                                  ? "border-destructive focus:ring-destructive"
                                  : "border-border",
                              )}
                              placeholder="0.00"
                            />
                          </div>
                          {amountError && (
                            <p className="text-xs text-destructive mt-1">
                              {amountError}
                            </p>
                          )}
                        </div>
                      ) : (
                        `₹${editedData?.total_amount}`
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button onClick={handleConfirm} disabled={!isAmountValid}>
                    Confirm Details
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={handleReset}>
                    ReUpload{" "}
                  </Button>
                  <Button onClick={handleConfirm}>Confirm</Button>
                </>
              )}
            </div>
          </GlassCard>
        )}
      </div>
    </EmployeeLayout>
  );
}
