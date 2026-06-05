import React, { createContext, useContext, useEffect, useState } from 'react';
import { Eye, EyeOff, Coins, LogOut, Loader2 } from 'lucide-react';
import { getVendorPassword, getOwnerPassword } from '../lib/firebase';

export interface User {
  uid: string;
  role: 'vendor' | 'owner';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logOut: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logOut: () => {},
  error: null,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [inputId, setInputId] = useState('');
  const [inputPass, setInputPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Custom pricing configuration state
  const [pricesSet, setPricesSet] = useState(() => {
    return localStorage.getItem('custom_cow_milk_price') !== null && 
           localStorage.getItem('custom_buffalo_milk_price') !== null;
  });

  const [cowOnboardingPrice, setCowOnboardingPrice] = useState('');
  const [buffaloOnboardingPrice, setBuffaloOnboardingPrice] = useState('');
  const [setupError, setSetupError] = useState<string | null>(null);

  const handleSavePrices = (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);
    const cp = parseFloat(cowOnboardingPrice);
    const bp = parseFloat(buffaloOnboardingPrice);

    if (isNaN(cp) || cp <= 0 || isNaN(bp) || bp <= 0) {
      setSetupError('Please enter valid positive selling prices for both Cow and Buffalo milk.');
      return;
    }

    localStorage.setItem('custom_cow_milk_price', cp.toString());
    localStorage.setItem('custom_buffalo_milk_price', bp.toString());
    setPricesSet(true);
  };

  // Eager prefetch cache for lightning-fast sign-in authentication
  const [cachedCloudPass, setCachedCloudPass] = useState<{ vendor?: string; owner?: string }>({});

  useEffect(() => {
    // Eagerly prefetch latest cloud passwords to check credentials instantly upon form submission
    const prefetchCloudPasswords = async () => {
      try {
        const [vPass, oPass] = await Promise.all([
          getVendorPassword(),
          getOwnerPassword(),
        ]);
        setCachedCloudPass({ vendor: vPass, owner: oPass });
      } catch (e) {
        console.warn('Silent eager password prefetch failed due to network:', e);
      }
    };
    prefetchCloudPasswords();
  }, [user]);

  useEffect(() => {
    const savedUser = localStorage.getItem('localUser');
    const savedRole = localStorage.getItem('localUserRole') as 'vendor' | 'owner' | null;
    if (savedUser && savedRole) {
      setUser({ uid: savedUser, role: savedRole });
    }
    setLoading(false);
  }, []);

  const logOut = () => {
    localStorage.removeItem('localUser');
    localStorage.removeItem('localUserRole');
    localStorage.removeItem('localUserPassword');
    setUser(null);
  };

