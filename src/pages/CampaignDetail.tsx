import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Clock, 
  Users, 
  Share2, 
  Flag, 
  MessageSquare, 
  Info,
  ChevronRight,
  Heart,
  Twitter,
  Facebook,
  Link as LinkIcon,
  AlertTriangle,
  PlusCircle,
  MapPin,
  ExternalLink
} from "lucide-react";
import { 
  Popover, 
  PopoverContent, 
  PopoverHeader, 
  PopoverTitle, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Campaign, Reward, Profile } from "@/types/database";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";
import CommentSection from "@/components/CommentSection";
import { format } from "date-fns";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [creator, setCreator] = useState<Profile | null>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Pledge Modal State
  const [isPledgeModalOpen, setIsPledgeModalOpen] = useState(false);
  const [selectedRewardForPledge, setSelectedRewardForPledge] = useState<Reward | null>(null);
  const [pledgeAmount, setPledgeAmount] = useState<number>(10);
  const [shippingRegion, setShippingRegion] = useState<string>("");
  const [shippingAddress, setShippingAddress] = useState<string>("");
  const [isPledging, setIsPledging] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'details' | 'payment'>('details');
  const [mockCardNumber, setMockCardNumber] = useState("4242424242424242");
  const [mockCardExpiry, setMockCardExpiry] = useState("12/25");
  const [mockCardCvc, setMockCardCvc] = useState("123");

  // Update Posting State
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [newUpdateTitle, setNewUpdateTitle] = useState("");
  const [newUpdateBody, setNewUpdateBody] = useState("");
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  // SEO Meta Updates
  useEffect(() => {
    if (campaign) {
      document.title = `${campaign.title} | GW3`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content", campaign.tagline);
      
      // OG Tags
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute("content", campaign.title);
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage && campaign.cover_image_url) ogImage.setAttribute("content", campaign.cover_image_url);
    }
  }, [campaign]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        supabase
          .from("profiles")
          .select("default_shipping_address")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => {
            if (data?.default_shipping_address) {
              setShippingAddress(data.default_shipping_address);
            }
          });
      }
    });
    fetchCampaignData();
  }, [id]);

  const fetchCampaignData = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      toast.error("Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your secrets.");
      return;
    }

    setLoading(true);
    try {
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      // Check if saved
      const savedCampaigns = JSON.parse(localStorage.getItem("saved_campaigns") || "[]");
      setIsSaved(savedCampaigns.some((c: any) => c.id === campaignData.id));

      // Save to recently viewed
      const recentlyViewed = JSON.parse(localStorage.getItem("recently_viewed") || "[]");
      const filtered = recentlyViewed.filter((c: any) => c.id !== campaignData.id);
      const updated = [campaignData, ...filtered].slice(0, 10);
      localStorage.setItem("recently_viewed", JSON.stringify(updated));

      const [rewardsRes, creatorRes, updatesRes] = await Promise.all([
        supabase.from("rewards").select("*").eq("campaign_id", id).order("price", { ascending: true }),
        supabase.from("profiles").select("*").eq("id", campaignData.creator_id).single(),
        supabase.from("updates").select("*").eq("campaign_id", id).order("created_at", { ascending: false })
      ]);
      
      setRewards(rewardsRes.data || []);
      setCreator(creatorRes.data);
      setUpdates(updatesRes.data || []);
    } catch (error: any) {
      toast.error("Failed to load campaign");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = `Check out this campaign on GW3: ${campaign?.title}`;
    
    if (platform === "twitter") {
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, "_blank");
    } else if (platform === "facebook") {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
    } else if (platform === "copy") {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    }
  };

  const [reportReason, setReportReason] = useState("Inappropriate content");
  const [reportDetails, setReportDetails] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const handleSubmitReport = async () => {
    if (!session) {
      toast.error("Please log in to report this project");
      return;
    }

    setIsSubmittingReport(true);
    try {
      const { error } = await supabase
        .from("reports")
        .insert({
          reporter_id: session.user.id,
          target_type: 'campaign',
          target_id: id,
          reason: reportReason,
          details: reportDetails,
          status: 'pending'
        });

      if (error) throw error;

      toast.success("Report submitted. Thank you for helping keep GW3 safe.");
      setIsReportModalOpen(false);
      setReportDetails("");
    } catch (error: any) {
      toast.error("Failed to submit report: " + error.message);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handlePostUpdate = async () => {
    if (!newUpdateTitle.trim() || !newUpdateBody.trim()) {
      toast.error("Please fill in both title and body");
      return;
    }

    setIsSubmittingUpdate(true);
    try {
      const { data, error } = await supabase
        .from("updates")
        .insert({
          campaign_id: id,
          title: newUpdateTitle,
          body: newUpdateBody,
        })
        .select()
        .single();

      if (error) throw error;

      setUpdates([data, ...updates]);
      toast.success("Update posted successfully!");
      setIsUpdateModalOpen(false);
      setNewUpdateTitle("");
      setNewUpdateBody("");
    } catch (error: any) {
      toast.error("Failed to post update: " + error.message);
      console.error(error);
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  const toggleSave = () => {
    if (!campaign) return;
    const savedCampaigns = JSON.parse(localStorage.getItem("saved_campaigns") || "[]");
    
    if (isSaved) {
      const newSaved = savedCampaigns.filter((c: any) => c.id !== campaign.id);
      localStorage.setItem("saved_campaigns", JSON.stringify(newSaved));
      setIsSaved(false);
      toast.success("Removed from saved projects");
    } else {
      savedCampaigns.push(campaign);
      localStorage.setItem("saved_campaigns", JSON.stringify(savedCampaigns));
      setIsSaved(true);
      toast.success("Saved to your watchlist");
    }
  };

  const openPledgeModal = (reward?: Reward) => {
    if (!session) {
      toast.error("Please log in to support this campaign");
      navigate("/auth/login");
      return;
    }
    setSelectedRewardForPledge(reward || null);
    setPledgeAmount(reward ? reward.price : 10);
    setShippingRegion("");
    setShippingAddress("");
    setPaymentStep('details');
    setIsPledgeModalOpen(true);
  };

  const calculateShippingCost = () => {
    if (!selectedRewardForPledge) return 0;
    if (selectedRewardForPledge.shipping_type === 'worldwide') {
      return selectedRewardForPledge.worldwide_shipping_cost || 0;
    }
    if (selectedRewardForPledge.shipping_type === 'specific' && shippingRegion) {
      const region = selectedRewardForPledge.shipping_regions?.find(r => r.region === shippingRegion);
      return region ? region.cost : 0;
    }
    return 0;
  };

  const handleContinueToPayment = () => {
    if (!session) return;
    
    if (selectedRewardForPledge?.shipping_type !== 'none' && !shippingAddress.trim()) {
      toast.error("Please provide a shipping address.");
      return;
    }

    if (selectedRewardForPledge?.shipping_type === 'specific' && !shippingRegion) {
      toast.error("Please select a shipping region.");
      return;
    }

    setPaymentStep('payment');
  };

  const processPayment = async () => {
    setIsPledging(true);
    
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simple mock validation
    if (mockCardNumber.includes("4000")) {
      toast.error("Payment failed. Your card was declined.");
      setIsPledging(false);
      return;
    }

    const shippingCost = calculateShippingCost();
    const totalAmount = pledgeAmount + shippingCost;

    try {
      const { error: pledgeError } = await supabase
        .from("pledges")
        .insert({
          campaign_id: id,
          backer_id: session.user.id,
          reward_id: selectedRewardForPledge?.id || null,
          amount: pledgeAmount,
          shipping_address: (selectedRewardForPledge && selectedRewardForPledge.shipping_type !== 'none') ? shippingAddress : null,
          shipping_cost: shippingCost,
          status: "captured"
        });

      if (pledgeError) throw pledgeError;

      const { error: updateError } = await supabase
        .from("campaigns")
        .update({ 
          amount_raised: (campaign?.amount_raised || 0) + totalAmount,
          backer_count: (campaign?.backer_count || 0) + 1
        })
        .eq("id", id);

      if (updateError) throw updateError;

      toast.success('Thank you for your support! Your pledge was successful.');
      setIsPledgeModalOpen(false);
      fetchCampaignData();
    } catch (error: any) {
      console.error("Pledge error:", error);
      toast.error('Failed to process pledge. Please try again.');
    } finally {
      setIsPledging(false);
    }
  };

  if (loading) return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <Skeleton className="h-6 w-48 mb-6" />
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-12" />
        <div className="grid lg:grid-cols-[1fr_400px] gap-16">
          <div className="space-y-8">
            <Skeleton className="aspect-video w-full rounded-3xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
          <div className="space-y-8">
            <Skeleton className="h-[400px] w-full rounded-3xl" />
          </div>
        </div>
      </div>
    </div>
  );

  if (!campaign) return (
    <div className="container mx-auto px-4 py-20 text-center">
      <h2 className="text-2xl font-bold mb-4">Campaign not found</h2>
      <Link to="/explore">
        <Button variant="outline">Back to Explore</Button>
      </Link>
    </div>
  );

  const progress = campaign.funding_goal > 0 ? (campaign.amount_raised / campaign.funding_goal) * 100 : 0;
  const daysLeft = campaign.end_date ? Math.max(0, Math.ceil((new Date(campaign.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <Breadcrumbs />
      </div>
      {/* Header Section */}
      <div className="max-w-6xl mx-auto mb-16">
        {campaign.status === 'rejected' && session?.user.id === campaign.creator_id && (
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

        <div className="flex flex-wrap gap-2 mb-6">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold px-3 py-1">
            {campaign.category}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1.5 font-medium px-3 py-1">
            <Info className="w-3.5 h-3.5" />
            {campaign.funding_model === "fixed" ? "Fixed Funding" : "Flexible Funding"}
          </Badge>
          <Badge className="font-black px-3 py-1 uppercase tracking-widest text-xs ml-auto">
            {campaign.status}
          </Badge>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight leading-tight">{campaign.title}</h1>
        <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-4xl leading-relaxed">{campaign.tagline}</p>

        <div className="grid lg:grid-cols-[1fr_400px] gap-16">
          {/* Main Content (Video/Image) */}
          <div className="space-y-10">
            <div className="aspect-video rounded-3xl overflow-hidden bg-slate-900 shadow-2xl border border-white/5">
              {campaign.pitch_video_url ? (
                <iframe 
                  src={campaign.pitch_video_url.replace("watch?v=", "embed/")} 
                  className="w-full h-full"
                  allowFullScreen
                />
              ) : (
                <img 
                  src={campaign.cover_image_url || `https://picsum.photos/seed/${campaign.id}/1200/800`} 
                  alt={campaign.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
            
            <div className="flex flex-wrap items-center justify-between gap-6 p-6 bg-muted/30 rounded-2xl border">
              <div className="flex items-center gap-4">
                <Link to={`/profile/${creator?.id}`}>
                  <Avatar className="h-14 w-14 border-4 border-background shadow-sm hover:scale-105 transition-transform">
                    <AvatarImage src={creator?.avatar_url || ""} />
                    <AvatarFallback className="bg-primary text-white font-bold">{creator?.full_name?.charAt(0) || "C"}</AvatarFallback>
                  </Avatar>
                </Link>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Project Creator</p>
                  <Link to={`/profile/${creator?.id}`} className="text-lg font-bold hover:text-primary transition-colors">
                    {creator?.full_name || "Anonymous Creator"}
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-muted-foreground mr-2">Share:</span>
                <Button variant="outline" size="icon" className="rounded-full hover:text-primary hover:border-primary transition-colors" onClick={() => handleShare("twitter")}>
                  <Twitter className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full hover:text-primary hover:border-primary transition-colors" onClick={() => handleShare("facebook")}>
                  <Facebook className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full hover:text-primary hover:border-primary transition-colors" onClick={() => handleShare("copy")}>
                  <LinkIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Funding Sidebar (Sticky) */}
          <div className="lg:sticky lg:top-24 h-fit space-y-8">
            <div className="p-8 bg-card rounded-[2rem] border border-border/60 shadow-[var(--shadow-premium)] space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none"></div>
              <div className="space-y-4 relative z-10">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold tracking-tight text-foreground">${campaign.amount_raised.toLocaleString()}</span>
                  <span className="text-muted-foreground font-medium">raised</span>
                </div>
                <div className="space-y-3">
                  <Progress value={progress} className="h-3" />
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-primary">{Math.round(progress)}% of ${campaign.funding_goal.toLocaleString()}</span>
                    <span className="text-muted-foreground">{campaign.backer_count} backers</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="p-5 bg-muted/40 rounded-2xl text-center border border-border/40 backdrop-blur-sm">
                  <p className="text-3xl font-bold tracking-tight">{daysLeft}</p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-bold mt-1">Days Left</p>
                </div>
                <div className="p-5 bg-muted/40 rounded-2xl text-center border border-border/40 backdrop-blur-sm">
                  <p className="text-3xl font-bold tracking-tight">{campaign.backer_count}</p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-bold mt-1">Backers</p>
                </div>
              </div>

              <Button 
                size="lg" 
                className="w-full h-14 text-lg font-bold shadow-[0_8px_30px_rgb(79,70,229,0.2)] hover:shadow-[0_8px_35px_rgb(79,70,229,0.3)] rounded-2xl transition-all relative z-10"
                onClick={() => openPledgeModal()}
              >
                Back This Project
              </Button>

              <Button 
                variant="outline" 
                className={`w-full h-12 font-bold rounded-2xl ${isSaved ? 'text-primary border-primary bg-primary/5' : ''}`}
                onClick={toggleSave}
              >
                <Heart className={`w-4 h-4 mr-2 ${isSaved ? 'fill-primary' : ''}`} />
                {isSaved ? "Saved to Watchlist" : "Save this Project"}
              </Button>

              <Popover>
                <PopoverTrigger render={
                  <Button variant="outline" className="w-full h-12 font-bold rounded-2xl">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Project
                  </Button>
                } />
                <PopoverContent className="w-64 p-4 rounded-2xl shadow-2xl border-border/40" align="end">
                  <PopoverHeader className="mb-4">
                    <PopoverTitle className="text-base font-bold">Share this campaign</PopoverTitle>
                  </PopoverHeader>
                  <div className="grid gap-2">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start gap-3 h-11 rounded-xl hover:bg-primary/5 hover:text-primary font-bold"
                      onClick={() => handleShare("twitter")}
                    >
                      <Twitter className="w-4 h-4 text-[#1DA1F2]" />
                      Share on Twitter
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start gap-3 h-11 rounded-xl hover:bg-primary/5 hover:text-primary font-bold"
                      onClick={() => handleShare("facebook")}
                    >
                      <Facebook className="w-4 h-4 text-[#1877F2]" />
                      Share on Facebook
                    </Button>
                    <Separator className="my-1" />
                    <div className="flex gap-2">
                      <Input 
                        value={window.location.href} 
                        readOnly 
                        className="h-10 rounded-xl text-xs bg-muted/50 border-none font-medium"
                      />
                      <Button 
                        size="icon" 
                        variant="ghost"
                        className="h-10 w-10 shrink-0 rounded-xl hover:bg-primary/5 hover:text-primary"
                        onClick={() => handleShare("copy")}
                      >
                        <LinkIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-xl">
                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {campaign.funding_model === "fixed" 
                    ? "This project will only be funded if it reaches its goal. If it doesn't, all backers will be refunded." 
                    : "This project will receive all funds raised even if it doesn't reach its goal."}
                </p>
              </div>
            </div>

            <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
              <DialogTrigger render={
                <Button variant="ghost" className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/5 font-bold flex items-center justify-center gap-2">
                  <Flag className="w-4 h-4" />
                  Report this project
                </Button>
              } />
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-5 h-5" /> Report Project
                  </DialogTitle>
                  <DialogDescription>
                    Please let us know why you are reporting this project. Our safety team will review it shortly.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Reason for reporting</label>
                    <select 
                      className="w-full p-2 rounded-md border bg-background"
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                    >
                      <option>Inappropriate content</option>
                      <option>Fraudulent activity</option>
                      <option>Intellectual property violation</option>
                      <option>Spam or misleading</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Additional details</label>
                    <textarea 
                      className="w-full p-2 rounded-md border bg-background min-h-[100px]" 
                      placeholder="Please provide more information..." 
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsReportModalOpen(false)}>Cancel</Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleSubmitReport}
                    disabled={isSubmittingReport}
                  >
                    {isSubmittingReport ? "Submitting..." : "Submit Report"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-[1fr_400px] gap-16">
          <div className="space-y-12">
            <Tabs defaultValue="story" className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none h-14 bg-transparent p-0 gap-10">
                <TabsTrigger value="story" className="rounded-none border-b-4 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 text-lg font-black transition-all">Story</TabsTrigger>
                <TabsTrigger value="updates" className="rounded-none border-b-4 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 text-lg font-black transition-all">Updates</TabsTrigger>
                <TabsTrigger value="comments" className="rounded-none border-b-4 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 text-lg font-black transition-all">Comments</TabsTrigger>
              </TabsList>
              <TabsContent value="story" className="py-10 prose prose-slate dark:prose-invert max-w-none">
                {campaign.story_html ? (
                  <div className="text-lg leading-relaxed space-y-6 ProseMirror" dangerouslySetInnerHTML={{ __html: campaign.story_html }} />
                ) : (
                  <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed">
                    <p className="text-muted-foreground font-medium">No story provided for this campaign.</p>
                  </div>
                )}

                {/* About the Creator Section */}
                <div className="mt-16 pt-16 border-t not-prose">
                  <h2 className="text-2xl font-black mb-6">About the Creator</h2>
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 p-8 bg-muted/30 rounded-[2rem] border border-border/40 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors"></div>
                    
                    <Link to={`/profile/${creator?.id}`} className="shrink-0 relative">
                      <Avatar className="h-24 w-24 border-4 border-background shadow-lg hover:scale-105 transition-transform duration-300">
                        <AvatarImage src={creator?.avatar_url || ""} />
                        <AvatarFallback className="text-3xl bg-primary text-white font-black">
                          {creator?.full_name?.charAt(0) || "C"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 p-1.5 rounded-full shadow-sm">
                        <div className="bg-green-500 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900"></div>
                      </div>
                    </Link>

                    <div className="flex-1 space-y-4 text-center sm:text-left">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                          <Link to={`/profile/${creator?.id}`} className="text-2xl font-black hover:text-primary transition-colors tracking-tight">
                            {creator?.full_name || "Anonymous Creator"}
                          </Link>
                          {creator?.location && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border/50 flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-primary" /> {creator.location}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-muted-foreground tracking-tight">Verified Creator • Joined {creator?.created_at ? format(new Date(creator.created_at), "MMMM yyyy") : "Recently"}</p>
                      </div>

                      <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                        {creator?.bio || "This creator is passionate about bringing innovative ideas to life. Follow their profile to stay updated on their latest projects and contributions to the GW3 community."}
                      </p>

                      <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4">
                        <Link to={`/profile/${creator?.id}`}>
                          <Button variant="outline" size="sm" className="font-bold rounded-xl h-10 px-6 hover:bg-primary hover:text-white transition-all shadow-sm">
                            View Full Profile <ExternalLink className="ml-2 w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm" className="font-bold text-muted-foreground hover:text-foreground">
                          Contact Creator
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="updates" className="py-10">
                {campaign && session?.user?.id === campaign.creator_id && (
                  <div className="mb-10">
                    <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
                      <DialogTrigger render={
                        <Button className="w-full h-16 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-2">
                          <PlusCircle className="w-6 h-6" />
                          Post a New Update
                        </Button>
                      } />
                      <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-black">Post Update</DialogTitle>
                          <DialogDescription>
                            Share an update with your backers about the project's progress.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-4">
                          <div className="space-y-2">
                            <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Update Title</label>
                            <Input 
                              placeholder="e.g., We've reached our first milestone!" 
                              value={newUpdateTitle}
                              onChange={(e) => setNewUpdateTitle(e.target.value)}
                              className="h-12 rounded-xl border-2 focus:border-primary"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Update Content</label>
                            <Textarea 
                              placeholder="Describe what's happening..." 
                              value={newUpdateBody}
                              onChange={(e) => setNewUpdateBody(e.target.value)}
                              className="min-h-[200px] rounded-xl border-2 focus:border-primary p-4"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsUpdateModalOpen(false)} className="rounded-xl h-12 px-8 font-bold">Cancel</Button>
                          <Button 
                            onClick={handlePostUpdate}
                            disabled={isSubmittingUpdate}
                            className="rounded-xl h-12 px-8 font-bold"
                          >
                            {isSubmittingUpdate ? "Posting..." : "Post Update"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                {updates.length > 0 ? (
                  <div className="space-y-12">
                    {updates.map((update) => (
                      <div key={update.id} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-2xl font-bold">{update.title}</h3>
                          <span className="text-sm text-muted-foreground font-medium">
                            {format(new Date(update.created_at), "MMMM dd, yyyy")}
                          </span>
                        </div>
                        <div className="text-lg leading-relaxed text-muted-foreground" dangerouslySetInnerHTML={{ __html: update.body }} />
                        <Separator />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed">
                    <MessageSquare className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
                    <h3 className="text-xl font-bold mb-2">No updates yet</h3>
                    <p className="text-muted-foreground">The creator hasn't posted any updates for this project.</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="comments" className="py-10">
                <CommentSection campaignId={id!} session={session} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Rewards Sidebar */}
          <div className="space-y-8">
            <h3 className="text-3xl font-black tracking-tight mb-8">Select a Reward</h3>
            {rewards.length > 0 ? (
              <div className="space-y-6">
                {rewards.map(reward => (
                  <Card 
                    key={reward.id} 
                    className="group hover:border-primary hover:shadow-2xl hover:shadow-primary/10 transition-all cursor-pointer overflow-hidden rounded-3xl border-2"
                    onClick={() => openPledgeModal(reward)}
                  >
                    {reward.image_url && (
                      <div className="h-48 overflow-hidden">
                        <img src={reward.image_url} alt={reward.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    )}
                    <CardHeader className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">{reward.title}</CardTitle>
                        <span className="text-2xl font-black text-primary">${reward.price}</span>
                      </div>
                      <CardDescription className="text-sm leading-relaxed line-clamp-4 font-medium">{reward.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 pt-0 space-y-6">
                      <div className="flex flex-col gap-3 p-4 bg-muted/50 rounded-2xl">
                        <div className="flex items-center gap-3 text-sm font-bold">
                          <Clock className="w-4 h-4 text-primary" />
                          <span>Est. Delivery: {reward.estimated_delivery}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm font-bold">
                          <Users className="w-4 h-4 text-primary" />
                          <span>{reward.quantity_claimed} backers</span>
                        </div>
                      </div>
                      <Button className="w-full h-12 font-black rounded-xl group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                        Select Reward
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-10 text-center border-dashed border-2 rounded-3xl bg-muted/10">
                <p className="text-muted-foreground font-bold mb-6">No reward tiers available for this project.</p>
                <Button variant="outline" className="w-full h-12 font-black rounded-xl" onClick={() => openPledgeModal()}>Support with Custom Amount</Button>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isPledgeModalOpen} onOpenChange={setIsPledgeModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {paymentStep === 'details' ? 'Back this project' : 'Payment Details'}
            </DialogTitle>
            <DialogDescription>
              {paymentStep === 'details' 
                ? (selectedRewardForPledge ? `You're pledging for: ${selectedRewardForPledge.title}` : "You're making a pledge without a reward.")
                : `You are about to pledge $${pledgeAmount + calculateShippingCost()}.`
              }
            </DialogDescription>
          </DialogHeader>

          {paymentStep === 'details' ? (
            <>
              <div className="grid gap-6 py-4">
                {rewards.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Select a Reward (Optional)</label>
                    <select 
                      className="w-full p-3 rounded-md border bg-background"
                      value={selectedRewardForPledge?.id || ""}
                      onChange={(e) => {
                        const reward = rewards.find(r => r.id === e.target.value);
                        if (reward) {
                          setSelectedRewardForPledge(reward);
                          setPledgeAmount(Math.max(pledgeAmount, reward.price));
                          setShippingRegion("");
                        } else {
                          setSelectedRewardForPledge(null);
                        }
                      }}
                    >
                      <option value="">No reward, just pledge</option>
                      {rewards.map(r => (
                        <option key={r.id} value={r.id}>{r.title} (${r.price})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-bold">Pledge Amount ($)</label>
                  <Input 
                    type="number" 
                    value={pledgeAmount} 
                    onChange={(e) => setPledgeAmount(Math.max(selectedRewardForPledge?.price || 1, parseFloat(e.target.value) || 0))}
                    min={selectedRewardForPledge?.price || 1}
                    className="font-bold text-lg h-12"
                  />
                  {selectedRewardForPledge && (
                    <p className="text-xs text-muted-foreground">Minimum pledge for this reward is ${selectedRewardForPledge.price}</p>
                  )}
                </div>

                {selectedRewardForPledge?.shipping_type === 'specific' && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Shipping Region</label>
                    <select 
                      className="w-full p-3 rounded-md border bg-background"
                      value={shippingRegion}
                      onChange={(e) => setShippingRegion(e.target.value)}
                    >
                      <option value="" disabled>Select a region</option>
                      {(selectedRewardForPledge.shipping_regions || []).map((r, i) => (
                        <option key={i} value={r.region}>{r.region} (+${r.cost})</option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedRewardForPledge && selectedRewardForPledge.shipping_type !== 'none' && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Shipping Address</label>
                    <Textarea 
                      placeholder="Enter your full shipping address..."
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                )}

                <div className="bg-muted/30 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pledge</span>
                    <span className="font-bold">${pledgeAmount}</span>
                  </div>
                  {selectedRewardForPledge && selectedRewardForPledge.shipping_type !== 'none' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="font-bold">${calculateShippingCost()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-black pt-2 border-t">
                    <span>Total</span>
                    <span className="text-primary">${pledgeAmount + calculateShippingCost()}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsPledgeModalOpen(false)}>Cancel</Button>
                <Button onClick={handleContinueToPayment} className="font-bold">
                  Continue to Payment
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-6 py-4">
                <div className="bg-primary/10 text-primary p-4 rounded-xl text-sm font-medium flex items-start gap-3">
                  <Info className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>This is a mock payment layer. Use card number <strong>4000</strong> anywhere to simulate a failed payment. Any other number will succeed.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Card Number</label>
                    <Input 
                      value={mockCardNumber}
                      onChange={(e) => setMockCardNumber(e.target.value)}
                      placeholder="0000 0000 0000 0000"
                      className="font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold">Expiry Date</label>
                      <Input 
                        value={mockCardExpiry}
                        onChange={(e) => setMockCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold">CVC</label>
                      <Input 
                        value={mockCardCvc}
                        onChange={(e) => setMockCardCvc(e.target.value)}
                        placeholder="123"
                        type="password"
                        maxLength={4}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between gap-3">
                <Button variant="ghost" onClick={() => setPaymentStep('details')} disabled={isPledging}>
                  Back
                </Button>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setIsPledgeModalOpen(false)} disabled={isPledging}>Cancel</Button>
                  <Button onClick={processPayment} disabled={isPledging} className="font-bold">
                    {isPledging ? "Processing..." : `Pay $${pledgeAmount + calculateShippingCost()}`}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
