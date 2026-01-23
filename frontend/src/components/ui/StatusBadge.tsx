import { cn } from "@/lib/utils";

type StatusType = "success" | "warning" | "error" | "info" | "pending";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusMap: Record<string, StatusType> = {
  APPROVED: "success",
  approved: "success",
  success: "success",
  REJECTED: "error",
  rejected: "error",
  fail: "error",
  error: "error",
  PENDING: "pending",
  pending: "pending",
  review: "warning",
  REQUIRES_REVIEW: "warning",
  warning: "warning",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = status?.toLowerCase() || "";
  let type: StatusType = "info";

  for (const [key, value] of Object.entries(statusMap)) {
    if (normalizedStatus.includes(key.toLowerCase())) {
      type = value;
      break;
    }
  }

  const styles: Record<StatusType, string> = {
    success: "bg-success/15 text-success border-success/30",
    warning: "bg-warning/15 text-warning border-warning/30",
    error: "bg-destructive/15 text-destructive border-destructive/30",
    info: "bg-primary/15 text-primary border-primary/30",
    pending: "bg-warning/15 text-warning border-warning/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-colors",
        styles[type],
        className
      )}
    >
      {status?.replace(/_/g, " ") || "PROCESSING"}
    </span>
  );
}
