import { cn } from "@/lib/utils";
import { ReactNode, CSSProperties } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  style?: CSSProperties;
}

export function GlassCard({ children, className, hover = false, glow = false, style }: GlassCardProps) {
  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 transition-all duration-300",
        hover && "hover-lift cursor-pointer",
        glow && "glow-primary",
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}
