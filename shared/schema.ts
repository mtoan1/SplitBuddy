import { z } from "zod";

// Define enums as string literals instead of PostgreSQL enums
export const billStatusEnum = ['created', 'active', 'completed', 'cancelled'] as const;
export const splitMethodEnum = ['equal', 'custom_amount', 'percentage'] as const;
export const paymentStatusEnum = ['pending', 'paid', 'failed', 'overdue'] as const;
export const notificationTypeEnum = ['payment_request', 'reminder', 'completion'] as const;
export const notificationChannelEnum = ['in_app', 'sms', 'email'] as const;
export const notificationStatusEnum = ['sent', 'delivered', 'failed'] as const;

export type BillStatus = typeof billStatusEnum[number];
export type SplitMethod = typeof splitMethodEnum[number];
export type PaymentStatus = typeof paymentStatusEnum[number];
export type NotificationType = typeof notificationTypeEnum[number];
export type NotificationChannel = typeof notificationChannelEnum[number];
export type NotificationStatus = typeof notificationStatusEnum[number];

// Define data types as TypeScript interfaces
export interface Bill {
  id: string;
  creatorId: string;
  totalAmount: string;
  merchantName: string;
  billDate: Date;
  status: BillStatus;
  splitMethod: SplitMethod;
  aiProcessed: boolean;
  billImagePath?: string;
  groupImagePath?: string;
  aiBillId?: string;
  aiGroupId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Participant {
  id: string;
  billId: string;
  userId?: string;
  name: string;
  phone?: string;
  email?: string;
  isCakeUser: boolean;
  amountToPay: string;
  percentage?: string;
  paymentStatus: PaymentStatus;
  paidAt?: Date;
  paymentMethod?: string;
  transactionId?: string;
  aiFaceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRequest {
  id: string;
  billId: string;
  participantId: string;
  paymentLink: string;
  qrCodeUrl?: string;
  expiryDate: Date;
  status: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  billId: string;
  participantId?: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StatusHistory {
  id: string;
  billId: string;
  fromStatus: BillStatus;
  toStatus: BillStatus;
  changedBy: string;
  reason?: string;
  createdAt: Date;
}

export interface User {
  id: number;
  username: string;
  createdAt: Date;
  updatedAt: Date;
}

// Define insert schemas using Zod
export const insertBillSchema = z.object({
  creatorId: z.string(),
  totalAmount: z.string(),
  merchantName: z.string(),
  billDate: z.coerce.date(),
  status: z.enum(billStatusEnum).default('created'),
  splitMethod: z.enum(splitMethodEnum).default('equal'),
  aiProcessed: z.boolean().default(false),
  billImagePath: z.string().optional(),
  groupImagePath: z.string().optional(),
  aiBillId: z.string().optional(),
  aiGroupId: z.string().optional(),
});

export const insertParticipantSchema = z.object({
  billId: z.string(),
  userId: z.string().optional(),
  name: z.string(),
  phone: z.string().optional(),
  email: z.string().optional(),
  isCakeUser: z.boolean().default(false),
  amountToPay: z.string().default('0'),
  percentage: z.string().optional(),
  paymentStatus: z.enum(paymentStatusEnum).default('pending'),
  paidAt: z.coerce.date().optional(),
  paymentMethod: z.string().optional(),
  transactionId: z.string().optional(),
  aiFaceId: z.string().optional(),
});

export const insertPaymentRequestSchema = z.object({
  billId: z.string(),
  participantId: z.string(),
  paymentLink: z.string(),
  qrCodeUrl: z.string().optional(),
  expiryDate: z.coerce.date(),
  status: z.enum(paymentStatusEnum),
});

export const insertNotificationSchema = z.object({
  billId: z.string(),
  participantId: z.string().optional(),
  type: z.enum(notificationTypeEnum),
  channel: z.enum(notificationChannelEnum),
  status: z.enum(notificationStatusEnum),
  sentAt: z.coerce.date().optional(),
  deliveredAt: z.coerce.date().optional(),
  errorMessage: z.string().optional(),
});

export const insertStatusHistorySchema = z.object({
  billId: z.string(),
  fromStatus: z.enum(billStatusEnum),
  toStatus: z.enum(billStatusEnum),
  changedBy: z.string(),
  reason: z.string().optional(),
});

export const insertUserSchema = z.object({
  username: z.string(),
});

export type InsertBill = z.infer<typeof insertBillSchema>;
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type InsertPaymentRequest = z.infer<typeof insertPaymentRequestSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertStatusHistory = z.infer<typeof insertStatusHistorySchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;