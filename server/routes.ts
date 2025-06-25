import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertBillSchema, insertParticipantSchema } from "@shared/schema";
import QRCode from "qrcode";

// Helper function to generate random menu items
function generateRandomItems(totalAmount: number) {
  const items = [
    { name: "Appetizer", priceRange: [8, 15] },
    { name: "Main Course", priceRange: [15, 28] },
    { name: "Side Dish", priceRange: [5, 12] },
    { name: "Dessert", priceRange: [6, 10] },
    { name: "Drinks", priceRange: [3, 8] },
    { name: "Salad", priceRange: [9, 16] },
    { name: "Soup", priceRange: [6, 12] }
  ];
  
  const generatedItems = [];
  let remainingAmount = totalAmount;
  const itemCount = Math.floor(Math.random() * 4) + 2; // 2-5 items
  
  for (let i = 0; i < itemCount - 1; i++) {
    const item = items[Math.floor(Math.random() * items.length)];
    const [min, max] = item.priceRange;
    const price = Math.random() * (max - min) + min;
    const actualPrice = Math.min(price, remainingAmount * 0.8); // Don't use more than 80% of remaining
    
    generatedItems.push({
      name: item.name,
      price: parseFloat(actualPrice.toFixed(2))
    });
    
    remainingAmount -= actualPrice;
  }
  
  // Add final item with remaining amount (tax, tip, etc.)
  generatedItems.push({
    name: "Tax & Service",
    price: parseFloat(remainingAmount.toFixed(2))
  });
  
  return generatedItems;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Bill Management
  app.post("/api/chillbill/bills", async (req, res) => {
    try {
      const billData = insertBillSchema.parse(req.body);
      const bill = await storage.createBill(billData);
      res.json(bill);
    } catch (error) {
      res.status(400).json({ message: "Invalid bill data", error });
    }
  });

  app.get("/api/chillbill/bills", async (req, res) => {
    try {
      const creatorId = req.query.creatorId as string;
      const bills = await storage.getBillsByCreator(creatorId);
      res.json(bills);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bills", error });
    }
  });

  app.get("/api/chillbill/bills/:billId", async (req, res) => {
    try {
      const bill = await storage.getBillById(req.params.billId);
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }
      res.json(bill);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bill", error });
    }
  });

  app.put("/api/chillbill/bills/:billId", async (req, res) => {
    try {
      const bill = await storage.updateBill(req.params.billId, req.body);
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }
      res.json(bill);
    } catch (error) {
      res.status(500).json({ message: "Failed to update bill", error });
    }
  });

  app.delete("/api/chillbill/bills/:billId", async (req, res) => {
    try {
      await storage.deleteBill(req.params.billId);
      res.json({ message: "Bill deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete bill", error });
    }
  });

  // Participant Management
  app.get("/api/chillbill/bills/:billId/participants", async (req, res) => {
    try {
      const participants = await storage.getParticipantsByBillId(req.params.billId);
      res.json(participants);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch participants", error });
    }
  });

  app.post("/api/chillbill/bills/:billId/participants", async (req, res) => {
    try {
      const participantData = insertParticipantSchema.parse({
        ...req.body,
        billId: req.params.billId,
      });
      const participant = await storage.createParticipant(participantData);
      res.json(participant);
    } catch (error) {
      res.status(400).json({ message: "Invalid participant data", error });
    }
  });

  app.put("/api/chillbill/bills/:billId/participants/:participantId", async (req, res) => {
    try {
      const participant = await storage.updateParticipant(req.params.participantId, req.body);
      if (!participant) {
        return res.status(404).json({ message: "Participant not found" });
      }
      res.json(participant);
    } catch (error) {
      res.status(500).json({ message: "Failed to update participant", error });
    }
  });

  app.delete("/api/chillbill/bills/:billId/participants/:participantId", async (req, res) => {
    try {
      await storage.deleteParticipant(req.params.participantId);
      res.json({ message: "Participant deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete participant", error });
    }
  });

  app.get("/api/chillbill/bills/:billId/participants/unpaid", async (req, res) => {
    try {
      const participants = await storage.getUnpaidParticipants(req.params.billId);
      res.json(participants);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unpaid participants", error });
    }
  });

  // Bill Calculation
  app.post("/api/chillbill/bills/:billId/calculate", async (req, res) => {
    try {
      const { splitMethod, customAmounts, percentages } = req.body;
      const result = await storage.calculateBillSplit(req.params.billId, splitMethod, customAmounts, percentages);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to calculate bill split", error });
    }
  });

  app.post("/api/chillbill/bills/:billId/split/equal", async (req, res) => {
    try {
      const result = await storage.calculateBillSplit(req.params.billId, 'equal');
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to calculate equal split", error });
    }
  });

  // Payment Management
  app.post("/api/chillbill/bills/:billId/request-payments", async (req, res) => {
    try {
      const result = await storage.requestPaymentsForBill(req.params.billId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to request payments", error });
    }
  });

  app.post("/api/chillbill/bills/:billId/participants/:participantId/request-payment", async (req, res) => {
    try {
      const result = await storage.requestPaymentForParticipant(req.params.billId, req.params.participantId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to request payment", error });
    }
  });

  app.put("/api/chillbill/bills/:billId/participants/:participantId/mark-as-paid", async (req, res) => {
    try {
      const participant = await storage.markParticipantAsPaid(req.params.participantId);
      if (!participant) {
        return res.status(404).json({ message: "Participant not found" });
      }
      res.json(participant);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark participant as paid", error });
    }
  });

  // Payment webhook (mock)
  app.post("/api/chillbill/webhook/payment-callback", async (req, res) => {
    try {
      const { paymentId, status, participantId } = req.body;
      
      if (status === 'completed') {
        await storage.markParticipantAsPaid(participantId);
      }
      
      res.json({ message: "Payment status updated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to process payment callback", error });
    }
  });

  // Mark participant as paid (mock payment)
  app.post("/api/chillbill/participants/:participantId/mark-paid", async (req, res) => {
    try {
      const { participantId } = req.params;
      const { paymentMethod = 'mock' } = req.body;
      
      const participant = await storage.markParticipantAsPaid(participantId, paymentMethod);
      
      if (!participant) {
        return res.status(404).json({ message: "Participant not found" });
      }

      res.json({
        message: "Payment recorded successfully",
        participant,
        transactionId: participant.transactionId
      });
    } catch (error) {
      console.error("Error marking participant as paid:", error);
      res.status(500).json({ message: "Failed to record payment" });
    }
  });

  // Get payment status for a bill
  app.get("/api/chillbill/bills/:billId/payment-status", async (req, res) => {
    try {
      const { billId } = req.params;
      const participants = await storage.getParticipantsByBillId(billId);
      
      const paidParticipants = participants.filter(p => p.paymentStatus === 'paid');
      const totalAmount = participants.reduce((sum, p) => sum + parseFloat(p.amountToPay || '0'), 0);
      const paidAmount = paidParticipants.reduce((sum, p) => sum + parseFloat(p.amountToPay || '0'), 0);
      const paidPercentage = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

      res.json({
        totalParticipants: participants.length,
        paidParticipants: paidParticipants.length,
        pendingParticipants: participants.length - paidParticipants.length,
        totalAmount,
        paidAmount,
        remainingAmount: totalAmount - paidAmount,
        paidPercentage,
        participants: participants.map(p => ({
          id: p.id,
          name: p.name,
          amountToPay: p.amountToPay,
          paymentStatus: p.paymentStatus,
          paidAt: p.paidAt,
          paymentMethod: p.paymentMethod,
          transactionId: p.transactionId
        }))
      });
    } catch (error) {
      console.error("Error getting payment status:", error);
      res.status(500).json({ message: "Failed to get payment status" });
    }
  });

  // QR Code generation
  app.get("/api/chillbill/bills/:billId/qr-code", async (req, res) => {
    try {
      const billId = req.params.billId;
      const bill = await storage.getBillById(billId);
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }

      // Generate share URL for participants to join the bill
      const baseUrl = process.env.REPLIT_DEV_DOMAIN ? 
        `https://${process.env.REPLIT_DEV_DOMAIN}` : 
        process.env.REPLIT_DOMAINS?.split(',')[0] || 
        `http://localhost:5000`;
      
      const shareUrl = `${baseUrl}/participant-selection/${billId}`;

      // Generate QR code with enhanced styling
      const qrCodeDataUrl = await QRCode.toDataURL(shareUrl, {
        width: 300,
        margin: 3,
        color: {
          dark: '#1F2937', // Dark gray for better scanning
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      res.json({ 
        qrCodeUrl: qrCodeDataUrl, 
        shareUrl: shareUrl,
        billId: billId,
        billName: bill.merchantName,
        totalAmount: bill.totalAmount
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate QR code", error });
    }
  });

  // Status and Notifications
  app.get("/api/chillbill/bills/:billId/status", async (req, res) => {
    try {
      const bill = await storage.getBillById(req.params.billId);
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }
      res.json({ status: bill.status });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bill status", error });
    }
  });

  app.post("/api/chillbill/bills/:billId/send-reminders", async (req, res) => {
    try {
      const result = await storage.sendReminders(req.params.billId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to send reminders", error });
    }
  });

  // Image Processing Endpoints
  app.post("/api/chillbill/bills/:billId/bill-image", async (req, res) => {
    try {
      // Mock AI service for bill processing with random data
      const restaurants = ["Olive Garden", "McDonald's", "Pizza Hut", "Subway", "KFC", "Starbucks", "Burger King", "Taco Bell", "Chipotle", "Panera Bread"];
      const randomAmount = (Math.random() * 180 + 20).toFixed(2); // Random amount between $20-$200
      const randomRestaurant = restaurants[Math.floor(Math.random() * restaurants.length)];
      
      const mockBillData = {
        totalAmount: parseFloat(randomAmount),
        merchantName: randomRestaurant,
        billDate: new Date().toISOString(),
        items: generateRandomItems(parseFloat(randomAmount))
      };

      // Update bill with extracted data
      await storage.updateBill(req.params.billId, {
        totalAmount: mockBillData.totalAmount.toString(),
        merchantName: mockBillData.merchantName,
        aiProcessed: true,
        billImagePath: `/uploads/bill-${req.params.billId}.jpg`
      });

      res.json({ 
        message: "Bill image processed successfully",
        extractedData: mockBillData,
        processed: true
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to process bill image", error });
    }
  });

  app.post("/api/chillbill/bills/:billId/group-image", async (req, res) => {
    try {
      // Mock AI service for face recognition with random participants
      const firstNames = ["Alice", "Bob", "Carol", "David", "Emma", "Frank", "Grace", "Henry", "Ivy", "Jack", "Kate", "Liam"];
      const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];
      
      const participantCount = Math.floor(Math.random() * 10) + 3; // Random between 3-12 people
      const mockParticipants = [];
      
      for (let i = 0; i < participantCount; i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        mockParticipants.push({
          name: `${firstName} ${lastName}`,
          confidence: (Math.random() * 0.2 + 0.8).toFixed(2), // Random confidence 0.8-1.0
          faceId: `face_${String(i + 1).padStart(3, '0')}`
        });
      }

      // Add participants to bill
      for (const participant of mockParticipants) {
        await storage.createParticipant({
          billId: req.params.billId,
          name: participant.name,
          aiFaceId: participant.faceId,
          paymentStatus: 'pending'
        });
      }

      // Update bill
      await storage.updateBill(req.params.billId, {
        groupImagePath: `/uploads/group-${req.params.billId}.jpg`
      });

      res.json({
        message: "Group image processed successfully",
        participants: mockParticipants,
        processed: true
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to process group image", error });
    }
  });

  app.get("/api/chillbill/bills/:billId/processing-status", async (req, res) => {
    try {
      const bill = await storage.getBillById(req.params.billId);
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }

      res.json({
        billProcessed: bill.aiProcessed || false,
        groupProcessed: !!bill.groupImagePath,
        status: bill.aiProcessed ? 'completed' : 'processing'
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get processing status", error });
    }
  });

  // AI Callback endpoints (internal)
  app.post("/api/chillbill/internal/bills/:billId/bill-result", async (req, res) => {
    try {
      const { totalAmount, merchantName, billDate, items } = req.body;
      
      await storage.updateBill(req.params.billId, {
        totalAmount: totalAmount.toString(),
        merchantName,
        billDate: new Date(billDate),
        aiProcessed: true
      });

      res.json({ message: "Bill data updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update bill data", error });
    }
  });

  app.post("/api/chillbill/internal/bills/:billId/group-result", async (req, res) => {
    try {
      const { participants } = req.body;
      
      for (const participant of participants) {
        await storage.createParticipant({
          billId: req.params.billId,
          name: participant.name,
          aiFaceId: participant.faceId,
          paymentStatus: 'pending'
        });
      }

      res.json({ message: "Participants added successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to add participants", error });
    }
  });

  // Mock payment processing
  app.post("/api/chillbill/process-payment", async (req, res) => {
    try {
      const { participantId, paymentMethod, amount } = req.body;
      
      // Simulate payment processing delay
      setTimeout(async () => {
        await storage.markParticipantAsPaid(participantId);
      }, 2000);

      res.json({ 
        success: true, 
        transactionId: `TXN${Date.now()}`,
        amount,
        paymentMethod 
      });
    } catch (error) {
      res.status(500).json({ message: "Payment processing failed", error });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
