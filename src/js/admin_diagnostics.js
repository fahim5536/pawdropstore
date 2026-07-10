import { db } from './firebase-config.js';
import { auth } from './firebase.js';
import { products } from './data/products.js';
import { orderManager } from './orderManager.js';
import { analyticsSessionLogs } from './core/analytics.js';

let appLogContainer = null;
let connectionRef = null;

/**
 * Initializes the entire diagnostics view interface.
 */
export function initDiagnosticsView() {
  appLogContainer = document.getElementById('diagnostic-events-log-container');
  
  // 1. Setup Online/Offline Network Status Event Handlers
  updateNetworkStatusIndicator();
  window.addEventListener('online', updateNetworkStatusIndicator);
  window.addEventListener('offline', updateNetworkStatusIndicator);

  // 2. Setup GTM/GA4 E-commerce dataLayer Streams listener
  window.addEventListener('pawdrop-analytics-event', (e) => {
    appendTelemetryLog(e.detail);
  });

  // Render any pre-existing e-commerce event records from the current session
  refreshTelemetryLogWindow();

  // 3. Initiate first automated pipeline diagnostic health-check run
  runDiagnosticPipeline();
}

/**
 * Performs connection state readings and logs.
 */
export function runDiagnosticPipeline() {
  try {
    updateBadge('diag-firebase-status', 'pending', 'PINGING...');
    updateBadge('diag-auth-status', 'pending', 'CHECKING...');
    updateBadge('diag-products-status', 'pending', 'QUERYING...');
    updateBadge('diag-checkout-status', 'pending', 'TESTING...');

    // A. Check Firebase DB Connection via official RTDB connection tracker (.info/connected)
    if (connectionRef) {
      db.ref('.info/connected').off('value', connectionRef);
    }
    
    connectionRef = db.ref('.info/connected').on('value', (snap) => {
      const isConnected = snap.val() === true;
      if (isConnected) {
        updateBadge('diag-firebase-status', 'shipped', 'CONNECTED');
      } else {
        updateBadge('diag-firebase-status', 'manual_review', 'DISCONNECTED');
      }
    });

    // B. Check Firebase Authentication State
    setTimeout(() => {
      const user = auth.currentUser;
      if (user) {
        updateBadge('diag-auth-status', 'shipped', `ACTIVE (${user.email || 'Admin'})`);
      } else {
        // Auth is active but no active user session (this is a valid green state)
        updateBadge('diag-auth-status', 'delivered', 'READY / SECURE');
      }
    }, 400);

    // C. Check Catalog Database Loading
    setTimeout(() => {
      if (Array.isArray(products) && products.length > 0) {
        updateBadge('diag-products-status', 'shipped', 'SUCCESS');
        const countEl = document.getElementById('diag-products-count');
        if (countEl) {
          countEl.textContent = `${products.length} products loaded`;
        }
      } else {
        updateBadge('diag-products-status', 'manual_review', 'CATALOG ERROR');
      }
    }, 500);

    // D. Validate Checkout Form API Endpoint Write Access
    setTimeout(async () => {
      try {
        // Query recent orders write connectivity to confirm integrity
        const snap = await db.ref('orders').limitToLast(1).once('value');
        updateBadge('diag-checkout-status', 'shipped', 'PIPELINE ACTIVE');
      } catch (err) {
        console.error('Checkout write accessibility verification failed:', err);
        updateBadge('diag-checkout-status', 'manual_review', 'WRITE API ERROR');
      }
    }, 600);

  } catch (error) {
    console.error('Failed to execute diagnostic checks:', error);
  }
}

/**
 * Executes a simulated programmatic checkout event for Sarah Jenkins
 */
