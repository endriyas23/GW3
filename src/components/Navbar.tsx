import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { 
  Search, 
  PlusCircle, 
  User, 
  LogOut, 
  LayoutDashboard,
  ShieldCheck,
  Heart,
  Globe
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ModeToggle } from "@/components/mode-toggle";

export default function Navbar({ session }: { session: Session | null }) {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  useEffect(() => {
    if (session) {
      // Bootstrap admin for the user
      if (session.user.email === 'endriyaszewdu@gmail.com' || session.user.email === 'admin@example.com') {
        setIsAdmin(true);
        return;
      }

      supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single()
        .then(({ data }) => {
          if (data?.role === 'admin') setIsAdmin(true);
        });
    } else {
      setIsAdmin(false);
    }
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-sm transition-all duration-300">
      <div className="container mx-auto px-4 h-[72px] flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-primary">{t("gw3") || "GW3"}</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link to="/browse" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">{t("explore") || "Explore"}</Link>
            <Link to="/how-it-works" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">{t("how_it_works") || "How it works"}</Link>
          </div>
        </div>

        <div className="hidden md:flex flex-1 max-w-[200px] lg:max-w-md mx-4 lg:mx-8">
          <form onSubmit={handleSearch} className="relative w-full group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              type="text"
              placeholder="Search projects..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-9 bg-muted/50 border-none shadow-none hover:bg-muted focus-visible:ring-1 focus-visible:ring-primary rounded-full transition-all text-sm"
            />
          </form>
        </div>

        <div className="flex items-center gap-5">
          <Link to="/browse" className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full md:hidden transition-colors">
            <Search className="w-5 h-5" />
          </Link>
          
          {!isAdmin && (
            <Link to="/create">
              <Button variant="ghost" className="hidden md:flex items-center gap-2 font-semibold hover:bg-primary/5 hover:text-primary transition-colors">
                <PlusCircle className="w-4 h-4" />
                {t("start_campaign") || "Start a Campaign"}
              </Button>
            </Link>
          )}

          <div className="h-5 w-px bg-border/60 hidden md:block"></div>
          
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button variant="ghost" size="icon" className="rounded-full">
                <Globe className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">Toggle language</span>
              </Button>
            } />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleLanguageChange('en')}>English</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleLanguageChange('am')}>አማርኛ (Amharic)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ModeToggle />

          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 shadow-sm ring-1 ring-border/20 hover:ring-primary/20 transition-all">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={session.user.user_metadata.avatar_url} alt={session.user.email || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">{session.user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              } />
              <DropdownMenuContent className="w-56 rounded-xl shadow-[var(--shadow-premium)] border-border/60" align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{session.user.user_metadata.full_name || "User"}</p>
                      <p className="text-xs leading-none text-muted-foreground">{session.user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                {!isAdmin && (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/dashboard")} className="cursor-pointer">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>{t("dashboard") || "Creator Dashboard"}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard/backer")} className="cursor-pointer">
                      <Heart className="mr-2 h-4 w-4" />
                      <span>Backer Dashboard</span>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>{t("profile") || "Profile"}</span>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer">
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    <span>{t("admin_dashboard") || "Admin Panel"}</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t("logout") || "Log out"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" render={<Link to="/auth/login" />} nativeButton={false}>Log In</Button>
              <Button className="bg-primary hover:bg-primary/90" render={<Link to="/auth/signup" />} nativeButton={false}>Sign Up</Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
