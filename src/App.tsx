import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Travel from "./pages/Travel";
import TravelSearch from "./pages/TravelSearch";
import CheckoutCart from "./pages/CheckoutCart";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import DevAdmin from "./pages/DevAdmin";
import RetreatPlanner from "./pages/RetreatPlanner";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Travel />} />
            <Route path="/landing" element={<Index />} />
            <Route path="/search" element={<TravelSearch />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dev-admin" element={<DevAdmin />} />
            <Route path="/cart" element={<CheckoutCart />} />
            <Route path="/retreat-planner" element={<RetreatPlanner />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
