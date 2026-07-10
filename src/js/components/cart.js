import { products } from '../data/products.js';
import { gsap, ScrollTrigger } from '../core/gsap.js';
import { observeReveals } from '../core/observer.js';
import { getFavorites, toggleFavorite, updateWishlistUI } from '../wishlist.js';
import { formatPrice, onCurrencyChange } from '../currency.js';
import { safeStorage } from '../core/storage.js';
import { getInventory, auth, getReviewsForProduct, createReview, checkHasPurchasedProduct } from '../firebase.js';
import { trackProductView, trackAddToCart } from '../core/analytics.js';
import { updateProductSEO } from '../core/seo.js';

let cartItems = [];
try {
  cartItems = JSON.parse(safeStorage.getItem('pawdrop_cart')) || [];
} catch (e) {
  cartItems = [];
}

let inventoryData = null;
let isFetchingInventory = false;

export function getCartItems() {
  return cartItems;
}

export function setCartItems(items) {
  cartItems = items || [];
  updateCartUI();
}

export function clearCart() {
  cartItems = [];
  updateCartUI();
}

// Render product cards
export function renderProducts(filteredProducts = products) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  
  if (grid.dataset.type === 'featured') {
    // If featured, sort by sold count and take top 6
    filteredProducts = [...products].sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, 6);
  }
  
  const favs = getFavorites();

  // Async load inventory of products to display low stock warning
  if (!inventoryData && !isFetchingInventory) {
    isFetchingInventory = true;
    getInventory().then(inv => {
      inventoryData = inv || [];
      isFetchingInventory = false;
      renderProducts(filteredProducts);
    }).catch(err => {
      console.warn("Failed to load inventory:", err);
      inventoryData = [];
      isFetchingInventory = false;
      renderProducts(filteredProducts);
    });
  }
  
  if (filteredProducts.length === 0) {
    grid.innerHTML = '<div class="products__empty" style="grid-column: 1 / -1; text-align: center; color: var(--gray); font-family: var(--font-display); padding: 40px 0;">No products found matching your search.</div>';
  } else {
    grid.innerHTML = filteredProducts.map(p => {
      const isFav = favs.includes(p.id);

      // Check stock
      let stockVal = null;
      if (inventoryData) {
        const invItem = inventoryData.find(item => parseInt(item.id) === p.id || item.productId === p.id);
        if (invItem) {
          stockVal = invItem.stock;
        }
      }

      const isLowStock = stockVal !== null && stockVal < 5;
      const lowStockBadge = isLowStock ? `<span class="product-card__badge">LOW STOCK (${stockVal} Left)</span>` : '';

      return `
      <div class="product-card" data-reveal style="cursor: pointer;">
        ${lowStockBadge}
        <span class="product-card__cat">${p.category}</span>
        <button class="product-card__fav ${isFav ? 'is-active' : ''}" data-id="${p.id}" aria-label="Favorite">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="${isFav ? 'currentColor' : 'none'}" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>
        <div class="product-card__img-wrap">
          <img src="${p.img}" alt="${p.name}" loading="lazy">
        </div>
        <h3 class="product-card__name">${p.name}</h3>
        <p class="product-card__desc">${p.desc}</p>
        <div class="product-card__footer">
          <span class="product-card__price neon">${formatPrice(p.price)}</span>
          <button class="btn-add" data-id="${p.id}">ADD +</button>
        </div>
      </div>
    `}).join('');
  }

  // Apply IntersectionObserver to newly added product cards for scroll fade-in
  const cards = grid.querySelectorAll('.product-card');
  observeReveals(cards);

  document.querySelectorAll('.btn-add').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      addToCart(parseInt(btn.dataset.id));
    });
  });

  document.querySelectorAll('.product-card__fav').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      
      const id = parseInt(btn.dataset.id);
      const icon = btn.querySelector('svg');
      
      // Optimistic UI update
      const isCurrentlyActive = btn.classList.contains('is-active');
      if (isCurrentlyActive) {
        btn.classList.remove('is-active');
        icon.setAttribute('fill', 'none');
      } else {
        btn.classList.add('is-active');
        icon.setAttribute('fill', 'currentColor');
      }
      
      gsap.fromTo(icon, 
        { scale: 0.8 }, 
        { scale: 1.2, duration: 0.15, yoyo: true, repeat: 1, ease: 'power1.inOut' }
      );
      setTimeout(() => {
        toggleFavorite(id);
      }, 150); // slight delay so animation plays out
    });
  });

  // Open quick view modal on clicking product card itself
  document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // If user clicked fav or add to cart button, ignore
      if (e.target.closest('.product-card__fav') || e.target.closest('.btn-add')) {
        return;
      }
      const addBtn = card.querySelector('.btn-add');
      if (addBtn) {
        const id = parseInt(addBtn.dataset.id);
        openQuickView(id);
      }
    });
  });

  // Add advanced GSAP hover animations for product cards with interactive pan-zoom
  document.querySelectorAll('.product-card').forEach(card => {
    const wrap = card.querySelector('.product-card__img-wrap');
    if (!wrap) return;
    const img = wrap.querySelector('img');
    if (!img) return;

    card.addEventListener('mouseenter', () => {
      // Scale up to 1.35 to allow fine details exploration
      gsap.to(img, { scale: 1.35, duration: 0.5, ease: 'power2.out' });
      gsap.to(card, { borderColor: 'rgba(210, 255, 0, 0.4)', duration: 0.4, ease: 'power2.out' });
    });

    card.addEventListener('mousemove', (e) => {
      const rect = wrap.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Calculate cursor position percentage inside the image container
      const xPercent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const yPercent = Math.max(0, Math.min(100, (y / rect.height) * 100));
      
      // Smoothly pan the magnified focal point
      gsap.to(img, { 
        transformOrigin: `${xPercent}% ${yPercent}%`, 
        duration: 0.2, 
        ease: 'power1.out',
        overwrite: 'auto'
      });
    });

    card.addEventListener('mouseleave', () => {
      // Smoothly reset scale and center origin
      gsap.to(img, { 
        scale: 1, 
        transformOrigin: 'center center', 
        duration: 0.5, 
        ease: 'power2.out',
        overwrite: 'auto'
      });
      gsap.to(card, { borderColor: 'rgba(255, 255, 255, 0.08)', duration: 0.4, ease: 'power2.out' });
    });
  });
}

