import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, collection, addDoc, doc, setDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// Replace this configuration with your actual Firebase Project credentials
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (for Next.js SSR-safe initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = initializeFirestore(app, { experimentalForceLongPolling: true });
export const storage = getStorage(app);

// TypeScript Types
export interface Product {
  id?: string;
  name: string;
  desc: string;
  price: number;
  stock: number;
  category: string;
  img: string;
  sold?: number;
  rating?: number;
  createdAt?: string;
}

export interface Customer {
  name: string;
  phone: string;
  address: string;
}

export interface Order {
  id?: string;
  date: string;
  status: "pending" | "processing" | "shipped" | "delivered";
  customer: Customer;
  items: {
    id: string;
    name: string;
    price: number;
    qty: number;
    img: string;
  }[];
  total: number;
  trackingNumber?: string;
}

/**
 * 1. Upload Product Image to Firebase Storage with Progress State
 */
export function uploadProductImageWithProgress(
  file: File,
  onProgress: (progress: number) => void,
  onComplete: (downloadURL: string) => void,
  onError: (error: Error) => void
) {
  const fileRef = ref(storage, `products/${Date.now()}_${file.name}`);
  const uploadTask = uploadBytesResumable(fileRef, file);

  uploadTask.on(
    "state_changed",
    (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      onProgress(progress);
    },
    (error) => {
      console.error("Storage upload task error:", error);
      onError(error);
    },
    async () => {
      try {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        onComplete(downloadURL);
      } catch (err: any) {
        onError(err);
      }
    }
  );
}

/**
 * 2. Save manual product to Firestore
 */
export async function saveProductToFirestore(product: Product) {
  try {
    const docId = product.id || String(Date.now());
    const docRef = doc(db, "products", docId);
    
    const payload = {
      ...product,
      id: docId,
      sold: product.sold ?? 0,
      rating: product.rating ?? 4.7,
      createdAt: product.createdAt || new Date().toISOString()
    };

    await setDoc(docRef, payload, { merge: true });
    return docId;
  } catch (err) {
    console.error("Error saving manual product to Firestore:", err);
    throw err;
  }
}

/**
 * 3. Fetch products from Firestore
 */
export function subscribeToProducts(onUpdate: (products: Product[]) => void) {
  const q = collection(db, "products");
  return onSnapshot(q, (snapshot) => {
    const list: Product[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Product, "id">)
    }));
    onUpdate(list);
  }, (err) => {
    console.error("Error subscribing to products:", err);
  });
}

/**
 * 4. Submit a new order to Firestore
 */
export async function submitOrderToFirestore(order: Omit<Order, "id">) {
  try {
    const docRef = await addDoc(collection(db, "orders"), order);
    return docRef.id;
  } catch (err) {
    console.error("Error submitting order to Firestore:", err);
    throw err;
  }
}

/**
 * 5. Real-time subscribe to incoming orders for Admin Panel
 */
export function subscribeToIncomingOrders(onUpdate: (orders: Order[]) => void) {
  const q = query(collection(db, "orders"), orderBy("date", "desc"));
  return onSnapshot(q, (snapshot) => {
    const list: Order[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Order, "id">)
    }));
    onUpdate(list);
  }, (err) => {
    console.error("Error subscribing to orders:", err);
  });
}
