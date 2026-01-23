import {
  BarChart3,
  ShieldCheck,
  Briefcase,
  Home,
  FileText,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Overview", url: "/financier", icon: Briefcase },
  { title: "Analytics", url: "/financier/dashboard", icon: BarChart3 },
  { title: "Audit Logs", url: "/financier/audits", icon: ShieldCheck },
  { title: "Review Documents", url: "/financier/reviews", icon: FileText },
];

export function FinancierSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="p-4">
        <NavLink
          to="/"
          className="flex items-center gap-3 text-foreground hover:text-success transition-colors"
        >
          <div className="p-0 rounded-lg bg-success/8">
            <Home className="h-5 w-5 text-success" />
          </div>
          {!collapsed && <span className="font-semibold">Finance Console</span>}
        </NavLink>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3"
                      activeClassName="bg-success/10 text-success"
                    >
                      <item.icon className="h-5 w-5" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && (
          <p className="text-xs text-muted-foreground text-center">
            AssistoAI v1.0
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
