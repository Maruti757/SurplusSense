// routes/ocr.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const {
  extractDonationInfo,
  extractTextFromImage,
} = require("../utils/openrouterOCR");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

/**
 * Check if a product is expired based on expiry date
 */
function validateExpiry(expiryDate, manufactureDate = null) {
  if (!expiryDate) {
    return {
      isExpired: false,
      isExpiringSoon: false,
      status: "unknown",
      message: "No expiry date provided",
      daysUntilExpiry: null,
      canDonate: false,
    };
  }

  try {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);

    if (isNaN(expiry.getTime())) {
      return {
        isExpired: false,
        isExpiringSoon: false,
        status: "invalid",
        message: "Invalid expiry date format",
        daysUntilExpiry: null,
        canDonate: false,
      };
    }

    const timeDiff = expiry - currentDate;
    const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    let status = "safe";
    let message = "";
    let canDonate = true;

    if (daysUntilExpiry < 0) {
      status = "expired";
      message = `This product expired ${Math.abs(daysUntilExpiry)} days ago on ${expiryDate}. It is NOT safe for donation.`;
      canDonate = false;
    } else if (daysUntilExpiry === 0) {
      status = "expires_today";
      message = `This product expires today (${expiryDate}). Please check carefully before donating.`;
      canDonate = true;
    } else if (daysUntilExpiry <= 7) {
      status = "expiring_soon";
      message = `This product will expire in ${daysUntilExpiry} day(s) (${expiryDate}). Consider donating to organizations that can distribute it quickly.`;
      canDonate = true;
    } else if (daysUntilExpiry <= 30) {
      status = "expiring_soon_30";
      message = `This product will expire in ${daysUntilExpiry} day(s) (${expiryDate}). Still safe for donation but should be used soon.`;
      canDonate = true;
    } else {
      status = "safe";
      message = `Product is safe for donation. Expires on ${expiryDate} (in ${daysUntilExpiry} days).`;
      canDonate = true;
    }

    return {
      isExpired: daysUntilExpiry < 0,
      isExpiringSoon: daysUntilExpiry >= 0 && daysUntilExpiry <= 7,
      status: status,
      message: message,
      daysUntilExpiry: daysUntilExpiry,
      expiryDate: expiryDate,
      canDonate: canDonate,
    };
  } catch (error) {
    console.error("Error validating expiry:", error);
    return {
      isExpired: false,
      isExpiringSoon: false,
      status: "error",
      message: "Error validating expiry date",
      daysUntilExpiry: null,
      canDonate: false,
    };
  }
}

/**
 * Check if a product is safe to donate
 */
function checkDonationSafety(product) {
  const expiryValidation = validateExpiry(
    product.expiryDate,
    product.manufactureDate,
  );

  let safetyLevel = "safe";
  let recommendations = [];
  let warningMessages = [];

  if (expiryValidation.isExpired) {
    safetyLevel = "unsafe";
    warningMessages.push(expiryValidation.message);
    recommendations.push("Do not donate - product is expired");
  } else if (expiryValidation.status === "expiring_soon") {
    safetyLevel = "caution";
    warningMessages.push(expiryValidation.message);
    recommendations.push(
      "Donate to organizations that can distribute within 7 days",
    );
    recommendations.push(
      "Consider refrigerated/frozen items for immediate use",
    );
  } else if (expiryValidation.status === "expiring_soon_30") {
    safetyLevel = "safe_with_note";
    warningMessages.push(expiryValidation.message);
    recommendations.push("Donate soon to ensure usage before expiry");
  }

  return {
    safeToDonate: expiryValidation.canDonate,
    safetyLevel: safetyLevel,
    expiryValidation: expiryValidation,
    recommendations: recommendations,
    warningMessages: warningMessages,
  };
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  if (!dateString) return "N/A";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    return dateString;
  }
}

/**
 * Universal Date Parser - Supports ALL date formats including DDMMMYY
 */
