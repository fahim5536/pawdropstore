/**
 * PAWDROP GA4 & GTM E-commerce Tracker Utilities
 * Manages standard e-commerce events and pushes to dataLayer.
 * Standardized events include: 'view_item', 'add_to_cart', 'begin_checkout', and 'purchase'.
 */

// Ensure dataLayer array exists on the window object
window.dataLayer = window.dataLayer || [];

// Session event log for real-time diagnostics monitoring
export const analyticsSessionLogs = [];

/**
 * Robust standard dataLayer tracking function
 * Logs event telemetry to both dataLayer, window.gtag, and local diagnostic sessions.
 */
export function sendEcommerceEvent(eventName, payload) {
  try {
    const timestamp = new Date().toLocaleTimeString();
    
    // Add transaction or item summaries for localized tracking representation
    const logItem = {
      event: eventName,
      timestamp,
      data: JSON.parse(JSON.stringify(payload)), // Deep clone to preserve state snapshot
    };
    
    // Push to the local in-memory log for diagnostic visualizer reading
    analyticsSessionLogs.unshift(logItem);
    
    // Limit diagnostic logs to last 100 entries
    if (analyticsSessionLogs.length > 100) {
      analyticsSessionLogs.pop();
    }

    // Push the event to Google Tag Manager's GTM dataLayer
    window.dataLayer.push({
      event: eventName,
      ...payload
    });

    // Directly dispatch via window.gtag if it is loaded (ensures direct GA4 pipeline fallback)
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, payload);
    }

    // Stylized internal developer logs for tracking feedback
    console.log(
      `%c[PAWDROP ANALYTICS] %cEvent: %c${eventName} %cReflected at ${timestamp}`,
      'color: #D2FF00; font-weight: bold; background: #111112; padding: 3px 6px; border-radius: 3px;',
      'color: #888;',
      'color: #00FF88; font-weight: 700;',
      'color: #777;'
    );

    // Trigger local listeners for reactive diagnostic panel updating
    window.dispatchEvent(new CustomEvent('pawdrop-analytics-event', { detail: logItem }));

  } catch (error) {
    console.error('[PAWDROP ANALYTICS ERROR] Failed to push event:', error);
  }
}

/**
 * Tracks 'view_item' event. Called when a user opens the Quick View modal.
 */
export function trackProductView(product) {
  if (!product) return;
  const price = Number(product.price) || 0;
  
  sendEcommerceEvent('view_item', {
    ecommerce: {
      currency: 'USD',
      value: price,
      items: [{
        item_id: `PID_${product.id}`,
        item_name: product.name,
        price: price,
        item_category: product.category,
        quantity: 1
      }]
    }
  });
}

/**
 * Tracks 'add_to_cart' event dynamically capturing Product ID.
 */
export function trackAddToCart(product, quantity = 1) {
  if (!product) return;
  const price = Number(product.price) || 0;
  const val = price * quantity;

  sendEcommerceEvent('add_to_cart', {
    ecommerce: {
      currency: 'USD',
      value: val,
      items: [{
        item_id: `PID_${product.id}`,
        item_name: product.name,
        price: price,
        item_category: product.category,
        quantity: quantity
      }]
    }
  });
}

/**
 * Tracks 'begin_checkout' event when entering checkout modal.
 */
export function trackBeginCheckout(cartItems) {
  if (!cartItems || cartItems.length === 0) return;
  
  const value = cartItems.reduce((acc, item) => acc + (Number(item.price) || 0) * (item.qty || 1), 0);
  const items = cartItems.map(item => ({
    item_id: `PID_${item.id}`,
    item_name: item.name,
    price: Number(item.price) || 0,
    item_category: item.category,
    quantity: item.qty || 1
  }));

  sendEcommerceEvent('begin_checkout', {
    ecommerce: {
      currency: 'USD',
      value: value,
      items: items
    }
  });
}

/**
 * Tracks the complete standard 'purchase' flow.
 */
export function trackPurchase(order, cartItems) {
  if (!order || !cartItems || cartItems.length === 0) return;

  const value = Number(order.total) || cartItems.reduce((acc, item) => acc + (Number(item.price) || 0) * (item.qty || 1), 0);
  const items = cartItems.map(item => ({
    item_id: `PID_${item.id}`,
    item_name: item.name,
    price: Number(item.price) || 0,
    item_category: item.category,
    quantity: item.qty || 1
  }));

  sendEcommerceEvent('purchase', {
    ecommerce: {
      transaction_id: order.id ? `T_${order.id}` : `T_${Date.now()}`,
      value: value,
      currency: 'USD',
      tax: 0.00,
      shipping: 0.00,
      items: items
    }
  });
}
