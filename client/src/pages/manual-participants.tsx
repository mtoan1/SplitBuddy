import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Users, Crown, AlertTriangle, CheckCircle } from "lucide-react";
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
  const [originalAmounts, setOriginalAmounts] = useState<string[]>([]);

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
        amountToPay: p.amountToPay.toString()
      }));
      form.reset({ participants: participantData });
      
      // Store original amounts to track manual edits
      const amounts = participantData.map(p => p.amountToPay);
      setOriginalAmounts(amounts);
      setManuallyEditedParticipants(new Set()); // Reset manual edit tracking
    }
  }, [participantsQuery.data, form]);

  // Calculate totals and validation
  const currentParticipants = form.watch('participants') || [];
  const billTotal = parseFloat(billQuery.data?.totalAmount || '0');
  
  // Calculate total assigned with proper number handling
  const totalAssigned = currentParticipants.reduce((sum, p) => {
    const amount = parseFloat(p.amountToPay) || 0;
    return sum + amount;
  }, 0);
  
  const remaining = billTotal - totalAssigned;
  const isBalanced = Math.abs(remaining) < 0.01; // Allow for small rounding differences

  // Auto-split logic - distributes bill total equally among all participants
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
    
    // Calculate base amount per person (rounded down to nearest cent)
    const baseAmount = Math.floor((billTotal / participantCount) * 100) / 100;
    
    // Calculate remainder after distributing base amounts
    const totalBaseAmount = baseAmount * participantCount;
    const remainder = Math.round((billTotal - totalBaseAmount) * 100) / 100;
    
    // Distribute amounts: first participant gets the remainder added
    const updatedParticipants = currentParticipants.map((participant, index) => ({
      ...participant,
      amountToPay: (index === 0 ? baseAmount + remainder : baseAmount).toFixed(2)
    }));
    
    form.setValue('participants', updatedParticipants);
    
    // Reset manual edit tracking since we're doing a fresh equal split
    setManuallyEditedParticipants(new Set());
    setOriginalAmounts(updatedParticipants.map(p => p.amountToPay));
    
    toast({
      title: "Amounts Split Equally",
      description: `${formatCurrency(billTotal)} split equally among ${participantCount} participants.`,
    });
  };

  // Redistribute remaining amount only among participants that haven't been manually edited
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

    if (Math.abs(remaining) < 0.01) {
      toast({
        title: "Already Balanced",
        description: "The bill is already properly split.",
      });
      return;
    }

    // Find participants that haven't been manually edited
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
    
    // Distribute the remaining amount only among unedited participants
    const adjustmentPerPerson = Math.floor((remaining / unEditedIndices.length) * 100) / 100;
    const redistributionRemainder = Math.round((remaining - (adjustmentPerPerson * unEditedIndices.length)) * 100) / 100;
    
    const updatedParticipants = currentParticipants.map((participant, index) => {
      // Only adjust amounts for participants that haven't been manually edited
      if (unEditedIndices.includes(index)) {
        const currentAmount = parseFloat(participant.amountToPay) || 0;
        // Give the remainder to the first unedited participant
        const adjustment = index === unEditedIndices[0] ? adjustmentPerPerson + redistributionRemainder : adjustmentPerPerson;
        const newAmount = currentAmount + adjustment;
        
        return {
          ...participant,
          amountToPay: Math.max(0, newAmount).toFixed(2) // Ensure no negative amounts
        };
      }
      
      // Keep manually edited amounts unchanged
      return participant;
    });
    
    form.setValue('participants', updatedParticipants);
    
    toast({
      title: "Amounts Redistributed",
      description: `${formatCurrency(Math.abs(remaining))} redistributed among ${unEditedIndices.length} unedited participants. ${manuallyEditedParticipants.size} manually edited amounts preserved.`,
    });
  };

  // Track manual edits to participant amounts
  const handleAmountChange = (index: number, newValue: string) => {
    // Mark this participant as manually edited
    setManuallyEditedParticipants(prev => new Set(prev).add(index));
    
    // Validate the amount
    if (validateAmount(newValue, index)) {
      // Update the form value
      form.setValue(`participants.${index}.amountToPay`, newValue);
    }
  };

  // Validate individual amount doesn't exceed total
  const validateAmount = (newAmount: string, participantIndex: number) => {
    const amount = parseFloat(newAmount) || 0;
    
    if (amount > billTotal) {
      toast({
        title: "Amount Too Large",
        description: `Individual amount cannot exceed the total bill amount of ${formatCurrency(billTotal)}.`,
        variant: "destructive",
      });
      return false;
    }
    
    if (amount < 0) {
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
      // Update existing participants
      for (let i = 0; i < data.participants.length; i++) {
        const participant = data.participants[i];
        const participantData = {
          billId,
          name: participant.name,
          phone: participant.phone,
          amountToPay: participant.amountToPay,
          paymentStatus: i === 0 ? 'paid' : 'pending' // First participant is owner (paid)
        };

        if (participantsQuery.data && participantsQuery.data[i]) {
          // Update existing participant
          await apiRequest('PUT', `/api/chillbill/bills/${billId}/participants/${participantsQuery.data[i].id}`, participantData);
        } else {
          // Create new participant
          await apiRequest('POST', `/api/chillbill/bills/${billId}/participants`, participantData);
        }
      }

      // Remove extra participants if any
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
    
    console.log('Form submitted with participants:', data);
    createParticipantsMutation.mutate(data);
  };

  if (billQuery.isLoading) {
    return (
      <div className="max-w-md mx-auto bg-gradient-to-br from-white to-gray-50 min-h-screen">
        <div className="p-5 space-y-4">
          <div className="text-center py-8">Loading bill details...</div>
        </div>
      </div>
    );
  }

  if (!billQuery.data) {
    return (
      <div className="max-w-md mx-auto bg-gradient-to-br from-white to-gray-50 min-h-screen">
        <div className="p-5 space-y-4">
          <div className="text-center py-8 text-red-500">Bill not found</div>
        </div>
      </div>
    );
  }

  // Count manually edited vs unedited participants for better UX
  const unEditedCount = currentParticipants.length - manuallyEditedParticipants.size;
  const canRedistribute = unEditedCount > 0 && !isBalanced;

  return (
    <div className="max-w-md mx-auto bg-gradient-to-br from-white to-gray-50 min-h-screen">
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setLocation('/')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-lg font-bold neon-text">Review Participants</h1>
          <div></div>
        </div>

        {/* Bill Summary */}
        <div className="mobile-card p-4 space-y-3">
          <div className="text-center">
            <h3 className="font-bold text-lg neon-text">{billQuery.data.merchantName}</h3>
            <div className="text-2xl font-bold text-primary">{formatCurrency(billTotal)}</div>
            <p className="text-xs text-gray-500">{new Date(billQuery.data.billDate).toLocaleDateString()}</p>
          </div>
          
          {/* Split Summary with Visual Indicators */}
          <div className={`rounded-lg p-3 space-y-2 ${
            isBalanced ? 'bg-green-50 border border-green-200' : 
            remaining > 0 ? 'bg-orange-50 border border-orange-200' : 
            'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isBalanced ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                )}
                <span className="text-sm font-medium">Split Status</span>
              </div>
              <span className={`text-sm font-bold ${
                isBalanced ? 'text-green-600' : 
                remaining > 0 ? 'text-orange-600' : 
                'text-red-600'
              }`}>
                {isBalanced ? 'Balanced' : remaining > 0 ? 'Under-allocated' : 'Over-allocated'}
              </span>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Bill Total:</span>
                <span className="font-semibold">{formatCurrency(billTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Assigned:</span>
                <span className={`font-semibold ${totalAssigned > billTotal ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatCurrency(totalAssigned)}
                </span>
              </div>
              <div className="flex justify-between text-sm border-t pt-1">
                <span>Remaining:</span>
                <span className={`font-bold ${
                  isBalanced ? 'text-green-600' : 
                  remaining > 0 ? 'text-orange-600' : 
                  'text-red-600'
                }`}>
                  {formatCurrency(remaining)}
                </span>
              </div>
              
              {/* Show edit status */}
              {manuallyEditedParticipants.size > 0 && (
                <div className="flex justify-between text-xs pt-1 border-t">
                  <span>Manual edits:</span>
                  <span className="font-medium text-blue-600">
                    {manuallyEditedParticipants.size} of {currentParticipants.length}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Participants Form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="mobile-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-gray-900">Participants ({fields.length})</span>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={autoSplitAmounts}
                  className="text-xs h-6 px-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  disabled={fields.length === 0}
                >
                  Equal Split
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={redistributeRemaining}
                  className="text-xs h-6 px-2 bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                  disabled={!canRedistribute}
                  title={
                    unEditedCount === 0 ? "All amounts manually edited" :
                    isBalanced ? "Already balanced" :
                    `Redistribute among ${unEditedCount} unedited participants`
                  }
                >
                  Redistribute
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ name: '', phone: '', amountToPay: '0.00' })}
                  className="h-6 px-2"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </Button>
              </div>
            </div>
            
            <div className="space-y-3">
              {fields.map((field, index) => {
                const isOwner = index === 0;
                const isManuallyEdited = manuallyEditedParticipants.has(index);
                
                return (
                  <div key={field.id} className={`p-3 border rounded-lg space-y-2 relative ${
                    isManuallyEdited ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200'
                  }`}>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          remove(index);
                          // Update manual edit tracking when removing participants
                          const newEditedSet = new Set(manuallyEditedParticipants);
                          newEditedSet.delete(index);
                          // Shift indices down for participants after the removed one
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
                        className="absolute top-1 right-1 text-red-500 hover:text-red-700 p-1 h-6 w-6"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                    
                    <div className="flex items-center gap-2">
                      {isOwner && (
                        <Badge variant="secondary" className="text-xs h-5">
                          <Crown className="w-3 h-3 mr-1" />
                          Owner
                        </Badge>
                      )}
                      {isManuallyEdited && (
                        <Badge variant="outline" className="text-xs h-5 border-blue-300 text-blue-700">
                          Edited
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-gray-600">Name</Label>
                        <Input
                          {...form.register(`participants.${index}.name`)}
                          placeholder="Enter name"
                          className="h-8 text-sm"
                        />
                      </div>

                      <div>
                        <Label className="text-xs text-gray-600">Amount</Label>
                        <Input
                          {...form.register(`participants.${index}.amountToPay`)}
                          type="number"
                          step="0.01"
                          min="0"
                          max={billTotal}
                          placeholder="0.00"
                          className={`h-8 text-sm ${isOwner ? 'font-bold text-primary' : ''} ${
                            isManuallyEdited ? 'border-blue-300 bg-blue-50' : ''
                          }`}
                          onChange={(e) => {
                            handleAmountChange(index, e.target.value);
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-600">Phone</Label>
                      <Input
                        {...form.register(`participants.${index}.phone`)}
                        placeholder="+1 (555) 000-0000"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              type="submit"
              className="w-full bg-primary text-white py-3 hover:bg-primary/90"
              disabled={createParticipantsMutation.isPending || !isBalanced || fields.length === 0}
            >
              {createParticipantsMutation.isPending ? 'Saving Changes...' : 'Continue to Bill Details'}
            </Button>
            
            {!isBalanced && fields.length > 0 && (
              <div className={`p-3 rounded-lg border ${
                remaining > 0 ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className={`w-4 h-4 ${
                    remaining > 0 ? 'text-orange-600' : 'text-red-600'
                  }`} />
                  <span className={`text-sm font-medium ${
                    remaining > 0 ? 'text-orange-800' : 'text-red-800'
                  }`}>
                    {remaining > 0 ? 'Under-allocated' : 'Over-allocated'} by {formatCurrency(Math.abs(remaining))}
                  </span>
                </div>
                <p className={`text-xs ${
                  remaining > 0 ? 'text-orange-700' : 'text-red-700'
                }`}>
                  {canRedistribute ? (
                    `Use "Redistribute" to balance among ${unEditedCount} unedited participants, or "Equal Split" to reset all amounts.`
                  ) : manuallyEditedParticipants.size === currentParticipants.length ? (
                    'All amounts have been manually edited. Use "Equal Split" to reset and redistribute evenly.'
                  ) : (
                    'Use "Equal Split" to distribute evenly among all participants.'
                  )}
                </p>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}