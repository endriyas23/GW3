import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

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

const getResend = () => {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("RESEND_API_KEY is missing. Email notifications will be disabled.");
    return null;
  }
  return new Resend(key);
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  const supabase = getSupabase();
  const resend = getResend();

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Notification: Campaign Backed
  app.post("/api/notify/backed", async (req, res) => {
    const { campaignId, backerName, pledgeAmount, backerEmail } = req.body;
    if (!resend) return res.status(503).json({ error: "Email service not configured" });
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });

    try {
      // Get creator info
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("title, creator_id, profiles(email, full_name)")
        .eq("id", campaignId)
        .single();

      if (campaign && campaign.profiles) {
        // Send email to creator
        await resend.emails.send({
          from: "GW3 Notifications <notifications@resend.dev>",
          to: (campaign.profiles as any).email,
          subject: "🎉 Your campaign was backed!",
          html: `
            <h1>Great news!</h1>
            <p><strong>${backerName}</strong> just backed your campaign <strong>${campaign.title}</strong> with a pledge of <strong>$${pledgeAmount}</strong>.</p>
            <p>Keep up the great work!</p>
            <p>- The GW3 Team</p>
          `
        });

        // Send confirmation email to backer
        if (backerEmail) {
          await resend.emails.send({
            from: "GW3 Notifications <notifications@resend.dev>",
            to: backerEmail,
            subject: "🙌 You just backed a project on GW3!",
            html: `
              <h1>Thank you for your support!</h1>
              <p>You've successfully backed <strong>${campaign.title}</strong> with a pledge of <strong>$${pledgeAmount}</strong>.</p>
              <p>We'll notify you when the creator posts updates.</p>
              <p>- The GW3 Team</p>
            `
          });
        }
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Email error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Notification: New Update Posted
  app.post("/api/notify/update", async (req, res) => {
    const { campaignId, updateTitle } = req.body;
    if (!resend) return res.status(503).json({ error: "Email service not configured" });
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });

    try {
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("title")
        .eq("id", campaignId)
        .single();
      
      const { data: pledges } = await supabase
        .from("pledges")
        .select("profiles(email, full_name)")
        .eq("campaign_id", campaignId);

      if (campaign && pledges) {
        const backerEmails = Array.from(new Set(pledges.map((p: any) => p.profiles?.email).filter(Boolean))) as string[];
        
        if (backerEmails.length > 0) {
          await resend.emails.send({
            from: "GW3 Updates <updates@resend.dev>",
            to: backerEmails,
            subject: `📢 New update for ${campaign.title}`,
            html: `
              <h1>Project Update: ${updateTitle}</h1>
              <p>The creator of <strong>${campaign.title}</strong> has just posted a new update.</p>
              <p>Check it out on the campaign page!</p>
              <p>- The GW3 Team</p>
            `
          });
        }
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Email error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Cron-like endpoint to check for ended campaigns
  app.post("/api/cron/check-campaigns", async (req, res) => {
    if (!supabase) return res.status(500).json({ error: "Supabase not initialized" });
    try {
      const now = new Date();
      const nowIso = now.toISOString();
      
      // 1. Notify campaigns nearing end (3 days)
      const threeDaysLater = new Date();
      threeDaysLater.setDate(now.getDate() + 3);
      const threeDaysLaterIso = threeDaysLater.toISOString();
      const twoDaysLaterIso = new Date(threeDaysLater.getTime() - 24 * 60 * 60 * 1000).toISOString();

      const { data: nearingEnd } = await supabase
        .from("campaigns")
        .select("*, profiles(email, full_name)")
        .eq("status", "live")
        .gt("end_date", twoDaysLaterIso)
        .lt("end_date", threeDaysLaterIso);
      
      if (nearingEnd && resend) {
        for (const campaign of nearingEnd) {
          // Simple flag to avoid double notifying would be better in DB, 
          // but for now, we'll just send it.
          await resend.emails.send({
            from: "GW3 Reminder <reminder@resend.dev>",
            to: (campaign.profiles as any).email,
            subject: `⏰ Only 3 days left for ${campaign.title}!`,
            html: `
              <h1>The clock is ticking!</h1>
              <p>Your campaign <strong>${campaign.title}</strong> is ending in 3 days.</p>
              <p>You've currently raised <strong>$${campaign.amount_raised}</strong>.</p>
              <p>Share your project to get those final pledges!</p>
              <p>- The GW3 Team</p>
            `
          });
        }
      }

      // 2. Find campaigns that just ended and are still 'live'
      const { data: endedCampaigns } = await supabase
        .from("campaigns")
        .select("*, profiles(email, full_name)")
        .eq("status", "live")
        .lt("end_date", nowIso);

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
            const backerEmails = Array.from(new Set(pledges.map((p: any) => p.profiles?.email).filter(Boolean))) as string[];
            
            if (backerEmails.length > 0 && resend) {
              await resend.emails.send({
                from: "GW3 Status <status@resend.dev>",
                to: backerEmails,
                subject: `📢 Campaign ${isFunded ? "Funded" : "Ended"}: ${campaign.title}`,
                html: `
                  <h1>Campaign Final Result</h1>
                  <p>The campaign <strong>${campaign.title}</strong> has ended.</p>
                  <p>Result: <strong>${isFunded ? "SUCCEEDED" : "FAILED"}</strong></p>
                  <p>${isFunded ? "The project will now move to production. Stay tuned for updates!" : "Unfortunately, the funding goal was not met."}</p>
                  <p>- The GW3 Team</p>
                `
              });
            }
          }

          // Also notify owner
          if (campaign.profiles?.email && resend) {
            await resend.emails.send({
              from: "GW3 Status <status@resend.dev>",
              to: campaign.profiles.email,
              subject: `📊 Your campaign has ended: ${campaign.title}`,
              html: `
                <h1>Your campaign has concluded</h1>
                <p>Hello <strong>${campaign.profiles.full_name}</strong>,</p>
                <p>Your campaign <strong>${campaign.title}</strong> has ended with a status of <strong>${newStatus}</strong>.</p>
                <p>Total raised: <strong>$${campaign.amount_raised}</strong> against a goal of <strong>$${campaign.funding_goal}</strong>.</p>
                <p>- The GW3 Team</p>
              `
            });
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
