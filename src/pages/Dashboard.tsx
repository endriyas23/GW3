import { useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Campaign, Pledge } from "@/types/database";
import { Link, useNavigate } from "react-router-dom";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
} from "@/components/ui/dialog";
import { 
  PlusCircle, 
  LayoutDashboard, 
  Heart, 
  Settings, 
  ExternalLink,
  AlertCircle,
  BarChart3,
  ArrowRight,
  MoreVertical,
  Edit2,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";

export default function Dashboard({ session }: { session: Session | null }) {
  const navigate = useNavigate();
  const [myCampaigns, setMyCampaigns] = useState<Campaign[]>([]);
  const [myPledges, setMyPledges] = useState<(Pledge & { campaign: Campaign })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      navigate("/auth/login");
      return;
    }

    if (!isSupabaseConfigured) {
      setLoading(false);
      toast.error("Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your secrets.");
      return;
    }
    
    // Check if user is admin
    supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.role === 'admin') setIsAdmin(true);
      });

    fetchDashboardData();
  }, [session]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch my campaigns
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("*")
        .eq("creator_id", session?.user.id)
        .order("created_at", { ascending: false });
      
      setMyCampaigns(campaigns || []);

      // Fetch my pledges (with campaign details)
      const { data: pledges } = await supabase
        .from("pledges")
        .select("*, campaign:campaigns(*)")
        .eq("backer_id", session?.user.id)
        .order("created_at", { ascending: false });
      
      setMyPledges(pledges as any || []);
    } catch (error: any) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!campaignToDelete) return;
    
    try {
      setIsDeleting(true);
      
      // 1. Delete comment reports first (they depend on comments)
      const { data: campaignComments } = await supabase
        .from("comments")
        .select("id")
        .eq("campaign_id", campaignToDelete);
      
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
        await supabase.from(table.name).delete().eq(table.col, campaignToDelete);
      }

      // 3. Delete reports
      await supabase.from("reports").delete().eq("target_id", campaignToDelete).eq("target_type", "campaign");

      // 4. Finally delete the campaign
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", campaignToDelete);

      if (error) throw error;

      toast.success("Campaign deleted successfully");
      setMyCampaigns(prev => prev.filter(c => c.id !== campaignToDelete));
    } catch (error: any) {
      console.error("Error deleting campaign:", error);
      toast.error("Failed to delete campaign: " + error.message);
    } finally {
      setIsDeleting(false);
      setCampaignToDelete(null);
    }
  };

  if (!session) return null;

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <Breadcrumbs />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-2">My Dashboard</h1>
          <p className="text-muted-foreground font-medium">Manage your creative projects and supported campaigns.</p>
        </div>
        {!isAdmin && (
          <Button className="h-12 px-6 font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2" render={<Link to="/create" />} nativeButton={false}>
            <PlusCircle className="w-5 h-5" />
            Start New Campaign
          </Button>
        )}
      </div>

      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList className="mb-10 bg-muted/50 p-1 rounded-xl h-12">
          <TabsTrigger value="campaigns" className="flex items-center gap-2 px-6 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold">
            <LayoutDashboard className="w-4 h-4" />
            My Campaigns
          </TabsTrigger>
          <TabsTrigger value="pledges" className="flex items-center gap-2 px-6 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold">
            <Heart className="w-4 h-4" />
            My Pledges
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-48 rounded-2xl" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : myCampaigns.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {myCampaigns.map(campaign => (
                <Card key={campaign.id} className="overflow-hidden rounded-3xl border-2 hover:border-primary transition-all group">
                  <div className="h-48 bg-muted relative overflow-hidden">
                    {campaign.cover_image_url ? (
                      <img src={campaign.cover_image_url} alt={campaign.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                        <LayoutDashboard className="w-12 h-12 text-primary/20" />
                      </div>
                    )}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <Badge className="font-bold uppercase tracking-widest text-[10px] px-3 py-1">
                        {campaign.status}
                      </Badge>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger render={
                          <Button variant="secondary" size="icon" className="h-6 w-6 rounded-full bg-white/90 hover:bg-white shadow-sm">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        } />
                        <DropdownMenuContent align="end" className="w-40 rounded-xl">
                          <DropdownMenuItem onClick={() => navigate(`/dashboard/campaigns/${campaign.id}`)}>
                            <BarChart3 className="mr-2 h-4 w-4" /> Manage
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/create/${campaign.id}`)}>
                            <Edit2 className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => setCampaignToDelete(campaign.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <CardHeader className="p-6">
                    <CardTitle className="text-xl font-bold line-clamp-1 mb-1">{campaign.title}</CardTitle>
                    <CardDescription className="font-medium text-primary/60">{campaign.category}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                        <span>${campaign.amount_raised.toLocaleString()} raised</span>
                        <span>{Math.round(campaign.funding_goal > 0 ? (campaign.amount_raised / campaign.funding_goal) * 100 : 0)}%</span>
                      </div>
                      <Progress value={campaign.funding_goal > 0 ? (campaign.amount_raised / campaign.funding_goal) * 100 : 0} className="h-2" />
                    </div>
                  </CardContent>
                  <CardFooter className="p-6 border-t bg-muted/20 flex gap-3">
                    <Button variant="outline" size="sm" className="flex-grow font-bold rounded-xl" nativeButton={false} render={
                      <Link to={`/dashboard/campaigns/${campaign.id}`}>
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Manage
                      </Link>
                    } />
                    <Button variant="ghost" size="sm" className="font-bold rounded-xl" nativeButton={false} render={
                      <Link to={`/campaigns/${campaign.id}`}>
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    } />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState 
              icon={PlusCircle}
              title="No campaigns yet"
              description={isAdmin ? "Admins cannot create campaigns." : "Ready to bring your creative vision to life? Start your first campaign today."}
              actionLabel={!isAdmin ? "Create Your First Campaign" : undefined}
              actionLink={!isAdmin ? "/create" : undefined}
            />
          )}
        </TabsContent>

        <TabsContent value="pledges">
          {loading ? (
            <div className="space-y-6">
              {[1, 2].map(i => <Skeleton key={i} className="h-40 rounded-3xl" />)}
            </div>
          ) : myPledges.length > 0 ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Recent Pledges</h3>
                <Button variant="link" className="font-bold text-primary" nativeButton={false} render={<Link to="/dashboard/backer" />}>
                  View Detailed Backer Dashboard
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
              {myPledges.map(pledge => (
                <Card key={pledge.id} className="overflow-hidden rounded-3xl border-2 hover:border-primary transition-all">
                  <div className="flex flex-col md:flex-row">
                    <div className="w-full md:w-64 h-40 bg-muted shrink-0">
                      {pledge.campaign.cover_image_url ? (
                        <img src={pledge.campaign.cover_image_url} alt={pledge.campaign.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-primary/5 flex items-center justify-center">
                          <Heart className="w-10 h-10 text-primary/20" />
                        </div>
                      )}
                    </div>
                    <div className="flex-grow p-6 flex flex-col justify-between">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h3 className="font-bold text-xl mb-1">{pledge.campaign.title}</h3>
                          <p className="text-sm font-medium text-muted-foreground">
                            Pledged <span className="text-primary font-bold">${pledge.amount}</span> on {new Date(pledge.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className="font-bold uppercase tracking-widest text-[10px] px-3 py-1">
                          {pledge.status}
                        </Badge>
                      </div>
                      <div className="flex justify-end gap-3 mt-6">
                        <Button variant="outline" size="sm" className="font-bold rounded-xl" nativeButton={false} render={
                          <Link to={`/campaigns/${pledge.campaign_id}`}>
                            View Campaign
                            <ExternalLink className="w-4 h-4 ml-2" />
                          </Link>
                        } />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState 
              icon={Heart}
              title="No pledges yet"
              description="Support a creator and help bring a project to life! Your support makes a difference."
              actionLabel="Explore Campaigns"
              actionLink="/explore"
            />
          )}
        </TabsContent>
      </Tabs>
      
      <Dialog open={!!campaignToDelete} onOpenChange={(open) => !open && setCampaignToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your
              campaign and all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampaignToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteCampaign} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
