import './main.js';
import { realtime } from './realtime.js';
import { orderManager } from './orderManager.js';

document.addEventListener('DOMContentLoaded', () => {
  const trackBtn = document.getElementById('trackBtn');
  let currentUnsubscribe = null;

  if (trackBtn) {
    trackBtn.addEventListener('click', async () => {
      const orderId = document.getElementById('orderInput')
        .value.trim().toUpperCase();
      if (!orderId.startsWith('PAWDROP-')) {
        alert('Please enter a valid PAWDROP order ID');
        return;
      }

      document.getElementById('orderResult').innerHTML = `
        <div style="text-align:center; padding:40px;">
          <div style="width:40px;height:40px;border:2px solid #333;border-top-color:var(--neon);border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px;"></div>
          <p style="color:var(--neon);font-family:var(--font-mono);">CONNECTING TO WAREHOUSE...</p>
        </div>
      `;

      realtime.listenToOrder(orderId, (order) => {
        if (!order) {
          document.getElementById('orderResult').innerHTML = `
            <div class="no-order" style="text-align:center; padding:40px; border:1px solid var(--border); background:var(--black-2); margin-top:20px;">
              <p>Order not found. Please check your Order ID.</p>
            </div>
          `;
          return;
        }

        // Try to update tracking quietly in background
        if (order.cjOrderId) {
          orderManager.syncTracking(orderId);
        }

        // Render order card
        renderOrderCard(order);
      });
    });
  }
  
  // Auto track if param is present
  const urlParams = new URLSearchParams(window.location.search);
  const orderIdParam = urlParams.get('id');
  
  if (orderIdParam) {
    document.getElementById('orderInput').value = orderIdParam;
    if (trackBtn) trackBtn.click();
  }
});

