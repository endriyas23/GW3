import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { 
  ArrowRight, 
  TrendingUp, 
  Users, 
  Shield, 
  Zap, 
  Search, 
  Cpu, 
  Palette, 
  Globe, 
  Film, 
  Music, 
  Gamepad2, 
  PenTool, 
  Utensils, 
  GraduationCap, 
  HeartPulse,
  ChevronLeft,
  ChevronRight,
  Heart,
  PartyPopper
} from "lucide-react";
import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Campaign } from "@/types/database";
import { toast } from "sonner";

const CATEGORIES = [
  { name: "Technology", icon: <Cpu className="w-6 h-6" /> },
  { name: "Creative", icon: <Palette className="w-6 h-6" /> },
  { name: "Community", icon: <Globe className="w-6 h-6" /> },
  { name: "Film", icon: <Film className="w-6 h-6" /> },
  { name: "Music", icon: <Music className="w-6 h-6" /> },
  { name: "Games", icon: <Gamepad2 className="w-6 h-6" /> },
  { name: "Design", icon: <PenTool className="w-6 h-6" /> },
  { name: "Food", icon: <Utensils className="w-6 h-6" /> },
  { name: "Education", icon: <GraduationCap className="w-6 h-6" /> },
  { name: "Health", icon: <HeartPulse className="w-6 h-6" /> },
];