  // Sync / Lock-check on active sessions
  useEffect(() => {
    const checkCredentialsInBg = async () => {
      const savedUser = localStorage.getItem('localUser');
      const savedRole = localStorage.getItem('localUserRole') as 'vendor' | 'owner' | null;
      const savedPass = localStorage.getItem('localUserPassword');

      if (!savedUser || !savedRole || !savedPass) return;

      try {
        let newestCloudPassword = "";
        if (savedRole === 'owner') {
          newestCloudPassword = await getOwnerPassword();
        } else {
          newestCloudPassword = await getVendorPassword();
        }

        if (newestCloudPassword && newestCloudPassword !== savedPass) {
          console.warn("Cloud password mismatch detected (Owner changed the password). Logging out vendor session.");
          logOut();
        }
      } catch (e) {
        console.warn("Background credentials verification sync failed:", e);
      }
    };

    checkCredentialsInBg();

    // Verify credentials dynamically in the background every 15 seconds to lock the app instantly if owner updates the code
    const interval = setInterval(checkCredentialsInBg, 15000);

    // Also check when browser tab gains active focus back
    window.addEventListener('focus', checkCredentialsInBg);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkCredentialsInBg);
    };
  }, [user]);

  const [loggingIn, setLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoggingIn(true);
    const lowerId = inputId.trim().toLowerCase();
    const isOwner = lowerId === 'owner' || lowerId === 'admin' || lowerId === 'tambeayush90@gmail.com';
    const submittedPass = inputPass.trim();

    try {
      if (isOwner) {
        // Try to get real-time owner password from the database, but fallback immediately to cache/default if slow or offline
        let correctPass = cachedCloudPass.owner;
        try {
          correctPass = await getOwnerPassword();
        } catch (err) {
          console.warn('Real-time owner password fetch failed, using cached instead:', err);
        }
        if (!correctPass) {
          correctPass = 'SaiwaghOwner'; // Safe default
        }

        if (submittedPass === correctPass) {
          const u: User = { uid: 'owner', role: 'owner' };
          localStorage.setItem('localUser', u.uid);
          localStorage.setItem('localUserRole', u.role);
          localStorage.setItem('localUserPassword', submittedPass);
          setUser(u);
        } else {
          setError('Invalid Owner password.');
        }
      } else if (lowerId === 'sai wagh' || lowerId === 'saiwagh') {
        // Try to get real-time vendor password from the database, but fallback immediately to cache/default if slow or offline
        let correctPass = cachedCloudPass.vendor;
        try {
          correctPass = await getVendorPassword();
        } catch (err) {
          console.warn('Real-time vendor password fetch failed, using cached instead:', err);
        }
        if (!correctPass) {
          correctPass = 'Saiwagh1234'; // Safe default
        }

        if (submittedPass === correctPass) {
          const u: User = { uid: 'saiwagh', role: 'vendor' };
          localStorage.setItem('localUser', u.uid);
          localStorage.setItem('localUserRole', u.role);
          localStorage.setItem('localUserPassword', submittedPass);
          setUser(u);
        } else {
          setError('Invalid Vendor password.');
        }
      } else {
        setError('Invalid ID. Use your name or "owner" to sign in.');
      }
    } catch (err) {
      console.error(err);
      setError('Could not reach server to authenticate. Please connect to internet.');
    } finally {
      setLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-8 h-8 focus:outline-none border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sign In</h1>
            <p className="text-slate-500 mt-2">Please sign in with your ID to continue.</p>
          </div>
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
          <div className="space-y-4 text-left">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ID</label>
              <input 
                type="text" 
                value={inputId} 
                onChange={e => setInputId(e.target.value)} 
                className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="e.g. Sai Wagh"
                required 
                disabled={loggingIn}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={inputPass} 
                  onChange={e => setInputPass(e.target.value)} 
                  className="w-full p-3 pr-10 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  placeholder="Enter Password"
                  required 
                  disabled={loggingIn}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  disabled={loggingIn}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={loggingIn}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55"
          >
            {loggingIn && <Loader2 className="w-4 h-4 animate-spin text-white" />}
            {loggingIn ? 'Authenticating...' : 'Login'}
          </button>
        </form>
      </div>
    );
  }

  if (!pricesSet) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-2">
              <Coins className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Set Initial Milk Rates</h1>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              Welcome, vendor! Please set your primary selling price per liter for both Cow and Buffalo milk before adding customers.
            </p>
          </div>

          {setupError && (
            <div className="p-3.5 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-semibold">
              {setupError}
            </div>
          )}

          <form onSubmit={handleSavePrices} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                  Cow Milk (₹ / Liter)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                    placeholder="e.g. 50"
                    value={cowOnboardingPrice}
                    onChange={(e) => setCowOnboardingPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                  Buffalo Milk (₹ / Liter)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                    placeholder="e.g. 60"
                    value={buffaloOnboardingPrice}
                    onChange={(e) => setBuffaloOnboardingPrice(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition duration-150 shadow-lg shadow-indigo-600/20 active:scale-[0.98] cursor-pointer"
              >
                Establish Custom Milk Rates
              </button>

              <button
                type="button"
                onClick={logOut}
                className="w-full py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm transition font-medium flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-slate-400" />
                Sign Out / Change User
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, logOut, error }}>
      {children}
    </AuthContext.Provider>
  );
}
