export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  default_shipping_address?: string | null;
  role: 'user' | 'admin' | 'moderator';
  kyc_verified: boolean;
  created_at: string;
};

export type CampaignStatus = 'draft' | 'pending' | 'live' | 'funded' | 'failed' | 'rejected';
export type FundingModel = 'fixed' | 'flexible';

export type Campaign = {
  id: string;
  creator_id: string;
  title: string;
  tagline: string;
  category: string;
  subcategory: string | null;
  country: string;
  city: string | null;
  cover_image_url: string | null;
  pitch_video_url: string | null;
  story_html: string | null;
  risks: string | null;
  funding_goal: number;
  currency: string;
  funding_model: FundingModel;
  duration_days: number;
  start_date: string | null;
  end_date: string | null;
  status: CampaignStatus;
  amount_raised: number;
  backer_count: number;
  draft_progress: any; // JSONB
  rejection_reason?: string | null;
  created_at: string;
};

export type Reward = {
  id: string;
  campaign_id: string;
  title: string;
  description: string;
  price: number;
  image_url: string | null;
  estimated_delivery: string;
  quantity_limit: number | null;
  quantity_claimed: number;
  shipping_type: 'none' | 'specific' | 'worldwide';
  shipping_regions?: { region: string; cost: number }[];
  worldwide_shipping_cost?: number;
  items?: { name: string; quantity: number }[];
};

export type TeamMember = {
  id: string;
  campaign_id: string;
  user_id: string | null;
  name: string;
  role: string;
  bio: string;
  avatar_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  sort_order: number;
};

export type FAQ = {
  id: string;
  campaign_id: string;
  question: string;
  answer: string;
  sort_order: number;
};

export type StretchGoal = {
  id: string;
  campaign_id: string;
  target_amount: number;
  title: string;
  description: string;
  image_url: string | null;
  is_unlocked: boolean;
  sort_order: number;
};

export type PledgeStatus = 'pending' | 'captured' | 'refunded' | 'failed';

export type Pledge = {
  id: string;
  campaign_id: string;
  backer_id: string;
  reward_id: string | null;
  amount: number;
  shipping_address?: string;
  shipping_cost?: number;
  status: PledgeStatus;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
};

export type Update = {
  id: string;
  campaign_id: string;
  title: string;
  body: string;
  created_at: string;
};

export type Comment = {
  id: string;
  campaign_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  is_hidden: boolean;
};

export type Report = {
  id: string;
  reporter_id: string;
  target_type: 'campaign' | 'comment' | 'user';
  target_id: string;
  reason: string;
  details: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
};