export default function Home() {
  const [featuredCampaigns, setFeaturedCampaigns] = useState<Campaign[]>([]);
  const [trendingCampaigns, setTrendingCampaigns] = useState<Campaign[]>([]);
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!isSupabaseConfigured) {
        setLoading(false);
        toast.error("Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your secrets.");
        return;
      }

      setLoading(true);
      try {
        const { data: featured, error: featuredError } = await supabase
          .from("campaigns")
          .select("*")
          .eq("status", "live")
          .limit(4);
        
        if (featuredError) throw featuredError;
        
        const { data: trending, error: trendingError } = await supabase
          .from("campaigns")
          .select("*")
          .eq("status", "live")
          .order("backer_count", { ascending: false })
          .limit(6);

        if (trendingError) throw trendingError;

        const { data: recent, error: recentError } = await supabase
          .from("campaigns")
          .select("*")
          .eq("status", "live")
          .order("created_at", { ascending: false })
          .limit(6);

        if (recentError) throw recentError;

        setFeaturedCampaigns(featured || []);
        setTrendingCampaigns(trending || []);
        setRecentCampaigns(recent || []);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        if (error.message === "Failed to fetch") {
          toast.error("Failed to connect to Supabase. Check if your project is active/paused, or if your SUPABASE_URL is correct.");
        } else {
          toast.error("Failed to fetch campaigns: " + (error.message || "Unknown error"));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[650px] flex items-center overflow-hidden bg-zinc-950">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&q=80&w=2000" 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-30 mix-blend-overlay"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10 pt-16">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl"
          >
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.05]">
              Bring your <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-400">creative ideas</span> to life.
            </h1>
            <p className="text-xl text-zinc-300 mb-10 leading-relaxed max-w-xl font-medium">
              Join a global community of creators and backers. Fund the next generation of technology, design, and social impact.
            </p>
            
            <div className="relative max-w-xl mb-10 group shadow-2xl shadow-primary/10 rounded-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-400 group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Search for projects, creators, or categories..." 
                className="h-16 pl-14 pr-36 text-lg bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:bg-white focus:text-zinc-950 transition-all duration-300 rounded-2xl ring-offset-zinc-950"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    window.location.href = `/explore?q=${encodeURIComponent(searchQuery.trim())}`;
                  }
                }}
              />
              <Button 
                className="absolute right-2 top-2 bottom-2 px-8 rounded-xl font-bold transition-all hover:scale-[0.98]"
                onClick={() => {
                  if (searchQuery.trim()) {
                    window.location.href = `/explore?q=${encodeURIComponent(searchQuery.trim())}`;
                  }
                }}
              >
                Search
              </Button>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="h-14 px-8 text-base font-semibold shadow-[0_0_40px_rgba(79,70,229,0.3)] hover:shadow-[0_0_60px_rgba(79,70,229,0.5)] transition-all duration-300" render={<Link to="/explore" />} nativeButton={false}>
                Explore Campaigns
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-base font-semibold text-white border-white/20 hover:bg-white/10 hover:border-white/40 backdrop-blur-md transition-all duration-300" render={<Link to="/how-it-works" />} nativeButton={false}>
                How It Works
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Campaigns Carousel */}
      <section className="py-32 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight mb-2">Featured Campaigns</h2>
              <p className="text-muted-foreground font-medium text-lg">Hand-picked projects we love.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" className="rounded-full h-10 w-10">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="icon" className="rounded-full h-10 w-10">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="h-[400px] bg-muted animate-pulse rounded-2xl" />
              ))
            ) : (
              featuredCampaigns.map(campaign => (
                <Link key={campaign.id} to={`/campaigns/${campaign.id}`} className="group outline-none">
                  <Card className="h-full hover:-translate-y-1.5 transition-transform duration-300 ease-out">
                    <div className="relative h-52 overflow-hidden bg-muted">
                      <img 
                        src={campaign.cover_image_url || `https://picsum.photos/seed/${campaign.id}/800/600`} 
                        alt={campaign.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                        referrerPolicy="no-referrer"
                      />
                      <Badge className="absolute top-3 right-3 bg-white/95 text-foreground border-none font-bold shadow-sm backdrop-blur-md">
                        {campaign.category}
                      </Badge>
                    </div>
                    <CardHeader className="p-6 pb-2">
                      <h3 className="text-lg font-bold line-clamp-1 group-hover:text-primary transition-colors">{campaign.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {campaign.tagline}
                      </p>
                    </CardHeader>
                    <CardContent className="p-6 pt-2 mt-auto">
                      <div className="space-y-4">
                        <Progress value={campaign.funding_goal > 0 ? (campaign.amount_raised / campaign.funding_goal) * 100 : 0} className="h-2 rounded-full" />
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-base">${campaign.amount_raised.toLocaleString()}</span>
                            <span className="text-muted-foreground text-xs font-medium">raised</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="font-extrabold text-base text-primary">{Math.round(campaign.funding_goal > 0 ? (campaign.amount_raised / campaign.funding_goal) * 100 : 0)}%</span>
                            <span className="text-muted-foreground text-xs font-medium">funded</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Category Tiles */}
      <section className="py-24 bg-secondary/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight mb-4">Explore by Category</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto font-medium text-lg">
              Find projects that match your interests, from high-tech gadgets to community-driven social impact.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {CATEGORIES.map((cat, i) => (
              <Link 
                key={i} 
                to={`/explore/${cat.name.toLowerCase()}`}
                className="flex flex-col items-center justify-center p-8 bg-card rounded-2xl border border-border/50 hover:border-primary/50 shadow-sm hover:shadow-[var(--shadow-premium-hover)] hover:-translate-y-1 transition-all duration-300 group outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <div className="w-14 h-14 bg-primary/5 text-primary rounded-2xl flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                  {cat.icon}
                </div>
                <span className="font-bold text-sm tracking-wide">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Now Grid */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-2">Trending Now</h2>
              <p className="text-muted-foreground">Projects gaining momentum right now.</p>
            </div>
            <Button variant="ghost" className="font-bold text-primary hover:text-primary hover:bg-primary/5" render={<Link to="/explore" />} nativeButton={false}>
              View All <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              [1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-[450px] bg-muted animate-pulse rounded-2xl" />
              ))
            ) : (
              trendingCampaigns.map(campaign => (
                <Link key={campaign.id} to={`/campaigns/${campaign.id}`} className="group">
                  <Card className="h-full overflow-hidden border-none shadow-sm hover:shadow-xl transition-all duration-300">
                    <div className="relative h-56 overflow-hidden">
                      <img 
                        src={campaign.cover_image_url || `https://picsum.photos/seed/${campaign.id}/800/600`} 
                        alt={campaign.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <Badge className="absolute top-4 left-4 bg-primary text-white border-none font-bold">
                        Trending
                      </Badge>
                    </div>
                    <CardHeader className="p-6 pb-2">
                      <h3 className="text-xl font-bold line-clamp-1 group-hover:text-primary transition-colors">{campaign.title}</h3>
                      <p className="text-muted-foreground line-clamp-2 min-h-[3rem]">
                        {campaign.tagline}
                      </p>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm font-bold">
                            <span>${campaign.amount_raised.toLocaleString()}</span>
                            <span className="text-primary">{Math.round(campaign.funding_goal > 0 ? (campaign.amount_raised / campaign.funding_goal) * 100 : 0)}%</span>
                          </div>
                          <Progress value={campaign.funding_goal > 0 ? (campaign.amount_raised / campaign.funding_goal) * 100 : 0} className="h-2" />
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span className="font-medium">{campaign.backer_count} backers</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            <span className="font-medium">Hot</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Recently Added Grid */}
      <section className="py-24 bg-muted/10">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-2">Recently Added</h2>
              <p className="text-muted-foreground">Fresh projects looking for their first backers.</p>
            </div>
            <Button variant="ghost" className="font-bold text-primary hover:text-primary hover:bg-primary/5" render={<Link to="/explore?sort=newest" />} nativeButton={false}>
              View All <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              [1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-[450px] bg-muted animate-pulse rounded-2xl" />
              ))
            ) : (
              recentCampaigns.map(campaign => (
                <Link key={campaign.id} to={`/campaigns/${campaign.id}`} className="group">
                  <Card className="h-full overflow-hidden border-none shadow-sm hover:shadow-xl transition-all duration-300">
                    <div className="relative h-56 overflow-hidden">
                      <img 
                        src={campaign.cover_image_url || `https://picsum.photos/seed/${campaign.id}/800/600`} 
                        alt={campaign.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <Badge className="absolute top-4 left-4 bg-secondary text-secondary-foreground border-none font-bold">
                        New
                      </Badge>
                    </div>
                    <CardHeader className="p-6 pb-2">
                      <h3 className="text-xl font-bold line-clamp-1 group-hover:text-primary transition-colors">{campaign.title}</h3>
                      <p className="text-muted-foreground line-clamp-2 min-h-[3rem]">
                        {campaign.tagline}
                      </p>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm font-bold">
                            <span>${campaign.amount_raised.toLocaleString()}</span>
                            <span className="text-primary">{Math.round(campaign.funding_goal > 0 ? (campaign.amount_raised / campaign.funding_goal) * 100 : 0)}%</span>
                          </div>
                          <Progress value={campaign.funding_goal > 0 ? (campaign.amount_raised / campaign.funding_goal) * 100 : 0} className="h-2" />
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span className="font-medium">{campaign.backer_count} backers</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Zap className="w-4 h-4 text-secondary" />
                            <span className="font-medium">Just Launched</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-slate-950 text-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary rounded-full blur-[120px]" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl font-bold mb-6">How GW3 Works</h2>
            <p className="text-slate-400 text-lg">
              From a spark of an idea to a finished product, we're with you every step of the way.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connector Line (Desktop) */}
            <div className="hidden md:block absolute top-24 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20 z-0" />
            
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-primary/40 rotate-3">
                <Search className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">1. Discover</h3>
              <p className="text-slate-400 leading-relaxed">
                Browse thousands of campaigns across technology, design, and more. Find projects that inspire you.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="w-20 h-20 bg-orange-500 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-orange-500/40 -rotate-3">
                <Heart className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">2. Back</h3>
              <p className="text-slate-400 leading-relaxed">
                Support creators by pledging money in exchange for unique rewards. Your contribution helps bring ideas to life.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="w-20 h-20 bg-green-500 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-green-500/40 rotate-3">
                <PartyPopper className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">3. Celebrate</h3>
              <p className="text-slate-400 leading-relaxed">
                Follow the journey as the project comes to life. Receive your rewards and be part of the success story.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">Ready to start your journey?</h2>
          <p className="text-xl opacity-90 mb-12 max-w-2xl mx-auto leading-relaxed">
            Whether you're a creator with a big idea or a backer looking for the next innovation, there's a place for you here.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <Button size="lg" variant="secondary" className="h-16 px-12 text-xl font-bold shadow-xl" render={<Link to="/create" />} nativeButton={false}>
              Start a Campaign
            </Button>
            <Button size="lg" variant="outline" className="h-16 px-12 text-xl font-bold border-white/30 hover:bg-white/10" render={<Link to="/explore" />} nativeButton={false}>
              Explore Projects
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
