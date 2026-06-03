export type Customer = {
  id: string;
  userId?: string;
  created_at?: string;
  createdAt: string;
  updatedAt: string;
  code: string;
  name: string | null;
  whatsapp: string | null;
  milk_type: 'cow' | 'buffalo' | 'both';
};

export type MilkEntry = {
  id: string;
  userId?: string;
  created_at?: string;
  createdAt: string;
  updatedAt: string;
  customer_code: string;
  amount_liters: number;
  milk_type: 'cow' | 'buffalo';
  date: string;
  price_per_liter: number;
  total_price: number;
};
