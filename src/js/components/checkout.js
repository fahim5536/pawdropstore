import { gsap } from '../core/gsap.js';
import { orderManager } from '../orderManager.js';
import { getCartItems, clearCart } from './cart.js';
import { formatPrice } from '../currency.js';
import { auth, createOrder } from '../firebase.js';
import { trackBeginCheckout, trackPurchase } from '../core/analytics.js';
import { notifier } from '../notifications.js';

export function updateCheckoutTotal() {
  const items = getCartItems();
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const checkoutTotalEl = document.getElementById('checkoutTotal');
  if (checkoutTotalEl) {
    checkoutTotalEl.textContent = formatPrice(total);
  }
}

export function initCheckout() {
  const checkoutBtn = document.getElementById('checkoutBtn');
  const modalOverlay = document.getElementById('modalOverlay');
  const modalClose = document.getElementById('modalClose');
  const form = document.getElementById('checkoutForm');
  const success = document.getElementById('orderSuccess');

  window.addEventListener('re-render-prices', updateCheckoutTotal);

  function openModal() {
    if (!modalOverlay) return;
    
    // Auth Check
    if (!auth.currentUser) {
      window.dispatchEvent(new CustomEvent('open-auth-modal', { 
        detail: { message: "Please sign in or create an account to place your order.", isError: false }
      }));
      return;
    }

    updateCheckoutTotal();
    // Track standard GA4 begin_checkout event
    trackBeginCheckout(getCartItems());
    modalOverlay.classList.add('is-open');
    gsap.fromTo('.modal',
      { y: 60, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }
    );
  }

  function closeModal() {
    if (!modalOverlay) return;
    gsap.to('.modal', {
      y: 40, opacity: 0, duration: 0.35, ease: 'power3.in',
      onComplete: () => {
        modalOverlay.classList.remove('is-open');
        // Reset form when modal fully closes
        if (form && success) {
          form.hidden = false;
          form.reset();
          success.hidden = true;
        }
      }
    });
  }

  if (checkoutBtn) checkoutBtn.addEventListener('click', openModal);
  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  function createLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '400',
      background: 'rgba(17,17,18,0.95)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px'
    });

    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    Object.assign(spinner.style, {
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      border: '3px solid transparent',
      borderTopColor: '#D2FF00',
      borderBottomColor: '#D2FF00',
      animation: 'spin 0.8s linear infinite'
    });

    const text = document.createElement('div');
    text.className = 'loading-text';
    Object.assign(text.style, {
      fontFamily: 'var(--font-display, Syne)',
      color: '#D2FF00',
      fontSize: '14px',
      letterSpacing: '0.1em'
    });
    text.innerText = 'Processing your order...';

    // Keyframes for spin if not present
    if (!document.getElementById('spin-keyframes')) {
      const style = document.createElement('style');
      style.id = 'spin-keyframes';
      style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
      document.head.appendChild(style);
    }

    overlay.appendChild(spinner);
    overlay.appendChild(text);
    document.body.appendChild(overlay);

    return {
      updateText: (msg) => text.innerText = msg,
      remove: () => document.body.removeChild(overlay)
    };
  }

  function showErrorToast(msg) {
    const toast = document.createElement('div');
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'var(--black)',
      borderLeft: '4px solid #ff4444',
      padding: '16px 24px',
      color: 'var(--white)',
      fontFamily: 'var(--font-body, "DM Sans")',
      fontSize: '14px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      zIndex: '1000',
      opacity: '0',
      transform: 'translateY(20px)'
    });
    toast.innerText = msg;
    document.body.appendChild(toast);

    gsap.to(toast, { opacity: 1, y: 0, duration: 0.3 });
    setTimeout(() => {
      gsap.to(toast, { opacity: 0, y: 20, duration: 0.3, onComplete: () => toast.remove() });
    }, 4000);
  }

    if (form) {
      // Remove any existing event listeners by cloning
      const clonedForm = form.cloneNode(true);
      form.parentNode.replaceChild(clonedForm, form);
      
      clonedForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const inputs = e.target.querySelectorAll("input, textarea");
        
        let cartItems = getCartItems();
        if (cartItems.length === 0) {
          alert("Your cart is empty!");
          return;
        }

        const formData = {
          name: inputs[0]?.value || "",
          email: inputs[1]?.value || "",
          phone: inputs[2]?.value || "",
          address: inputs[3]?.value || "",
          city: inputs[4]?.value || "",
          country: inputs[5]?.value || "",
          zip: inputs[6]?.value || "00000"
        };

        // Show loading
        showLoader("Saving your order...");
        await new Promise(r => setTimeout(r, 800));
        
        updateLoader("Sending to warehouse...");
        // Call the global orderManager
        const order = await orderManager.placeOrder(formData, cartItems);
        
        updateLoader("Almost done...");
        await new Promise(r => setTimeout(r, 600));
        
        hideLoader();

        // Track standard GA4 purchase event with total and product arrays
        trackPurchase(order, cartItems);

        // Send automated admin email notice to alokmessage.app@gmail.com
        notifier.sendAdminOrderNotification(order, cartItems);

        // Show success
        const formWrap = document.getElementById("checkoutSummary")?.parentNode;
        if(formWrap) {
           Array.from(formWrap.children).forEach(child => {
             if(child.tagName !== 'BUTTON' && child.className !== 'modal__close') child.style.display = 'none';
           });
        }

        let successEl = document.getElementById("orderSuccess");
        if (!successEl) {
          successEl = document.createElement("div");
          successEl.id = "orderSuccess";
          clonedForm.parentNode.appendChild(successEl);
        }

        successEl.innerHTML = `
          <h3 class="neon" style="font-family: var(--font-display); font-size: 24px; margin-bottom: 8px;">ORDER CONFIRMED</h3>
          <p id="orderId" style="color: var(--gray); font-family: var(--font-mono); margin-bottom: 16px;">Order #${order.id}</p>
          <p style="margin-bottom: 8px;">Your order has been sent to our warehouse!</p>
          <p style="color:var(--gray);font-size:14px;margin-bottom:24px;">📧 Tracking updates will be sent to ${formData.email}</p>
          <a href="/orders.html?id=${order.id}" class="btn-continue" style="display:inline-block; text-align:center; padding: 16px 32px; background: var(--neon); color: var(--black); text-decoration: none; font-family: var(--font-display); font-weight: bold; width: 100%; border:none; cursor:pointer;">TRACK MY ORDER</a>
        `;
        successEl.style.display = "block";

        // Clear cart
        clearCart();

        // Close modal after 5 seconds
        setTimeout(() => {
          modalOverlay.classList.remove("is-open");
          clonedForm.reset();
          if(formWrap) {
            Array.from(formWrap.children).forEach(child => {
              if(child.id !== 'orderSuccess' && child.className !== 'modal__close') child.style.display = '';
            });
          }
          successEl.style.display = "none";
        }, 5000);
      });
    }

  function showLoader(text) {
    const div = document.createElement("div");
    div.id = "pawLoader";
    div.innerHTML = `
      <div style="text-align:center">
        <div style="
          width:56px; height:56px;
          border:3px solid #222;
          border-top-color:#D2FF00;
          border-radius:50%;
          animation:spin 0.8s linear infinite;
          margin:0 auto 20px;
          box-shadow:0 0 20px rgba(210,255,0,0.3)
        "></div>
        <p id="loaderText" style="
          font-family:'Syne',sans-serif;
          font-size:13px;
          font-weight:700;
          letter-spacing:0.1em;
          color:#D2FF00
        ">${text}</p>
      </div>
    `;
    div.style.cssText = `
      position:fixed; inset:0; z-index:9999;
      background:rgba(17,17,18,0.97);
      display:flex; align-items:center;
      justify-content:center;
    `;
    document.body.appendChild(div);
  }

  function updateLoader(text) {
    const el = document.getElementById("loaderText");
    if (el) el.textContent = text;
  }

  function hideLoader() {
    const el = document.getElementById("pawLoader");
    if (el) el.remove();
  }
}
