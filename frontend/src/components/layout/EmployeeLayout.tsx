import { ReactNode } from "react";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { EmployeeSidebar } from "./EmployeeSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";

interface EmployeeLayoutProps {
  children: ReactNode;
}

export function EmployeeLayout({ children }: EmployeeLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <EmployeeSidebar />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border/50 bg-background/80 backdrop-blur-md px-4">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex-1" />
            <ThemeToggle />
          </header>
          <main className="flex-1">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
