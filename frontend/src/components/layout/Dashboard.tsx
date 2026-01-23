import { useNavigate } from "react-router-dom";
import { User, ShieldCheck, ArrowRight, Sparkles, Zap, BarChart3 } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { GlassCard } from "@/components/ui/GlassCard";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 md:py-20">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            AI-Powered Expense Management
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight tracking-tight">
            Expense management
            <br />
            made{" "}
            <span className="gradient-text">simple</span>
          </h1>
          
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm md:text-base text-muted-foreground mb-8">
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              AI-powered processing
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-success" />
              Instant validation
            </span>
            <span className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              Real-time tracking
            </span>
          </div>
        </div>

        {/* Workspace Cards */}
        <div className="grid md:grid-cols-2 gap-6 w-full max-w-3xl mb-12 md:mb-16 px-2">
          {/* Employee Card */}
          <GlassCard hover className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <button
              onClick={() => navigate("/employee")}
              className="group text-left w-full"
            >
              <div className="flex items-start gap-4">
                <div className="p-4 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl group-hover:from-primary/30 group-hover:to-primary/10 transition-all duration-300 border border-primary/20">
                  <User className="text-primary w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg text-foreground mb-1 group-hover:text-primary transition-colors">
                    Employee Portal
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Submit claims and track reimbursements
                  </p>
                  <div className="flex items-center text-primary text-sm font-medium group-hover:translate-x-1 transition-transform">
                    Enter <ArrowRight size={14} className="ml-1.5" />
                  </div>
                </div>
              </div>
            </button>
          </GlassCard>

          {/* Financier Card */}
          <GlassCard hover className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <button
              onClick={() => navigate("/financier")}
              className="group text-left w-full"
            >
              <div className="flex items-start gap-4">
                <div className="p-4 bg-gradient-to-br from-success/20 to-success/5 rounded-xl group-hover:from-success/30 group-hover:to-success/10 transition-all duration-300 border border-success/20">
                  <ShieldCheck className="text-success w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg text-foreground mb-1 group-hover:text-success transition-colors">
                    Finance Console
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Review analytics and validate claims
                  </p>
                  <div className="flex items-center text-success text-sm font-medium group-hover:translate-x-1 transition-transform">
                    Enter <ArrowRight size={14} className="ml-1.5" />
                  </div>
                </div>
              </div>
            </button>
          </GlassCard>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/30 py-6">
        <p className="text-center text-xs text-muted-foreground">
          © 2026 AssistoAI Systems. Authorized Personnel Only.
        </p>
      </footer>
    </MainLayout>
  );
}
