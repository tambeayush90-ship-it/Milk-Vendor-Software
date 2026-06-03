import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { triggerBackgroundSync } from '../lib/googleDriveAndSheets';

export function EditCode() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [milkType, setMilkType] = useState('buffalo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetching, setFetching] = useState(true);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const customers = await db.getCustomers();
        const customer = customers.find(c => c.id === id);
        if (!customer) {
          setError('Customer not found');
        } else {
          setCode(customer.code);
          setName(customer.name || '');
          setWhatsapp(customer.whatsapp || '');
          setMilkType(customer.milk_type);
        }
      } catch (err) {
         setError('Failed to load customer');
      } finally {
        setFetching(false);
      }
    }
    loadData();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError('');
    setLoading(true);

    if (!code) {
      setError('Code is mandatory');
      setLoading(false);
      return;
    }

    try {
      await db.updateCustomer(id, {
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

  const handleDelete = async () => {
    if (!id) return;
    try {
      setLoading(true);
      await db.deleteCustomer(id);
      triggerBackgroundSync();
      navigate('/codes');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      setShowConfirmDelete(false);
    }
  };

  if (fetching) {
     return <div className="p-12 flex justify-center items-center h-screen"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="p-4 pb-24 min-h-screen flex flex-col bg-white">
      <header className="h-auto bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex items-center -mt-4 -mx-4 md:-mx-8 mb-8 gap-4">
        <button onClick={() => navigate('/codes')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition">
          <ArrowLeft size={24} />
        </button>
        <div>
           <h1 className="text-xl font-bold text-slate-900 tracking-tight">Edit Customer</h1>
           <p className="text-xs text-slate-400 uppercase tracking-widest">Update tracking info</p>
        </div>
      </header>

      <div className="flex-1 max-w-xl mx-auto w-full">
        {showConfirmDelete && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Customer?</h3>
              <p className="text-slate-500 text-sm mb-6">
                Are you sure you want to permanently delete this customer? This will not delete their historical billing data.
              </p>
              <div className="flex w-full gap-3">
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
                >
                  DELETE
                </button>
              </div>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="bg-indigo-600 rounded-3xl p-6 md:p-10 text-white shadow-xl flex flex-col gap-6 relative">
          <div className="absolute top-6 right-6 md:top-10 md:right-10 z-10">
             <button type="button" onClick={() => setShowConfirmDelete(true)} className="p-2 bg-red-500/20 text-red-100 hover:bg-red-500 hover:text-white rounded-full transition-colors relative cursor-pointer z-20">
               <Trash2 size={20} />
             </button>
          </div>
          
          <div className="flex justify-between items-start mb-2 mt-4 md:mt-0">
            <div>
              <h3 className="text-xl font-bold">Customer Details</h3>
              <p className="text-sm text-indigo-200 font-medium mt-1">Update information below</p>
            </div>
            <span className="text-[10px] bg-indigo-500 px-3 py-1 rounded font-bold uppercase tracking-wider border border-indigo-400 text-indigo-100 shadow-inner hidden md:inline-block">Edit</span>
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
                 className="w-full px-5 py-4 bg-indigo-900/40 border border-indigo-400/50 rounded-xl focus:outline-none focus:border-white focus:bg-indigo-900/60 font-mono text-xl placeholder-indigo-300/50 text-white shadow-inner font-bold flex-1 uppercase"
                 placeholder="e.g. 101"
                 value={code}
                 onChange={e => setCode(e.target.value)}
                 required
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
              {loading ? 'SAVING...' : 'SAVE CHANGES'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
