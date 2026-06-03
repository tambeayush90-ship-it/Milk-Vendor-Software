import React, { useState } from 'react';
import { db, generateId } from '../lib/db';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { triggerBackgroundSync } from '../lib/googleDriveAndSheets';

export function AddCode() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [milkType, setMilkType] = useState('buffalo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!code) {
      setError('Code is mandatory');
      setLoading(false);
      return;
    }

    try {
      await db.saveCustomer({
        id: generateId(),
        created_at: new Date().toISOString(),
        code,
        name: name || null,
        whatsapp: whatsapp || null,
        milk_type: milkType as 'cow' | 'buffalo' | 'both'
      });
      triggerBackgroundSync();
      setLoading(false);
      navigate('/codes');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="p-4 pb-24 min-h-screen flex flex-col bg-white">
      <header className="h-auto bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex items-center -mt-4 -mx-4 md:-mx-8 mb-8 gap-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition">
          <ArrowLeft size={24} />
        </button>
        <div>
           <h1 className="text-xl font-bold text-slate-900 tracking-tight">Onboard New Customer</h1>
           <p className="text-xs text-slate-400 uppercase tracking-widest">Create Unique Tracking Code</p>
        </div>
      </header>

      <div className="flex-1 max-w-xl mx-auto w-full">
        <form onSubmit={handleSubmit} className="bg-indigo-600 rounded-3xl p-6 md:p-10 text-white shadow-xl flex flex-col gap-6">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-xl font-bold">Customer Details</h3>
              <p className="text-sm text-indigo-200 font-medium mt-1">Generate a code to start billing</p>
            </div>
            <span className="text-[10px] bg-indigo-500 px-3 py-1 rounded font-bold uppercase tracking-wider border border-indigo-400 text-indigo-100 shadow-inner hidden md:inline-block">Setup</span>
          </div>

          {error && (
            <div className="bg-red-500/20 text-white p-4 rounded-xl text-sm font-bold border border-red-500/50 backdrop-blur-sm -mb-2">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
               <label className="block text-[10px] font-bold text-indigo-200 uppercase mb-2 ml-1 tracking-wider">Unique Code *</label>
               <input
                 type="text"
                 className="w-full px-5 py-4 bg-indigo-900/40 border border-indigo-400/50 rounded-xl focus:outline-none focus:border-white focus:bg-indigo-900/60 font-mono text-xl placeholder-indigo-300/50 text-white shadow-inner font-bold uppercase"
                 placeholder="e.g. 101"
                 value={code}
                 onChange={e => setCode(e.target.value)}
                 required
                 autoFocus
               />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-indigo-200 uppercase mb-2 ml-1 tracking-wider">Full Name</label>
              <input
                type="text"
                className="w-full px-5 py-3 bg-indigo-500/50 border border-indigo-400 rounded-xl placeholder-indigo-200/70 text-base focus:bg-indigo-500/70 focus:outline-none focus:border-white transition-colors text-white"
                placeholder="Optional name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-indigo-200 uppercase mb-2 ml-1 tracking-wider">Contact Number</label>
              <input
                type="tel"
                className="w-full px-5 py-3 bg-indigo-500/50 border border-indigo-400 rounded-xl placeholder-indigo-200/70 text-base focus:bg-indigo-500/70 focus:outline-none focus:border-white transition-colors text-white"
                placeholder="Optional WhatsApp"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
              />
            </div>

            <div>
               <label className="block text-[10px] font-bold text-indigo-200 uppercase mb-2 ml-1 tracking-wider">Preferred Milk</label>
               <div className="grid grid-cols-2 gap-3">
                 <button
                   type="button"
                   onClick={() => setMilkType('buffalo')}
                   className={`py-3 rounded-xl font-bold text-sm tracking-wide transition-colors ${milkType === 'buffalo' ? 'bg-white text-indigo-600 shadow-md' : 'bg-indigo-700/50 border border-indigo-400 text-indigo-100 hover:bg-indigo-700'}`}
                 >
                   BUFFALO
                 </button>
                 <button
                   type="button"
                   onClick={() => setMilkType('cow')}
                   className={`py-3 rounded-xl font-bold text-sm tracking-wide transition-colors ${milkType === 'cow' ? 'bg-white text-indigo-600 shadow-md' : 'bg-indigo-700/50 border border-indigo-400 text-indigo-100 hover:bg-indigo-700'}`}
                 >
                   COW
                 </button>
               </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-indigo-500/50">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 text-center text-indigo-700 bg-white rounded-xl font-bold text-lg shadow-[0_8px_30px_rgb(255,255,255,0.12)] hover:bg-slate-50 active:scale-95 disabled:opacity-70 transition uppercase tracking-widest"
            >
              {loading ? 'GENERATING...' : 'GENERATE CODE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
