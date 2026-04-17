import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy initialization helpers
const getSupabase = () => {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn("Supabase environment variables are missing. Database operations will fail.");
    return null;
  }
  return createClient(url, key);
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  const supabase = getSupabase();

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Cron-like endpoint to check for ended campaigns
  app.post("/api/cron/check-campaigns", async (req, res) => {
    if (!supabase) return res.status(500).json({ error: "Supabase not initialized" });
    try {
      const now = new Date().toISOString();
      
      // Find campaigns that just ended and are still 'live'
      const { data: endedCampaigns } = await supabase
        .from("campaigns")
        .select("*, profiles(email, full_name)")
        .eq("status", "live")
        .lt("end_date", now);

      if (endedCampaigns) {
        for (const campaign of endedCampaigns) {
          const isFunded = Number(campaign.amount_raised) >= Number(campaign.funding_goal);
          const newStatus = isFunded ? "funded" : "failed";
          
          // Update status
          await supabase.from("campaigns").update({ status: newStatus }).eq("id", campaign.id);
          
          // Notify all backers
          const { data: pledges } = await supabase
            .from("pledges")
            .select("profiles(email, full_name)")
            .eq("campaign_id", campaign.id);
          
          if (pledges) {
            const backerEmails = Array.from(new Set(pledges.map((p: any) => p.profiles?.email).filter(Boolean)));
          }
        }
      }
      
      res.json({ processed: endedCampaigns?.length || 0 });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error(err.stack);
    res.status(500).send("Something broke!");
  });
}

startServer();
