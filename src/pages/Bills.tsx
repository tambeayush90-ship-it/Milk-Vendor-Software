import React, { useEffect, useState } from 'react';
import { db } from '../lib/db';
import { format, startOfMonth, endOfMonth, parseISO, subMonths } from 'date-fns';
import { MilkEntry, Customer } from '../types';
import { CheckCircle2, FileText, Banknote } from 'lucide-react';

type BillStat = {
  customer: Customer;
  total_liters: number;
};

export function Bills() {
  const [stats, setStats] = useState<BillStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonthStr, setSelectedMonthStr] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [paidBills, setPaidBills] = useState<Record<string, boolean>>({});

  const [months] = useState(() => Array.from({ length: 6 }).map((_, i) => subMonths(new Date(), i)));

  useEffect(() => {
    // Load paid bills from localStorage
    const loadedPaidBills = JSON.parse(localStorage.getItem('paid_bills') || '{}');
    setPaidBills(loadedPaidBills);
  }, []);

  useEffect(() => {
    const fetchMonthlyData = async () => {
      setLoading(true);
      
      const start = format(startOfMonth(parseISO(selectedMonthStr + '-01')), 'yyyy-MM-dd');
      const end = format(endOfMonth(parseISO(selectedMonthStr + '-01')), 'yyyy-MM-dd');

      // Fetch entries and customers
      const allEntries = await db.getEntries();
      const allCustomers = await db.getCustomers();
      
      const entries = allEntries.filter((e: any) => e.date >= start && e.date <= end);

      const aggregated = entries.reduce((acc, entry: MilkEntry) => {
        if (!acc[entry.customer_code]) {
          acc[entry.customer_code] = {
            total_liters: 0
          };
        }
        acc[entry.customer_code].total_liters += Number(entry.amount_liters);
        return acc;
      }, {} as Record<string, any>);

      const statsArray: BillStat[] = [];
      Object.keys(aggregated).forEach(code => {
        const c = allCustomers.find(cu => cu.code === code);
        if (c) {
          statsArray.push({
            customer: c,
            total_liters: aggregated[code].total_liters
          });
        }
      });

      // Sort by code
      statsArray.sort((a, b) => {
        const numA = parseInt(a.customer.code.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.customer.code.replace(/\D/g, '')) || 0;
        return numA - numB;
      });

      setStats(statsArray);
      setLoading(false);
    };

    fetchMonthlyData();
  }, [selectedMonthStr]);

  const handleMarkPaid = (customerCode: string) => {
    const key = `${customerCode}_${selectedMonthStr}`;
    const newPaidBills = { ...paidBills, [key]: true };
    setPaidBills(newPaidBills);
    localStorage.setItem('paid_bills', JSON.stringify(newPaidBills));
  };

  const filteredStats = stats.filter(s => !paidBills[`${s.customer.code}_${selectedMonthStr}`]);

  return (
    <div className="p-4 pb-24 h-full flex flex-col bg-slate-50">
      <header className="h-auto md:h-20 bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between -mt-4 -mx-4 md:-mx-8 mb-8 gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Monthly Bills</h1>
          <p className="text-xs text-slate-400 uppercase tracking-widest">{format(parseISO(selectedMonthStr + '-01'), 'MMMM yyyy')}</p>
        </div>
      </header>

      <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
        <select 
          className="bg-slate-900 text-white font-semibold rounded-full px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-700 border-none max-w-[200px]"
          value={selectedMonthStr}
          onChange={(e) => setSelectedMonthStr(e.target.value)}
        >
          {months.map(m => {
            const formatStr = format(m, 'yyyy-MM');
            return (
              <option key={formatStr} value={formatStr} className="bg-white text-slate-900">
                {format(m, 'MMMM yyyy')}
              </option>
            );
          })}
        </select>
        <div className="text-sm font-medium text-slate-500">
          Unpaid Bills: <span className="font-bold text-slate-900">{filteredStats.length}</span>
        </div>
      </div>

      <div className="flex-1">
        {loading ? (
          <div className="p-12 flex justify-center items-center"><div className="animate-spin w-8 h-8 border-4 border-slate-600 border-t-transparent rounded-full"></div></div>
        ) : filteredStats.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-4" />
            <h3 className="text-lg font-bold text-slate-800">All bills are paid!</h3>
            <p className="text-slate-500 mt-2 text-sm">No pending collections for this month.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStats.map(stat => (
              <div key={stat.customer.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                   <div>
                     <h3 className="font-bold text-lg text-slate-900">{stat.customer.name || 'Unknown'}</h3>
                     <p className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest mt-1">Code: {stat.customer.code}</p>
                   </div>
                   <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-xl font-bold flex flex-col items-center">
                     <span className="text-lg leading-tight">{stat.total_liters}</span>
                     <span className="text-[9px] uppercase tracking-wider opacity-70">Liters</span>
                   </div>
                </div>
                
                <button
                  onClick={() => handleMarkPaid(stat.customer.code)}
                  className="w-full mt-2 py-3 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl font-bold uppercase tracking-wider text-sm transition-colors flex items-center justify-center gap-2 group"
                >
                  <Banknote className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  Mark as Paid
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
