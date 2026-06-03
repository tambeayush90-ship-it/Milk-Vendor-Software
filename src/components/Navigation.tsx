import { Link, useLocation } from 'react-router-dom';
import { Home, Users, CalendarDays, Plus, LogOut, Settings as SettingsIcon, Receipt } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from './AuthProvider';

export function Navigation() {
  const location = useLocation();
  const { logOut } = useAuth();

  const getLinkClassesSidebar = (path: string) => 
    cn("p-3 rounded-xl cursor-pointer transition-colors duration-200 flex justify-center", 
       location.pathname === path ? "bg-indigo-800 text-white shadow-inner" : "text-indigo-300 hover:bg-indigo-800");

  const getLinkClassesBottom = (path: string) => 
    cn("flex flex-col items-center justify-center w-full h-full relative", 
       location.pathname === path ? "text-indigo-600" : "text-slate-400 hover:text-slate-600");

  return (
    <>
      {/* Sidebar Navigation */}
      <aside className="hidden md:flex w-24 bg-indigo-900 flex-col items-center py-8 space-y-10 flex-shrink-0 h-full z-20 sticky top-0 shadow-xl shadow-indigo-900/20 shadow-r">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-md transition-transform hover:scale-105">
          <div className="w-6 h-8 bg-indigo-600 rounded-sm relative">
            <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-white rounded-full shadow-sm"></div>
          </div>
        </div>
        <nav className="flex flex-col space-y-5 w-full px-5">
          <Link to="/" className={getLinkClassesSidebar('/')}>
            <Home className="w-6 h-6" strokeWidth={2.5} />
          </Link>
          <Link to="/codes" className={getLinkClassesSidebar('/codes')}>
            <Users className="w-6 h-6" strokeWidth={2.5}/>
          </Link>
          <Link to="/monthly" className={getLinkClassesSidebar('/monthly')}>
            <CalendarDays className="w-6 h-6" strokeWidth={2.5} />
          </Link>
          <Link to="/bills" className={getLinkClassesSidebar('/bills')}>
            <Receipt className="w-6 h-6" strokeWidth={2.5} />
          </Link>
          <div className="my-2 flex justify-center w-full">
            <Link to="/add" className={cn("p-3.5 rounded-xl cursor-pointer transition-colors bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/40", location.pathname === '/add' && 'ring-2 ring-white')}>
              <Plus className="w-6 h-6" strokeWidth={3}/>
            </Link>
          </div>
          <Link to="/settings" className={getLinkClassesSidebar('/settings')}>
            <SettingsIcon className="w-6 h-6" strokeWidth={2.5} />
          </Link>
        </nav>
        <div className="mt-auto mb-4 flex flex-col items-center gap-6">
          <button onClick={logOut} className="text-indigo-400 hover:text-white transition-colors" title="Logout">
            <LogOut className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-full bg-indigo-500 border-2 border-indigo-400 flex items-center justify-center text-white text-xs font-bold shadow-inner">VD</div>
        </div>
      </aside>

      {/* Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] h-20 pb-safe z-50 grid grid-cols-6 items-center px-1">
        <Link to="/" className={getLinkClassesBottom('/')}>
          <Home size={18} className="stroke-[2.5] mb-1" />
          <span className="text-[8px] font-bold uppercase tracking-widest text-center">Daily</span>
          {location.pathname === '/' && <div className="absolute top-0 w-6 h-1 bg-indigo-600 rounded-b-full"></div>}
        </Link>
        
        <Link to="/codes" className={getLinkClassesBottom('/codes')}>
          <Users size={18} className="stroke-[2.5] mb-1" />
          <span className="text-[8px] font-bold uppercase tracking-widest text-center">Codes</span>
          {location.pathname === '/codes' && <div className="absolute top-0 w-6 h-1 bg-indigo-600 rounded-b-full"></div>}
        </Link>

        <Link to="/monthly" className={getLinkClassesBottom('/monthly')}>
          <CalendarDays size={18} className="stroke-[2.5] mb-1" />
          <span className="text-[8px] font-bold uppercase tracking-widest text-center">Month</span>
          {location.pathname === '/monthly' && <div className="absolute top-0 w-6 h-1 bg-indigo-600 rounded-b-full"></div>}
        </Link>

        <div className="flex justify-center -mt-8 relative z-10 w-full">
          <Link to="/add" className="flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-full shadow-xl shadow-indigo-600/30 text-white hover:bg-indigo-500 active:scale-95 transition-all outline outline-6 outline-slate-50">
            <Plus size={28} strokeWidth={2.5} />
          </Link>
        </div>

        <Link to="/bills" className={getLinkClassesBottom('/bills')}>
          <Receipt size={18} className="stroke-[2.5] mb-1" />
          <span className="text-[8px] font-bold uppercase tracking-widest text-center">Bills</span>
          {location.pathname === '/bills' && <div className="absolute top-0 w-6 h-1 bg-indigo-600 rounded-b-full"></div>}
        </Link>
        
        <Link to="/settings" className={getLinkClassesBottom('/settings')}>
          <SettingsIcon size={18} className="stroke-[2.5] mb-1" />
          <span className="text-[8px] font-bold uppercase tracking-widest text-center">Setup</span>
          {location.pathname === '/settings' && <div className="absolute top-0 w-6 h-1 bg-indigo-600 rounded-b-full"></div>}
        </Link>
      </nav>
    </>
  );
}