export function openQuickView(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  // Dispatch product-viewed event to track recently viewed items
  window.dispatchEvent(new CustomEvent('product-viewed', { detail: { id } }));

  // Track standard GA4 view_item event
  trackProductView(product);

  // Dynamically update SEO configurations & Open Graph metadata
  updateProductSEO(product);

  const contentZone = document.getElementById('quickViewContent');
  if (!contentZone) return;

  let qty = 1;

  contentZone.innerHTML = `
    <div class="quickview__top">
      <div class="quickview__img-wrap">
        <img referrerPolicy="no-referrer" src="${product.img}" alt="${product.name}">
      </div>
      <div class="quickview__content">
        <span class="quickview__cat">${product.category}</span>
        <h3 class="quickview__title">${product.name}</h3>
        <p class="quickview__desc">${product.desc}</p>
        
        <div class="quickview__price-label">Price</div>
        <div class="quickview__price neon" id="qvPrice">${formatPrice(product.price)}</div>

        <div class="quickview__qty-section">
          <span class="quickview__qty-label">Quantity:</span>
          <div class="quickview__qty-controls">
            <button class="quickview__qty-btn" id="qvMinus" type="button">−</button>
            <span class="quickview__qty-num" id="qvQtyVal">1</span>
            <button class="quickview__qty-btn" id="qvPlus" type="button">+</button>
          </div>
        </div>

        <button class="quickview__btn-add" id="qvAddBtn" type="button">
          ADD TO CART — <span id="qvSubtotal">${formatPrice(product.price)}</span>
        </button>
      </div>
    </div>
    <div class="quickview__reviews-box" id="qvReviewsBox"></div>
  `;

  // Update dynamic logic inside the quick view modal
  const qvMinus = document.getElementById('qvMinus');
  const qvPlus = document.getElementById('qvPlus');
  const qvQtyVal = document.getElementById('qvQtyVal');
  const qvSubtotal = document.getElementById('qvSubtotal');
  const qvAddBtn = document.getElementById('qvAddBtn');

  if (qvMinus && qvPlus && qvQtyVal && qvSubtotal && qvAddBtn) {
    const updateSubtotal = () => {
      qvQtyVal.textContent = qty;
      qvSubtotal.textContent = formatPrice(product.price * qty);
    };

    qvMinus.addEventListener('click', (e) => {
      e.preventDefault();
      if (qty > 1) {
        qty--;
        updateSubtotal();
      }
    });

    qvPlus.addEventListener('click', (e) => {
      e.preventDefault();
      qty++;
      updateSubtotal();
    });

    qvAddBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // Add exact quantity to cart
      addToCart(product.id, qty);
      closeQuickView();
    });
  }

  // Load and Render Customer Reviews
  const reviewsBox = document.getElementById('qvReviewsBox');
  if (reviewsBox) {
    loadAndRenderReviews(product.id, reviewsBox);
  }

  // Reload reviews if user logs in/out while modal is open
  if (window.quickViewAuthListener) {
    window.removeEventListener('auth-changed', window.quickViewAuthListener);
  }
  window.quickViewAuthListener = () => {
    const box = document.getElementById('qvReviewsBox');
    if (box && document.getElementById('quickViewOverlay')?.classList.contains('is-open')) {
      loadAndRenderReviews(product.id, box);
    }
  };
  window.addEventListener('auth-changed', window.quickViewAuthListener);

  // Open modal animation
  const overlay = document.getElementById('quickViewOverlay');
  const modal = document.getElementById('quickViewModal');
  if (overlay && modal) {
    overlay.classList.add('is-open');
    gsap.fromTo(modal,
      { scale: 0.9, opacity: 0, y: 30 },
      { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
    );
  }
}

