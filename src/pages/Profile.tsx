import { useState, useEffect, useRef } from "react";
import { Session } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";
import { User, Mail, MapPin, ShieldCheck, Upload, Loader2 } from "lucide-react";

import Breadcrumbs from "@/components/Breadcrumbs";

export default function Profile({ session }: { session: Session | null }) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState({
    full_name: "",
    bio: "",
    location: "",
    avatar_url: "",
    default_shipping_address: "",
    kyc_verified: false
  });

  useEffect(() => {
    if (session) {
      fetchProfile();
    }
  }, [session]);

  const fetchProfile = async () => {
    if (!isSupabaseConfigured) {
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session?.user.id)
      .single();
    
    if (data) {
      setProfile({
        full_name: data.full_name || "",
        bio: data.bio || "",
        location: data.location || "",
        avatar_url: data.avatar_url || "",
        default_shipping_address: data.default_shipping_address || "",
        kyc_verified: data.kyc_verified || false
      });
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${session?.user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update local state
      setProfile({ ...profile, avatar_url: publicUrl });
      
      // Update database
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", session?.user.id);
        
      if (updateError) throw updateError;

      // Update auth user metadata
      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      toast.success("Profile photo updated!");
    } catch (error: any) {
      toast.error(error.message || "Error uploading image");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          bio: profile.bio,
          location: profile.location,
          default_shipping_address: profile.default_shipping_address
        })
        .eq("id", session?.user.id);
      
      if (error) throw error;

      // Update auth user metadata so the Navbar reflects the changes immediately
      await supabase.auth.updateUser({
        data: {
          full_name: profile.full_name
        }
      });

      toast.success("Profile updated!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <Breadcrumbs />
      <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>
      
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="relative w-24 h-24 mx-auto mb-4 group">
                <Avatar className="h-24 w-24 border-4 border-muted">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback>{session.user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div 
                  className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6 text-white" />
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </div>
              <h3 className="font-bold text-lg">{profile.full_name || "User"}</h3>
              <p className="text-sm text-muted-foreground mb-4">{session.user.email}</p>
              <div className="flex flex-col gap-2">
                {profile.kyc_verified ? (
                  <Badge className="bg-green-500 hover:bg-green-600 mx-auto flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Verified Creator
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="mx-auto">Unverified</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your public profile details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input 
                    id="full_name" 
                    value={profile.full_name}
                    onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="location" 
                      className="pl-10"
                      value={profile.location}
                      onChange={(e) => setProfile({...profile, location: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea 
                  id="bio" 
                  className="min-h-[100px]"
                  value={profile.bio}
                  onChange={(e) => setProfile({...profile, bio: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipping">Default Shipping Address</Label>
                <Textarea 
                  id="shipping" 
                  className="min-h-[100px]"
                  placeholder="Enter your default shipping address for physical rewards..."
                  value={profile.default_shipping_address}
                  onChange={(e) => setProfile({...profile, default_shipping_address: e.target.value})}
                />
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button onClick={handleUpdate} disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
