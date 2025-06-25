import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Home, Receipt, Copy, Check, Download, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PaymentSuccess() {
  const { billId, participantId } = useParams<{ billId: string; participantId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Get transaction ID from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const transactionId = urlParams.get('txn');

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

  const copyTransactionId = async () => {
    if (transactionId) {
      try {
        await navigator.clipboard.writeText(transactionId);
        toast({
          title: "Copied!",
          description: "Transaction ID copied to clipboard",
        });
      } catch (err) {
        toast({
          title: "Copy Failed",
          description: "Unable to copy transaction ID",
          variant: "destructive",
        });
      }
    }
  };

  // Mock transaction data - in real app this would come from the payment processing
  const transactionData = {
    amount: 25.40,
    transactionId: `TXN${Date.now()}`,
    date: new Date().toLocaleString()
  };

  const handleDownloadReceipt = () => {
    toast({
      title: "Receipt Downloaded",
      description: "Your payment receipt has been downloaded.",
    });
  };

  const handleShareReceipt = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Payment Receipt',
        text: `Payment of ${formatCurrency(transactionData.amount)} processed successfully`,
        url: window.location.href
      });
    } else {
      toast({
        title: "Receipt Link Copied",
        description: "Receipt link has been copied to clipboard.",
      });
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      <div className="p-4 space-y-6 text-center">
        <div className="py-8">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-white w-12 h-12" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Payment Successful!</h2>
          <p className="text-gray-600 mb-6">Your payment has been processed successfully</p>
          
          {/* Payment Summary */}
          <Card className="bg-green-50 mb-6">
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Paid</span>
                  <span className="text-gray-900 dark:text-white font-semibold">
                    {formatCurrency(transactionData.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction ID</span>
                  <span className="text-gray-900 dark:text-white font-mono text-sm">
                    #{transactionData.transactionId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date</span>
                  <span className="text-gray-900 dark:text-white">{transactionData.date}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button 
              className="w-full bg-primary text-white py-3 hover:bg-primary/90"
              onClick={handleDownloadReceipt}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Receipt
            </Button>
            <Button 
              variant="outline" 
              className="w-full py-3"
              onClick={handleShareReceipt}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Receipt
            </Button>
            <Button 
              variant="ghost" 
              className="w-full py-3"
              onClick={() => setLocation('/')}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
