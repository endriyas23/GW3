import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Campaign, Profile } from "@/types/database";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MapPin, 
  Calendar, 
  Heart, 
  LayoutDashboard, 
  ExternalLink,
  Globe,
  Twitter,
  Github
} from "lucide-react";
import { format } from "date-fns";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function PublicProfile() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [createdCampaigns, setCreatedCampaigns] = useState<Campaign[]>([]);
  const [supportedCount, setSupportedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchProfileData();
    }
  }, [id]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch created campaigns
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("*")
        .eq("creator_id", id)
        .order("created_at", { ascending: false });
      
      setCreatedCampaigns(campaigns || []);

      // Fetch supported count
      const { count } = await supabase
        .from("pledges")
        .select("*", { count: 'exact', head: true })
        .eq("backer_id", id);
      
      setSupportedCount(count || 0);

    } catch (error) {
      console.error("Error fetching public profile:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-5xl space-y-12">
        <div className="flex flex-col items-center text-center space-y-4">
          <Skeleton className="w-32 h-32 rounded-full" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl font-black mb-4">Profile Not Found</h1>
        <p className="text-muted-foreground mb-8">The user you're looking for doesn't exist or has a private profile.</p>
        <Button className="rounded-xl font-bold h-12 px-8" nativeButton={false} render={<Link to="/explore" />}>
          Explore Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-24">
      {/* Header / Hero */}
      <div className="bg-white border-b pt-16 pb-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex flex-col items-center text-center">
            <Avatar className="w-32 h-32 border-4 border-white shadow-2xl mb-6">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="text-4xl font-black bg-primary text-white">
                {profile.full_name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <h1 className="text-4xl font-black tracking-tight mb-2">{profile.full_name}</h1>
            
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-bold text-muted-foreground mb-6">
              {profile.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" />
                  {profile.location}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary" />
                Joined {format(new Date(profile.created_at), "MMMM yyyy")}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="rounded-full px-4 py-1.5 font-bold bg-primary/5 text-primary border-none">
                {createdCampaigns.length} Projects Created
              </Badge>
              <Badge variant="secondary" className="rounded-full px-4 py-1.5 font-bold bg-blue-500/5 text-blue-500 border-none">
                {supportedCount} Projects Supported
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-5xl mt-12 space-y-12">
        <div className="grid md:grid-cols-3 gap-12">
          {/* Sidebar / Bio */}
          <div className="md:col-span-1 space-y-8">
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">About the Creator</h3>
              <p className="text-sm font-medium leading-relaxed text-slate-600">
                {profile.bio || "This user hasn't added a bio yet."}
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Connect</h3>
              <div className="flex gap-3">
                <Button variant="outline" size="icon" className="rounded-xl h-10 w-10">
                  <Globe className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-xl h-10 w-10">
                  <Twitter className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-xl h-10 w-10">
                  <Github className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content / Projects */}
          <div className="md:col-span-2 space-y-12">
            <div className="space-y-6">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                <LayoutDashboard className="w-6 h-6 text-primary" />
                Created Projects
              </h2>

              {createdCampaigns.length > 0 ? (
                <div className="grid gap-6">
                  {createdCampaigns.map(campaign => (
                    <Card key={campaign.id} className="rounded-3xl border-none shadow-sm overflow-hidden group hover:shadow-md transition-all">
                      <div className="flex flex-col sm:flex-row">
                        <div className="w-full sm:w-48 h-32 sm:h-auto bg-muted shrink-0 overflow-hidden">
                          <img src={campaign.cover_image_url} alt={campaign.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <div className="p-6 flex flex-col justify-between">
                          <div>
                            <h4 className="font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                              <Link to={`/campaigns/${campaign.id}`}>{campaign.title}</Link>
                            </h4>
                            <p className="text-xs font-medium text-muted-foreground mt-1 line-clamp-1">{campaign.tagline}</p>
                          </div>
                          <div className="flex items-center justify-between mt-4">
                            <span className="text-xs font-black text-primary uppercase tracking-widest">
                              {Math.round((campaign.amount_raised / campaign.funding_goal) * 100)}% Funded
                            </span>
                            <Button variant="ghost" size="sm" className="h-8 rounded-xl font-bold text-xs" nativeButton={false} render={
                              <Link to={`/campaigns/${campaign.id}`}>
                                View Project <ExternalLink className="ml-1.5 w-3 h-3" />
                              </Link>
                            } />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-muted">
                  <p className="text-sm font-bold text-muted-foreground">No projects created yet.</p>
                </div>
              )}
            </div>

            {supportedCount > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                  <Heart className="w-6 h-6 text-primary" />
                  Supported Projects
                </h2>
                <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-muted">
                  <p className="text-sm font-bold text-muted-foreground">
                    This user has supported {supportedCount} projects on GW3!
                  </p>
                  <p className="text-xs font-medium text-muted-foreground mt-2">
                    Supported projects are private by default.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