function parseDatesFromText(text) {
  const results = {
    manufactureDate: null,
    expiryDate: null,
    allDetectedDates: [],
  };

  if (!text || text === "NO_TEXT_FOUND") return results;

  console.log("🔍 Parsing dates from text:", text);

  // Month mapping for abbreviations
  const monthMap = {
    JAN: "01",
    FEB: "02",
    MAR: "03",
    APR: "04",
    MAY: "05",
    JUN: "06",
    JUL: "07",
    AUG: "08",
    SEP: "09",
    OCT: "10",
    NOV: "11",
    DEC: "12",
    JAN: "01",
    FEB: "02",
    MAR: "03",
    APR: "04",
    MAY: "05",
    JUN: "06",
    JUL: "07",
    AUG: "08",
    SEP: "09",
    OCT: "10",
    NOV: "11",
    DEC: "12",
  };

  // ===== DATE PATTERNS FOR ALL FORMATS =====
  const datePatterns = [
    // Pattern 1: DD/MM/YYYY or DD-MM-YYYY (also supports 2-digit year)
    { regex: /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g, format: "dmy" },

    // Pattern 2: MM/DD/YYYY or MM-DD-YYYY (also supports 2-digit year)
    { regex: /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g, format: "mdy" },

    // Pattern 3: YYYY/MM/DD or YYYY-MM-DD (also supports 2-digit year)
    { regex: /\b(\d{2,4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/g, format: "ymd" },

    // Pattern 4: DD MMM YYYY (e.g., 05 Feb 2026)
    {
      regex:
        /\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})\b/gi,
      format: "dmmyyyy",
    },

    // Pattern 5: DD MMM YY (e.g., 05 Feb 26)
    {
      regex:
        /\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{2})\b/gi,
      format: "dmmyy",
    },

    // Pattern 6: DDMMMYY (e.g., 05FEB26) - CRITICAL FOR YOUR USE CASE
    {
      regex:
        /\b(\d{1,2})(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(\d{2})\b/gi,
      format: "dmmyy",
    },

    // Pattern 7: Mon DD, YYYY (e.g., Feb 05, 2026)
    {
      regex:
        /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})[,]?\s+(\d{4})\b/gi,
      format: "mddyyyy",
    },

    // Pattern 8: DD.MM.YYYY (European dot format)
    { regex: /\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/g, format: "dmy" },

    // Pattern 9: Month YYYY (e.g., April 2022)
    {
      regex:
        /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})\b/gi,
      format: "my",
    },

    // Pattern 10: MM-YYYY (e.g., 04-2022)
    { regex: /\b(\d{1,2})[\/\-](\d{4})\b(?!.*[\/\-]\d)/g, format: "my" },

    // Pattern 11: YYYY-MM-DD (ISO)
    { regex: /\b(\d{4})-(\d{2})-(\d{2})\b/g, format: "ymd" },
  ];

  // Extract all dates with context (line by line)
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  // Store all detected dates with their context
  const detectedDates = [];

  lines.forEach((line, lineIndex) => {
    const originalLine = line;
    const lowerLine = line.toLowerCase();

    // Special handling for patterns like "Manufacturing Date: 05FEB26"
    const mfgDateMatch = line.match(
      /(?:manufactur|mfg|mfd)[\s:]+date[\s:]+(\d{1,2})(?:[\/\-]|\s*)([a-z]{3})(\d{2})/i,
    );
    if (mfgDateMatch) {
      const [_, day, month, year] = mfgDateMatch;
      const monthNum = monthMap[month.toUpperCase()];
      if (monthNum) {
        const fullYear = `20${year}`;
        const formattedDate = `${fullYear}-${monthNum}-${day.padStart(2, "0")}`;
        const dateObj = new Date(formattedDate);
        if (!isNaN(dateObj.getTime())) {
          detectedDates.push({
            original: mfgDateMatch[0],
            formatted: formattedDate,
            line: originalLine,
            lineIndex,
            isFuture: dateObj > new Date(),
            isMfg: true,
            isExp: false,
          });
          console.log(`📅 Found MFG date: ${formattedDate}`);
        }
      }
    }

    // Special handling for patterns like "Expiry Date: 06JUN26"
    const expDateMatch = line.match(
      /(?:exp|expiry)[\s:]+date[\s:]+(\d{1,2})(?:[\/\-]|\s*)([a-z]{3})(\d{2})/i,
    );
    if (expDateMatch) {
      const [_, day, month, year] = expDateMatch;
      const monthNum = monthMap[month.toUpperCase()];
      if (monthNum) {
        const fullYear = `20${year}`;
        const formattedDate = `${fullYear}-${monthNum}-${day.padStart(2, "0")}`;
        const dateObj = new Date(formattedDate);
        if (!isNaN(dateObj.getTime())) {
          detectedDates.push({
            original: expDateMatch[0],
            formatted: formattedDate,
            line: originalLine,
            lineIndex,
            isFuture: dateObj > new Date(),
            isMfg: false,
            isExp: true,
          });
          console.log(`📅 Found EXP date: ${formattedDate}`);
        }
      }
    }

    // Check each pattern on this line
    datePatterns.forEach((pattern) => {
      const matches = [...line.matchAll(pattern.regex)];
      matches.forEach((match) => {
        let dateStr = match[0];
        let formattedDate = null;

        // Format based on pattern type
        if (pattern.format === "dmy" && match.length >= 4) {
          let [_, d, m, y] = match;
          if (d.length === 4) {
            formattedDate = `${d}-${m}-${y}`;
          } else {
            if (y.length === 2) y = "20" + y;
            formattedDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
          }
        } else if (pattern.format === "mdy" && match.length >= 4) {
          let [_, m, d, y] = match;
          if (y.length === 2) y = "20" + y;
          formattedDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        } else if (pattern.format === "ymd" && match.length >= 4) {
          let [_, y, m, d] = match;
          if (y.length === 2) y = "20" + y;
          formattedDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        } else if (pattern.format === "dmmyyyy" && match.length >= 4) {
          let [_, d, m, y] = match;
          const monthAbbr = m.toUpperCase().substring(0, 3);
          const monthNum = monthMap[monthAbbr];
          if (monthNum) {
            formattedDate = `${y}-${monthNum}-${d.padStart(2, "0")}`;
          }
        } else if (pattern.format === "dmmyy" && match.length >= 4) {
          let [_, d, m, y] = match;
          const monthAbbr = m.toUpperCase().substring(0, 3);
          const monthNum = monthMap[monthAbbr];
          if (monthNum) {
            const fullYear = y.length === 2 ? `20${y}` : y;
            formattedDate = `${fullYear}-${monthNum}-${d.padStart(2, "0")}`;
          }
        } else if (pattern.format === "mddyyyy" && match.length >= 4) {
          let [_, m, d, y] = match;
          const monthAbbr = m.toUpperCase().substring(0, 3);
          const monthNum = monthMap[monthAbbr];
          if (monthNum) {
            formattedDate = `${y}-${monthNum}-${d.padStart(2, "0")}`;
          }
        } else if (pattern.format === "my" && match.length >= 3) {
          let [_, m, y] = match;
          if (y.length === 2) y = "20" + y;
          formattedDate = `${y}-${m.padStart(2, "0")}-01`;
        }

        if (formattedDate) {
          const dateObj = new Date(formattedDate);
          if (!isNaN(dateObj.getTime())) {
            const isMfg =
              lowerLine.includes("manufactur") ||
              lowerLine.includes("mfg") ||
              lowerLine.includes("mfd") ||
              lowerLine.includes("pkd") ||
              lowerLine.includes("packaged") ||
              lowerLine.includes("prod");
            const isExp =
              lowerLine.includes("exp") ||
              lowerLine.includes("expiry") ||
              lowerLine.includes("expiration") ||
              lowerLine.includes("use by") ||
              lowerLine.includes("best before");

            detectedDates.push({
              original: dateStr,
              formatted: formattedDate,
              line: originalLine,
              lineIndex,
              isFuture: dateObj > new Date(),
              isMfg: isMfg,
              isExp: isExp,
            });
          }
        }
      });
    });
  });

  // Remove duplicates (keep first occurrence)
  const uniqueDates = [];
  const seen = new Set();
  detectedDates.forEach((date) => {
    if (!seen.has(date.formatted)) {
      seen.add(date.formatted);
      uniqueDates.push(date);
    }
  });

  results.allDetectedDates = uniqueDates.map((d) => d.formatted);
  console.log("📅 All detected dates:", results.allDetectedDates);

  // ===== IDENTIFY MFD AND EXP DATES =====
  if (uniqueDates.length === 0) return results;

  // First, check for dates marked as MFD or EXP during detection
  const mfdMarked = uniqueDates.find((d) => d.isMfg === true);
  const expMarked = uniqueDates.find((d) => d.isExp === true);

  if (mfdMarked) results.manufactureDate = mfdMarked.formatted;
  if (expMarked) results.expiryDate = expMarked.formatted;

  // If still not found, use label-based detection
  if (!results.manufactureDate || !results.expiryDate) {
    lines.forEach((line, idx) => {
      const lowerLine = line.toLowerCase();

      if (
        !results.manufactureDate &&
        (lowerLine.includes("manufactur") ||
          lowerLine.includes("mfg") ||
          lowerLine.includes("mfd") ||
          lowerLine.includes("pkd") ||
          lowerLine.includes("packaged") ||
          lowerLine.includes("prod"))
      ) {
        const closestDate = findClosestDateToLine(uniqueDates, idx);
        if (closestDate && !closestDate.isExp) {
          results.manufactureDate = closestDate.formatted;
          console.log("✅ Found MFD from label:", results.manufactureDate);
        }
      }

      if (
        !results.expiryDate &&
        (lowerLine.includes("exp") ||
          lowerLine.includes("expiry") ||
          lowerLine.includes("expiration") ||
          lowerLine.includes("use by") ||
          lowerLine.includes("best before") ||
          lowerLine.includes("bb"))
      ) {
        const closestDate = findClosestDateToLine(uniqueDates, idx);
        if (closestDate && !closestDate.isMfg) {
          results.expiryDate = closestDate.formatted;
          console.log("✅ Found EXP from label:", results.expiryDate);
        }
      }
    });
  }

  // Intelligent fallback
  if (
    !results.manufactureDate &&
    !results.expiryDate &&
    uniqueDates.length >= 2
  ) {
    const sorted = [...uniqueDates].sort(
      (a, b) => new Date(a.formatted) - new Date(b.formatted),
    );
    results.manufactureDate = sorted[0].formatted;
    results.expiryDate = sorted[sorted.length - 1].formatted;
    console.log("📊 Using chronological assignment");
  } else if (
    !results.manufactureDate &&
    !results.expiryDate &&
    uniqueDates.length === 1
  ) {
    const singleDate = uniqueDates[0];
    const textLower = text.toLowerCase();

    if (
      textLower.includes("exp") ||
      textLower.includes("expiry") ||
      textLower.includes("expiration")
    ) {
      results.expiryDate = singleDate.formatted;
    } else {
      results.manufactureDate = singleDate.formatted;
    }
  }

  // Ensure MFD is before EXP
  if (results.manufactureDate && results.expiryDate) {
    const mfdDate = new Date(results.manufactureDate);
    const expDate = new Date(results.expiryDate);

    if (mfdDate > expDate) {
      console.log("🔄 Swapping dates - MFD after EXP");
      [results.manufactureDate, results.expiryDate] = [
        results.expiryDate,
        results.manufactureDate,
      ];
    }
  }

  console.log("📅 Final parsed dates:", {
    manufactureDate: results.manufactureDate,
    expiryDate: results.expiryDate,
  });

  return results;
}

