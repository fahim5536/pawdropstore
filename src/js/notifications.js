import { EMAILJS_CONFIG } from './firebase-config.js';

export class NotificationManager {

  async sendConfirmation(order) {
    try {
      await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.confirmTemplate,
        {
          to_name: order.customer.name,
          to_email: order.customer.email,
          order_id: order.id,
          order_date: new Date(order.date)
            .toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
          order_total: "$" + 
            order.total.toFixed(2),
          order_items: order.items
            .map(i => i.name + " x" + i.qty)
            .join(", "),
          shipping_address:
            order.customer.address + ", " +
            order.customer.city + ", " +
            order.customer.country,
          tracking_url:
            window.location.origin +
            "/orders.html?id=" + order.id
        }
      );
      console.log("✅ Confirmation email sent!");
    } catch(e) {
      console.error("Email error:", e);
    }
  }

  async sendShipped(order) {
    try {
      await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.updateTemplate,
        {
          to_name: order.customer.name,
          to_email: order.customer.email,
          order_id: order.id,
          email_subject:
            "🚚 Your Order is Shipped — " + 
            order.id,
          email_title: 
            "🚚 Your Order is Shipped!",
          email_message:
            "great news! Your package " +
            "is on its way!",
          accent_color: "#00D4FF",
          email_content:
            "Carrier: " +
            (order.tracking?.carrier || "N/A") +
            "\nTracking: " +
            (order.tracking?.number || "Pending") +
            "\nEstimated: 7-15 business days",
          button_text: "TRACK MY PACKAGE",
          button_url:
            order.tracking?.url ||
            window.location.origin +
            "/orders.html?id=" + order.id
        }
      );
      console.log("🚚 Shipped email sent!");
    } catch(e) {
      console.error("Email error:", e);
    }
  }

  async sendDelivered(order) {
    try {
      await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.updateTemplate,
        {
          to_name: order.customer.name,
          to_email: order.customer.email,
          order_id: order.id,
          email_subject:
            "📦 Delivered! Order " + order.id,
          email_title: "📦 Order Delivered!",
          email_message:
            "your order has been delivered!",
          accent_color: "#00FF88",
          email_content:
            "We hope your pet loves " +
            "their new accessories! " +
            "If you have any issues, " +
            "just reply to this email.",
          button_text: "SHOP AGAIN",
          button_url: window.location.origin
        }
      );
      console.log("📦 Delivered email sent!");
    } catch(e) {
      console.error("Email error:", e);
    }
  }

  async sendAdminInquiryNotification(userEmail, userName, messageContent, details = '') {
    try {
      await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.updateTemplate,
        {
          to_name: "PAWDROP Admin",
          to_email: "alokmessage.app@gmail.com",
          order_id: "INQUIRY_" + Date.now().toString().slice(-6),
          email_subject: `🔔 New Support Inquiry from ${userName}`,
          email_title: `New Support Inquiry Submitted`,
          email_message: `From: ${userName} (${userEmail})\n\nMessage:\n${messageContent}\n\n${details}`,
          accent_color: "#D2FF00",
          email_content: `Review or reply to details inside the Admin support chat dashboard.`,
          button_text: "OPEN ADMIN PANEL",
          button_url: window.location.origin + "/admin.html"
        }
      );
      console.log("✅ Admin Inquiry Notification sent successfully! (Target: alokmessage.app@gmail.com)");
    } catch(e) {
      console.error("Failed to send admin inquiry notification:", e);
    }
  }

  async sendAdminOrderNotification(order, cartItems) {
    try {
      const itemsString = cartItems.map(i => `${i.name} (QTY: ${i.qty}) - $${(Number(i.price) || 0).toFixed(2)}`).join(", ");
      await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.updateTemplate,
        {
          to_name: "PAWDROP Admin",
          to_email: "alokmessage.app@gmail.com",
          order_id: order.id,
          email_subject: `📦 NEW PAWDROP ORDER #${order.id} PLACED!`,
          email_title: `New Order Received - Success!`,
          email_message: `Customer: ${order.customer.name} (${order.customer.email})\nAddress: ${order.customer.address}, ${order.customer.city}, ${order.customer.country}\nPhone: ${order.customer.phone}\n\nProducts Purchased:\n${itemsString}\n\nTotal: $${Number(order.total).toFixed(2)}`,
          accent_color: "#D2FF00",
          email_content: `An order has been generated and pushed to Firebase logs in real-time. Ready for dropshipping fulfillment.`,
          button_text: "OPEN ADMIN PANEL",
          button_url: window.location.origin + "/admin.html"
        }
      );
      console.log("✅ Admin Order Notification sent successfully! (Target: alokmessage.app@gmail.com)");
    } catch(e) {
      console.error("Failed to send admin order notification:", e);
    }
  }
}
export const notifier = new NotificationManager();
