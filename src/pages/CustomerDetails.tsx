import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Edit } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Customer, MilkEntry } from '../types';

export function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [entries, setEntries] = useState<MilkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const customers = await db.getCustomers();
        const found = customers.find(c => c.id === id);
        
        if (!found) {
          setError('Customer not found');
          return;
        }
        
        setCustomer(found);
        
        const allEntries = await db.getEntries();
        const customerEntries = allEntries
          .filter(e => e.customer_code === found.code)
          .sort((a, b) => b.date.localeCompare(a.date)); // descending dates
          
        setEntries(customerEntries);

      } catch (err) {
         setError('Failed to load customer details');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
     return <div className="p-12 flex justify-center items-center h-full min-h-[50vh]"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;
  }

  if (error || !customer) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-red-500 font-bold mb-4">{error || 'Unknown error'}</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-slate-200 rounded-lg font-bold">Go Back</button>
      </div>
    );
  }

  const totalLiters = entries.reduce((sum, e) => sum + Number(e.amount_liters), 0);
  
  return (
    <div className="p-4 pb-24 h-full flex flex-col bg-slate-50">
      <header className="h-auto bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between -mt-4 -mx-4 md:-mx-8 mb-8 gap-4 shadow-sm relative z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/codes')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition">
            <ArrowLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 font-mono tracking-tight">{customer.code}</h1>
              <span className={`px-2 py-1 text-[10px] rounded border font-bold uppercase ${customer.milk_type === 'cow' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                {customer.milk_type}
              </span>
            </div>
            <p className="text-sm text-slate-500 font-semibold mt-0.5">{customer.name || 'Unnamed'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 sm:pl-4 sm:border-l border-slate-100">
          <Link to={`/codes/edit/${customer.id}`} className="flex items-center gap-2 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-4 py-2 rounded-xl font-bold text-xs transition shadow-sm">
            <Edit size={16} /> EDIT INFO
          </Link>
        </div>
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full flex flex-col gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 divide-x divide-slate-100">
           <div className="px-2">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Milk</p>
             <p className="text-2xl font-bold text-indigo-700">{totalLiters} L</p>
           </div>
           <div className="px-4">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Entries</p>
             <p className="text-2xl font-bold text-slate-700">{entries.length}</p>
           </div>
           <div className="px-4 col-span-2">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contact</p>
             <p className="text-base font-mono font-medium text-slate-900 mt-1">{customer.whatsapp || 'N/A'}</p>
           </div>
        </div>

        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-2 mb-4 flex items-center gap-2">
            <Calendar size={16} /> Milk History
          </h2>
          
          {entries.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100 flex flex-col items-center justify-center">
               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                 <Calendar size={32} />
               </div>
               <h3 className="font-bold text-slate-600">No entries yet</h3>
               <p className="text-sm text-slate-400 mt-1">When daily milk is added, it will appear here.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
               <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4 text-right">Liters</th>
                      <th className="px-6 py-4 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {entries.map(entry => (
                      <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-700">
                          {format(parseISO(entry.date), 'dd MMM yyyy - EEE')}
                        </td>
                        <td className="px-6 py-4 font-bold text-indigo-700 text-right">
                          {entry.amount_liters} L
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-500 text-right">
                          ₹{entry.total_price}
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
