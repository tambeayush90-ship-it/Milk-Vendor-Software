import React, { createContext, useContext, useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface User {
  uid: string;
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

  useEffect(() => {
    const savedUser = localStorage.getItem('localUser');
    if (savedUser) {
      setUser({ uid: savedUser });
    }
    setLoading(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (
      (inputId.trim().toLowerCase() === 'sai wagh' || inputId.trim().toLowerCase() === 'saiwagh') && 
      inputPass.trim() === 'Saiwagh1234'
    ) {
      const u = { uid: 'saiwagh' };
      localStorage.setItem('localUser', u.uid);
      setUser(u);
    } else {
      setError('Invalid ID or Password');
    }
  };

  const logOut = () => {
    localStorage.removeItem('localUser');
    setUser(null);
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
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
          >
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, logOut, error }}>
      {children}
    </AuthContext.Provider>
  );
}
