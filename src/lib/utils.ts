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
 * It uses a base64 encoded local data URL so that mobile/nested iframe browsers
 * don't fail, and copies the data to the clipboard as a robust fallback.
 */
export function downloadCSV(csvContent: string, filename: string): { copied: boolean; downloaded: boolean } {
  let downloaded = false;
  let copied = false;

  // 1. Copy to clipboard automatically as a definitive safety net
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(csvContent);
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

  // 2. Generate Base64 Data URI to bypass typical WebView out-of-process Blob issues
  try {
    // Add Unicode byte-order mark (BOM) so Excel opens UTF-8 files correctly
    const BOM = "\uFEFF";
    const contentWithBOM = BOM + csvContent;
    
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

  return { copied, downloaded };
}


