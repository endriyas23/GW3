import { 
  LayoutGrid, 
  Cpu, 
  Palette, 
  Globe, 
  Film, 
  Music, 
  Gamepad2, 
  PenTool, 
  Utensils, 
  GraduationCap, 
  HeartPulse 
} from "lucide-react";

export const CATEGORY_TREE = [
  { 
    name: "Technology", 
    icon: Cpu,
    emoji: "💻",
    subcategories: ["Hardware", "Software", "Gadgets", "Apps", "Wearables"]
  },
  { 
    name: "Creative", 
    icon: Palette,
    emoji: "🎨",
    subcategories: ["Art", "Illustration", "Photography", "Sculpture", "Digital Art"]
  },
  { 
    name: "Community", 
    icon: Globe,
    emoji: "🤝",
    subcategories: ["Local Impact", "Social Enterprise", "Events", "Spaces"]
  },
  { 
    name: "Film", 
    icon: Film,
    emoji: "🎬",
    subcategories: ["Documentary", "Narrative Film", "Shorts", "Web Series", "Animation"]
  },
  { 
    name: "Music", 
    icon: Music,
    emoji: "🎵",
    subcategories: ["Albums", "Live Events", "Instruments", "Music Videos", "Classical"]
  },
  { 
    name: "Games", 
    icon: Gamepad2,
    emoji: "🎮",
    subcategories: ["Tabletop", "Video Games", "Card Games", "Mobile Games"]
  },
  { 
    name: "Design", 
    icon: PenTool,
    emoji: "📐",
    subcategories: ["Product Design", "Architecture", "Graphic Design", "Typography"]
  },
  { 
    name: "Food", 
    icon: Utensils,
    emoji: "🍕",
    subcategories: ["Restaurants", "Food Trucks", "Vegan", "Farms", "Beverages"]
  },
  { 
    name: "Education", 
    icon: GraduationCap,
    emoji: "📚",
    subcategories: ["Courses", "EdTech", "Books", "Workshops"]
  },
  { 
    name: "Health", 
    icon: HeartPulse,
    emoji: "🏥",
    subcategories: ["Wellness", "Fitness", "Medical Devices", "Mental Health"]
  },
];