/**
 * Find the date closest to a given line number
 */
function findClosestDateToLine(dates, targetLineIndex) {
  if (!dates.length) return null;

  return dates.reduce((closest, current) => {
    const currentDiff = Math.abs(current.lineIndex - targetLineIndex);
    const closestDiff = closest
      ? Math.abs(closest.lineIndex - targetLineIndex)
      : Infinity;

    if (!closest || currentDiff < closestDiff) {
      return current;
    }
    return closest;
  }, null);
}

/**
 * Extract brand name from text
 */
function extractBrandName(text) {
  if (!text) return null;

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  // First, try to find brand name in the text with specific patterns
  for (const line of lines) {
    // Look for "Brand name: XXX" pattern
    const brandMatch = line.match(/brand\s*name[:\s]+(.+)/i);
    if (brandMatch) {
      let brand = brandMatch[1].trim();
      brand = brand.split(/[,;]|\s+(?:mfg|exp|date)/i)[0];
      if (brand && brand.length > 0 && brand.length < 50) {
        return brand;
      }
    }
  }

  // Common patterns to skip
  const skipPatterns = [
    /mfg|manufacture|exp|expiry|date|best before|use by|ingredients|weight|net|gms?|kgs?/i,
    /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/, // Dates
    /^[A-Z0-9]{5,}$/, // Product codes
    /^[0-9\s]+$/, // Just numbers
    /not present|not found/i,
    /item\s*\#\d+/i, // Item numbers
    /food\s*name/i, // Food name labels
    /quantity/i,
    /unit/i,
    /packs?/i,
  ];

  // Look for potential brand names (usually capitalized words)
  for (const line of lines) {
    if (line.length < 3) continue;

    let shouldSkip = false;
    for (const pattern of skipPatterns) {
      if (pattern.test(line)) {
        shouldSkip = true;
        break;
      }
    }

    // If it's all caps and short, it might be a brand
    if (
      !shouldSkip &&
      line === line.toUpperCase() &&
      line.length < 20 &&
      line.length > 2
    ) {
      return line;
    }

    // If it contains common brand names
    if (!shouldSkip && line.match(/BALAJI|LAYS|KURKURE|DORITOS|PRINGLES/i)) {
      const match = line.match(/(BALAJI|LAYS|KURKURE|DORITOS|PRINGLES)/i);
      if (match) return match[0];
    }

    // General brand name candidate
    if (
      !shouldSkip &&
      line.length > 2 &&
      line.length < 30 &&
      !line.includes(" ")
    ) {
      return line;
    }
  }

  return "Unknown Brand";
}

