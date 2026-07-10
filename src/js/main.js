// Import styles for compilation
import '../css/main.css';

// Import core libraries
import './core/lenis.js';
import './core/gsap.js';
import { onCurrencyChange } from './currency.js';
import { initLoader } from './core/loader.js';

// Import elements and widgets
import { initTheme } from './theme.js';
import { observeReveals } from './core/observer.js';
import { initNavbar } from './components/navbar.js';
import { initMarquees } from './components/marquee.js';
import { initCart, renderProducts, updateCartUI } from './components/cart.js';
import { initCheckout } from './components/checkout.js';
import { initCounters } from './components/counter.js';
import { initTracking } from './components/tracking.js';
import { initSearch } from './components/search.js';
import { initFAQ } from './components/faq.js';
import { initShop } from './components/shop.js';
import { initNewsletter } from './components/newsletter.js';
import { initAuth } from './components/auth.js';
import { initWishlistGlobal, updateWishlistUI } from './wishlist.js';
import { initFirestoreSync } from './components/firestoreSync.js';
import { initRecentlyViewed } from './components/recentlyViewed.js';
import { orderManager } from './orderManager.js';
import { initChatWidget } from './components/chatWidget.js';
import { updatePageSEO } from './core/seo.js';
import './three/scene.js';

window.addEventListener("load", () => {
  // Previously synced orders here
});

// Initialize all features on DOM Ready
function runInit() {
  // Initialize page-level SEO
  try {
    const filename = window.location.pathname.split('/').pop() || 'index.html';
    let titleText = 'Premium Pet Gear';
    let descText = 'Discover PAWDROP, the premier curated pet accessories store. Smart pet feeding devices, dog accessories, feline products, and smart toys with worldwide shipping.';
    if (filename === 'shop.html') {
      titleText = 'Shop Premium Pet Products & Gear';
      descText = 'Browse our hand-selected products catalog. Find dog beds, smart toys, auto-feeders, collars, and cat perches.';
    } else if (filename === 'about.html') {
      titleText = 'About PAWDROP | Curated Quality';
      descText = 'Learn about our passion for pets and how we source only premium-tier toys, feeders, and accessories.';
    } else if (filename === 'contact.html') {
      titleText = 'Contact Support & Inquiries';
      descText = 'Get in touch with the PAWDROP support team. We reply within 24 hours to help with tracking, orders, or sizing.';
    } else if (filename === 'faq.html') {
      titleText = 'Frequently Asked Questions';
      descText = 'Get fast answers to shipping times, refund policies, tracking inquiries, and sizing options on PAWDROP.';
    } else if (filename === 'wishlist.html') {
      titleText = 'Your Wishlist | Premium Picks';
      descText = 'Save your favorite pet gear in your personal PAWDROP wishlist.';
    } else if (filename === 'orders.html') {
      titleText = 'Track Orders & Shipments';
      descText = 'Keep active tabs on dropshipped shipments, order status, and customer receipt logs live.';
    } else if (filename === 'profile.html') {
      titleText = 'User Profile Dashboard';
      descText = 'Manage your PAWDROP customer profile, connected services, and primary shipping parameters.';
    } else if (filename === 'privacy.html') {
      titleText = 'Privacy Policy';
      descText = 'Read the privacy policy of PAWDROP storefront.';
    } else {
      titleText = 'Home | PAWDROP';
    }
    updatePageSEO(titleText, descText);
  } catch (e) {
    console.error("Failed to run page-level SEO update:", e);
  }

  // 1. Initialize Loader immediately to ensure the preloader animates and hides successfully
  try {
    initLoader();
  } catch (err) {
    console.error("Critical error in initLoader:", err);
    try {
      const loader = document.getElementById('preloader');
      if (loader) loader.style.display = 'none';
      document.body.classList.remove('is-loading');
    } catch (e) {}
  }

  // 2. Initialize subsequent features inside independent try-catch blocks so they don't block each other
  try { initTheme(); } catch (e) { console.error("Error initializing Theme:", e); }
  try { observeReveals(document.querySelectorAll('[data-reveal]')); } catch (e) { console.error("Error initializing ObserveReveals:", e); }
  try { initWishlistGlobal(); } catch (e) { console.error("Error initializing WishlistGlobal:", e); }
  try { initNavbar(); } catch (e) { console.error("Error initializing Navbar:", e); }
  try { initMarquees(); } catch (e) { console.error("Error initializing Marquees:", e); }
  try { initCart(); } catch (e) { console.error("Error initializing Cart:", e); }
  try { initCheckout(); } catch (e) { console.error("Error initializing Checkout:", e); }
  try { initCounters(); } catch (e) { console.error("Error initializing Counters:", e); }
  try { initTracking(); } catch (e) { console.error("Error initializing Tracking:", e); }
  try { initSearch(); } catch (e) { console.error("Error initializing Search:", e); }
  try { initFAQ(); } catch (e) { console.error("Error initializing FAQ:", e); }
  try { initShop(); } catch (e) { console.error("Error initializing Shop:", e); }
  try { initNewsletter(); } catch (e) { console.error("Error initializing Newsletter:", e); }
  try { initAuth(); } catch (e) { console.error("Error initializing Auth:", e); }
  try { initFirestoreSync(); } catch (e) { console.error("Error initializing FirestoreSync:", e); }
  try { initRecentlyViewed(); } catch (e) { console.error("Error initializing RecentlyViewed:", e); }
  try { initChatWidget(); } catch (e) { console.error("Error initializing ChatWidget:", e); }

  // Globally synchronize currency state and trigger re-render of prices
  try {
    onCurrencyChange((currency) => {
      // 1. Update Cart UI globally
      try { updateCartUI(); } catch (e) { console.error(e); }
      
      // 2. Update Wishlist UI globally
      try { updateWishlistUI(); } catch (e) { console.error(e); }
      
      // 3. Update Product Grid. Shop page handles its own grid via updateGrid.
      if (!document.getElementById('shopFilters')) {
        try { renderProducts(); } catch (e) { console.error(e); }
      }
      
      // 4. Update checkout modal (if prices become included there, else dispatch global event)
      window.dispatchEvent(new CustomEvent('re-render-prices', { detail: currency }));
    });
  } catch (err) {
    console.error("Error registering onCurrencyChange handler:", err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runInit);
} else {
  runInit();
}

