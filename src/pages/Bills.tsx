import React, { useEffect, useState } from 'react';
import { db } from '../lib/db';
import { format, startOfMonth, endOfMonth, parseISO, subMonths } from 'date-fns';
import { MilkEntry, Customer } from '../types';
import { CheckCircle2, FileText, Banknote, Download } from 'lucide-react';

type BillStat = {
  customer: Customer;
  total_liters: number;
  total_amount: number;
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
            total_liters: 0,
            total_amount: 0
          };
        }
        acc[entry.customer_code].total_liters += Number(entry.amount_liters);
        acc[entry.customer_code].total_amount += Number(entry.total_price || 0);
        return acc;
      }, {} as Record<string, any>);

      const statsArray: BillStat[] = [];
      Object.keys(aggregated).forEach(code => {
        const c = allCustomers.find(cu => cu.code === code);
        if (c) {
          statsArray.push({
            customer: c,
            total_liters: aggregated[code].total_liters,
            total_amount: aggregated[code].total_amount
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

  const handleExportCSV = () => {
    if (stats.length === 0) return;

    const headers = [
      'Customer Code',
      'Customer Name',
      'WhatsApp/Phone',
      'Milk Type',
      'Total Liters Delivered',
      'Total Amount (RS)',
      'Payment Status'
    ];

    const rows = stats.map(s => {
      const isPaid = paidBills[`${s.customer.code}_${selectedMonthStr}`];
      return [
        s.customer.code,
        s.customer.name || 'Unknown',
        s.customer.whatsapp || 'N/A',
        s.customer.milk_type,
        s.total_liters.toString(),
        s.total_amount.toString(),
        isPaid ? 'Paid' : 'Unpaid'
      ];
    });

    // Add Total Row
    const totalLiters = stats.reduce((sum, s) => sum + s.total_liters, 0);
    const totalAmount = stats.reduce((sum, s) => sum + s.total_amount, 0);
    rows.push([
      'TOTAL',
      '',
      '',
      '',
      totalLiters.toString(),
      totalAmount.toString(),
      ''
    ]);

    // Construct CSV with robust quotes escaping for safety and small size
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => {
          const val = cell || '';
          if (val.includes(',') || val.includes('"') || val.includes('\n')) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        }).join(',')
      )
    ].join('\n');

    // Create a Blob and download using createObjectURL which is supported in all secure frames and mobile browsers
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `milk_bills_${selectedMonthStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredStats = stats.filter(s => !paidBills[`${s.customer.code}_${selectedMonthStr}`]);

  return (
    <div className="p-4 pb-24 h-full flex flex-col bg-slate-50">
      <header className="h-auto md:h-20 bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between -mt-4 -mx-4 md:-mx-8 mb-8 gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Monthly Bills</h1>
          <p className="text-xs text-slate-400 uppercase tracking-widest">{format(parseISO(selectedMonthStr + '-01'), 'MMMM yyyy')}</p>
        </div>
        <div className="flex items-center space-x-4 md:space-x-6 flex-wrap gap-y-2">
          <div className="text-left md:text-right">
            <p className="text-xs font-semibold text-indigo-600 uppercase">Total Monthly Bills</p>
            <p className="text-lg font-bold text-indigo-700">
              ₹{stats.reduce((sum, s) => sum + s.total_amount, 0)}
            </p>
          </div>
          <button 
            onClick={handleExportCSV}
            disabled={stats.length === 0}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50 px-4 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-300" />
            Export Bills CSV
          </button>
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
                     {stat.customer.whatsapp && (
                       <p className="text-xs text-slate-400 mt-0.5 font-medium">{stat.customer.whatsapp}</p>
                     )}
                   </div>
                   <div className="flex flex-col gap-1.5 items-end">
                     <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg font-bold text-sm">
                       ₹{stat.total_amount}
                     </span>
                     <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-bold text-xs">
                       {stat.total_liters} L
                     </span>
                   </div>
                </div>
                
                <button
                  onClick={() => handleMarkPaid(stat.customer.code)}
                  className="w-full mt-2 py-3 bg-slate-900 hover:bg-emerald-600 hover:text-white text-white rounded-xl font-bold uppercase tracking-wider text-sm transition-colors flex items-center justify-center gap-2 group cursor-pointer"
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
