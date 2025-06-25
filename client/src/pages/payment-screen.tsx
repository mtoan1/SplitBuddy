import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, ArrowLeft, Lock } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PaymentScreen() {
  const { billId, participantId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: bill, isLoading: billLoading } = useQuery({
    queryKey: ['/api/chillbill/bills', billId],
    queryFn: async () => {
      const response = await fetch(`/api/chillbill/bills/${billId}`);
      if (!response.ok) throw new Error('Failed to fetch bill');
      return response.json();
    }
  });

  const { data: participant, isLoading: participantLoading } = useQuery({
    queryKey: ['/api/chillbill/bills', billId, 'participants', participantId],
    queryFn: async () => {
      const response = await fetch(`/api/chillbill/bills/${billId}/participants`);
      if (!response.ok) throw new Error('Failed to fetch participants');
      const participants = await response.json();
      return participants.find((p: any) => p.id === participantId);
    }
  });

  const processPaymentMutation = useMutation({
    mutationFn: (paymentMethod: string) => 
      apiRequest('POST', '/api/chillbill/process-payment', {
        participantId,
        paymentMethod,
        amount: participant?.amountToPay || '0'
      }),
    onSuccess: () => {
      toast({
        title: "Payment Processing",
        description: "Your payment is being processed...",
      });
      setTimeout(() => {
        setLocation(`/bill/${billId}/success`);
      }, 2000);
    },
    onError: () => {
      toast({
        title: "Payment Failed",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    }
  });

  if (billLoading || participantLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <div className="p-4 space-y-6">
          <Skeleton className="h-16 w-16 rounded-full mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen p-4">
        <div className="text-center">
          <p className="text-red-500">Participant not found</p>
          <Button onClick={() => setLocation(`/bill/${billId}`)} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const amount = parseFloat(participant.amountToPay || '0');
  const totalAmount = parseFloat(bill?.totalAmount || '0');

  const paymentMethods = [
    {
      id: 'card',
      name: 'Credit/Debit Card',
      description: 'Pay with your card',
      icon: 'fas fa-credit-card',
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      id: 'paypal',
      name: 'PayPal',
      description: 'Pay with PayPal balance',
      icon: 'fab fa-paypal',
      bgColor: 'bg-blue-600',
      iconColor: 'text-white'
    },
    {
      id: 'venmo',
      name: 'Venmo',
      description: 'Pay with Venmo',
      icon: 'fas fa-mobile-alt',
      bgColor: 'bg-blue-400',
      iconColor: 'text-white'
    }
  ];

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/bill/${billId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="text-white text-xl" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Your Share</h2>
          <p className="text-gray-600">Complete your payment to settle up</p>
        </div>

        {/* Amount Card */}
        <div className="bg-gradient-to-br from-primary to-accent rounded-xl p-6 text-center text-white">
          <p className="text-sm opacity-80 mb-2">You owe</p>
          <p className="text-4xl font-bold mb-2">{formatCurrency(amount)}</p>
          <p className="text-sm opacity-80">{participant.name}</p>
        </div>

        {/* Bill Details */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-text-primary mb-3">Bill Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Restaurant</span>
                <span className="text-text-primary font-medium">{bill?.merchantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date</span>
                <span className="text-text-primary font-medium">{formatDate(bill?.billDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Bill</span>
                <span className="text-text-primary font-medium">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <span className="text-gray-600">Your Share</span>
                <span className="text-text-primary font-semibold">{formatCurrency(amount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <div className="space-y-4">
          <h3 className="font-semibold text-text-primary">Choose Payment Method</h3>
          
          {paymentMethods.map((method) => (
            <Button
              key={method.id}
              variant="outline"
              className="w-full p-4 h-auto justify-start hover:border-primary hover:bg-primary/5"
              onClick={() => processPaymentMutation.mutate(method.id)}
              disabled={processPaymentMutation.isPending}
            >
              <div className={`w-10 h-10 ${method.bgColor} rounded-lg flex items-center justify-center mr-3`}>
                <i className={`${method.icon} ${method.iconColor}`}></i>
              </div>
              <div className="text-left flex-1">
                <p className="font-medium text-text-primary">{method.name}</p>
                <p className="text-sm text-gray-500">{method.description}</p>
              </div>
            </Button>
          ))}
        </div>

        {/* Pay Now Button */}
        <Button 
          className="w-full bg-success text-white py-4 text-lg hover:bg-success/90"
          onClick={() => processPaymentMutation.mutate('card')}
          disabled={processPaymentMutation.isPending}
        >
          <Lock className="w-4 h-4 mr-2" />
          Pay {formatCurrency(amount)} Now
        </Button>
      </div>
    </div>
  );
}
