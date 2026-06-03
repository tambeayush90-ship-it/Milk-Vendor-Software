import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { db } from './db';
import { Customer, MilkEntry } from '../types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const googleAuth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let googleUser: User | null = null;
const listeners: ((connected: boolean) => void)[] = [];

// Allow other files to monitor connection state changes
export const subscribeToGoogleConnection = (callback: (connected: boolean) => void) => {
  listeners.push(callback);
  callback(!!cachedAccessToken);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
};

const notifyListeners = () => {
  const connected = !!cachedAccessToken;
  listeners.forEach(cb => cb(connected));
};

// Check if we are connected and have an active cachedAccessToken
export const isGoogleConnected = () => {
  return !!cachedAccessToken;
};

export const getGoogleUser = () => {
  return googleUser;
};

// Get the spreadsheet ID from local storage so we persist the connection identifier
export const getLinkedSpreadsheetId = (): string | null => {
  return localStorage.getItem('google_spreadsheet_id');
};

export const setLinkedSpreadsheetId = (id: string | null) => {
  if (id) {
    localStorage.setItem('google_spreadsheet_id', id);
  } else {
    localStorage.removeItem('google_spreadsheet_id');
  }
};

// Listen to auth changes
onAuthStateChanged(googleAuth, async (user) => {
  googleUser = user;
  if (!user) {
    cachedAccessToken = null;
    notifyListeners();
  } else {
    // If we have a user but no cached token (refresh case), the user will need to reconnect/click connect.
    // However, if we get it via signInWithPopup, it will be cached.
    if (!cachedAccessToken) {
      // Prompt reconnect by keeping cachedAccessToken null
      notifyListeners();
    }
  }
});

// Perform sign-in to Google Workspace
export const connectGoogle = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(googleAuth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve OAuth Access Token from sign-in.');
    }
    cachedAccessToken = credential.accessToken;
    googleUser = result.user;
    notifyListeners();
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google connect error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Disconnect/Logout from Google
export const disconnectGoogle = async () => {
  try {
    await googleAuth.signOut();
  } catch (err) {
    console.error('Failed to sign out of Google:', err);
  }
  cachedAccessToken = null;
  googleUser = null;
  notifyListeners();
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

// Search for existing backup sheet titled "Milk Vendor Backup"
export const findBackupSpreadsheet = async (accessToken: string): Promise<string | null> => {
  try {
    const q = encodeURIComponent("name = 'Milk Vendor Backup' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) {
      throw new Error(`Failed to query Google Drive: ${res.statusText}`);
    }
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  } catch (err) {
    console.error('Error finding spreadsheet:', err);
    return null;
  }
};

// Create a new spreadsheet with separate tabs for Customers and MilkEntries
export const createBackupSpreadsheet = async (accessToken: string): Promise<string> => {
  try {
    const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: 'Milk Vendor Backup',
        },
        sheets: [
          {
            properties: {
              title: 'Customers',
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
          {
            properties: {
              title: 'MilkEntries',
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to create spreadsheet: ${res.statusText}`);
    }

    const data = await res.json();
    return data.spreadsheetId;
  } catch (err) {
    console.error('Error creating backup spreadsheet:', err);
    throw err;
  }
};

// Upload customers and entries to Google Sheets
export const pushDataToGoogleSheets = async (
  accessToken: string,
  spreadsheetId: string,
  customers: Customer[],
  entries: MilkEntry[]
): Promise<void> => {
  // 1. Clear existing Sheets first or update with headers and dynamic rows
  const customersHeaders = ['ID', 'Code', 'Name', 'WhatsApp/Phone', 'Milk Type', 'Created At', 'Updated At'];
  const customersRows = customers.map(c => [
    c.id || '',
    c.code || '',
    c.name || '',
    c.whatsapp || '',
    c.milk_type || '',
    c.createdAt || c.created_at || '',
    c.updatedAt || '',
  ]);

  const entriesHeaders = ['ID', 'Customer Code', 'Amount (L)', 'Milk Type', 'Date', 'Price/L', 'Total Price ($)', 'Created At'];
  const entriesRows = entries.map(e => [
    e.id || '',
    e.customer_code || '',
    e.amount_liters || 0,
    e.milk_type || '',
    e.date || '',
    e.price_per_liter || 0,
    e.total_price || 0,
    e.createdAt || e.created_at || '',
  ]);

  // Clear Sheets to remove stale data
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Customers!A1:G10000:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/MilkEntries!A1:H10000:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // Write Customers
  const customerRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Customers!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: 'Customers!A1',
        majorDimension: 'ROWS',
        values: [customersHeaders, ...customersRows],
      }),
    }
  );

  if (!customerRes.ok) {
    throw new Error(`Failed to update Customers tab: ${customerRes.statusText}`);
  }

  // Write MilkEntries
  const entriesRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/MilkEntries!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: 'MilkEntries!A1',
        majorDimension: 'ROWS',
        values: [entriesHeaders, ...entriesRows],
      }),
    }
  );

  if (!entriesRes.ok) {
    throw new Error(`Failed to update MilkEntries tab: ${entriesRes.statusText}`);
  }
};

// Orchestrates fully fetching and pushing all local data to sheets
export const syncAllData = async (): Promise<string> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google account is not connected. Please connect from settings.');
  }

  // Load local data
  const customers = await db.getCustomers();
  const entries = await db.getEntries();

  let spreadsheetId = getLinkedSpreadsheetId();

  if (!spreadsheetId) {
    // Attempt to search for one
    spreadsheetId = await findBackupSpreadsheet(token);
    if (!spreadsheetId) {
      // Create a fresh one
      spreadsheetId = await createBackupSpreadsheet(token);
    }
    setLinkedSpreadsheetId(spreadsheetId);
  }

  await pushDataToGoogleSheets(token, spreadsheetId, customers, entries);
  return spreadsheetId;
};

// Automatic background sync (silent helper)
export const triggerBackgroundSync = async () => {
  try {
    const token = await getAccessToken();
    if (token) {
      await syncAllData();
      console.log('Background backup sync completed successfully');
    }
  } catch (err) {
    console.error('Background backup sync failed silently:', err);
  }
};
