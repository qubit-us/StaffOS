import express from "express";
import bodyParser from "body-parser";
import pa11y from "pa11y";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "ADA Scanner API running" });
});

// POST route for actual scan
app.post("/scan", async (req, res) => {
  try {
    console.log("POST /scan hit");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    
    const { url } = req.body;
    
    if (!url) {
      console.log("No URL provided in request body");
      return res.status(400).json({ 
        error: "Missing URL", 
        received: req.body,
        help: "Send JSON with 'url' field, e.g., {\"url\": \"https://example.com\"}"
      });
    }

    console.log("Scanning URL:", url);

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    // Run accessibility scan with pa11y
    const results = await pa11y(url, {
      timeout: 30000,
      wait: 1000
    });

    console.log("Pa11y results:", results);

    // Format results for API response
    const formatted = {
      url,
      timestamp: new Date().toISOString(),
      totalIssues: results.issues.length,
      score: results.issues.length === 0 ? 100 : Math.max(0, 100 - results.issues.length * 5),
      violations: results.issues.map(issue => ({
        id: issue.code,
        type: issue.type,
        impact: issue.type,
        description: issue.message,
        context: issue.context,
        selector: issue.selector
      }))
    };

    console.log("Scan complete. Sending response:", formatted);
    return res.json(formatted);
    
  } catch (err) {
    console.error("Error scanning URL:", err.message);
    console.error("Full error:", err);
    return res.status(500).json({ 
      error: "Internal server error",
      details: err.message 
    });
  }
});

// Catch-all for undefined routes
app.use("*", (req, res) => {
  res.status(404).json({ 
    error: "Route not found", 
    method: req.method,
    path: req.originalUrl,
    availableRoutes: ["GET /", "POST /scan"]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ADA Scanner API running on port ${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`  GET  / - Health check`);
  console.log(`  POST /scan - Accessibility scan`);
});
























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

