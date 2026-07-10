import { realtime } from './realtime.js';
import { orderManager } from './orderManager.js';
import { db } from './firebase-config.js';
import { initTheme } from './theme.js';

async function runAdminInit() {
  try { initTheme(); } catch (e) { console.error("Error initializing Theme:", e); }
  const overlay = document.getElementById('adminLoginOverlay');
  const loginForm = document.getElementById('adminLoginForm');
  const passwordInput = document.getElementById('adminPasswordInput');
  const loginError = document.getElementById('loginError');
  const backToStoreBtn = document.getElementById('backToStoreBtn');

  // Verify if already authorized in current browser session
  if (sessionStorage.getItem('pawdrop_admin_auth') === 'true') {
    if (overlay) overlay.style.display = 'none';
    initDashboard();
    return;
  }

  if (loginForm && passwordInput) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const p = passwordInput.value.trim();
      if (p === "pawdrop.admin") {
        sessionStorage.setItem('pawdrop_admin_auth', 'true');
        if (overlay) {
          overlay.classList.add('fade-out');
          setTimeout(() => {
            overlay.style.display = 'none';
          }, 300);
        }
        initDashboard();
      } else {
        if (loginError) {
          loginError.innerText = "Incorrect Password! Try again.";
          loginError.style.display = 'block';
        }
        passwordInput.value = '';
        passwordInput.focus();
      }
    });

    if (backToStoreBtn) {
      backToStoreBtn.addEventListener('click', () => {
        window.location.href = "/";
      });
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runAdminInit);
} else {
  runAdminInit();
}

function initDashboard() {
  // Show and handle logout button
  const logoutBtn = document.getElementById('adminLogoutBtn');
  if (logoutBtn) {
    logoutBtn.style.display = 'inline-block';
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sessionStorage.removeItem('pawdrop_admin_auth');
      window.location.reload();
    });
  }

  // 1. Stats
  realtime.listenToStats((stats) => {
    if(!stats) return;
    document.getElementById('statOrders').innerText = stats.totalOrders || 0;
    document.getElementById('statNewOrders').innerText = stats.todayOrders || 0;
    document.getElementById('statRevenue').innerText = '$' + (stats.totalRevenue || 0).toFixed(2);
    // document.getElementById('statVisitors').innerText = stats.visitors || 0;
  });

  // 2. Orders Table
  realtime.listenToAllOrders((orders) => {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = '';
    
    // Sort descending by date
    orders.sort((a,b) => new Date(b.date) - new Date(a.date));

    orders.forEach(order => {
      const isDeletable = order.status === 'delivered' || order.status === 'canceled' || order.status === 'cancelled';
      const deleteBtnHtml = isDeletable ? `
        <button class="btn btn--outline js-delete-btn" data-id="${order.id}" style="padding:4px 8px;font-size:10px;border-color:#ef4444;color:#ef4444;">DELETE</button>
      ` : '';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family:var(--font-mono);">${order.id}</td>
        <td>${order.customer.name}</td>
        <td class="neon">$${Number(order.total).toFixed(2)}</td>
        <td><span class="badge ${order.status}">● ${order.status.replace('_', ' ')}</span></td>
        <td style="color:var(--gray);font-size:12px;">${new Date(order.date).toLocaleString()}</td>
        <td>
          <button class="btn btn--outline js-sync-btn" data-id="${order.id}" style="padding:4px 8px;font-size:10px;">SYNC</button>
          ${deleteBtnHtml}
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll('.js-sync-btn').forEach(btn => {
       btn.addEventListener('click', async (e) => {
          const btnEl = e.target;
          btnEl.innerText = "SYNCING...";
          await orderManager.syncTracking(btnEl.dataset.id);
          btnEl.innerText = "SYNC";
       });
    });

    document.querySelectorAll('.js-delete-btn').forEach(btn => {
       btn.addEventListener('click', async (e) => {
          const btnEl = e.currentTarget;
          const orderId = btnEl.dataset.id;
          if (!confirm(`Are you sure you want to permanently delete order ${orderId}?`)) return;
          btnEl.innerText = "DELETING...";
          try {
            await realtime.deleteOrder(orderId);
          } catch(e) {
            btnEl.innerText = "DELETE";
            alert("Failed to delete order");
          }
       });
    });
  });

  // 3. Notifications
  realtime.listenToNotifications((notifs) => {
    const list = document.getElementById('notifList');
    list.innerHTML = '';
    notifs.slice(0, 10).forEach(notif => {
      const div = document.createElement('div');
      div.className = 'notif-item';
      div.innerHTML = `
        <p>${notif.message || 'Notification'}</p>
        <span class="notif-time" style="font-size: 11px; color: var(--gray);">${new Date(notif.time).toLocaleString()}</span>
      `;
      list.appendChild(div);
    });
  });

  // 4. Sync All BTN
  document.getElementById('syncAllBtn').addEventListener('click', async () => {
    const btn = document.getElementById('syncAllBtn');
    btn.innerText = "SYNCING...";
    try {
      // Need a way to fetch all active orders.
      db.ref("orders").orderByChild("status").equalTo("processing").once("value", async snap => {
         const updates = [];
         snap.forEach(child => {
            updates.push(orderManager.syncTracking(child.key));
         });
         await Promise.all(updates);
         btn.innerText = "🔄 SYNC TRACKING";
         alert('Synced ' + updates.length + ' orders');
      });
    } catch(e) {
      btn.innerText = "🔄 SYNC TRACKING";
    }
  });
}
