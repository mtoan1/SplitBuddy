import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ArrowLeft, Home, Search } from "lucide-react";
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
      <div className="max-w-md mx-auto bg-gradient-to-br from-white to-gray-50 min-h-screen">
        <div className="p-5 space-y-4">
          <Skeleton className="h-12 w-12 rounded-xl mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const totalAmount = parseFloat(bill?.totalAmount || '0');

  return (
    <div className="max-w-md mx-auto bg-gradient-to-br from-white to-gray-50 min-h-screen">
      <div className="p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation('/')}
            className="text-gray-600 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation('/')}
            className="text-gray-600 hover:text-primary"
          >
            <Home className="h-4 w-4" />
          </Button>
        </div>

        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-gradient-to-r from-primary to-primary/80 rounded-xl flex items-center justify-center mx-auto">
            <Users className="text-white h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold neon-text mb-1">Who are you?</h2>
            <p className="text-sm text-gray-500">Select your name to see your share</p>
          </div>
        </div>

        {/* Bill Summary */}
        <div className="mobile-card p-4">
          <div className="text-center space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Bill from</p>
            <h3 className="font-bold text-lg neon-text">{bill?.merchantName}</h3>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totalAmount)}
            </div>
          </div>
        </div>

        {/* Participant Selection */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Choose Your Name</h3>
          
          <div className="space-y-1.5">
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
        <div className="mobile-card p-4 space-y-4">
          <div className="text-center">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Search className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm text-gray-600">Don't see your name?</p>
          </div>
          <div className="space-y-3">
            <Input
              type="tel"
              placeholder="+1 (555) 000-0000"
              className="text-center border-primary/20 focus:border-primary"
            />
            <Button 
              className="w-full bg-primary text-white hover:bg-primary/90 py-3"
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
