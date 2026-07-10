export class CJApi {

  async createOrder(payload) {
    try {
      console.log("[CJ Client API] Placing order via secure server-side proxy...", payload);
      const res = await fetch("/api/cj/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      // Match the structure expected by orderManager.js
      return {
        success: data.result === true || data.success === true || data.code === 200,
        cjOrderId: data.data?.orderId || null,
        message: data.message || ""
      };
    } catch (e) {
      console.error("[CJ Client API] Proxy Order Error:", e);
      return { success: false, message: e.message };
    }
  }

  async getTracking(orderNumber) {
    try {
      console.log(`[CJ Client API] Querying order tracking for "${orderNumber}" via secure proxy...`);
      const res = await fetch(`/api/cj/tracking/${orderNumber}`);
      const data = await res.json();
      
      if ((data.result || data.success) && data.data) {
        return {
          success: true,
          trackingNumber: data.data.trackingNumber,
          carrier: data.data.logisticName || data.data.carrier || "CJ Packet Express",
          url: data.data.trackingUrl || data.data.url || "#",
          timeline: data.data.details || data.data.states || []
        };
      }
      return { success: false };
    } catch (e) {
      console.error("[CJ Client API] Proxy Tracking Error:", e);
      return { success: false };
    }
  }
}
export const cjApi = new CJApi();

