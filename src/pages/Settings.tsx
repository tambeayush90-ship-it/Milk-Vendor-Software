import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import { LogOut, Cloud, Check, Loader2, RefreshCw, ExternalLink, Droplet, Coins, Lock } from 'lucide-react';
import {
  connectGoogle,
  disconnectGoogle,
  isGoogleConnected,
  getGoogleUser,
  getLinkedSpreadsheetId,
  syncAllData,
  subscribeToGoogleConnection
} from '../lib/googleDriveAndSheets';
import { getCowMilkPrice, getBuffaloMilkPrice, setCustomMilkPrices } from '../lib/utils';
import { updateVendorPassword, forceLogoutAllDevices } from '../lib/firebase';

export function Settings() {
  const { logOut, user } = useAuth();
  const [connected, setConnected] = useState(isGoogleConnected());
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(getLinkedSpreadsheetId());
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastSynced, setLastSynced] = useState<string | null>(localStorage.getItem('last_backup_time'));

  // Milk pricing configuration state
  const [cowPrice, setCowPrice] = useState<number>(getCowMilkPrice());
  const [buffaloPrice, setBuffaloPrice] = useState<number>(getBuffaloMilkPrice());
  const [priceSuccess, setPriceSuccess] = useState(false);

  // Vendor password update state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Global logout state
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [allStatusMessage, setAllStatusMessage] = useState('');

  const handleLogOutAllDevices = async () => {
    if (!window.confirm("Are you sure you want to log out all connected devices? This will instantly sign out every device using this account (including this one), and requires typing your ID and password again.")) {
      return;
    }
    setLoggingOutAll(true);
    setAllStatusMessage('');
    try {
      await forceLogoutAllDevices();
      setAllStatusMessage('All other sessions revoked. Redirecting...');
      setTimeout(() => {
        logOut();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setAllStatusMessage('Error triggering global logout.');
      setLoggingOutAll(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 4) {
      setPasswordError('Password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setUpdatingPassword(true);
    try {
      await updateVendorPassword(newPassword);
      setPasswordSuccess('Password was updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleSavePrices = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomMilkPrices(cowPrice, buffaloPrice);
    setPriceSuccess(true);
    setTimeout(() => {
      setPriceSuccess(false);
    }, 2500);
  };

  useEffect(() => {
    // Subscribe to Google OAuth Connection changes
    const unsubscribe = subscribeToGoogleConnection((isConnected) => {
      setConnected(isConnected);
      if (isConnected) {
        const user = getGoogleUser();
        setUserEmail(user?.email || 'Connected Account');
        setSpreadsheetId(getLinkedSpreadsheetId());
      } else {
        setUserEmail(null);
        setSpreadsheetId(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleConnect = async () => {
    setErrorMessage('');
    try {
      const result = await connectGoogle();
      if (result) {
        setConnected(true);
        setUserEmail(result.user.email);
        setSpreadsheetId(getLinkedSpreadsheetId());
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to connect to Google account.');
    }
  };

  const handleDisconnect = async () => {
    setErrorMessage('');
    try {
      const confirmed = window.confirm('Are you sure you want to disconnect from Google Sheets and Drive?');
      if (confirmed) {
        await disconnectGoogle();
        setConnected(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to disconnect.');
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncStatus('idle');
    setErrorMessage('');
    try {
      const sheetId = await syncAllData();
      setSpreadsheetId(sheetId);
      setSyncStatus('success');
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = new Date().toLocaleDateString();
      const timestamp = `${dateStr} at ${timeStr}`;
      setLastSynced(timestamp);
      localStorage.setItem('last_backup_time', timestamp);
    } catch (err: any) {
      console.error(err);
      setSyncStatus('error');
      setErrorMessage(err.message || 'Sync failed. Try connecting again.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-4 bg-slate-50 min-h-screen text-slate-900 pb-20">
      <header className="h-auto md:h-20 bg-white border-b border-slate-200 px-4 md:px-8 py-4 md:py-0 flex items-center -mt-4 -mx-4 md:-mx-8 mb-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Settings & Backup</h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Manage Your Data</p>
        </div>
      </header>

      <div className="max-w-xl mx-auto space-y-6">
        {/* Google Drive & Sheets Backup sync block */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h2 className="font-semibold text-lg text-slate-900 flex items-center gap-2">
                <Cloud className="w-5 h-5 text-indigo-600" />
                Google Workspace Backup
              </h2>
              <p className="text-slate-500 text-sm">
                Enables live synchronization of your Milk distribution records and Customers directly with Google Drive and Sheets.
              </p>
            </div>
            <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${connected ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>
              {connected ? 'Active Sync' : 'Disconnected'}
            </span>
          </div>

          <hr className="border-slate-100" />

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
              {errorMessage}
            </div>
          )}

          {connected ? (
            <div className="space-y-6">
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Google Account</span>
                  <span className="text-slate-800 font-bold">{userEmail}</span>
                </div>
                {spreadsheetId && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">Linked Spreadsheet</span>
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 font-bold"
                    >
                      Open Sheet
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
                {lastSynced && (
                  <div className="flex justify-between items-center text-sm border-t border-slate-100 pt-2 mt-2">
                    <span className="text-slate-400">Last Synced</span>
                    <span className="text-slate-500 text-xs font-medium">{lastSynced}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSyncNow}
                  disabled={syncing}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm disabled:opacity-50 transition"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Syncing data...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Backup & Sync Now
                    </>
                  )}
                </button>
                <button
                  onClick={handleDisconnect}
                  className="py-3 px-4 bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 font-semibold rounded-xl text-sm transition"
                >
                  Disconnect
                </button>
              </div>

              {syncStatus === 'success' && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-sm font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                  Backup succeeded! Sheet updated.
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 text-center space-y-6">
              <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
                Sign in with your Google account to backup your records. We will create a spreadsheet named <span className="font-bold text-slate-700">"Milk Vendor Backup"</span> to secure your logs.
              </p>
              
              <div className="flex justify-center">
                {/* Official styled material-design GSI Button */}
                <button 
                  onClick={handleConnect}
                  className="inline-flex items-center justify-center gap-3 py-3 px-5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl shadow-sm text-sm font-bold text-slate-700 transition cursor-pointer active:scale-95"
                >
                  <svg className="w-5 h-5 flex-shrink-0" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Milk Prices Configuration Card */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-6">
          <div className="space-y-1">
            <h2 className="font-semibold text-lg text-slate-900 flex items-center gap-2">
              <Coins className="w-5 h-5 text-indigo-600" />
              Configure Milk Prices
            </h2>
            <p className="text-slate-500 text-sm">
              Set custom price per liter for Cow milk and Buffalo milk. Newly logged entries will calculate bills using these rates.
            </p>
          </div>

          <hr className="border-slate-100" />

          <form onSubmit={handleSavePrices} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">
                   Cow Milk Price (₹ / Liter)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                    placeholder="e.g. 50"
                    value={cowPrice}
                    onChange={(e) => setCowPrice(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">
                   Buffalo Milk Price (₹ / Liter)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                    placeholder="e.g. 60"
                    value={buffaloPrice}
                    onChange={(e) => setBuffaloPrice(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="submit"
                className="w-full sm:w-auto py-3 px-6 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-sm transition cursor-pointer active:scale-95"
              >
                Save Custom Prices
              </button>

              {priceSuccess && (
                <span className="text-emerald-600 text-sm font-bold flex items-center gap-1 animate-fade-in">
                  <Check className="w-4 h-4 stroke-[3]" /> Prices updated successfully!
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Vendor Passcode Settings Card */}
        <div id="change-vendor-password-card" className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-6">
          <div className="space-y-1">
            <h2 className="font-semibold text-lg text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-600" />
              Update Vendor Password
            </h2>
            <p className="text-slate-500 text-sm">
              Change the master access passcode for the "Doodh Setu" vendor account.
            </p>
            <p className="text-amber-600 text-xs font-medium bg-amber-50/70 border border-amber-100 p-2.5 rounded-xl leading-relaxed mt-1">
              ⚠️ Note: Changing this password will immediately lock and sign out all connected vendor devices (including this one), requiring the input of the new password to regain access.
            </p>
          </div>

          <hr className="border-slate-100" />

          {passwordError && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
              {passwordError}
            </div>
          )}

          {passwordSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-sm font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
              {passwordSuccess}
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">
                  New Password
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Confirm Password
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={updatingPassword}
              className="w-full sm:w-auto py-3 px-6 bg-slate-800 hover:bg-slate-900 border border-transparent disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {updatingPassword && <Loader2 className="w-4 h-4 animate-spin text-white" />}
              {updatingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Existing account settings */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-6">
          <div className="space-y-1">
            <h2 className="font-semibold text-lg text-slate-900">Account & Sessions</h2>
            <p className="text-slate-500 text-sm">Manage active sessions and sign out of the Milk Vendor app.</p>
          </div>

          <hr className="border-slate-100" />

          {allStatusMessage && (
            <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl text-sm font-semibold animate-pulse">
              {allStatusMessage}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-col">
              <h3 className="font-medium text-slate-800">Local Session Only</h3>
              <p className="text-xs text-slate-400 mt-0.5">Sign out of the currently active dashboard on this browser window.</p>
            </div>
            <button
              onClick={logOut}
              className="flex items-center justify-center gap-2 py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl font-semibold transition text-sm cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" />
              Sign Out from This Device
            </button>
          </div>

          <hr className="border-slate-100/60" />

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-col">
              <h3 className="font-medium text-red-700">Global Session Lockout</h3>
              <p className="text-xs text-slate-400 mt-0.5">Terminate all active device instances connected to Doodh Setu immediately.</p>
            </div>
            <button
              onClick={handleLogOutAllDevices}
              disabled={loggingOutAll}
              className="flex items-center justify-center gap-2 py-3 px-6 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-xl font-semibold transition text-sm cursor-pointer active:scale-95 whitespace-nowrap lg:self-center"
            >
              {loggingOutAll ? (
                <Loader2 className="w-4 h-4 animate-spin text-red-600" />
              ) : (
                <Lock className="w-4 h-4 text-red-500" />
              )}
              Log Out All Devices
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
