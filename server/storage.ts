import { 
  users, bills, participants, paymentRequests, notifications, statusHistory,
  type User, type InsertUser, type Bill, type InsertBill, 
  type Participant, type InsertParticipant, type PaymentRequest, type InsertPaymentRequest,
  type Notification, type InsertNotification, type StatusHistory, type InsertStatusHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  
  // Individual participant method
  getParticipantById(id: string): Promise<Participant | undefined>;
  
  // Bill methods
  createBill(insertBill: InsertBill): Promise<Bill>;
  getBillById(id: string): Promise<Bill | undefined>;
  getBillsByCreator(creatorId: string): Promise<Bill[]>;
  updateBill(id: string, updates: Partial<Bill>): Promise<Bill | undefined>;
  deleteBill(id: string): Promise<void>;
  
  // Participant methods
  createParticipant(insertParticipant: InsertParticipant): Promise<Participant>;
  getParticipantsByBillId(billId: string): Promise<Participant[]>;
  getUnpaidParticipants(billId: string): Promise<Participant[]>;
  updateParticipant(id: string, updates: Partial<Participant>): Promise<Participant | undefined>;
  deleteParticipant(id: string): Promise<void>;
  markParticipantAsPaid(id: string): Promise<Participant | undefined>;
  
  // Bill calculation methods
  calculateBillSplit(billId: string, splitMethod: string, customAmounts?: Record<string, number>, percentages?: Record<string, number>): Promise<any>;
  
  // Payment methods
  requestPaymentsForBill(billId: string): Promise<any>;
  requestPaymentForParticipant(billId: string, participantId: string): Promise<any>;
  
  // Notification methods
  sendReminders(billId: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createBill(insertBill: InsertBill): Promise<Bill> {
    const [bill] = await db
      .insert(bills)
      .values(insertBill)
      .returning();
    return bill;
  }

  async getBillById(id: string): Promise<Bill | undefined> {
    const [bill] = await db.select().from(bills).where(eq(bills.id, id));
    return bill || undefined;
  }

  async getBillsByCreator(creatorId: string): Promise<Bill[]> {
    return await db.select().from(bills).where(eq(bills.creatorId, creatorId));
  }

  async updateBill(id: string, updates: Partial<Bill>): Promise<Bill | undefined> {
    const [bill] = await db
      .update(bills)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(bills.id, id))
      .returning();
    return bill || undefined;
  }

  async deleteBill(id: string): Promise<void> {
    await db.delete(bills).where(eq(bills.id, id));
  }

  async createParticipant(insertParticipant: InsertParticipant): Promise<Participant> {
    const [participant] = await db
      .insert(participants)
      .values(insertParticipant)
      .returning();
    return participant;
  }

  async getParticipantsByBillId(billId: string): Promise<Participant[]> {
    return await db.select().from(participants).where(eq(participants.billId, billId));
  }

  async getParticipantById(id: string): Promise<Participant | undefined> {
    const [participant] = await db.select().from(participants).where(eq(participants.id, id));
    return participant || undefined;
  }

  async getUnpaidParticipants(billId: string): Promise<Participant[]> {
    return await db.select().from(participants).where(
      and(
        eq(participants.billId, billId),
        eq(participants.paymentStatus, 'pending')
      )
    );
  }

  async updateParticipant(id: string, updates: Partial<Participant>): Promise<Participant | undefined> {
    const [participant] = await db
      .update(participants)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(participants.id, id))
      .returning();
    return participant || undefined;
  }

  async deleteParticipant(id: string): Promise<void> {
    await db.delete(participants).where(eq(participants.id, id));
  }

  async markParticipantAsPaid(id: string, paymentMethod: string = 'mock'): Promise<Participant | undefined> {
    const [participant] = await db
      .update(participants)
      .set({ 
        paymentStatus: 'paid',
        paidAt: new Date(),
        paymentMethod,
        transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        updatedAt: new Date()
      })
      .where(eq(participants.id, id))
      .returning();
    return participant || undefined;
  }

  async calculateBillSplit(billId: string, splitMethod: string, customAmounts?: Record<string, number>, percentages?: Record<string, number>): Promise<any> {
    const bill = await this.getBillById(billId);
    const participantsList = await this.getParticipantsByBillId(billId);
    
    if (!bill || participantsList.length === 0) {
      throw new Error('Bill or participants not found');
    }

    const totalAmount = parseFloat(bill.totalAmount);
    let updatedParticipants: Participant[] = [];

    switch (splitMethod) {
      case 'equal':
        const equalAmount = totalAmount / participantsList.length;
        for (const participant of participantsList) {
          const updated = await this.updateParticipant(participant.id, {
            amountToPay: equalAmount.toFixed(2)
          });
          if (updated) updatedParticipants.push(updated);
        }
        break;
        
      case 'custom_amount':
        if (customAmounts) {
          for (const participant of participantsList) {
            const amount = customAmounts[participant.id] || 0;
            const updated = await this.updateParticipant(participant.id, {
              amountToPay: amount.toFixed(2)
            });
            if (updated) updatedParticipants.push(updated);
          }
        }
        break;
        
      case 'percentage':
        if (percentages) {
          for (const participant of participantsList) {
            const percentage = percentages[participant.id] || 0;
            const amount = (totalAmount * percentage) / 100;
            const updated = await this.updateParticipant(participant.id, {
              amountToPay: amount.toFixed(2),
              percentage: percentage.toString()
            });
            if (updated) updatedParticipants.push(updated);
          }
        }
        break;
    }

    // Update bill split method
    await this.updateBill(billId, { splitMethod: splitMethod as any });

    return {
      bill,
      participants: updatedParticipants,
      splitMethod,
      totalAmount
    };
  }

  async requestPaymentsForBill(billId: string): Promise<any> {
    const participantsList = await this.getUnpaidParticipants(billId);
    const results = [];

    for (const participant of participantsList) {
      // Mock payment request creation
      const paymentRequest = {
        billId,
        participantId: participant.id,
        paymentLink: `https://pay.chillbill.app/bill/${billId}/participant/${participant.id}`,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://pay.chillbill.app/bill/${billId}/participant/${participant.id}`,
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        status: 'pending' as const
      };

      results.push(paymentRequest);
    }

    return { message: 'Payment requests sent', requests: results };
  }

  async requestPaymentForParticipant(billId: string, participantId: string): Promise<any> {
    const participant = await db.select().from(participants).where(eq(participants.id, participantId));
    
    if (participant.length === 0) {
      throw new Error('Participant not found');
    }

    return {
      message: 'Payment request sent',
      paymentLink: `https://pay.chillbill.app/bill/${billId}/participant/${participantId}`,
      participant: participant[0]
    };
  }

  async sendReminders(billId: string): Promise<any> {
    const unpaidParticipants = await this.getUnpaidParticipants(billId);
    
    // Mock notification creation
    const notifications = [];
    for (const participant of unpaidParticipants) {
      notifications.push({
        billId,
        participantId: participant.id,
        type: 'reminder' as const,
        channel: participant.phone ? 'sms' as const : 'email' as const,
        status: 'sent' as const
      });
    }

    return {
      message: 'Reminders sent',
      count: unpaidParticipants.length,
      participants: unpaidParticipants
    };
  }
}

export const storage = new DatabaseStorage();