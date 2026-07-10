import { products } from './data/products.js';
import { gsap, ScrollTrigger } from './core/gsap.js';
import { formatPrice } from './currency.js';
import { openQuickView } from './components/cart.js';

import { safeStorage } from './core/storage.js';

// ---- WISHLIST STATE MANAGEMENT ----
export function getFavorites() {
  try {
    return JSON.parse(safeStorage.getItem('pawdrop_favorites')) || [];
  } catch (e) {
    return [];
  }
}

export function setFavorites(favs) {
  safeStorage.setItem('pawdrop_favorites', JSON.stringify(favs));
  updateWishlistUI();
}

export function updateWishlistUI() {
  const count = getFavorites().length;
  document.querySelectorAll('#wishlistCount').forEach(el => {
    el.textContent = count;
  });
}

export function toggleFavorite(id) {
  let favs = getFavorites();
  if (favs.includes(id)) {
    favs = favs.filter(f => f !== id);
  } else {
    favs.push(id);
  }
  setFavorites(favs);
  window.dispatchEvent(new Event('wishlist-updated'));
}

export function addToCartFromWishlist(id) {
  // We'll import addToCart globally since cart.js attaches it to window, or import it.
  if (window.addToCart) {
    window.addToCart(id);
  } else {
    import('./components/cart.js').then(module => {
      module.addToCart(id);
    });
  }
}

export function renderWishlist() {
  const grid = document.getElementById('wishlistGrid');
  if (!grid) return;
  
  const favIds = getFavorites();
  const wishProducts = products.filter(p => favIds.includes(p.id));

  if (wishProducts.length === 0) {
    grid.innerHTML = `
      <div class="wishlist__empty" style="grid-column: 1 / -1;">
        <h2>YOUR WISHLIST IS EMPTY</h2>
        <p style="color: var(--gray); margin-bottom: 20px;">Looks like you haven't saved any items yet.</p>
        <a href="/shop.html" class="btn btn--fill">SHOP NOW →</a>
      </div>
    `;
    return;
  }

  grid.innerHTML = wishProducts.map(p => `
    <div class="product-card" data-reveal>
      <span class="product-card__cat">${p.category}</span>
      <button class="product-card__fav is-active" data-id="${p.id}" aria-label="Favorite">
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="currentColor" stroke-linecap="round" stroke-linejoin="round">
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
  `).join('');

  // Clear existing ScrollTriggers on product cards to avoid duplicates on re-render
  ScrollTrigger.getAll().forEach(t => {
    if (t.vars.trigger && typeof t.vars.trigger === 'object' && t.vars.trigger.classList?.contains('product-card')) {
      t.kill();
    }
  });

  const cards = grid.querySelectorAll('.product-card');
  gsap.set(cards, { opacity: 0, y: 50 });

  // Re-initialize ScrollTrigger batch for newly rendered product cards
  ScrollTrigger.batch(cards, {
    onEnter: batch => gsap.to(batch, 
      { opacity: 1, y: 0, stagger: 0.1, duration: 0.6, ease: 'power2.out', overwrite: 'auto' }
    ),
    once: true
  });

  // Reattach Add-to-cart listeners
  grid.querySelectorAll('.btn-add').forEach(btn => {
    btn.addEventListener('click', () => {
      addToCartFromWishlist(parseInt(btn.dataset.id));
    });
  });

  // Attach Favorite Listeners
  grid.querySelectorAll('.product-card__fav').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      const icon = btn.querySelector('svg');
      
      const isCurrentlyActive = btn.classList.contains('is-active');
      if (isCurrentlyActive) {
        btn.classList.remove('is-active');
        icon.setAttribute('fill', 'none');
        
        // Optionally animate card disappearing
        const card = btn.closest('.product-card');
        gsap.to(card, { opacity: 0, scale: 0.9, duration: 0.3, onComplete: () => {
          card.remove();
          // Check if grid is now empty
          if (grid.children.length === 0) {
            renderWishlist(); // Let it render the empty state
          }
        }});
      }
      
      gsap.fromTo(icon, 
        { scale: 0.8 }, 
        { scale: 1.2, duration: 0.15, yoyo: true, repeat: 1, ease: 'power1.inOut' }
      );
      setTimeout(() => {
        toggleFavorite(id);
      }, 150);
    });
  });

  // Add advanced GSAP hover animations for product cards with interactive pan-zoom
  grid.querySelectorAll('.product-card').forEach(card => {
    const wrap = card.querySelector('.product-card__img-wrap');
    if (!wrap) return;
    const img = wrap.querySelector('img');
    if (!img) return;

    card.addEventListener('mouseenter', () => {
      gsap.to(img, { scale: 1.35, duration: 0.5, ease: 'power2.out' });
    });

    card.addEventListener('mousemove', (e) => {
      const rect = wrap.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const xPercent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const yPercent = Math.max(0, Math.min(100, (y / rect.height) * 100));
      
      gsap.to(img, { 
        transformOrigin: `${xPercent}% ${yPercent}%`, 
        duration: 0.2, 
        ease: 'power1.out',
        overwrite: 'auto'
      });
    });

    card.addEventListener('mouseleave', () => {
      gsap.to(img, { 
        scale: 1, 
        transformOrigin: 'center center', 
        duration: 0.5, 
        ease: 'power2.out',
        overwrite: 'auto'
      });
    });
  });

  // Open quick view modal on clicking product card itself
  grid.querySelectorAll('.product-card').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
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
  
  gsap.fromTo(grid.children, 
    { opacity: 0, y: 30 }, 
    { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: "power3.out" }
  );
}

// Sync across pages and tabs
export function initWishlistGlobal() {
  updateWishlistUI();
  
  window.addEventListener('wishlist-updated', () => {
    updateWishlistUI();
  });

  window.addEventListener('storage', (e) => {
    if (e.key === 'pawdrop_favorites') {
      updateWishlistUI();
      renderWishlist();
      window.dispatchEvent(new Event('wishlist-updated-cross-tab'));
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initWishlistGlobal();
  renderWishlist();
});
