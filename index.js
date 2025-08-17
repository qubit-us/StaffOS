import express from "express";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const app = express();
app.use(express.json());

// Simple health check
app.get("/", (req, res) => {
  res.send({ status: "ok", message: "ADA Scanner API running" });
});

// Scan endpoint
app.post("/scan", async (req, res) => {
  const { url } = req.body;

  if (!url) return res.status(400).json({ error: "Missing URL" });

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page }).analyze();

    // Basic compliance scoring
    const violations = results.violations.length;
    const passes = results.passes.length;
    const score = Math.round((passes / (passes + violations)) * 100);

    await browser.close();

    return res.json({
      url,
      score,
      violations: results.violations.map(v => ({
        id: v.id,
        description: v.description,
        impact: v.impact,
        help: v.help,
        wcag: v.tags,
        nodes: v.nodes.map(n => ({
          html: n.html,
          target: n.target,
          failureSummary: n.failureSummary,
        })),
      })),
    });
  } catch (err) {
    await browser.close();
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 ADA Scanner API running on port ${PORT}`);
});


app.post("/scan", async (req, res) => {
  console.log("Received body:", req.body); // <-- see what Railway actually got
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing URL or invalid JSON" });
  // continue processing...
});

app.get("/scan", (req, res) => {
  res.send("Scan endpoint works! Use POST with JSON body for actual scanning.");
});

