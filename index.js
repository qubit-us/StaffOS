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

// WCAG Success Criteria mapping with ADA/Section 508 compliance
const WCAG_CRITERIA = {
  '1.1.1': {
    name: 'Non-text Content (Images)',
    description: 'All images must have alternative text',
    adaMapped: true,
    section508: '§1194.22(a)',
    riskLevel: 'High',
    riskIcon: '🚨',
    lawsuitRisk: 'High (common ADA lawsuit claim)'
  },
  '1.3.1': {
    name: 'Info & Relationships (Headings)',
    description: 'Content structure must be programmatically determined',
    adaMapped: true,
    section508: '§1194.22(e), (f)',
    riskLevel: 'High',
    riskIcon: '🚨',
    lawsuitRisk: 'High'
  },
  '1.4.3': {
    name: 'Contrast (Minimum)',
    description: 'Text must have sufficient contrast ratio',
    adaMapped: true,
    section508: '§1194.22(c)',
    riskLevel: 'High',
    riskIcon: '🚨',
    lawsuitRisk: 'High'
  },
  '2.1.1': {
    name: 'Keyboard Access',
    description: 'All functionality must be keyboard accessible',
    adaMapped: true,
    section508: '§1194.22(n)',
    riskLevel: 'High',
    riskIcon: '🚨',
    lawsuitRisk: 'High'
  },
  '2.4.1': {
    name: 'Bypass Blocks',
    description: 'Skip links must be provided',
    adaMapped: true,
    section508: '§1194.22(o)',
    riskLevel: 'Medium',
    riskIcon: '⚠️',
    lawsuitRisk: 'Medium'
  },
  '2.4.2': {
    name: 'Page Titled',
    description: 'Web pages must have descriptive titles',
    adaMapped: true,
    section508: '§1194.22(i)',
    riskLevel: 'Medium',
    riskIcon: '⚠️',
    lawsuitRisk: 'Medium'
  },
  '2.4.4': {
    name: 'Link Purpose',
    description: 'Links must have descriptive text',
    adaMapped: true,
    section508: '§1194.22(d)',
    riskLevel: 'Medium',
    riskIcon: '⚠️',
    lawsuitRisk: 'Medium'
  },
  '3.1.1': {
    name: 'Language of Page',
    description: 'HTML lang attribute must be present',
    adaMapped: true,
    section508: '§1194.22(p)',
    riskLevel: 'Medium',
    riskIcon: '⚠️',
    lawsuitRisk: 'Medium'
  },
  '3.3.1': {
    name: 'Error Identification',
    description: 'Input errors must be identified',
    adaMapped: true,
    section508: '§1194.22(n)',
    riskLevel: 'High',
    riskIcon: '🚨',
    lawsuitRisk: 'High'
  },
  '4.1.2': {
    name: 'Name, Role, Value',
    description: 'UI components must have proper ARIA attributes',
    adaMapped: true,
    section508: '§1194.22(l), (n)',
    riskLevel: 'High',
    riskIcon: '🚨',
    lawsuitRisk: 'High'
  }
};