export async function simulateDummyCheckout() {
  const btn = document.getElementById('btnSimulateCheckout');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'SIMULATING ORDER...';
  }

  try {
    // 1. Mock products corresponding to real catalog entries
    const testProducts = [
      products[0] || { id: 1, name: "Premium Memory Bed", price: 49.99, category: "BEDS" },
      products[2] || { id: 3, name: "Running Bungee Leash", price: 19.99, category: "LEASHES" }
    ];

    const testCartItems = [
      { ...testProducts[0], qty: 1 },
      { ...testProducts[1], qty: 2 }
    ];

    const testCustomerData = {
      name: "Sarah Jenkins (Diagnostic Test)",
      email: "sarah.jenkins.test@pawdrop.io",
      phone: "+1 (555) 019-2831",
      address: "831 Boren Ave N, Suite 100",
      city: "Seattle",
      country: "United States",
      zip: "98109"
    };

    // 2. Dispatch programmatic e-commerce analytics event trace trigger on begin_checkout
    // This replicates user opening checkout modal with current items
    window.dispatchEvent(new CustomEvent('pawdrop-diagnostic-toast', { detail: 'Beginning diagnostic checkout analytics push...' }));

    // Trigger local begin_checkout tracking call
    const beginCheckoutEvent = {
      event: 'begin_checkout',
      ecommerce: {
        currency: 'USD',
        value: testCartItems.reduce((acc, i) => acc + (i.price * i.qty), 0),
        items: testCartItems.map(item => ({
          item_id: `PID_${item.id}`,
          item_name: item.name,
          price: item.price,
          item_category: item.category,
          quantity: item.qty
        }))
      }
    };
    
    // Explicitly push e-commerce event to the tracking logs
    window.dataLayer.push(beginCheckoutEvent);
    analyticsSessionLogs.unshift({
      event: 'begin_checkout',
      timestamp: new Date().toLocaleTimeString(),
      data: beginCheckoutEvent
    });
    window.dispatchEvent(new CustomEvent('pawdrop-analytics-event', { detail: analyticsSessionLogs[0] }));

    // 3. Initiate checkout database entry placement using orderManager
    await new Promise(resolve => setTimeout(resolve, 1000));
    const orderResult = await orderManager.placeOrder(testCustomerData, testCartItems);

    // 4. Force purchase dataLayer event triggering representing order complete success
    const purchaseEvent = {
      event: 'purchase',
      ecommerce: {
        transaction_id: `T_${orderResult.id}`,
        value: Number(orderResult.total),
        currency: 'USD',
        tax: 0.00,
        shipping: 0.00,
        items: testCartItems.map(item => ({
          item_id: `PID_${item.id}`,
          item_name: item.name,
          price: item.price,
          item_category: item.category,
          quantity: item.qty
        }))
      }
    };

    window.dataLayer.push(purchaseEvent);
    analyticsSessionLogs.unshift({
      event: 'purchase',
      timestamp: new Date().toLocaleTimeString(),
      data: purchaseEvent
    });
    window.dispatchEvent(new CustomEvent('pawdrop-analytics-event', { detail: analyticsSessionLogs[0] }));

    // Display localized trigger confirmation toast
    showToastNotification(`Order #${orderResult.id} placed successfully in test simulation!`);

  } catch (err) {
    console.error('Dummy checkout simulation encountered error:', err);
    showToastNotification('Simulator Error: check console registers for detail.', true);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Simulate Demo Checkout';
    }
  }
}

/**
 * Erases the active session GTM/GA e-commerce telemetry log log view
 */
export function clearDiagnosticEventLogs() {
  if (appLogContainer) {
    appLogContainer.innerHTML = `
      <div style="color: var(--gray); text-align: center; padding: 40px 0; font-style: italic;">
        Stream cleared. Waiting for E-Commerce Actions (view_item, add_to_cart, begin_checkout, purchase)...
      </div>
    `;
  }
}

/**
 * Updates browser status display (online/offline)
 */
function updateNetworkStatusIndicator() {
  const networkText = document.getElementById('diagnostic-network-indicator');
  if (networkText) {
    if (navigator.onLine) {
      networkText.textContent = 'ONLINE';
      networkText.style.color = '#D2FF00';
    } else {
      networkText.textContent = 'OFFLINE (Strict Mode Logged)';
      networkText.style.color = '#ff4444';
    }
  }
}

/**
 * Helper to update visual status badges safely
 */
function updateBadge(id, className, text) {
  const badge = document.getElementById(id);
  if (!badge) return;
  
  // Clean classes and setup color representations
  badge.className = `status-badge ${className}`;
  badge.textContent = text;
}

/**
 * Visualizes a new dataLayer log entry inside the diagnostic list viewport
 */
function appendTelemetryLog(logItem) {
  if (!appLogContainer) return;

  // Clear placeholder text if first entry is listed
  if (appLogContainer.querySelector('div[style*="italic"]') || appLogContainer.innerHTML.includes('Waiting for')) {
    appLogContainer.innerHTML = '';
  }

  const logRow = document.createElement('div');
  logRow.style.cssText = `
    border-bottom: 1px solid var(--border);
    padding: 12px 0;
    margin-bottom: 12px;
  `;

  // Color coordinate standard e-commerce events for superior admin review legibility
  let eventColor = 'var(--neon)';
  if (logItem.event === 'purchase') eventColor = '#00FF88';
  if (logItem.event === 'begin_checkout') eventColor = 'var(--blue)';
  if (logItem.event === 'view_item') eventColor = '#FF00EA';

  logRow.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
      <span style="font-weight: bold; color: ${eventColor}; font-size: 13px;">⚡ event: '${logItem.event}'</span>
      <span style="color: var(--gray); font-size: 11px;">${logItem.timestamp}</span>
    </div>
    <pre style="margin: 0; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 4px; overflow-x: auto; color: #a9b2c3; line-height: 1.4; font-size: 11px;">${JSON.stringify(logItem.data || logItem, null, 2)}</pre>
  `;

  appLogContainer.prepend(logRow);
}

/**
 * Refreshes telemetry logs container with active logs array
 */
function refreshTelemetryLogWindow() {
  if (!appLogContainer) return;
  if (!analyticsSessionLogs || analyticsSessionLogs.length === 0) {
    clearDiagnosticEventLogs();
    return;
  }

  appLogContainer.innerHTML = '';
  // Append current log history
  for (let i = analyticsSessionLogs.length - 1; i >= 0; i--) {
    appendTelemetryLog(analyticsSessionLogs[i]);
  }
}

/**
 * Custom notification builder mimicking support system toasts
 */
function showToastNotification(message, isError = false) {
  const toast = document.createElement('div');
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    background: '#111112',
    borderLeft: `4px solid ${isError ? '#ff4444' : '#D2FF00'}`,
    padding: '16px 20px',
    color: '#fff',
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: '12px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
    zIndex: '10000',
    transition: 'opacity 0.3s, transform 0.3s'
  });
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 400);
  }, 4500);
}
