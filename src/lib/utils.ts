import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCowMilkPrice(): number {
  const price = localStorage.getItem('custom_cow_milk_price');
  return price !== null ? Number(price) : 0;
}

export function getBuffaloMilkPrice(): number {
  const price = localStorage.getItem('custom_buffalo_milk_price');
  return price !== null ? Number(price) : 0;
}

export function isMilkPriceConfigured(): boolean {
  const cow = localStorage.getItem('custom_cow_milk_price');
  const buffalo = localStorage.getItem('custom_buffalo_milk_price');
  return cow !== null && buffalo !== null;
}

export function setCustomMilkPrices(cowPrice: number, buffaloPrice: number) {
  localStorage.setItem('custom_cow_milk_price', cowPrice.toString());
  localStorage.setItem('custom_buffalo_milk_price', buffaloPrice.toString());
}

/**
 * Downloads a CSV file with enhanced mobile WebView and browser compatibility.
 * It uses the native Web Share API on mobile devices/wrappers, base64 encoded local data URL
 * as a secondary solution, and copies the data to the clipboard as a robust fallback.
 */
export async function downloadCSV(csvContent: string, filename: string): Promise<{ copied: boolean; downloaded: boolean; shared: boolean }> {
  let downloaded = false;
  let copied = false;
  let shared = false;

  // 1. Copy to clipboard automatically as a definitive safety net
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(csvContent);
      copied = true;
    } else {
      // Fallback text area copy for older/simple mobile webviews or insecure contexts
      const textArea = document.createElement("textarea");
      textArea.value = csvContent;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      copied = document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  } catch (err) {
    console.warn("Auto-copy to clipboard failed: ", err);
  }

  const BOM = "\uFEFF";
  const contentWithBOM = BOM + csvContent;

  // 2. Web Share API - standard solution for mobile wrappers (like WebIntoApp.com / WebViews)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const file = new File([contentWithBOM], filename, { type: 'text/csv' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: filename,
          text: `Exported CSV: ${filename}`
        });
        return { copied, downloaded: true, shared: true };
      }
    } catch (err: any) {
      // User cancelling sharing is normal, don't fallback if they cancelled deliberately
      if (err?.name === 'AbortError') {
        console.info("User cancelled share dialog.");
        return { copied, downloaded: false, shared: false };
      }
      console.warn("File share failed, trying text share fallback: ", err);
    }

    try {
      await navigator.share({
        title: filename,
        text: csvContent
      });
      return { copied, downloaded: true, shared: true };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.info("User cancelled text share dialog.");
        return { copied, downloaded: false, shared: false };
      }
      console.warn("Text share failed, falling back to anchor downloads: ", err);
    }
  }

  // 3. Generate Base64 Data URI to bypass typical WebView out-of-process Blob issues
  try {
    // Safety UTF8 base64 encoding helper
    const base64Content = btoa(unescape(encodeURIComponent(contentWithBOM)));
    const dataUrl = `data:text/csv;base64,${base64Content}`;

    const link = document.createElement("a");
    link.setAttribute("href", dataUrl);
    link.setAttribute("download", filename);
    link.setAttribute("target", "_blank"); // Helps iOS Safari webviews open content directly
    link.style.display = "none";
    document.body.appendChild(link);
    
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
    }, 150);
    
    downloaded = true;
  } catch (err) {
    console.error("Link-click download failed: ", err);
    
    // Attempt fallback redirect as next best effort
    try {
      const fallbackUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
      window.location.href = fallbackUrl;
      downloaded = true;
    } catch (fallbackErr) {
      console.error("Window location fallback failed: ", fallbackErr);
    }
  }

  return { copied, downloaded, shared };
}


