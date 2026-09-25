import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format numbers as Kenyan Shillings: e.g. KSh 2,500.00
 */
export function formatKsh(amount: number | string | undefined | null): string {
  const num = Number(amount) || 0;
  return `KSh ${num.toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Clean & validate Kenyan phone numbers
 */
export function validateKenyanPhone(phone: string): { isValid: boolean; formatted: string; message: string } {
  if (!phone) {
    return { isValid: false, formatted: '', message: 'Phone number is required.' };
  }

  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
  if (cleaned.startsWith('0')) cleaned = '254' + cleaned.substring(1);
  if ((cleaned.startsWith('7') || cleaned.startsWith('1')) && cleaned.length === 9) {
    cleaned = '254' + cleaned;
  }

  const kenyaRegex = /^254[17]\d{8}$/;
  const isValid = kenyaRegex.test(cleaned);

  return {
    isValid,
    formatted: cleaned,
    message: isValid
      ? 'Valid Safaricom M-Pesa number'
      : 'Must be a valid Kenyan mobile number (e.g. 0712345678 or 0110000000)',
  };
}