export function closeQuickView() {
  const overlay = document.getElementById('quickViewOverlay');
  const modal = document.getElementById('quickViewModal');
  if (!overlay || !modal) return;

  if (window.quickViewAuthListener) {
    window.removeEventListener('auth-changed', window.quickViewAuthListener);
    window.quickViewAuthListener = null;
  }

  gsap.to(modal, {
    scale: 0.9,
    opacity: 0,
    y: 30,
    duration: 0.3,
    ease: 'power2.in',
    onComplete: () => {
      overlay.classList.remove('is-open');
    }
  });
}

async function loadAndRenderReviews(productId, container) {
  if (!container) return;
  
  container.innerHTML = `
    <div style="display: flex; justify-content: center; padding: 40px 0;">
      <div style="width: 30px; height: 30px; border: 2px solid transparent; border-top-color: var(--neon); border-radius: 50%; animation: spin 0.6s linear infinite;"></div>
    </div>
  `;

  try {
    const reviews = await getReviewsForProduct(productId);
    
    // Calculate stats
    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
      : "0.0";
    
    // Draw star display helper
    const getStarsHtml = (rating) => {
      let starsHtml = '';
      for (let i = 1; i <= 5; i++) {
        if (i <= Math.round(rating)) {
          starsHtml += '★';
        } else {
          starsHtml += '<span class="star-empty">★</span>';
        }
      }
      return `<span class="rating-stars-static">${starsHtml}</span>`;
    };

    // User Check
    const user = auth.currentUser;
    let hasPurchased = false;
    if (user) {
      hasPurchased = await checkHasPurchasedProduct(user.uid, productId);
    }

    container.innerHTML = `
      <div class="reviews-header">
        <h4 class="reviews-header__title">Customer Reviews</h4>
        <div class="reviews-header__summary">
          <span>${avgRating} / 5.0</span>
          ${getStarsHtml(Number(avgRating))}
          <span style="color: var(--gray); font-size: 12px;">(${totalReviews} ${totalReviews === 1 ? 'review' : 'reviews'})</span>
        </div>
      </div>
      
      <div class="reviews-layout">
        <div class="reviews-list" id="reviewsList">
          ${totalReviews === 0 
            ? `<div class="review-notice" style="text-align: left; padding: 20px 0;">No reviews yet for this accessory. Be the first to leave one!</div>` 
            : reviews.map(r => `
                <div class="review-item">
                  <div class="review-item__meta">
                    <span class="review-item__author">${r.userName || "Verified Buyer"}</span>
                    <span class="review-item__date">${new Date(r.createdAt).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'})}</span>
                  </div>
                  <div class="review-item__stars">${getStarsHtml(r.rating)}</div>
                  <p class="review-item__text">${escapeHtml(r.reviewText)}</p>
                </div>
              `).join('')
          }
        </div>
        
        <div class="review-form-container">
          <h5 class="review-form-title">Write a Review</h5>
          <div id="reviewFormContent">
            ${!user 
              ? `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 150px; text-align: center; gap: 15px;">
                  <p class="review-item__text" style="font-size: 14px;">Please sign in to rate and review this product.</p>
                  <button class="review-auth-btn" id="reviewsAuthTriggerBtn" type="button">SIGN IN TO REVIEW</button>
                </div>
                `
              : !hasPurchased 
                ? `
                  <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 150px; text-align: center; gap: 10px;">
                    <div style="font-size: 32px;">🛍️</div>
                    <p class="review-item__text" style="font-size: 13px; max-width: 250px;">Only customers who have purchased this accessory can submit a review.</p>
                  </div>
                  `
                : `
                  <form id="productReviewForm" style="display: flex; flex-direction: column; gap: 15px;">
                    <div class="review-form-group">
                      <label>RATING</label>
                      <div class="review-form-stars">
                        <input type="radio" name="reviewRating" value="5" id="revStar5" required><label for="revStar5">★</label>
                        <input type="radio" name="reviewRating" value="4" id="revStar4" required><label for="revStar4">★</label>
                        <input type="radio" name="reviewRating" value="3" id="revStar3" required><label for="revStar3">★</label>
                        <input type="radio" name="reviewRating" value="2" id="revStar2" required><label for="revStar2">★</label>
                        <input type="radio" name="reviewRating" value="1" id="revStar1" required><label for="revStar1">★</label>
                      </div>
                    </div>
                    <div class="review-form-group">
                      <label>YOUR REVIEW</label>
                      <textarea class="review-form-textarea" id="reviewTextInput" placeholder="Fabulous quality! Highly recommend for active pets..." required></textarea>
                    </div>
                    <button class="review-submit-btn" type="submit">SUBMIT REVIEW</button>
                    <div id="reviewStatusMsg" style="font-family: var(--font-mono); font-size: 12px; display: none; margin-top: 5px;"></div>
                  </form>
                  `
            }
          </div>
        </div>
      </div>
    `;

    // Add submit action
    const reviewForm = container.querySelector('#productReviewForm');
    if (reviewForm) {
      reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const ratingInput = reviewForm.querySelector('input[name="reviewRating"]:checked');
        const textInput = reviewForm.querySelector('#reviewTextInput');
        const submitBtn = reviewForm.querySelector('button[type="submit"]');
        const statusMsg = reviewForm.querySelector('#reviewStatusMsg');

        if (!ratingInput) {
          showMsg('Please select a rating score.', true, statusMsg);
          return;
        }

        const ratingVal = parseInt(ratingInput.value);
        const textVal = textInput.value.trim();

        if (!textVal) {
          showMsg('Please enter your review text.', true, statusMsg);
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'SUBMITTING...';

        try {
          await createReview({
            productId: productId,
            userId: user.uid,
            userName: user.displayName || 'Verified Buyer',
            rating: ratingVal,
            reviewText: textVal,
            createdAt: new Date().toISOString()
          });

          showMsg('Thank you! Review published successfully.', false, statusMsg);
          reviewForm.reset();

          // Refresh reviews view with small delay
          setTimeout(() => {
            loadAndRenderReviews(productId, container);
          }, 1500);

        } catch (err) {
          console.error('Error submitting review:', err);
          showMsg('Failed to submit review. Please try again.', true, statusMsg);
          submitBtn.disabled = false;
          submitBtn.textContent = 'SUBMIT REVIEW';
        }
      });
    }

    // Add auth button trigger
    const authTriggerBtn = container.querySelector('#reviewsAuthTriggerBtn');
    if (authTriggerBtn) {
      authTriggerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Dispatch event to open auth modal
        window.dispatchEvent(new CustomEvent('open-auth-modal', {
          detail: { message: 'SIGN IN TO LEAVE A REVIEW ON THIS ACCESSORY' }
        }));
      });
    }

  } catch (err) {
    console.error('Error loading reviews:', err);
    container.innerHTML = `<div class="review-notice" style="color: red;">Failed to load customer reviews.</div>`;
  }
}

