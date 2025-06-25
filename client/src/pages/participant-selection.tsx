import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ArrowLeft } from "lucide-react";
import ParticipantCard from "@/components/participant-card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ParticipantSelection() {
  const params = useParams();
  const billId = params.id; // Router uses :id parameter
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: bill, isLoading: billLoading } = useQuery({
    queryKey: ['/api/chillbill/bills', billId],
    queryFn: () => apiRequest('GET', `/api/chillbill/bills/${billId}`),
    enabled: !!billId,
  });

  const { data: unpaidParticipants = [], isLoading: participantsLoading } = useQuery({
    queryKey: ['/api/chillbill/bills', billId, 'participants', 'unpaid'],
    queryFn: () => apiRequest('GET', `/api/chillbill/bills/${billId}/participants/unpaid`),
    enabled: !!billId,
  });

  const handleSelectParticipant = (participantId: string) => {
    setLocation(`/payment/${billId}/${participantId}`);
  };

  const handlePhoneSearch = () => {
    // For demo purposes, redirect to first unpaid participant
    if (unpaidParticipants.length > 0) {
      setLocation(`/payment/${billId}/${unpaidParticipants[0].id}`);
    }
  };

  if (billLoading || participantsLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <div className="p-4 space-y-6">
          <Skeleton className="h-16 w-16 rounded-full mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const totalAmount = parseFloat(bill?.totalAmount || '0');

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="text-white text-xl" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Who are you?</h2>
          <p className="text-gray-600">Select your name from the list below to see your share</p>
        </div>

        {/* Bill Summary */}
        <Card className="bg-primary/10">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Bill from</p>
              <h3 className="font-semibold text-text-primary mb-2">{bill?.merchantName}</h3>
              <p className="text-lg font-bold text-text-primary">
                Total: {formatCurrency(totalAmount)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Participant Selection */}
        <div className="space-y-3">
          <h3 className="font-semibold text-text-primary mb-3">Select yourself:</h3>
          
          <div className="space-y-3">
            {unpaidParticipants.map((participant: any) => (
              <ParticipantCard
                key={participant.id}
                participant={participant}
                onClick={() => handleSelectParticipant(participant.id)}
                selectable
              />
            ))}
          </div>
        </div>

        {/* Alternative Phone Entry */}
        <div className="border-t border-gray-200 pt-6">
          <div className="text-center mb-4">
            <p className="text-sm text-gray-600">Don't see your name? Enter your phone number</p>
          </div>
          <div className="space-y-3">
            <Input
              type="tel"
              placeholder="+1 (555) 000-0000"
              className="text-center"
            />
            <Button 
              className="w-full bg-accent text-white hover:bg-accent/90"
              onClick={handlePhoneSearch}
            >
              Find My Share
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
