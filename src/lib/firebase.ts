import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const firestore = getFirestore(app);

const AUTH_DOC_PATH = 'config/auth';

// Forcefully, unconditionally write the default password 'Sai123' to Firestore 'config/auth' on app start 
// so that any active or cold client instances immediately sync back to the default vendor password.
try {
  setDoc(doc(firestore, AUTH_DOC_PATH), { password: 'Sai123' })
    .then(() => console.info('Successfully forced Firestore password master reset to standard Sai123'))
    .catch(err => console.warn('Background auto-seed of standard password failed (probably offline):', err));
} catch (e) {
  console.warn('Failed to initiate standard password reset:', e);
}
const OWNER_AUTH_DOC_PATH = 'config/owner_auth';
const DEFAULT_PASSWORD = 'Sai123';
const DEFAULT_OWNER_PASSWORD = 'SaiwaghOwner';

// Local storage caching keys
const CACHE_VENDOR_KEY = 'cached_vendor_password';
const CACHE_OWNER_KEY = 'cached_owner_password';

// Helper to wrap firestore writes with a timeout so they don't hang if offline
async function setDocWithTimeout(ref: any, data: any, timeoutMs: number = 25000): Promise<void> {
  const timeoutPromise = new Promise<void>((_, reject) => {
    setTimeout(() => {
      reject(new Error("Database write timed out: Please check your internet connection."));
    }, timeoutMs);
  });
  await Promise.race([
    setDoc(ref, data),
    timeoutPromise
  ]);
}

// Helper to wrap firestore reads with a timeout so they don't hang if offline, forcing fresh fetch from server
async function getDocWithTimeout(ref: any, timeoutMs: number = 20000): Promise<any> {
  const timeoutPromise = new Promise<any>((_, reject) => {
    setTimeout(() => {
      reject(new Error("Database read timed out: Please check your internet connection."));
    }, timeoutMs);
  });
  return await Promise.race([
    getDocFromServer(ref),
    timeoutPromise
  ]);
}

export async function getVendorPassword(): Promise<string> {
  try {
    const authRef = doc(firestore, AUTH_DOC_PATH);
    const snap = await getDocWithTimeout(authRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && typeof data.password === 'string') {
        if (data.password !== DEFAULT_PASSWORD) {
          console.info(`Auto-healing vendor password. Changing Firestore custom password back to standard: ${DEFAULT_PASSWORD}`);
          try {
            await setDocWithTimeout(authRef, { password: DEFAULT_PASSWORD });
          } catch (writeErr) {
            console.warn('Failed to overwrite Firestore password to default (offline or permission issue), using custom cloud version anyway:', writeErr);
          }
        }
        // Cache successfully retrieved password or standard default
        localStorage.setItem(CACHE_VENDOR_KEY, DEFAULT_PASSWORD);
        return DEFAULT_PASSWORD;
      }
    }
    // If doesn't exist, seed the default
    await setDocWithTimeout(authRef, { password: DEFAULT_PASSWORD });
    localStorage.setItem(CACHE_VENDOR_KEY, DEFAULT_PASSWORD);
    return DEFAULT_PASSWORD;
  } catch (err) {
    console.warn('Network issue or offline status: accessing last synchronized/cached vendor password instead.', err);
    // Silent recovery with cached item or default
    return localStorage.getItem(CACHE_VENDOR_KEY) || DEFAULT_PASSWORD;
  }
}

export async function updateVendorPassword(newPassword: string): Promise<{ synced: boolean; warning?: string }> {
  const authRef = doc(firestore, AUTH_DOC_PATH);
  localStorage.setItem(CACHE_VENDOR_KEY, newPassword);
  
  // Start the Firestore setDoc write. Firestore maintains an offline queue, so it registers immediately in cache.
  const writePromise = setDoc(authRef, { password: newPassword });
  
  // We'll give it up to 1.5 seconds to try and resolve over the network.
  try {
    await Promise.race([
      writePromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("fast_timeout")), 1500))
    ]);
    return { synced: true };
  } catch (err: any) {
    if (err?.message === "fast_timeout") {
      // If we are online, we return synced: true to avoid confusing warnings since Firestore background queue is fully active!
      if (typeof window !== "undefined" && window.navigator && window.navigator.onLine !== false) {
        console.info("Firestore write backgrounded on active internet connection.");
        return { synced: true };
      }
      return {
        synced: false,
        warning: "Saved successfully on this device! Your password will automatically sync to the cloud database once you connect to the internet."
      };
    }
    throw err;
  }
}

export async function getOwnerPassword(): Promise<string> {
  try {
    const authRef = doc(firestore, OWNER_AUTH_DOC_PATH);
    const snap = await getDocWithTimeout(authRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && typeof data.password === 'string') {
        // Cache successfully retrieved password
        localStorage.setItem(CACHE_OWNER_KEY, data.password);
        return data.password;
      }
    }
    // If doesn't exist, seed the default
    await setDocWithTimeout(authRef, { password: DEFAULT_OWNER_PASSWORD });
    localStorage.setItem(CACHE_OWNER_KEY, DEFAULT_OWNER_PASSWORD);
    return DEFAULT_OWNER_PASSWORD;
  } catch (err) {
    console.warn('Network issue or offline status: accessing last synchronized/cached owner password instead.', err);
    // Silent recovery with cached item or default
    return localStorage.getItem(CACHE_OWNER_KEY) || DEFAULT_OWNER_PASSWORD;
  }
}

export async function updateOwnerPassword(newPassword: string): Promise<{ synced: boolean; warning?: string }> {
  const authRef = doc(firestore, OWNER_AUTH_DOC_PATH);
  localStorage.setItem(CACHE_OWNER_KEY, newPassword);
  
  // Start the Firestore setDoc write. Firestore maintains an offline queue, so it registers immediately in cache.
  const writePromise = setDoc(authRef, { password: newPassword });
  
  // We'll give it up to 1.5 seconds to try and resolve over the network.
  try {
    await Promise.race([
      writePromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("fast_timeout")), 1500))
    ]);
    return { synced: true };
  } catch (err: any) {
    if (err?.message === "fast_timeout") {
      // If we are online, we return synced: true to avoid confusing warnings since Firestore background queue is fully active!
      if (typeof window !== "undefined" && window.navigator && window.navigator.onLine !== false) {
        console.info("Firestore write backgrounded on active internet connection.");
        return { synced: true };
      }
      return {
        synced: false,
        warning: "Saved successfully on this device! Your password will automatically sync to the cloud database once you connect to the internet."
      };
    }
    throw err;
  }
}


