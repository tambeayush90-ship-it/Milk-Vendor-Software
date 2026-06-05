import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const firestore = getFirestore(app);

const AUTH_DOC_PATH = 'vendor_config/auth';
const OWNER_AUTH_DOC_PATH = 'vendor_config/owner_auth';
const DEFAULT_PASSWORD = 'Saiwagh1234';
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

// Helper to wrap firestore reads with a timeout so they don't hang if offline
async function getDocWithTimeout(ref: any, timeoutMs: number = 20000): Promise<any> {
  const timeoutPromise = new Promise<any>((_, reject) => {
    setTimeout(() => {
      reject(new Error("Database read timed out: Please check your internet connection."));
    }, timeoutMs);
  });
  return await Promise.race([
    getDoc(ref),
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
        // Cache successfully retrieved password
        localStorage.setItem(CACHE_VENDOR_KEY, data.password);
        return data.password;
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
  try {
    // Use a generous 20-second timeout to ensure the server handshake has adequate time even on slower mobile connections
    await setDocWithTimeout(authRef, { password: newPassword }, 20000);
    return { synced: true };
  } catch (err: any) {
    console.warn("Cloud password sync timed out, but queued locally in Firestore & localStorage:", err);
    if (err?.message?.includes("timed out")) {
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
  try {
    // Use a generous 20-second timeout to ensure the server handshake has adequate time even on slower mobile connections
    await setDocWithTimeout(authRef, { password: newPassword }, 20000);
    return { synced: true };
  } catch (err: any) {
    console.warn("Cloud password sync timed out, but queued locally in Firestore & localStorage:", err);
    if (err?.message?.includes("timed out")) {
      return {
        synced: false,
        warning: "Saved successfully on this device! Your password will automatically sync to the cloud database once you connect to the internet."
      };
    }
    throw err;
  }
}


