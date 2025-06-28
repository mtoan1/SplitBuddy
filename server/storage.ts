import { 
  type User, type InsertUser, type Bill, type InsertBill, 
  type Participant, type InsertParticipant, type PaymentRequest, type InsertPaymentRequest,
  type Notification, type InsertNotification, type StatusHistory, type InsertStatusHistory
} from "@shared/schema";

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

// In-memory storage implementation
export class MemoryStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private bills: Map<string, Bill> = new Map();
  private participants: Map<string, Participant> = new Map();
  private paymentRequests: Map<string, PaymentRequest> = new Map();
  private notifications: Map<string, Notification> = new Map();
  private statusHistory: Map<string, StatusHistory> = new Map();
  
  private nextUserId = 1;

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.nextUserId++;
    const now = new Date();
    const user: User = {
      id,
      username: insertUser.username,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, user);
    return user;
  }

  async createBill(insertBill: InsertBill): Promise<Bill> {
    const id = this.generateId();
    const now = new Date();
    const bill: Bill = {
      id,
      creatorId: insertBill.creatorId,
      totalAmount: insertBill.totalAmount,
      merchantName: insertBill.merchantName,
      billDate: insertBill.billDate,
      status: insertBill.status || 'created',
      splitMethod: insertBill.splitMethod || 'equal',
      aiProcessed: insertBill.aiProcessed || false,
      billImagePath: insertBill.billImagePath,
      groupImagePath: insertBill.groupImagePath,
      aiBillId: insertBill.aiBillId,
      aiGroupId: insertBill.aiGroupId,
      createdAt: now,
      updatedAt: now,
    };
    this.bills.set(id, bill);
    return bill;
  }

  async getBillById(id: string): Promise<Bill | undefined> {
    return this.bills.get(id);
  }

  async getBillsByCreator(creatorId: string): Promise<Bill[]> {
    const bills = [];
    for (const bill of Array.from(this.bills.values())) {
      if (bill.creatorId === creatorId) {
        bills.push(bill);
      }
    }
    // Sort by creation date (newest first)
    return bills.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateBill(id: string, updates: Partial<Bill>): Promise<Bill | undefined> {
    const bill = this.bills.get(id);
    if (!bill) return undefined;
    
    const updatedBill = {
      ...bill,
      ...updates,
      updatedAt: new Date(),
    };
    this.bills.set(id, updatedBill);
    return updatedBill;
  }

  async deleteBill(id: string): Promise<void> {
    this.bills.delete(id);
    // Also delete associated participants
    for (const [participantId, participant] of Array.from(this.participants.entries())) {
      if (participant.billId === id) {
        this.participants.delete(participantId);
      }
    }
  }

  async createParticipant(insertParticipant: InsertParticipant): Promise<Participant> {
    const id = this.generateId();
    const now = new Date();
    const participant: Participant = {
      id,
      billId: insertParticipant.billId,
      userId: insertParticipant.userId,
      name: insertParticipant.name,
      phone: insertParticipant.phone,
      email: insertParticipant.email,
      isCakeUser: insertParticipant.isCakeUser || false,
      amountToPay: insertParticipant.amountToPay || '0',
      percentage: insertParticipant.percentage,
      paymentStatus: insertParticipant.paymentStatus || 'pending',
      paidAt: insertParticipant.paidAt,
      paymentMethod: insertParticipant.paymentMethod,
      transactionId: insertParticipant.transactionId,
      aiFaceId: insertParticipant.aiFaceId,
      createdAt: now,
      updatedAt: now,
    };
    this.participants.set(id, participant);
    return participant;
  }

  async getParticipantsByBillId(billId: string): Promise<Participant[]> {
    const participants = [];
    for (const participant of Array.from(this.participants.values())) {
      if (participant.billId === billId) {
        participants.push(participant);
      }
    }
    return participants;
  }

  async getParticipantById(id: string): Promise<Participant | undefined> {
    return this.participants.get(id);
  }

  async getUnpaidParticipants(billId: string): Promise<Participant[]> {
    const participants = [];
    for (const participant of Array.from(this.participants.values())) {
      if (participant.billId === billId && participant.paymentStatus === 'pending') {
        participants.push(participant);
      }
    }
    return participants;
  }

  async updateParticipant(id: string, updates: Partial<Participant>): Promise<Participant | undefined> {
    const participant = this.participants.get(id);
    if (!participant) return undefined;
    
    const updatedParticipant = {
      ...participant,
      ...updates,
      updatedAt: new Date(),
    };
    this.participants.set(id, updatedParticipant);
    return updatedParticipant;
  }

  async deleteParticipant(id: string): Promise<void> {
    this.participants.delete(id);
  }

  async markParticipantAsPaid(id: string, paymentMethod: string = 'mock'): Promise<Participant | undefined> {
    const participant = this.participants.get(id);
    if (!participant) return undefined;
    
    const updatedParticipant = {
      ...participant,
      paymentStatus: 'paid' as const,
      paidAt: new Date(),
      paymentMethod,
      transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      updatedAt: new Date(),
    };
    this.participants.set(id, updatedParticipant);
    return updatedParticipant;
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
    const participant = await this.getParticipantById(participantId);
    
    if (!participant) {
      throw new Error('Participant not found');
    }

    return {
      message: 'Payment request sent',
      paymentLink: `https://pay.chillbill.app/bill/${billId}/participant/${participantId}`,
      participant: participant
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

export const storage = new MemoryStorage();