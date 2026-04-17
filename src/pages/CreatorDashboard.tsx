import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from "recharts";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Clock, 
  Download, 
  Plus, 
  ArrowLeft,
  MessageSquare,
  Share2,
  ExternalLink,
  Edit2,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface CreatorDashboardProps {
  session: Session | null;
}

export default function CreatorDashboard({ session }: CreatorDashboardProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<any>(null);
  const [pledges, setPledges] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateTitle, setUpdateTitle] = useState("");
  const [updateBody, setUpdateBody] = useState("");
  const [isSendingUpdate, setIsSendingUpdate] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!session) {
      navigate("/auth");
      return;
    }

    if (!isSupabaseConfigured) {
      setLoading(false);
      toast.error("Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your secrets.");
      return;
    }
    
    fetchDashboardData();
  }, [id, session]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch campaign details
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();

      if (campaignError) throw campaignError;
      
      // Security check: ensure current user is the creator
      if (campaignData.creator_id !== session?.user.id) {
        toast.error("Unauthorized access");
        navigate("/dashboard");
        return;
      }

      setCampaign(campaignData);

      // Fetch pledges
      const { data: pledgesData, error: pledgesError } = await supabase
        .from("pledges")
        .select(`
          *,
          profiles:backer_id (full_name, email),
          rewards:reward_id (title)
        `)
        .eq("campaign_id", id)
        .order("created_at", { ascending: false });

      if (pledgesError) throw pledgesError;
      setPledges(pledgesData || []);

      // Process chart data (daily pledges)
      processChartData(pledgesData || []);

    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (pledges: any[]) => {
    const dailyData: { [key: string]: number } = {};
    
    // Initialize with last 30 days or campaign duration
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = format(d, "MMM dd");
      dailyData[dateStr] = 0;
    }

    pledges.forEach(pledge => {
      const dateStr = format(new Date(pledge.created_at), "MMM dd");
      if (dailyData[dateStr] !== undefined) {
        dailyData[dateStr] += Number(pledge.amount);
      }
    });

    const formattedData = Object.keys(dailyData).map(date => ({
      date,
      amount: dailyData[date]
    }));

    setChartData(formattedData);
  };

  const exportToCSV = () => {
    if (!pledges.length) return;

    const headers = ["Backer Name", "Email", "Reward Tier", "Amount", "Date", "Status"];
    const rows = pledges.map(p => [
      p.profiles?.full_name || "Anonymous",
      p.profiles?.email || "N/A",
      p.rewards?.title || "No Reward",
      p.amount,
      format(new Date(p.created_at), "yyyy-MM-dd HH:mm"),
      p.status
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `backers_${campaign.title.replace(/\s+/g, "_")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePostUpdate = async () => {
    if (!updateTitle || !updateBody) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setIsSendingUpdate(true);
      
      // 1. Save update to database
      const { data: updateData, error: updateError } = await supabase
        .from("updates")
        .insert({
          campaign_id: id,
          title: updateTitle,
          body: updateBody
        })
        .select()
        .single();

      if (updateError) throw updateError;

      toast.success("Update posted!");
      setIsUpdateModalOpen(false);
      setUpdateTitle("");
      setUpdateBody("");
      
    } catch (error: any) {
      console.error("Error posting update:", error);
      toast.error("Failed to post update");
    } finally {
      setIsSendingUpdate(false);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!id) return;
    
    try {
      setIsDeleting(true);
      
      // 1. Delete comment reports first (they depend on comments)
      const { data: campaignComments } = await supabase
        .from("comments")
        .select("id")
        .eq("campaign_id", id);
      
      if (campaignComments && campaignComments.length > 0) {
        const commentIds = campaignComments.map(c => c.id);
        await supabase.from("comment_reports").delete().in("comment_id", commentIds);
      }

      // 2. Delete other related data sequentially
      const tablesToDelete = [
        { name: "pledges", col: "campaign_id" },
        { name: "rewards", col: "campaign_id" },
        { name: "campaign_team_members", col: "campaign_id" },
        { name: "campaign_faqs", col: "campaign_id" },
        { name: "stretch_goals", col: "campaign_id" },
        { name: "updates", col: "campaign_id" },
        { name: "comments", col: "campaign_id" },
      ];

      for (const table of tablesToDelete) {
        await supabase.from(table.name).delete().eq(table.col, id);
      }

      // 3. Delete reports
      await supabase.from("reports").delete().eq("target_id", id).eq("target_type", "campaign");

      // 4. Finally delete the campaign
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Campaign deleted successfully");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error deleting campaign:", error);
      toast.error("Failed to delete campaign: " + error.message);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-[400px] rounded-xl" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    );
  }

  const progress = campaign.funding_goal > 0 ? (campaign.amount_raised / campaign.funding_goal) * 100 : 0;
  const daysLeft = campaign.end_date ? Math.max(0, Math.ceil((new Date(campaign.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-20">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold truncate max-w-[300px]">{campaign.title}</h1>
            <Badge variant="outline" className="ml-2 uppercase text-[10px] tracking-widest font-bold">
              {campaign.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" nativeButton={false} render={
              <Link to={`/create/${id}`}>
                <Edit2 className="mr-2 h-4 w-4" /> Edit
              </Link>
            } />
            
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogTrigger render={
                <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              } />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Are you absolutely sure?</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. This will permanently delete your
                    campaign and all associated data.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                  <Button variant="destructive" onClick={handleDeleteCampaign} disabled={isDeleting}>
                    {isDeleting ? "Deleting..." : "Delete Campaign"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="outline" size="sm" nativeButton={false} render={
              <Link to={`/campaigns/${id}`} target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" /> View Live
              </Link>
            } />
            <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
              <DialogTrigger render={
                <Button size="sm" className="font-bold">
                  <Plus className="mr-2 h-4 w-4" /> Post Update
                </Button>
              } />
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Post a Campaign Update</DialogTitle>
                  <DialogDescription>
                    Keep your backers engaged with the latest news. This will be emailed to all {pledges.length} backers.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Update Title</Label>
                    <Input 
                      id="title" 
                      placeholder="e.g. Production has started!" 
                      value={updateTitle}
                      onChange={(e) => setUpdateTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="body">Update Content</Label>
                    <Textarea 
                      id="body" 
                      placeholder="Share the details..." 
                      className="min-h-[200px]"
                      value={updateBody}
                      onChange={(e) => setUpdateBody(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsUpdateModalOpen(false)}>Cancel</Button>
                  <Button onClick={handlePostUpdate} disabled={isSendingUpdate}>
                    {isSendingUpdate ? "Sending..." : "Post Update"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {campaign.status === 'rejected' && (
          <div className="mb-8 p-6 bg-destructive/10 border-2 border-destructive rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-destructive"></div>
            <h3 className="text-xl font-bold text-destructive mb-2 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              Campaign Rejected
            </h3>
            <p className="text-muted-foreground font-medium mb-4">
              Your campaign was not approved. Please review the feedback below. You can edit your campaign and submit it again for review.
            </p>
            <div className="bg-white/50 dark:bg-black/50 p-4 rounded-xl border border-destructive/20 text-sm">
              <span className="font-bold block mb-1">Rejection Reason:</span>
              <p className="whitespace-pre-wrap">{campaign.rejection_reason || "No specific reason provided."}</p>
            </div>
            <Link to={`/create/${campaign.id}`} className="inline-block mt-4">
              <Button variant="destructive" className="font-bold">Edit Campaign</Button>
            </Link>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="rounded-2xl shadow-sm border-none">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Amount Raised</CardDescription>
              <CardTitle className="text-3xl font-black">${campaign.amount_raised.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs font-bold text-green-600">
                <TrendingUp className="h-3 w-3" />
                +12% from last week
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm border-none">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Goal Progress</CardDescription>
              <CardTitle className="text-3xl font-black">{Math.round(progress)}%</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-[10px] text-muted-foreground font-medium">Goal: ${campaign.funding_goal.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm border-none">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Total Backers</CardDescription>
              <CardTitle className="text-3xl font-black">{campaign.backer_count}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600">
                <Users className="h-3 w-3" />
                {pledges.length} unique pledges
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm border-none">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Days Remaining</CardDescription>
              <CardTitle className="text-3xl font-black">{daysLeft}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-600">
                <Clock className="h-3 w-3" />
                Ends {campaign.end_date ? format(new Date(campaign.end_date), "MMM dd, yyyy") : "N/A"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart Section */}
        <Card className="rounded-2xl shadow-sm border-none overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Funding Over Time</CardTitle>
            <CardDescription>Daily pledge amounts for the last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 600, fill: "#999" }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 600, fill: "#999" }}
                  tickFormatter={(value) => `$${value}`}
                />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                  labelStyle={{ fontWeight: "bold", marginBottom: "4px" }}
                />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Backers Table */}
        <Card className="rounded-2xl shadow-sm border-none overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Recent Pledges</CardTitle>
              <CardDescription>Manage and view all your campaign backers</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="font-bold" onClick={exportToCSV}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-[10px] uppercase tracking-widest font-bold pl-6">Backer</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest font-bold">Reward Tier</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest font-bold">Amount</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest font-bold">Date</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest font-bold pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pledges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No pledges yet. Keep promoting your campaign!
                    </TableCell>
                  </TableRow>
                ) : (
                  pledges.map((pledge) => (
                    <TableRow key={pledge.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-bold pl-6">
                        <div className="flex flex-col">
                          <span>{pledge.profiles?.full_name || "Anonymous"}</span>
                          <span className="text-[10px] font-medium text-muted-foreground">{pledge.profiles?.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-muted text-muted-foreground border-none font-bold text-[10px]">
                          {pledge.rewards?.title || "No Reward"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-black">${pledge.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(pledge.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="pr-6">
                        <Badge 
                          className={`
                            font-bold text-[10px] uppercase tracking-widest border-none
                            ${pledge.status === "captured" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}
                          `}
                        >
                          {pledge.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
