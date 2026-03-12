const functions = require("firebase-functions/v1");
const { defineJsonSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const axios = require("axios");
const Replicate = require("replicate");
const path = require("path");
const fs = require("fs");
const { StaticCanvas } = require("fabric/node");
const { registerFont } = require("canvas");
const Razorpay = require("razorpay");
const Stripe = require("stripe");
const { v4: uuidv4 } = require('uuid');
const { getDownloadURL } = require("firebase-admin/storage")
const handlebars = require("handlebars");
const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");
const { Resend } = require('resend');
const config = defineJsonSecret("FUNCTIONS_CONFIG_EXPORT");
// Initialize Admin
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// ------------------------------------------------------------------
// 📄 UTILS: Number to Words (Simple Implementation)
// ------------------------------------------------------------------
function numberToWords(amount, currency) {
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertGroup(n) {
    let str = "";
    if (n >= 100) { str += units[Math.floor(n / 100)] + " Hundred "; n %= 100; }
    if (n >= 20) { str += tens[Math.floor(n / 10)] + " "; n %= 10; }
    if (n >= 10) { str += teens[n - 10] + " "; n = 0; }
    if (n > 0) { str += units[n] + " "; }
    return str.trim();
  }

  // Basic implementation for MVP (Handling integers up to thousands)
  const integerPart = Math.floor(amount);
  const words = convertGroup(integerPart);

  const currencyName = currency === '$' ? "Dollars" : (currency === '₹' ? "Rupees" : "Units");
  return `${words} ${currencyName} Only`;
}

// ------------------------------------------------------------------
// 📄 HELPER: Generate Invoice (Updated for New Design)
// ------------------------------------------------------------------
async function generateInvoicePDF(orderData, itemsList) {
  try {
    const settingsDoc = await admin.firestore().collection('settings').doc('invoice').get();

    // Default fallback in case DB is empty
    const companyData = settingsDoc.exists ? settingsDoc.data() : {
      companyName: "TRYAM",
      address: "Default Address",
      gstin: "",
      phone: "+91 82170 37173",
      email: "tryam193@gmail.com",
    };

    const templateHtml = fs.readFileSync(path.join(__dirname, 'templates', 'invoice.html'), 'utf8');
    const template = handlebars.compile(templateHtml);

    // 1. Context & Currency
    const isIndia = orderData.shippingAddress.countryCode === 'IN';
    const documentTitle = isIndia ? "TAX INVOICE" : "RECEIPT";
    const currencyCode = (orderData.payment?.currency || "$");
    const currencyMap = { "IN": "₹", "US": "$", "GB": "£", "EU": "€", "CA": "C$" };
    const currencySymbol = currencyCode || currencyMap[orderData.shippingAddress.countryCode];

    // 2. Tax Logic
    const gstRate = 0.05;
    const halfRate = gstRate / 2;

    const processedItems = itemsList.map((item, index) => {
      const quantity = Number(item.quantity);
      const lineTotal = Number(item.price) * quantity;

      let ratePerItem = Number(item.price);
      let taxableTotal = lineTotal;
      let cgst = 0, sgst = 0;

      if (isIndia) {
        // Back-calculate: Price includes 5% GST
        // Taxable Value = Total / 1.05
        taxableTotal = lineTotal / (1 + gstRate);
        const taxableRate = taxableTotal / quantity;

        cgst = taxableTotal * halfRate;
        sgst = taxableTotal * halfRate;

        // For the table, we show the Taxable Rate
        ratePerItem = taxableRate;
      }

      const variantStr = item.variant ? `${item.variant.color || ''} ${item.variant.size || ''}`.trim() : '';

      return {
        slNo: index + 1,
        title: item.title,
        variant: variantStr,
        quantity: quantity,
        rate: ratePerItem.toFixed(2), // Unit Price (Taxable if India)
        amount: taxableTotal.toFixed(2), // Total Taxable Amount
        cgst: cgst.toFixed(2),
        sgst: sgst.toFixed(2)
      };
    });

    // 3. Totals
    const rawGrandTotal = itemsList.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);

    const subTotal = isIndia
      ? processedItems.reduce((acc, item) => acc + Number(item.amount), 0)
      : rawGrandTotal;

    const totalCGST = processedItems.reduce((acc, item) => acc + Number(item.cgst), 0);
    const totalSGST = processedItems.reduce((acc, item) => acc + Number(item.sgst), 0);

    // 🎁 NEW: Apply the Referral Discount if it exists
    let referralDiscountAmount = 0;
    let finalGrandTotal = rawGrandTotal;

    if (orderData.referralDiscountApplied) {
      referralDiscountAmount = 100;
      finalGrandTotal = Math.max(0, rawGrandTotal - referralDiscountAmount);
    }

    // 4. Words (Must use the FINAL total after discount)
    const amountInWords = numberToWords(finalGrandTotal, currencySymbol);

    const htmlData = {
      documentTitle,
      invoiceNumber: `INV-${orderData.groupId || orderData.orderId}`,
      date: new Date().toDateString(),

      // Seller Info (Your Company)
      companyName: companyData.companyName,
      companyAddress: companyData.address,
      companyGst: companyData.gstin,
      companyPhone: companyData.phone,
      companyEmail: companyData.email,

      // Buyer Info
      customerName: orderData.shippingAddress.fullName,
      customerAddress: orderData.shippingAddress.line1,
      customerCity: orderData.shippingAddress.city,
      customerZip: orderData.shippingAddress.zip,
      customerState: orderData.shippingAddress.state || "",
      customerCountry: orderData.shippingAddress.countryCode || "",
      customerGst: orderData.shippingAddress.gstNumber || null,

      // Data
      isIndia,
      currency: currencySymbol,
      items: processedItems,

      // Footer Stats
      subTotal: subTotal.toFixed(2),
      cgstTotal: totalCGST.toFixed(2),
      sgstTotal: totalSGST.toFixed(2),
      referralDiscount: referralDiscountAmount > 0 ? referralDiscountAmount.toFixed(2) : null, // 👈 Send to template
      grandTotal: finalGrandTotal.toFixed(2), // 👈 Send adjusted total
      amountInWords: amountInWords
    };

    const html = template(htmlData);

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html);
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    const bucket = admin.storage().bucket();
    const file = bucket.file(`invoices/INV-${orderData.groupId || orderData.orderId}.pdf`);

    await file.save(pdfBuffer, { metadata: { contentType: 'application/pdf' }, public: true });
    return file.publicUrl();

  } catch (error) {
    console.error("Invoice Gen Error:", error);
    return null;
  }
}

// ------------------------------------------------------------------
// 📧 UNIFIED EMAIL FUNCTION (Handles Confirmation, Invoice, & Friendly Delivery)
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// 📧 UNIFIED EMAIL FUNCTION (Handles Confirmation, Invoice, & Friendly Delivery)
// ------------------------------------------------------------------
async function sendInvoiceEmail(email, pdfUrl, isConsolidated, orderId, isIndia, customerName) {
  const docName = isIndia ? "Tax Invoice" : "Receipt";
  let subject = "";
  let htmlBody = "";
  let attachments = [];
  const resend = new Resend(config.value().resend?.key);

  // CASE 1: FRIENDLY DELIVERY (Online Order - No PDF)
  // Used when: Payment was already done online, just saying "It's here!"
  if (!pdfUrl) {
    subject = `Shipment Delivered 🚀`;
    htmlBody = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 12px; background-color: #ffffff;">

  <h2 style="color: #ea580c; margin-bottom: 12px;">
    Your Order Has Been Delivered 📦
  </h2>

  <p style="font-size: 15px; line-height: 1.6;">
    Hello ${customerName},
  </p>

  <p style="font-size: 15px; line-height: 1.6;">
    We’re happy to inform you that your order <strong>#${orderId}</strong> has been successfully delivered.
  </p>

  <p style="font-size: 15px; line-height: 1.6;">
    Every order we create is handled with care, and we truly hope you’re delighted with your custom design.
  </p>

  <p style="font-size: 15px; line-height: 1.6;">
    If you enjoyed your experience, we’d really appreciate you taking a moment to leave a review. Your feedback helps us improve and helps other customers make confident choices.
  </p>

  <div style="margin: 30px 0;">
    <a href="https://tryam193.com/orders/${orderId}"
       style="background-color: #1a1a1a; color: #ffffff; padding: 12px 22px; text-decoration: none; border-radius: 6px; font-size: 14px; display: inline-block; margin-right: 10px;">
      View Your Order
    </a>

    <a href="https://tryam193.com/orders/${orderId}"
       style="background-color: #ea580c; color: #ffffff; padding: 12px 22px; text-decoration: none; border-radius: 6px; font-size: 14px; display: inline-block;">
      Leave a Review
    </a>
  </div>

  <p style="font-size: 15px; line-height: 1.6;">
    If you have any questions, concerns, or need assistance, simply reply to this email — we’re always here to help.
  </p>

  <p style="font-size: 14px; color: #555; line-height: 1.6;">
    Thank you for choosing us and for trusting our work. Your support truly means a lot to us.
  </p>

  <p style="font-size: 14px; color: #555;">
    Warm regards,<br/>
    <strong>Team TRYAM</strong>
  </p>

</div> `;
  }

  // CASE 2: WITH PDF (Invoice or Receipt)
  else {
    // Setup Attachment
    attachments.push({
      filename: `${docName.replace(" ", "_")}.pdf`,
      path: pdfUrl
    });

    // Sub-Case A: ORDER CONFIRMATION (Online Purchase)
    // Used when: User just paid online.
    if (isConsolidated) {
      subject = `Order #${orderId} Confirmed! (${docName} Attached)`;
      htmlBody = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 12px; background-color: #ffffff;">

  <h2 style="color: #ea580c; margin-bottom: 12px;">
    Thank You for Your Order! 🧾
  </h2>

  <p style="font-size: 15px; line-height: 1.6;">
    Hello ${customerName},
  </p>

  <p style="font-size: 15px; line-height: 1.6;">
    We’re pleased to confirm that we’ve successfully received your order
    <strong>#${orderId}</strong>.
  </p>

  <p style="font-size: 15px; line-height: 1.6;">
    Since your payment was completed online, your official
    <strong>${docName}</strong> is attached to this email for your records.
  </p>

  <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />

  <p style="font-size: 15px; line-height: 1.6;">
    Our team has started processing your order. You’ll receive further updates
    as your items move through production and shipping.
  </p>

  <div style="margin: 28px 0;">
    <a href="https://tryam193.com/orders/${orderId}"
       style="background-color: #ea580c; color: #ffffff; padding: 12px 22px; text-decoration: none; border-radius: 6px; font-size: 14px; display: inline-block;">
      Track Your Order
    </a>
  </div>

  <p style="font-size: 15px; line-height: 1.6;">
    If you notice any issues or need assistance, you can report them directly
    from the Track Order page for faster resolution.
  </p>

  <p style="font-size: 14px; color: #555; line-height: 1.6;">
    Thank you for choosing us and for trusting our work.
  </p>

  <p style="font-size: 14px; color: #555;">
    Warm regards,<br/>
    <strong>Team TRYAM</strong>
  </p>

</div>

          `;
    }
    // Sub-Case B: COD DELIVERY (Payment collected, so send Invoice now)
    // Used when: COD order is marked as delivered.
    else {
      subject = `Shipment Delivered 📦 (${docName} Attached)`;
      htmlBody = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 12px; background-color: #ffffff;">

  <h2 style="color: #ea580c; margin-bottom: 12px;">
    Your Order Has Been Delivered 🚀
  </h2>

  <p style="font-size: 15px; line-height: 1.6;">
    Hello ${customerName},
  </p>

  <p style="font-size: 15px; line-height: 1.6;">
    We’re happy to let you know that your order
    <strong>#${orderId}</strong> has been successfully delivered.
  </p>

  <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 22px 0; border-left: 4px solid #ea580c;">
    <p style="margin: 0; font-size: 15px; line-height: 1.6;">
      Since this was a <strong>Cash on Delivery</strong> order and payment was completed upon delivery,
      your official <strong>${docName}</strong> is attached to this email for your records.
    </p>
  </div>

  <p style="font-size: 15px; line-height: 1.6;">
    We hope you’re happy with your custom product and that it meets your expectations.
  </p>

  <p style="font-size: 15px; line-height: 1.6;">
    If you enjoyed your experience, we’d truly appreciate it if you could take a moment to leave a review.
    Your feedback helps us improve and helps other customers make confident choices.
  </p>

  <div style="margin: 30px 0;">
    <a href="https://tryam193.com/orders/${orderId}"
       style="background-color: #1a1a1a; color: #ffffff; padding: 12px 22px; text-decoration: none; border-radius: 6px; font-size: 14px; display: inline-block;">
      View Your Order
    </a>
  </div>

  <p style="font-size: 15px; line-height: 1.6;">
    If you notice any issues with your order or need assistance, you can report them
    directly from your order page in the app or website.
  </p>

  <p style="font-size: 14px; color: #555; line-height: 1.6;">
    Thank you for choosing us and for your support.
  </p>

  <p style="font-size: 14px; color: #555;">
    Warm regards,<br/>
    <strong>Team TRYAM</strong>
  </p>

</div>`;
    }
  }

  try {
    // ⚠️ REMEMBER: Use 'onboarding@resend.dev' if testing, 'support@tryam193.com' if live.
    await resend.emails.send({
      from: 'TRYAM Support <support@tryam193.in>',
      to: email,
      subject: subject,
      html: htmlBody,
      attachments: attachments
    });
    console.log(`✅ Email sent to ${email} (Subject: ${subject})`);
  } catch (error) {
    console.error("❌ Resend Failed:", error);
  }
}

