import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, History, FileEdit } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import AssistoLogo from "@/components/layout/AssistoLogo.png";

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === "/";
  const isFinancier = location.pathname.startsWith("/financier");
  const isEmployee = location.pathname.startsWith("/employee");

  return (
    <nav className="sticky top-0 z-50 glass-strong border-b border-border/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {!isHome && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src={AssistoLogo}
              alt="AssistoAI Logo"
              className="h-8 w-auto"
            />
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          {/* Show Employee Links if in Employee section */}
          {isEmployee && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/employee/drafts")}
              >
                <FileEdit className="w-4 h-4 mr-2" /> Drafts
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/employee/history")}
              >
                <History className="w-4 h-4 mr-2" /> History
              </Button>
            </>
          )}

          {/* Show Financier Links if in Financier section */}
          {isFinancier && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/financier/audit-logs")}
            >
              Audit Logs
            </Button>
          )}

          {!isHome && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground"
            >
              <Home className="w-5 h-5" />
            </Button>
          )}

          {isHome && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate("/financier/analytics")}
              >
                Financier Portal
              </Button>
              <Button
                onClick={() => navigate("/employee/upload")}
                className="bg-primary shadow-lg shadow-primary/20"
              >
                Get Started
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
