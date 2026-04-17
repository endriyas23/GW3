import { useState, useEffect, useCallback, useRef } from "react";
import { Session } from "@supabase/supabase-js";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  ChevronRight, 
  ChevronLeft, 
  Upload, 
  DollarSign, 
  Calendar as CalendarIcon,
  CheckCircle2,
  ArrowLeft,
  Eye,
  Send,
  Info,
  Plus,
  Trash2,
  GripVertical,
  User,
  HelpCircle,
  AlertTriangle,
  Clock,
  Check,
  Circle,
  MoreVertical,
  Copy,
  ExternalLink,
  Save,
  TrendingUp,
  Smartphone,
  Tablet,
  Monitor,
  ShieldCheck,
  FileText,
  Video
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { debounce } from "lodash";
import { format, addDays } from "date-fns";
import { Campaign, Reward, TeamMember, FAQ, StretchGoal, Profile } from "@/types/database";
import RichTextEditor from "@/components/RichTextEditor";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "basics", title: "Basics", time: "~3 min" },
  { id: "funding", title: "Funding", time: "~5 min" },
  { id: "story", title: "Story", time: "~30 min" },
  { id: "rewards", title: "Rewards", time: "~20 min" },
  { id: "faq", title: "FAQ", time: "~5 min", optional: true },
  { id: "risks", title: "Risks & Challenges", time: "~10 min" },
  { id: "preview", title: "Preview", time: "" },
  { id: "submit", title: "Submit", time: "" },
];

const CATEGORIES = [
  { name: "Technology", icon: "💻" },
  { name: "Creative", icon: "🎨" },
  { name: "Community", icon: "🤝" },
  { name: "Film", icon: "🎬" },
  { name: "Music", icon: "🎵" },
  { name: "Games", icon: "🎮" },
  { name: "Design", icon: "📐" },
  { name: "Food", icon: "🍕" },
  { name: "Education", icon: "📚" },
  { name: "Health", icon: "🏥" },
];