// ------------------------------------------------------------------
// 📧 EMAIL 2: COD ORDER (Simple Confirmation - No PDF)
// ------------------------------------------------------------------
// 💡 Call this function immediately when a COD order is placed
async function sendCODConfirmation(orderData) {
  const email = orderData.shippingAddress.email;
  const orderId = orderData.orderId || orderData.groupId;
  const customerName = orderData.shippingAddress.fullName.split(" ")[0];
  const resend = new Resend(config.value().resend?.key);

  const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 12px; background-color: #ffffff;">

  <h2 style="color: #ea580c; margin-bottom: 12px;">
    Order Confirmed – Cash on Delivery 🚚
  </h2>

  <p style="font-size: 15px; line-height: 1.6;">
    Hi ${customerName},
  </p>

  <p style="font-size: 15px; line-height: 1.6;">
    We’re happy to confirm your <strong>Cash on Delivery</strong> order
    <strong>#${orderId}</strong>.
  </p>

  <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 22px 0;">
    <p style="margin: 0; font-size: 14px; font-weight: bold;">
      Amount to Pay on Delivery
    </p>
    <h3 style="margin: 6px 0 0 0; color: #111;">
      ₹${orderData.price * orderData.quantity - (orderData.referralDiscountApplied ? 100 : 0)}
  </div>

  <p style="font-size: 14px; color: #555; line-height: 1.6;">
    Please keep the exact amount ready at the time of delivery for a smooth handover.
  </p>

  <p style="font-size: 14px; color: #555; line-height: 1.6;">
    Your tax invoice will be generated and emailed to you once the order has been
    successfully delivered.
  </p>

  <div style="margin: 28px 0;">
    <a href="http://localhost:5173/orders/${orderId}"
       style="background-color: #ea580c; color: #ffffff; padding: 12px 22px; text-decoration: none; border-radius: 6px; font-size: 14px; display: inline-block;">
      View Order Details
    </a>
  </div>

  <p style="font-size: 14px; line-height: 1.6;">
    You can view order updates or report any issues directly from your order page.
  </p>

  <p style="font-size: 14px; color: #555;">
    Thank you for placing your order with us.
  </p>

  <p style="font-size: 14px; color: #555;">
    Warm regards,<br/>
    <strong>Team TRYAM</strong>
  </p>

</div>

    `;

  try {
    await resend.emails.send({
      from: 'TRYAM Support <support@tryam193.in>',
      to: email,
      subject: `Order #${orderId} Confirmed (COD)`,
      html: htmlBody
      // ❌ No attachments for COD yet
    });
    console.log(`✅ COD Confirmation sent to ${email}`);
  } catch (error) {
    console.error("❌ Resend COD Failed:", error);
  }
}

// ------------------------------------------------------------------
// 🧩 PRINTIFY HELPER FUNCTIONS
// ------------------------------------------------------------------
async function getPrintifyVariantId(blueprintId, providerId, sizeName, colorName) {
  const API_TOKEN = config.value().printify?.token;
  try {
    const res = await axios.get(`https://api.printify.com/v1/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json`, {
      headers: { 'Authorization': `Bearer ${API_TOKEN}` }
    });
    const variants = res.data.variants;
    const match = variants.find(v => {
      let vSize = "";
      if (v.options && v.options.size) vSize = v.options.size;
      else if (v.title) {
        const parts = v.title.split(' / ');
        if (parts.length > 1) vSize = parts[parts.length - 1].trim();
      }
      if (vSize.toUpperCase() !== sizeName.toUpperCase()) return false;

      if (v.options && v.options.color) {
        const vColor = v.options.color.toLowerCase();
        const myColor = colorName.toLowerCase();
        if (vColor === myColor || vColor.includes(myColor) || myColor.includes(vColor)) return true;
      }
      return false;
    });
    return match ? match.id : null;
  } catch (error) {
    console.error("Printify Variant Error:", error.message);
    return null;
  }
}

async function deletePrintifyProduct(shopId, productId) {
  const token = config.value().printify?.token;
  try {
    await axios.delete(`https://api.printify.com/v1/shops/${shopId}/products/${productId}.json`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`🗑️ Deleted temp mockup product: ${productId}`);
  } catch (error) {
    console.error("Failed to delete temp product:", error.message);
  }
}
// ------------------------------------------------------------------
// 🛠️ UPDATED PRINTIFY HELPERS
// ------------------------------------------------------------------

// 1. IMPROVED POLLING: Waits for Lifestyle Images
async function waitForPrintifyImages(shopId, productId, token, maxRetries = 15) {
  let attempt = 0;
  let lastImageCount = 0;
  let stabilityCount = 0; // How many times the count hasn't changed

  while (attempt < maxRetries) {
    try {
      console.log(`⏳ Polling Printify Product ${productId} (Attempt ${attempt + 1}/${maxRetries})...`);

      const res = await axios.get(`https://api.printify.com/v1/shops/${shopId}/products/${productId}.json`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const images = res.data.images || [];
      const count = images.length;

      // SUCCESS CRITERIA:
      // 1. We have 3 or more images (Front + Back + At least 1 Lifestyle)
      if (count >= 3) {
        console.log(`✅ Detected ${count} images (Lifestyle included!)`);
        return images;
      }

      // 2. STABILITY CHECK:
      // If we have some images (e.g. 2), but the count hasn't changed for 3 checks, 
      // Printify might simply not have any more for this specific item.
      if (count > 0 && count === lastImageCount) {
        stabilityCount++;
        if (stabilityCount >= 3) {
          console.log(`⚠️ Image count stable at ${count} for 3 checks. Returning what we have.`);
          return images;
        }
      } else {
        stabilityCount = 0; // Reset if count changed (images are still loading)
      }

      lastImageCount = count;

    } catch (e) {
      console.warn(`⚠️ Polling error: ${e.message}`);
    }

    // Wait 2 seconds (Lifestyle images take time to render)
    await new Promise(resolve => setTimeout(resolve, 2000));
    attempt++;
  }

  // If we timed out but found some images (e.g., just the 2 front/back), return them 
  // so the user at least sees something.
  if (lastImageCount > 0) {
    console.log(`⚠️ Polling timed out. Returning ${lastImageCount} images found.`);
    // We need to fetch one last time to get the array, or ideally we should have stored it.
    // For simplicity in this flow, we'll try one last fetch:
    try {
      const finalRes = await axios.get(`https://api.printify.com/v1/shops/${shopId}/products/${productId}.json`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return finalRes.data.images || [];
    } catch (e) { return null; }
  }

  return null;
}


// 2. UPDATED GENERATOR: Forces "Generate" Endpoint
// ------------------------------------------------------------------
// ☁️ HELPER: Upload URL to Firebase Storage (Permanent Hosting)
// ------------------------------------------------------------------
async function uploadToFirebase(imageUrl, filePath) {
  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);

    // 1. Check if already exists (optional optimization)
    const [exists] = await file.exists();
    if (exists) return await getDownloadURL(file);

    // 2. Download Image
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');

    // 3. Upload to Firebase
    await file.save(buffer, {
      metadata: { contentType: 'image/png' },
      public: true // Make public so frontend can see it
    });

    // 4. Get Permanent URL
    return await getDownloadURL(file);

  } catch (error) {
    console.error(`Upload failed for ${filePath}:`, error.message);
    return null; // Fail gracefully
  }
}

