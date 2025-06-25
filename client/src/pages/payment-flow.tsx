import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle, Clock, CreditCard, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

export default function PaymentFlow() {
  const { billId, participantId } = useParams<{ billId: string; participantId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Fetch participant details
  const participantQuery = useQuery({
    queryKey: ['/api/chillbill/participants', participantId],
    queryFn: () => apiRequest('GET', `/api/chillbill/participants/${participantId}`),
    enabled: !!participantId,
  });

  // Fetch bill details
  const billQuery = useQuery({
    queryKey: ['/api/chillbill/bills', billId],
    queryFn: () => apiRequest('GET', `/api/chillbill/bills/${billId}`),
    enabled: !!billId,
  });

  const participant = participantQuery.data;
  const bill = billQuery.data;

  // Mock payment mutation
  const paymentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/chillbill/participants/${participantId}/mark-paid`, {
        paymentMethod: 'mock_payment'
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Successful!",
        description: `Your payment of ${formatCurrency(parseFloat(participant?.amountToPay || '0'))} has been recorded.`,
      });
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/chillbill/bills', billId] });
      queryClient.invalidateQueries({ queryKey: ['/api/chillbill/bills', billId, 'payment-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chillbill/bills', billId, 'participants'] });
      
      // Redirect to success page
      setLocation(`/payment-success/${billId}/${participantId}?txn=${data.transactionId}`);
    },
    onError: (error) => {
      toast({
        title: "Payment Failed",
        description: "Unable to process your payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePayClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmPayment = () => {
    setShowConfirmDialog(false);
    paymentMutation.mutate();
  };

  if (participantQuery.isLoading || billQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!participant || !bill) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-8">
            <p className="text-red-500 mb-4">Payment information not found</p>
            <Button onClick={() => setLocation('/')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (participant.paymentStatus === 'paid') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Already Paid</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You have already paid {formatCurrency(parseFloat(participant.amountToPay))} for this bill.
            </p>
            <Button onClick={() => setLocation(`/bill/${billId}`)} className="w-full">
              View Bill Details
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="mobile-container">
          <header className="mobile-header">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation(`/bill/${billId}`)}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Bill
            </Button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Payment</h1>
            <div className="w-16"></div>
          </header>

          <div className="mobile-content">
            {/* Payment Summary */}
            <Card className="mobile-card">
              <CardHeader>
                <CardTitle className="text-center">Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(parseFloat(participant?.amountToPay || '0'))}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Your share</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Bill</span>
                    <span className="font-medium">{bill?.name || 'Loading...'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Participant</span>
                    <span className="font-medium">{participant?.name || 'Loading...'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Status</span>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Button */}
            <Card className="mobile-card">
              <CardContent className="p-4">
                <Button 
                  onClick={handlePayClick}
                  disabled={paymentMutation.isPending || !participant}
                  className="w-full bg-primary hover:bg-primary/90 text-white py-3"
                  size="lg"
                >
                  {paymentMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay {formatCurrency(parseFloat(participant?.amountToPay || '0'))}
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                  This is a demo payment flow. No actual payment will be processed.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Payment Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to pay {formatCurrency(parseFloat(participant?.amountToPay || '0'))} for {bill?.name}?
              This is a demo payment and will mark your payment as completed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmPayment}
              className="bg-primary hover:bg-primary/90"
            >
              Yes, Pay Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}