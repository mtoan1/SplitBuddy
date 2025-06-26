import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Users, Crown } from "lucide-react";
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

  // Auto-split logic
  const autoSplitAmounts = () => {
    const currentParticipants = form.getValues('participants');
    const billTotal = parseFloat(billQuery.data?.totalAmount || '0');
    
    if (currentParticipants.length === 0 || billTotal === 0) return;
    
    const baseAmount = Math.floor((billTotal / currentParticipants.length) * 100) / 100;
    const remainder = Math.round((billTotal - (baseAmount * currentParticipants.length)) * 100) / 100;
    
    const updatedParticipants = currentParticipants.map((participant, index) => ({
      ...participant,
      amountToPay: (index === 0 ? baseAmount + remainder : baseAmount).toFixed(2)
    }));
    
    form.setValue('participants', updatedParticipants);
  };

  // Redistribute remaining amount among participants without custom amounts
  const redistributeRemaining = () => {
    const currentParticipants = form.getValues('participants');
    const billTotal = parseFloat(billQuery.data?.totalAmount || '0');
    
    if (currentParticipants.length === 0 || billTotal === 0) return;
    
    // Calculate total of all current amounts
    const totalAssigned = currentParticipants.reduce((sum, p) => sum + (parseFloat(p.amountToPay) || 0), 0);
    const remaining = billTotal - totalAssigned;
    
    if (remaining !== 0 && currentParticipants.length > 0) {
      // Distribute remaining equally among all participants
      const additionalPerPerson = Math.floor((remaining / currentParticipants.length) * 100) / 100;
      const redistributionRemainder = Math.round((remaining - (additionalPerPerson * currentParticipants.length)) * 100) / 100;
      
      const updatedParticipants = currentParticipants.map((participant, index) => {
        const currentAmount = parseFloat(participant.amountToPay) || 0;
        const extra = index === 0 ? redistributionRemainder : 0;
        return {
          ...participant,
          amountToPay: (currentAmount + additionalPerPerson + extra).toFixed(2)
        };
      });
      
      form.setValue('participants', updatedParticipants);
      
      toast({
        title: "Amounts Redistributed",
        description: `Remaining ${formatCurrency(Math.abs(remaining))} has been ${remaining > 0 ? 'added to' : 'deducted from'} all participants equally.`,
      });
    }
  };

  // Validate amount doesn't exceed total
  const validateAmount = (newAmount: string) => {
    const amount = parseFloat(newAmount) || 0;
    const billTotal = parseFloat(billQuery.data?.totalAmount || '0');
    
    if (amount > billTotal) {
      toast({
        title: "Invalid Amount",
        description: "Amount cannot exceed the total bill amount.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "participants"
  });

  // Load existing participants and calculate totals on mount
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
    console.log('Form submitted with participants:', data);
    createParticipantsMutation.mutate(data);
  };

  const currentParticipants = form.watch('participants') || [];
  const totalAssigned = currentParticipants.reduce((sum, p) => sum + (parseFloat(p.amountToPay) || 0), 0);
  const billTotal = parseFloat(billQuery.data?.totalAmount || '0');
  const remaining = billTotal - totalAssigned;

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

        {billQuery.isLoading ? (
          <div className="text-center py-8">Loading bill details...</div>
        ) : !billQuery.data ? (
          <div className="text-center py-8 text-red-500">
            Bill not found
          </div>
        ) : (
          <>
            {/* Bill Summary */}
            <div className="mobile-card p-4 space-y-3">
              <div className="text-center">
                <h3 className="font-bold text-lg neon-text">{billQuery.data.merchantName}</h3>
                <div className="text-2xl font-bold text-primary">{formatCurrency(billTotal)}</div>
                <p className="text-xs text-gray-500">{new Date(billQuery.data.billDate).toLocaleDateString()}</p>
              </div>
              
              {/* Split Summary */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Assigned:</span>
                  <span className={totalAssigned > billTotal ? 'text-red-500' : 'text-green-600'}>
                    {formatCurrency(totalAssigned)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>Remaining:</span>
                  <span className={remaining < 0 ? 'text-red-500' : remaining > 0 ? 'text-orange-500' : 'text-green-600'}>
                    {formatCurrency(remaining)}
                  </span>
                </div>
              </div>
            </div>

            {/* Participants Display/Edit */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="mobile-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-gray-900">Participants ({fields.length})</span>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={redistributeRemaining}
                      className="text-xs h-6 px-2"
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
                              placeholder="0.00"
                              className={`h-8 text-sm ${isOwner ? 'font-bold text-primary' : ''}`}
                              onChange={(e) => {
                                if (validateAmount(e.target.value)) {
                                  form.register(`participants.${index}.amountToPay`).onChange(e);
                                } else {
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

              {/* Summary Card */}
              <div className="mobile-card p-3 bg-gray-50">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Bill Total:</span>
                    <span className="font-semibold">{formatCurrency(billTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Assigned:</span>
                    <span className="font-semibold">{formatCurrency(totalAssigned)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span>Remaining:</span>
                    <span className={`font-bold ${Math.abs(remaining) > 0.01 ? 'text-red-500' : 'text-green-600'}`}>
                      {formatCurrency(remaining)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  type="submit"
                  className="w-full bg-primary text-white py-3 hover:bg-primary/90"
                  disabled={createParticipantsMutation.isPending || Math.abs(remaining) > 0.01}
                >
                  {createParticipantsMutation.isPending ? 'Saving Changes...' : 'Continue to Bill Details'}
                </Button>
                
                {Math.abs(remaining) > 0.01 && (
                  <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs text-amber-700 text-center">
                      {remaining > 0 ? 'Under-allocated by' : 'Over-allocated by'} {formatCurrency(Math.abs(remaining))}. 
                      Use "Redistribute" to balance.
                    </p>
                  </div>
                )}
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}