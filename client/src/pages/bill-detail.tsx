import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Bell, Receipt, Users, Share2, Copy, QrCode } from "lucide-react";
import QRCodeDisplay from "@/components/qr-code-display";
import ParticipantCard from "@/components/participant-card";
import { formatCurrency, formatDate, calculatePaidPercentage, calculateTotalPaid } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function BillDetail() {
  const params = useParams();
  const billId = params.id; // Router uses :id parameter
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: bill, isLoading: billLoading } = useQuery({
    queryKey: ['/api/chillbill/bills', billId],
    queryFn: () => apiRequest('GET', `/api/chillbill/bills/${billId}`),
    enabled: !!billId,
  });

  const { data: participants = [], isLoading: participantsLoading } = useQuery({
    queryKey: ['/api/chillbill/bills', billId, 'participants'],
    queryFn: () => apiRequest('GET', `/api/chillbill/bills/${billId}/participants`),
    enabled: !!billId,
  });

  const sendRemindersMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/chillbill/bills/${billId}/send-reminders`, {}),
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

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/bill/${billId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `ChillBill - ${bill?.merchantName}`,
          text: `Split the bill for ${bill?.merchantName} (${formatCurrency(parseFloat(bill?.totalAmount || '0'))})`,
          url: shareUrl
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link Copied",
          description: "Bill sharing link copied to clipboard",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to copy link",
          variant: "destructive",
        });
      }
    }
  };

  if (!billId) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen p-4">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Bill</h2>
          <p className="text-gray-600 mb-4">No bill ID provided.</p>
          <Button onClick={() => setLocation('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  if (billLoading || participantsLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <div className="p-4 space-y-6">
          <Skeleton className="h-8 w-48" />
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

  if (!bill) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen p-4">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Bill Not Found</h2>
          <p className="text-gray-600 mb-4">The bill you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const totalAmount = parseFloat(bill?.totalAmount || '0');
  const paidPercentage = calculatePaidPercentage(participants);
  const totalPaid = calculateTotalPaid(participants);
  const shareUrl = `${window.location.origin}/bill/${billId}`;

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Receipt className="text-white text-sm" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-text-primary">{bill?.merchantName}</h1>
              <p className="text-xs text-gray-500">{formatDate(bill?.billDate)}</p>
            </div>
          </div>
          <Badge variant={bill?.status === 'completed' ? 'default' : 'secondary'} className="capitalize">
            {bill?.status}
          </Badge>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Bill Summary Card */}
        <Card>
          <CardContent className="p-4">
            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-text-primary">{formatCurrency(totalAmount)}</p>
              <p className="text-sm text-gray-600">Total Amount</p>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Payment Progress</span>
                <span className="text-text-primary font-medium">
                  {paidPercentage}% ({formatCurrency(totalPaid)})
                </span>
              </div>
              <Progress value={paidPercentage} className="h-2" />
            </div>

            {/* QR Code Section */}
            <QRCodeDisplay billId={billId || ''} />
          </CardContent>
        </Card>

        {/* Sharing Options */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-text-primary mb-3">Share with Friends</h3>
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Bill Link
              </Button>
              <div className="flex items-center space-x-2">
                <div className="flex-1 p-2 bg-gray-100 rounded text-sm text-gray-600 truncate">
                  {shareUrl}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(shareUrl)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
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
                onClick={() => setLocation(`/bill/${billId}/add-participants`)}
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
                    onClick={() => setLocation(`/bill/${billId}/add-participants`)}
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
            variant="outline"
            className="w-full py-3"
            onClick={() => sendRemindersMutation.mutate()}
            disabled={sendRemindersMutation.isPending || participants.length === 0}
          >
            <Bell className="w-4 h-4 mr-2" />
            Send Payment Reminders
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
  );
}