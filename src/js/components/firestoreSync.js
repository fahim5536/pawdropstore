import { auth, saveUserData, loadUserData, seedInventoryIfEmpty } from '../firebase.js';
import { getCartItems, setCartItems } from './cart.js';
import { getFavorites, setFavorites } from '../wishlist.js';

let isSyncing = false;

// Merge logic
async function syncOnLogin(user) {
  if (!user || isSyncing) return;
  isSyncing = true;
  try {
    try {
      await seedInventoryIfEmpty();
    } catch (se) {
      console.warn("Seeding inventory on login failed:", se);
    }
    try {
      // Import and sync product catalog to Firestore
      const { products } = await import('../data/products.js');
      const { syncProductsToFirestore } = await import('../firebase.js');
      await syncProductsToFirestore(products);
    } catch (pe) {
      console.warn("Seeding products to Firestore on login failed:", pe);
    }
    const cloudData = await loadUserData(user.uid);
    const localWishlist = getFavorites();
    const localCart = getCartItems();

    if (cloudData) {
      // Merge wishlists
      const mergedWishlist = Array.from(new Set([...localWishlist, ...(cloudData.wishlist || [])]));
      
      // Merge carts
      const mergedCart = [...localCart];
      const cloudCart = cloudData.cart || [];
      cloudCart.forEach(cloudItem => {
        const localItem = mergedCart.find(i => i.id === cloudItem.id);
        if (localItem) {
          localItem.qty = Math.max(localItem.qty, cloudItem.qty);
        } else {
          mergedCart.push(cloudItem);
        }
      });

      // Update local state without triggering infinite save loops
      setFavorites(mergedWishlist);
      setCartItems(mergedCart);

      // Save fully merged state to Firestore
      await saveUserData(user.uid, user.email, mergedCart, mergedWishlist);
    } else {
      // No cloud data yet, sync local to cloud
      await saveUserData(user.uid, user.email, localCart, localWishlist);
    }
  } catch (err) {
    console.error("Error during login Firestore sync:", err);
  } finally {
    isSyncing = false;
  }
}

async function syncToCloud() {
  const user = auth.currentUser;
  if (!user || isSyncing) return;
  isSyncing = true;
  try {
    const localCart = getCartItems();
    const localWishlist = getFavorites();
    await saveUserData(user.uid, user.email, localCart, localWishlist);
  } catch (err) {
    console.error("Error syncing to Firestore:", err);
  } finally {
    isSyncing = false;
  }
}

export function initFirestoreSync() {
  // Listen for auth changes
  window.addEventListener('auth-changed', (e) => {
    const user = e.detail?.user;
    if (user) {
      syncOnLogin(user);
    }
  });

  // Listen for cart changes
  window.addEventListener('cart-updated', () => {
    syncToCloud();
  });

  // Listen for wishlist changes
  window.addEventListener('wishlist-updated', () => {
    syncToCloud();
  });
}
