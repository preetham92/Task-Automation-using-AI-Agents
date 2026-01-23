import { ReactNode } from "react";
import { Navbar } from "./Navbar";

interface MainLayoutProps {
  children: ReactNode;
  showNavbar?: boolean;
}

export function MainLayout({ children, showNavbar = true }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {showNavbar && <Navbar />}
      <main className="flex-1">{children}</main>
    </div>
  );
}