// ------------------------------------------------------------------
// 🛠️ UPDATED GENERATOR: With Firebase Upload & Smart Filtering
// ------------------------------------------------------------------
async function getMockupsFromPrintify(item, printFiles, orderId) {
  const shopId = config.value().printify?.shop_id;
  const token = config.value().printify?.token;
  const map = item.vendor_maps?.printify || { blueprint_id: 12, print_provider_id: 29 };

  // Detect Product Type for better filtering
  const isMug = item.title.toLowerCase().includes("mug");
  const isTote = item.title.toLowerCase().includes('tote');
  const isHoodie = item.title.toLowerCase().includes('hoodie');

  let tempProductId = null;

  try {
    // A. UPLOAD RAW DESIGNS TO PRINTIFY (Same as before)
    const frontImageId = printFiles.front ? await uploadPrintifyImage(printFiles.front) : null;
    const backImageId = printFiles.back ? await uploadPrintifyImage(printFiles.back) : null;

    const placeholders = [];
    if (frontImageId) placeholders.push({ position: "front", images: [{ id: frontImageId, x: 0.5, y: 0.5, scale: 1, angle: 0 }] });
    if (backImageId && !isMug) placeholders.push({ position: "back", images: [{ id: backImageId, x: 0.5, y: 0.5, scale: 1, angle: 0 }] });

    // Get Variant
    let variantId = await getPrintifyVariantId(map.blueprint_id, map.print_provider_id, 'L', item.variant.color);
    if (isMug) variantId = map.variant_id;
    if (isTote) variantId = 101409;
    if (!variantId) variantId = await getPrintifyVariantId(map.blueprint_id, map.print_provider_id, "L", "Black") ||
      await getPrintifyVariantId(map.blueprint_id, map.print_provider_id, "L", "White");
    if (!variantId) throw new Error("No variant found");

    // B. CREATE TEMP PRODUCT
    console.log("Creating Temp Product for Mockups...");
    const createRes = await axios.post(`https://api.printify.com/v1/shops/${shopId}/products.json`, {
      title: "TEMP_MOCKUP_" + Date.now(),
      description: "Mockup Gen",
      blueprint_id: Number(map.blueprint_id),
      print_provider_id: Number(map.print_provider_id),
      variants: [{ id: variantId, price: 1000, is_enabled: true }],
      print_areas: [{ variant_ids: [variantId], placeholders: placeholders }]
    }, { headers: { 'Authorization': `Bearer ${token}` } });

    tempProductId = createRes.data.id;

    // C. TRIGGER GENERATION
    try {
      await axios.post(`https://api.printify.com/v1/shops/${shopId}/products/${tempProductId}/mockups/generate.json`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) { console.warn("Gen trigger warning:", e.message); }

    // D. WAIT FOR IMAGES
    const validImages = await waitForPrintifyImages(shopId, tempProductId, token);
    if (!validImages || validImages.length === 0) throw new Error("Mockup timeout");

    // ==================================================================
    // 🧠 E. SMART SELECTION & UPLOAD (The New Logic)
    // ==================================================================

    // We want to limit storage usage. Let's pick max 5-6 best images.
    // Categories we want: Front, Back, Person(Front/Back), Folded/Hanging/Lifestyle

    let selectedMockups = {
      front: null,
      back: null,
      gallery: []
    };

    // Helper to find image by analyzing src or position
    // Note: Printify doesn't explicitly label "folded", so we look for visual variance or specific keywords if available
    const candidates = {
      front: validImages.find(img => img.position === 'front' && img.is_default),
      back: validImages.find(img => img.position === 'back'),
      person_front: validImages.find(img => img.position === 'front' && !img.is_default && img.src.includes('person')),
      person_back: validImages.find(img => img.position === 'back' && !img.is_default && img.src.includes('person')),
      lifestyle: validImages.find(img => img.src.includes('lifestyle') || img.src.includes('context')),
      other: validImages.filter(img => !img.is_default).slice(0, 3) // Fallback: Take first 3 other images
    };

    // 1. Assign Main Front/Back
    const mainFront = candidates.front || validImages[0];
    const mainBack = candidates.back; // Might be null if mug/poster

    // 2. Build Upload List (Array of promises)
    const uploadTasks = [];
    const timestamp = Date.now();
    const basePath = `orders/${orderId}`;

    // --> Push Front
    if (mainFront) {
      uploadTasks.push(uploadToFirebase(mainFront.src, `${basePath}/front.png`).then(url => selectedMockups.front = url));
    }

    // --> Push Back
    if (mainBack) {
      uploadTasks.push(uploadToFirebase(mainBack.src, `${basePath}/back.png`).then(url => selectedMockups.back = url));
    }

    // --> Push Gallery (Folding, Person, Lifestyle, etc.)
    // We iterate through validImages and pick unique ones to fill the gallery
    // We skip the ones we already used for main front/back
    const usedSrcs = new Set([mainFront?.src, mainBack?.src]);
    let galleryCount = 0;
    const MAX_GALLERY = 4; // Cost effective limit

    for (const img of validImages) {
      if (usedSrcs.has(img.src)) continue;
      if (galleryCount >= MAX_GALLERY) break;

      // Simple heuristic: Try to get 'person' or 'context' images first if available
      // otherwise just take the next available image to ensure we have *something*

      const fileName = `gallery_${galleryCount}.png`;
      uploadTasks.push(
        uploadToFirebase(img.src, `${basePath}/${fileName}`).then(url => {
          if (url) selectedMockups.gallery.push(url);
        })
      );

      usedSrcs.add(img.src);
      galleryCount++;
    }

    // 3. Execute All Uploads in Parallel (Fast!)
    console.log(`☁️ Uploading ${uploadTasks.length} mockups to Firebase...`);
    await Promise.all(uploadTasks);

    // F. DELETE TEMP PRODUCT
    await deletePrintifyProduct(shopId, tempProductId);

    return selectedMockups;

  } catch (error) {
    console.error("❌ Mockup Gen Failed:", error.message);
    if (tempProductId) await deletePrintifyProduct(shopId, tempProductId);
    // Fallback: Return the raw print files if generation failed
    return { front: printFiles.front, back: printFiles.back, gallery: [] };
  }
}

async function uploadPrintifyImage(imageUrl) {
  const API_TOKEN = config.value().printify?.token;
  const res = await axios.post(`https://api.printify.com/v1/uploads/images.json`, {
    "file_name": "ai_design.png", "url": imageUrl
  }, { headers: { 'Authorization': `Bearer ${API_TOKEN}` } });
  return res.data.id;
}

async function createPrintifyProduct(shopId, blueprintId, providerId, variantId, printFiles) {
  const API_TOKEN = config.value().printify?.token;

  const frontImageId = printFiles.front ? await uploadPrintifyImage(printFiles.front) : null;
  const backImageId = printFiles.back ? await uploadPrintifyImage(printFiles.back) : null;
  const placeholders = [];

  if (frontImageId) placeholders.push({ position: "front", images: [{ id: frontImageId, x: 0.5, y: 0.5, scale: 1, angle: 0 }] });
  if (backImageId) placeholders.push({ position: "back", images: [{ id: backImageId, x: 0.5, y: 0.5, scale: 1, angle: 0 }] });

  const productPayload = {
    title: "Order-" + Date.now(),
    description: "AI Custom",
    blueprint_id: Number(blueprintId),
    print_provider_id: Number(providerId),
    variants: [{ id: variantId, price: 2000, is_enabled: true }],
    print_areas: [{ variant_ids: [variantId], placeholders }]
  };

  const res = await axios.post(`https://api.printify.com/v1/shops/${shopId}/products.json`, productPayload, {
    headers: { 'Authorization': `Bearer ${API_TOKEN}` }
  });
  return res.data;
}

// ------------------------------------------------------------------
// 🚀 1. SEND TO PRINTIFY (With Placeholder Date)
// ------------------------------------------------------------------
async function sendToPrintify(orderData, processedItems) {
  const shopId = config.value().printify?.shop_id;
  const token = config.value().printify?.token;

  const line_items = [];

  // Loop through items to prepare the order payload
  for (const item of processedItems) {
    const map = item.vendor_maps.printify;
    const colorName = item.variant?.color || item.selectedColor;
    const sizeName = item.variant?.size || item.selectedSize;

    // 1. Get Variant ID
    let catalogVariantId;
    if (item.title.toLowerCase().includes('mug')) catalogVariantId = map.variant_id; // If you hardcoded mugs
    else if (item.productId.toLowerCase().includes('tote')) catalogVariantId = map.variant_id?.[colorName];
    else catalogVariantId = await getPrintifyVariantId(map.blueprint_id, map.print_provider_id, sizeName, colorName);

    if (!catalogVariantId) throw new Error(`Printify Variant not found for ${item.title} (${colorName}/${sizeName})`);

    // 2. Create the Product on Printify (To attach the custom design)
    // Note: We use the 'printFiles' attached to the item
    const createdProduct = await createPrintifyProduct(
      shopId,
      map.blueprint_id,
      map.print_provider_id,
      catalogVariantId,
      item.printFiles
    );

    // 3. Add to Line Items
    line_items.push({
      product_id: createdProduct.id,
      variant_id: catalogVariantId,
      quantity: item.quantity
    });
  }

  // 4. Send the Final Order
  const payload = {
    external_id: orderData.orderId,
    line_items: line_items, // Now contains ALL items
    shipping_method: 1,
    send_shipping_notification: false,
    address_to: {
      first_name: orderData.shippingAddress.fullName.split(" ")[0],
      last_name: orderData.shippingAddress.fullName.split(" ")[1] || ".",
      email: orderData.shippingAddress.email,
      phone: orderData.shippingAddress.phone || "",
      country: orderData.shippingAddress.countryCode,
      region: orderData.shippingAddress.stateCode || "",
      address1: orderData.shippingAddress.line1,
      city: orderData.shippingAddress.city,
      zip: orderData.shippingAddress.zip
    }
  };

  try {
    const res = await axios.post(`https://api.printify.com/v1/shops/${shopId}/orders.json`, payload, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    // Calc Date
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + 10);

    return {
      id: res.data.id,
      provider: 'printify',
      estimatedDelivery: estimatedDate.toISOString(),
      trackingUrl: null
    };
  } catch (error) {
    throw new Error("Printify Order Failed: " + (error.response?.data?.message || error.message));
  }
}

// ------------------------------------------------------------------
// 🚀 2. SEND TO GELATO (With Real Dates)
// ------------------------------------------------------------------
async function sendToGelato(orderData, processedItems) {
  const apiKey = config.value().gelato.key;
  const countryCode = orderData.shippingAddress.countryCode;

  const gelatoItems = processedItems.map(item => {
    const map = item.vendor_maps.gelato;

    // Determine Print Code
    let printCode = "4-0";
    if (item.printFiles.front && item.printFiles.back) printCode = "4-4";
    else if (!item.printFiles.front && item.printFiles.back) printCode = "0-4";

    // Codes
    const userColor = item.variant?.color || item.selectedColor;
    let colorCode = map.color_map?.[userColor] || userColor.toLowerCase().replace(/ /g, "-");
    const sizeCode = (item.variant?.size || item.selectedSize).toLowerCase();

    // UID Construction
    let finalProductUid = map.uid_template || map.product_uid;
    finalProductUid = finalProductUid
      .replace("{size}", sizeCode)
      .replace("{color}", colorCode)
      .replace("{print_code}", printCode);

    // Files
    const filesArray = [];
    if (item.printFiles.front) filesArray.push({ type: "default", url: item.printFiles.front });
    if (item.printFiles.back) filesArray.push({ type: "back", url: item.printFiles.back });

    return {
      itemReferenceId: item.cartId || uuidv4(),
      productUid: finalProductUid,
      quantity: item.quantity,
      files: filesArray
    };
  });

  const payload = {
    orderType: "order",
    orderReferenceId: orderData.orderId,
    customerReferenceId: orderData.userId,
    currency: "USD",
    items: gelatoItems, // ✅ ALL items here
    shippingAddress: {
      first_name: orderData.shippingAddress.fullName.split(" ")[0],
      lastName: orderData.shippingAddress.fullName.split(" ")[1] || ".",
      country_code: countryCode,
      addressLine1: orderData.shippingAddress.line1,
      city: orderData.shippingAddress.city,
      postCode: orderData.shippingAddress.zip,
      email: orderData.shippingAddress.email,
      phone: orderData.shippingAddress.phone
    },
  };
  try {
    const res = await axios.post("https://order.gelatoapis.com/v4/orders", payload, {
      headers: { "X-API-KEY": apiKey }
    });
    // ... return success object ...
    return {
      id: res.data.id,
      provider: 'gelato',
      estimatedDate: res.data.shipment.maxDeliveryDate,
      trackingUrl: null
    }
  } catch (e) { throw new Error(e.message) }
}

// ------------------------------------------------------------------
// 🚀 3. SEND TO QIKINK (With Placeholder Date)
// ------------------------------------------------------------------
const QIKINK_BASE_URL = "https://sandbox.qikink.com";

async function getQikinkAccessToken() {
  const clientId = config.value().qikink?.client_id;
  const clientSecret = config.value().qikink?.client_secret;

  const params = new URLSearchParams();
  params.append('ClientId', clientId);
  params.append('client_secret', clientSecret);
  const res = await axios.post(`${QIKINK_BASE_URL}/api/token`, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return res.data.Accesstoken;
}

async function sendToQikink(orderData, processedItems) {
  const token = await getQikinkAccessToken();
  const clientId = config.value().qikink?.client_id;

  const qikinkLineItems = [];

  for (const item of processedItems) {
    const map = item.vendor_maps.qikink;
    const colorName = item.variant?.color || item.selectedColor;
    const sizeName = item.variant?.size || item.selectedSize;
    const isMug = item.title.toLowerCase().includes('mug')

    // Construct SKU
    const finalSku = isMug || item.title.toLowerCase().includes('tote')
      ? map.product_id // Handle special Mug logic if needed
      : `${map.product_id}-${map.color_map[colorName]}-${sizeName}`;

    const cleanOrderId = orderData.orderId.replace("ORD-", "").substring(0, 15);

    // Designs
    const designs = [];
    if (item.printFiles.front) {
      designs.push({
        design_code: `${cleanOrderId}_fr`, // Unique Code per item
        placement_sku: "fr",
        width_inches: "10",
        height_inches: "12",
        design_link: item.printFiles.front,
        mockup_link: item.mockupFiles?.front
      });
    }
    if (item.printFiles.back) {
      designs.push({
        design_code: `${cleanOrderId}_${item.cartId}_bk`,
        placement_sku: "bk",
        width_inches: "10",
        height_inches: "12",
        design_link: item.printFiles.back,
        mockup_link: item.mockupFiles?.back
      });
    }

    // 🧮 CALCULATE EXACT PRICE PAID FOR THIS SPLIT ORDER
    const lineItemTotal = item.payment?.total ?? (Number(item.price) * Number(item.quantity));
    const unitPrice = (lineItemTotal / Math.max(1, item.quantity)).toFixed(2);

    qikinkLineItems.push({
      search_from_my_products: 0,
      print_type_id: isMug ? 5 : 1,
      quantity: item.quantity,
      sku: finalSku,
      price: unitPrice.toString(), // 👈 Send the exact discounted unit price
      designs: designs
    });
  }

  const orderTotal = orderData.payment?.total ?? 0;
  const paymentGateway = (orderData.payment?.method === 'cod' || orderData.isCod) ? "COD" : "Prepaid";

  const payload = {
    order_number: orderData.orderId,
    qikink_shipping: "1",
    gateway: paymentGateway,
    total_order_value: orderTotal.toString(),
    shipping_address: {
      first_name: orderData.shippingAddress.fullName.split(" ")[0],
      last_name: orderData.shippingAddress.fullName.split(" ")[1] || ".",
      address1: orderData.shippingAddress.line1,
      city: orderData.shippingAddress.city,
      zip: orderData.shippingAddress.zip,
      province: orderData.shippingAddress.stateCode,
      country_code: "IN",
      phone: orderData.shippingAddress.phone || "9999999999",
      email: orderData.shippingAddress.email
    },
    line_items: qikinkLineItems // ✅ ALL items here
  };

  const res = await axios.post(`${QIKINK_BASE_URL}/api/order/create`, payload, {
    headers: { 'ClientId': clientId, 'Accesstoken': token, 'Content-Type': 'application/json' }
  });

  // ... (Handle response parsing same as before) ...
  let responseData = res.data;
  // ... parse messy JSON string if needed ...

  if (responseData && responseData.order_id) {
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + 7);
    return {
      id: responseData.order_id.toString(),
      provider: 'qikink',
      estimatedDelivery: estimatedDate.toISOString(),
      trackingUrl: null
    };
  } else {
    throw new Error("No Order ID in Qikink response");
  }
}

// ------------------------------------------------------------------
// 📡 4. WEBHOOK HANDLER (THE LISTENER)
// ------------------------------------------------------------------
exports.handleProviderWebhook = functions.https.onRequest(async (req, res) => {
  const source = req.query.source;
  const body = req.body;

  console.log(`🔔 Webhook received from ${source} [${body.type || body.event}]`);

  try {
    // 🛡️ 1. SAFETY: Handle Printify "Ping"
    if (body.type === 'ping' || (source === 'printify' && !body.resource)) {
      console.log("✅ Printify Ping received. Responding 200.");
      return res.status(200).send("Pong");
    }

    let firestoreOrderRef = null;
    let newStatus = "";
    let trackingData = {};

    // ------------------------------------------------------
    // A. HANDLE PRINTIFY EVENTS
    // ------------------------------------------------------
    if (source === 'printify') {
      const eventType = body.type;
      const printifyOrderId = body.resource.id;

      // Find Order via Provider ID
      const snapshot = await db.collection('orders')
        .where('providerOrderId', '==', printifyOrderId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        console.warn(`⚠️ No order found with providerOrderId: ${printifyOrderId}`);
        return res.status(200).send("Order not found, skipping");
      }

      firestoreOrderRef = snapshot.docs[0].ref;

      if (eventType === 'order:sent-to-production') {
        newStatus = 'production';
      } else if (eventType === 'order:shipment:created') {
        newStatus = 'shipped';
        const carrier = body.resource.data?.carrier;
        trackingData = {
          trackingCode: carrier?.tracking_number,
          trackingUrl: carrier?.tracking_url,
          carrierName: carrier?.code
        };
      } else if (eventType === 'order:shipment:delivered') {
        newStatus = 'delivered';
        const data = body.resource.data;
        trackingData = { deliveredAt: data?.delivered_at || new Date().toISOString() };
      }
    }

    // ------------------------------------------------------
    // B. HANDLE GELATO EVENTS
    // ------------------------------------------------------
    else if (source === 'gelato') {
      if (body.event === 'shipment_dispatched') {
        const gelatoId = body.orderReferenceId;
        firestoreOrderRef = db.collection('orders').doc(gelatoId);
        newStatus = 'shipped';
        trackingData = {
          trackingCode: body.fulfillmentPackage?.trackingCode,
          trackingUrl: body.fulfillmentPackage?.trackingUrl
        };
      }
      // Note: Add Gelato 'delivered' event check here if they provide one
    }

    // ------------------------------------------------------
    // C. UPDATE DATABASE & HANDLE COD INVOICE
    // ------------------------------------------------------
    if (firestoreOrderRef && newStatus) {
      console.log(`📝 Updating Order to '${newStatus}'`);

      const docSnap = await firestoreOrderRef.get();
      const orderData = docSnap.data();

      // 1. Prepare Updates
      const updates = { status: newStatus };
      if (trackingData.trackingCode) {
        updates['providerData.trackingCode'] = trackingData.trackingCode;
        updates['providerData.trackingUrl'] = trackingData.trackingUrl;
        updates['providerData.carrier'] = trackingData.carrierName;
      }
      if (trackingData.deliveredAt) {
        updates['deliveredAt'] = trackingData.deliveredAt;
      }

      await firestoreOrderRef.update(updates);
    }

    res.status(200).send("Webhook Processed");

  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(200).send("Error logged");
  }
});


// ------------------------------------------------------------------
// 🔄 5. REFRESH STATUS (For Qikink / Backup)
// ------------------------------------------------------------------
exports.refreshOrderStatus = functions
  .runWith({ secrets: ["FUNCTIONS_CONFIG_EXPORT"] })
  .https.onCall(async (data, context) => {
    const { orderId } = data;
    if (!orderId) throw new functions.https.HttpsError('invalid-argument', 'Missing orderId');

    const orderRef = db.collection('orders').doc(orderId);
    const doc = await orderRef.get();
    if (!doc.exists) throw new functions.https.HttpsError('not-found', 'Order not found');

    const order = doc.data();

    // LOGIC FOR QIKINK REFRESH
    if (order.provider === 'qikink') {
      const token = await getQikinkAccessToken();
      const clientId = config.value().qikink?.client_id;

      try {
        // NOTE: Using the generic Qikink "Get Order Status" call (adjust endpoint if needed)
        const res = await axios.get(`${QIKINK_BASE_URL}/api/order/status?order_number=${order.providerOrderId}`, {
          headers: { 'ClientId': clientId, 'Accesstoken': token }
        });

        // Map Qikink Status to Our Status
        const qStatus = res.data.status?.toLowerCase(); // e.g. "shipped", "dispatched"
        let newStatus = order.status;
        let trackingUrl = order.providerData?.trackingUrl;

        if (qStatus.includes('ship') || qStatus.includes('dispatch')) {
          newStatus = 'shipped';
          trackingUrl = res.data.tracking_link || trackingUrl;
        } else if (qStatus.includes('deliver')) {
          newStatus = 'delivered';
        }

        if (newStatus !== order.status) {
          await orderRef.update({
            status: newStatus,
            'providerData.trackingUrl': trackingUrl
          });
          return { success: true, updated: true, newStatus };
        }
      } catch (e) {
        console.error("Qikink Refresh Failed:", e);
      }
    }

    return { success: true, updated: false };
  });


// ------------------------------------------------------------------
// 🎨 SERVER SIDE RENDERING & BOT
// ------------------------------------------------------------------
const PRODUCT_DIMENSIONS = {
  // 👕 T-SHIRTS (Standard)
  "men-classic-tee": {
    canvas: { w: 420, h: 560 },
    print: { front: { w: 4500, h: 5400 }, back: { w: 4500, h: 5400 } }
  },
  "women-classic-tee": {
    canvas: { w: 420, h: 560 },
    print: { front: { w: 4000, h: 4800 }, back: { w: 4000, h: 4800 } }
  },

  // 👕 OVERSIZED TEES
  "unisex-oversized-tee": {
    canvas: { w: 420, h: 560 },
    print: { front: { w: 4500, h: 5400 }, back: { w: 4500, h: 5400 } }
  },

  // 🧥 HOODIES
  "unisex-hoodie": {
    canvas: { w: 420, h: 500 },
    print: { front: { w: 4000, h: 2750 }, back: { w: 4500, h: 5400 } }
  },

  // ☕ MUGS
  "mug-ceramic-11oz": {
    canvas: { w: 800, h: 300 },
    print: { front: { w: 2700, h: 1100 } } // Wrap-around print
  },

  // 👜 TOTE BAGS
  "tote-bag-canvas": {
    canvas: { w: 380, h: 380 },
    print: { front: { w: 3000, h: 3000 }, back: { w: 3000, h: 3000 } }
  }
};

const FONTS = {
  "Roboto": { bold: true, italic: true },
  "Open Sans": { bold: true, italic: true },
  "Montserrat": { bold: true, italic: true },
  "Lato": { bold: true, italic: true },
  "Poppins": { bold: true, italic: true },
  "Oswald": { bold: true, italic: false }, // Variable weight, usually no italic in standard set
  "Raleway": { bold: true, italic: true },
  "Playfair Display": { bold: true, italic: true },
  "Merriweather": { bold: true, italic: true },
  "Roboto Slab": { bold: true, italic: false },
  "Lora": { bold: true, italic: true },
  "Abril Fatface": { bold: false, italic: false },
  "Arvo": { bold: true, italic: false },
  "Dancing Script": { bold: true, italic: false }, // Bold works for headers
  "Pacifico": { bold: false, italic: false },
  "Great Vibes": { bold: false, italic: false },
  "Satisfy": { bold: false, italic: false },
  "Yellowtail": { bold: false, italic: false },
  "Caveat": { bold: true, italic: false },
  "Shadows Into Light": { bold: false, italic: false },
  "Indie Flower": { bold: false, italic: false },
  "Permanent Marker": { bold: false, italic: false },
  "Bangers": { bold: false, italic: false },
  "Anton": { bold: false, italic: false },
  "Lobster": { bold: false, italic: false },
  "Righteous": { bold: false, italic: false },
  "Fredoka": { bold: true, italic: false },
  "Chewy": { bold: false, italic: false },
  "Amatic SC": { bold: true, italic: false },
  "Bebas Neue": { bold: false, italic: false },
  "Reggae One": { bold: false, italic: false }
}


const loadFonts = () => {
  const fontsDir = path.join(__dirname, "fonts");

  Object.entries(FONTS).forEach(([family, config]) => {
    // A. Always register Regular
    const regularPath = path.join(fontsDir, family, `${family}-Regular.ttf`);
    registerFont(regularPath, { family: family });

    // B. Register Bold if enabled
    if (config.bold) {
      const boldPath = path.join(fontsDir, family, `${family}-Bold.ttf`);
      registerFont(boldPath, { family: family, weight: "bold" });
    }

    // C. Register Italic if enabled
    if (config.italic) {
      const italicPath = path.join(fontsDir, family, `${family}-Italic.ttf`);
      registerFont(italicPath, { family: family, style: "italic" });
    }

    // D. Register BoldItalic if BOTH are enabled
    if (config.bold && config.italic) {
      const boldItalicPath = path.join(fontsDir, family, `${family}-BoldItalic.ttf`);
      registerFont(boldItalicPath, { family: family, weight: "bold", style: "italic" });
    }
  });

  console.log("✅ All fonts registered successfully!");
};

// ------------------------------------------------------------------
// 1. HELPER: Fetch Image & Convert to Base64
// ------------------------------------------------------------------
const fetchImageAsBase64 = async (url) => {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000
    });
    const buffer = Buffer.from(response.data, 'binary');
    const contentType = response.headers['content-type'] || 'image/png';
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error(`⚠️ Image Download Failed: ${url.substring(0, 50)}...`);
    return null;
  }
};

