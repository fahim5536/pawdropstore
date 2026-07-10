import { db as rtdb } from './firebase-config.js';
import { db as firestoreDb, deleteOrder as fsDeleteOrder } from './firebase.js';
import { collection, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';

export class RealtimeManager {

  // Save order to Firestore
  async saveOrder(order) {
    try {
      const orderRef = doc(firestoreDb, "orders", order.id);
      await setDoc(orderRef, order);
      console.log("[Firestore] Order saved successfully:", order.id);

      // Update stats in RTDB for dashboard stats compatibility
      await rtdb.ref("stats/totalOrders")
        .transaction(n => (n || 0) + 1);
      await rtdb.ref("stats/totalRevenue")
        .transaction(n => (n || 0) + order.total);
      await rtdb.ref("stats/todayOrders")
        .transaction(n => (n || 0) + 1);
    } catch (err) {
      console.error("[Firestore] Error saving order:", err);
    }
  }

  // Listen to single order (LIVE) from Firestore
  listenToOrder(orderId, callback) {
    const orderRef = doc(firestoreDb, "orders", orderId);
    return onSnapshot(orderRef, (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() });
      } else {
        callback(null);
      }
    }, (error) => {
      console.error("[Firestore] Error listening to order:", error);
    });
  }

  // Listen to ALL orders (admin) from Firestore
  listenToAllOrders(callback) {
    const q = collection(firestoreDb, "orders");
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort descending by date
      orders.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
      callback(orders);
    }, (error) => {
      console.error("[Firestore] Error listening to all orders:", error);
    });
  }

  // Update order status in Firestore
  async updateOrder(orderId, updates) {
    try {
      const orderRef = doc(firestoreDb, "orders", orderId);
      await setDoc(orderRef, updates, { merge: true });
      console.log("[Firestore] Order updated successfully:", orderId);
    } catch (err) {
      console.error("[Firestore] Error updating order:", err);
    }
  }

  // Delete order from Firestore
  async deleteOrder(orderId) {
    try {
      await fsDeleteOrder(orderId);
      console.log("[Firestore] Order deleted successfully via RealtimeManager:", orderId);
    } catch (err) {
      console.error("[Firestore] Error in RealtimeManager deleting order:", err);
      throw err;
    }
  }

  // Listen to stats (admin dashboard)
  listenToStats(callback) {
    rtdb.ref("stats").on("value", snap => {
      callback(snap.val());
    });
  }

  // Send admin notification
  async notify(message, data) {
    await rtdb.ref("notifications").push({
      message,
      data,
      time: new Date().toISOString(),
      read: false
    });
  }

  // Listen to notifications (admin)
  listenToNotifications(callback) {
    rtdb.ref("notifications")
      .limitToLast(20)
      .on("value", snap => {
        const notifs = [];
        snap.forEach(child => {
          notifs.push({
            key: child.key,
            ...child.val()
          });
        });
        callback(notifs.reverse());
      });
  }
}
export const realtime = new RealtimeManager();
