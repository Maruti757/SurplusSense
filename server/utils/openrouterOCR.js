// utils/openrouterOCR.js
const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();

// OpenRouter API key from .env
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Vision models for product image OCR (fast models first, followed by fallback)
const VISION_MODELS = [
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
];

if (!OPENROUTER_API_KEY) {
  console.warn("⚠️  WARNING: OPENROUTER_API_KEY not found in .env file");
  console.warn("Get your free key from: https://openrouter.ai/keys");
}

/**
 * Try a single model for image text extraction with transient error retry mechanism
 */
async function tryModel(model, base64Image, mimeType, prompt) {
  console.log(`🔄 Trying model: ${model}`);

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      attempt++;
      if (attempt > 1) {
        console.log(`🔄 Retrying model: ${model} (Attempt ${attempt}/${maxRetries})...`);
      }

      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 2000,
          temperature: 0.1,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://surplussense-backend.onrender.com",
            "X-Title": "FoodShare",
          },
          timeout: 60000,
        },
      );

      // Debug: log the full response structure
      console.log(`📋 Response status: ${response.status}`);
      console.log(`📋 Response model: ${response.data?.model || "unknown"}`);
      console.log(`📋 Response choices count: ${response.data?.choices?.length || 0}`);

      if (response.data?.choices?.[0]) {
        const choice = response.data.choices[0];
        console.log(`📋 Choice finish_reason: ${choice.finish_reason}`);
        console.log(`📋 Choice message role: ${choice.message?.role}`);
        console.log(`📋 Choice message content type: ${typeof choice.message?.content}`);
        console.log(`📋 Choice message content length: ${choice.message?.content?.length || 0}`);
        console.log(`📋 Choice message content preview: ${String(choice.message?.content || "").substring(0, 100)}`);
      }

      // Check for error in response body (OpenRouter sometimes returns errors in the response)
      if (response.data?.error) {
        console.error(`❌ API returned error:`, response.data.error);
        throw new Error(response.data.error.message || "API error in response");
      }

      return response;
    } catch (error) {
      console.error(`⚠️ Attempt ${attempt} failed: ${error.message}`);

      const status = error.response?.status;
      const isTransient = !status || status === 429 || status === 502 || status === 503 || status === 504 || error.code === "ECONNABORTED";

      if (attempt < maxRetries && isTransient) {
        const backoffTime = attempt * 2000; // 2s, 4s
        console.log(`⏳ Waiting ${backoffTime}ms before retrying...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      } else {
        throw error;
      }
    }
  }
}

/**
 * Extract text from product image using OpenRouter
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromImage(imagePath) {
  try {
    console.log(`📸 Processing product image with OpenRouter...`);

    if (!OPENROUTER_API_KEY) {
      throw new Error(
        "OpenRouter API key is missing. Add it to your .env file",
      );
    }

    // Read and convert image to base64
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString("base64");
    console.log(`📋 Image size: ${imageBuffer.length} bytes (${Math.round(imageBuffer.length / 1024)}KB)`);

    // Get image mime type
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType =
      ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".webp"
            ? "image/webp"
            : "image/jpeg";

    console.log(`📋 Image type: ${mimeType}, extension: ${ext}`);

    // Prompt for product text extraction
    const prompt = `You are an OCR system specialized in extracting information from food product packages. Extract ALL text visible in this image. Pay special attention to:

1. Product name/brand
2. Manufacturing date (MFG, MFD, Manufacture Date, Prod Date)
3. Expiry date (EXP, Expiry Date, Best Before, Use By)
4. Batch/Lot numbers
5. Any dates in various formats (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DDMMMYY like 05FEB26)

Return ONLY the raw text exactly as it appears, preserving line breaks and formatting. Do not add any explanations or additional text. If no text is found, return "NO_TEXT_FOUND".`;

    // Try each model in the fallback chain
    let lastError = null;

    for (const model of VISION_MODELS) {
      try {
        const response = await tryModel(model, base64Image, mimeType, prompt);

        // Extract the text from response
        let extractedText = response.data?.choices?.[0]?.message?.content;

        // Handle case where content might be an array (some models return structured content)
        if (Array.isArray(extractedText)) {
          extractedText = extractedText
            .map((item) => (typeof item === "string" ? item : item.text || ""))
            .join("\n");
        }

        if (!extractedText || String(extractedText).trim().length === 0) {
          console.warn(`⚠️ Model ${model} returned empty content, trying next...`);
          continue;
        }

        extractedText = String(extractedText).trim();

        if (extractedText === "NO_TEXT_FOUND") {
          console.log(`⚠️ Model ${model} found no text in image`);
          return "NO_TEXT_FOUND";
        }

        console.log(
          `✅ Product text extracted successfully with ${model} (${extractedText.length} chars)`,
        );
        console.log(
          `📝 Extracted text preview: ${extractedText.substring(0, 200)}...`,
        );

        return extractedText;
      } catch (modelError) {
        console.warn(`⚠️ Model ${model} failed: ${modelError.message}`);
        lastError = modelError;
        // Continue to next model
      }
    }

    // All models failed
    console.error("❌ All vision models failed");
    if (lastError) {
      throw lastError;
    }
    return "NO_TEXT_FOUND";
  } catch (error) {
    console.error(`❌ OpenRouter OCR Error:`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: JSON.stringify(error.response?.data || {}).substring(0, 500),
      message: error.message,
    });

    let errMsg = error.message;
    if (error.response?.data) {
      try {
        const responseData = typeof error.response.data === "string"
          ? JSON.parse(error.response.data)
          : error.response.data;
        if (responseData?.error?.message) {
          errMsg = responseData.error.message;
        }
      } catch (e) {}
    }

    if (error.response?.status === 401) {
      throw new Error(`Invalid OpenRouter API key. ${errMsg}`);
    } else {
      throw new Error(errMsg);
    }
  }
}

module.exports = {
  extractTextFromImage,
};
