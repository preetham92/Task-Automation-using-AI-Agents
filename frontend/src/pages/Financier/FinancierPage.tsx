import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { PieChart, ShieldCheck, Briefcase } from "lucide-react";

export default function FinancierPage() {
  const cards = [
    {
      to: "/financier/dashboard",
      icon: PieChart,
      title: "Analytics Dashboard",
      description:
        "View spending trends, policy violations, and approval rates.",
      color: "primary",
      bgClass: "from-primary/20 to-primary/5",
      borderHover: "hover:border-primary/50",
      shadowHover: "hover:shadow-primary/10",
    },
    {
      to: "/financier/audits",
      icon: ShieldCheck,
      title: "System Audit Logs",
      description:
        "Inspect AI decision trails, confidence scores, and system events.",
      color: "success",
      bgClass: "from-success/20 to-success/5",
      borderHover: "hover:border-success/50",
      shadowHover: "hover:shadow-success/10",
    },
  ];

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
        <PageHeader
          title="Finance Overview"
          description="Welcome back, Admin. Here is what's happening today."
          icon={Briefcase}
        />

        <div className="grid sm:grid-cols-2 gap-6">
          {cards.map((card, index) => (
            <Link
              key={card.to}
              to={card.to}
              className="block animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <GlassCard
                hover
                className={`h-full ${card.borderHover} hover:shadow-2xl ${card.shadowHover}`}
              >
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${card.bgClass} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
                >
                  <card.icon className={`w-7 h-7 text-${card.color}`} />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">
                  {card.title}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {card.description}
                </p>
              </GlassCard>
            </Link>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
