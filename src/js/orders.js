import { orderManager } from './orderManager.js';

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const orderIdParam = urlParams.get('id');
  
  if (orderIdParam) {
    document.getElementById('orderInput').value = orderIdParam;
    trackOrder(orderIdParam);
  }

  document.getElementById('trackBtn').addEventListener('click', () => {
    trackOrder(document.getElementById('orderInput').value.trim());
  });
});

async function trackOrder(orderId) {
  if (!orderId) return;
  
  const errorMsg = document.getElementById('errorMsg');
  const orderCard = document.getElementById('orderCard');
  const btn = document.getElementById('trackBtn');
  
  errorMsg.style.display = 'none';
  orderCard.classList.remove('visible');
  btn.innerText = 'WAIT...';
  
  const order = orderManager.getOrder(orderId);
  
  if (!order) {
    errorMsg.style.display = 'block';
    btn.innerText = 'TRACK';
    return;
  }
  
  // Try to update tracking from CJ
  await orderManager.checkTracking(orderId);
  
  // Re-fetch to get updated
  const updatedOrder = orderManager.getOrder(orderId);
  
  // Render
  document.getElementById('displayOrderId').innerText = updatedOrder.localOrderId;
  const date = new Date(updatedOrder.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  document.getElementById('displayDate').innerText = `Placed: ${date}`;
  document.getElementById('displayStatus').innerText = updatedOrder.status.toUpperCase();
  
  const itemsHtml = updatedOrder.items.map(item => `
    <li><span>${item.name}</span> <span style="color:var(--gray)">×${item.qty}</span></li>
  `).join('');
  document.getElementById('displayItems').innerHTML = itemsHtml;
  
  const cInfo = updatedOrder.customer;
  document.getElementById('displayAddress').innerHTML = `
    <span style="color:var(--white);font-weight:bold">${cInfo.firstName || ''} ${cInfo.lastName || ''}</span><br>
    ${cInfo.address || ''}<br>
    ${cInfo.city || ''}, ${cInfo.state || ''} ${cInfo.zip || ''}<br>
    ${cInfo.country || ''}
  `;
  
  const tracking = updatedOrder.trackingInfo;
  let tHtml = '';
  
  if (tracking && tracking.trackingNumber) {
    document.getElementById('displayCarrier').innerText = tracking.carrier || 'Standard';
    document.getElementById('displayTrackNum').innerText = tracking.trackingNumber;
    
    // If timeline exists
    if (tracking.timeline && tracking.timeline.length > 0) {
      tHtml = tracking.timeline.map((ev, i) => `
        <li class="timeline-event ${i===0 ? 'active' : ''}">
          <div style="font-weight:bold">${ev.trackOperation || ev.status}</div>
          <div style="font-size:13px">${ev.trackDate || ''}</div>
        </li>
      `).join('');
    } else {
      tHtml = `
        <li class="timeline-event active"><div style="font-weight:bold">Shipped</div><div>Tracking details updating...</div></li>
      `;
    }
  } else {
    document.getElementById('displayCarrier').innerText = 'Pending';
    document.getElementById('displayTrackNum').innerText = 'Pending';
    
    tHtml = `
      <li class="timeline-event active"><div style="font-weight:bold">Order Placed</div><div>${date}</div></li>
      <li class="timeline-event"><div style="font-weight:bold">Sent to Warehouse</div><div>Waiting...</div></li>
      <li class="timeline-event"><div style="font-weight:bold">Shipped</div><div>Pending</div></li>
      <li class="timeline-event"><div style="font-weight:bold">Out for Delivery</div><div>Pending</div></li>
      <li class="timeline-event"><div style="font-weight:bold">Delivered</div><div>Pending</div></li>
    `;
  }
  
  document.getElementById('displayTimeline').innerHTML = tHtml;
  orderCard.classList.add('visible');
  btn.innerText = 'TRACK';
}
