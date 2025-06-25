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
          await apiRequest('PATCH', `/api/chillbill/participants/${participantsQuery.data[i].id}`, participantData);
        } else {
          // Create new participant
          await apiRequest('POST', '/api/chillbill/participants', participantData);
        }
      }

      // Remove extra participants if any
      if (participantsQuery.data && participantsQuery.data.length > data.participants.length) {
        for (let i = data.participants.length; i < participantsQuery.data.length; i++) {
          await apiRequest('DELETE', `/api/chillbill/participants/${participantsQuery.data[i].id}`);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chillbill/bills', billId, 'participants'] });
      toast({
        title: "Participants Updated",
        description: "All participants have been saved successfully.",
      });
      setLocation(`/bill/${billId}/detail`);
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
    <div className="max-w-md mx-auto bg-white min-h-screen">
      <div className="p-4 space-y-6">
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
                <CardContent className="space-y-4">
                  {fields.map((field, index) => {
                    const isOwner = index === 0;
                    return (
                      <div 
                        key={field.id} 
                        className={`border rounded-lg p-4 space-y-3 ${isOwner ? 'bg-primary/5 border-primary/20' : 'bg-white'}`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">
                              {isOwner ? 'Bill Owner' : `Person ${index + 1}`}
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
                        
                        <div>
                          <Label htmlFor={`participants.${index}.name`}>Name</Label>
                          <Input
                            {...form.register(`participants.${index}.name`)}
                            placeholder="Enter name"
                          />
                          {form.formState.errors.participants?.[index]?.name && (
                            <p className="text-sm text-red-500 mt-1">
                              {form.formState.errors.participants[index]?.name?.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor={`participants.${index}.phone`}>Phone</Label>
                          <Input
                            {...form.register(`participants.${index}.phone`)}
                            placeholder="e.g., +1 (555) 123-4567"
                          />
                          {form.formState.errors.participants?.[index]?.phone && (
                            <p className="text-sm text-red-500 mt-1">
                              {form.formState.errors.participants[index]?.phone?.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor={`participants.${index}.amountToPay`}>
                            Amount to Pay {isOwner && '(includes remainder)'}
                          </Label>
                          <Input
                            {...form.register(`participants.${index}.amountToPay`)}
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className={isOwner ? 'font-medium' : ''}
                          />
                          {form.formState.errors.participants?.[index]?.amountToPay && (
                            <p className="text-sm text-red-500 mt-1">
                              {form.formState.errors.participants[index]?.amountToPay?.message}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
                  <p className="text-sm text-center text-red-500">
                    Please adjust amounts so they total exactly {formatCurrency(billTotal)}
                  </p>
                )}
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}