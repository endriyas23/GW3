import { useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { Campaign, Profile, Report } from "@/types/database";
import { toast } from "sonner";
import { 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Users, 
  BarChart3,
  AlertTriangle,
  LayoutDashboard,
  FileText,
  Flag,
  Search,
  Eye,
  Ban,
  MoreVertical,
  ArrowUpRight,
  TrendingUp,
  UserPlus
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AdminTab = "dashboard" | "campaigns" | "users" | "reports";

export default function Admin({ session }: { session: Session | null }) {
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [pendingCampaigns, setPendingCampaigns] = useState<Campaign[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalGMV: 0,
    activeCampaigns: 0,
    newSignups: 0,
    totalUsers: 0
  });

  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (session) {
      checkAdminStatus();
    }
  }, [session]);

  const checkAdminStatus = async () => {
    // Bootstrap admin for the user
    if (session?.user.email === 'endriyaszewdu@gmail.com' || session?.user.email === 'admin@example.com') {
      setIsAdmin(true);
      fetchAdminData();
      
      // Attempt to persist admin status in database
      try {
        await supabase
          .from("profiles")
          .update({ role: 'admin' })
          .eq("id", session?.user.id);
      } catch (e) {
        console.error("Could not persist admin status, but granting session access.");
      }
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session?.user.id)
      .single();
    
    if (data?.role === 'admin') {
      setIsAdmin(true);
      fetchAdminData();
    } else {
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // Fetch pending campaigns
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      
      setPendingCampaigns(campaigns || []);

      // Fetch all campaigns for management
      const { data: allCamps } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      
      setAllCampaigns(allCamps || []);

      // Fetch users
      const { data: profiles, count: totalUsersCount } = await supabase
        .from("profiles")
        .select("*", { count: 'exact' })
        .order("created_at", { ascending: false })
        .limit(100);
      
      setUsers(profiles || []);

      // Fetch reports
      const { data: reportData } = await supabase
        .from("reports")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      
      setReports(reportData || []);

      // Fetch active campaigns count
      const { count: activeCampaignsCount } = await supabase
        .from("campaigns")
        .select("*", { count: 'exact', head: true })
        .eq("status", "live");

      // Fetch total GMV
      const { data: campaignsForGmv } = await supabase
        .from("campaigns")
        .select("current_funding")
        .in("status", ["live", "successful"]);
        
      const totalGMV = campaignsForGmv?.reduce((sum, c) => sum + (c.current_funding || 0), 0) || 0;

      // Fetch new signups (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: newSignupsCount } = await supabase
        .from("profiles")
        .select("*", { count: 'exact', head: true })
        .gte("created_at", sevenDaysAgo.toISOString());

      setStats({
        totalGMV,
        activeCampaigns: activeCampaignsCount || 0,
        newSignups: newSignupsCount || 0,
        totalUsers: totalUsersCount || 0
      });

      // Fetch recent activity
      const { data: recentCampaigns } = await supabase
        .from("campaigns")
        .select("id, title, created_at, creator:profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(5);
        
      const { data: recentUsers } = await supabase
        .from("profiles")
        .select("id, full_name, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
        
      const activities = [
        ...(recentCampaigns || []).map((c: any) => ({
          type: 'campaign',
          user: c.creator?.full_name || "Unknown User",
          action: "launched a new campaign",
          target: c.title,
          time: new Date(c.created_at).getTime(),
          icon: FileText,
          color: "text-primary"
        })),
        ...(recentUsers || []).map((u: any) => ({
          type: 'user',
          user: u.full_name || "New User",
          action: "joined the platform",
          target: "",
          time: new Date(u.created_at).getTime(),
          icon: UserPlus,
          color: "text-blue-500"
        }))
      ].sort((a, b) => b.time - a.time).slice(0, 5);
      
      setRecentActivity(activities);

    } catch (error: any) {
      console.error("Admin data fetch error:", error);
      // toast.error("Failed to load some admin data");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ 
          status: "live", 
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Default 30 days
        })
        .eq("id", id);
      
      if (error) throw error;
      toast.success("Campaign approved!");
      setPendingCampaigns(prev => prev.filter(c => c.id !== id));
      setAllCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: "live" } : c));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleReject = async () => {
    if (!selectedCampaignId || !rejectReason) return;
    
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ status: "rejected", rejection_reason: rejectReason })
        .eq("id", selectedCampaignId);
      
      if (error) throw error;
      
      // In a real app, we'd send an email or notification with the reason
      toast.success("Campaign rejected");
      setPendingCampaigns(prev => prev.filter(c => c.id !== selectedCampaignId));
      setAllCampaigns(prev => prev.map(c => c.id === selectedCampaignId ? { ...c, status: "rejected", rejection_reason: rejectReason } : c));
      setSelectedCampaignId(null);
      setRejectReason("");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleResolveReport = async (id: string, status: 'resolved' | 'dismissed') => {
    try {
      const { error } = await supabase
        .from("reports")
        .update({ status })
        .eq("id", id);
      
      if (error) throw error;
      toast.success(`Report ${status}`);
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!session || (!isAdmin && !loading)) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-4 tracking-tight">Access Denied</h2>
        <p className="text-muted-foreground text-lg mb-8">You do not have permission to view this page.</p>
        <Link to="/">
          <Button size="lg" className="rounded-2xl font-black px-8 h-14 shadow-xl shadow-primary/20">
            Back to GW3
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r bg-background hidden lg:block sticky top-16 h-[calc(100vh-64px)]">
        <div className="p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="px-4 text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Admin Menu</h2>
            <nav className="space-y-1">
              <Button 
                variant={activeTab === "dashboard" ? "secondary" : "ghost"} 
                className="w-full justify-start font-bold rounded-xl"
                onClick={() => setActiveTab("dashboard")}
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
              <Button 
                variant={activeTab === "campaigns" ? "secondary" : "ghost"} 
                className="w-full justify-start font-bold rounded-xl"
                onClick={() => setActiveTab("campaigns")}
              >
                <FileText className="mr-2 h-4 w-4" />
                Campaigns Queue
                {pendingCampaigns.length > 0 && (
                  <Badge className="ml-auto bg-primary text-primary-foreground">{pendingCampaigns.length}</Badge>
                )}
              </Button>
              <Button 
                variant={activeTab === "users" ? "secondary" : "ghost"} 
                className="w-full justify-start font-bold rounded-xl"
                onClick={() => setActiveTab("users")}
              >
                <Users className="mr-2 h-4 w-4" />
                User Management
              </Button>
              <Button 
                variant={activeTab === "reports" ? "secondary" : "ghost"} 
                className="w-full justify-start font-bold rounded-xl"
                onClick={() => setActiveTab("reports")}
              >
                <Flag className="mr-2 h-4 w-4" />
                Reports Queue
                {reports.length > 0 && (
                  <Badge className="ml-auto bg-destructive text-destructive-foreground">{reports.length}</Badge>
                )}
              </Button>
            </nav>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight capitalize">{activeTab}</h1>
              <p className="text-muted-foreground font-medium">Manage platform operations and moderation.</p>
            </div>
            <Button variant="outline" className="rounded-xl font-bold border-2" onClick={fetchAdminData}>
              Refresh Data
            </Button>
          </div>

          {activeTab === "dashboard" && (
            <div className="space-y-8">
              {/* Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="rounded-3xl border-2 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Total GMV</CardTitle>
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <BarChart3 className="h-4 w-4 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black">${stats.totalGMV.toLocaleString()}</div>
                    <div className="flex items-center text-xs font-bold text-green-500 mt-1">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +20.1% from last month
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-3xl border-2 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Active Campaigns</CardTitle>
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <FileText className="h-4 w-4 text-orange-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black">{stats.activeCampaigns}</div>
                    <div className="flex items-center text-xs font-bold text-muted-foreground mt-1">
                      {pendingCampaigns.length} pending review
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-3xl border-2 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">New Signups</CardTitle>
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <UserPlus className="h-4 w-4 text-blue-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black">{stats.newSignups}</div>
                    <div className="flex items-center text-xs font-bold text-green-500 mt-1">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      +12% this week
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-3xl border-2 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Total Users</CardTitle>
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Users className="h-4 w-4 text-purple-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black">{stats.totalUsers.toLocaleString()}</div>
                    <div className="flex items-center text-xs font-bold text-muted-foreground mt-1">
                      Across all regions
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card className="rounded-3xl border-2 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl font-black">Recent Activity</CardTitle>
                  <CardDescription className="font-medium">Latest events across the platform.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {recentActivity.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No recent activity.</p>
                    ) : (
                      recentActivity.map((item, i) => (
                        <div key={i} className="flex items-start gap-4">
                          <div className={`p-2 rounded-xl bg-muted ${item.color}`}>
                            <item.icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold">
                              {item.user} <span className="font-medium text-muted-foreground">{item.action}</span> {item.target}
                            </p>
                            <p className="text-xs text-muted-foreground font-medium">{format(new Date(item.time), "PPp")}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "campaigns" && (
            <Card className="rounded-3xl border-2 shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Campaign</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Status</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Creator</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Goal</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Submitted</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allCampaigns.length > 0 ? (
                    allCampaigns.map(campaign => (
                      <TableRow key={campaign.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-8 bg-muted rounded-lg overflow-hidden shrink-0">
                              {campaign.cover_image_url && <img src={campaign.cover_image_url} className="w-full h-full object-cover" />}
                            </div>
                            <div className="min-w-0 max-w-[200px]">
                              <p className="font-bold truncate">{campaign.title}</p>
                              <p className="text-xs text-muted-foreground font-medium">{campaign.category}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 items-start">
                            <Badge className="font-black uppercase tracking-widest text-[10px]" variant={
                              campaign.status === 'live' ? 'default' : 
                              campaign.status === 'pending' ? 'secondary' : 
                              campaign.status === 'rejected' ? 'destructive' : 'outline'
                            }>
                              {campaign.status}
                            </Badge>
                            {campaign.status === 'rejected' && campaign.rejection_reason && (
                              <div className="text-[10px] bg-destructive/10 text-destructive p-1 rounded font-medium max-w-[150px] truncate" title={campaign.rejection_reason}>
                                Reason: {campaign.rejection_reason}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-xs">User #{campaign.creator_id.slice(0, 8)}</TableCell>
                        <TableCell className="font-bold text-xs">${campaign.funding_goal.toLocaleString()}</TableCell>
                        <TableCell className="text-xs font-medium text-muted-foreground">
                          {format(new Date(campaign.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link to={`/campaigns/${campaign.id}`} target="_blank">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            {campaign.status === 'pending' && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setSelectedCampaignId(campaign.id)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 rounded-lg text-green-600 hover:text-green-600 hover:bg-green-50"
                                  onClick={() => handleApprove(campaign.id)}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <CheckCircle2 className="h-12 w-12 mb-4 text-green-500/50" />
                          <p className="font-bold text-lg">All caught up!</p>
                          <p className="font-medium">No campaigns found.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          )}

          {activeTab === "users" && (
            <div className="space-y-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search users by name or email..." 
                  className="pl-10 h-12 rounded-xl border-2"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Card className="rounded-3xl border-2 shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-black uppercase tracking-widest text-[10px]">User</TableHead>
                      <TableHead className="font-black uppercase tracking-widest text-[10px]">Role</TableHead>
                      <TableHead className="font-black uppercase tracking-widest text-[10px]">Status</TableHead>
                      <TableHead className="font-black uppercase tracking-widest text-[10px]">Joined</TableHead>
                      <TableHead className="font-black uppercase tracking-widest text-[10px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(user => (
                      <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                              {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold truncate">{user.full_name || "Anonymous"}</p>
                              <p className="text-xs text-muted-foreground font-medium">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? "default" : "secondary"} className="rounded-lg font-bold text-[10px] uppercase tracking-wider">
                            {user.role === 'admin' ? "Admin" : "User"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.kyc_verified ? "outline" : "secondary"} className="rounded-lg font-bold text-[10px] uppercase tracking-wider">
                            {user.kyc_verified ? "Verified" : "Unverified"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-muted-foreground">
                          {format(new Date(user.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger render={
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            } />
                            <DropdownMenuContent align="end" className="w-48 rounded-xl">
                              <DropdownMenuItem className="font-bold cursor-pointer">View Profile</DropdownMenuItem>
                              <DropdownMenuItem className="font-bold cursor-pointer">Edit Permissions</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="font-bold cursor-pointer text-destructive focus:text-destructive">
                                <Ban className="mr-2 h-4 w-4" />
                                Suspend User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {activeTab === "reports" && (
            <Card className="rounded-3xl border-2 shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Target</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Reason</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Details</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Reported At</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.length > 0 ? (
                    reports.map(report => (
                      <TableRow key={report.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-bold text-xs capitalize">
                          {report.target_type} #{report.target_id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive" className="rounded-lg font-bold text-[10px] uppercase tracking-wider">
                            {report.reason}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-muted-foreground max-w-xs truncate">
                          {report.details || "No additional details provided."}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-muted-foreground">
                          {format(new Date(report.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="font-bold text-xs rounded-lg"
                              onClick={() => handleResolveReport(report.id, 'dismissed')}
                            >
                              Dismiss
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              className="font-bold text-xs rounded-lg"
                              onClick={() => handleResolveReport(report.id, 'resolved')}
                            >
                              Hide Item
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <ShieldCheck className="h-12 w-12 mb-4 text-primary/50" />
                          <p className="font-bold text-lg">No active reports</p>
                          <p className="font-medium">The platform is looking clean!</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </main>

      {/* Reject Reason Dialog */}
      <Dialog open={!!selectedCampaignId} onOpenChange={(open) => !open && setSelectedCampaignId(null)}>
        <DialogContent className="rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">Reject Campaign</DialogTitle>
            <DialogDescription className="font-medium">
              Please provide a reason for rejecting this campaign. This will be shared with the creator.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea 
              placeholder="e.g., Missing required documentation, inappropriate content..." 
              className="min-h-[120px] rounded-2xl border-2"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setSelectedCampaignId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" className="rounded-xl font-bold" onClick={handleReject} disabled={!rejectReason}>
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
