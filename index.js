import express from "express";
import bodyParser from "body-parser";
import pa11y from "pa11y";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// GET route for browser sanity check
app.get("/scan", (req, res) => {
  res.send("Scan endpoint works! Use POST with JSON body for actual scanning.");
});

// POST route for actual scan
app.post("/scan", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Missing URL" });

    console.log("Scanning URL:", url);

    // Run accessibility scan with pa11y
    const results = await pa11y(url);

    // Format results for API response
    const formatted = {
      url,
      score: results.issues.length === 0 ? 100 : Math.max(0, 100 - results.issues.length * 10),
      violations: results.issues.map(issue => ({
        id: issue.code,
        impact: issue.type,
        description: issue.message
      }))
    };

    console.log("Scan complete:", formatted);
    res.json(formatted);
  } catch (err) {
    console.error("Error scanning URL:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start server
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));


























// import express from "express";
// import { chromium } from "playwright";
// import AxeBuilder from "@axe-core/playwright";

// const app = express();
// app.use(express.json());

// // Simple health check
// app.get("/", (req, res) => {
//   res.send({ status: "ok", message: "ADA Scanner API running" });
// });

// // Scan endpoint
// app.post("/scan", async (req, res) => {
//   const { url } = req.body;

//   if (!url) return res.status(400).json({ error: "Missing URL" });

//   const browser = await chromium.launch();
//   const page = await browser.newPage();

//   try {
//     await page.goto(url, { waitUntil: "networkidle" });
//     const results = await new AxeBuilder({ page }).analyze();

//     // Basic compliance scoring
//     const violations = results.violations.length;
//     const passes = results.passes.length;
//     const score = Math.round((passes / (passes + violations)) * 100);

//     await browser.close();

//     return res.json({
//       url,
//       score,
//       violations: results.violations.map(v => ({
//         id: v.id,
//         description: v.description,
//         impact: v.impact,
//         help: v.help,
//         wcag: v.tags,
//         nodes: v.nodes.map(n => ({
//           html: n.html,
//           target: n.target,
//           failureSummary: n.failureSummary,
//         })),
//       })),
//     });
//   } catch (err) {
//     await browser.close();
//     return res.status(500).json({ error: err.message });
//   }
// });

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`🚀 ADA Scanner API running on port ${PORT}`);
// });


// app.post("/scan", async (req, res) => {
//   console.log("Received body:", req.body); // <-- see what Railway actually got
//   const { url } = req.body;
//   if (!url) return res.status(400).json({ error: "Missing URL or invalid JSON" });
//   // continue processing...
// });

// app.get("/scan", (req, res) => {
//   res.send("Scan endpoint works! Use POST with JSON body for actual scanning.");
// });

