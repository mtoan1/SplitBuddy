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

  // Smart split when someone pays more
  const handleAmountChange = (index: number, newAmount: string) => {
    const currentParticipants = form.getValues('participants');
    const billTotal = parseFloat(billQuery.data?.totalAmount || '0');
    const amount = parseFloat(newAmount) || 0;
    
    // Prevent exceeding total
    if (amount > billTotal) {
      toast({
        title: "Invalid Amount",
        description: "Amount cannot exceed the total bill amount.",
        variant: "destructive",
      });
      return;
    }
    
    // Update the current participant
    const updatedParticipants = [...currentParticipants];
    updatedParticipants[index] = { ...updatedParticipants[index], amountToPay: newAmount };
    
    // Calculate remaining amount to split among others
    const totalAssigned = updatedParticipants.reduce((sum, p, i) => {
      if (i === index) return sum + amount; // Use new amount for current participant
      return sum + (parseFloat(p.amountToPay) || 0);
    }, 0);
    
    const remaining = billTotal - totalAssigned;
    const otherParticipants = updatedParticipants.filter((_, i) => i !== index);
    
    if (otherParticipants.length > 0 && remaining > 0) {
      const splitAmount = Math.floor((remaining / otherParticipants.length) * 100) / 100;
      const splitRemainder = Math.round((remaining - (splitAmount * otherParticipants.length)) * 100) / 100;
      
      let remainderIndex = 0;
      updatedParticipants.forEach((participant, i) => {
        if (i !== index) {
          const extra = remainderIndex === 0 ? splitRemainder : 0;
          updatedParticipants[i] = {
            ...participant,
            amountToPay: (splitAmount + extra).toFixed(2)
          };
          remainderIndex++;
        }
      });
    }
    
    form.setValue('participants', updatedParticipants);
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
    <div className="mobile-container">
      <div className="mobile-content">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold text-text-primary ml-4">Review Participants</h1>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-text-primary">
                  <Users className="w-5 h-5 mr-2" />
                  Bill Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><span className="font-medium">Merchant:</span> {billQuery.data.merchantName}</p>
                  <p><span className="font-medium">Total:</span> {formatCurrency(billTotal)}</p>
                  <p><span className="font-medium">Date:</span> {new Date(billQuery.data.billDate).toLocaleDateString()}</p>
                </div>
                
                {/* Split Summary */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
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
              </CardContent>
            </Card>

            {/* Participants Display/Edit */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-text-primary">Participants ({currentParticipants.length})</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ name: '', phone: '', amountToPay: '' })}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Person
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {fields.map((field, index) => {
                    const isOwner = index === 0;
                    return (
                      <div 
                        key={field.id} 
                        className={`mobile-card space-y-3 ${isOwner ? 'bg-primary/5 border-primary/20' : ''}`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">
                              {form.watch(`participants.${index}.name`) || (isOwner ? 'Bill Owner' : `Person ${index + 1}`)}
                            </h3>
                            {isOwner && (
                              <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
                                <Crown className="w-3 h-3 mr-1" />
                                Owner
                              </Badge>
                            )}
                          </div>
                          {fields.length > 1 && !isOwner && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`participants.${index}.name`} className="text-xs font-bold text-gray-700 dark:text-gray-300">Name</Label>
                            <Input
                              {...form.register(`participants.${index}.name`)}
                              placeholder="Enter name"
                              className="mobile-input"
                            />
                            {form.formState.errors.participants?.[index]?.name && (
                              <p className="text-xs text-red-500 mt-1">
                                {form.formState.errors.participants[index]?.name?.message}
                              </p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor={`participants.${index}.amountToPay`} className="text-xs font-bold text-gray-700 dark:text-gray-300">
                              Amount {isOwner && '(+remainder)'}
                            </Label>
                            <Input
                              {...form.register(`participants.${index}.amountToPay`)}
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              className={`mobile-input ${isOwner ? 'font-bold text-primary' : ''}`}
                              onChange={(e) => {
                                form.register(`participants.${index}.amountToPay`).onChange(e);
                                handleAmountChange(index, e.target.value);
                              }}
                            />
                            {form.formState.errors.participants?.[index]?.amountToPay && (
                              <p className="text-xs text-red-500 mt-1">
                                {form.formState.errors.participants[index]?.amountToPay?.message}
                              </p>
                            )}
                          </div>
                        </div>

                        <div>
                          <Label htmlFor={`participants.${index}.phone`} className="text-xs font-bold text-gray-700 dark:text-gray-300">Phone</Label>
                          <Input
                            {...form.register(`participants.${index}.phone`)}
                            placeholder="e.g., +84 123 456 789"
                            className="mobile-input"
                          />
                          {form.formState.errors.participants?.[index]?.phone && (
                            <p className="text-xs text-red-500 mt-1">
                              {form.formState.errors.participants[index]?.phone?.message}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Summary Card */}
              <Card className="mobile-card bg-gray-50 dark:bg-gray-800/50">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Bill Total:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(billTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Total Assigned:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(totalAssigned)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="text-gray-600 dark:text-gray-400">Remaining:</span>
                      <span className={`font-bold ${Math.abs(remaining) > 0.01 ? 'text-red-500' : 'text-green-600'}`}>
                        {formatCurrency(remaining)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <Button
                  type="submit"
                  className="w-full bg-primary text-white py-4"
                  disabled={createParticipantsMutation.isPending || Math.abs(remaining) > 0.01}
                >
                  {createParticipantsMutation.isPending ? 'Saving Changes...' : 'Continue to Bill Details'}
                </Button>
                
                {Math.abs(remaining) > 0.01 && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-700 dark:text-red-300 text-center">
                      Please adjust amounts so they total exactly {formatCurrency(billTotal)}
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