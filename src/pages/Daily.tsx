import { useEffect, useState } from 'react';
import { db } from '../lib/db';
import { format } from 'date-fns';
import { MilkEntry } from '../types';
import { DollarSign, Droplet, Users, Download, FileText, Smartphone, Plus, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { downloadCSV } from '../lib/utils';

export function Daily() {
  const [entries, setEntries] = useState<MilkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // PWA installation states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    fetchTodayData();

    // Check if already in standalone app mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    if (isStandalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Detect successful native installation
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
        if (choiceResult.outcome === 'accepted') {
          console.info('User accepted the home screen installation');
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      });
    } else {
      // Prompt instructional pop-up modal for iOS Safari / manual adding
      setShowIOSHint(true);
    }
  };

  const fetchTodayData = async () => {
    setLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Fetch all entries for today
    const milkEntries = await db.getEntries();
    const filteredEntries = milkEntries
      .filter((e: any) => e.date === today)
      .sort((a: any, b: any) => new Date(b.createdAt?.seconds * 1000 || 0).getTime() - new Date(a.createdAt?.seconds * 1000 || 0).getTime());

    setEntries(filteredEntries);
    setLoading(false);
  };

  const totalCowLiters = entries.filter(e => e.milk_type === 'cow').reduce((sum, e) => sum + Number(e.amount_liters), 0);
  const totalBuffaloLiters = entries.filter(e => e.milk_type === 'buffalo').reduce((sum, e) => sum + Number(e.amount_liters), 0);
  
  // Unique customers served today
  const uniqueCustomerCodes = new Set(entries.map(e => e.customer_code));

  const handleExportCSV = async () => {
    if (entries.length === 0) return;

    const headers = [
      'Customer Code',
      'Quantity (L)',
      'Milk Type'
    ];

    const rows = entries.map(e => [
      e.customer_code,
      (e.amount_liters || 0).toString() + ' L',
      (e.milk_type || '').toUpperCase()
    ]);

    // Calculate totals
    const totalLitersSum = entries.reduce((sum, e) => sum + Number(e.amount_liters || 0), 0);
    rows.push([
      'TOTAL',
      totalLitersSum.toString() + ' L',
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

    const filename = `daily_bills_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    const result = await downloadCSV(csvContent, filename);

    if (result.shared) {
      setToastMessage(`Export sheet opened successfully! Data also copied to clipboard as backup.`);
    } else if (result.copied) {
      setToastMessage(`Saved as "${filename}" and copied to clipboard! You can paste/open it directly in Excel.`);
    } else {
      setToastMessage(`Saved as "${filename}"!`);
    }
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  const handleExportPDF = () => {
    if (entries.length === 0) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const dateStr = format(new Date(), 'dd MMM yyyy');

    // Header section matching brand colors
    doc.setFillColor(30, 41, 59); // slate-800 background
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('DAILY BILLS REPORT', 15, 18);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Date: ${dateStr}`, 15, 26);
    doc.text(`Total Servings: ${uniqueCustomerCodes.size} homes / codes`, 15, 32);

    // Columns structure
    doc.setTextColor(30, 41, 59);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);

    const headersY = 52;
    doc.text('Customer Code', 20, headersY);
    doc.text('Quantity (L)', 80, headersY);
    doc.text('Milk Type', 140, headersY);

    doc.setDrawColor(203, 213, 225); // slate-300
    doc.line(15, headersY + 4, 195, headersY + 4);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    let y = 64;

    const totalLitersSum = entries.reduce((sum, e) => sum + Number(e.amount_liters || 0), 0);

    entries.forEach(entry => {
      if (y > 270) {
        doc.addPage();
        y = 20;
        doc.setFont('Helvetica', 'bold');
        doc.text('Customer Code', 20, y);
        doc.text('Quantity (L)', 80, y);
        doc.text('Milk Type', 140, y);
        doc.line(15, y + 4, 195, y + 4);
        y += 12;
        doc.setFont('Helvetica', 'normal');
      }

      doc.setDrawColor(241, 245, 249); // slate-100
      doc.line(15, y + 2, 195, y + 2);

      doc.text(entry.customer_code, 20, y);
      doc.text(`${(entry.amount_liters || 0)} L`, 80, y);
      doc.text((entry.milk_type || '').toUpperCase(), 140, y);
      y += 10;
    });

    if (y > 250) {
      doc.addPage();
      y = 25;
    }

    doc.setDrawColor(148, 163, 184); // slate-400
    doc.setLineWidth(0.5);
    doc.line(15, y, 195, y);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('GRAND TOTAL', 20, y + 8);
    doc.text(`${totalLitersSum} L`, 80, y + 8);
    doc.text('', 140, y + 8);

    doc.save(`daily_bills_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  if (loading) return <div className="p-6 flex justify-center items-center h-full"><div className="animate-spin w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent"></div></div>;

  return (
    <div className="p-4 pb-24 h-full flex flex-col">
      <header className="h-48 md:h-24 bg-white border-b border-slate-200 px-4 md:px-8 flex flex-col md:flex-row md:items-center justify-between -mt-4 -mx-4 md:-mx-8 mb-8 pb-4 md:pb-0 gap-4">
        <div className="flex flex-row items-center justify-between w-full md:w-auto">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Daily Bills</h1>
            <p className="text-xs text-slate-400 uppercase tracking-widest">{format(new Date(), 'EEEE, MMMM do, yyyy')}</p>
          </div>

          {/* Add to Home Screen Button exclusively in top right on mobile */}
          {!isInstalled && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer animate-pulse shrink-0 md:hidden"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
              <span>Install App</span>
            </button>
          )}
        </div>

        <div className="flex flex-row items-center justify-between md:justify-end gap-6 w-full md:w-auto">
          <div className="flex flex-wrap md:flex-nowrap gap-x-6 gap-y-2 md:space-x-8">
            <div className="text-left md:text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cow Milk</p>
              <p className="text-sm md:text-lg font-bold text-blue-600">{totalCowLiters} L</p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Buffalo</p>
              <p className="text-sm md:text-lg font-bold text-indigo-600">{totalBuffaloLiters} L</p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Homes Served</p>
              <p className="text-sm md:text-lg font-bold text-slate-700">{uniqueCustomerCodes.size}</p>
            </div>
          </div>

          {/* Inline Add to Home Screen Button for wide desktop layouts */}
          {!isInstalled && (
            <button
              onClick={handleInstallClick}
              className="hidden md:flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer animate-pulse"
            >
              <Smartphone className="w-4 h-4 text-blue-600" />
              <span>Add to Home Screen</span>
            </button>
          )}
        </div>
      </header>

      <div className="flex-1">
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col h-full mb-8">
          
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <h2 className="text-lg font-bold text-slate-800">Recent Entries</h2>
            <div className="flex gap-2">
              <button 
                onClick={handleExportCSV}
                disabled={entries.length === 0}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 px-3 py-2 rounded-lg font-medium text-xs transition-colors cursor-pointer"
                title="Export Daily CSV file"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Daily CSV
              </button>
              <button 
                onClick={handleExportPDF}
                disabled={entries.length === 0}
                className="flex items-center gap-1.5 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 px-3 py-2 rounded-lg font-medium text-xs transition-colors cursor-pointer"
                title="Open inside built-in device PDF Viewer"
              >
                <FileText className="w-3.5 h-3.5 text-slate-300" />
                Open PDF
              </button>
            </div>
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
                  <tr className="bg-slate-50/50 font-bold border-t border-slate-100 text-sm">
                    <td className="px-4 py-4 text-slate-900">GRAND TOTAL</td>
                    <td className="px-4 py-4 text-slate-800 text-right">
                      {entries.reduce((sum, e) => sum + Number(e.amount_liters), 0)} L
                    </td>
                    <td></td>
                  </tr>
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

      {showIOSHint && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 relative space-y-6">
            <button
              onClick={() => setShowIOSHint(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-20 h-20 rounded-2xl shadow-md border border-slate-100 overflow-hidden shrink-0 bg-slate-50">
                <img
                  src="/logo.png"
                  alt="DoodhSetu App Icon"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Add DoodhSetu to Home Screen</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-medium px-4">Open this website directly from your mobile screen with the new App icon!</p>
              </div>
            </div>

            <hr className="border-slate-100" />

            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div className="text-xs text-slate-600 leading-relaxed">
                  Tap the <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold">Share 📥</span> or browser menu button in your mobile browser.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div className="text-xs text-slate-600 leading-relaxed">
                  Scroll down the options menu and choose <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold">"Add to Home Screen" ➕</span>.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div className="text-xs text-slate-600 leading-relaxed">
                  Confirm the title "DoodhSetu" and tap <span className="text-blue-600 font-bold">"Add"</span> in the top-right corner.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSHint(false)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors duration-150 cursor-pointer active:scale-95"
            >
              Got it, Perfect!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
