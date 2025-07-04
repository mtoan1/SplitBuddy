import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Bell, Receipt, Users, QrCode, Home, ArrowLeft, Crown } from "lucide-react";
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

  const { data: paymentStatus } = useQuery({
    queryKey: ['/api/chillbill/bills', billId, 'payment-status'],
    queryFn: () => apiRequest('GET', `/api/chillbill/bills/${billId}/payment-status`),
    enabled: !!billId,
    refetchInterval: 5000, // Refresh every 5 seconds
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

  const sendIndividualReminderMutation = useMutation({
    mutationFn: (participantId: string) => 
      apiRequest('POST', `/api/chillbill/bills/${billId}/participants/${participantId}/send-reminder`, {}),
    onSuccess: (data, participantId) => {
      // Find the participant name from the participants array
      const participant = participants.find(p => p.id === participantId);
      const participantName = participant?.name || 'participant';
      
      toast({
        title: "Reminder Sent",
        description: `A payment reminder has been sent to ${participantName}.`,
      });
    },
    onError: (error) => {
      console.error('Individual reminder error:', error);
      toast({
        title: "Error",
        description: "Failed to send reminder. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handlePayClick = (participantId: string) => {
    setLocation(`/payment/${billId}/${participantId}`);
  };

  const handleRemindClick = (participantId: string, participantName: string) => {
    // Validate that both billId and participantId are valid before making the API call
    if (!billId || !participantId) {
      console.error('Invalid parameters for reminder:', { billId, participantId });
      toast({
        title: "Error",
        description: "Unable to send reminder. Invalid bill or participant information.",
        variant: "destructive",
      });
      return;
    }

    // Additional validation to ensure they are non-empty strings
    if (typeof billId !== 'string' || typeof participantId !== 'string' || 
        billId.trim() === '' || participantId.trim() === '') {
      console.error('Empty parameters for reminder:', { billId, participantId });
      toast({
        title: "Error",
        description: "Unable to send reminder. Missing bill or participant information.",
        variant: "destructive",
      });
      return;
    }

    console.log('Sending reminder to participant:', participantId, participantName);
    sendIndividualReminderMutation.mutate(participantId);
  };

  // Separate bill owner from other participants
  // Since we don't have a direct way to identify the owner, we'll use the first participant (index 0) as the owner
  // This matches the logic used when creating participants where the first one is marked as paid (owner)
  const billOwner = participants?.find(p => p.paymentStatus === 'paid') || participants?.[0];
  const otherParticipants = participants?.filter(p => p.id !== billOwner?.id)
    .sort((a, b) => a.name.localeCompare(b.name));

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
      <div className="mobile-container">
        <div className="mobile-content">
          <Skeleton className="h-8 w-48" />
          <div className="mobile-card">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-8 w-20 mb-4" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="mobile-container">
        <div className="mobile-content">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Bill Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">The bill you're looking for doesn't exist.</p>
            <Button onClick={() => setLocation('/')} className="mobile-button-primary">Go Home</Button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate totals and payment progress
  const totalAmount = paymentStatus?.totalAmount || participants.reduce((sum, p) => sum + parseFloat(p.amountToPay), 0);
  const paidPercentage = paymentStatus?.paidPercentage || calculatePaidPercentage(participants);
  const totalPaid = paymentStatus?.paidAmount || calculateTotalPaid(participants);
  const shareUrl = `${window.location.origin}/bill/${billId}`;

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
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Bill Details</h1>
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
        {/* Bill Summary Card */}
        <Card className="mobile-card">
          <CardContent className="p-4">
            {/* Bill Name and Total Amount on Same Line */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{bill?.merchantName}</h3>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">Payment Progress</span>
                <span className="text-primary font-medium">
                  {paidPercentage}% ({formatCurrency(totalPaid)})
                </span>
              </div>
              <Progress value={paidPercentage} className="h-2" />
            </div>

            {/* QR Code Section */}
            <QRCodeDisplay billId={billId || ''} />
          </CardContent>
        </Card>

        {/* Participants List */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Participants ({participants?.length || 0})</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-primary hover:bg-primary/10"
                onClick={() => setLocation(`/bill/${billId}/add-participants`)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            
            <div className="space-y-3">
              {(participants?.length || 0) === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">No participants yet</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Add people to split this bill</p>
                  <Button 
                    className="bg-primary text-white hover:bg-primary/90"
                    onClick={() => setLocation(`/bill/${billId}/add-participants`)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Participants
                  </Button>
                </div>
              ) : (
                <>
                  {/* Bill Owner Section */}
                  {billOwner && (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Bill Owner</span>
                      </div>
                      <ParticipantCard
                        key={billOwner.id}
                        participant={billOwner}
                        showRemindButton={false} // Owner doesn't need reminders
                        onRemindClick={handleRemindClick}
                      />
                      
                      {/* Divider */}
                      {otherParticipants && otherParticipants.length > 0 && (
                        <div className="my-4">
                          <Separator className="bg-gray-200 dark:bg-gray-700" />
                        </div>
                      )}
                    </>
                  )}

                  {/* Other Participants Section */}
                  {otherParticipants && otherParticipants.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Other Participants ({otherParticipants.length})
                        </span>
                      </div>
                      {otherParticipants.map((participant: any) => (
                        <ParticipantCard
                          key={participant.id}
                          participant={participant}
                          showRemindButton={true}
                          onRemindClick={handleRemindClick}
                        />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            className="w-full bg-primary text-white py-3 hover:bg-primary/90"
            onClick={() => sendRemindersMutation.mutate()}
            disabled={sendRemindersMutation.isPending || participants.length === 0}
          >
            <Bell className="w-4 h-4 mr-2" />
            {sendRemindersMutation.isPending ? 'Sending Reminders...' : 'Send Payment Reminders'}
          </Button>
          <Button 
            variant="outline" 
            className="w-full py-3 border-primary text-primary hover:bg-primary/10"
            onClick={() => setLocation('/create-bill')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Bill
          </Button>
        </div>
      </div>
    </div>
  );
}