// setupPrintifyWebhooks.js
const { ur } = require("@faker-js/faker");
const axios = require("axios");

// --------------------------------------------------------
// 1. CONFIGURATION (Replace these with your actual values)
// --------------------------------------------------------
const SHOP_ID = "XX"; // Find this in Printify URL or functions config
const FIREBASE_FUNCTION_URL = "https://us-central1-tryam-5bff4.cloudfunctions.net/handleProviderWebhook?source=printify";
// --------------------------------------------------------

async function registerWebhooks() {
  if (PRINTIFY_TOKEN === "YOUR_PRINTIFY_ACCESS_TOKEN") {
    console.error("❌ Error: Please replace the placeholders with your actual Printify Token and URL.");
    return;
  }

  const baseUrl = `https://api.printify.com/v1/shops/${SHOP_ID}/webhooks.json`;
  const headers = {
    "Authorization": `Bearer ${PRINTIFY_TOKEN}`,
    "Content-Type": "application/json"
  };

  try {
    console.log("🔍 Checking existing webhooks...");
    const existing = await axios.get(baseUrl, { headers });

    // ✅ UPDATED LIST BASED ON YOUR DOCS
    const topicsNeeded = [
      "order:sent-to-production",  // New: Track when making starts
      "order:shipment:created",    // Critical: Tracking Number
      "order:shipment:delivered"   // New: Final Delivery
    ];

    for (const topic of topicsNeeded) {
      // Check if this specific topic is already registered to our URL
      const isRegistered = existing.data.find(h => h.topic === topic && h.url === FIREBASE_FUNCTION_URL);

      if (isRegistered) {
        console.log(`✅ Already registered: ${topic}`);
        continue;
      }

      console.log(`🚀 Creating webhook for: ${topic}...`);
      try {
        await axios.post(baseUrl, {
          topic: topic,
          url: FIREBASE_FUNCTION_URL
        }, { headers });
        console.log(`✅ Success! Registered ${topic}`);
      } catch (err) {
        // If it fails, log why (e.g., validation failed)
        console.error(`❌ Failed to register ${topic}:`, err.response?.data || err.message);
      }
    }

    console.log("\n🎉 Webhook setup complete!");

  } catch (error) {
    console.error("❌ Script Error:", error.response?.data || error.message);
  }
}

const API_KEY = "XXXX"
const https = require('https');

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

console.log("Checking available Gemini models for your account...");

https.get(url, (res) => {
  let data = '';

  res.on('data', (chunk) => { data += chunk; });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);

      if (response.error) {
        console.error("Error from API:", response.error.message);
        return;
      }

      console.log("\n--- Available Models ---");
      response.models.forEach(model => {
        // Filter for models that support generating content
        if (model.supportedGenerationMethods.includes('generateContent')) {
          console.log(`ID: ${model.name.padEnd(40)} | Name: ${model.displayName}`);
        }
      });
      console.log("------------------------\n");

    } catch (e) {
      console.error("Failed to parse response:", e.message);
    }
  });

}).on('error', (err) => {
  console.error("Request failed:", err.message);
});