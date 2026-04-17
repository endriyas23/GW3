-- Categories table
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  kyc_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Campaigns table
CREATE TABLE campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  tagline TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  category TEXT NOT NULL, -- Keep for legacy/easy access, but category_id is preferred
  country TEXT NOT NULL,
  cover_image_url TEXT,
  pitch_video_url TEXT,
  story_html TEXT,
  funding_goal NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD' NOT NULL,
  funding_model TEXT CHECK (funding_model IN ('fixed', 'flexible')) NOT NULL,
  duration_days INTEGER NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'live', 'funded', 'failed', 'rejected')) NOT NULL,
  amount_raised NUMERIC DEFAULT 0 NOT NULL,
  backer_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Rewards table
CREATE TABLE rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL,
  image_url TEXT,
  estimated_delivery TEXT NOT NULL,
  quantity_limit INTEGER,
  quantity_claimed INTEGER DEFAULT 0 NOT NULL,
  shipping_regions TEXT[] DEFAULT '{}'
);

-- Campaign Team Members Table
CREATE TABLE campaign_team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  twitter_url TEXT,
  linkedin_url TEXT,
  website_url TEXT,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Campaign FAQs Table
CREATE TABLE campaign_faqs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Stretch Goals Table
CREATE TABLE stretch_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  target_amount NUMERIC NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  is_unlocked BOOLEAN DEFAULT false NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Pledges table
CREATE TABLE pledges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  backer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reward_id UUID REFERENCES rewards(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'captured', 'refunded', 'failed')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Updates table
CREATE TABLE updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Comments table
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  is_hidden BOOLEAN DEFAULT FALSE
);

-- Reports table
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_type TEXT CHECK (target_type IN ('campaign', 'comment', 'user')) NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- INDEXES
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_category ON campaigns(category);
CREATE INDEX idx_campaigns_end_date ON campaigns(end_date);
CREATE INDEX idx_campaigns_creator_id ON campaigns(creator_id);
CREATE INDEX idx_rewards_campaign_id ON rewards(campaign_id);
CREATE INDEX idx_pledges_campaign_id ON pledges(campaign_id);
CREATE INDEX idx_pledges_backer_id ON pledges(backer_id);
CREATE INDEX idx_updates_campaign_id ON updates(campaign_id);
CREATE INDEX idx_comments_campaign_id ON comments(campaign_id);
CREATE INDEX idx_reports_status ON reports(status);

-- RLS POLICIES

-- Profiles: users can read any profile, but only update their own
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Campaigns: anyone can read campaigns where status = 'live' or 'funded'; creators can read/update their own drafts; admins can read all
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public campaigns are viewable by everyone" ON campaigns FOR SELECT USING (
  status IN ('live', 'funded') OR 
  auth.uid() = creator_id OR 
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "Creators can insert own campaigns" ON campaigns FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update own campaigns" ON campaigns FOR UPDATE USING (
  auth.uid() = creator_id OR 
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Rewards: readable if parent campaign is readable; writable only by the campaign creator while status is draft or pending
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rewards are viewable by everyone" ON rewards FOR SELECT USING (
  EXISTS (SELECT 1 FROM campaigns WHERE id = rewards.campaign_id AND (status IN ('live', 'funded') OR creator_id = auth.uid() OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'))
);
CREATE POLICY "Creators can manage rewards" ON rewards FOR ALL USING (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE id = rewards.campaign_id 
    AND creator_id = auth.uid() 
    AND status IN ('draft', 'pending')
  )
);

-- Pledges: backers can read their own pledges; creators can read pledges to their own campaigns; no one can update pledges except via service role
ALTER TABLE pledges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see own pledges" ON pledges FOR SELECT USING (auth.uid() = backer_id);
CREATE POLICY "Creators can see pledges for their campaigns" ON pledges FOR SELECT USING (
  EXISTS (SELECT 1 FROM campaigns WHERE id = pledges.campaign_id AND creator_id = auth.uid())
);
CREATE POLICY "System can insert pledges" ON pledges FOR INSERT WITH CHECK (auth.uid() = backer_id);
-- No update policy for users, only service role

-- Updates: anyone can read updates on live campaigns; only creator can write
ALTER TABLE updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Updates are viewable by everyone" ON updates FOR SELECT USING (
  EXISTS (SELECT 1 FROM campaigns WHERE id = updates.campaign_id AND (status IN ('live', 'funded') OR creator_id = auth.uid()))
);
CREATE POLICY "Creators can manage updates" ON updates FOR ALL USING (
  EXISTS (SELECT 1 FROM campaigns WHERE id = updates.campaign_id AND creator_id = auth.uid())
);

-- Comments: anyone can read non-hidden comments; authenticated users can write; users can delete their own
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Non-hidden comments are viewable by everyone" ON comments FOR SELECT USING (is_hidden = false OR auth.uid() = user_id);
CREATE POLICY "Authenticated users can comment" ON comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Reports: authenticated users can create; only admins can read
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can report" ON reports FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins can read reports" ON reports FOR SELECT USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
);

-- TRIGGER for new user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('campaigns', 'campaigns', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible." ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Anyone can upload an avatar." ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Anyone can update their avatar." ON storage.objects FOR UPDATE USING (bucket_id = 'avatars');
CREATE POLICY "Anyone can delete their avatar." ON storage.objects FOR DELETE USING (bucket_id = 'avatars');

-- Storage policies for campaigns
CREATE POLICY "Campaign images are publicly accessible." ON storage.objects FOR SELECT USING (bucket_id = 'campaigns');
CREATE POLICY "Authenticated users can upload campaign images." ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'campaigns' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their campaign images." ON storage.objects FOR UPDATE USING (bucket_id = 'campaigns' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete their campaign images." ON storage.objects FOR DELETE USING (bucket_id = 'campaigns' AND auth.role() = 'authenticated');

-- SEED Categories
INSERT INTO categories (name, slug) VALUES
('Technology', 'technology'),
('Creative', 'creative'),
('Community', 'community'),
('Film', 'film'),
('Music', 'music'),
('Games', 'games'),
('Design', 'design'),
('Food', 'food'),
('Education', 'education'),
('Health', 'health')
ON CONFLICT (name) DO NOTHING;
