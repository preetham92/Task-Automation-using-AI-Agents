import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  iconColor = "text-primary",
  children,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4", className)}>
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          {Icon && <Icon className={cn("w-7 h-7", iconColor)} />}
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground text-sm md:text-base">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </header>
  );
}