function showMsg(message, isError, element) {
  if (!element) return;
  element.textContent = message;
  element.style.color = isError ? '#ff4444' : 'var(--neon)';
  element.style.display = 'block';
  gsap.fromTo(element, { opacity: 0, y: 5 }, { opacity: 1, y: 0, duration: 0.3 });
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function addToCart(id, qty = 1) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  // Track standard GA4/GTM add_to_cart event dynamically with PID
  trackAddToCart(product, qty);

  const existing = cartItems.find(i => i.id === id);
  if (existing) {
    existing.qty += qty;
  } else {
    cartItems.push({ ...product, qty: qty });
  }
  updateCartUI();
  shakeCartIcon();
  
  // Auto open cart when adding item for high-conversion UX
  openCart();
}

export function removeFromCart(id) {
  cartItems = cartItems.filter(i => i.id !== id);
  updateCartUI();
}

export function updateQty(id, delta) {
  const item = cartItems.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeFromCart(id);
  else updateCartUI();
}

export function updateCartUI() {
  if (typeof safeStorage !== 'undefined') {
    safeStorage.setItem('pawdrop_cart', JSON.stringify(cartItems));
  }
  window.dispatchEvent(new CustomEvent('cart-updated', { detail: { cartItems } }));

  const count = cartItems.reduce((s, i) => s + i.qty, 0);
  const total = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  
  const cartCountEl = document.getElementById('cartCount');
  if (cartCountEl) cartCountEl.textContent = count;
  
  const cartTotalEl = document.getElementById('cartTotal');
  if (cartTotalEl) cartTotalEl.textContent = formatPrice(total);
  
  const itemsEl = document.getElementById('cartItems');
  if (!itemsEl) return;
  
  if (cartItems.length === 0) {
    itemsEl.innerHTML = `
      <div class="cart__empty">
        <p>YOUR CART IS EMPTY</p>
      </div>`;
    return;
  }
  
  itemsEl.innerHTML = cartItems.map(item => `
    <div class="cart-item">
      <img src="${item.img}" alt="${item.name}">
      <div class="cart-item__info">
        <span class="cart-item__name">${item.name}</span>
        <span class="cart-item__price neon">
          ${formatPrice(item.price * item.qty)}
        </span>
        <div class="cart-item__qty">
          <button onclick="updateQty(${item.id}, -1)">−</button>
          <span>${item.qty}</span>
          <button onclick="updateQty(${item.id}, 1)">+</button>
        </div>
      </div>
      <button class="cart-item__remove" 
              onclick="removeFromCart(${item.id})">✕</button>
    </div>
  `).join('');
}