// ------------------------------------------------------------------
// 2. HELPER: Recursive JSON Processor (The Missing Function!)
// ------------------------------------------------------------------
// This digs into groups to find images and swap URLs for Base64
async function processCanvasObjects(objects) {
  if (!objects || !Array.isArray(objects)) return [];

  const promises = objects.map(async (obj) => {
    if (!obj) return null;

    // Clone to avoid mutating original if needed
    // let newObj = { ...obj }; 
    let newObj = obj;

    // A. RECURSION: If it's a Group, dive into its objects
    if (newObj.type === 'group' && Array.isArray(newObj.objects)) {
      newObj.objects = await processCanvasObjects(newObj.objects);
      return newObj;
    }

    // B. IMAGE PROCESSING: Swap URL for Base64
    // We check for both 'image' and 'Image' to be safe
    const type = (newObj.type || '').toLowerCase();

    if (type === 'image') {
      // Priority: High-Res Print Source > Standard Source
      let urlToLoad = newObj.print_src || newObj.src;

      // Scaling Logic for High-Res swap
      if (newObj.print_src && newObj.originalWidth && newObj.originalHeight) {
        const scaleXRatio = newObj.width / newObj.originalWidth;
        const scaleYRatio = newObj.height / newObj.originalHeight;
        newObj.scaleX = (newObj.scaleX || 1) * scaleXRatio;
        newObj.scaleY = (newObj.scaleY || 1) * scaleYRatio;
        newObj.width = newObj.originalWidth;
        newObj.height = newObj.originalHeight;
      }

      // Download & Convert
      if (urlToLoad && urlToLoad.startsWith('http')) {
        const base64 = await fetchImageAsBase64(urlToLoad);
        if (base64) {
          newObj.src = base64; // ✅ Replaced!
        } else {
          console.warn(`❌ Removing failed image object (${newObj.type})`);
          return null; // 🛑 Remove object to prevent crash
        }
      }
    }

    return newObj;
  });

  // Wait for all downloads in this layer
  const results = await Promise.all(promises);

  // Filter out the nulls (failed downloads)
  return results.filter(Boolean);
}

