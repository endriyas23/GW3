/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import Explore from "@/pages/Explore";
import CampaignDetail from "@/pages/CampaignDetail";
import Dashboard from "@/pages/Dashboard";
import BackerDashboard from "@/pages/BackerDashboard";
import CreatorDashboard from "@/pages/CreatorDashboard";
import CreateCampaign from "@/pages/CreateCampaign";
import Profile from "@/pages/Profile";
import PublicProfile from "@/pages/PublicProfile";
import Admin from "@/pages/Admin";
import Login from "@/pages/auth/Login";
import SignUp from "@/pages/auth/SignUp";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import UpdatePassword from "@/pages/auth/UpdatePassword";
import VerifyEmail from "@/pages/auth/VerifyEmail";
import About from "@/pages/static/About";
import HowItWorks from "@/pages/static/HowItWorks";
import Terms from "@/pages/static/Terms";
import Privacy from "@/pages/static/Privacy";
import NotFound from "@/pages/NotFound";
import ServerError from "@/pages/ServerError";
import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { CommandMenu } from "@/components/CommandMenu";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <ThemeProvider defaultTheme="light" storageKey="crowdfund-theme">
      <TooltipProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-background text-foreground">
            <Navbar session={session} />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/browse" element={<Explore session={session} />} />
                <Route path="/explore" element={<Explore session={session} />} />
                <Route path="/explore/:category" element={<Explore session={session} />} />
                <Route path="/campaign/:id" element={<CampaignDetail />} />
                <Route path="/campaigns/:id" element={<CampaignDetail />} />
                <Route path="/dashboard" element={<Dashboard session={session} />} />
                <Route path="/dashboard/backer" element={<BackerDashboard session={session} />} />
                <Route path="/dashboard/campaigns/:id" element={<CreatorDashboard session={session} />} />
                <Route path="/create" element={<CreateCampaign session={session} />} />
                <Route path="/create/:id" element={<CreateCampaign session={session} />} />
                <Route path="/profile" element={<Profile session={session} />} />
                <Route path="/profile/:id" element={<PublicProfile />} />
                <Route path="/admin" element={<Admin session={session} />} />
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/signup" element={<SignUp />} />
                <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                <Route path="/auth/update-password" element={<UpdatePassword />} />
                <Route path="/auth/verify-email" element={<VerifyEmail />} />
                <Route path="/about" element={<About />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/500" element={<ServerError />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
            <CommandMenu />
          </div>
          <Toaster position="top-center" />
        </Router>
      </TooltipProvider>
    </ThemeProvider>
  );
}

