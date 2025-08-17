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

    // Configure pa11y for Railway/serverless environment
    const pa11yOptions = {
      timeout: 30000,
      wait: 2000,
      chromeLaunchConfig: {
        executablePath: process.env.CHROME_BIN || '/usr/bin/chromium-browser',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      }
    };

    // Run accessibility scan with pa11y
    console.log("Starting pa11y scan with options:", pa11yOptions);
    const results = await pa11y(url, pa11yOptions);

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
