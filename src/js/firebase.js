import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { initializeFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, query, where, orderBy, onSnapshot, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Need to import configs or define them. We can fetch firebase-applet-config.json.
// Vite supports importing json natively.
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = firebaseConfig.firestoreDatabaseId
  ? initializeFirestore(app, { experimentalForceLongPolling: true }, firebaseConfig.firestoreDatabaseId)
  : initializeFirestore(app, { experimentalForceLongPolling: true });
export const auth = getAuth();
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');

// Error helper as defined in FIREBASE skill
export var OperationType;
(function(OperationType) {
  OperationType["CREATE"] = "create";
  OperationType["UPDATE"] = "update";
  OperationType["DELETE"] = "delete";
  OperationType["LIST"] = "list";
  OperationType["GET"] = "get";
  OperationType["WRITE"] = "write";
})(OperationType || (OperationType = {}));

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Authentication wrappers
export async function loginWithEmail(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function signupWithEmail(name, email, password) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(userCredential.user, { displayName: name });
  return userCredential;
}

export async function loginWithGoogle() {
  return await signInWithPopup(auth, googleProvider);
}

export async function loginWithApple() {
  return await signInWithPopup(auth, appleProvider);
}

export async function logoutUser() {
  return await signOut(auth);
}

// Firestore operations
export async function createOrder(orderData) {
  try {
    const docRef = await addDoc(collection(db, 'orders'), orderData);
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'orders');
  }
}

export async function getMyOrders(userId) {
  try {
    const q = query(
      collection(db, 'orders'), 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch(err) {
    handleFirestoreError(err, OperationType.LIST, 'orders');
  }
}

export async function saveUserData(userId, email, cart, wishlist) {
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      userId,
      email: email || '',
      cart: cart || [],
      wishlist: wishlist || [],
      updatedAt: new Date().toISOString()
    });
  } catch(err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}`);
  }
}

export async function loadUserData(userId) {
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch(err) {
    handleFirestoreError(err, OperationType.GET, `users/${userId}`);
  }
}

export async function getInventory() {
  try {
    const snap = await getDocs(collection(db, 'inventory'));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'inventory');
  }
}

export async function seedInventoryIfEmpty() {
  if (!auth.currentUser) return;
  try {
    const snap = await getDocs(collection(db, 'inventory'));
    if (!snap.empty) return;

    const initialStocks = {
      1: 12,
      2: 3,  // Low
      3: 4,  // Low
      4: 20,
      5: 2,  // Low
      6: 8
    };

    for (const [idStr, stock] of Object.entries(initialStocks)) {
      const pId = parseInt(idStr);
      const docRef = doc(db, 'inventory', idStr);
      await setDoc(docRef, {
        productId: pId,
        stock: stock,
        updatedAt: new Date().toISOString()
      });
    }
    console.log("Seeded inventory successfully.");
  } catch (err) {
    console.warn("Could not seed inventory:", err);
  }
}

export async function updateInventoryStock(productId, stockValue) {
  try {
    const docRef = doc(db, 'inventory', String(productId));
    await setDoc(docRef, {
      productId: parseInt(productId),
      stock: stockValue,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `inventory/${productId}`);
  }
}

export async function getReviewsForProduct(productId) {
  try {
    const q = query(
      collection(db, 'reviews'),
      where('productId', '==', parseInt(productId)),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'reviews');
  }
}

export async function createReview(reviewData) {
  try {
    const docRef = await addDoc(collection(db, 'reviews'), {
      ...reviewData,
      productId: parseInt(reviewData.productId)
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'reviews');
  }
}

export async function checkHasPurchasedProduct(userId, productId) {
  try {
    const orders = await getMyOrders(userId);
    if (!orders) return false;
    return orders.some(order => {
      if (!order.items) return false;
      return order.items.some(item => Number(item.id) === Number(productId));
    });
  } catch (err) {
    console.warn("Failed to check purchase history:", err);
    return false;
  }
}

export async function syncProductsToFirestore(productsList) {
  if (!auth.currentUser) return;
  try {
    console.log("[Firestore Sync] Bulk syncing products list into firestore...");
    for (const p of productsList) {
      if (!p.id) continue;
      const docRef = doc(db, 'products', String(p.id));
      await setDoc(docRef, {
        id: Number(p.id),
        name: String(p.name || ''),
        category: String(p.category || 'GENERAL'),
        price: Number(p.price || 0),
        desc: String(p.desc || p.description || ''),
        img: String(p.img || p.image || ''),
        sold: Number(p.sold || 0),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
    console.log("[Firestore Sync] Sync to Firestore completed.");
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'products');
  }
}

export function subscribeToFirestoreProducts(callback) {
  const pathForOnSnapshot = 'products';
  const q = collection(db, pathForOnSnapshot);
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, pathForOnSnapshot);
  });
}

// ── Manual Product Upload Functions (using Firebase Storage & Firestore) ──

/**
 * Uploads a local image file to Firebase Storage.
 * Falls back to reading as Base64 Data URL if Firebase Storage is offline or unprovisioned.
 */
export async function uploadProductImage(file) {
  try {
    console.log("[Firebase Storage] Uploading local image to storage bucket...", file.name);
    const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log("[Firebase Storage] Successfully uploaded image. URL:", downloadURL);
    return downloadURL;
  } catch (err) {
    console.warn("[Firebase Storage] Storage upload failed or not enabled. Falling back to base64 DataURL converter...", err);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = (e) => reject(new Error("File conversion to Base64 failed: " + e));
      reader.readAsDataURL(file);
    });
  }
}

/**
 * Saves a manually entered product into Firestore ('products' collection).
 */
export async function addProductToFirestore(productData) {
  try {
    const docId = String(productData.id || Date.now());
    const docRef = doc(db, 'products', docId);
    
    const payload = {
      id: Number(productData.id || Date.now()),
      name: String(productData.name || ''),
      category: String(productData.category || 'GENERAL'),
      price: Number(productData.price || 0),
      desc: String(productData.desc || ''),
      img: String(productData.img || ''),
      sold: Number(productData.sold || 0),
      stock: Number(productData.stock || 50),
      rating: Number(productData.rating || 4.7),
      updatedAt: new Date().toISOString()
    };

    await setDoc(docRef, payload, { merge: true });
    console.log("[Firestore] Product saved manually to products collection:", docId);
    return docId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'products');
  }
}

/**
 * Real-time order synchronization from Firestore 'orders' collection.
 */
export function subscribeToFirestoreOrders(callback) {
  const pathForOnSnapshot = 'orders';
  const q = collection(db, pathForOnSnapshot);
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, pathForOnSnapshot);
  });
}

/**
 * Delete order from Firestore 'orders' collection.
 */
export async function deleteOrder(orderId) {
  try {
    const docRef = doc(db, 'orders', orderId);
    await deleteDoc(docRef);
    console.log("[Firestore] Order deleted successfully:", orderId);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `orders/${orderId}`);
  }
}




