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

export async function getVendorPassword(): Promise<string> {
  try {
    const authRef = doc(firestore, AUTH_DOC_PATH);
    const snap = await getDoc(authRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && typeof data.password === 'string') {
        // Cache successfully retrieved password
        localStorage.setItem(CACHE_VENDOR_KEY, data.password);
        return data.password;
      }
    }
    // If doesn't exist, seed the default
    await setDoc(authRef, { password: DEFAULT_PASSWORD });
    localStorage.setItem(CACHE_VENDOR_KEY, DEFAULT_PASSWORD);
    return DEFAULT_PASSWORD;
  } catch (err) {
    console.warn('Network issue or offline status: accessing last synchronized/cached vendor password instead.', err);
    // Silent recovery with cached item or default
    return localStorage.getItem(CACHE_VENDOR_KEY) || DEFAULT_PASSWORD;
  }
}

export async function updateVendorPassword(newPassword: string): Promise<void> {
  const authRef = doc(firestore, AUTH_DOC_PATH);
  await setDoc(authRef, { password: newPassword });
  localStorage.setItem(CACHE_VENDOR_KEY, newPassword);
}

export async function getOwnerPassword(): Promise<string> {
  try {
    const authRef = doc(firestore, OWNER_AUTH_DOC_PATH);
    const snap = await getDoc(authRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && typeof data.password === 'string') {
        // Cache successfully retrieved password
        localStorage.setItem(CACHE_OWNER_KEY, data.password);
        return data.password;
      }
    }
    // If doesn't exist, seed the default
    await setDoc(authRef, { password: DEFAULT_OWNER_PASSWORD });
    localStorage.setItem(CACHE_OWNER_KEY, DEFAULT_OWNER_PASSWORD);
    return DEFAULT_OWNER_PASSWORD;
  } catch (err) {
    console.warn('Network issue or offline status: accessing last synchronized/cached owner password instead.', err);
    // Silent recovery with cached item or default
    return localStorage.getItem(CACHE_OWNER_KEY) || DEFAULT_OWNER_PASSWORD;
  }
}

export async function updateOwnerPassword(newPassword: string): Promise<void> {
  const authRef = doc(firestore, OWNER_AUTH_DOC_PATH);
  await setDoc(authRef, { password: newPassword });
  localStorage.setItem(CACHE_OWNER_KEY, newPassword);
}

