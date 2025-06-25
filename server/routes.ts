import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertBillSchema, insertParticipantSchema } from "@shared/schema";
import QRCode from "qrcode";

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

  // QR Code generation
  app.get("/api/chillbill/bills/:billId/qr-code", async (req, res) => {
    try {
      const bill = await storage.getBillById(req.params.billId);
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }

      const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] || `http://localhost:5000`;
      const qrUrl = `${baseUrl}/bill/${req.params.billId}`;
      
      const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#2C3E50',
          light: '#FFFFFF'
        }
      });

      res.json({ qrCodeDataUrl, url: qrUrl });
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