function renderOrderCard(order) {
  const statusColors = {
    pending: '#888888',
    processing: '#D2FF00',
    shipped: '#00D4FF',
    delivered: '#00FF88',
    manual_review: '#FF8800'
  };

  const cjTimeline = order.tracking?.timeline ? 
    order.tracking.timeline.map(t => `<div class="timeline-step done">
      <div class="timeline-dot" style="background:#D2FF00;border-color:#D2FF00;box-shadow:0 0 8px rgba(210,255,0,0.3)"></div>
      <div style="flex:1">
        <span style="color:var(--white)">${t.status}</span>
        <div style="color:var(--gray);font-family:var(--font-mono);font-size:12px;">${t.time}</div>
        ${t.content ? `<div style="font-size:12px;color:#aaa">${t.content}</div>` : ''}
      </div>
    </div>`).join('') : '';

  const defaultSteps = `
    <div class="timeline-step done">
      <div class="timeline-dot" style="background:#D2FF00;border-color:#D2FF00;box-shadow:0 0 8px rgba(210,255,0,0.3)"></div>
      <span style="color:var(--white)">Order Placed</span>
    </div>
    <div class="timeline-step ${order.status !== 'pending' ? 'done' : ''}">
      <div class="timeline-dot" ${order.status !== 'pending' ? 'style="background:#D2FF00;border-color:#D2FF00;box-shadow:0 0 8px rgba(210,255,0,0.3)"' : 'style="border-color:#333;background:transparent;"'}></div>
      <span style="color:${order.status !== 'pending' ? 'var(--white)' : '#888'}">Sent to Warehouse</span>
    </div>
    <div class="timeline-step ${['shipped', 'delivered'].includes(order.status) ? 'done' : ''}">
      <div class="timeline-dot" ${['shipped', 'delivered'].includes(order.status) ? 'style="background:#D2FF00;border-color:#D2FF00;box-shadow:0 0 8px rgba(210,255,0,0.3)"' : (order.status==='processing' ? 'style="border-color:#D2FF00;animation:pulse 1.5s infinite"' : 'style="border-color:#333;background:transparent;"')}></div>
      <span style="color:${['shipped', 'delivered'].includes(order.status) ? 'var(--white)' : (order.status==='processing'?'var(--white)':'#888')}">Shipped</span>
    </div>
    <div class="timeline-step ${order.status === 'delivered' ? 'done' : ''}">
      <div class="timeline-dot" ${order.status === 'delivered' ? 'style="background:#D2FF00;border-color:#D2FF00;box-shadow:0 0 8px rgba(210,255,0,0.3)"' : 'style="border-color:#333;background:transparent;"'}></div>
      <span style="color:${order.status === 'delivered' ? 'var(--white)' : '#888'}">Delivered</span>
    </div>
  `;

  document.getElementById('orderResult').innerHTML = `
    <div class="order-card" style="border-left: 3px solid ${statusColors[order.status] || '#888'}">
      <div class="order-card__header">
        <h3 style="font-family: var(--font-display);">${order.id}</h3>
        <span class="order-status" 
          style="color:${statusColors[order.status] || '#888888'}">
          ● ${order.status.toUpperCase().replace('_', ' ')}
          <span style="display:inline-block; margin-left: 8px; padding: 2px 6px; border: 1px solid var(--neon); color: var(--neon); border-radius: 4px; font-size: 10px; animation: pulse 2s infinite;">🟢 LIVE</span>
        </span>
      </div>
      <div class="order-card__date" style="color:var(--gray); font-family:var(--font-mono); font-size:14px; margin-bottom:24px;">
        ${new Date(order.date).toLocaleDateString()}
      </div>
      <div class="order-card__items">
        ${order.items.map(item => `
          <div class="order-item">
            <img src="${item.img}" alt="${item.name}">
            <span style="flex:1;">🐾 ${item.name}</span>
            <span style="color:var(--gray);margin-right:16px;">×${item.qty}</span>
          </div>
        `).join('')}
      </div>
      ${order.tracking?.number ? `
      <div class="order-card__tracking" style="margin-top:24px; padding-top:24px; border-top:1px solid var(--border);">
        <h4 style="font-family:var(--font-display); letter-spacing:0.1em; margin-bottom:12px;">📦 TRACKING INFO</h4>
        <p style="color:var(--gray); margin-bottom:8px;">Carrier: <span style="color:var(--white)">${order.tracking.carrier || 'N/A'}</span></p>
        <p style="color:var(--gray);">Number: <span class="neon">${order.tracking.number}</span></p>
        ${order.tracking.url ? `
        <div style="margin-top:16px; display:flex; gap:12px;">
          <a href="javascript:navigator.clipboard.writeText('${order.tracking.number}')" class="btn btn--outline" style="padding:10px 16px;font-size:12px;border:1px solid #333;color:var(--white);">COPY</a>
          <a href="${order.tracking.url}" target="_blank" class="btn btn--outline" style="padding:10px 16px;font-size:12px;border:1px solid var(--neon);color:var(--neon);">TRACK ON CARRIER SITE →</a>
        </div>
        ` : ''}
      </div>
      ` : ''}
      <div class="order-card__timeline" style="margin-top:32px; padding-top:24px; border-top:1px solid var(--border);">
        <h4 style="font-family:var(--font-display); letter-spacing:0.1em; margin-bottom:20px;">DELIVERY TIMELINE</h4>
        ${cjTimeline ? cjTimeline : defaultSteps}
      </div>
      <div class="order-card__address" style="margin-top:24px; padding-top:24px; border-top:1px solid var(--border);">
        <p style="margin:0;color:var(--white);">Ship to: ${order.customer.name}</p>
        <span style="color:var(--gray)">
          ${order.customer.address}, ${order.customer.city}<br>
          ${order.customer.country}
        </span>
      </div>
      <div class="order-card__total">
        TOTAL: <span class="neon">$${order.total.toFixed(2)}</span>
      </div>
    </div>
  `;
}
