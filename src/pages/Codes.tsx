import { useEffect, useState } from 'react';
import { db } from '../lib/db';
import { Customer } from '../types';
import { Plus, Search, User } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Codes() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    const customersList = await db.getCustomers();
    const cust = customersList.sort((a: any,b: any) => new Date(b.createdAt?.seconds * 1000 || 0).getTime() - new Date(a.createdAt?.seconds * 1000 || 0).getTime());
    setCustomers(cust);
    setLoading(false);
  };

  const filtered = customers.filter(c => 
    c.code.toLowerCase().includes(search.toLowerCase()) || 
    (c.name && c.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-4 pb-24 h-full flex flex-col">
      <header className="h-auto md:h-20 bg-white border-b border-slate-200 px-4 md:px-8 py-4 md:py-0 flex flex-col md:flex-row md:items-center justify-between -mt-4 -mx-4 md:-mx-8 mb-8 gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Customer Directory</h1>
          <p className="text-xs text-slate-400 uppercase tracking-widest">{customers.length} Total Customers</p>
        </div>
        <div className="flex justify-end">
          <Link to="/codes/add" className="bg-indigo-600 text-white rounded-full px-5 py-2 text-xs md:text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition flex items-center gap-2">
            <Plus size={16} strokeWidth={3} /> NEW CUSTOMER
          </Link>
        </div>
      </header>

      <div className="bg-white rounded-3xl p-4 md:p-6 shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden">
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm shadow-inner transition-colors font-medium"
            placeholder="Search by code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-12 flex justify-center items-center"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 h-[300px]">
              <User size={48} className="text-slate-200 mb-4" />
              <p className="font-medium">No customers found.</p>
              <Link to="/codes/add" className="text-indigo-600 mt-2 text-sm font-bold">CREATE CUSTOMER</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-12">
              {filtered.map(customer => (
                <div key={customer.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3 hover:border-indigo-200 transition-colors group">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold font-mono tracking-tighter shadow-sm border border-indigo-100">
                          {customer.code?.slice(0, 3)}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-800 font-mono tracking-tight leading-none group-hover:text-indigo-700 transition-colors">
                            {customer.code}
                          </h3>
                        </div>
                     </div>
                     <span className={`px-2 py-1 text-[10px] rounded border font-bold uppercase ${customer.milk_type === 'cow' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                       {customer.milk_type}
                     </span>
                  </div>
                  <div className="pt-2 border-t border-slate-50 flex justify-between items-end">
                     <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Name</p>
                       <p className="text-sm font-semibold text-slate-700 truncate max-w-[120px]">
                         {customer.name || <span className="opacity-50 italic">None</span>}
                       </p>
                     </div>
                     {customer.whatsapp && (
                       <div className="text-right flex-1">
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Contact</p>
                         <p className="text-xs font-mono font-medium text-slate-500">{customer.whatsapp}</p>
                       </div>
                     )}
                  </div>
                  <div className="pt-3 flex justify-between gap-2 mt-auto">
                    <Link to={`/codes/history/${customer.id}`} className="w-2/3 text-center text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 py-2 rounded-lg transition-colors shadow-sm">
                      HISTORY
                    </Link>
                    <Link to={`/codes/edit/${customer.id}`} className="w-1/3 text-center text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 py-2 rounded-lg transition-colors border border-indigo-100">
                      EDIT
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
