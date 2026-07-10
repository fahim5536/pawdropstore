import { db } from '../firebase-config.js';
import { subscribeToFirestoreProducts } from '../firebase.js';

const baseProducts = [
  {
    id: 1,
    name: 'Automatic Water Fountain',
    category: 'HYDRATION',
    price: 29.99,
    desc: 'Self-cleaning, auto-refills. 2.5L capacity.',
    img: 'https://picsum.photos/600/400?random=1',
    sold: 1540
  },
  {
    id: 2,
    name: 'Slow Feeder Bowl',
    category: 'FEEDING',
    price: 19.99,
    desc: 'Promotes healthy eating pace. Anti-slip base.',
    img: 'https://picsum.photos/600/400?random=2',
    sold: 850
  },
  {
    id: 3,
    name: 'LED Safety Collar',
    category: 'SAFETY',
    price: 17.99,
    desc: 'USB rechargeable. 3 light modes. Waterproof.',
    img: 'https://picsum.photos/600/400?random=3',
    sold: 340
  },
  {
    id: 4,
    name: 'Window Cat Perch',
    category: 'COMFORT',
    price: 24.99,
    desc: 'Suction cup mount. Holds up to 25kg.',
    img: 'https://picsum.photos/600/400?random=4',
    sold: 2200
  },
  {
    id: 5,
    name: 'Grooming Glove',
    category: 'GROOMING',
    price: 15.99,
    desc: 'Gentle rubber tips. Works wet or dry.',
    img: 'https://picsum.photos/600/400?random=5',
    sold: 1100
  },
  {
    id: 6,
    name: 'Interactive Laser Toy',
    category: 'PLAY',
    price: 21.99,
    desc: 'Auto-rotating. 3 speed modes. Timer function.',
    img: 'https://picsum.photos/600/400?random=6',
    sold: 900
  }
];

export const products = [];

// Load custom imported and standard products from localStorage in real-time
export function refreshProducts() {
  products.length = 0; // Reset contents of exported array
  
  // Get list of deleted product IDs
  let deletedIds = [];
  try {
    const delRaw = localStorage.getItem('pawdrop_deleted_products');
    if (delRaw) {
      deletedIds = JSON.parse(delRaw).map(id => String(id).trim());
    }
  } catch(e){}

  // Load from local localStorage sync copy of Firebase real-time cache
  let loadedFromCache = false;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('pawdrop_imported_products');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach(p => {
            const idStr = String(p.id).trim();
            const cjPidStr = String(p.cj_pid || p.cjPid || '').trim();
            const isDeleted = deletedIds.includes(idStr) || (cjPidStr && deletedIds.includes(cjPidStr));
            if (!isDeleted && !products.some(existing => String(existing.id) === idStr)) {
              products.push({
                id: Number(p.id),
                cj_pid: p.cj_pid || p.cjPid || null,
                name: p.name,
                category: p.category || 'IMPORTED',
                price: Number(p.price),
                desc: p.desc || 'Pawdrop premium item.',
                img: p.img,
                sold: p.sold || 120,
                rating: p.rating || 4.5
              });
            }
          });
          loadedFromCache = true;
        }
      }
    } catch (e) {
      console.error("Failed to load products from local storage", e);
    }
  }

  // Fallback: If nothing was loaded from cache yet, populate with standard products to guarantee UI never looks empty
  if (!loadedFromCache || products.length === 0) {
    baseProducts.forEach(p => {
      const idStr = String(p.id).trim();
      if (!deletedIds.includes(idStr) && !products.some(existing => String(existing.id) === idStr)) {
        products.push(p);
      }
    });
  }
}

// Perform initial loader pass
refreshProducts();

// Dynamic server-side product fetching (with cache backup)
export async function loadProductsFromServer() {
  try {
    const res = await fetch('/api/inventory');
    if (!res.ok) throw new Error("HTTP Status " + res.status);
    const data = await res.json();
    if (data && data.success && Array.isArray(data.products)) {
      console.log("[Products Sync] Loaded live server-side inventory:", data.products);
      localStorage.setItem('pawdrop_imported_products', JSON.stringify(data.products));
      refreshProducts();
      window.dispatchEvent(new CustomEvent('pawdrop-products-updated'));
      return true;
    }
  } catch (e) {
    console.warn("[Products Sync] Could not fetch products from server, falling back to local storage caches:", e.message);
  }
  return false;
}

// Automatically trigger server-side sync in the browser
if (typeof window !== 'undefined') {
  setTimeout(() => {
    loadProductsFromServer().catch(err => console.error("Async products server loading failed:", err));
  }, 100);
}

// Seed initial baseProducts to Realtime Database if empty, to ensure catalog exists in Firebase RTDB
function seedProductsToRealtimeDb() {
  if (typeof window !== 'undefined' && db) {
    db.ref('products').once('value').then((snapshot) => {
      if (!snapshot.exists() || Object.keys(snapshot.val() || {}).length === 0) {
        console.log("[Firebase RTDB] Product catalog empty in Firebase. Seeding standard products...");
        const initialProducts = {};
        baseProducts.forEach(p => {
          initialProducts[p.id] = {
            id: p.id,
            name: p.name,
            category: p.category,
            price: p.price,
            desc: p.desc,
            img: p.img,
            sold: p.sold,
            rating: p.rating || 4.5,
            is_base: true
          };
        });
        db.ref('products').update(initialProducts).then(() => {
          console.log("[Firebase RTDB] Seed completed successfully.");
        }).catch(err => {
          console.error("[Firebase RTDB] Seed failed:", err);
        });
      }
    }).catch(err => {
      console.error("[Firebase RTDB] Error checking catalog presence:", err);
    });
  }
}

// Listen to Firebase Firestore products in real time and trigger dynamic re-render
if (typeof window !== 'undefined') {
  subscribeToFirestoreProducts((list) => {
    try {
      console.log("[Firestore Sync] Real-time Firestore product list update received:", list.length, "items.");
      localStorage.setItem('pawdrop_imported_products', JSON.stringify(list));
      refreshProducts();
      window.dispatchEvent(new CustomEvent('pawdrop-products-updated'));
    } catch (e) {
      console.error("Firebase Firestore sync products error:", e);
    }
  });
}


