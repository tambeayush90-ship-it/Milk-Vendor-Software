import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const firestore = getFirestore(app);

const AUTH_DOC_PATH = 'vendor_config/auth';
const OWNER_AUTH_DOC_PATH = 'vendor_config/owner_auth';
const DEFAULT_PASSWORD = 'Saiwagh1234';
const DEFAULT_OWNER_PASSWORD = 'SaiwaghOwner';

export async function getVendorPassword(): Promise<string> {
  try {
    const authRef = doc(firestore, AUTH_DOC_PATH);
    const snap = await getDoc(authRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && typeof data.password === 'string') {
        return data.password;
      }
    }
    // If doesn't exist, seed the default
    await setDoc(authRef, { password: DEFAULT_PASSWORD });
    return DEFAULT_PASSWORD;
  } catch (err) {
    console.error('Failed to get vendor password from cloud, falling back to default:', err);
    return DEFAULT_PASSWORD;
  }
}

export async function updateVendorPassword(newPassword: string): Promise<void> {
  const authRef = doc(firestore, AUTH_DOC_PATH);
  await setDoc(authRef, { password: newPassword });
}

export async function getOwnerPassword(): Promise<string> {
  try {
    const authRef = doc(firestore, OWNER_AUTH_DOC_PATH);
    const snap = await getDoc(authRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && typeof data.password === 'string') {
        return data.password;
      }
    }
    // If doesn't exist, seed the default
    await setDoc(authRef, { password: DEFAULT_OWNER_PASSWORD });
    return DEFAULT_OWNER_PASSWORD;
  } catch (err) {
    console.error('Failed to get owner password from cloud, falling back to default:', err);
    return DEFAULT_OWNER_PASSWORD;
  }
}

export async function updateOwnerPassword(newPassword: string): Promise<void> {
  const authRef = doc(firestore, OWNER_AUTH_DOC_PATH);
  await setDoc(authRef, { password: newPassword });
}