// ------------------------------------------------------------------
// 4. MAIN: Server Side Renderer (PUPPETEER + DYNAMIC FONTS)
// ------------------------------------------------------------------
async function renderDesignServerSide(designJson, productId, view = 'front') {
  const baseW = designJson.width || 420;
  const baseH = designJson.height || 560;

  const dims = PRODUCT_DIMENSIONS[productId] || { print: { front: { w: 2400, h: 3200 } } };
  const targetW = dims.print[view]?.w || 2400;

  const exportMultiplier = targetW / baseW;

  const objectsArray = designJson.objects || [];
  const sanitizedObjects = await processCanvasObjects(objectsArray);
  designJson.objects = sanitizedObjects;

  if (sanitizedObjects.length === 0) {
    console.warn(`⚠️ Warning: Canvas is empty for ${view} view.`);
  }

  // =========================================================
  // 🧠 THE FIX: Clean Font Scanner & System Font Filter
  // =========================================================
  const extractUsedFonts = (objects) => {
    let fonts = new Set();
    const traverse = (objs) => {
      if (!objs || !Array.isArray(objs)) return;
      objs.forEach(obj => {
        const type = (obj.type || '').toLowerCase();
        if (type === 'text' || type === 'i-text' || type === 'textbox') {
          if (obj.fontFamily) {
            // Remove extra quotes Fabric sometimes adds (e.g., '"Open Sans"')
            let cleanFont = obj.fontFamily.replace(/['"]/g, '').trim();
            fonts.add(cleanFont);
          }
        }
        if (type === 'group' && obj.objects) traverse(obj.objects);
      });
    };
    traverse(objects);
    return Array.from(fonts);
  };

  const usedFonts = extractUsedFonts(designJson.objects);

  // Filter out Apple/Windows System Fonts so Google Fonts API doesn't crash!
  const systemFonts = [
    'Arial', 'Helvetica', 'Helvetica Neue', 'HelveticaNeue',
    'Times New Roman', 'Courier New', 'Verdana', 'Georgia',
    'Comic Sans MS', 'Impact', 'Trebuchet MS'
  ];
  const googleFontsToLoad = usedFonts.filter(f => !systemFonts.includes(f));
  // =========================================================

  // 🚀 LAUNCH HEADLESS CHROME
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();

    // 🌐 THE HTML: Powered by Google WebFontLoader
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>body { margin: 0; padding: 0; background: transparent; }</style>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js"></script>
        <script src="https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"></script>
      </head>
      <body>
        <canvas id="c" width="${baseW}" height="${baseH}"></canvas>

        <script>
           window.renderComplete = false;
           window.canvasDataUrl = "";

           // 2. This ONLY runs after fonts are verified active
           function renderFabric() {
               const canvas = new fabric.StaticCanvas('c');
               const json = ${JSON.stringify(designJson)};

               canvas.loadFromJSON(json, function() {
                   canvas.renderAll();
                   
                   window.canvasDataUrl = canvas.toDataURL({
                       format: 'png',
                       multiplier: ${exportMultiplier}
                   });
                   
                   window.renderComplete = true; // Signal Node.js
               });
           }

           // 1. Ask WebFontLoader to fetch exactly the families we need
           const fontsToLoad = ${JSON.stringify(googleFontsToLoad)};

           if (fontsToLoad.length > 0) {
               WebFont.load({
                   google: { families: fontsToLoad },
                   active: renderFabric,     // Success: Fonts are painted, start Fabric!
                   inactive: renderFabric,   // Fallback: A font typo occurred, render anyway so it doesn't crash.
                   timeout: 10000            // 10 second safety net
               });
           } else {
               // No web fonts used, just render immediately
               renderFabric();
           }
        </script>
      </body>
      </html>
    `;

    // Fast HTML load
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Wait for Fabric to finish
    await page.waitForFunction('window.renderComplete === true', { timeout: 90000 });
    const dataUrl = await page.evaluate(() => window.canvasDataUrl);

    await browser.close();

    const buffer = Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ""), 'base64');
    return buffer;

  } catch (err) {
    await browser.close();
    console.error("Rendering Error:", err);
    throw new Error("Rendering failed: " + err.message);
  }
}

exports.processNewOrder = functions
  .runWith({ timeoutSeconds: 300, memory: '4GB', secrets: ["FUNCTIONS_CONFIG_EXPORT"] })
  .firestore.document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();

    // 1. Safety Checks
    if (newData.status !== 'placed' || newData.providerStatus === 'synced') return null;
    if (newData.providerStatus === 'processing') return null;

    const orderId = context.params.orderId;
    console.log(`🤖 Processing Split Order ${orderId} (${newData.title})...`);

    await change.after.ref.update({ providerStatus: 'processing' });
    loadFonts();

    try {
      const item = newData;
      const printFiles = {};
      const views = item.designData.canvasViewStates ? Object.keys(item.designData.canvasViewStates) : ['front', 'back'];

      // A. Generate Print Files
      for (const view of views) {
        const designJson = JSON.parse(item.designData?.canvasViewStates?.[view]) || JSON.parse(item.designData?.viewStates?.[view]);

        // Skip if this view has no design data
        if (!designJson || designJson.length === 0) continue;

        const bucket = admin.storage().bucket();
        const file = bucket.file(`orders/${orderId}/print_${view}.png`);


        // 1. Get the Buffer from the renderer
        // Note: We removed the 'file' argument because the function returns the data now
        const imageBuffer = await renderDesignServerSide(designJson, item.productId, view);

        // 2. Save the Buffer to Firebase Storage
        await file.save(imageBuffer, {
          metadata: { contentType: 'image/png' },
          public: true, // ⚠️ IMPORTANT: Must be public so Printify/Qikink can download it
          validation: 'md5' // Optional data integrity check
        });

        // 3. Get the Public URL
        // Since we marked it public: true, getDownloadURL will return the public link
        printFiles[view] = await getDownloadURL(file);
      }

      // B. Generate Mockups
      let mockupFiles = {};
      if (Object.keys(printFiles).length > 0) {
        // Pass 'item' (which is newData)
        mockupFiles = await getMockupsFromPrintify(item, printFiles, orderId);
      }

      // Create a clean "Processed Item" object for the provider helpers
      const processedItem = {
        ...item,
        printFiles,
        mockupFiles
      };

      // ----------------------------------------------------
      // STEP 2: ROUTE TO PROVIDER
      // ----------------------------------------------------
      const country = newData.shippingAddress.countryCode.toUpperCase();
      let providerData = {};

      // Note: helpers expect an ARRAY of items, so we pass [processedItem]
      if (country === 'IN') {
        providerData = await sendToQikink(newData, [processedItem]);
        if (newData.payment.method === 'cod' && newData.paymentStatus === 'cod_approved') {
          sendCODConfirmation(newData)
        }
      }
      else if (['US', 'CA'].includes(country)) {
        providerData = await sendToPrintify(newData, [processedItem]);
      }
      else {
        providerData = await sendToGelato(newData, [processedItem]);
      }

      // ----------------------------------------------------
      // STEP 3: SUCCESS
      // ----------------------------------------------------
      await change.after.ref.update({
        providerStatus: 'synced',
        provider: providerData.provider,
        providerOrderId: providerData.id,
        providerData: providerData,

        // Save generated files back to root
        printFiles: printFiles,
        mockupFiles: mockupFiles,

        botLog: `Fulfilled via ${providerData.provider}`
      });

      console.log(`✅ Order ${orderId} synced.`);

    } catch (error) {
      console.error("❌ Bot Failed:", error);
      await change.after.ref.update({ providerStatus: 'error', botError: error.message });
      const resend = new Resend(config.value().resend?.key);
      await resend.emails.send({
        from: 'System Alert <support@tryam193.in>',
        to: ['tryam193@gmail.com', 'shreyaskumarswamy2007@gmail.com', 'cchiranjeevi.r789@gmail.com'],
        subject: `🚨 Bot Failed: Order #${orderId}`,
        html: `<p>The fulfillment bot crashed for order <b>${orderId}</b>.</p><p>Error: ${error.message}</p><p><a href="https://yourwebsite.com/admin/orders">Click here to open the Command Center and Retry.</a></p>`
      });
    }
  });

