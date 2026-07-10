// Tracking Component Logic

import { gsap } from '../core/gsap.js';
import { db } from '../firebase-config.js';

export function initTracking() {
  const navTrackBtn = document.getElementById('navTrackBtn');
  const footerTrackBtns = document.querySelectorAll('.footerTrackBtnLink');
  const footerTrackBtnOld = document.getElementById('footerTrackBtn'); // fallback
  const overlay = document.getElementById('trackingOverlay');
  const modalClose = document.getElementById('trackingClose');
  const form = document.getElementById('trackingForm');
  const formSubmitBtn = document.getElementById('trackSubmitBtn');
  const resultContainer = document.getElementById('trackingResult');

  if (!overlay || !form) return;

  let activeListenerRef = null;
  let activeListenerCallback = null;

  const unsubscribeActiveListener = () => {
    if (activeListenerRef && activeListenerCallback) {
      activeListenerRef.off('value', activeListenerCallback);
      activeListenerRef = null;
      activeListenerCallback = null;
    }
  };

  const openModal = (e) => {
    e?.preventDefault();
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
    unsubscribeActiveListener();
    // Reset form and result smoothly
    setTimeout(() => {
      form.reset();
      resultContainer.hidden = true;
      resultContainer.innerHTML = '';
      formSubmitBtn.disabled = false;
      form.style.display = 'flex';
    }, 400);
  };

  navTrackBtn?.addEventListener('click', openModal);
  footerTrackBtnOld?.addEventListener('click', openModal);
  footerTrackBtns.forEach(btn => btn.addEventListener('click', openModal));
  modalClose?.addEventListener('click', closeModal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const orderId = document.getElementById('trackOrderId').value.trim();
    const email = document.getElementById('trackEmail').value.trim();

    if (!orderId || !email) return;

    // Show loading state
    formSubmitBtn.disabled = true;
    form.style.display = 'none';
    resultContainer.hidden = false;
    resultContainer.innerHTML = `
      <div class="tracking-loader">
        <div class="loader-spinner"></div>
        <div class="loader-text">LOCATING SHIPMENT...</div>
      </div>
    `;

    try {
      const formattedOrderId = orderId.toUpperCase();
      const orderRef = db.ref("orders/" + formattedOrderId);
      
      const onValueCallback = (snap) => {
        const order = snap.val();
        
        // If order doesn't exist
        if (!order) {
          resultContainer.innerHTML = `
            <div class="tracking-error" style="border-top:none; margin-top:0;">
              Order not found. Please verify your order ID.
            </div>
            <button class="btn btn--outline btn--full" id="trackAgainBtn" style="margin-top:20px; text-transform:uppercase;">TRY AGAIN</button>
          `;
          const trackAgainBtn = document.getElementById('trackAgainBtn');
          trackAgainBtn?.addEventListener('click', () => {
            unsubscribeActiveListener();
            resultContainer.hidden = true;
            resultContainer.innerHTML = '';
            formSubmitBtn.disabled = false;
            form.style.display = 'flex';
          });
          return;
        }

        // Email validation
        const orderEmail = order.customer?.email || '';
        if (orderEmail.toLowerCase().trim() !== email.toLowerCase().trim()) {
          resultContainer.innerHTML = `
            <div class="tracking-error" style="border-top:none; margin-top:0;">
              The email provided does not match the record for this order ID.
            </div>
            <button class="btn btn--outline btn--full" id="trackAgainBtn" style="margin-top:20px; text-transform:uppercase;">TRY AGAIN</button>
          `;
          const trackAgainBtn = document.getElementById('trackAgainBtn');
          trackAgainBtn?.addEventListener('click', () => {
            unsubscribeActiveListener();
            resultContainer.hidden = true;
            resultContainer.innerHTML = '';
            formSubmitBtn.disabled = false;
            form.style.display = 'flex';
          });
          return;
        }

        // Render success timeline
        renderRealtimeTimeline(order);
      };

      // Set up the real-time listener
      unsubscribeActiveListener();
      activeListenerRef = orderRef;
      activeListenerCallback = onValueCallback;
      orderRef.on('value', onValueCallback);

    } catch (error) {
      console.error("Tracking Error:", error);
      resultContainer.innerHTML = `
        <div class="tracking-error" style="border-top:none; margin-top:0;">
          An error occurred while connecting to database. Please try again.
        </div>
        <button class="btn btn--outline btn--full" id="trackAgainBtn" style="margin-top:20px; text-transform:uppercase;">TRY AGAIN</button>
      `;
      const trackAgainBtn = document.getElementById('trackAgainBtn');
      trackAgainBtn?.addEventListener('click', () => {
        unsubscribeActiveListener();
        resultContainer.hidden = true;
        resultContainer.innerHTML = '';
        formSubmitBtn.disabled = false;
        form.style.display = 'flex';
      });
    }
  });

  function renderRealtimeTimeline(order) {
    const status = order.status || 'pending';
    const statusColors = {
      pending: '#888888',
      processing: '#D2FF00',
      shipped: '#00D4FF',
      delivered: '#00FF88',
      manual_review: '#FF8800'
    };
    const statusColor = statusColors[status] || '#888888';

    let trackingInfoHTML = '';
    if (order.tracking && order.tracking.number) {
      trackingInfoHTML = `
        <div class="tracking-info-header" style="margin-bottom: 20px; padding: 15px; border: 1px dashed var(--border); background-color: var(--black-2); display: flex; flex-direction: column; gap: 8px;">
          <div style="font-family: var(--font-display); font-size: 11px; letter-spacing: 0.1em; color: var(--gray);">CARRIER SHIPMENT DETECTED</div>
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <span style="color: var(--white); font-weight: 600; font-size: 13px;">${order.tracking.carrier || 'Standard Carrier'}</span>
              <span class="neon" style="font-family: var(--font-mono); font-size: 13px; margin-left: 8px;">#${order.tracking.number}</span>
            </div>
            ${order.tracking.url ? `
              <a href="${order.tracking.url}" target="_blank" class="btn btn--outline" style="padding: 6px 12px; font-size: 10px; border-color: var(--neon); color: var(--neon); text-transform: uppercase;">TRACK SHIPMENT ↗</a>
            ` : ''}
          </div>
        </div>
      `;
    }

    // Determine steps list
    let steps = [];
    if (order.tracking && order.tracking.timeline && order.tracking.timeline.length > 0) {
      // Map CJ timeline Directly
      steps = order.tracking.timeline.map((item, idx) => {
        const isLatest = idx === 0;
        return {
          title: item.status || 'In Transit',
          date: item.time || 'Update Pending',
          location: item.content || '',
          completed: true,
          active: isLatest
        };
      });
    } else {
      // General steps based on order.status
      const dateFormatted = order.date ? new Date(order.date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : 'Pending';

      steps = [
        {
          title: 'Order Placed',
          date: dateFormatted,
          location: 'Approved at Checkout',
          completed: true,
          active: status === 'pending'
        },
        {
          title: 'Sent to Warehouse',
          date: status !== 'pending' ? 'Verified & Packed' : 'Pending Verification',
          location: 'Logistics Division',
          completed: status !== 'pending',
          active: status === 'processing'
        },
        {
          title: 'Shipped',
          date: ['shipped', 'delivered'].includes(status) ? 'Left Facility' : 'Awaiting dispatch',
          location: order.tracking?.carrier || 'Carrier hub',
          completed: ['shipped', 'delivered'].includes(status),
          active: status === 'shipped'
        },
        {
          title: 'Delivered',
          date: status === 'delivered' ? 'Completed' : 'Expected soon',
          location: 'Shipping Address',
          completed: status === 'delivered',
          active: status === 'delivered'
        }
      ];
    }

    // Build timeline HTML
    let timelineHTML = `
      <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 15px;">
        <div>
          <div style="color: var(--gray); font-size: 10px; font-family: var(--font-mono); letter-spacing: 0.1em; text-transform: uppercase;">Order ID</div>
          <div style="font-family: var(--font-display); font-size: 16px; font-weight: 700; color: var(--white);">${order.id}</div>
        </div>
        <div style="text-align: right;">
          <div style="color: var(--gray); font-size: 10px; font-family: var(--font-mono); letter-spacing: 0.1em; text-transform: uppercase;">Status</div>
          <div style="font-size: 12px; font-weight: 700; color: ${statusColor}; display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
            <span style="font-size: 8px;">●</span> ${status.toUpperCase().replace('_', ' ')}
          </div>
        </div>
      </div>
      ${trackingInfoHTML}
      <div class="tracking-timeline">
    `;

    steps.forEach((step) => {
      let stepClass = 'tracking-step';
      if (step.completed) stepClass += ' is-completed';
      if (step.active) stepClass += ' is-active';

      let iconHtml = '';
      if (step.active) {
        iconHtml = '○';
      } else if (step.completed) {
        iconHtml = '✓';
      } else {
        iconHtml = '';
      }

      timelineHTML += `
        <div class="${stepClass}">
          <div class="step__icon">${iconHtml}</div>
          <div class="step__info">
            <div class="step__title">${step.title}</div>
            <div class="step__date">${step.date}</div>
            ${step.location ? `<div class="step__location">${step.location}</div>` : ''}
          </div>
        </div>
      `;
    });

    timelineHTML += `
      </div>
      <div style="margin-top: 30px; display: flex; gap: 15px;">
        <button class="btn btn--outline btn--full" id="trackCloseResultsBtn" style="font-size: 11px;">CLOSE</button>
        <button class="btn btn--fill btn--full" id="trackNewQueryBtn" style="font-size: 11px;">TRACK ANOTHER</button>
      </div>
    `;

    resultContainer.innerHTML = timelineHTML;

    // Register action triggers
    document.getElementById('trackCloseResultsBtn')?.addEventListener('click', closeModal);
    document.getElementById('trackNewQueryBtn')?.addEventListener('click', () => {
      unsubscribeActiveListener();
      resultContainer.hidden = true;
      resultContainer.innerHTML = '';
      formSubmitBtn.disabled = false;
      form.style.display = 'flex';
    });

    // Add GSAP stagger animation
    gsap.fromTo(resultContainer.querySelectorAll('.tracking-step'), 
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
    );
  }
}
