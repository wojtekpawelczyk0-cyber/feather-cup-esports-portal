import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Matches from "./pages/Matches";
import Results from "./pages/Results";
import Teams from "./pages/Teams";
import TeamDetails from "./pages/TeamDetails";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
import SteamCallback from "./pages/SteamCallback";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/mecze" element={<Matches />} />
            <Route path="/wyniki" element={<Results />} />
            <Route path="/druzyny" element={<Teams />} />
            <Route path="/druzyny/:id" element={<TeamDetails />} />
            <Route path="/kontakt" element={<Contact />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/steam-callback" element={<SteamCallback />} />
            <Route path="/konto" element={<Account />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
