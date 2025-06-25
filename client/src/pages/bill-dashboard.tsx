import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Bell, Receipt, User, Users, Home, ArrowLeft } from "lucide-react";
import QRCodeDisplay from "@/components/qr-code-display";
import ParticipantCard from "@/components/participant-card";
import { formatCurrency, formatDate, calculatePaidPercentage, calculateTotalPaid } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Get the actual bill ID from the database
const DEMO_BILL_ID = "6f02356a-1b22-4816-819e-1ace154d169f";

export default function BillDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Initialize demo data
  useEffect(() => {
    const initializeDemoData = async () => {
      try {
        // Check if demo participants exist, if not create them
        const participantsResponse = await fetch(`/api/chillbill/bills/${DEMO_BILL_ID}/participants`);
        
        if (participantsResponse.ok) {
          const existingParticipants = await participantsResponse.json();
          
          if (existingParticipants.length === 0) {
            // Add demo participants
            const participants = [
              { name: 'Alice Smith', phone: '+1 (555) 123-4567', amountToPay: '31.13', paymentStatus: 'paid' },
              { name: 'Bob Johnson', phone: '+1 (555) 987-6543', amountToPay: '43.57', paymentStatus: 'paid' },
              { name: 'Carol Williams', phone: '+1 (555) 456-7890', amountToPay: '25.40', paymentStatus: 'pending' },
              { name: 'David Miller', phone: '+1 (555) 321-0987', amountToPay: '24.40', paymentStatus: 'overdue' },
            ];

            for (const participant of participants) {
              await apiRequest('POST', `/api/chillbill/bills/${DEMO_BILL_ID}/participants`, {
                ...participant
              });
            }
          }
        }
      } catch (error) {
        console.error('Failed to initialize demo data:', error);
      }
    };

    initializeDemoData();
  }, []);

  const { data: bill, isLoading: billLoading } = useQuery({
    queryKey: ['/api/chillbill/bills', DEMO_BILL_ID],
    queryFn: async () => {
      const response = await fetch(`/api/chillbill/bills/${DEMO_BILL_ID}`);
      if (!response.ok) throw new Error('Failed to fetch bill');
      return response.json();
    }
  });

  const { data: participants = [], isLoading: participantsLoading } = useQuery({
    queryKey: ['/api/chillbill/bills', DEMO_BILL_ID, 'participants'],
    queryFn: async () => {
      const response = await fetch(`/api/chillbill/bills/${DEMO_BILL_ID}/participants`);
      if (!response.ok) throw new Error('Failed to fetch participants');
      return response.json();
    }
  });

  const sendRemindersMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/chillbill/bills/${DEMO_BILL_ID}/send-reminders`, {}),
    onSuccess: () => {
      toast({
        title: "Reminders Sent",
        description: "Payment reminders have been sent to unpaid participants.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send reminders. Please try again.",
        variant: "destructive",
      });
    }
  });

  if (billLoading || participantsLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <header className="bg-white shadow-sm border-b border-gray-100">
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Receipt className="text-white text-sm" />
              </div>
              <h1 className="text-xl font-semibold text-text-primary">ChillBill</h1>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-4 w-4" />
            </Button>
          </div>
        </header>
        
        <div className="p-4 space-y-6">
          <Card>
            <CardContent className="p-4">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-8 w-20 mb-4" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const totalAmount = parseFloat(bill?.totalAmount || '0');
  const paidPercentage = calculatePaidPercentage(participants);
  const totalPaid = calculateTotalPaid(participants);

  return (
    <div className="mobile-container">
      {/* Header */}
      <header className="mobile-header">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/')}
              className="rounded-full w-10 h-10 hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
            >
              <Home className="h-5 w-5 text-primary" />
            </Button>
            <img 
              src="https://cake.vn/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FCake-logo-01.e915daf7.webp&w=256&q=75"
              alt="Cake Logo"
              className="w-10 h-10 rounded-xl object-contain"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Bill Dashboard</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Demo Bill</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full w-10 h-10 hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
          >
            <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </Button>
        </div>
      </header>

      <div className="mobile-content">
        {/* Bill Info Card */}
        <Card className="mobile-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">{bill?.merchantName}</h2>
                <p className="text-sm text-gray-500">{formatDate(bill?.billDate)}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-text-primary">{formatCurrency(totalAmount)}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Paid</span>
                <span className="text-text-primary font-medium">
                  {paidPercentage}% ({formatCurrency(totalPaid)})
                </span>
              </div>
              <Progress value={paidPercentage} className="h-2" />
            </div>

            {/* QR Code Section */}
            <QRCodeDisplay billId={DEMO_BILL_ID} />
          </CardContent>
        </Card>

        {/* Participants List */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-primary">Participants ({participants.length})</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-primary"
                onClick={() => setLocation(`/bill/${DEMO_BILL_ID}/add-participants`)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            
            <div className="space-y-3">
              {participants.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h4 className="font-medium text-text-primary mb-2">No participants yet</h4>
                  <p className="text-sm text-gray-600 mb-4">Add people to split this bill</p>
                  <Button 
                    className="bg-primary text-white hover:bg-primary/90"
                    onClick={() => setLocation(`/bill/${DEMO_BILL_ID}/add-participants`)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Participants
                  </Button>
                </div>
              ) : (
                participants.map((participant: any) => (
                  <ParticipantCard
                    key={participant.id}
                    participant={participant}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            className="w-full bg-primary text-white py-3 hover:bg-primary/90"
            onClick={() => setLocation('/create')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Bill
          </Button>
          <Button 
            variant="outline"
            className="w-full py-3"
            onClick={() => sendRemindersMutation.mutate()}
            disabled={sendRemindersMutation.isPending}
          >
            <Bell className="w-4 h-4 mr-2" />
            Send Reminders
          </Button>
          <Button variant="ghost" className="w-full py-3">
            <Receipt className="w-4 h-4 mr-2" />
            View Bill Details
          </Button>
        </div>
      </div>
    </div>
  );
}