export default function CreateCampaign({ session }: { session: Session | null }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [campaign, setCampaign] = useState<Partial<Campaign>>({
    title: "",
    tagline: "",
    category: "",
    subcategory: "",
    country: "US",
    city: "",
    funding_goal: 5000,
    currency: "USD",
    duration_days: 30,
    funding_model: "flexible",
    cover_image_url: "",
    pitch_video_url: "",
    story_html: "",
    risks: "",
    draft_progress: {},
  });

  const [rewards, setRewards] = useState<Partial<Reward>[]>([]);
  const [editingReward, setEditingReward] = useState<number | null>(null);

  const updateReward = (index: number, updates: Partial<Reward>) => {
    const newRewards = [...rewards];
    newRewards[index] = { ...newRewards[index], ...updates };
    setRewards(newRewards);
    // In a real app, we would also save this to the database
  };

  const removeReward = async (index: number) => {
    const newRewards = rewards.filter((_, i) => i !== index);
    setRewards(newRewards);
    await saveRelatedData(newRewards);
  };

  const [faqs, setFaqs] = useState<Partial<FAQ>[]>([]);
  const updateFaq = (index: number, updates: Partial<FAQ>) => {
    const newFaqs = [...faqs];
    newFaqs[index] = { ...newFaqs[index], ...updates };
    setFaqs(newFaqs);
  };
  const removeFaq = async (index: number) => {
    const newFaqs = faqs.filter((_, i) => i !== index);
    setFaqs(newFaqs);
    await saveRelatedData(undefined, newFaqs);
  };

  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-save logic
  const debouncedSave = useCallback(
    debounce(async (data: Partial<Campaign>) => {
      if (!id || !session) return;
      setSaving(true);
      try {
        // Strip immutable fields if they accidentally got in
        const { 
          id: _, 
          created_at: __, 
          creator_id: ___, 
          amount_raised: ____, 
          backer_count: _____,
          ...updateData 
        } = data as any;

        const { error } = await supabase
          .from("campaigns")
          .update(updateData)
          .eq("id", id);
        if (error) throw error;
        setLastSaved(new Date());
      } catch (error: any) {
        console.error("Auto-save failed:", error);
        toast.error("Failed to auto-save changes");
      } finally {
        setSaving(false);
      }
    }, 800),
    [id, session]
  );

  useEffect(() => {
    if (session) {
      // Check if user is admin
      supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single()
        .then(({ data }) => {
          if (data?.role === 'admin') {
            toast.error("Admins cannot create campaigns.");
            navigate("/");
            return;
          }
          
          if (id) {
            fetchCampaign();
          } else {
            checkForExistingDraft();
          }
        });
    }
  }, [session, id, navigate]);

  const checkForExistingDraft = async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from("campaigns")
      .select("id, title")
      .eq("creator_id", session.user.id)
      .eq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(1);
    
    if (data && data.length > 0) {
      // Show modal to continue or start new
      const continueDraft = window.confirm(`Continue your draft "${data[0].title || "Untitled"}"?`);
      if (continueDraft) {
        navigate(`/create/${data[0].id}`);
      } else {
        // Delete the old draft before creating a new one
        await supabase.from("campaigns").delete().eq("id", data[0].id);
        createNewDraft();
      }
    } else {
      createNewDraft();
    }
  };

  const createNewDraft = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          creator_id: session.user.id,
          title: "",
          tagline: "",
          category: "",
          country: "US",
          status: "draft",
          funding_goal: 5000,
          currency: "USD",
          duration_days: 30,
          funding_model: "flexible",
          amount_raised: 0,
          backer_count: 0
        })
        .select()
        .single();
      
      if (error) throw error;
      if (data) {
        navigate(`/create/${data.id}`, { replace: true });
      }
    } catch (error: any) {
      toast.error("Failed to create draft: " + error.message);
      console.error("Draft creation error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaign = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      if (data) {
        setCampaign(data);
        // Fetch related data
        const [rewardsRes, faqRes] = await Promise.all([
          supabase.from("rewards").select("*").eq("campaign_id", id),
          supabase.from("campaign_faqs").select("*").eq("campaign_id", id).order("sort_order"),
        ]);
        
        setRewards(rewardsRes.data || []);
        setFaqs(faqRes.data || []);
      }
    } catch (error: any) {
      toast.error("Failed to load draft");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const updateCampaign = (updates: Partial<Campaign>) => {
    const newCampaign = { ...campaign, ...updates };
    setCampaign(newCampaign);
    debouncedSave(updates);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingImage(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const campaignId = campaign.id || id;
      if (!campaignId) throw new Error('Campaign ID is missing');

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${campaignId}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('campaigns')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('campaigns')
        .getPublicUrl(filePath);

      // Update local state and trigger auto-save
      updateCampaign({ cover_image_url: publicUrl });
      
      toast.success("Cover image uploaded!");
    } catch (error: any) {
      toast.error(error.message || "Error uploading image");
      console.error(error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleStoryImageUpload = useCallback(async (file: File): Promise<string> => {
    const campaignId = campaign.id || id;
    if (!campaignId) throw new Error("Campaign ID is missing");
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${campaignId}-story-${Math.random()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('campaigns')
      .upload(fileName, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('campaigns')
      .getPublicUrl(fileName);

    return publicUrl;
  }, [campaign.id, id]);

  const handleSubmit = async () => {
    if (!id || !session) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ status: "pending" })
        .eq("id", id);
      
      if (error) throw error;
      
      toast.success("Campaign submitted for review! We'll notify you once it's live.");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error("Failed to submit campaign: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const saveCampaignData = async () => {
    if (!id || !session) return;
    try {
      // Strip immutable fields
      const { 
        id: _, 
        created_at: __, 
        creator_id: ___, 
        amount_raised: ____, 
        backer_count: _____,
        ...updateData 
      } = campaign;

      const { error } = await supabase
        .from("campaigns")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
      setLastSaved(new Date());
    } catch (error: any) {
      console.error("Failed to save campaign data:", error);
      toast.error("Failed to save campaign changes");
    }
  };

  const saveRelatedData = async (
    customRewards?: Partial<Reward>[],
    customFaqs?: Partial<FAQ>[]
  ) => {
    if (!id) return;
    
    const rewardsToSave = customRewards || rewards;
    const faqsToSave = customFaqs || faqs;

    try {
      // Save Rewards - Always delete first to handle removals
      await supabase.from("rewards").delete().eq("campaign_id", id);
      if (rewardsToSave.length > 0) {
        const rewardsToInsert = rewardsToSave.map(r => {
          // We omit the ID and missing columns to avoid conflicts and schema errors
          const { id: _, items: __, ...rewardData } = r as any;
          return {
            ...rewardData,
            campaign_id: id,
            estimated_delivery: r.estimated_delivery || new Date().toISOString(),
            quantity_claimed: r.quantity_claimed || 0,
          };
        });
        const { error } = await supabase.from("rewards").insert(rewardsToInsert);
        if (error) throw error;
      }

      // Save FAQs
      await supabase.from("campaign_faqs").delete().eq("campaign_id", id);
      if (faqsToSave.length > 0) {
        const faqsToInsert = faqsToSave.map((f, i) => {
          const { id: _, ...faqData } = f;
          return {
            ...faqData,
            campaign_id: id,
            sort_order: i
          };
        });
        await supabase.from("campaign_faqs").insert(faqsToInsert);
      }
    } catch (error: any) {
      console.error("Failed to save related data:", error);
      toast.error("Failed to save some project details: " + error.message);
    }
  };

  const handleNext = async () => {
    setSaving(true);
    await Promise.all([
      saveCampaignData(),
      saveRelatedData()
    ]);
    setSaving(false);
    
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSaveAndExit = async () => {
    setSaving(true);
    await Promise.all([
      saveCampaignData(),
      saveRelatedData()
    ]);
    setSaving(false);
    navigate("/dashboard");
  };

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Please log in to create a campaign</h2>
        <Button onClick={() => navigate("/auth")}>Go to Login</Button>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading wizard...</div>;
  }

  const overallProgress = Math.round((currentStep / (STEPS.length - 1)) * 100);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={
                  <Button variant="ghost" size="icon" onClick={handleSaveAndExit}>
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                } />
                <TooltipContent>Save & Exit</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="flex items-center gap-2">
              <Input 
                value={campaign.title || "Untitled Campaign"} 
                onChange={(e) => updateCampaign({ title: e.target.value })}
                className="h-8 border-none bg-transparent font-bold text-lg focus-visible:ring-0 p-0 w-auto min-w-[100px]"
              />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {saving ? (
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3 animate-spin" /> Saving...</span>
                ) : lastSaved ? (
                  <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Saved {format(lastSaved, "HH:mm:ss")}</span>
                ) : (
                  <span className="flex items-center gap-1"><Save className="h-3 w-3" /> Draft</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="hidden sm:flex" onClick={() => window.open(`/campaign/${id}`, "_blank")}>
              <Eye className="mr-2 h-4 w-4" /> Preview
            </Button>
            <Button size="sm" className="font-bold" disabled={overallProgress < 100}>
              <Send className="mr-2 h-4 w-4" /> Submit for Review
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-grow container flex flex-col md:flex-row gap-0 md:gap-8 px-0 md:px-4">
        {/* Sidebar */}
        <aside className="w-full md:w-[280px] md:sticky md:top-16 h-fit md:h-[calc(100vh-4rem)] border-r md:border-none bg-background md:bg-transparent z-40">
          <ScrollArea className="h-full py-6 px-4">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <span>Progress</span>
                  <span>{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="h-1.5" />
              </div>
              <nav className="space-y-1">
                {STEPS.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(index)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                      currentStep === index 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <div className="relative flex items-center justify-center">
                      {index < currentStep ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : index === currentStep ? (
                        <Circle className="h-5 w-5 text-primary fill-primary/20" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="flex flex-col items-start text-left">
                      <span className="flex items-center gap-1.5">
                        {step.title}
                        {step.optional && <span className="text-[10px] opacity-60 font-normal">(Optional)</span>}
                      </span>
                      {step.time && <span className="text-[10px] opacity-60 font-normal">{step.time}</span>}
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex-grow py-12 px-6 md:px-16 max-w-[840px] mx-auto w-full">
          <div className="space-y-12">
            {/* Step Content */}
            {currentStep === 0 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tight">The Basics</h2>
                  <p className="text-muted-foreground text-lg">Start with the essential details of your campaign.</p>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label htmlFor="title" className="text-base font-bold">Campaign Title</Label>
                      <span className="text-xs text-muted-foreground">{(campaign.title?.length || 0)}/60</span>
                    </div>
                    <Input 
                      id="title" 
                      placeholder="e.g. The Ultimate Smart Coffee Mug" 
                      maxLength={60}
                      value={campaign.title}
                      onChange={(e) => updateCampaign({ title: e.target.value })}
                      className="h-12 text-lg"
                    />
                    <p className="text-xs text-muted-foreground">Make it clear and memorable.</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label htmlFor="tagline" className="text-base font-bold">Tagline</Label>
                      <span className="text-xs text-muted-foreground">{(campaign.tagline?.length || 0)}/135</span>
                    </div>
                    <Textarea 
                      id="tagline" 
                      placeholder="e.g. Keep your coffee at the perfect temperature for hours with our patented AI technology." 
                      maxLength={135}
                      value={campaign.tagline}
                      onChange={(e) => updateCampaign({ tagline: e.target.value })}
                      className="min-h-[80px] text-base"
                    />
                    <p className="text-xs text-muted-foreground">One sentence that explains what you're creating.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label htmlFor="category" className="text-base font-bold">Category</Label>
                      <Select value={campaign.category} onValueChange={(v) => updateCampaign({ category: v })}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat.name} value={cat.name.toLowerCase()}>
                              <span className="mr-2">{cat.icon}</span> {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="subcategory" className="text-base font-bold">Subcategory</Label>
                      <Input 
                        id="subcategory" 
                        placeholder="e.g. Kitchen Gadgets" 
                        value={campaign.subcategory || ""}
                        onChange={(e) => updateCampaign({ subcategory: e.target.value })}
                        className="h-12"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label htmlFor="country" className="text-base font-bold">Country of Origin</Label>
                      <Select value={campaign.country} onValueChange={(v) => updateCampaign({ country: v })}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="US">🇺🇸 United States</SelectItem>
                          <SelectItem value="GB">🇬🇧 United Kingdom</SelectItem>
                          <SelectItem value="CA">🇨🇦 Canada</SelectItem>
                          <SelectItem value="AU">🇦🇺 Australia</SelectItem>
                          <SelectItem value="DE">🇩🇪 Germany</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="city" className="text-base font-bold">City (Optional)</Label>
                      <Input 
                        id="city" 
                        placeholder="e.g. San Francisco" 
                        value={campaign.city || ""}
                        onChange={(e) => updateCampaign({ city: e.target.value })}
                        className="h-12"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-bold">Cover Image</Label>
                    <div 
                      className="border-2 border-dashed rounded-3xl p-12 text-center space-y-4 bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer group relative"
                      onClick={() => !campaign.cover_image_url && fileInputRef.current?.click()}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                      {uploadingImage ? (
                        <div className="flex flex-col items-center justify-center py-8">
                          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto animate-pulse mb-4">
                            <Upload className="h-8 w-8 text-muted-foreground animate-bounce" />
                          </div>
                          <p className="font-bold">Uploading image...</p>
                        </div>
                      ) : campaign.cover_image_url ? (
                        <div className="relative aspect-video rounded-2xl overflow-hidden shadow-xl">
                          <img src={campaign.cover_image_url} className="w-full h-full object-cover" />
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            className="absolute top-4 right-4"
                            onClick={(e) => { e.stopPropagation(); updateCampaign({ cover_image_url: "" }); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                            <Upload className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-bold">Drag and drop or click to upload</p>
                            <p className="text-sm text-muted-foreground">Recommended: 1280x720 (16:9) • JPG, PNG, WEBP • Max 5MB</p>
                          </div>
                          <Button variant="outline" className="font-bold" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>Select Image</Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tight">Funding</h2>
                  <p className="text-muted-foreground text-lg">Define your goal and how you'll receive funds.</p>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label htmlFor="goal" className="text-base font-bold">Funding Goal</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                          id="goal" 
                          type="number"
                          placeholder="5000" 
                          value={campaign.funding_goal}
                          onChange={(e) => updateCampaign({ funding_goal: parseFloat(e.target.value) })}
                          className="h-12 pl-12 text-lg font-bold"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">How much do you need to make this happen?</p>
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="currency" className="text-base font-bold">Currency</Label>
                      <Select value={campaign.currency} onValueChange={(v) => updateCampaign({ currency: v })}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="CAD">CAD ($)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <Label className="text-base font-bold">Campaign Duration</Label>
                      <span className="text-2xl font-black text-primary">{campaign.duration_days} days</span>
                    </div>
                    <Slider 
                      value={[campaign.duration_days || 30]} 
                      min={1} 
                      max={60} 
                      step={1}
                      onValueChange={(v) => updateCampaign({ duration_days: Array.isArray(v) ? v[0] : v })}
                      className="py-4"
                    />
                    <p className="text-xs text-muted-foreground">30 days is the sweet spot — long enough to build momentum, short enough to create urgency.</p>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-bold">Funding Model</Label>
                    <RadioGroup 
                      value={campaign.funding_model} 
                      onValueChange={(v: any) => updateCampaign({ funding_model: v })}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      <Label
                        htmlFor="fixed"
                        className={cn(
                          "flex flex-col gap-3 p-6 rounded-2xl border-2 cursor-pointer transition-all hover:bg-muted/50",
                          campaign.funding_model === "fixed" ? "border-primary bg-primary/5" : "border-muted"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-lg">Fixed Funding</span>
                          <RadioGroupItem value="fixed" id="fixed" />
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          You only receive funds if you hit your goal. Backers are not charged if the campaign fails. Best for projects that need a minimum amount to deliver.
                        </p>
                      </Label>
                      <Label
                        htmlFor="flexible"
                        className={cn(
                          "flex flex-col gap-3 p-6 rounded-2xl border-2 cursor-pointer transition-all hover:bg-muted/50",
                          campaign.funding_model === "flexible" ? "border-primary bg-primary/5" : "border-muted"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-lg">Flexible Funding</span>
                          <RadioGroupItem value="flexible" id="flexible" />
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          You keep all funds raised, even if you don't hit your goal. Best for ongoing causes or projects that can scale to any budget.
                        </p>
                      </Label>
                    </RadioGroup>
                  </div>

                  <div className="p-8 bg-primary/5 rounded-3xl border border-primary/10 space-y-6">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <HelpCircle className="h-5 w-5 text-primary" /> Estimated Platform Fees
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Platform Fee (5%)</span>
                        <span className="font-medium">-${(campaign.funding_goal! * 0.05).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Payment Processing (~2.9% + $0.30)</span>
                        <span className="font-medium">-${(campaign.funding_goal! * 0.029 + 0.30).toLocaleString()}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold">
                        <span>Estimated Payout</span>
                        <span className="text-primary">${(campaign.funding_goal! - (campaign.funding_goal! * 0.079 + 0.30)).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tight">Story</h2>
                  <p className="text-muted-foreground text-lg">Tell the story behind your project. Why are you making it? Why should people care?</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-base font-bold">Campaign Story</Label>
                    <RichTextEditor 
                      content={campaign.story_html || ""} 
                      onChange={(content) => updateCampaign({ story_html: content })} 
                      placeholder="Start writing your story here... You can add images and YouTube videos using the toolbar."
                      onImageUpload={handleStoryImageUpload}
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tight">Rewards</h2>
                  <p className="text-muted-foreground text-lg">Create tiers to incentivize backers to support your project.</p>
                </div>

                <div className="space-y-6">
                  {rewards.length === 0 ? (
                    <div className="text-center py-20 bg-muted/10 rounded-3xl border-2 border-dashed space-y-6">
                      <div className="w-20 h-20 bg-background shadow-sm rounded-full flex items-center justify-center mx-auto border">
                        <Plus className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold">Add your first reward</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto">Rewards are the primary reason people back projects. Start with a simple "Thank You" or an early bird special.</p>
                      </div>
                      <Button size="lg" className="font-bold shadow-sm" onClick={() => {
                        const newIndex = rewards.length;
                        setRewards([...rewards, { 
                          title: "New Reward", 
                          price: 25, 
                          description: "", 
                          estimated_delivery: format(addDays(new Date(), 90), "MMMM yyyy"), 
                          shipping_type: "none",
                          quantity_limit: null,
                          image_url: null,
                          quantity_claimed: 0
                        } as any]);
                        setEditingReward(newIndex);
                      }}>
                        <Plus className="mr-2 h-5 w-5" /> Add Reward
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {rewards.map((reward, index) => (
                        <Card key={index} className="group hover:border-primary/50 transition-all overflow-hidden rounded-2xl border-2 shadow-sm hover:shadow-md">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center p-5 gap-5">
                            <div className="hidden sm:flex cursor-grab text-muted-foreground/50 hover:text-primary transition-colors">
                              <GripVertical className="h-5 w-5" />
                            </div>
                            
                            {reward.image_url ? (
                              <div className="h-20 w-20 sm:h-16 sm:w-16 rounded-xl overflow-hidden shrink-0 border bg-muted">
                                <img src={reward.image_url} alt={reward.title} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="h-20 w-20 sm:h-16 sm:w-16 rounded-xl shrink-0 border-2 border-dashed bg-muted/30 flex items-center justify-center">
                                <FileText className="h-6 w-6 text-muted-foreground/50" />
                              </div>
                            )}
                            
                            <div className="flex-grow space-y-1.5 w-full">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-bold text-lg leading-none">{reward.title}</h4>
                                <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold text-sm px-2 py-0.5">${reward.price}</Badge>
                                {reward.quantity_limit && (
                                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">Limit: {reward.quantity_limit}</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{reward.description || "No description provided."}</p>
                              {reward.estimated_delivery && (
                                <p className="text-xs font-medium text-muted-foreground pt-1">
                                  Est. Delivery: <span className="text-foreground">{reward.estimated_delivery}</span>
                                </p>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0">
                              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => removeReward(index)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <Button variant="secondary" size="sm" className="font-bold shadow-sm" onClick={() => setEditingReward(index)}>Edit Reward</Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                      <Button variant="outline" className="w-full h-14 border-2 border-dashed rounded-2xl font-bold text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition-colors" onClick={() => {
                        const newIndex = rewards.length;
                        setRewards([...rewards, { 
                          title: "New Reward", 
                          price: 25, 
                          description: "", 
                          estimated_delivery: format(addDays(new Date(), 90), "MMMM yyyy"), 
                          shipping_type: "none",
                          quantity_limit: null,
                          image_url: null,
                          quantity_claimed: 0
                        } as any]);
                        setEditingReward(newIndex);
                      }}>
                        <Plus className="mr-2 h-5 w-5" /> Add another reward tier
                      </Button>
                    </div>
                  )}

                  <Sheet open={editingReward !== null} onOpenChange={(open) => {
                    if (!open) {
                      setEditingReward(null);
                      saveRelatedData();
                    }
                  }}>
                    <SheetContent className="sm:max-w-[540px] overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle>Edit Reward Tier</SheetTitle>
                        <SheetDescription>Define the details for this reward level.</SheetDescription>
                      </SheetHeader>
                      {editingReward !== null && rewards[editingReward] && (
                        <div className="space-y-6 py-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Title</Label>
                              <Input 
                                value={rewards[editingReward].title} 
                                onChange={(e) => updateReward(editingReward, { title: e.target.value })} 
                                className="font-bold"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pledge Amount</Label>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  type="number" 
                                  value={rewards[editingReward].price} 
                                  onChange={(e) => updateReward(editingReward, { price: parseFloat(e.target.value) })} 
                                  className="pl-9 font-bold"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
                            <Textarea 
                              value={rewards[editingReward].description} 
                              onChange={(e) => updateReward(editingReward, { description: e.target.value })} 
                              className="min-h-[100px]"
                              placeholder="Describe what backers will receive..."
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Estimated Delivery</Label>
                              <Input 
                                value={rewards[editingReward].estimated_delivery} 
                                onChange={(e) => updateReward(editingReward, { estimated_delivery: e.target.value })} 
                                placeholder="e.g. Oct 2024"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quantity Limit <span className="font-normal normal-case opacity-70">(Optional)</span></Label>
                              <Input 
                                type="number" 
                                placeholder="Unlimited"
                                value={rewards[editingReward].quantity_limit || ""} 
                                onChange={(e) => updateReward(editingReward, { quantity_limit: e.target.value ? parseInt(e.target.value) : null })} 
                              />
                            </div>
                          </div>

                          <div className="space-y-4 border-t pt-6">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Shipping</Label>
                            <Select 
                              value={rewards[editingReward].shipping_type || 'none'} 
                              onValueChange={(v: any) => updateReward(editingReward, { shipping_type: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select shipping type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No shipping required (Digital/Local)</SelectItem>
                                <SelectItem value="worldwide">Ships worldwide</SelectItem>
                                <SelectItem value="specific">Ships to specific regions</SelectItem>
                              </SelectContent>
                            </Select>

                            {rewards[editingReward].shipping_type === 'worldwide' && (
                              <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Worldwide Shipping Cost</Label>
                                <div className="relative">
                                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input 
                                    type="number" 
                                    value={rewards[editingReward].worldwide_shipping_cost || 0} 
                                    onChange={(e) => updateReward(editingReward, { worldwide_shipping_cost: parseFloat(e.target.value) })} 
                                    className="pl-9"
                                  />
                                </div>
                              </div>
                            )}

                            {rewards[editingReward].shipping_type === 'specific' && (
                              <div className="space-y-4">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Shipping Regions</Label>
                                {(rewards[editingReward].shipping_regions || []).map((region, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <Input 
                                      placeholder="Region (e.g. US, EU)" 
                                      value={region.region}
                                      onChange={(e) => {
                                        const newRegions = [...(rewards[editingReward].shipping_regions || [])];
                                        newRegions[idx].region = e.target.value;
                                        updateReward(editingReward, { shipping_regions: newRegions });
                                      }}
                                    />
                                    <div className="relative w-32 shrink-0">
                                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                      <Input 
                                        type="number" 
                                        value={region.cost}
                                        onChange={(e) => {
                                          const newRegions = [...(rewards[editingReward].shipping_regions || [])];
                                          newRegions[idx].cost = parseFloat(e.target.value) || 0;
                                          updateReward(editingReward, { shipping_regions: newRegions });
                                        }}
                                        className="pl-9"
                                      />
                                    </div>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => {
                                        const newRegions = [...(rewards[editingReward].shipping_regions || [])];
                                        newRegions.splice(idx, 1);
                                        updateReward(editingReward, { shipping_regions: newRegions });
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                ))}
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => {
                                    const newRegions = [...(rewards[editingReward].shipping_regions || []), { region: "", cost: 0 }];
                                    updateReward(editingReward, { shipping_regions: newRegions });
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-2" /> Add Region
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-2 border-t pt-6">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reward Image</Label>
                            <div className="space-y-4">
                              {rewards[editingReward].image_url ? (
                                <div className="relative aspect-video rounded-2xl overflow-hidden border-2">
                                  <img src={rewards[editingReward].image_url!} alt="Reward" className="w-full h-full object-cover" />
                                  <Button 
                                    variant="destructive" 
                                    size="icon" 
                                    className="absolute top-2 right-2 h-8 w-8 rounded-full"
                                    onClick={() => updateReward(editingReward, { image_url: null })}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div 
                                  className="flex flex-col items-center justify-center aspect-video border-2 border-dashed rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer relative"
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onDrop={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const file = e.dataTransfer.files?.[0];
                                    if (file && file.type.startsWith('image/')) {
                                      try {
                                        setUploadingImage(true);
                                        const campaignId = campaign.id || id;
                                        const fileExt = file.name.split('.').pop();
                                        const fileName = `${campaignId}-reward-${Math.random()}.${fileExt}`;
                                        const filePath = `${fileName}`;
                                        
                                        const { error: uploadError } = await supabase.storage
                                          .from('campaigns')
                                          .upload(filePath, file);
                                        
                                        if (uploadError) throw uploadError;
                                        
                                        const { data: { publicUrl } } = supabase.storage
                                          .from('campaigns')
                                          .getPublicUrl(filePath);
                                        
                                        updateReward(editingReward, { image_url: publicUrl });
                                        toast.success("Reward image uploaded!");
                                      } catch (error: any) {
                                        toast.error("Upload failed: " + error.message);
                                      } finally {
                                        setUploadingImage(false);
                                      }
                                    }
                                  }}
                                >
                                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                  <p className="text-sm font-bold">Click or drag & drop to upload reward image</p>
                                  <p className="text-xs text-muted-foreground">Recommended: 16:9 aspect ratio</p>
                                  <Input 
                                    type="file" 
                                    accept="image/*" 
                                    className="absolute inset-0 opacity-0 cursor-pointer" 
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        try {
                                          setUploadingImage(true);
                                          const campaignId = campaign.id || id;
                                          const fileExt = file.name.split('.').pop();
                                          const fileName = `${campaignId}-reward-${Math.random()}.${fileExt}`;
                                          const filePath = `${fileName}`;
                                          
                                          const { error: uploadError } = await supabase.storage
                                            .from('campaigns')
                                            .upload(filePath, file);
                                          
                                          if (uploadError) throw uploadError;
                                          
                                          const { data: { publicUrl } } = supabase.storage
                                            .from('campaigns')
                                            .getPublicUrl(filePath);
                                          
                                          updateReward(editingReward, { image_url: publicUrl });
                                          toast.success("Reward image uploaded!");
                                        } catch (error: any) {
                                          toast.error("Upload failed: " + error.message);
                                        } finally {
                                          setUploadingImage(false);
                                        }
                                      }
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      <SheetFooter>
                        <Button onClick={async () => {
                          setEditingReward(null);
                          await saveRelatedData();
                        }}>Save Reward</Button>
                      </SheetFooter>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tight">FAQ <span className="text-lg font-normal text-muted-foreground ml-2">(Optional)</span></h2>
                  <p className="text-muted-foreground text-lg">Answer common questions to build trust with potential backers.</p>
                </div>

                <div className="space-y-6">
                  {faqs.map((faq, index) => (
                    <Card key={index} className="p-6 rounded-2xl border-2 space-y-4">
                      <div className="flex justify-between items-start">
                        <Input 
                          value={faq.question || ""} 
                          onChange={(e) => updateFaq(index, { question: e.target.value })}
                          placeholder="Question" 
                          className="font-bold text-lg border-none bg-transparent p-0 h-auto focus-visible:ring-0 flex-grow" 
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeFaq(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Textarea 
                        value={faq.answer || ""} 
                        onChange={(e) => updateFaq(index, { answer: e.target.value })}
                        placeholder="Answer" 
                        className="min-h-[100px]" 
                      />
                    </Card>
                  ))}
                  <Button variant="outline" className="w-full h-16 border-2 border-dashed rounded-2xl font-bold" onClick={() => setFaqs([...faqs, { question: "", answer: "" }])}>
                    <Plus className="mr-2 h-5 w-5" /> Add a question
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tight">Risks & Challenges</h2>
                  <p className="text-muted-foreground text-lg">Be transparent about potential hurdles and your plan to overcome them.</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-base font-bold">What are the risks and challenges?</Label>
                    <Textarea 
                      value={campaign.risks || ""} 
                      onChange={(e) => updateCampaign({ risks: e.target.value })}
                      placeholder="Describe the risks and challenges you might face, and how you plan to overcome them. Transparency builds trust with backers."
                      className="min-h-[200px] text-base"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 6 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-primary/5 border border-primary/20 p-6 rounded-3xl flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold">Preview Mode</h2>
                    <p className="text-sm text-muted-foreground">This is how your campaign will appear to backers.</p>
                  </div>
                  <div className="flex bg-muted p-1 rounded-xl">
                    <Button variant="ghost" size="icon-sm" className="rounded-lg"><Smartphone className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon-sm" className="rounded-lg"><Tablet className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon-sm" className="rounded-lg bg-background shadow-sm"><Monitor className="h-4 w-4" /></Button>
                  </div>
                </div>

                <div className="border rounded-[40px] overflow-hidden shadow-2xl bg-background">
                  {/* Mock Preview of Campaign Detail */}
                  <div className="aspect-video bg-muted relative">
                    {campaign.cover_image_url ? (
                      <img src={campaign.cover_image_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">No cover image</div>
                    )}
                    <Badge className="absolute top-6 left-6 bg-background/80 backdrop-blur text-foreground border-none font-bold">
                      {campaign.category || "Category"}
                    </Badge>
                  </div>
                  <div className="p-10 space-y-8">
                    <div className="space-y-4">
                      <h1 className="text-4xl font-black tracking-tight">{campaign.title || "Untitled Campaign"}</h1>
                      <p className="text-xl text-muted-foreground leading-relaxed">{campaign.tagline || "Your tagline goes here."}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="space-y-2">
                        <p className="text-3xl font-black text-primary">$0</p>
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Raised of ${campaign.funding_goal?.toLocaleString()}</p>
                        <Progress value={0} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-3xl font-black">{campaign.duration_days}</p>
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Days Left</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-3xl font-black">0</p>
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Backers</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 7 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tight">Submit for Review</h2>
                  <p className="text-muted-foreground text-lg">You're almost there! Review the checklist below before submitting.</p>
                </div>

                <div className="space-y-6">
                  <Card className="rounded-3xl border-2 overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" /> Pre-submission Checklist
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        <div className="flex items-center justify-between p-4 px-6">
                          <div className="flex items-center gap-3">
                            {campaign.title && campaign.tagline && campaign.category ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground/30" />}
                            <span className="font-medium">Basics completed</span>
                          </div>
                          {!campaign.title && <span className="text-xs text-destructive font-bold">Missing title</span>}
                        </div>
                        <div className="flex items-center justify-between p-4 px-6">
                          <div className="flex items-center gap-3">
                            {campaign.cover_image_url ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground/30" />}
                            <span className="font-medium">Cover image uploaded</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-4 px-6">
                          <div className="flex items-center gap-3">
                            {rewards.length > 0 ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground/30" />}
                            <span className="font-medium">At least one reward added</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-4 px-6">
                          <div className="flex items-center gap-3">
                            {(campaign.story_html?.length || 0) > 300 ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground/30" />}
                            <span className="font-medium">Story is detailed (300+ words)</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-4 px-6">
                          <div className="flex items-center gap-3">
                            {campaign.pitch_video_url ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <AlertTriangle className="h-5 w-5 text-amber-500" />}
                            <span className="font-medium">Pitch video added (Recommended)</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-4 pt-4">
                    <div className="flex items-start gap-3">
                      <input type="checkbox" id="tos" className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                      <label htmlFor="tos" className="text-sm leading-relaxed text-muted-foreground">
                        I confirm this campaign complies with the <Link to="/terms" className="text-primary font-bold hover:underline">Terms of Service</Link> and <Link to="/community" className="text-primary font-bold hover:underline">Community Guidelines</Link>.
                      </label>
                    </div>
                    <div className="flex items-start gap-3">
                      <input type="checkbox" id="honesty" className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                      <label htmlFor="honesty" className="text-sm leading-relaxed text-muted-foreground">
                        I commit to delivering rewards as described and communicating transparently with backers throughout the project lifecycle.
                      </label>
                    </div>
                  </div>

                  <div className="p-8 bg-muted/30 rounded-3xl border-2 border-dashed text-center space-y-4">
                    <h3 className="font-bold">What happens next?</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Our trust and safety team will review your campaign. This typically takes 1-3 business days. We'll email you once your campaign is approved or if we need more information.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Sticky Footer */}
            <div className="sticky bottom-0 left-0 right-0 py-6 bg-background/80 backdrop-blur-md border-t flex justify-between items-center z-40">
              <Button 
                variant="ghost" 
                size="lg" 
                onClick={handleBack} 
                disabled={currentStep === 0}
                className="font-bold"
              >
                <ChevronLeft className="mr-2 h-5 w-5" /> Back
              </Button>
              <Button 
                size="lg" 
                onClick={handleNext} 
                className="font-bold px-8"
                disabled={saving}
              >
                {saving ? "Submitting..." : (currentStep === STEPS.length - 1 ? "Finish" : "Continue")} <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
