import { products } from '../data/products.js';
import { formatPrice, onCurrencyChange } from '../currency.js';
import { openQuickView } from './cart.js';
import { gsap } from '../core/gsap.js';

// Get recently viewed list from sessionStorage
export function getRecentlyViewed() {
  try {
    return JSON.parse(sessionStorage.getItem('pawdrop_recently_viewed')) || [];
  } catch (e) {
    return [];
  }
}

// Save recently viewed list to sessionStorage
export function saveRecentlyViewed(list) {
  try {
    sessionStorage.setItem('pawdrop_recently_viewed', JSON.stringify(list));
  } catch (e) {
    console.error("Failed to save recently viewed:", e);
  }
}

// Add a product ID to recently viewed is called on click
export function addRecentlyViewed(productId) {
  let list = getRecentlyViewed();
  
  // Filter out if already exists, then prepend to start
  list = list.filter(id => id !== productId);
  list.unshift(productId);
  
  // Cap at 6 items
  if (list.length > 6) {
    list = list.slice(0, 6);
  }
  
  saveRecentlyViewed(list);
  updateRecentlyViewedUI();
}

// Render/Update the UI for recently viewed section
export function updateRecentlyViewedUI() {
  const section = document.getElementById('recentlyViewedSection');
  const grid = document.getElementById('recentlyViewedGrid');
  if (!section || !grid) return;
  
  const list = getRecentlyViewed();
  if (list.length === 0) {
    section.style.display = 'none';
    return;
  }
  
  section.style.display = 'block';
  
  // Render recently viewed items
  grid.innerHTML = list.map(id => {
    const p = products.find(prod => prod.id === id);
    if (!p) return '';
    return `
      <div class="recent-card" data-id="${p.id}" style="cursor: pointer;">
        <div class="recent-card__img-wrap">
          <img referrerPolicy="no-referrer" src="${p.img}" alt="${p.name}">
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; padding-top: 8px;">
          <span class="recent-card__cat">${p.category}</span>
          <h4 class="recent-card__name">${p.name}</h4>
          <span class="recent-card__price neon">${formatPrice(p.price)}</span>
        </div>
      </div>
    `;
  }).join('');
  
  // Attach event handlers on clicking cards
  const cards = grid.querySelectorAll('.recent-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.id);
      openQuickView(id);
    });
  });

  // Attach hover animation if GSAP is available
  cards.forEach(card => {
    const img = card.querySelector('img');
    card.addEventListener('mouseenter', () => {
      gsap.to(img, { scale: 1.05, duration: 0.3, ease: 'power2.out' });
      gsap.to(card, { borderColor: 'rgba(210, 255, 0, 0.4)', duration: 0.3, ease: 'power2.out' });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(img, { scale: 1, duration: 0.3, ease: 'power2.out' });
      gsap.to(card, { borderColor: 'rgba(255, 255, 255, 0.08)', duration: 0.3, ease: 'power2.out' });
    });
  });
}

export function initRecentlyViewed() {
  // Listen to product-viewed event
  window.addEventListener('product-viewed', (e) => {
    if (e.detail && e.detail.id) {
      addRecentlyViewed(e.detail.id);
    }
  });

  updateRecentlyViewedUI();
  
  const clearBtn = document.getElementById('clearRecentlyViewed');
  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      saveRecentlyViewed([]);
      updateRecentlyViewedUI();
    });
  }

  // Listen to currency changes to redraw prices
  try {
    onCurrencyChange(() => {
      updateRecentlyViewedUI();
    });
  } catch (err) {
    console.warn("Failed to subscribe onCurrencyChange for recently viewed:", err);
  }
}
