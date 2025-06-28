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
    
    toast({
      title: "Amounts Split Equally",
      description: `${formatCurrency(billTotal)} split equally among ${participantCount} participants.`,
    });
  };

  // Redistribute remaining amount among all participants
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
    
    // Distribute the remaining amount equally among all participants
    const adjustmentPerPerson = Math.floor((remaining / participantCount) * 100) / 100;
    const redistributionRemainder = Math.round((remaining - (adjustmentPerPerson * participantCount)) * 100) / 100;
    
    const updatedParticipants = currentParticipants.map((participant, index) => {
      const currentAmount = parseFloat(participant.amountToPay) || 0;
      const adjustment = index === 0 ? adjustmentPerPerson + redistributionRemainder : adjustmentPerPerson;
      const newAmount = currentAmount + adjustment;
      
      return {
        ...participant,
        amountToPay: Math.max(0, newAmount).toFixed(2) // Ensure no negative amounts
      };
    });
    
    form.setValue('participants', updatedParticipants);
    
    toast({
      title: "Amounts Redistributed",
      description: `${formatCurrency(Math.abs(remaining))} has been ${remaining > 0 ? 'distributed among' : 'deducted from'} all participants.`,
    });
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
                  disabled={fields.length === 0 || isBalanced}
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
                return (
                  <div key={field.id} className="p-3 border border-gray-200 rounded-lg space-y-2 relative">
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="absolute top-1 right-1 text-red-500 hover:text-red-700 p-1 h-6 w-6"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                    
                    {isOwner && (
                      <Badge variant="secondary" className="text-xs h-5">
                        <Crown className="w-3 h-3 mr-1" />
                        Owner
                      </Badge>
                    )}

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
                          className={`h-8 text-sm ${isOwner ? 'font-bold text-primary' : ''}`}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (validateAmount(value, index)) {
                              form.register(`participants.${index}.amountToPay`).onChange(e);
                            } else {
                              // Reset to previous valid value
                              e.target.value = form.getValues(`participants.${index}.amountToPay`);
                            }
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
                  Use "Equal Split" to distribute evenly or "Redistribute" to balance the current amounts.
                </p>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}