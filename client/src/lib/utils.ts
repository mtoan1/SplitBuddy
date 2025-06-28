import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  
  if (isToday) {
    return `Today, ${d.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    })}`;
  }
  
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
}

export function calculatePaidPercentage(participants: any[]): number {
  if (participants.length === 0) return 0;
  
  const paidCount = participants.filter(p => p.paymentStatus === 'paid').length;
  return Math.round((paidCount / participants.length) * 100);
}

export function calculateTotalPaid(participants: any[]): number {
  return participants
    .filter(p => p.paymentStatus === 'paid')
    .reduce((sum, p) => sum + parseFloat(p.amountToPay || '0'), 0);
}

// Helper function to format VND amounts with commas (for display without currency symbol)
export function formatVNDWithCommas(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount));
}