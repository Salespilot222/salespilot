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
    console.log("HEADERS:", req.headers);

    try {
        payload = JSON.parse(payloadText);
    } catch (e) {
        console.log("❌ Invalid JSON webhook body");
        return res.status(400).send("Invalid JSON");
    }

    // 2) Log event
    const eventName = payload?.event || payload?.type || "unknown_event";
    console.log("📩 Webhook received:", eventName);
    // ✅ Step 1: Print important fields for invoice.created (no signature, no DB)
if (eventName === "invoice.created") {
    const data = payload?.data || {};
    const subTotal = data?.sub_total || {};

    console.log("=== INVOICE.CREATED ===");
    console.log("merchant:", payload?.merchant);
    console.log("created_at:", payload?.created_at);

    console.log("invoice_id:", data?.id);
    console.log("invoice_number:", data?.invoice_number);
    console.log("invoice_uuid:", data?.uuid);

    console.log("order_id:", data?.order_id);
    console.log("type:", data?.type);
    console.log("date:", data?.date);

    console.log("payment_method:", data?.payment_method);
    console.log("sub_total:", subTotal?.amount, subTotal?.currency);

    console.log("=======================");
}

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
{
  "event": "invoice.created",
  "merchant": 939837259,
  "created_at": "Tue Mar 03 2026 08:44:41 GMT+0300",
  "data": {
    "id": 980376154,
    "invoice_number": 1,
    "uuid": "1a346eb6-10ec-4870-8c31-af8cbfbb8ff2",
    "order_id": 1034422129,
    "invoice_reference_id": null,
    "type": "Tax Invoice",
    "slug": 1,
    "date": "2026-03-03 08:44:41",
    "qr_code": null,
    "payment_method": "cod",
    "sub_total": {
      "amount": 565,
      "currency": "SAR"
    },
    "shipping_cost": {
      "amount": 0,
      "taxable": true,
      "currency": "SAR"
    },
    "cod_cost": {
      "amount": 0,
      "taxable": true,
      "currency": "SAR"
    },
    "discount": {
      "amount": 0,
      "currency": "SAR"
    },
    "tax": {
      "percent": 0,
      "amount": {
        "amount": 0,
        "currency": "SAR"
      }
    },
    "total": {
      "amount": 565,
      "currency": "SAR"
    },
    "order_options": {
      "amount": 0,
      "currency": "SAR"
    },
    "order_reference_id": 244406998,
    "shipping_cost_discount": {
      "amount": 0,
      "currency": "SAR"
    },
    "items": [
      {
        "id": 1882911907,
        "item_id": 2080768998,
        "product_id": 614504385,
        "name": "سويت شيرت Textured بني رمادي",
        "sku": "",
        "quantity": 1,
        "type": "product",
        "price": {
          "amount": 565,
          "currency": "SAR"
        },
        "discount": {
          "amount": 0,
          "currency": "SAR"
        },
        "tax": {
          "percent": 0,
          "amount": {
            "amount": 0,
            "currency": "SAR"
          }
        },
        "total": {
          "amount": 565,
          "currency": "SAR"
        },
        "description": "خيار المقاس : Medium. خيار اللون : Neon Green. "
      }
    ],
    "company": null,
    "customer": {
      "id": 500315340,
      "first_name": "sa",
      "last_name": "sa",
      "mobile": 1017995240,
      "mobile_code": "+20",
      "email": "slahalwzan0@gmail.com",
      "avatar": "https://cdn.assets.salla.network/prod/admin/cp/assets/images/avatar_male.png",
      "gender": "male",
      "birthday": null,
      "country_code": "EG",
      "currency": "SAR",
      "updated_at": {
        "date": "2026-03-03 08:41:34.000000",
        "timezone_type": 3,
        "timezone": "Asia/Riyadh"
      },
      "address": null
    }
  }
}
app.listen(PORT, HOST, () => {
    console.log(`🚀 SalesPilot server running on port ${PORT}`);
});