function shakeCartIcon() {
  const icon = document.getElementById('cartBtn');
  if (icon) {
    gsap.fromTo(icon,
      { rotation: -8 },
      { rotation: 8, duration: 0.1, repeat: 4, 
        yoyo: true, ease: 'power1.inOut',
        onComplete: () => gsap.set(icon, { rotation: 0 }) }
    );
  }
  
  const cartCountEl = document.getElementById('cartCount');
  if (cartCountEl) {
    gsap.fromTo(cartCountEl,
      { scale: 1.5 },
      { scale: 1, duration: 0.3, ease: 'back.out(3)' }
    );
  }
}

// Open / Close functions to be shared
function openCart() {
  const overlay = document.getElementById('cartOverlay');
  const sidebar = document.getElementById('cartSidebar');
  if (!sidebar || !overlay) return;
  
  sidebar.classList.add('is-open');
  overlay.classList.add('is-visible');
  gsap.fromTo(sidebar,
    { x: '100%' },
    { x: '0%', duration: 0.5, ease: 'power3.out' }
  );
}

function closeCart() {
  const overlay = document.getElementById('cartOverlay');
  const sidebar = document.getElementById('cartSidebar');
  if (!sidebar || !overlay) return;
  
  gsap.to(sidebar, {
    x: '100%', duration: 0.4, ease: 'power3.in',
    onComplete: () => {
      sidebar.classList.remove('is-open');
      overlay.classList.remove('is-visible');
    }
  });
}

// Cart sidebar toggle
export function initCart() {
  renderProducts();
  updateCartUI();
  updateWishlistUI();

  window.addEventListener('pawdrop-products-updated', () => {
    try {
      renderProducts();
      updateCartUI();
    } catch (e) {
      console.error("Failed to re-render cart on products update:", e);
    }
  });

  const cartBtn = document.getElementById('cartBtn');
  const cartClose = document.getElementById('cartClose');
  const overlay = document.getElementById('cartOverlay');

  if (cartBtn) cartBtn.addEventListener('click', openCart);
  if (cartClose) cartClose.addEventListener('click', closeCart);
  if (overlay) overlay.addEventListener('click', closeCart);

  // Inject Quick View Modal container if not present
  if (!document.getElementById('quickViewOverlay')) {
    const qvOverlay = document.createElement('div');
    qvOverlay.className = 'modal-overlay';
    qvOverlay.id = 'quickViewOverlay';
    qvOverlay.innerHTML = `
      <div class="modal quickview-modal" id="quickViewModal">
        <button class="modal__close" id="quickViewClose" aria-label="Close Quick View" type="button">✕</button>
        <div id="quickViewContent" style="display: contents;"></div>
      </div>
    `;
    document.body.appendChild(qvOverlay);

    // Add event listeners for closing
    const closeBtn = qvOverlay.querySelector('#quickViewClose');
    if (closeBtn) closeBtn.addEventListener('click', closeQuickView);
    qvOverlay.addEventListener('click', (e) => {
      if (e.target === qvOverlay) closeQuickView();
    });
  }

  // Bind functions globally so inline HTML onclick handlers can find them
  window.updateQty = updateQty;
  window.removeFromCart = removeFromCart;
}
