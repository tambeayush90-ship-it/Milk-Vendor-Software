import { useEffect, useState } from 'react';
import { db } from '../lib/db';
import { format } from 'date-fns';
import { MilkEntry } from '../types';
import { DollarSign, Droplet, Users } from 'lucide-react';

export function Daily() {
  const [entries, setEntries] = useState<MilkEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodayData();
  }, []);

  const fetchTodayData = async () => {
    setLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Fetch all entries for today
    const milkEntries = await db.getEntries();
    const filteredEntries = milkEntries
      .filter((e: any) => e.date === today)
      .sort((a: any,b: any) => new Date(b.createdAt?.seconds * 1000 || 0).getTime() - new Date(a.createdAt?.seconds * 1000 || 0).getTime());

    setEntries(filteredEntries);
    setLoading(false);
  };

  const totalEarnings = entries.reduce((sum, e) => sum + (e.total_price || 0), 0);
  const totalCowLiters = entries.filter(e => e.milk_type === 'cow').reduce((sum, e) => sum + Number(e.amount_liters), 0);
  const totalBuffaloLiters = entries.filter(e => e.milk_type === 'buffalo').reduce((sum, e) => sum + Number(e.amount_liters), 0);
  
  // Unique customers served today
  const uniqueCustomerCodes = new Set(entries.map(e => e.customer_code));

  if (loading) return <div className="p-6 flex justify-center items-center h-full"><div className="animate-spin w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent"></div></div>;

  return (
    <div className="p-4 pb-24 h-full flex flex-col">
      <header className="h-44 md:h-24 bg-white border-b border-slate-200 px-4 md:px-8 flex flex-col md:flex-row md:items-center justify-center md:justify-between -mt-4 -mx-4 md:-mx-8 mb-8 pb-4 md:pb-0 gap-6 md:gap-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Daily Bills</h1>
          <p className="text-xs text-slate-400 uppercase tracking-widest">{format(new Date(), 'EEEE, MMMM do, yyyy')}</p>
        </div>
        <div className="flex flex-wrap md:flex-nowrap gap-x-8 gap-y-4 md:space-x-8">
          <div className="text-left md:text-right">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cow Milk</p>
            <p className="text-lg font-bold text-blue-600">{totalCowLiters} L</p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Buffalo</p>
            <p className="text-lg font-bold text-indigo-600">{totalBuffaloLiters} L</p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Homes / Codes Served</p>
            <p className="text-lg font-bold text-slate-700">{uniqueCustomerCodes.size}</p>
          </div>
        </div>
      </header>

      <div className="flex-1">
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col h-full mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-800">Recent Entries</h2>
          </div>
          
          {entries.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <svg className="w-16 h-16 mb-4 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
              <p className="font-medium text-sm">No milk sold just yet today.</p>
              <p className="text-xs mt-1 opacity-70">Tap the plus button to add an entry.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50">
                  <tr>
                     <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Code</th>
                     <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 text-right">Qty</th>
                     <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 text-center">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {entries.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-4 font-mono font-bold text-slate-700">{entry.customer_code}</td>
                      <td className="px-4 py-4 font-semibold text-slate-800 text-right whitespace-nowrap">{entry.amount_liters} L</td>
                      <td className="px-4 py-4 text-center">
                         <span className={`px-2 py-1 text-[10px] rounded border font-bold uppercase ${entry.milk_type === 'cow' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                           {entry.milk_type}
                         </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