// Keep your standard exports...
exports.createRazorpayOrder = functions
  .runWith({ secrets: ["FUNCTIONS_CONFIG_EXPORT"] })
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
    const razorpay = new Razorpay({
      key_id: config.value().razorpay?.key_id || "MISSING_ID",
      key_secret: config.value().razorpay?.key_secret || "MISSING_SECRET"
    });

    try {
      let finalAmount = data.amount;

      // 🛡️ SECURITY: Verify discount eligibility in DB
      if (data.applyReferralReward) {
        const userDoc = await db.collection('users').doc(context.auth.uid).get();
        if (userDoc.exists && userDoc.data().hasActiveReward) {
          finalAmount = Math.max(0, finalAmount - 100);
        }
      }

      const order = await razorpay.orders.create({
        amount: Math.round(finalAmount * 100),
        currency: data.currency || "INR",
        payment_capture: 1,
        notes: {
          groupId: data.groupId // 👈 Attach it to Razorpay's notes!
        }
      });

      return { orderId: order.id, amount: order.amount, currency: order.currency, keyId: config.value().razorpay.key_id };
    } catch (error) { throw new functions.https.HttpsError('internal', error.message); }
  });

exports.createStripeIntent = functions
  .runWith({ secrets: ["FUNCTIONS_CONFIG_EXPORT"] })
  .https.onCall(async (data, context) => {
    let finalAmount = data.amount;
    const stripe = new Stripe(config.value().stripe?.secret_key || "MISSING_KEY");

    // 🛡️ SECURITY: Verify discount eligibility in DB
    if (data.applyReferralReward) {
      const userDoc = await db.collection('users').doc(context.auth.uid).get();
      if (userDoc.exists && userDoc.data().hasActiveReward) {
        finalAmount = Math.max(0, finalAmount - 100);
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(finalAmount * 100),
      currency: data.currency,
      metadata: { groupId: data.groupId }
    });
    return { clientSecret: paymentIntent.client_secret };
  });

exports.generateAiImage = functions
  .runWith({ secrets: ["FUNCTIONS_CONFIG_EXPORT"] })
  .https.onCall(async (data, context) => {
    const { prompt, style } = data;
    const userId = context.auth.uid;
    const today = new Date().toISOString().split('T')[0];
    const docRef = db.collection('users').doc(userId).collection('daily_stats').doc(today);
    const MAX_GEN = 5; // 💎 Visible Limit
    const replicate = new Replicate({
      auth: config.value().replicate?.key || "MISSING_KEY",
    });

    await db.runTransaction(async (t) => {
      const doc = await t.get(docRef);
      const current = doc.exists ? (doc.data().gen_count || 0) : 0;

      if (current >= MAX_GEN) {
        throw new functions.https.HttpsError('resource-exhausted', `You have used your ${MAX_GEN} free generations for today.`);
      }

      t.set(docRef, {
        gen_count: current + 1,
        last_updated: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });
    try {
      const output = await replicate.run("black-forest-labs/flux-schnell", { input: { prompt: style ? `${prompt}, ${style} style` : prompt, output_format: "png" } });
      const imageResponse = await axios.get(output[0], { responseType: 'arraybuffer' });
      const base64Image = Buffer.from(imageResponse.data, 'binary').toString('base64');
      return { success: true, image: `data:image/png;base64,${base64Image}` };
    } catch (error) { throw new functions.https.HttpsError('internal', 'Image generation failed'); }
  });

exports.saveTshirtDesign = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');

  try {
    const designRef = await db.collection("designs").add({
      userId: context.auth.uid,
      tshirtColor: data.tshirtColor || "white",
      canvasJson: JSON.stringify(data.canvasJson),
      previewImage: data.previewImage,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "saved"
    });
    return { success: true, designId: designRef.id };
  } catch (error) { throw new functions.https.HttpsError('internal', 'Unable to save design.'); }
});

