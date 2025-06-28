import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { ArrowLeft, Plus, Trash2, Users, Crown, AlertTriangle, CheckCircle, Calculator, Shuffle, UserPlus, Phone, DollarSign } from "lucide-react";
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
      title: "Amounts Split Equally",
      description: `${formatCurrency(billTotal)} split equally among ${participantCount} participants.`,
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
      {/* Compact Header */}
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
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Review Participants</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-3 space-y-4">
        {/* Compact Bill Summary */}
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">{billQuery.data.merchantName}</h3>
              <p className="text-xs text-gray-500">{new Date(billQuery.data.billDate).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-primary">{formatCurrency(billTotalVND)}</p>
              <div className={`text-xs font-medium ${
                isBalanced ? 'text-green-600' : 
                remaining > 0 ? 'text-orange-600' : 'text-red-600'
              }`}>
                {isBalanced ? '✓ Balanced' : `${remaining > 0 ? '+' : ''}${formatCurrency(remaining)}`}
              </div>
            </div>
          </div>
        </div>

        {/* Compact Quick Actions */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={autoSplitAmounts}
            disabled={fields.length === 0}
            className="flex-1 py-2 text-xs border-blue-200 hover:bg-blue-50"
          >
            <Shuffle className="w-3 h-3 mr-1" />
            Equal Split
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={redistributeRemaining}
            disabled={!canRedistribute}
            className="flex-1 py-2 text-xs border-orange-200 hover:bg-orange-50"
          >
            <Calculator className="w-3 h-3 mr-1" />
            Redistribute
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => append({ name: '', phone: '', amountToPay: '0' })}
            className="px-3 py-2 border-green-200 hover:bg-green-50"
          >
            <UserPlus className="w-3 h-3" />
          </Button>
        </div>

        {/* Ultra-Compact Participants Form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-2">
            {fields.map((field, index) => {
              const isOwner = index === 0;
              const isManuallyEdited = manuallyEditedParticipants.has(index);
              
              return (
                <div key={field.id} className={`relative rounded-lg border p-3 transition-all ${
                  isManuallyEdited ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200 bg-white'
                } ${isOwner ? 'ring-1 ring-yellow-300' : ''}`}>
                  
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
                      className="absolute top-1 right-1 text-red-500 hover:text-red-700 w-6 h-6 p-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                  
                  {/* Compact Status Badges */}
                  <div className="flex items-center gap-1 mb-2">
                    {isOwner && (
                      <Badge className="bg-yellow-100 text-yellow-800 text-xs px-1 py-0">
                        <Crown className="w-2 h-2 mr-1" />
                        Owner
                      </Badge>
                    )}
                    {isManuallyEdited && (
                      <Badge variant="outline" className="bg-blue-100 border-blue-300 text-blue-700 text-xs px-1 py-0">
                        Edited
                      </Badge>
                    )}
                  </div>

                  {/* Compact Form Grid */}
                  <div className="grid grid-cols-12 gap-2 items-end">
                    {/* Name - 5 columns */}
                    <div className="col-span-5">
                      <Label className="text-xs text-gray-600 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Name
                      </Label>
                      <Input
                        {...form.register(`participants.${index}.name`)}
                        placeholder="Full name"
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Phone - 4 columns */}
                    <div className="col-span-4">
                      <Label className="text-xs text-gray-600 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        Phone
                      </Label>
                      <Input
                        {...form.register(`participants.${index}.phone`)}
                        placeholder="+84 xxx xxx"
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Amount - 3 columns */}
                    <div className="col-span-3">
                      <Label className="text-xs text-gray-600 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        VND
                      </Label>
                      <FormattedNumberInput
                        value={form.watch(`participants.${index}.amountToPay`) || ''}
                        onChange={(value) => handleAmountChange(index, value)}
                        placeholder="0"
                        className={`h-8 text-sm font-semibold ${
                          isOwner ? 'text-primary' : 'text-gray-900'
                        } ${isManuallyEdited ? 'border-blue-300' : ''}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Compact Empty State */}
            {fields.length === 0 && (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <h4 className="font-medium text-gray-900 mb-1">No Participants</h4>
                <p className="text-sm text-gray-600 mb-3">Add people to split this bill</p>
                <Button
                  type="button"
                  onClick={() => append({ name: '', phone: '', amountToPay: '0' })}
                  className="bg-primary text-white"
                  size="sm"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Add First Participant
                </Button>
              </div>
            )}
          </div>

          {/* Compact Action Button */}
          <div className="pt-2">
            <Button
              type="submit"
              className="w-full bg-primary text-white py-3 font-semibold hover:bg-primary/90"
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
            
            {/* Compact Balance Warning */}
            {!isBalanced && fields.length > 0 && (
              <div className={`mt-2 p-2 rounded-lg border ${
                remaining > 0 ? 'border-orange-200 bg-orange-50' : 'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 ${
                    remaining > 0 ? 'text-orange-600' : 'text-red-600'
                  }`} />
                  <div>
                    <p className={`text-sm font-medium ${
                      remaining > 0 ? 'text-orange-800' : 'text-red-800'
                    }`}>
                      {remaining > 0 ? 'Under-allocated' : 'Over-allocated'} by {formatCurrency(Math.abs(remaining))}
                    </p>
                    <p className={`text-xs ${
                      remaining > 0 ? 'text-orange-700' : 'text-red-700'
                    }`}>
                      {canRedistribute ? 
                        `Use "Redistribute" to balance among ${unEditedCount} unedited participants.` :
                        'Use "Equal Split" to reset and redistribute evenly.'
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