// Comprehensive accessibility checks (HTML-based)
function performDetailedAccessibilityCheck(html, url) {
  const violations = [];
  const passed = [];
  
  // 1.1.1 - Non-text Content (Images)
  const imgMatches = html.match(/<img[^>]*>/gi) || [];
  let missingAlt = 0;
  let totalImages = imgMatches.length;
  
  imgMatches.forEach((img, index) => {
    if (!img.includes('alt=') || img.match(/alt=["'][\s]*["']/)) {
      missingAlt++;
    }
  });
  
  if (missingAlt > 0) {
    violations.push({
      wcagCriterion: '1.1.1',
      ...WCAG_CRITERIA['1.1.1'],
      impact: 'critical',
      count: missingAlt,
      total: totalImages,
      details: `${missingAlt} out of ${totalImages} images missing alternative text`,
      context: imgMatches.slice(0, 3).map(img => img.substring(0, 150)),
      fix: 'Add meaningful alt attributes to all images'
    });
  } else if (totalImages > 0) {
    passed.push({
      wcagCriterion: '1.1.1',
      ...WCAG_CRITERIA['1.1.1'],
      status: 'passed',
      details: `All ${totalImages} images have alternative text`
    });
  }
  
  // 2.4.2 - Page Titled
  const titleMatch = html.match(/<title[^>]*>[\s\S]*?<\/title>/i);
  if (!titleMatch || titleMatch[0].match(/<title[^>]*>[\s]*<\/title>/i)) {
    violations.push({
      wcagCriterion: '2.4.2',
      ...WCAG_CRITERIA['2.4.2'],
      impact: 'serious',
      details: 'Page is missing a descriptive title',
      context: titleMatch ? titleMatch[0] : '<head> section',
      fix: 'Add a descriptive <title> tag to the page'
    });
  } else {
    passed.push({
      wcagCriterion: '2.4.2',
      ...WCAG_CRITERIA['2.4.2'],
      status: 'passed',
      details: 'Page has a descriptive title'
    });
  }
  
  // 3.1.1 - Language of Page
  const htmlLang = html.match(/<html[^>]*lang=["']([^"']+)["']/i);
  if (!htmlLang) {
    violations.push({
      wcagCriterion: '3.1.1',
      ...WCAG_CRITERIA['3.1.1'],
      impact: 'serious',
      details: 'HTML element missing lang attribute',
      context: html.match(/<html[^>]*>/i)?.[0] || '<html>',
      fix: 'Add lang attribute to HTML element (e.g., <html lang="en">)'
    });
  } else {
    passed.push({
      wcagCriterion: '3.1.1',
      ...WCAG_CRITERIA['3.1.1'],
      status: 'passed',
      details: `Page language declared as "${htmlLang[1]}"`
    });
  }
  
  // 1.3.1 - Info & Relationships (Headings)
  const headings = html.match(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi) || [];
  const emptyHeadings = html.match(/<h[1-6][^>]*>[\s]*<\/h[1-6]>/gi) || [];
  const h1Count = (html.match(/<h1[^>]*>/gi) || []).length;
  
  let headingIssues = [];
  if (emptyHeadings.length > 0) {
    headingIssues.push(`${emptyHeadings.length} empty headings found`);
  }
  if (h1Count === 0) {
    headingIssues.push('No H1 heading found');
  } else if (h1Count > 1) {
    headingIssues.push(`Multiple H1 headings found (${h1Count})`);
  }
  
  if (headingIssues.length > 0) {
    violations.push({
      wcagCriterion: '1.3.1',
      ...WCAG_CRITERIA['1.3.1'],
      impact: 'serious',
      details: headingIssues.join('; '),
      context: emptyHeadings.slice(0, 2),
      fix: 'Ensure proper heading structure with one H1 and no empty headings'
    });
  } else if (headings.length > 0) {
    passed.push({
      wcagCriterion: '1.3.1',
      ...WCAG_CRITERIA['1.3.1'],
      status: 'passed',
      details: `Proper heading structure with ${headings.length} headings`
    });
  }
  
  // 4.1.2 - Name, Role, Value (Form Labels)
  const inputs = html.match(/<input[^>]*type=["'](?:text|email|password|tel|url|search|number|date)["'][^>]*>/gi) || [];
  let unlabeledInputs = 0;
  
  inputs.forEach(input => {
    if (!input.includes('aria-label=') && 
        !input.includes('aria-labelledby=') && 
        !input.includes('title=')) {
      unlabeledInputs++;
    }
  });
  
  if (unlabeledInputs > 0) {
    violations.push({
      wcagCriterion: '4.1.2',
      ...WCAG_CRITERIA['4.1.2'],
      impact: 'critical',
      count: unlabeledInputs,
      total: inputs.length,
      details: `${unlabeledInputs} out of ${inputs.length} form inputs lack proper labels`,
      context: inputs.slice(0, 2).map(input => input.substring(0, 120)),
      fix: 'Add labels, aria-label, or aria-labelledby attributes to form inputs'
    });
  } else if (inputs.length > 0) {
    passed.push({
      wcagCriterion: '4.1.2',
      ...WCAG_CRITERIA['4.1.2'],
      status: 'passed',
      details: `All ${inputs.length} form inputs have proper labels`
    });
  }
  
  // 2.4.4 - Link Purpose
  const links = html.match(/<a[^>]*href[^>]*>[\s\S]*?<\/a>/gi) || [];
  const vagueLinks = links.filter(link => {
    const linkText = link.replace(/<[^>]*>/g, '').trim().toLowerCase();
    return ['click here', 'read more', 'more', 'here', 'link'].includes(linkText);
  });
  
  if (vagueLinks.length > 0) {
    violations.push({
      wcagCriterion: '2.4.4',
      ...WCAG_CRITERIA['2.4.4'],
      impact: 'moderate',
      count: vagueLinks.length,
      total: links.length,
      details: `${vagueLinks.length} links have vague or non-descriptive text`,
      context: vagueLinks.slice(0, 3).map(link => link.substring(0, 100)),
      fix: 'Use descriptive link text that explains the link purpose'
    });
  } else if (links.length > 0) {
    passed.push({
      wcagCriterion: '2.4.4',
      ...WCAG_CRITERIA['2.4.4'],
      status: 'passed',
      details: `All ${links.length} links have descriptive text`
    });
  }
  
  // 2.4.1 - Bypass Blocks (Skip Links)
  const skipLinks = html.match(/<a[^>]*href=["']#[^"']*["'][^>]*>[\s\S]*?skip[\s\S]*?<\/a>/gi) || [];
  if (skipLinks.length === 0 && html.length > 5000) { // Only check for longer pages
    violations.push({
      wcagCriterion: '2.4.1',
      ...WCAG_CRITERIA['2.4.1'],
      impact: 'moderate',
      details: 'No skip navigation links found',
      context: 'Page header/navigation area',
      fix: 'Add skip navigation links for keyboard users'
    });
  } else if (skipLinks.length > 0) {
    passed.push({
      wcagCriterion: '2.4.1',
      ...WCAG_CRITERIA['2.4.1'],
      status: 'passed',
      details: `Skip navigation available (${skipLinks.length} skip links found)`
    });
  }
  
  return {
    violations,
    passed,
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

    // Perform detailed accessibility checks
    const results = performDetailedAccessibilityCheck(html, url);
    
    // Calculate compliance score
    const totalChecks = results.violations.length + results.passed.length;
    const passedChecks = results.passed.length;
    const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
    
    // Categorize violations by risk level
    const criticalViolations = results.violations.filter(v => v.impact === 'critical');
    const seriousViolations = results.violations.filter(v => v.impact === 'serious');
    const moderateViolations = results.violations.filter(v => v.impact === 'moderate');

    // Format results for API response
    const formatted = {
      url,
      timestamp: new Date().toISOString(),
      scanType: "WCAG 2.1/2.2 Compliance Analysis",
      
      // Overall Results
      summary: {
        score: score,
        totalViolations: results.violations.length,
        totalPassed: results.passed.length,
        complianceLevel: score >= 80 ? 'Good' : score >= 60 ? 'Moderate' : 'Poor',
        overallRisk: criticalViolations.length > 0 ? 'High' : seriousViolations.length > 0 ? 'Medium' : 'Low'
      },
      
      // Risk Analysis
      riskAnalysis: {
        high: criticalViolations.length,
        medium: seriousViolations.length,
        low: moderateViolations.length,
        lawsuitRisk: criticalViolations.length > 0 ? 'High - Common ADA lawsuit targets found' : 
                     seriousViolations.length > 0 ? 'Medium - Some compliance issues present' : 
                     'Low - No major accessibility barriers detected'
      },
      
      // Detailed WCAG Compliance Table
      wcagCompliance: [
        ...results.violations.map(violation => ({
          wcagCriterion: violation.wcagCriterion,
          successCriterion: violation.name,
          status: '❌ Failed',
          adaMapped: violation.adaMapped ? 'Yes' : 'No',
          section508: violation.section508,
          riskLevel: `${violation.riskIcon} ${violation.riskLevel}`,
          details: violation.details,
          impact: violation.impact,
          howToFix: violation.fix,
          context: violation.context
        })),
        ...results.passed.map(pass => ({
          wcagCriterion: pass.wcagCriterion,
          successCriterion: pass.name,
          status: '✅ Passed',
          adaMapped: pass.adaMapped ? 'Yes' : 'No',
          section508: pass.section508,
          riskLevel: `✅ Compliant`,
          details: pass.details
        }))
      ].sort((a, b) => a.wcagCriterion.localeCompare(b.wcagCriterion)),
      
      // Priority Actions (Critical Issues First)
      priorityActions: [
        ...criticalViolations.map(v => ({
          priority: '🚨 CRITICAL',
          wcag: v.wcagCriterion,
          issue: v.name,
          action: v.fix,
          lawsuitRisk: v.lawsuitRisk,
          count: v.count || 1
        })),
        ...seriousViolations.map(v => ({
          priority: '⚠️ HIGH',
          wcag: v.wcagCriterion,
          issue: v.name,
          action: v.fix,
          lawsuitRisk: v.lawsuitRisk
        })),
        ...moderateViolations.map(v => ({
          priority: '📋 MEDIUM',
          wcag: v.wcagCriterion,
          issue: v.name,
          action: v.fix,
          lawsuitRisk: v.lawsuitRisk
        }))
      ],
      
      // Technical Details for Developers
      technicalDetails: {
        violations: results.violations,
        passed: results.passed,
        scanMetrics: {
          totalElements: {
            images: (html.match(/<img[^>]*>/gi) || []).length,
            links: (html.match(/<a[^>]*href[^>]*>/gi) || []).length,
            headings: (html.match(/<h[1-6][^>]*>/gi) || []).length,
            inputs: (html.match(/<input[^>]*>/gi) || []).length
          }
        }
      },
      
      disclaimer: "This scan analyzes HTML structure and content for common WCAG 2.1/2.2 violations. For comprehensive accessibility testing, including color contrast, keyboard navigation, and dynamic content, additional testing tools and manual review are recommended.",
      
      recommendations: [
        "Prioritize fixing CRITICAL issues first - these are common lawsuit targets",
        "Implement automated accessibility testing in your development workflow",
        "Conduct user testing with assistive technology users",
        "Consider hiring an accessibility consultant for comprehensive audit"
      ]
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
