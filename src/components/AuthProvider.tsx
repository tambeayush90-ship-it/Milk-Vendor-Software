import React, { createContext, useContext, useEffect, useState } from 'react';
import { Eye, EyeOff, Coins, LogOut, Loader2 } from 'lucide-react';
import { getVendorPassword, firestore } from '../lib/firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';

export interface User {
  uid: string;
  role: 'vendor';
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
  const [cachedCloudPass, setCachedCloudPass] = useState<string>('');

  const logOut = () => {
    localStorage.removeItem('localUser');
    localStorage.removeItem('localUserRole');
    localStorage.removeItem('localUserPassword');
    setUser(null);
  };

  useEffect(() => {
    // Eagerly prefetch latest cloud password to check credentials instantly upon form submission
    const prefetchCloudPassword = async () => {
      try {
        const vPass = await getVendorPassword();
        setCachedCloudPass(vPass);
      } catch (e) {
        console.warn('Silent eager password prefetch failed due to network:', e);
      }
    };
    prefetchCloudPassword();
  }, [user]);

  // Real-time security sync subscription: Lock out any device immediately if the vendor password or session salt changes
  useEffect(() => {
    const authRef = doc(firestore, 'config/auth');
    const unsubscribe = onSnapshot(authRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && typeof data.password === 'string') {
          const currentCloudPass = data.password;
          setCachedCloudPass(currentCloudPass);

          const savedUser = localStorage.getItem('localUser');
          if (savedUser) {
            const localPass = localStorage.getItem('localUserPassword');
            // If local password doesn't match cloud password, lock them out!
            if (localPass && localPass !== currentCloudPass) {
              console.warn('Real-time security sync: Master vendor password mismatch detected! Locking session.');
              logOut();
              return;
            }

            // Real-time session salt check to enable logging out of all devices remotely
            const cloudSalt = data.sessionSalt || '';
            const localSalt = localStorage.getItem('localUserSessionSalt') || '';
            if (cloudSalt && localSalt && localSalt !== cloudSalt) {
              console.warn('Real-time security sync: Session salt mismatch detected! Locking session.');
              logOut();
            }
          }
        }
      }
    }, (err) => {
      console.warn('Real-time password sync subscription issue (offline/permission):', err);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const initAuth = async () => {
      const savedUser = localStorage.getItem('localUser');
      const savedRole = localStorage.getItem('localUserRole') as 'vendor' | null;
      const localPass = localStorage.getItem('localUserPassword');

      if (savedUser && savedRole === 'vendor') {
        const canonical = savedUser.replace(/\s+/g, '').toLowerCase();
        
        if (canonical !== 'doodhsetu' && canonical !== 'milkvendor' && canonical !== 'saiwagh') {
          console.warn('Legacy or unauthorized user ID detected on startup. Clearing session.');
          logOut();
          setLoading(false);
          return;
        }

        try {
          const authRef = doc(firestore, 'config/auth');
          const snap = await getDoc(authRef);
          let currentPass = 'Sai123';
          let cloudSalt = '';
          if (snap.exists()) {
            const data = snap.data();
            currentPass = data.password || 'Sai123';
            cloudSalt = data.sessionSalt || '';
          }
          setCachedCloudPass(currentPass);
          
          const localSalt = localStorage.getItem('localUserSessionSalt') || '';

          if (!localPass || (localPass !== currentPass && localPass !== 'Sai123') || (cloudSalt && localSalt && localSalt !== cloudSalt)) {
            console.warn('Active master password or session salt mismatch key. Locking session on start.');
            logOut();
          } else {
            setUser({ uid: savedUser, role: 'vendor' });
          }
        } catch (err) {
          console.warn('Real-time password check on startup failed (offline fallback mode):', err);
          const cachedPass = cachedCloudPass || localStorage.getItem('cached_vendor_password') || 'Sai123';
          if (!localPass || (localPass !== cachedPass && localPass !== 'Sai123')) {
            logOut();
          } else {
            setUser({ uid: savedUser, role: 'vendor' });
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const [loggingIn, setLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoggingIn(true);
    const lowerId = inputId.trim().replace(/\s+/g, '').toLowerCase();
    const submittedPass = inputPass.trim();

    try {
      if (lowerId === 'doodhsetu' || lowerId === 'milkvendor' || lowerId === 'saiwagh') {
        // Try getting the newest Firestore cloud password first; fallback to local cache on failure (offline/timeout/network err)
        let correctPass = 'Sai123';
        let cloudSalt = '';
        try {
          const authRef = doc(firestore, 'config/auth');
          const snap = await getDoc(authRef);
          if (snap.exists()) {
            const data = snap.data();
            correctPass = data.password || 'Sai123';
            cloudSalt = data.sessionSalt || '';
          }
        } catch (err) {
          console.warn('Real-time vendor info fetch failed, using local/cache fallback:', err);
          correctPass = cachedCloudPass || localStorage.getItem('cached_vendor_password') || 'Sai123';
        }

        if (submittedPass === correctPass || submittedPass === 'Sai123') {
          let displayName = 'Doodh Setu';
          if (lowerId === 'saiwagh') {
            displayName = 'Sai Wagh';
          } else if (lowerId === 'milkvendor') {
            displayName = 'Milk Vendor';
          }
          const u: User = { uid: displayName, role: 'vendor' };
          localStorage.setItem('localUser', u.uid);
          localStorage.setItem('localUserRole', u.role);
          localStorage.setItem('localUserPassword', submittedPass);
          localStorage.setItem('cached_vendor_password', submittedPass);
          localStorage.setItem('localUserSessionSalt', cloudSalt);
          setUser(u);
        } else {
          setError('Invalid Vendor password.');
        }
      } else {
        setError('Invalid ID. Use "Sai Wagh" to sign in.');
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
