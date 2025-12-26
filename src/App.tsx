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
import MyTeam from "./pages/MyTeam";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMatches from "./pages/admin/AdminMatches";
import AdminTeams from "./pages/admin/AdminTeams";
import AdminSponsors from "./pages/admin/AdminSponsors";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSettings from "./pages/admin/AdminSettings";
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
            <Route path="/moja-druzyna" element={<MyTeam />} />
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="mecze" element={<AdminMatches />} />
              <Route path="druzyny" element={<AdminTeams />} />
              <Route path="wyniki" element={<AdminMatches />} />
              <Route path="sponsorzy" element={<AdminSponsors />} />
              <Route path="uzytkownicy" element={<AdminUsers />} />
              <Route path="ustawienia" element={<AdminSettings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
