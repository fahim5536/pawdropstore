import { realtime } from './realtime.js';
import { notifier } from './notifications.js';

export class OrderManager {

  generateId() {
    return "PAWDROP-" + 
      Math.floor(10000 + Math.random() * 90000);
  }

  async placeOrder(formData, cartItems) {
    const order = {
      id: this.generateId(),
      date: new Date().toISOString(),
      status: "pending",
      customer: {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || "0000000000",
        address: formData.address,
        city: formData.city,
        country: formData.country,
        zip: formData.zip || "00000"
      },
      items: cartItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        qty: item.qty,
        img: item.img
      })),
      total: cartItems.reduce(
        (s, i) => s + i.price * i.qty, 0),
      cjOrderId: null,
      tracking: null
    };

    // 1. Save to Firestore (via realtime manager updated with Firestore)
    await realtime.saveOrder(order);

    // 2. Send confirmation email
    try {
      await notifier.sendConfirmation(order);
    } catch (err) {
      console.warn("Could not send confirmation email:", err);
    }

    // 3. Admin notification
    await realtime.notify(
      "🛒 New manual order: " + order.id,
      {
        customer: order.customer.name,
        total: "$" + order.total.toFixed(2),
        cjSent: false
      }
    );

    return order;
  }

  // Manual tracking sync - skips CJ
  async syncTracking(orderId) {
    console.log("[OrderManager] Manual mode: CJ tracking sync skipped for", orderId);
  }
}
export const orderManager = new OrderManager();
