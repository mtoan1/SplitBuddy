import { pgTable, text, serial, uuid, decimal, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const billStatusEnum = pgEnum('bill_status', ['created', 'active', 'completed', 'cancelled']);
export const splitMethodEnum = pgEnum('split_method', ['equal', 'custom_amount', 'percentage']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'failed', 'overdue']);
export const notificationTypeEnum = pgEnum('notification_type', ['payment_request', 'reminder', 'completion']);
export const notificationChannelEnum = pgEnum('notification_channel', ['in_app', 'sms', 'email']);
export const notificationStatusEnum = pgEnum('notification_status', ['sent', 'delivered', 'failed']);

export const bills = pgTable("bills", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: uuid("creator_id").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  merchantName: text("merchant_name").notNull(),
  billDate: timestamp("bill_date").notNull(),
  status: billStatusEnum("status").notNull().default('created'),
  splitMethod: splitMethodEnum("split_method").default('equal'),
  aiProcessed: boolean("ai_processed").default(false),
  billImagePath: text("bill_image_path"),
  groupImagePath: text("group_image_path"),
  aiBillId: text("ai_bill_id"),
  aiGroupId: text("ai_group_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const participants = pgTable("participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  billId: uuid("bill_id").notNull().references(() => bills.id, { onDelete: 'cascade' }),
  userId: uuid("user_id"),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  isCakeUser: boolean("is_cake_user").default(false),
  amountToPay: decimal("amount_to_pay", { precision: 10, scale: 2 }).default('0'),
  percentage: decimal("percentage", { precision: 5, scale: 2 }),
  paymentStatus: paymentStatusEnum("payment_status").default('pending'),
  aiFaceId: text("ai_face_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paymentRequests = pgTable("payment_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  billId: uuid("bill_id").notNull().references(() => bills.id, { onDelete: 'cascade' }),
  participantId: uuid("participant_id").notNull().references(() => participants.id, { onDelete: 'cascade' }),
  paymentLink: text("payment_link"),
  qrCodeUrl: text("qr_code_url"),
  expiryDate: timestamp("expiry_date"),
  status: paymentStatusEnum("status").default('pending'),
  paymentId: text("payment_id"),
  retryCount: serial("retry_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  billId: uuid("bill_id").notNull().references(() => bills.id, { onDelete: 'cascade' }),
  participantId: uuid("participant_id").references(() => participants.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum("type").notNull(),
  channel: notificationChannelEnum("channel").notNull(),
  status: notificationStatusEnum("status").default('sent'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const statusHistory = pgTable("status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  billId: uuid("bill_id").notNull().references(() => bills.id, { onDelete: 'cascade' }),
  participantId: uuid("participant_id").references(() => participants.id, { onDelete: 'cascade' }),
  previousStatus: text("previous_status"),
  newStatus: text("new_status").notNull(),
  changedBy: text("changed_by"),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const billsRelations = relations(bills, ({ many }) => ({
  participants: many(participants),
  paymentRequests: many(paymentRequests),
  notifications: many(notifications),
  statusHistory: many(statusHistory),
}));

export const participantsRelations = relations(participants, ({ one, many }) => ({
  bill: one(bills, {
    fields: [participants.billId],
    references: [bills.id],
  }),
  paymentRequests: many(paymentRequests),
  notifications: many(notifications),
  statusHistory: many(statusHistory),
}));

export const paymentRequestsRelations = relations(paymentRequests, ({ one }) => ({
  bill: one(bills, {
    fields: [paymentRequests.billId],
    references: [bills.id],
  }),
  participant: one(participants, {
    fields: [paymentRequests.participantId],
    references: [participants.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  bill: one(bills, {
    fields: [notifications.billId],
    references: [bills.id],
  }),
  participant: one(participants, {
    fields: [notifications.participantId],
    references: [participants.id],
  }),
}));

export const statusHistoryRelations = relations(statusHistory, ({ one }) => ({
  bill: one(bills, {
    fields: [statusHistory.billId],
    references: [bills.id],
  }),
  participant: one(participants, {
    fields: [statusHistory.participantId],
    references: [participants.id],
  }),
}));

// Insert schemas
export const insertBillSchema = createInsertSchema(bills).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertParticipantSchema = createInsertSchema(participants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentRequestSchema = createInsertSchema(paymentRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStatusHistorySchema = createInsertSchema(statusHistory).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertBill = z.infer<typeof insertBillSchema>;
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type InsertPaymentRequest = z.infer<typeof insertPaymentRequestSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertStatusHistory = z.infer<typeof insertStatusHistorySchema>;

export type Bill = typeof bills.$inferSelect;
export type Participant = typeof participants.$inferSelect;
export type PaymentRequest = typeof paymentRequests.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type StatusHistory = typeof statusHistory.$inferSelect;

// Remove old user schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
