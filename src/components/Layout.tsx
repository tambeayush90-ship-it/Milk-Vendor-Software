import { Outlet } from 'react-router-dom';
import { Navigation } from './Navigation';

export function Layout() {
  return (
    <div className="flex h-[100dvh] bg-slate-50 font-sans overflow-hidden text-slate-800 flex-col md:flex-row">
       <div className="hidden md:block h-full">
         <Navigation />
       </div>
       <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden relative h-full overscroll-y-contain">
         <div className="p-4 md:p-8 flex-1 flex flex-col pb-24 md:pb-8">
           <Outlet />
         </div>
       </main>
       <div className="md:hidden">
         <Navigation />
       </div>
    </div>
  )
}