// ------------------------------------------------------------------
// 💰 1. RAZORPAY WEBHOOK (Group Orders, Fraud Check, Invoice)
// ------------------------------------------------------------------
const crypto = require("crypto");

exports.razorpayWebhook = functions
  .runWith({ timeoutSeconds: 300, memory: '1GB', secrets: ["FUNCTIONS_CONFIG_EXPORT"] })
  .https.onRequest(async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    const eventId = req.headers['x-razorpay-event-id'];
    const secret = config.value().razorpay?.webhook_secret;

    // 1. Validate Signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(req.rawBody.toString())
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error(`❌ Razorpay Signature Error: Mismatch`);
      return res.status(400).send("Invalid signature");
    }

    // 2. Idempotency
    if (!eventId) return res.status(400).send("Missing event ID");
    const eventRef = db.collection('webhookEvents').doc(eventId);
    const doc = await eventRef.get();
    if (doc.exists) return res.status(200).send("OK");

    try {
      const body = JSON.parse(req.rawBody.toString());

      if (body.event === 'payment.captured' || body.event === 'order.paid') {
        const payload = body.payload.payment.entity;
        const groupId = payload.notes?.groupId;
        const amountPaid = payload.amount / 100; // Razorpay is in paise

        if (!groupId) return res.status(400).send("Missing groupId");

        // 3. Fetch Group Orders
        const snapshot = await db.collection("orders").where("groupId", "==", groupId).get();
        if (snapshot.empty) return res.status(404).send("Orders not found");

        const ordersToUpdate = snapshot.docs;
        const allOrderData = ordersToUpdate.map(d => d.data());

        // 4. 🛡️ FRAUD CHECK
        // In your frontend, every split order saves the 'totalPayAmount' in payment.total
        const expectedAmount = allOrderData[0].payment.total;
        const userId = allOrderData[0].userId;

        if (Math.abs(amountPaid - expectedAmount) > 5) { // 5 Rupee buffer
          const fraudMsg = `FRAUD: Group ${groupId} paid ${amountPaid} but expected ${expectedAmount}`;
          console.error(`🚨 ${fraudMsg}`);

          const fraudBatch = db.batch();
          ordersToUpdate.forEach(docSnap => {
            fraudBatch.update(docSnap.ref, {
              status: 'fraud_alert',
              fraudReason: fraudMsg,
              'payment.status': 'fraud_flagged'
            });
          });

          // Ban the user
          if (userId && userId !== 'guest') {
            fraudBatch.update(db.collection('users').doc(userId), {
              isBanned: true,
              banReason: "Payment Tampering / Fraud Attempt",
              bannedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
          await fraudBatch.commit();
          return res.status(200).send("Fraud Detected");
        }

        // Make Founding Creator
        if (userId && userId !== 'guest') {
          try {
            const launchRef = db.collection('app_settings').doc('launch_status');
            const userRef = db.collection('users').doc(userId);

            await db.runTransaction(async (t) => {
              const userDoc = await t.get(userRef);
              const launchDoc = await t.get(launchRef);

              if (userDoc.exists && launchDoc.exists) {
                const userData = userDoc.data();
                const launchData = launchDoc.data();

                if (!userData.isFoundingCreator && launchData.claimed_slots < launchData.total_slots) {

                  // Claim the slot securely
                  t.update(launchRef, {
                    claimed_slots: admin.firestore.FieldValue.increment(1)
                  });

                  // Award the badge to the user
                  t.update(userRef, {
                    isFoundingCreator: true
                  });

                  console.log(`🎉 User ${userId} claimed Founding Creator slot ${launchData.claimed_slots + 1}!`);
                }
              }
            });
          } catch (err) {
            console.error("❌ Founding Creator Transaction Error:", err);
          }
        }
        const batch = db.batch();

        const orderData = allOrderData[0];
        if (orderData.referralDiscountApplied) {
          batch.update(db.collection('users').doc(userId), {
            hasActiveReward: false,
            referralCount: 0
          });
        }

        // 2. Increment Referrer's Count (If this is buyer's first purchase)
        if (userId && userId !== 'guest') {
          const userDoc = await db.collection('users').doc(userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData.referredBy && !userData.hasMadeFirstPurchase) {
              // Mark buyer as converted
              batch.update(db.collection('users').doc(userId), { hasMadeFirstPurchase: true });

              // Find the friend who invited them
              const referrerRef = db.collection('users').doc(userData.referredBy);
              const referrerDoc = await referrerRef.get();

              if (referrerDoc.exists) {
                const refData = referrerDoc.data();

                // Only increment if they aren't currently locked
                if (!refData.hasActiveReward) {
                  const newCount = (refData.referralCount || 0) + 1;

                  if (newCount >= 3) {
                    // Trigger the lock and reward!
                    batch.update(referrerRef, { referralCount: 3 });
                  } else {
                    // Just increment progress
                    batch.update(referrerRef, { referralCount: newCount });
                  }
                }
              }
            }
          }
        }

        // 5. ✅ SUCCESS: Batch Update
        ordersToUpdate.forEach((docSnap) => {
          // Only update if not already processed
          if (docSnap.data().status !== 'placed') {
            batch.update(docSnap.ref, {
              status: 'placed',
              'payment.status': 'paid',
              'payment.transactionId': payload.id,
              providerStatus: 'pending', // 🟢 Wakes up your processNewOrder bot!
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        });
        await batch.commit();
        console.log(`✅ Razorpay Group Order ${groupId} successfully paid.`);

        // 6. 🧾 GENERATE INVOICE
        await generateAndSendConsolidatedInvoice(allOrderData);
      }

      // Lock Event
      await eventRef.set({ processedAt: admin.firestore.FieldValue.serverTimestamp(), event: body.event });
      res.status(200).send("OK");

    } catch (error) {
      console.error("Razorpay Processing Error:", error);
      res.status(500).send("Internal Server Error");
    }
  });

// ------------------------------------------------------------------
// 💰 2. STRIPE WEBHOOK (Group Orders, Fraud Check, Invoice)
// ------------------------------------------------------------------
exports.stripeWebhook = functions
  .runWith({ timeoutSeconds: 300, memory: '1GB', secrets: ["FUNCTIONS_CONFIG_EXPORT"] })
  .https.onRequest(async (req, res) => {
    const signature = req.headers['stripe-signature'];
    const secret = config.value().stripe?.webhook_secret;

    let event;

    // 1. Validate Signature
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, signature, secret);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // 2. Idempotency
    const eventId = event.id;
    const eventRef = db.collection('webhookEvents').doc(eventId);
    const doc = await eventRef.get();
    if (doc.exists) return res.status(200).json({ received: true });

    try {
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const groupId = paymentIntent.metadata?.groupId;
        const amountPaid = paymentIntent.amount_received / 100; // Stripe is in cents

        if (!groupId) return res.status(400).send("Missing groupId");

        // 3. Fetch Group Orders
        const snapshot = await db.collection("orders").where("groupId", "==", groupId).get();
        if (snapshot.empty) return res.status(404).send("Orders not found");

        const ordersToUpdate = snapshot.docs;
        const allOrderData = ordersToUpdate.map(d => d.data());

        // 4. 🛡️ FRAUD CHECK
        const expectedAmount = allOrderData[0].payment.total;
        const userId = allOrderData[0].userId;

        if (Math.abs(amountPaid - expectedAmount) > 2) { // 2 unit buffer for currency conversion rounding
          const fraudMsg = `FRAUD: Group ${groupId} paid ${amountPaid} but expected ${expectedAmount}`;
          console.error(`🚨 ${fraudMsg}`);

          const fraudBatch = db.batch();
          ordersToUpdate.forEach(docSnap => {
            fraudBatch.update(docSnap.ref, {
              status: 'fraud_alert',
              fraudReason: fraudMsg,
              'payment.status': 'fraud_flagged'
            });
          });

          if (userId && userId !== 'guest') {
            fraudBatch.update(db.collection('users').doc(userId), {
              isBanned: true,
              banReason: "Payment Tampering / Fraud Attempt",
              bannedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
          await fraudBatch.commit();
          return res.status(200).send("Fraud Detected");
        }

        if (userId && userId !== 'guest') {
          try {
            const launchRef = db.collection('app_settings').doc('launch_status');
            const userRef = db.collection('users').doc(userId);

            await db.runTransaction(async (t) => {
              const userDoc = await t.get(userRef);
              const launchDoc = await t.get(launchRef);

              if (userDoc.exists && launchDoc.exists) {
                const userData = userDoc.data();
                const launchData = launchDoc.data();

                if (!userData.isFoundingCreator && launchData.claimed_slots < launchData.total_slots) {
                  t.update(launchRef, {
                    claimed_slots: admin.firestore.FieldValue.increment(1)
                  });
                  t.update(userRef, {
                    isFoundingCreator: true
                  });
                  console.log(`🎉 User ${userId} claimed Founding Creator slot ${launchData.claimed_slots + 1}!`);
                }
              }
            });
          } catch (err) {
            console.error("❌ Founding Creator Transaction Error:", err);
          }
        }

        const batch = db.batch();
        const orderData = allOrderData[0];
        if (orderData.referralDiscountApplied) {
          batch.update(db.collection('users').doc(userId), {
            hasActiveReward: false,
            referralCount: 0
          });
        }

        // 2. Increment Referrer's Count (If this is buyer's first purchase)
        if (userId && userId !== 'guest') {
          const userDoc = await db.collection('users').doc(userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData.referredBy && !userData.hasMadeFirstPurchase) {
              // Mark buyer as converted
              batch.update(db.collection('users').doc(userId), { hasMadeFirstPurchase: true });

              // Find the friend who invited them
              const referrerRef = db.collection('users').doc(userData.referredBy);
              const referrerDoc = await referrerRef.get();

              if (referrerDoc.exists) {
                const refData = referrerDoc.data();

                // Only increment if they aren't currently locked
                if (!refData.hasActiveReward) {
                  const newCount = (refData.referralCount || 0) + 1;

                  if (newCount >= 3) {
                    // Trigger the lock and reward!
                    batch.update(referrerRef, { referralCount: 3, hasActiveReward: true });
                  } else {
                    // Just increment progress
                    batch.update(referrerRef, { referralCount: newCount });
                  }
                }
              }
            }
          }
        }

        // 5. ✅ SUCCESS: Batch Update
        ordersToUpdate.forEach((docSnap) => {
          if (docSnap.data().status !== 'placed') {
            batch.update(docSnap.ref, {
              status: 'placed',
              'payment.status': 'paid',
              'payment.transactionId': paymentIntent.id,
              providerStatus: 'pending', // 🟢 Wakes up your processNewOrder bot!
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        });
        await batch.commit();
        console.log(`✅ Stripe Group Order ${groupId} successfully paid.`);

        // 6. 🧾 GENERATE INVOICE
        await generateAndSendConsolidatedInvoice(allOrderData);
      }

      // Lock Event
      await eventRef.set({ processedAt: admin.firestore.FieldValue.serverTimestamp(), type: event.type });
      res.status(200).json({ received: true });

    } catch (error) {
      console.error("Stripe Processing Error:", error);
      res.status(500).send("Internal Server Error");
    }
  });

exports.sendConsolidatedInvoice = functions
  .runWith({ memory: '1GB', timeoutSeconds: 120, secrets: ["FUNCTIONS_CONFIG_EXPORT"] })
  .https.onCall(async (data, context) => {
    if (!data.orders || data.orders.length === 0) return;
    await generateAndSendConsolidatedInvoice(data.orders);
    return { success: true };
  });

// ------------------------------------------------------------------
// 📄 INTERNAL HELPER: Consolidated Invoice Logic (FIXED)
// ------------------------------------------------------------------
async function generateAndSendConsolidatedInvoice(orders) {
  if (!orders || orders.length === 0) return;

  const firstOrder = orders[0];

  // 🛑 STOP DUPLICATES
  if (firstOrder.invoiceSent) {
    console.log("⚠️ Invoice already sent. Skipping.");
    return;
  }

  let allItems = [];
  if (firstOrder.items && Array.isArray(firstOrder.items)) {
    allItems = orders.flatMap(o => o.items); // Legacy
  } else {
    allItems = orders; // Flattened
  }

  const groupId = firstOrder.groupId || firstOrder.orderId;
  const isIndia = firstOrder.shippingAddress.countryCode === 'IN';

  console.log(`🧾 Generating ${isIndia ? 'Invoice' : 'Receipt'} for Group ${groupId}`);

  const pdfUrl = await generateInvoicePDF(firstOrder, allItems);

  if (pdfUrl) {
    await sendInvoiceEmail(firstOrder.shippingAddress.email, pdfUrl, true, groupId, isIndia, firstOrder.shippingAddress.fullName);

    // ✅ Mark as Sent
    const batch = db.batch();
    orders.forEach(o => {
      const ref = db.collection('orders').doc(o.orderId);
      batch.update(ref, { invoiceSent: true });
    });
    await batch.commit();
  }
}

// Trigger Support Ticket Response E-Mail
exports.onTicketReply = functions.firestore
  .document('support_tickets/{ticketId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    const resend = new Resend(config.value().resend?.key);

    // 1. Check if a NEW message was added
    const newMessages = newData.messages || [];
    const oldMessages = oldData.messages || [];

    if (newMessages.length <= oldMessages.length) return null; // No new message

    // 2. Check if the LAST message is from ADMIN
    const lastMessage = newMessages[newMessages.length - 1];
    if (lastMessage.sender !== 'admin') return null; // Ignore user messages

    console.log(`💬 Admin replied to Ticket ${context.params.ticketId}. Sending email...`);

    // 3. Get User Email (Fetch linked Order to be safe)
    const orderSnap = await db.collection('orders').doc(newData.orderId).get();
    if (!orderSnap.exists) return null;

    const userEmail = orderSnap.data().shippingAddress.email;
    const customerName = orderSnap.data().shippingAddress.fullName.split(" ")[0];

    // 4. Send Email via Resend
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #ea580c;">New Reply from Support 💬</h2>
        <p>Hi ${customerName},</p>
        <p>We have replied to your ticket regarding Order <strong>#${newData.orderNumber}</strong>.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ea580c;">
            <p style="margin:0; font-style:italic;">"${lastMessage.text}"</p>
        </div>

        <a href="https://localhost:5173/orders/${newData.orderId}" style="background-color: #1a1a1a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reply in App</a>
      </div>
    `;

    try {
      await resend.emails.send({
        from: 'TRYAM Support <support@tryam193.in>', // Use 'onboarding@resend.dev' for testing
        to: userEmail,
        subject: `Update on Ticket #${newData.orderNumber}`,
        html: htmlBody
      });
      console.log(`✅ Notification sent to ${userEmail}`);
    } catch (error) {
      console.error("❌ Failed to send notification:", error);
    }
  });

// Check Qikink status bot
exports.pollQikinkOrders = functions.runWith({ timeoutSeconds: 540, memory: '1GB', secrets: ["FUNCTIONS_CONFIG_EXPORT"] })
  .pubsub.schedule('every 3 hours')
  .onRun(async (context) => {
    console.log("🤖 Qikink Polling Bot Started...");

    const activeStatuses = ['placed', 'processing', 'printing', 'production', 'shipped'];

    // 1. FETCH ORDERS
    const snapshot = await db.collection('orders')
      .where('provider', '==', 'qikink')
      .where('status', 'in', activeStatuses)
      .get();

    if (snapshot.empty) return null;

    // 2. AUTH
    let token;
    try { token = await getQikinkAccessToken(); } catch (e) { return null; }
    const clientId = config.value().qikink?.client_id;

    const batch = db.batch();
    let updateCount = 0;

    // 3. CHECK STATUSES
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    for (const order of orders) {
      if (!order.providerOrderId) continue;

      try {
        const res = await axios.get(`${QIKINK_BASE_URL}/api/order/status?order_number=${order.providerOrderId}`, {
          headers: { 'ClientId': clientId, 'Accesstoken': token }
        });

        const qData = res.data;
        if (!qData || !qData.status) continue;

        const qStatus = qData.status.toLowerCase();
        let newStatus = order.status;
        let trackingUpdates = {};

        // Map Status
        if (qStatus.includes('print') || qStatus.includes('process')) newStatus = 'printing';
        else if (qStatus.includes('dispatch') || qStatus.includes('ship')) {
          newStatus = 'shipped';
          if (qData.tracking_link || qData.awb_number) {
            trackingUpdates = {
              'providerData.trackingUrl': qData.tracking_link || order.providerData?.trackingUrl,
              'providerData.trackingCode': qData.awb_number || order.providerData?.trackingCode,
              'providerData.courier': qData.courier_name || order.providerData?.courier
            };
          }
        }
        else if (qStatus.includes('deliver')) {
          newStatus = 'delivered';
          trackingUpdates = { deliveredAt: admin.firestore.FieldValue.serverTimestamp() };
        }
        else if (qStatus.includes('cancel')) newStatus = 'cancelled';
        else if (qStatus.includes('rto')) {
          newStatus = 'cancelled';
          trackingUpdates = { botLog: "RTO Detected" };
        }

        // 4. UPDATE DETECTED
        if (newStatus !== order.status || (trackingUpdates['providerData.trackingCode'] && !order.providerData?.trackingCode)) {

          const orderRef = db.collection('orders').doc(order.id);
          let updateData = {
            status: newStatus,
            ...trackingUpdates,
            lastPolledAt: admin.firestore.FieldValue.serverTimestamp()
          };

          // 🚚 SPLIT DELIVERY LOGIC
          if (newStatus === 'delivered' && order.status !== 'delivered') {
            const customerName = order.shippingAddress.fullName || ''

            if (order.payment?.method === 'cod' || order.isCod) {
              console.log(`🇮🇳 Sending COD Invoice for ${order.id}...`);

              // Force Single Invoice
              const singleOrderContext = { ...order, groupId: null };

              try {
                const pdfUrl = await generateInvoicePDF(singleOrderContext, [order]);
                if (pdfUrl) {
                  // Call with PDF URL -> Sends "Delivered + Attachment"
                  await sendInvoiceEmail(
                    order.shippingAddress.email,
                    pdfUrl,
                    false, // isConsolidated
                    order.orderId,
                    true,
                    customerName   // isIndia
                  );
                  updateData.invoiceSent = true;
                }
              } catch (err) { console.error(`Invoice Gen Failed:`, err); }
            }

            // SCENARIO B: ONLINE ORDER -> Send Friendly Email
            else {
              console.log(`🎉 Sending Friendly Delivery Email for ${order.id}...`);

              // Call with NULL PDF -> Sends "Friendly Text Only"
              await sendInvoiceEmail(
                order.shippingAddress.email,
                null,  // <--- NULL triggers the friendly mode
                false,
                order.orderId,
                true,
                customerName
              );
            }
          }

          batch.update(orderRef, updateData);
          updateCount++;
        }
      } catch (err) { console.error(`Poll Error ${order.orderId}:`, err.message); }
    }

    if (updateCount > 0) await batch.commit();
  });

// ------------------------------------------------------------------
// 📧 CONTACT FORM EMAILS (Direct Call from Frontend)
// ------------------------------------------------------------------
exports.sendContactEmail = functions
  .runWith({ secrets: ["FUNCTIONS_CONFIG_EXPORT"] })
  .https.onCall(async (data, context) => {
    const { name, email, subject, message } = data;
    const resend = new Resend(config.value().resend?.key);

    // 1. Basic Validation
    if (!name || !email || !message) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #ea580c;">New Contact Request</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject || 'No Subject'}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="white-space: pre-wrap;">${message}</p>
      </div>
    `;

    try {
      await resend.emails.send({
        from: 'TRYAM Support <support@tryam193.in>', // Change to support@tryam193.com once domain is verified
        to: 'admin@tryam193.in', // 👈 This is YOUR inbox where you receive the messages
        reply_to: email,            // 👈 Allows you to hit "Reply" directly to the user
        subject: `Contact Form: ${subject || 'General Inquiry'}`,
        html: htmlBody
      });

      return { success: true, message: "Email sent successfully" };
    } catch (error) {
      console.error("❌ Contact Email Failed:", error);
      throw new functions.https.HttpsError('internal', 'Failed to send email');
    }
  });