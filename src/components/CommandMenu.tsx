import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { supabase } from "@/lib/supabase";
import { Campaign, Profile } from "@/types/database";
import { 
  Search, 
  User, 
  Layout, 
  TrendingUp, 
  PlusCircle, 
  HelpCircle,
  FileText,
  ShieldCheck,
  LayoutGrid
} from "lucide-react";
import { debounce } from "lodash";

const CATEGORIES = [
  "Technology", "Creative", "Community", "Film", "Music", "Games", "Design", "Food", "Education", "Health"
];

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [creators, setCreators] = React.useState<Profile[]>([]);
  const [loading, setLoading] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const fetchResults = React.useMemo(
    () =>
      debounce(async (query: string) => {
        if (!query || query.length < 2) {
          setCampaigns([]);
          setCreators([]);
          return;
        }

        setLoading(true);
        try {
          // Search campaigns
          const { data: campaignData } = await supabase
            .from("campaigns")
            .select("*")
            .or(`title.ilike.%${query}%,tagline.ilike.%${query}%`)
            .eq("status", "live")
            .limit(5);

          // Search creators (profiles)
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .ilike("full_name", `%${query}%`)
            .limit(5);

          setCampaigns(campaignData || []);
          setCreators(profileData || []);
        } catch (error) {
          console.error("Search error:", error);
        } finally {
          setLoading(false);
        }
      }, 300),
    []
  );

  React.useEffect(() => {
    fetchResults(search);
  }, [search, fetchResults]);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Search projects, creators, or type a command..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {search.length > 0 && (
          <>
            {campaigns.length > 0 && (
              <CommandGroup heading="Campaigns">
                {campaigns.map((campaign) => (
                  <CommandItem
                    key={campaign.id}
                    value={`campaign-${campaign.id}-${campaign.title}`}
                    onSelect={() => runCommand(() => navigate(`/campaign/${campaign.id}`))}
                  >
                    <TrendingUp className="mr-2 h-4 w-4 text-primary" />
                    <div className="flex flex-col">
                      <span className="font-medium">{campaign.title}</span>
                      <span className="text-xs text-muted-foreground line-clamp-1">{campaign.tagline}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {creators.length > 0 && (
              <CommandGroup heading="Creators">
                {creators.map((creator) => (
                  <CommandItem
                    key={creator.id}
                    value={`creator-${creator.id}-${creator.full_name}`}
                    onSelect={() => runCommand(() => navigate(`/profile/${creator.id}`))}
                  >
                    <User className="mr-2 h-4 w-4 text-primary" />
                    <span>{creator.full_name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}

        {search.length === 0 && (
          <>
            <CommandGroup heading="Quick Actions">
              <CommandItem onSelect={() => runCommand(() => navigate("/create"))}>
                <PlusCircle className="mr-2 h-4 w-4" />
                <span>Start a Campaign</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/browse"))}>
                <Search className="mr-2 h-4 w-4" />
                <span>Explore All Projects</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/dashboard"))}>
                <LayoutGrid className="mr-2 h-4 w-4" />
                <span>My Dashboard</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/profile"))}>
                <User className="mr-2 h-4 w-4" />
                <span>Account Settings</span>
              </CommandItem>
            </CommandGroup>
            
            <CommandSeparator />
            
            <CommandGroup heading="Categories">
              {CATEGORIES.map((cat) => (
                <CommandItem
                  key={cat}
                  value={cat}
                  onSelect={() => runCommand(() => navigate(`/explore/${cat.toLowerCase()}`))}
                >
                  <Layout className="mr-2 h-4 w-4" />
                  <span>{cat}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Help & Legal">
              <CommandItem onSelect={() => runCommand(() => navigate("/how-it-works"))}>
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>How It Works</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/about"))}>
                <FileText className="mr-2 h-4 w-4" />
                <span>About GW3</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/privacy"))}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                <span>Privacy Policy</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
