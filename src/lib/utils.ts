import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ShopeeSale } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utility to convert file to base64 for local storage
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const formatCurrency = (amount: number) => {
  const normalizedAmount = Math.round(Math.abs(amount));
  const formattedAmount = normalizedAmount.toLocaleString('id-ID');

  return `${amount < 0 ? '-' : ''}Rp.${formattedAmount}`;
};

export const parseCurrencyInput = (value: string) => {
  return value.replace(/,\d{0,2}$/, '').replace(/\D/g, '').replace(/^0+(?=\d)/, '');
};

export const formatRupiahInput = (value: string | number) => {
  const numericValue = typeof value === 'number' ? value.toString() : parseCurrencyInput(value);
  if (!numericValue) return '';

  return `Rp ${Number(numericValue).toLocaleString('id-ID')},00`;
};

export const getShopeeReceivableAmount = (
  sale: Pick<ShopeeSale, 'finalReceiptAmount' | 'receivableAmount'>
) => {
  if (typeof sale.finalReceiptAmount === 'number') {
    return sale.finalReceiptAmount;
  }

  return sale.receivableAmount;
};