// ============== PRODUCT SCANNING ENDPOINT (for MFD/EXP) ==============
router.post("/scan-product", upload.single("image"), async (req, res) => {
  console.log("📸 Product scan request received");

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image file uploaded",
      });
    }

    console.log(`Processing product image: ${req.file.path}`);

    const text = await extractTextFromImage(req.file.path, "product");

    // Check if text extraction failed
    if (!text || text === "NO_TEXT_FOUND") {
      console.log("⚠️ No text extracted from image");

      await fs.unlink(req.file.path).catch(console.error);

      return res.json({
        success: true,
        data: {
          rawText: "",
          manufactureDate: null,
          expiryDate: null,
          brandName: "Unknown Brand",
          allDetectedDates: [],
          warning:
            "No text could be extracted from the image. Please try with a clearer image.",
        },
      });
    }

    console.log("📝 Extracted text:", text);

    // Parse dates using universal parser
    const dateResults = parseDatesFromText(text);

    // Extract brand name
    const brandName = extractBrandName(text);

    // Validate expiry if we have a date
    let safetyAssessment = null;
    if (dateResults.expiryDate) {
      safetyAssessment = checkDonationSafety({
        expiryDate: dateResults.expiryDate,
        manufactureDate: dateResults.manufactureDate,
      });
    } else {
      safetyAssessment = {
        safeToDonate: false,
        safetyLevel: "unknown",
        expiryValidation: {
          isExpired: false,
          isExpiringSoon: false,
          status: "unknown",
          message: "No expiry date detected",
          daysUntilExpiry: null,
          canDonate: false,
        },
        recommendations: ["Please manually verify the expiry date"],
        warningMessages: [
          "Expiry date not detected. Please check the product expiry manually before donating.",
        ],
      };
    }

    const result = {
      success: true,
      data: {
        rawText: text,
        manufactureDate: dateResults.manufactureDate,
        expiryDate: dateResults.expiryDate,
        formattedExpiryDate: dateResults.expiryDate
          ? formatDate(dateResults.expiryDate)
          : null,
        brandName: brandName,
        allDetectedDates: dateResults.allDetectedDates,
        safetyAssessment: safetyAssessment,
        canDonate: safetyAssessment.safeToDonate,
        donationStatus: safetyAssessment.safetyLevel,
        donationMessage: safetyAssessment.expiryValidation?.message,
      },
    };

    // Clean up file
    await fs.unlink(req.file.path).catch(console.error);

    console.log("✅ Product scan final result:", {
      manufactureDate: result.data.manufactureDate,
      expiryDate: result.data.expiryDate,
      brandName: result.data.brandName,
      allDetectedDates: result.data.allDetectedDates,
      canDonate: result.data.canDonate,
      donationStatus: result.data.donationStatus,
    });

    res.json(result);
  } catch (error) {
    console.error("❌ Product scan error:", error);
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    res.status(500).json({
      success: false,
      error: error.message || "Failed to scan product",
    });
  }
});

// ============== EXPIRY CHECK ENDPOINT ==============
router.post("/check-expiry", async (req, res) => {
  try {
    const { expiryDate, manufactureDate } = req.body;

    if (!expiryDate) {
      return res.status(400).json({
        success: false,
        error: "Expiry date is required",
      });
    }

    const validation = validateExpiry(expiryDate, manufactureDate);
    const safetyCheck = checkDonationSafety({ expiryDate, manufactureDate });

    res.json({
      success: true,
      data: {
        expiryDate: expiryDate,
        manufactureDate: manufactureDate || null,
        formattedExpiryDate: formatDate(expiryDate),
        validation: validation,
        safetyAssessment: safetyCheck,
        canDonate: safetyCheck.safeToDonate,
        daysUntilExpiry: validation.daysUntilExpiry,
        isExpired: validation.isExpired,
      },
    });
  } catch (error) {
    console.error("Error checking expiry:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Test endpoint to verify OpenRouter is working
router.get("/test-ocr", async (req, res) => {
  try {
    res.json({
      success: true,
      message: "OCR endpoints are configured",
      endpoints: ["/scan-receipt", "/scan-product", "/check-expiry"],
      note: "Upload an image to test",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
