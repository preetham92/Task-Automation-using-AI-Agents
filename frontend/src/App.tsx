import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import Dashboard from "./components/layout/Dashboard";
import EmployeePage from "./pages/Employee/EmployeePage";
import FinancierPage from "./pages/Financier/FinancierPage";
import AnalyticsPage from "./pages/Financier/AnalyticsPage";
import AuditLogsPage from "@/pages/Financier/AuditsLogPage";
import History from "./pages/Employee/History";
import DraftsPage from "./pages/Employee/DraftsPage";
import NotFound from "./pages/NotFound";
import ReviewPage from "./pages/Financier/ReviewPage";
<<<<<<< HEAD
=======

>>>>>>> 007cd4261468c478c0da23605f6f00a6f623047e
const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/employee" element={<EmployeePage />} />
            <Route path="/employee/upload" element={<EmployeePage />} />
            <Route path="/employee/history" element={<History />} />
            <Route path="/employee/drafts" element={<DraftsPage />} />
            <Route path="/financier" element={<FinancierPage />} />
            <Route path="/financier/dashboard" element={<AnalyticsPage />} />
            <Route path="/financier/audits" element={<AuditLogsPage />} />
            <Route path="/financier/reviews" element={<ReviewPage />} />
<<<<<<< HEAD
=======
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
>>>>>>> 007cd4261468c478c0da23605f6f00a6f623047e
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
