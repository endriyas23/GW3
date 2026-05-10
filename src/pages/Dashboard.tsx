import { useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "motion/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

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
      
      // 1. Delete reports related to the campaign's comments
      const { data: campaignComments, error: commentsFetchError } = await supabase
        .from("comments")
        .select("id")
        .eq("campaign_id", campaignToDelete);
      
      if (commentsFetchError) throw commentsFetchError;

      if (campaignComments && campaignComments.length > 0) {
        const commentIds = campaignComments.map(c => c.id);
        const { error: commentReportsError } = await supabase
          .from("reports")
          .delete()
          .eq("target_type", "comment")
          .in("target_id", commentIds);
        if (commentReportsError) throw commentReportsError;
      }

      // 2. Delete reports linked directly to the campaign
      const { error: reportsError } = await supabase.from("reports").delete().eq("target_id", campaignToDelete).eq("target_type", "campaign");
      if (reportsError) throw reportsError;

      // 3. Finally delete the campaign (others will cascade)
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

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      setIsBulkDeleting(true);
      
      for (const campaignId of selectedIds) {
        // 1. Delete reports related to comments
        const { data: campaignComments, error: fetchErr } = await supabase
          .from("comments")
          .select("id")
          .eq("campaign_id", campaignId);
        
        if (fetchErr) throw fetchErr;

        if (campaignComments && campaignComments.length > 0) {
          const commentIds = campaignComments.map(c => c.id);
          const { error: relErr1 } = await supabase
            .from("reports")
            .delete()
            .eq("target_type", "comment")
            .in("target_id", commentIds);
          if (relErr1) throw relErr1;
        }

        // 2. Reports linked directly to the campaign
        const { error: relErr2 } = await supabase.from("reports").delete().eq("target_id", campaignId).eq("target_type", "campaign");
        if (relErr2) throw relErr2;

        // 3. Campaign (everything else cascades)
        const { error } = await supabase.from("campaigns").delete().eq("id", campaignId);
        if (error) throw error;
      }

      toast.success(`${selectedIds.length} campaigns deleted successfully`);
      setMyCampaigns(prev => prev.filter(c => !selectedIds.includes(c.id)));
      setSelectedIds([]);
    } catch (error: any) {
      console.error("Error bulk deleting campaigns:", error);
      toast.error("Failed to delete some campaigns: " + error.message);
    } finally {
      setIsBulkDeleting(false);
      setShowBulkConfirm(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === myCampaigns.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(myCampaigns.map(c => c.id));
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
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
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
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="select-all" 
                    checked={selectedIds.length === myCampaigns.length && myCampaigns.length > 0} 
                    onCheckedChange={toggleSelectAll}
                    className="rounded-md h-5 w-5 border-2"
                  />
                  <label htmlFor="select-all" className="text-sm font-bold cursor-pointer select-none">
                    Select All ({myCampaigns.length} Projects)
                  </label>
                </div>
                
                <AnimatePresence>
                  {selectedIds.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-3"
                    >
                      <span className="text-sm font-bold text-primary">
                        {selectedIds.length} items selected
                      </span>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="rounded-xl font-bold h-9 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white"
                        onClick={() => setShowBulkConfirm(true)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Bulk Delete
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="rounded-xl font-bold h-9"
                        onClick={() => setSelectedIds([])}
                      >
                        Cancel
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {myCampaigns.map((campaign, index) => (
                  <motion.div
                    key={campaign.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className={`h-full overflow-hidden rounded-3xl border-2 transition-all group relative ${selectedIds.includes(campaign.id) ? 'border-primary bg-primary/5' : 'hover:border-primary hover:shadow-xl hover:-translate-y-1'}`}>
                      <div className="absolute top-4 left-4 z-10">
                      <Checkbox 
                        checked={selectedIds.includes(campaign.id)} 
                        onCheckedChange={() => toggleSelect(campaign.id)}
                        className="rounded-md h-5 w-5 border-2 bg-background/90 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-colors"
                      />
                    </div>
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
                            <Button variant="secondary" size="icon" className="h-6 w-6 rounded-full bg-background/90 hover:bg-background shadow-sm">
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
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(campaign.funding_goal > 0 ? (campaign.amount_raised / campaign.funding_goal) * 100 : 0, 100)}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-primary"
                          />
                        </div>
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
                </motion.div>
                ))}
              </div>
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
          </motion.div>
        </TabsContent>

        <TabsContent value="pledges">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
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
          </motion.div>
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

      <Dialog open={showBulkConfirm} onOpenChange={(open) => !open && setShowBulkConfirm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Confirm Bulk Deletion
            </DialogTitle>
            <DialogDescription className="pt-2">
              You are about to delete <span className="font-bold text-foreground">{selectedIds.length}</span> campaigns.
              This action is <span className="font-bold text-destructive">irreversible</span> and will delete all associated data for all selected projects.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowBulkConfirm(false)} className="rounded-xl font-bold">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={isBulkDeleting} className="rounded-xl font-bold">
              {isBulkDeleting ? "Deleting..." : "Permanently Delete Selected"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
