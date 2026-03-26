import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Overview from "./pages/Overview";
import Referrals from "./pages/Referrals";
import Billing from "./pages/Billing";
import Wallet from "./pages/Wallet";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import SuperAdmin from "./pages/SuperAdmin";
import Community from "./pages/Community";
import Tutorials from "./pages/Tutorials";
import AvailableBots from "./pages/AvailableBots";
import MyBots from "./pages/MyBots";
import BotDeployLog from "./pages/BotDeployLog";
import DirectBotLog from "./pages/DirectBotLog";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ThemeProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              <Route element={<Layout />}>
                <Route path="/overview" element={<Overview />} />
                <Route path="/referrals" element={<Referrals />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/community" element={<Community />} />
                <Route path="/tutorials" element={<Tutorials />} />
                <Route path="/available-bots" element={<AvailableBots />} />
                <Route path="/my-bots" element={<MyBots />} />
                <Route path="/bots/deploying/:serverId" element={<BotDeployLog />} />
                <Route path="/bots/direct/:id/logs" element={<DirectBotLog />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/superadmin" element={<SuperAdmin />} />
              </Route>

              <Route path="/servers" element={<Navigate to="/my-bots" replace />} />
              <Route path="/claim-server" element={<Navigate to="/available-bots" replace />} />
              <Route path="/tasks" element={<Navigate to="/overview" replace />} />
              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="/dashboard" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
