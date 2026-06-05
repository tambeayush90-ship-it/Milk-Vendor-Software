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

