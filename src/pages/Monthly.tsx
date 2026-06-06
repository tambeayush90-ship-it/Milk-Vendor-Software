import React, { useEffect, useState } from 'react';
import { db } from '../lib/db';
import { format, startOfMonth, endOfMonth, parseISO, subMonths } from 'date-fns';
import { MilkEntry } from '../types';
import { Calendar, Users, Droplet, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { downloadCSV } from '../lib/utils';

type DailyDetail = {
  customer_code: string;
  amount_liters: number;
};

type DailySummaryStat = {
  date: string; // YYYY-MM-DD
  formatted_date: string; // e.g., "01 Jun 2026"
  customers_count: number;
  total_liters: number;
  details: DailyDetail[];
};

export function Monthly() {
  const [stats, setStats] = useState<DailySummaryStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [selectedMonthStr, setSelectedMonthStr] = useState<string>(format(new Date(), 'yyyy-MM'));
  const selectedMonth = parseISO(selectedMonthStr + '-01');
  
  // Generate last 6 months for dropdown (stable values)
  const [months] = useState(() => Array.from({ length: 6 }).map((_, i) => subMonths(new Date(), i)));

  useEffect(() => {
    const fetchMonthlyData = async () => {
      setLoading(true);
      
      const start = format(startOfMonth(parseISO(selectedMonthStr + '-01')), 'yyyy-MM-dd');
      const end = format(endOfMonth(parseISO(selectedMonthStr + '-01')), 'yyyy-MM-dd');

      // Fetch entries
      const allEntries = await db.getEntries();
      const entries = allEntries.filter((e: any) => e.date >= start && e.date <= end);

      const aggregated = entries.reduce((acc, entry: MilkEntry) => {
        if (!acc[entry.date]) {
          acc[entry.date] = {
            date: entry.date,
            codes: new Set<string>(),
            total_liters: 0,
            details: []
          };
        }
        
        acc[entry.date].codes.add(entry.customer_code);
        acc[entry.date].total_liters += Number(entry.amount_liters);
        
        const existingDetail = acc[entry.date].details.find((d: any) => d.customer_code === entry.customer_code);
        if (existingDetail) {
          existingDetail.amount_liters += Number(entry.amount_liters);
        } else {
          acc[entry.date].details.push({
            customer_code: entry.customer_code,
            amount_liters: Number(entry.amount_liters)
          });
        }
          
        return acc;
      }, {} as Record<string, any>);

      const statsArray: DailySummaryStat[] = Object.values(aggregated).map((a: any) => ({
        date: a.date,
        formatted_date: format(parseISO(a.date), 'dd MMM yyyy'),
        customers_count: a.codes.size,
        total_liters: a.total_liters,
        details: a.details.sort((d1: any, d2: any) => d1.customer_code.localeCompare(d2.customer_code, undefined, { numeric: true }))
      }));

      // Sort by date ascending
      statsArray.sort((a, b) => a.date.localeCompare(b.date));
      setStats(statsArray);
      
      setLoading(false);
    };

    fetchMonthlyData();
  }, [selectedMonthStr]);

  const totalLitersMonth = stats.reduce((sum, s) => sum + s.total_liters, 0);

  const handleExportCSV = async () => {
    if (stats.length === 0) return;
    
    const headers = ['Date', 'Homes/Codes Served', 'Total Liters'];
    const rows = stats.map(s => [
      s.formatted_date,
      s.customers_count.toString(),
      s.total_liters.toString()
    ]);
    
    // Add Total Row
    rows.push(['TOTAL', '', totalLitersMonth.toString()]);
    
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
      
    const filename = `daily_summary_${format(selectedMonth, 'yyyy_MM')}.csv`;
    const result = await downloadCSV(csvContent, filename);

    if (result.shared) {
      setToastMessage(`Export sheet opened successfully! Data also copied to clipboard as backup.`);
    } else if (result.copied) {
      setToastMessage(`Saved as "${filename}" and copied to clipboard! Ready to paste/open in Excel.`);
    } else {
      setToastMessage(`Saved as "${filename}"!`);
    }
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  const handleExportBillsCSV = async () => {
    try {
      const start = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

      // Fetch entries and customers
      const allEntries = await db.getEntries();
      const allCustomers = await db.getCustomers();
      const loadedPaidBills = JSON.parse(localStorage.getItem('paid_bills') || '{}');
      
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

      const statsArray: { customer: any; total_liters: number; total_amount: number }[] = [];
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

      if (statsArray.length === 0) {
        alert('No record found to export for this month.');
        return;
      }

      const headers = [
        'Customer Code',
        'Customer Name',
        'WhatsApp/Phone',
        'Milk Type',
        'Total Liters Delivered',
        'Total Amount (RS)',
        'Payment Status'
      ];

      const rows = statsArray.map(s => {
        const isPaid = loadedPaidBills[`${s.customer.code}_${selectedMonthStr}`];
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
      const totalLiters = statsArray.reduce((sum, s) => sum + s.total_liters, 0);
      const totalAmount = statsArray.reduce((sum, s) => sum + s.total_amount, 0);
      rows.push([
        'TOTAL',
        '',
        '',
        '',
        totalLiters.toString(),
        totalAmount.toString(),
        ''
      ]);

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

      const filename = `milk_bills_${selectedMonthStr}.csv`;
      const result = await downloadCSV(csvContent, filename);

      if (result.shared) {
        setToastMessage(`Export sheet opened successfully! Data also copied to clipboard as backup.`);
      } else if (result.copied) {
        setToastMessage(`Saved as "${filename}" and copied to clipboard! Ready to paste/open in Excel.`);
      } else {
        setToastMessage(`Saved as "${filename}"!`);
      }
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleDetails = (date: string) => {
    setExpandedDate(expandedDate === date ? null : date);
  };

  return (
    <div className="p-4 pb-24 h-full flex flex-col bg-slate-50">
      <header className="h-auto md:h-20 bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between -mt-4 -mx-4 md:-mx-8 mb-8 gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Monthly Daily Summary</h1>
          <p className="text-xs text-slate-400 uppercase tracking-widest">{format(selectedMonth, 'MMMM yyyy')}</p>
        </div>
        <div className="flex items-center space-x-4 md:space-x-6 flex-wrap gap-y-2">
          <div className="text-left md:text-right">
            <p className="text-xs font-semibold text-blue-600 uppercase">Total Liters (Month)</p>
            <p className="text-lg font-bold text-blue-700">{totalLitersMonth} L</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleExportCSV}
              disabled={stats.length === 0}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 px-3 py-2 rounded-lg font-medium text-xs transition-colors cursor-pointer"
              title="Daily Volume Log"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Daily Log
            </button>
            <button 
              onClick={handleExportBillsCSV}
              disabled={stats.length === 0}
              className="flex items-center gap-1.5 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 px-3 py-2 rounded-lg font-medium text-xs transition-colors cursor-pointer"
              title="Per-Person Account Bills"
            >
              <Download className="w-3.5 h-3.5 text-slate-300" />
              Export Bills
            </button>
          </div>
        </div>
      </header>

      <div className="flex justify-between items-center mb-6 gap-4 flex-wrap pb-1">

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
      </div>

      <div className="flex-1">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full mb-8 overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center items-center"><div className="animate-spin w-8 h-8 border-4 border-slate-600 border-t-transparent rounded-full"></div></div>
          ) : stats.length === 0 ? (
            <div className="p-12 text-center">
              <span className="text-slate-400 font-medium">No records for this month.</span>
            </div>
          ) : (
            <div className="overflow-x-auto h-full">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase sticky top-0 shadow-sm z-10">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-center">Homes / Codes Served</th>
                    <th className="px-6 py-4 text-right">Total Liters</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {stats.map(stat => (
                    <React.Fragment key={stat.date}>
                      <tr 
                        onClick={() => toggleDetails(stat.date)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          <div className="flex items-center gap-2">
                            {expandedDate === stat.date ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                            {stat.formatted_date}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-medium text-slate-600">{stat.customers_count}</td>
                        <td className="px-6 py-4 font-bold text-slate-900 text-right">{stat.total_liters} L</td>
                      </tr>
                      {expandedDate === stat.date && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={3} className="px-6 py-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {stat.details.map((detail, idx) => (
                                <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center shadow-sm hover:border-indigo-200 transition-colors">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Code</span>
                                    <span className="font-mono font-bold text-slate-800 text-sm leading-none">{detail.customer_code}</span>
                                  </div>
                                  <span className="font-bold text-indigo-600 text-sm">{detail.amount_liters} L</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-md bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl shadow-xl z-50 flex items-start gap-3 animate-bounce">
          <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400 shrink-0">
            <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <div className="flex-1">
            <p className="font-bold text-xs text-slate-100">Export Succeeded!</p>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{toastMessage}</p>
          </div>
          <button onClick={() => setShowToast(false)} className="text-slate-400 hover:text-white font-bold text-sm leading-none p-1">✕</button>
        </div>
      )}
    </div>
  );
}
