import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

export function LoadingSpinner({ size = "md", className, text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-8 h-8 border-3",
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "rounded-full border-primary border-t-transparent animate-spin-slow",
          sizeClasses[size]
        )}
      />
      {text && <span className="text-muted-foreground">{text}</span>}
    </div>
  );
}
