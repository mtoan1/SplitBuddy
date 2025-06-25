import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Clock, CreditCard, Smartphone, Banknote, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

export default function PaymentFlow() {
  const { billId, participantId } = useParams<{ billId: string; participantId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');

  // Fetch participant details
  const participantQuery = useQuery({
    queryKey: ['/api/chillbill/participants', participantId],
    enabled: !!participantId,
  });

  // Fetch bill details
  const billQuery = useQuery({
    queryKey: ['/api/chillbill/bills', billId],
    enabled: !!billId,
  });

  const participant = participantQuery.data;
  const bill = billQuery.data;

  // Mock payment mutation
  const paymentMutation = useMutation({
    mutationFn: async (paymentMethod: string) => {
      return apiRequest('POST', `/api/chillbill/participants/${participantId}/mark-paid`, {
        paymentMethod
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

  const handlePayment = () => {
    if (!selectedPaymentMethod) {
      toast({
        title: "Select Payment Method",
        description: "Please choose how you'd like to pay.",
        variant: "destructive",
      });
      return;
    }
    paymentMutation.mutate(selectedPaymentMethod);
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

  const paymentMethods = [
    { id: 'credit_card', name: 'Credit Card', icon: CreditCard, description: 'Visa, Mastercard, Amex' },
    { id: 'mobile_wallet', name: 'Mobile Wallet', icon: Smartphone, description: 'Apple Pay, Google Pay' },
    { id: 'bank_transfer', name: 'Bank Transfer', icon: Banknote, description: 'Direct bank transfer' },
  ];

  return (
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
                  {formatCurrency(parseFloat(participant.amountToPay))}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Your share</p>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Bill</span>
                  <span className="font-medium">{bill.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Participant</span>
                  <span className="font-medium">{participant.name}</span>
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

          {/* Payment Methods */}
          <Card className="mobile-card">
            <CardHeader>
              <CardTitle>Choose Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedPaymentMethod === method.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => setSelectedPaymentMethod(method.id)}
                >
                  <div className="flex items-center space-x-3">
                    <method.icon className={`w-6 h-6 ${
                      selectedPaymentMethod === method.id ? 'text-primary' : 'text-gray-400'
                    }`} />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {method.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {method.description}
                      </p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedPaymentMethod === method.id
                        ? 'border-primary bg-primary'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {selectedPaymentMethod === method.id && (
                        <div className="w-full h-full rounded-full bg-white transform scale-50"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Payment Button */}
          <Card className="mobile-card">
            <CardContent className="p-4">
              <Button 
                onClick={handlePayment}
                disabled={!selectedPaymentMethod || paymentMutation.isPending}
                className="w-full bg-primary hover:bg-primary/90 text-white py-3"
                size="lg"
              >
                {paymentMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  `Pay ${formatCurrency(parseFloat(participant.amountToPay))}`
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
  );
}