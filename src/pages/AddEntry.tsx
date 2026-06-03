import React, { useState } from 'react';
import { db, generateId } from '../lib/db';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { COW_MILK_PRICE, BUFFALO_MILK_PRICE } from '../lib/utils';
import { Customer } from '../types';
import { format } from 'date-fns';
import { triggerBackgroundSync } from '../lib/googleDriveAndSheets';

const AMOUNTS = [
  { label: '250 ml', value: 0.25 },
  { label: '500 ml', value: 0.5 },
  { label: '750 ml', value: 0.75 },
  { label: '1 L', value: 1.0 },
  { label: '1.5 L', value: 1.5 },
  { label: '2 L', value: 2.0 },
  { label: '2.5 L', value: 2.5 },
  { label: '3 L', value: 3.0 },
];

export function AddEntry() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Search for customer as they type
  const handleCodeChange = async (val: string) => {
    setCode(val);
    setMatchedCustomer(null);
    setError('');
    
    if (val.trim().length > 0) {
      const customers = await db.getCustomers();
      const match = customers.find((c: any) => c.code.toLowerCase() === val.trim().toLowerCase());
      if (match) {
        setMatchedCustomer(match);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchedCustomer) {
      setError('Invalid code number. Create the customer first.');
      return;
    }
    if (amount === null) {
      setError('Please select amount of milk.');
      return;
    }

    setLoading(true);
    setError('');

    // Determine config
    const mType = matchedCustomer.milk_type === 'both' ? 'buffalo' : matchedCustomer.milk_type; // Defaulting if both
    const price = mType === 'cow' ? COW_MILK_PRICE : BUFFALO_MILK_PRICE;

    try {
      await db.saveEntry({
        id: generateId(),
        created_at: new Date().toISOString(),
        customer_code: matchedCustomer.code,
        amount_liters: amount,
        milk_type: mType as 'cow'|'buffalo',
        date: format(new Date(), 'yyyy-MM-dd'),
        price_per_liter: price,
        total_price: amount * price
      });
      triggerBackgroundSync();
      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-blue-600 text-white p-6">
         <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <CheckCircle2 size={48} className="text-white" />
         </div>
         <h1 className="text-3xl font-bold mb-2 text-center text-white">Entry Added!</h1>
         <p className="text-blue-100 font-medium">Successfully logged {amount} L for {code}</p>
      </div>
    )
  }

  return (
    <div className="p-4 pb-24 min-h-[100dvh] flex flex-col bg-white">
      <header className="h-auto bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex items-center -mt-4 -mx-4 md:-mx-8 mb-8 gap-4">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Quick Daily Entry</h1>
          <p className="text-xs text-slate-400 uppercase tracking-widest">Record Milk Distribution</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 flex-1 max-w-2xl mx-auto w-full">
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-100 flex flex-col items-center">
           <div className="w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-200 mb-8 mt-2">
             <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
           </div>
           
           <div className="w-full space-y-6">
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold border border-red-100 text-center">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Customer Code *</label>
                <input
                  type="text"
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xl text-center font-bold tracking-widest uppercase transition-colors"
                  placeholder="CODE (e.g. 104)"
                  value={code}
                  onChange={e => handleCodeChange(e.target.value)}
                  required
                  autoCapitalize="none"
                  autoFocus
                />
                <div className="h-8 mt-2 flex justify-center">
                  {matchedCustomer && (
                    <span className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
                      <CheckCircle2 size={14} /> {matchedCustomer.name || 'Unknown'} ({(matchedCustomer.milk_type).toUpperCase()})
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1 text-center">Select Amount</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {AMOUNTS.map(amt => (
                    <button
                      key={amt.label}
                      type="button"
                      onClick={() => setAmount(amt.value)}
                      className={`py-3 md:py-4 rounded-xl text-sm md:text-base font-bold transition-all border ${
                        amount === amt.value 
                          ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-sm scale-105' 
                          : 'border-slate-200 bg-white hover:border-indigo-400 text-slate-600'
                      }`}
                    >
                      {amt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={loading || !amount}
                  className="w-full py-4 text-center text-white bg-slate-800 rounded-xl font-bold text-lg shadow-lg hover:bg-slate-900 disabled:opacity-50 transition uppercase tracking-wider"
                >
                  {loading ? 'LOGGING...' : 'LOG ENTRY'}
                </button>
              </div>
           </div>
        </div>
      </form>
    </div>
  );
}
