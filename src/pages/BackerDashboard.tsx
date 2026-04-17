import { useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Campaign, Pledge } from "@/types/database";
import { useNavigate, Link } from "react-router-dom";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Heart, 
  ExternalLink, 
  Package, 
  Calendar, 
  TrendingUp,
  Clock,
  CheckCircle2,
  MessageSquare,
  ArrowRight,
  Bookmark,
  Activity,
  Bell
} from "lucide-react";
import { toast } from "sonner";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";
import { format } from "date-fns";

export default function BackerDashboard({ session }: { session: Session | null }) {
  const navigate = useNavigate();
  const [pledges, setPledges] = useState<(Pledge & { campaign: Campaign, reward?: any })[]>([]);
  const [savedCampaigns, setSavedCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPledged: 0,
    projectsSupported: 0,
    rewardsEarned: 0
  });

  useEffect(() => {
    if (!session) {
      navigate("/auth/login");
      return;
    }
    fetchBackerData();
    
    // Load saved campaigns from localStorage
    const saved = JSON.parse(localStorage.getItem("saved_campaigns") || "[]");
    setSavedCampaigns(saved);
  }, [session]);

  const fetchBackerData = async () => {
    setLoading(true);
    try {
      // Fetch pledges with campaign and reward details
      const { data, error } = await supabase
        .from("pledges")
        .select(`
          *,
          campaign:campaigns(*),
          reward:rewards(*)
        `)
        .eq("backer_id", session?.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const pledgesData = data as any[] || [];
      setPledges(pledgesData);

      // Calculate stats
      const totalPledged = pledgesData.reduce((sum, p) => sum + Number(p.amount), 0);
      const projectsSupported = new Set(pledgesData.map(p => p.campaign_id)).size;
      const rewardsEarned = pledgesData.filter(p => p.reward_id).length;

      setStats({
        totalPledged,
        projectsSupported,
        rewardsEarned
      });
    } catch (error: any) {
      console.error("Error fetching backer data:", error);
      toast.error("Failed to load your backed projects");
    } finally {
      setLoading(false);
    }
  };

  const removeSavedCampaign = (id: string) => {
    const filtered = savedCampaigns.filter(c => c.id !== id);
    setSavedCampaigns(filtered);
    localStorage.setItem("saved_campaigns", JSON.stringify(filtered));
    toast.success("Removed from saved projects");
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20">
      <div className="bg-white border-b pt-12 pb-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <Breadcrumbs />
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mt-4">
            <div>
              <h1 className="text-4xl font-black tracking-tight mb-2">Backer Dashboard</h1>
              <p className="text-muted-foreground font-medium">Tracking the projects you've helped bring to life.</p>
            </div>
            <Button className="rounded-xl font-bold h-12 px-6 shadow-lg shadow-primary/20" nativeButton={false} render={<Link to="/explore" />}>
              Discover More Projects
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-7xl space-y-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="rounded-3xl border-none shadow-sm overflow-hidden group hover:shadow-md transition-all">
            <CardHeader className="pb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <CardDescription className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Total Pledged</CardDescription>
              <CardTitle className="text-3xl font-black">${stats.totalPledged.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground font-medium">Across all your supported campaigns</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-sm overflow-hidden group hover:shadow-md transition-all">
            <CardHeader className="pb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Heart className="w-5 h-5 text-blue-500" />
              </div>
              <CardDescription className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Projects Supported</CardDescription>
              <CardTitle className="text-3xl font-black">{stats.projectsSupported}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground font-medium">Unique creative visions you've backed</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-sm overflow-hidden group hover:shadow-md transition-all">
            <CardHeader className="pb-2">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Package className="w-5 h-5 text-green-500" />
              </div>
              <CardDescription className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Rewards Earned</CardDescription>
              <CardTitle className="text-3xl font-black">{stats.rewardsEarned}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground font-medium">Exclusive perks and items claimed</p>
            </CardContent>
          </Card>
        </div>

        {/* Backed Projects List */}
        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black tracking-tight">Your Backed Projects</h2>
              <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground bg-white px-4 py-2 rounded-xl shadow-sm">
                <Clock className="w-4 h-4" />
                Sorted by Recent
              </div>
            </div>

            {loading ? (
              <div className="space-y-6">
                {[1, 2].map(i => (
                  <Card key={i} className="rounded-3xl border-none shadow-sm overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                      <Skeleton className="w-full md:w-72 h-48 md:h-auto" />
                      <div className="flex-grow p-8 space-y-4">
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : pledges.length > 0 ? (
              <div className="space-y-6">
                {pledges.map(pledge => {
                  const campaign = pledge.campaign;
                  const progress = campaign.funding_goal > 0 ? (campaign.amount_raised / campaign.funding_goal) * 100 : 0;
                  const isLive = campaign.status === 'live';
                  const isFunded = campaign.amount_raised >= campaign.funding_goal;

                  return (
                    <Card key={pledge.id} className="rounded-3xl border-none shadow-sm overflow-hidden hover:shadow-md transition-all group">
                      <div className="flex flex-col md:flex-row">
                        <div className="w-full md:w-64 h-48 md:h-auto bg-muted relative overflow-hidden shrink-0">
                          {campaign.cover_image_url ? (
                            <img src={campaign.cover_image_url} alt={campaign.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                          ) : (
                            <div className="w-full h-full bg-primary/5 flex items-center justify-center">
                              <Heart className="w-12 h-12 text-primary/20" />
                            </div>
                          )}
                          <div className="absolute top-4 left-4">
                            <Badge className={`font-bold uppercase tracking-widest text-[10px] px-3 py-1 border-none ${
                              isLive ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                            }`}>
                              {campaign.status}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex-grow p-6 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">{campaign.category}</span>
                                  <span className="text-muted-foreground">•</span>
                                  <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(pledge.created_at), "MMM dd, yyyy")}
                                  </span>
                                </div>
                                <h3 className="text-xl font-black leading-tight group-hover:text-primary transition-colors">
                                  <Link to={`/campaigns/${campaign.id}`}>{campaign.title}</Link>
                                </h3>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Pledge</p>
                                <p className="text-xl font-black text-primary">${pledge.amount.toLocaleString()}</p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                <span className="text-muted-foreground">Progress</span>
                                <span className={isFunded ? "text-green-600" : "text-primary"}>
                                  {Math.round(progress)}%
                                </span>
                              </div>
                              <Progress value={progress} className="h-1.5 bg-muted" />
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-dashed">
                            <div className="flex items-center gap-3">
                              {pledge.reward ? (
                                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                                  <Package className="w-3.5 h-3.5 text-primary" />
                                  <span className="line-clamp-1">{pledge.reward.title}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                                  <Heart className="w-3.5 h-3.5 text-primary" />
                                  <span>Contribution</span>
                                </div>
                              )}
                            </div>
                            <Button variant="ghost" size="sm" className="rounded-xl font-bold h-8 px-3 text-xs" nativeButton={false} render={
                              <Link to={`/campaigns/${campaign.id}`}>
                                Details
                                <ArrowRight className="ml-1.5 w-3 h-3" />
                              </Link>
                            } />
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <EmptyState 
                icon={Heart}
                title="You haven't backed any projects yet"
                description="Be the first to support a creative vision and help bring it to life."
                actionLabel="Explore Live Campaigns"
                actionLink="/explore"
              />
            )}
          </div>

          <div className="space-y-12">
            {/* Saved Campaigns */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-primary" />
                  Saved Projects
                </h2>
                {savedCampaigns.length > 0 && (
                  <span className="text-xs font-bold text-muted-foreground bg-white px-2 py-1 rounded-lg shadow-sm">
                    {savedCampaigns.length}
                  </span>
                )}
              </div>

              {savedCampaigns.length > 0 ? (
                <div className="space-y-4">
                  {savedCampaigns.map(campaign => (
                    <Card key={campaign.id} className="rounded-2xl border-none shadow-sm overflow-hidden group hover:shadow-md transition-all">
                      <div className="flex gap-4 p-3">
                        <div className="w-20 h-20 rounded-xl bg-muted overflow-hidden shrink-0">
                          <img src={campaign.cover_image_url} alt={campaign.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <div className="flex-grow min-w-0 flex flex-col justify-between py-0.5">
                          <div>
                            <h4 className="font-bold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                              <Link to={`/campaigns/${campaign.id}`}>{campaign.title}</Link>
                            </h4>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{campaign.category}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-primary">{Math.round(campaign.funding_goal > 0 ? (campaign.amount_raised / campaign.funding_goal) * 100 : 0)}% Funded</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 rounded-full text-muted-foreground hover:text-destructive"
                              onClick={() => removeSavedCampaign(campaign.id)}
                            >
                              <Heart className="w-3 h-3 fill-primary text-primary" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-8 text-center border-2 border-dashed border-muted">
                  <Bookmark className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm font-bold text-muted-foreground">No saved projects yet</p>
                  <Link to="/explore" className="text-xs font-black text-primary uppercase tracking-widest mt-2 inline-block hover:underline">Browse Projects</Link>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="space-y-6">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Recent Activity
              </h2>
              
              <div className="space-y-4">
                {pledges.slice(0, 3).map((pledge, i) => (
                  <div key={i} className="flex gap-4 relative">
                    {i !== 2 && <div className="absolute left-[11px] top-8 bottom-[-16px] w-0.5 bg-muted" />}
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 z-10">
                      <Heart className="w-3 h-3 text-primary" />
                    </div>
                    <div className="pt-0.5">
                      <p className="text-xs font-bold leading-relaxed">
                        You backed <Link to={`/campaigns/${pledge.campaign_id}`} className="text-primary hover:underline">{pledge.campaign.title}</Link> with a pledge of ${pledge.amount}.
                      </p>
                      <p className="text-[10px] font-medium text-muted-foreground mt-1">{format(new Date(pledge.created_at), "MMM dd, yyyy")}</p>
                    </div>
                  </div>
                ))}
                
                {pledges.length === 0 && (
                  <div className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Bell className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <div className="pt-0.5">
                      <p className="text-xs font-bold text-muted-foreground">No recent activity to show.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
