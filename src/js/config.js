/*
 HOW TO SETUP:
 1. Go to: https://app.cjdropshipping.com
 2. Create a free account
 3. Find products you want to sell
 4. Get VID from each product URL
 5. Fill CJ_EMAIL and CJ_PASSWORD in config.js
 6. Fill PRODUCT_CJ_MAP with real VIDs
 
 HOW CJ PAYMENT WORKS:
 - You get paid by customer (PayPal/etc)
 - CJ charges YOUR CJ account wallet
 - Top up CJ wallet at: app.cjdropshipping.com/wallet
 - Profit = customer price - CJ price - shipping
 
 CORS NOTE:
 - CJ API may block browser requests (CORS)
 - If blocked, deploy a simple proxy:
   Option A: Vercel serverless function (free)
   Option B: Cloudflare Worker (free)
   See: vercelProxy.js file below
*/

export const CJ_CONFIG = {
  email: "",
  password: "",
  baseUrl: "/api/cj"
};
