import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const COW_MILK_PRICE = 50; // Price per liter for Cow milk
export const BUFFALO_MILK_PRICE = 60; // Price per liter for Buffalo milk
