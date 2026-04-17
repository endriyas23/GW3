import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search, 
  Filter, 
  TrendingUp, 
  Clock, 
  Users, 
  ChevronDown,
  LayoutGrid,
  List,
  ArrowUp,
  Heart,
  MapPin,
  DollarSign,
  Zap,
  CheckCircle2,
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Video,
  Gift,
  Globe
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link, useSearchParams, useParams, useNavigate } from "react-router-dom";
import { Campaign } from "@/types/database";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { debounce } from "lodash";
import { Session } from "@supabase/supabase-js";

const CATEGORIES = [
  "All", "Technology", "Creative", "Community", "Film", "Music", "Games", "Design", "Food", "Education", "Health"
];

const COUNTRIES = [
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
];

import EmptyState from "@/components/EmptyState";

export default function Explore({ session }: { session: Session | null }) {
  const navigate = useNavigate();
  const { category: urlCategory } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State from URL
  const query = searchParams.get("q") || "";
  const category = urlCategory 
    ? (urlCategory.charAt(0).toUpperCase() + urlCategory.slice(1)) 
    : (searchParams.get("category") || "All");
  const status = searchParams.get("status") || "all";
  const sort = searchParams.get("sort") || "trending";
  const minRaised = Number(searchParams.get("minRaised")) || 0;
  const maxRaised = Number(searchParams.get("maxRaised")) || 1000000;
  const minGoal = Number(searchParams.get("minGoal")) || 0;
  const maxGoal = Number(searchParams.get("maxGoal")) || 1000000;
  const fundingModel = searchParams.get("model") || "all";
  const percentFunded = searchParams.get("percent") || "any";
  const location = searchParams.get("location") || "any";
  const page = Number(searchParams.get("page")) || 1;

  // UI State
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [staffPicks, setStaffPicks] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [matchingCampaigns, setMatchingCampaigns] = useState<any[]>([]);
  const [matchingCreators, setMatchingCreators] = useState<any[]>([]);
  const [matchingCategories, setMatchingCategories] = useState<string[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Campaign[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<"all" | "for-you">("all");
  const [savedCampaigns, setSavedCampaigns] = useState<any[]>([]);
  
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [searchInput, setSearchInput] = useState(query);

  // SEO and Meta Updates
  useEffect(() => {
    const title = category !== "All" 
      ? `Explore ${category} Campaigns | GW3` 
      : query 
        ? `Search results for "${query}" | GW3` 
        : "Explore Campaigns | GW3";
    
    const description = `Discover the best ${category !== "All" ? category : ""} crowdfunding campaigns on GW3. Support creators and bring ideas to life.`;
    
    document.title = title;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", description);
    }
  }, [category, query]);

  const updateFilters = useCallback((updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "all" || value === "any" || (key === "category" && value === "All")) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    newParams.set("page", "1"); // Reset to page 1 on filter change
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const debouncedSearch = useCallback(
    debounce((val: string) => {
      updateFilters({ q: val || null });
    }, 300),
    [updateFilters]
  );

  const fetchSuggestions = async (val: string) => {
    if (!val.trim()) {
      setMatchingCampaigns([]);
      setMatchingCreators([]);
      setMatchingCategories([]);
      return;
    }

    try {
      // Fetch matching campaigns
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, title, cover_image_url")
        .ilike("title", `%${val}%`)
        .limit(3);
      
      setMatchingCampaigns(campaigns || []);

      // Fetch matching creators
      const { data: creators } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .ilike("full_name", `%${val}%`)
        .limit(3);
      
      setMatchingCreators(creators || []);

      // Filter matching categories
      const filteredCategories = CATEGORIES.filter(cat => 
        cat.toLowerCase().includes(val.toLowerCase()) && cat !== "All"
      ).slice(0, 3);
      
      setMatchingCategories(filteredCategories);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  };

  const debouncedSuggestions = useCallback(
    debounce((val: string) => {
      fetchSuggestions(val);
    }, 200),
    []
  );

  const addToRecentSearches = (term: string) => {
    if (!term.trim()) return;
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recent_searches", JSON.stringify(updated));
  };

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape") {
        searchInputRef.current?.blur();
        setSearchFocused(false);
      }
    };

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll);
    
    // Load recently viewed
    const saved = localStorage.getItem("recently_viewed");
    if (saved) {
      try {
        setRecentlyViewed(JSON.parse(saved).slice(0, 6));
      } catch (e) {
        console.error("Error loading recently viewed", e);
      }
    }

    // Load recent searches
    const savedSearches = localStorage.getItem("recent_searches");
    if (savedSearches) {
      try {
        setRecentSearches(JSON.parse(savedSearches));
      } catch (e) {
        console.error("Error loading recent searches", e);
      }
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && campaigns.length < totalCount && !loading) {
          updateFilters({ page: (page + 1).toString() });
        }
      },
      { threshold: 0.5 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [campaigns.length, totalCount, loading, page, updateFilters]);

  useEffect(() => {
    fetchCampaigns();
    fetchCategoryCounts();
    if (category === "All" && !query) {
      fetchStaffPicks();
    }
  }, [category, status, sort, query, minRaised, maxRaised, minGoal, maxGoal, fundingModel, percentFunded, location, page]);

  const fetchStaffPicks = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data } = await supabase
        .from("campaigns")
        .select("*")
        .eq("status", "live")
        .limit(6);
      setStaffPicks(data || []);
    } catch {
      // ignore
    }
  };

  const fetchCategoryCounts = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("category");
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach(c => {
        counts[c.category] = (counts[c.category] || 0) + 1;
      });
      setCategoryCounts(counts);
    } catch (error) {
      console.error("Error fetching category counts:", error);
    }
  };

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("saved_campaigns") || "[]");
    setSavedCampaigns(saved);
  }, []);

  const toggleSaveCampaign = (e: React.MouseEvent, campaign: any) => {
    e.preventDefault();
    e.stopPropagation();
    const isSaved = savedCampaigns.some(c => c.id === campaign.id);
    let newSaved;
    if (isSaved) {
      newSaved = savedCampaigns.filter(c => c.id !== campaign.id);
      toast.success("Removed from saved projects");
    } else {
      newSaved = [...savedCampaigns, campaign];
      toast.success("Saved to your watchlist");
    }
    setSavedCampaigns(newSaved);
    localStorage.setItem("saved_campaigns", JSON.stringify(newSaved));
  };

  const fetchCampaigns = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      toast.error("Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your secrets.");
      return;
    }

    setLoading(true);
    try {
      let supabaseQuery = supabase
        .from("campaigns")
        .select("*, creator:profiles(full_name, avatar_url), rewards(quantity_limit, quantity_claimed)", { count: "exact" });

      // Filters
      if (activeTab === "for-you" && session?.user) {
        const preferredCategories = Array.from(new Set(recentlyViewed.map(c => c.category)));
        if (preferredCategories.length > 0) {
          supabaseQuery = supabaseQuery.in("category", preferredCategories);
        }
        supabaseQuery = supabaseQuery.eq("status", "live");
      }

      if (category !== "All") {
        supabaseQuery = supabaseQuery.eq("category", category);
      }

      if (query) {
        supabaseQuery = supabaseQuery.or(`title.ilike.%${query}%,tagline.ilike.%${query}%,story_html.ilike.%${query}%`);
      }

      if (status === "live") {
        supabaseQuery = supabaseQuery.eq("status", "live");
      } else if (status === "funded") {
        supabaseQuery = supabaseQuery.eq("status", "funded");
      } else if (status === "ending") {
        const fortyEightHours = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
        supabaseQuery = supabaseQuery.eq("status", "live").lt("end_date", fortyEightHours);
      } else if (status === "new") {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        supabaseQuery = supabaseQuery.eq("status", "live").gt("created_at", sevenDaysAgo);
      }

      // Range Filters
      supabaseQuery = supabaseQuery.gte("amount_raised", minRaised).lte("amount_raised", maxRaised);
      supabaseQuery = supabaseQuery.gte("funding_goal", minGoal).lte("funding_goal", maxGoal);

      if (fundingModel !== "all") {
        const models = fundingModel.split(",");
        supabaseQuery = supabaseQuery.in("funding_model", models);
      }

      if (location !== "any") {
        supabaseQuery = supabaseQuery.eq("country", location);
      }

      // Special Filters
      if (searchParams.get("staff") === "true") {
        supabaseQuery = supabaseQuery.eq("is_staff_pick", true);
      }
      if (searchParams.get("video") === "true") {
        supabaseQuery = supabaseQuery.not("pitch_video_url", "is", null);
      }
      
      // Local filter (Campaigns from user's country)
      if (searchParams.get("local") === "true" && session?.user) {
        // We need the user's country from their profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("location")
          .eq("id", session.user.id)
          .single();
        
        if (profile?.location) {
          supabaseQuery = supabaseQuery.eq("country", profile.location);
        }
      }

      // Sorting
      if (sort === "newest") {
        supabaseQuery = supabaseQuery.order("created_at", { ascending: false });
      } else if (sort === "most_funded") {
        supabaseQuery = supabaseQuery.order("amount_raised", { ascending: false });
      } else if (sort === "ending_soon") {
        supabaseQuery = supabaseQuery.order("end_date", { ascending: true });
      } else if (sort === "most_backed") {
        supabaseQuery = supabaseQuery.order("backer_count", { ascending: false });
      } else if (sort === "nearly_there") {
        // Approximate nearly there by high amount raised
        supabaseQuery = supabaseQuery.order("amount_raised", { ascending: false });
      } else {
        // Trending default
        supabaseQuery = supabaseQuery.order("backer_count", { ascending: false });
      }

      // Pagination
      const from = (page - 1) * 12;
      const to = from + 11;
      supabaseQuery = supabaseQuery.range(from, to);

      const { data, count, error } = await supabaseQuery;
      if (error) throw error;

      let filteredData = data || [];

      // Client-side filtering for complex logic
      if (percentFunded !== "any") {
        filteredData = filteredData.filter(c => {
          const percent = (c.amount_raised / c.funding_goal) * 100;
          if (percentFunded === "starting") return percent <= 25;
          if (percentFunded === "mid") return percent > 25 && percent <= 75;
          if (percentFunded === "nearly") return percent > 75 && percent < 100;
          if (percentFunded === "funded") return percent >= 100;
          return true;
        });
      }

      if (searchParams.get("limited") === "true") {
        filteredData = filteredData.filter(c => 
          c.rewards?.some((r: any) => r.quantity_limit !== null && r.quantity_claimed < r.quantity_limit)
        );
      }

      if (page > 1) {
        setCampaigns(prev => [...prev, ...filteredData]);
      } else {
        setCampaigns(filteredData);
      }
      setTotalCount(count || 0);
    } catch (error: any) {
      console.error("Error fetching campaigns:", error);
      if (error?.message === "Failed to fetch") {
        toast.error("Failed to connect to Supabase. Check if your project is active/paused, or if your SUPABASE_URL is correct.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (cat: string) => {
    const currentCat = category.toLowerCase();
    const newCat = cat.toLowerCase();
    
    if (newCat === "all" || currentCat === newCat) {
      navigate("/explore");
    } else {
      navigate(`/explore/${newCat}`);
    }
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
    navigate("/explore");
  };

  const removeFilter = (key: string) => {
    updateFilters({ [key]: null });
  };

  const isFiltered = query || category !== "All" || status !== "all" || minRaised !== 0 || maxRaised !== 1000000 || minGoal !== 0 || maxGoal !== 1000000 || fundingModel !== "all" || percentFunded !== "any" || location !== "any" || searchParams.get("staff") === "true" || searchParams.get("video") === "true" || searchParams.get("limited") === "true" || searchParams.get("local") === "true";

  return (
    <div className="min-h-screen bg-background">
      {/* Hero / Header Section */}
      <section className="bg-muted/30 border-b pt-12 pb-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col items-center text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Explore campaigns
            </h1>
            <div className="text-muted-foreground font-medium text-lg">
              {loading ? (
                <Skeleton className="h-6 w-64 mx-auto" />
              ) : (
                `Showing ${totalCount} ${status !== "all" ? status : ""} ${category !== "All" ? category : ""} campaigns`
              )}
            </div>
          </div>

          <div className="max-w-3xl mx-auto mb-10 relative">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                ref={searchInputRef}
                placeholder="Search projects, creators, or use ⌘K..." 
                className="h-16 pl-14 pr-6 bg-background border-2 border-muted hover:border-primary/30 focus:border-primary rounded-2xl text-lg shadow-xl shadow-primary/5 transition-all"
                value={searchInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchInput(val);
                  debouncedSearch(val);
                  debouncedSuggestions(val);
                }}
                onFocus={() => {
                  setSearchFocused(true);
                  if (searchInput) fetchSuggestions(searchInput);
                }}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchInput) {
                    updateFilters({ q: searchInput });
                    addToRecentSearches(searchInput);
                    setSearchFocused(false);
                    searchInputRef.current?.blur();
                  }
                }}
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-2 px-2 py-1 bg-muted rounded-lg text-[10px] font-black text-muted-foreground border">
                ⌘ K
              </div>
            </div>

            {/* Search Suggestions Popover */}
            <AnimatePresence>
              {searchFocused && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-background border-2 rounded-2xl shadow-2xl z-50 overflow-hidden"
                >
                  <Command className="rounded-none border-none" shouldFilter={false}>
                    <CommandList className="max-h-[400px]">
                      {searchInput.trim() === "" ? (
                        <>
                          {recentSearches.length > 0 && (
                            <CommandGroup 
                              heading={
                                <div className="flex items-center justify-between w-full">
                                  <span>Recent Searches</span>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-auto p-0 text-[10px] font-bold text-primary hover:bg-transparent"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRecentSearches([]);
                                      localStorage.removeItem("recent_searches");
                                    }}
                                  >
                                    Clear
                                  </Button>
                                </div>
                              }
                            >
                              {recentSearches.map(s => (
                                <CommandItem key={s} onSelect={() => {
                                  setSearchInput(s);
                                  updateFilters({ q: s });
                                  setSearchFocused(false);
                                }}>
                                  <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                                  {s}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                          <CommandGroup heading="Trending Searches">
                            <CommandItem onSelect={() => {
                              setSearchInput("sustainable");
                              updateFilters({ q: "sustainable" });
                              addToRecentSearches("sustainable");
                              setSearchFocused(false);
                            }}>
                              <TrendingUp className="w-4 h-4 mr-2 text-primary" />
                              Sustainable Fashion
                            </CommandItem>
                            <CommandItem onSelect={() => {
                              setSearchInput("board game");
                              updateFilters({ q: "board game" });
                              addToRecentSearches("board game");
                              setSearchFocused(false);
                            }}>
                              <TrendingUp className="w-4 h-4 mr-2 text-primary" />
                              Board Games
                            </CommandItem>
                            <CommandItem onSelect={() => {
                              setSearchInput("ai");
                              updateFilters({ q: "ai" });
                              addToRecentSearches("ai");
                              setSearchFocused(false);
                            }}>
                              <TrendingUp className="w-4 h-4 mr-2 text-primary" />
                              AI Tools
                            </CommandItem>
                          </CommandGroup>
                        </>
                      ) : (
                        <>
                          {matchingCampaigns.length === 0 && matchingCreators.length === 0 && matchingCategories.length === 0 && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              No results found for "{searchInput}"
                            </div>
                          )}
                          {matchingCampaigns.length > 0 && (
                            <CommandGroup heading="Campaigns">
                              {matchingCampaigns.map(c => (
                                <CommandItem key={c.id} onSelect={() => {
                                  navigate(`/campaign/${c.id}`);
                                  addToRecentSearches(searchInput);
                                  setSearchFocused(false);
                                }}>
                                  <div className="flex items-center gap-3">
                                    <img src={c.cover_image_url || "/placeholder.svg"} className="w-10 h-10 rounded object-cover" referrerPolicy="no-referrer" />
                                    <span className="font-medium">{c.title}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                          {matchingCreators.length > 0 && (
                            <CommandGroup heading="Creators">
                              {matchingCreators.map(creator => (
                                <CommandItem key={creator.id} onSelect={() => {
                                  navigate(`/profile/${creator.id}`);
                                  addToRecentSearches(searchInput);
                                  setSearchFocused(false);
                                }}>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={creator.avatar_url} />
                                      <AvatarFallback>{creator.full_name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">{creator.full_name}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                          {matchingCategories.length > 0 && (
                            <CommandGroup heading="Categories">
                              {matchingCategories.map(cat => (
                                <CommandItem key={cat} onSelect={() => {
                                  handleCategoryClick(cat);
                                  addToRecentSearches(searchInput);
                                  setSearchFocused(false);
                                }}>
                                  {cat}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                          <CommandGroup heading="Search for">
                            <CommandItem onSelect={() => {
                              updateFilters({ q: searchInput });
                              addToRecentSearches(searchInput);
                              setSearchFocused(false);
                            }}>
                              <Search className="w-4 h-4 mr-2" />
                              "{searchInput}"
                            </CommandItem>
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-muted/50 p-1 rounded-2xl mb-6">
              <Button 
                variant={activeTab === "all" ? "default" : "ghost"} 
                className={`rounded-xl font-bold px-6 ${activeTab === "all" ? "bg-background text-foreground shadow-sm hover:bg-background" : ""}`}
                onClick={() => setActiveTab("all")}
              >
                All Campaigns
              </Button>
              <Button 
                variant={activeTab === "for-you" ? "default" : "ghost"} 
                className={`rounded-xl font-bold px-6 ${activeTab === "for-you" ? "bg-background text-foreground shadow-sm hover:bg-background" : ""}`}
                onClick={() => {
                  if (!session) {
                    toast.error("Please log in to see personalized recommendations");
                    return;
                  }
                  setActiveTab("for-you");
                }}
              >
                <Sparkles className="w-4 h-4 mr-2 text-orange-500" /> For You
              </Button>
            </div>

            <ScrollArea className="w-full whitespace-nowrap pb-4">
              <div className="flex gap-3">
                {CATEGORIES.map(cat => (
                  <Button
                    key={cat}
                    variant={category.toLowerCase() === cat.toLowerCase() ? "default" : "outline"}
                    className={`rounded-full px-6 font-bold transition-all ${
                      category.toLowerCase() === cat.toLowerCase() 
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                        : "hover:border-primary hover:text-primary"
                    }`}
                    onClick={() => handleCategoryClick(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
            
            <div className="hidden md:block shrink-0">
              <Select value={sort} onValueChange={(val) => updateFilters({ sort: val })}>
                <SelectTrigger className="w-[180px] h-11 rounded-xl font-bold border-2">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trending">Trending</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="ending_soon">Ending Soon</SelectItem>
                  <SelectItem value="most_funded">Most Funded</SelectItem>
                  <SelectItem value="most_backed">Most Backed</SelectItem>
                  <SelectItem value="nearly_there">Nearly There</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="grid lg:grid-cols-[280px_1fr] gap-12 items-start">
          {/* Sidebar Filters */}
          <aside className="hidden lg:block sticky top-24 space-y-8 max-h-[calc(100vh-120px)] overflow-y-auto pr-4 scrollbar-hide">
            <Accordion className="space-y-4">
              <AccordionItem value="category" className="border-none">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="font-black uppercase tracking-widest text-xs">Category</span>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-6">
                  <div className="space-y-1">
                    {CATEGORIES.map(cat => {
                      const isSelected = category.toLowerCase() === cat.toLowerCase();
                      return (
                        <div 
                          key={cat} 
                          className={`flex items-center space-x-3 group cursor-pointer p-2 rounded-xl transition-all ${
                            isSelected ? "bg-primary/5 text-primary" : "hover:bg-muted/50"
                          }`} 
                          onClick={() => handleCategoryClick(cat)}
                        >
                          <Checkbox 
                            id={`filter-cat-${cat}`} 
                            checked={isSelected}
                            className={isSelected ? "border-primary data-[state=checked]:bg-primary" : ""}
                          />
                          <Label 
                            htmlFor={`filter-cat-${cat}`} 
                            className={`text-sm font-bold cursor-pointer transition-colors flex justify-between w-full ${
                              isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                            }`}
                          >
                            <span>{cat}</span>
                            <span className={`font-medium text-[10px] ${isSelected ? "text-primary/70" : "text-muted-foreground/60"}`}>
                              {cat === "All" ? totalCount : (categoryCounts[cat] || 0)}
                            </span>
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="status" className="border-none">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="font-black uppercase tracking-widest text-xs">Funding Status</span>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-6">
                  <RadioGroup value={status} onValueChange={(val) => updateFilters({ status: val })} className="space-y-3">
                    {[
                      { id: "all", label: "All" },
                      { id: "live", label: "Live" },
                      { id: "funded", label: "Funded" },
                      { id: "ending", label: "Ending Soon" },
                      { id: "new", label: "Just Launched" }
                    ].map(s => (
                      <div key={s.id} className="flex items-center space-x-3">
                        <RadioGroupItem value={s.id} id={`status-${s.id}`} />
                        <Label htmlFor={`status-${s.id}`} className="text-sm font-bold cursor-pointer">{s.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="location" className="border-none">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="font-black uppercase tracking-widest text-xs">Location</span>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-6">
                  <Select value={location} onValueChange={(val) => updateFilters({ location: val })}>
                    <SelectTrigger className="w-full rounded-xl font-bold">
                      <SelectValue placeholder="Campaigns from anywhere" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Anywhere</SelectItem>
                      {COUNTRIES.map(c => (
                        <SelectItem key={c.code} value={c.code}>
                          <span className="flex items-center gap-2">
                            <span>{c.flag}</span> {c.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="raised" className="border-none">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="font-black uppercase tracking-widest text-xs">Amount Raised</span>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-6 space-y-6">
                  <Slider 
                    defaultValue={[minRaised, maxRaised]} 
                    max={1000000} 
                    step={1000}
                    onValueChange={(val) => updateFilters({ minRaised: val[0].toString(), maxRaised: val[1].toString() })}
                  />
                  <div className="flex items-center gap-3">
                    <div className="relative flex-grow">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                      <Input value={minRaised} readOnly className="pl-8 h-9 text-xs font-bold rounded-lg bg-muted/50 border-none" />
                    </div>
                    <span className="text-muted-foreground">—</span>
                    <div className="relative flex-grow">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                      <Input value={maxRaised} readOnly className="pl-8 h-9 text-xs font-bold rounded-lg bg-muted/50 border-none" />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="goal" className="border-none">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="font-black uppercase tracking-widest text-xs">Funding Goal</span>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-6 space-y-6">
                  <Slider 
                    defaultValue={[minGoal, maxGoal]} 
                    max={1000000} 
                    step={1000}
                    onValueChange={(val) => updateFilters({ minGoal: val[0].toString(), maxGoal: val[1].toString() })}
                  />
                  <div className="flex items-center gap-3">
                    <div className="relative flex-grow">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                      <Input value={minGoal} readOnly className="pl-8 h-9 text-xs font-bold rounded-lg bg-muted/50 border-none" />
                    </div>
                    <span className="text-muted-foreground">—</span>
                    <div className="relative flex-grow">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                      <Input value={maxGoal} readOnly className="pl-8 h-9 text-xs font-bold rounded-lg bg-muted/50 border-none" />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="percent" className="border-none">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="font-black uppercase tracking-widest text-xs">Percent Funded</span>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-6">
                  <RadioGroup value={percentFunded} onValueChange={(val) => updateFilters({ percent: val })} className="space-y-3">
                    {[
                      { id: "any", label: "Any" },
                      { id: "starting", label: "0% - 25%" },
                      { id: "mid", label: "25% - 75%" },
                      { id: "nearly", label: "75% - 100%" },
                      { id: "funded", label: "100%+" }
                    ].map(p => (
                      <div key={p.id} className="flex items-center space-x-3">
                        <RadioGroupItem value={p.id} id={`percent-${p.id}`} />
                        <Label htmlFor={`percent-${p.id}`} className="text-sm font-bold cursor-pointer">{p.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="model" className="border-none">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="font-black uppercase tracking-widest text-xs">Funding Model</span>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-6">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 group cursor-pointer">
                      <Checkbox 
                        id="model-fixed" 
                        checked={fundingModel.includes("fixed")} 
                        onCheckedChange={(checked) => {
                          const models = fundingModel === "all" ? [] : fundingModel.split(",");
                          const next = checked ? [...models, "fixed"] : models.filter(m => m !== "fixed");
                          updateFilters({ model: next.length > 0 ? next.join(",") : "all" });
                        }} 
                      />
                      <Label htmlFor="model-fixed" className="text-sm font-bold cursor-pointer">Fixed Funding</Label>
                    </div>
                    <div className="flex items-center space-x-3 group cursor-pointer">
                      <Checkbox 
                        id="model-flexible" 
                        checked={fundingModel.includes("flexible")} 
                        onCheckedChange={(checked) => {
                          const models = fundingModel === "all" ? [] : fundingModel.split(",");
                          const next = checked ? [...models, "flexible"] : models.filter(m => m !== "flexible");
                          updateFilters({ model: next.length > 0 ? next.join(",") : "all" });
                        }} 
                      />
                      <Label htmlFor="model-flexible" className="text-sm font-bold cursor-pointer">Flexible Funding</Label>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="pt-6 border-t space-y-4">
              <div className="flex items-center space-x-3 group cursor-pointer">
                <Checkbox id="filter-staff" checked={searchParams.get("staff") === "true"} onCheckedChange={(checked) => updateFilters({ staff: checked ? "true" : null })} />
                <Label htmlFor="filter-staff" className="text-sm font-bold cursor-pointer group-hover:text-primary transition-colors flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" /> Staff picks
                </Label>
              </div>
              <div className="flex items-center space-x-3 group cursor-pointer">
                <Checkbox id="filter-video" checked={searchParams.get("video") === "true"} onCheckedChange={(checked) => updateFilters({ video: checked ? "true" : null })} />
                <Label htmlFor="filter-video" className="text-sm font-bold cursor-pointer group-hover:text-primary transition-colors flex items-center gap-2">
                  <Video className="w-3.5 h-3.5" /> Has video
                </Label>
              </div>
              <div className="flex items-center space-x-3 group cursor-pointer">
                <Checkbox id="filter-rewards" checked={searchParams.get("limited") === "true"} onCheckedChange={(checked) => updateFilters({ limited: checked ? "true" : null })} />
                <Label htmlFor="filter-rewards" className="text-sm font-bold cursor-pointer group-hover:text-primary transition-colors flex items-center gap-2">
                  <Gift className="w-3.5 h-3.5" /> Limited rewards
                </Label>
              </div>
              {session && (
                <div className="flex items-center space-x-3 group cursor-pointer">
                  <Checkbox id="filter-country" checked={searchParams.get("local") === "true"} onCheckedChange={(checked) => updateFilters({ local: checked ? "true" : null })} />
                  <Label htmlFor="filter-country" className="text-sm font-bold cursor-pointer group-hover:text-primary transition-colors flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" /> Creator from my country
                  </Label>
                </div>
              )}
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="space-y-10" ref={resultsRef}>
            {/* Results Header Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black">{totalCount} campaigns</h2>
                  <div className="flex items-center gap-2 lg:hidden">
                    <Sheet>
                      <SheetTrigger render={<Button variant="outline" size="sm" className="rounded-xl font-bold" />}>
                        <Filter className="w-4 h-4 mr-2" /> Filters
                      </SheetTrigger>
                      <SheetContent side="bottom" className="h-[90vh] rounded-t-[2rem] p-0 overflow-hidden flex flex-col">
                        <SheetHeader className="p-6 border-b">
                          <div className="flex items-center justify-between">
                            <SheetTitle className="text-2xl font-black">Filters</SheetTitle>
                            <Button variant="ghost" size="sm" className="font-bold text-primary" onClick={clearAllFilters}>Reset</Button>
                          </div>
                        </SheetHeader>
                        <ScrollArea className="flex-grow p-6">
                          <div className="space-y-8 pb-20">
                            <div className="space-y-4">
                              <h4 className="font-black uppercase tracking-widest text-xs">Funding Status</h4>
                              <RadioGroup value={status} onValueChange={(val) => updateFilters({ status: val })} className="grid grid-cols-2 gap-3">
                                {[
                                  { id: "all", label: "All" },
                                  { id: "live", label: "Live" },
                                  { id: "funded", label: "Funded" },
                                  { id: "ending", label: "Ending Soon" }
                                ].map(s => (
                                  <div key={s.id} className="flex items-center space-x-3 p-3 rounded-xl border-2 has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-all">
                                    <RadioGroupItem value={s.id} id={`mob-status-${s.id}`} className="sr-only" />
                                    <Label htmlFor={`mob-status-${s.id}`} className="text-sm font-bold cursor-pointer w-full">{s.label}</Label>
                                  </div>
                                ))}
                              </RadioGroup>
                            </div>

                            <div className="space-y-4">
                              <h4 className="font-black uppercase tracking-widest text-xs">Amount Raised</h4>
                              <Slider 
                                defaultValue={[minRaised, maxRaised]} 
                                max={1000000} 
                                step={1000}
                                onValueChange={(val) => updateFilters({ minRaised: val[0].toString(), maxRaised: val[1].toString() })}
                              />
                            </div>

                            <div className="space-y-4">
                              <h4 className="font-black uppercase tracking-widest text-xs">Funding Goal</h4>
                              <Slider 
                                defaultValue={[minGoal, maxGoal]} 
                                max={1000000} 
                                step={1000}
                                onValueChange={(val) => updateFilters({ minGoal: val[0].toString(), maxGoal: val[1].toString() })}
                              />
                            </div>

                            <div className="space-y-4">
                              <h4 className="font-black uppercase tracking-widest text-xs">Percent Funded</h4>
                              <RadioGroup value={percentFunded} onValueChange={(val) => updateFilters({ percent: val })} className="grid grid-cols-2 gap-3">
                                {[
                                  { id: "any", label: "Any" },
                                  { id: "starting", label: "0-25%" },
                                  { id: "mid", label: "25-75%" },
                                  { id: "nearly", label: "75-100%" },
                                  { id: "funded", label: "100%+" }
                                ].map(p => (
                                  <div key={p.id} className="flex items-center space-x-3 p-3 rounded-xl border-2 has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-all">
                                    <RadioGroupItem value={p.id} id={`mob-percent-${p.id}`} className="sr-only" />
                                    <Label htmlFor={`mob-percent-${p.id}`} className="text-sm font-bold cursor-pointer w-full">{p.label}</Label>
                                  </div>
                                ))}
                              </RadioGroup>
                            </div>

                            <div className="space-y-4">
                              <h4 className="font-black uppercase tracking-widest text-xs">Location</h4>
                              <Select value={location} onValueChange={(val) => updateFilters({ location: val })}>
                                <SelectTrigger className="w-full h-14 rounded-2xl font-bold border-2">
                                  <SelectValue placeholder="Campaigns from anywhere" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="any">Anywhere</SelectItem>
                                  {COUNTRIES.map(c => (
                                    <SelectItem key={c.code} value={c.code}>
                                      <span className="flex items-center gap-2">
                                        <span>{c.flag}</span> {c.name}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-4">
                              <h4 className="font-black uppercase tracking-widest text-xs">Funding Model</h4>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center space-x-3 p-3 rounded-xl border-2 has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-all">
                                  <Checkbox 
                                    id="mob-model-fixed" 
                                    checked={fundingModel.includes("fixed")} 
                                    onCheckedChange={(checked) => {
                                      const models = fundingModel === "all" ? [] : fundingModel.split(",");
                                      const next = checked ? [...models, "fixed"] : models.filter(m => m !== "fixed");
                                      updateFilters({ model: next.length > 0 ? next.join(",") : "all" });
                                    }} 
                                    className="sr-only"
                                  />
                                  <Label htmlFor="mob-model-fixed" className="text-sm font-bold cursor-pointer w-full">Fixed</Label>
                                </div>
                                <div className="flex items-center space-x-3 p-3 rounded-xl border-2 has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-all">
                                  <Checkbox 
                                    id="mob-model-flexible" 
                                    checked={fundingModel.includes("flexible")} 
                                    onCheckedChange={(checked) => {
                                      const models = fundingModel === "all" ? [] : fundingModel.split(",");
                                      const next = checked ? [...models, "flexible"] : models.filter(m => m !== "flexible");
                                      updateFilters({ model: next.length > 0 ? next.join(",") : "all" });
                                    }} 
                                    className="sr-only"
                                  />
                                  <Label htmlFor="mob-model-flexible" className="text-sm font-bold cursor-pointer w-full">Flexible</Label>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <h4 className="font-black uppercase tracking-widest text-xs">Special</h4>
                              <div className="grid grid-cols-1 gap-3">
                                <div className="flex items-center space-x-3 p-3 rounded-xl border-2 has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-all">
                                  <Checkbox id="mob-filter-staff" checked={searchParams.get("staff") === "true"} onCheckedChange={(checked) => updateFilters({ staff: checked ? "true" : null })} className="sr-only" />
                                  <Label htmlFor="mob-filter-staff" className="text-sm font-bold cursor-pointer w-full flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-orange-500" /> Staff picks
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-3 p-3 rounded-xl border-2 has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-all">
                                  <Checkbox id="mob-filter-video" checked={searchParams.get("video") === "true"} onCheckedChange={(checked) => updateFilters({ video: checked ? "true" : null })} className="sr-only" />
                                  <Label htmlFor="mob-filter-video" className="text-sm font-bold cursor-pointer w-full flex items-center gap-2">
                                    <Video className="w-4 h-4" /> Has video
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-3 p-3 rounded-xl border-2 has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-all">
                                  <Checkbox id="mob-filter-rewards" checked={searchParams.get("limited") === "true"} onCheckedChange={(checked) => updateFilters({ limited: checked ? "true" : null })} className="sr-only" />
                                  <Label htmlFor="mob-filter-rewards" className="text-sm font-bold cursor-pointer w-full flex items-center gap-2">
                                    <Gift className="w-4 h-4" /> Limited rewards
                                  </Label>
                                </div>
                              </div>
                            </div>
                          </div>
                        </ScrollArea>
                        <div className="p-6 border-t bg-background">
                          <Button className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20" onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}))}>
                            Show {totalCount} results
                          </Button>
                        </div>
                      </SheetContent>
                    </Sheet>
                  </div>
                </div>
                
                {/* Active Filter Chips */}
                <div className="flex flex-wrap gap-2">
                  {category !== "All" && (
                    <Badge variant="secondary" className="pl-3 pr-1 py-1 rounded-full font-bold bg-primary/10 text-primary border-none flex items-center gap-1">
                      {category}
                      <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-primary/20" onClick={() => handleCategoryClick("All")}>
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  )}
                  {status !== "all" && (
                    <Badge variant="secondary" className="pl-3 pr-1 py-1 rounded-full font-bold bg-primary/10 text-primary border-none flex items-center gap-1">
                      Status: {status}
                      <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-primary/20" onClick={() => removeFilter("status")}>
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  )}
                  {percentFunded !== "any" && (
                    <Badge variant="secondary" className="pl-3 pr-1 py-1 rounded-full font-bold bg-primary/10 text-primary border-none flex items-center gap-1">
                      Funded: {percentFunded}
                      <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-primary/20" onClick={() => removeFilter("percent")}>
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  )}
                  {(minGoal > 0 || maxGoal < 1000000) && (
                    <Badge variant="secondary" className="pl-3 pr-1 py-1 rounded-full font-bold bg-primary/10 text-primary border-none flex items-center gap-1">
                      Goal: ${minGoal} - ${maxGoal}
                      <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-primary/20" onClick={() => {
                        updateFilters({ minGoal: "0", maxGoal: "1000000" });
                      }}>
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  )}
                  {query && (
                    <Badge variant="secondary" className="pl-3 pr-1 py-1 rounded-full font-bold bg-primary/10 text-primary border-none flex items-center gap-1">
                      Search: {query}
                      <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-primary/20" onClick={() => removeFilter("q")}>
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  )}
                  {searchParams.get("staff") === "true" && (
                    <Badge variant="secondary" className="pl-3 pr-1 py-1 rounded-full font-bold bg-primary/10 text-primary border-none flex items-center gap-1">
                      Staff Pick
                      <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-primary/20" onClick={() => removeFilter("staff")}>
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  )}
                  {searchParams.get("video") === "true" && (
                    <Badge variant="secondary" className="pl-3 pr-1 py-1 rounded-full font-bold bg-primary/10 text-primary border-none flex items-center gap-1">
                      Has Video
                      <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-primary/20" onClick={() => removeFilter("video")}>
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  )}
                  {searchParams.get("limited") === "true" && (
                    <Badge variant="secondary" className="pl-3 pr-1 py-1 rounded-full font-bold bg-primary/10 text-primary border-none flex items-center gap-1">
                      Limited Rewards
                      <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-primary/20" onClick={() => removeFilter("limited")}>
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  )}
                  {searchParams.get("local") === "true" && (
                    <Badge variant="secondary" className="pl-3 pr-1 py-1 rounded-full font-bold bg-primary/10 text-primary border-none flex items-center gap-1">
                      Local
                      <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-primary/20" onClick={() => removeFilter("local")}>
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  )}
                  {fundingModel !== "all" && (
                    <Badge variant="secondary" className="pl-3 pr-1 py-1 rounded-full font-bold bg-primary/10 text-primary border-none flex items-center gap-1">
                      Model: {fundingModel}
                      <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-primary/20" onClick={() => removeFilter("model")}>
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  )}
                  {isFiltered && (
                    <Button variant="link" size="sm" className="font-bold text-primary h-auto p-0 ml-2" onClick={clearAllFilters}>
                      Clear all filters
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex bg-muted/50 p-1 rounded-xl">
                  <Button 
                    variant={viewMode === "grid" ? "outline" : "ghost"} 
                    size="icon" 
                    className={`h-9 w-9 rounded-lg ${viewMode === "grid" ? "shadow-sm" : ""}`}
                    onClick={() => setViewMode("grid")}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant={viewMode === "list" ? "outline" : "ghost"} 
                    size="icon" 
                    className={`h-9 w-9 rounded-lg ${viewMode === "list" ? "shadow-sm" : ""}`}
                    onClick={() => setViewMode("list")}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
                    <div className="md:hidden">
                      <Select value={sort} onValueChange={(val) => updateFilters({ sort: val })}>
                        <SelectTrigger className="w-[140px] h-11 rounded-xl font-bold border-2">
                          <SelectValue placeholder="Sort" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trending">Trending</SelectItem>
                          <SelectItem value="newest">Newest</SelectItem>
                          <SelectItem value="ending_soon">Ending Soon</SelectItem>
                          <SelectItem value="most_funded">Most Funded</SelectItem>
                          <SelectItem value="most_backed">Most Backed</SelectItem>
                          <SelectItem value="nearly_there">Nearly There</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
              </div>
            </div>

            {/* Staff Picks Strip (Only on unfiltered view) */}
            {!isFiltered && staffPicks.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-orange-500" /> Staff picks this week
                  </h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <ScrollArea className="w-full whitespace-nowrap pb-4">
                  <div className="flex gap-6">
                    {staffPicks.map(campaign => (
                      <Link key={campaign.id} to={`/campaigns/${campaign.id}`} className="w-[320px] shrink-0 group">
                        <Card className="overflow-hidden rounded-3xl border-2 hover:border-primary transition-all group">
                          <div className="aspect-video relative overflow-hidden">
                            <img 
                              src={campaign.cover_image_url || `https://picsum.photos/seed/${campaign.id}/800/450`} 
                              alt={campaign.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                            <Badge className="absolute top-3 left-3 bg-white/90 backdrop-blur text-slate-950 border-none font-bold text-[10px] uppercase tracking-widest">
                              {campaign.category}
                            </Badge>
                          </div>
                          <CardHeader className="p-4">
                            <CardTitle className="text-lg font-bold line-clamp-1">{campaign.title}</CardTitle>
                          </CardHeader>
                        </Card>
                      </Link>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}

            {/* Recently Viewed Strip */}
            {recentlyViewed.length > 0 && (
              <div className="space-y-6 pt-8 border-t">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" /> Recently viewed
                  </h3>
                  <Button variant="ghost" size="sm" className="font-bold text-muted-foreground" onClick={() => {
                    localStorage.removeItem("recently_viewed");
                    setRecentlyViewed([]);
                  }}>Clear</Button>
                </div>
                <ScrollArea className="w-full whitespace-nowrap pb-4">
                  <div className="flex gap-6">
                    {recentlyViewed.map(campaign => (
                      <Link key={campaign.id} to={`/campaigns/${campaign.id}`} className="w-[280px] shrink-0 group">
                        <div className="flex gap-4 items-center p-3 rounded-2xl border-2 hover:border-primary transition-all bg-muted/20">
                          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                            <img 
                              src={campaign.cover_image_url || `https://picsum.photos/seed/${campaign.id}/100/100`} 
                              alt={campaign.title}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold line-clamp-1">{campaign.title}</h4>
                            <p className="text-xs text-muted-foreground font-medium">{campaign.category}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}

            {/* Main Grid */}
            {loading && campaigns.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="space-y-4">
                    <Skeleton className="aspect-video rounded-3xl" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
              </div>
            ) : campaigns.length > 0 ? (
              <div className="space-y-12">
                <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8" : "space-y-6"}>
                  {campaigns.map((campaign, index) => (
                    <div key={campaign.id}>
                      <div className="relative group">
                        <Link to={`/campaigns/${campaign.id}`} className="absolute inset-0 z-10" />
                        <Card className={`overflow-hidden rounded-3xl border-2 hover:border-primary transition-all shadow-sm hover:shadow-xl hover:-translate-y-1 duration-300 ${viewMode === "list" ? "flex flex-col md:flex-row h-auto md:h-64" : "h-full flex flex-col"}`}>
                          <div className={`relative overflow-hidden shrink-0 ${viewMode === "list" ? "w-full md:w-80 h-48 md:h-full" : "aspect-video"}`}>
                            <img 
                              src={campaign.cover_image_url || `https://picsum.photos/seed/${campaign.id}/800/450`} 
                              alt={campaign.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-4 left-4 flex flex-col gap-2">
                              <Badge className="bg-white/90 backdrop-blur text-slate-950 border-none font-black text-[10px] uppercase tracking-widest px-3 py-1">
                                {campaign.category}
                              </Badge>
                            </div>
                            <div className="absolute top-4 right-4">
                              <Badge className={`font-black text-[10px] uppercase tracking-widest px-3 py-1 border-none ${
                                campaign.status === "live" ? "bg-primary text-primary-foreground" : "bg-orange-500 text-white"
                              }`}>
                                {campaign.status}
                              </Badge>
                            </div>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="absolute bottom-4 right-4 h-10 w-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-20"
                              onClick={(e) => toggleSaveCampaign(e, campaign)}
                            >
                              <Heart className={`w-5 h-5 ${savedCampaigns.some((c: any) => c.id === campaign.id) ? "fill-primary text-primary" : "text-primary"}`} />
                            </Button>
                          </div>
                          
                          <div className="flex flex-col flex-grow p-6">
                            <div className="flex-grow space-y-3">
                              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-1">
                                <div className="w-5 h-5 rounded-full bg-muted overflow-hidden">
                                  <img src={(campaign as any).creator?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${campaign.creator_id}`} alt="Creator" />
                                </div>
                                <span>by {(campaign as any).creator?.full_name || "Creator Name"}</span>
                              </div>
                              <h3 className="text-xl font-black line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                {campaign.title}
                              </h3>
                              <p className="text-sm text-muted-foreground line-clamp-2 font-medium">
                                {campaign.tagline}
                              </p>
                            </div>

                            <div className="mt-6 space-y-4">
                              <div className="space-y-2">
                                <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                                  <span className="text-primary">${campaign.amount_raised.toLocaleString()} raised</span>
                                  <span>{Math.round(campaign.funding_goal > 0 ? (campaign.amount_raised / campaign.funding_goal) * 100 : 0)}%</span>
                                </div>
                                <Progress value={campaign.funding_goal > 0 ? (campaign.amount_raised / campaign.funding_goal) * 100 : 0} className="h-2 bg-muted" />
                              </div>
                              
                              <div className="flex justify-between items-center text-xs font-bold text-muted-foreground pt-2">
                                <div className="flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5" />
                                  <span>{campaign.backer_count} backers</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>
                                    {Math.max(0, Math.ceil((new Date(campaign.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days left
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </div>

                      {/* Inline Content Breaks */}
                      {(index + 1) % 12 === 0 && (
                        <div className="col-span-full py-12">
                          <div className="bg-gradient-to-r from-primary/10 to-orange-500/10 rounded-[2.5rem] p-12 flex flex-col md:flex-row items-center justify-between gap-8 border-2 border-primary/5">
                            <div className="space-y-4 text-center md:text-left">
                              <Badge className="bg-primary text-primary-foreground font-black uppercase tracking-widest px-4 py-1">Did you know?</Badge>
                              <h3 className="text-3xl font-black tracking-tight">Campaigns with videos raise 4x more</h3>
                              <p className="text-muted-foreground font-medium text-lg max-w-md">Ready to bring your creative vision to life? Start your journey today.</p>
                            </div>
                            <Button size="lg" className="h-16 px-10 rounded-2xl font-black text-lg shadow-xl shadow-primary/20" render={<Link to="/create" />} nativeButton={false}>
                              Start a Campaign
                            </Button>
                          </div>
                        </div>
                      )}

                      {(index + 1) % 24 === 0 && (
                        <div className="col-span-full py-12">
                          <div className="bg-slate-900 text-white rounded-[2.5rem] p-12 flex flex-col md:flex-row items-center justify-between gap-8 border-2 border-white/5">
                            <div className="space-y-4 text-center md:text-left">
                              <h3 className="text-3xl font-black tracking-tight">Get the best campaigns in your inbox weekly</h3>
                              <p className="text-slate-400 font-medium text-lg max-w-md">Join 50,000+ backers who get our curated newsletter.</p>
                            </div>
                            <div className="flex w-full max-w-md gap-2">
                              <Input placeholder="Enter your email" className="h-14 bg-white/10 border-white/10 text-white rounded-xl" />
                              <Button className="h-14 px-8 rounded-xl font-bold">Subscribe</Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {(index + 1) % 18 === 0 && category !== "All" && (
                        <div className="col-span-full py-12">
                          <div className="flex items-center justify-between mb-8">
                            <h3 className="text-2xl font-black">Also trending in {category}</h3>
                            <Button variant="ghost" className="font-bold text-primary">View more <ChevronRight className="ml-2 w-4 h-4" /></Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* We'd normally fetch more here, but for now we'll just show a placeholder or skip */}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination / Load More */}
                <div className="flex flex-col items-center gap-6 pt-12" ref={loadMoreRef}>
                  <p className="text-sm font-bold text-muted-foreground">
                    Showing {campaigns.length} of {totalCount} campaigns
                  </p>
                  {campaigns.length < totalCount && (
                    <Button 
                      variant="outline" 
                      size="lg" 
                      className="rounded-2xl font-black px-12 h-14 border-2 hover:bg-primary hover:text-primary-foreground transition-all"
                      onClick={() => updateFilters({ page: (page + 1).toString() })}
                      disabled={loading}
                    >
                      {loading ? "Loading..." : "Load More Campaigns"}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <EmptyState 
                icon={Search}
                title="No campaigns match your filters"
                description="Try removing some filters or browse trending campaigns to find something interesting."
                actionLabel="Clear all filters"
                onAction={clearAllFilters}
              />
            )}
          </div>
        </div>
      </div>

      {/* Return to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-primary-foreground rounded-2xl shadow-2xl shadow-primary/30 flex items-center justify-center z-50 hover:scale-110 transition-transform"
          >
            <ArrowUp className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
