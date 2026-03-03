const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();

// IMPORTANT: we need raw body for signature verification.
// We'll store rawBody then parse JSON.
app.use(
    bodyParser.raw({
        type: "*/*",
        limit: "2mb",
        verify: (req, res, buf) => {
            req.rawBody = buf;
        },
    })
);

app.get("/", (req, res) => {
    res.send("SalesPilot API is running ✅");
});

// Temporary storage (file-based) for MVP
const STORE_FILE = path.join(__dirname, "stores.json");

function readStores() {
    try {
        return JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
    } catch {
        return {};
    }
}
function writeStores(data) {
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Webhook endpoint from Salla:
 * Set this in Salla -> Notifications/Webhooks URL as:
 * https://YOUR_DOMAIN/webhooks/salla
 */
app.post("/webhooks/salla", (req, res) => {
    // 1) Verify signature (optional now, we’ll add it once you paste the header name used by Salla)
    // For now: accept requests and log them.
    let payloadText = req.rawBody?.toString("utf8") || "";
    let payload;

    try {
        payload = JSON.parse(payloadText);
    } catch (e) {
        console.log("❌ Invalid JSON webhook body");
        return res.status(400).send("Invalid JSON");
    }

    // 2) Log event
    const eventName = payload?.event || payload?.type || "unknown_event";
    console.log("📩 Webhook received:", eventName);
    // console.log(JSON.stringify(payload, null, 2));

    // 3) Handle authorize/install event (names differ by config)
    // We'll try to detect store_id & access_token from common shapes
    const storeId =
        payload?.data?.store_id ||
        payload?.data?.merchant?.id ||
        payload?.merchant?.id ||
        payload?.store_id;

    const accessToken =
        payload?.data?.access_token ||
        payload?.data?.token ||
        payload?.access_token ||
        payload?.token;

    if (storeId && accessToken) {
        const stores = readStores();
        stores[String(storeId)] = {
            store_id: storeId,
            access_token: accessToken,
            updated_at: new Date().toISOString(),
            last_event: eventName,
        };
        writeStores(stores);
        console.log("✅ Saved store auth:", storeId);
    }

    // 4) Respond quickly
    return res.status(200).json({ ok: true });
});

// Debug: view saved stores (protect later)
app.get("/debug/stores", (req, res) => {
    res.json(readStores());
});

const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";
app.listen(PORT, HOST, () => {
    console.log(`🚀 SalesPilot server running on port ${PORT}`);
});