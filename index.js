import express from "express";
import bodyParser from "body-parser";
import https from 'https';
import http from 'http';

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

// Simple HTML content fetcher
function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    
    const req = client.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'ADA-Scanner/1.0'
      }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve(data);
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Basic accessibility checks (HTML-based)
function performBasicAccessibilityCheck(html, url) {
  const issues = [];
  
  // Check for missing alt attributes
  const imgMatches = html.match(/<img[^>]*>/gi) || [];
  imgMatches.forEach((img, index) => {
    if (!img.includes('alt=')) {
      issues.push({
        code: 'image-alt',
        type: 'error',
        message: 'Images must have alternative text',
        context: img.substring(0, 100),
        selector: `img:nth-of-type(${index + 1})`
      });
    }
  });
  
  // Check for missing title tag
  if (!html.match(/<title[^>]*>[\s\S]*?<\/title>/i)) {
    issues.push({
      code: 'document-title',
      type: 'error',
      message: 'Page must have a title to describe its topic or purpose',
      context: '<head>',
      selector: 'html'
    });
  }
  
  // Check for missing lang attribute
  if (!html.match(/<html[^>]*lang=/i)) {
    issues.push({
      code: 'html-has-lang',
      type: 'error',
      message: 'The html element must have a lang attribute',
      context: html.match(/<html[^>]*>/i)?.[0] || '<html>',
      selector: 'html'
    });
  }
  
  // Check for empty headings
  const headingMatches = html.match(/<h[1-6][^>]*>[\s]*<\/h[1-6]>/gi) || [];
  if (headingMatches.length > 0) {
    issues.push({
      code: 'empty-heading',
      type: 'error',
      message: 'Headings must not be empty',
      context: headingMatches[0],
      selector: 'h1, h2, h3, h4, h5, h6'
    });
  }
  
  // Check for missing form labels
  const inputMatches = html.match(/<input[^>]*type=["'](?:text|email|password|tel|url|search)["'][^>]*>/gi) || [];
  inputMatches.forEach((input, index) => {
    if (!input.includes('aria-label=') && !input.includes('aria-labelledby=')) {
      // Simple check - in real implementation you'd check for associated labels
      issues.push({
        code: 'label',
        type: 'error',
        message: 'Form elements must have labels',
        context: input.substring(0, 100),
        selector: `input:nth-of-type(${index + 1})`
      });
    }
  });
  
  return {
    issues,
    url,
    scannedAt: new Date().toISOString()
  };
}

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

    // Fetch HTML content
    console.log("Fetching HTML content...");
    const html = await fetchHTML(url);
    console.log(`Fetched ${html.length} characters of HTML`);

    // Perform basic accessibility checks
    const results = performBasicAccessibilityCheck(html, url);

    // Format results for API response
    const formatted = {
      url,
      timestamp: new Date().toISOString(),
      totalIssues: results.issues.length,
      score: results.issues.length === 0 ? 100 : Math.max(0, 100 - results.issues.length * 10),
      violations: results.issues,
      scanType: "basic-html-analysis",
      note: "This is a basic HTML-based accessibility scan. For comprehensive results including dynamic content, visual contrast, and complex interactions, a browser-based solution would be needed."
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
  console.log(`  POST /scan - Accessibility scan (Basic HTML Analysis)`);
});
