import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { ArrowLeft, Plus, Trash2, Users, Crown, AlertTriangle, CheckCircle, Calculator, Target, RotateCcw, UserPlus, Zap } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertParticipantSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { formatCurrency } from "@/lib/utils";

const participantFormSchema = z.object({
  participants: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    phone: z.string().min(1, "Phone is required"),
    amountToPay: z.string().min(1, "Amount is required")
  }))
});

type ParticipantForm = z.infer<typeof participantFormSchema>;

export default function ManualParticipants() {
  const params = useParams();
  const billId = params.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Track which participants have been manually edited
  const [manuallyEditedParticipants, setManuallyEditedParticipants] = useState<Set<number>>(new Set());

  // Query for existing participants
  const participantsQuery = useQuery({
    queryKey: ['/api/chillbill/bills', billId, 'participants'],
    queryFn: () => apiRequest('GET', `/api/chillbill/bills/${billId}/participants`),
    enabled: !!billId,
  });

  const billQuery = useQuery({
    queryKey: ['/api/chillbill/bills', billId],
    queryFn: () => apiRequest('GET', `/api/chillbill/bills/${billId}`),
    enabled: !!billId,
  });

  const form = useForm<ParticipantForm>({
    resolver: zodResolver(participantFormSchema),
    defaultValues: {
      participants: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "participants"
  });

  // Load existing participants on mount
  useEffect(() => {
    if (participantsQuery.data && participantsQuery.data.length > 0) {
      const participantData = participantsQuery.data.map((p: any) => ({
        name: p.name,
        phone: p.phone,
        amountToPay: Math.round(parseFloat(p.amountToPay)).toString()
      }));
      form.reset({ participants: participantData });
      setManuallyEditedParticipants(new Set());
    }
  }, [participantsQuery.data, form]);

  // Calculate totals and validation
  const currentParticipants = form.watch('participants') || [];
  const billTotal = parseFloat(billQuery.data?.totalAmount || '0');
  const billTotalVND = Math.round(billTotal);
  
  const totalAssignedVND = currentParticipants.reduce((sum, p) => {
    const amountVND = parseInt(p.amountToPay) || 0;
    return sum + amountVND;
  }, 0);
  
  const remaining = billTotalVND - totalAssignedVND;
  const isBalanced = remaining === 0;

  // Auto-split logic
  const autoSplitAmounts = () => {
    const participantCount = currentParticipants.length;
    
    if (participantCount === 0 || billTotal === 0) {
      toast({
        title: "Cannot Split",
        description: "Need participants and a valid bill total to split amounts.",
        variant: "destructive",
      });
      return;
    }
    
    const baseAmountVND = Math.floor(billTotalVND / participantCount);
    const remainderVND = billTotalVND - (baseAmountVND * participantCount);
    
    const updatedParticipants = currentParticipants.map((participant, index) => ({
      ...participant,
      amountToPay: (index === 0 ? baseAmountVND + remainderVND : baseAmountVND).toString()
    }));
    
    form.setValue('participants', updatedParticipants);
    setManuallyEditedParticipants(new Set());
    
    toast({
      title: "Split Equally",
      description: `${formatCurrency(billTotal)} divided among ${participantCount} people.`,
    });
  };

  // Redistribute remaining amount
  const redistributeRemaining = () => {
    const participantCount = currentParticipants.length;
    
    if (participantCount === 0) {
      toast({
        title: "No Participants",
        description: "Add participants before redistributing amounts.",
        variant: "destructive",
      });
      return;
    }

    if (remaining === 0) {
      toast({
        title: "Already Balanced",
        description: "The bill is already properly split.",
      });
      return;
    }

    const unEditedIndices = [];
    for (let i = 0; i < participantCount; i++) {
      if (!manuallyEditedParticipants.has(i)) {
        unEditedIndices.push(i);
      }
    }

    if (unEditedIndices.length === 0) {
      toast({
        title: "All Amounts Manually Set",
        description: "All participants have manually edited amounts. Use 'Equal Split' to reset and redistribute.",
        variant: "destructive",
      });
      return;
    }
    
    const adjustmentPerPersonVND = Math.floor(remaining / unEditedIndices.length);
    const redistributionRemainderVND = remaining - (adjustmentPerPersonVND * unEditedIndices.length);
    
    const updatedParticipants = currentParticipants.map((participant, index) => {
      if (unEditedIndices.includes(index)) {
        const currentAmountVND = parseInt(participant.amountToPay) || 0;
        const adjustmentVND = index === unEditedIndices[0] ? adjustmentPerPersonVND + redistributionRemainderVND : adjustmentPerPersonVND;
        const newAmountVND = currentAmountVND + adjustmentVND;
        
        return {
          ...participant,
          amountToPay: Math.max(0, newAmountVND).toString()
        };
      }
      
      return participant;
    });
    
    form.setValue('participants', updatedParticipants);
    
    toast({
      title: "Amounts Redistributed",
      description: `${formatCurrency(Math.abs(remaining))} redistributed among ${unEditedIndices.length} unedited participants.`,
    });
  };

  // Reset all amounts
  const resetAllAmounts = () => {
    const updatedParticipants = currentParticipants.map((participant) => ({
      ...participant,
      amountToPay: '0'
    }));
    
    form.setValue('participants', updatedParticipants);
    setManuallyEditedParticipants(new Set());
    
    toast({
      title: "Amounts Reset",
      description: "All amounts have been reset to zero.",
    });
  };

  // Track manual edits
  const handleAmountChange = (index: number, newValue: string) => {
    setManuallyEditedParticipants(prev => new Set(prev).add(index));
    
    if (validateAmount(newValue)) {
      form.setValue(`participants.${index}.amountToPay`, newValue);
    }
  };

  const validateAmount = (newAmount: string) => {
    const amountVND = parseInt(newAmount) || 0;
    
    if (amountVND > billTotalVND) {
      toast({
        title: "Amount Too Large",
        description: `Individual amount cannot exceed the total bill amount of ${formatCurrency(billTotalVND)}.`,
        variant: "destructive",
      });
      return false;
    }
    
    if (amountVND < 0) {
      toast({
        title: "Invalid Amount",
        description: "Amount cannot be negative.",
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  const createParticipantsMutation = useMutation({
    mutationFn: async (data: ParticipantForm) => {
      for (let i = 0; i < data.participants.length; i++) {
        const participant = data.participants[i];
        const participantData = {
          billId,
          name: participant.name,
          phone: participant.phone,
          amountToPay: parseInt(participant.amountToPay).toString(),
          paymentStatus: i === 0 ? 'paid' : 'pending'
        };

        if (participantsQuery.data && participantsQuery.data[i]) {
          await apiRequest('PUT', `/api/chillbill/bills/${billId}/participants/${participantsQuery.data[i].id}`, participantData);
        } else {
          await apiRequest('POST', `/api/chillbill/bills/${billId}/participants`, participantData);
        }
      }

      if (participantsQuery.data && participantsQuery.data.length > data.participants.length) {
        for (let i = data.participants.length; i < participantsQuery.data.length; i++) {
          await apiRequest('DELETE', `/api/chillbill/bills/${billId}/participants/${participantsQuery.data[i].id}`);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chillbill/bills', billId, 'participants'] });
      toast({
        title: "Participants Updated",
        description: "All participants have been saved successfully.",
      });
      setLocation(`/bill/${billId}`);
    },
    onError: (error) => {
      console.error('Failed to update participants:', error);
      toast({
        title: "Error",
        description: "Failed to update participants. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: ParticipantForm) => {
    if (!isBalanced) {
      toast({
        title: "Amounts Not Balanced",
        description: `Please balance the amounts. ${remaining > 0 ? 'Missing' : 'Excess'}: ${formatCurrency(Math.abs(remaining))}`,
        variant: "destructive",
      });
      return;
    }
    
    createParticipantsMutation.mutate(data);
  };

  if (billQuery.isLoading) {
    return (
      <div className="mobile-container">
        <div className="mobile-content">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading bill details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!billQuery.data) {
    return (
      <div className="mobile-container">
        <div className="mobile-content">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Bill Not Found</h3>
            <p className="text-gray-600 mb-4">The bill you're looking for doesn't exist.</p>
            <Button onClick={() => setLocation('/')} className="bg-primary text-white">
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const unEditedCount = currentParticipants.length - manuallyEditedParticipants.size;
  const canRedistribute = unEditedCount > 0 && !isBalanced;

  return (
    <div className="mobile-container">
      {/* Minimal Header */}
      <header className="mobile-header">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/')}
              className="rounded-full w-8 h-8 hover:bg-primary/10"
            >
              <ArrowLeft className="h-4 w-4 text-primary" />
            </Button>
            <img 
              src="https://cake.vn/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FCake-logo-01.e915daf7.webp&w=256&q=75"
              alt="Cake Logo"
              className="w-8 h-8 rounded-lg object-contain"
            />
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Split Bill</h1>
          </div>
        </div>
      </header>

      <div className="px-4 py-3 space-y-4">
        {/* Compact Bill Summary */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">{billQuery.data.merchantName}</h3>
              <p className="text-sm text-gray-500">{new Date(billQuery.data.billDate).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-primary">{formatCurrency(billTotalVND)}</p>
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                isBalanced ? 'bg-green-100 text-green-700' : 
                remaining > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
              }`}>
                {isBalanced ? (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    Balanced
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3" />
                    {remaining > 0 ? '+' : ''}{formatCurrency(remaining)}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Compact Action Bar */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={autoSplitAmounts}
            disabled={fields.length === 0}
            className="flex-1 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 rounded-xl py-2"
          >
            <Target className="w-4 h-4 mr-1" />
            Equal
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={redistributeRemaining}
            disabled={!canRedistribute}
            className="flex-1 bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 rounded-xl py-2 disabled:opacity-50"
          >
            <Calculator className="w-4 h-4 mr-1" />
            Redistribute
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={resetAllAmounts}
            disabled={fields.length === 0}
            className="bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl px-3 py-2"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => append({ name: '', phone: '', amountToPay: '0' })}
            className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 rounded-xl px-3 py-2"
          >
            <UserPlus className="w-4 h-4" />
          </Button>
        </div>

        {/* Smart Insight */}
        {unEditedCount > 0 && !isBalanced && (
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-xs text-blue-700">
              💡 <strong>{unEditedCount} participants</strong> can auto-adjust to balance
            </p>
          </div>
        )}

        {/* Participants Form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-0">
            {fields.map((field, index) => {
              const isOwner = index === 0;
              const isManuallyEdited = manuallyEditedParticipants.has(index);
              
              return (
                <div key={field.id} className="relative">
                  
                  {/* Remove Button */}
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        remove(index);
                        const newEditedSet = new Set(manuallyEditedParticipants);
                        newEditedSet.delete(index);
                        const shiftedSet = new Set<number>();
                        newEditedSet.forEach(editedIndex => {
                          if (editedIndex < index) {
                            shiftedSet.add(editedIndex);
                          } else if (editedIndex > index) {
                            shiftedSet.add(editedIndex - 1);
                          }
                        });
                        setManuallyEditedParticipants(shiftedSet);
                      }}
                      className="absolute top-1 right-1 text-red-500 hover:text-red-700 w-6 h-6 p-0 hover:bg-red-100 rounded-full z-10"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                  
                  {/* Participant Content */}
                  <div className="py-3 px-1">
                    {/* Status Indicators */}
                    <div className="flex items-center gap-2 mb-2">
                      {isOwner && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                          <Crown className="w-3 h-3" />
                          Owner
                        </div>
                      )}
                      {isManuallyEdited && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          <Zap className="w-3 h-3" />
                          Custom
                        </div>
                      )}
                    </div>

                    {/* Clean Layout: Name || Phone || Amount */}
                    <div className="flex items-center justify-between gap-4">
                      {/* Left Side: Name and Phone Stacked */}
                      <div className="flex-1">
                        {/* Name - Bold on top */}
                        <Input
                          {...form.register(`participants.${index}.name`)}
                          placeholder="Full name"
                          className="h-8 text-sm font-bold bg-transparent border-0 border-b border-gray-200 rounded-none focus:border-primary focus:ring-0 px-0 mb-1"
                        />
                        
                        {/* Phone - Smaller gray text below */}
                        <Input
                          {...form.register(`participants.${index}.phone`)}
                          placeholder="+84 xxx xxx xxx"
                          className="h-6 text-xs text-gray-500 bg-transparent border-0 border-b border-gray-100 rounded-none focus:border-primary focus:ring-0 px-0"
                        />
                      </div>

                      {/* Right Side: Amount Field (Wider) */}
                      <div className="w-32">
                        <FormattedNumberInput
                          value={form.watch(`participants.${index}.amountToPay`) || ''}
                          onChange={(value) => handleAmountChange(index, value)}
                          placeholder="0"
                          className={`h-8 text-sm font-bold text-right bg-transparent border-0 border-b border-gray-200 rounded-none focus:border-primary focus:ring-0 px-0 ${
                            isOwner ? 'text-primary' : 'text-gray-900'
                          } ${isManuallyEdited ? 'border-blue-300 text-blue-700' : ''}`}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Properly aligned divider between participants */}
                  {index < fields.length - 1 && (
                    <div className="w-full h-px bg-gray-100 mx-0"></div>
                  )}
                </div>
              );
            })}

            {/* Empty State */}
            {fields.length === 0 && (
              <div className="text-center py-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">No Participants</h4>
                <p className="text-sm text-gray-600 mb-4">Add people to split this bill</p>
                <Button
                  type="button"
                  onClick={() => append({ name: '', phone: '', amountToPay: '0' })}
                  className="bg-primary text-white hover:bg-primary/90 rounded-xl"
                  size="sm"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add First Participant
                </Button>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <Button
              type="submit"
              className="w-full bg-primary text-white py-3 font-semibold hover:bg-primary/90 rounded-xl shadow-lg"
              disabled={createParticipantsMutation.isPending || !isBalanced || fields.length === 0}
            >
              {createParticipantsMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </div>
              ) : (
                'Continue to Bill Details'
              )}
            </Button>
            
            {/* Balance Status */}
            {!isBalanced && fields.length > 0 && (
              <div className={`mt-3 p-3 rounded-xl ${
                remaining > 0 ? 'bg-orange-50' : 'bg-red-50'
              }`}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 ${
                    remaining > 0 ? 'text-orange-600' : 'text-red-600'
                  }`} />
                  <div>
                    <p className={`text-sm font-semibold ${
                      remaining > 0 ? 'text-orange-800' : 'text-red-800'
                    }`}>
                      {remaining > 0 ? 'Under-allocated' : 'Over-allocated'} by {formatCurrency(Math.abs(remaining))}
                    </p>
                    <p className={`text-xs ${
                      remaining > 0 ? 'text-orange-700' : 'text-red-700'
                    }`}>
                      {canRedistribute ? 
                        `Use "Redistribute" to balance among ${unEditedCount} unedited participants.` :
                        'Use "Equal" to reset and redistribute evenly.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}