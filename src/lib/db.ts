import { Customer, MilkEntry } from '../types';

export const generateId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const db = {
  getCustomers: async (): Promise<Customer[]> => {
    try {
      const data = localStorage.getItem('customers');
      if (data) {
        return JSON.parse(data);
      }
      return [];
    } catch (error) {
      console.error('Failed to load customers from local storage', error);
      return [];
    }
  },
  saveCustomer: async (customer: Partial<Customer> & { code: string, milk_type: 'cow'|'buffalo'|'both' }) => {
    try {
      const existing = await db.getCustomers();
      if (existing.some(c => c.code.toLowerCase() === customer.code.toLowerCase())) {
          throw new Error('This code number already exists.');
      }
      
      const payload: Customer = {
        ...customer as Customer,
        id: customer.id || generateId(),
        userId: 'milkvendor',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem('customers', JSON.stringify([...existing, payload]));
    } catch (error: any) {
      if (error.message === 'This code number already exists.') throw error;
      console.error('Failed to save customer', error);
      throw error;
    }
  },
  updateCustomer: async (id: string, updates: Partial<Customer>) => {
    try {
      const existing = await db.getCustomers();
      const index = existing.findIndex(c => c.id === id);
      if (index === -1) throw new Error('Customer not found');
      
      // Check code collision
      if (updates.code) {
        if (existing.some(c => c.id !== id && c.code.toLowerCase() === updates.code!.toLowerCase())) {
          throw new Error('This code number already exists.');
        }
      }

      const updated = {
        ...existing[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      existing[index] = updated;
      localStorage.setItem('customers', JSON.stringify(existing));
    } catch (error) {
      console.error('Failed to update customer', error);
      throw error;
    }
  },
  deleteCustomer: async (id: string) => {
    try {
      const existing = await db.getCustomers();
      const filtered = existing.filter(c => c.id !== id);
      localStorage.setItem('customers', JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete customer', error);
      throw error;
    }
  },
  getEntries: async (): Promise<MilkEntry[]> => {
    try {
      const data = localStorage.getItem('milk_entries');
      if (data) {
        return JSON.parse(data);
      }
      return [];
    } catch (error) {
      console.error('Failed to load entries from local storage', error);
      return [];
    }
  },
  saveEntry: async (entry: Partial<MilkEntry> & { customer_code: string, amount_liters: number, milk_type: 'cow'|'buffalo', date: string, price_per_liter: number, total_price: number }) => {
    try {
      const existing = await db.getEntries();
      
      const payload: MilkEntry = {
        ...entry as MilkEntry,
        id: entry.id || generateId(),
        userId: 'milkvendor',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem('milk_entries', JSON.stringify([...existing, payload]));
    } catch (error) {
      console.error('Failed to save entry', error);
      throw error;
    }
  }
};
