import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Trash2, Users } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertParticipantSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const participantFormSchema = z.object({
  participants: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
  })).min(1, "At least one participant is required")
});

type ParticipantForm = z.infer<typeof participantFormSchema>;

export default function ManualParticipants() {
  const { billId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: bill, isLoading: billLoading } = useQuery({
    queryKey: ['/api/chillbill/bills', billId],
    queryFn: async () => {
      const response = await fetch(`/api/chillbill/bills/${billId}`);
      if (!response.ok) throw new Error('Failed to fetch bill');
      return response.json();
    }
  });

  const form = useForm<ParticipantForm>({
    resolver: zodResolver(participantFormSchema),
    defaultValues: {
      participants: [
        { name: "", phone: "", email: "" },
        { name: "", phone: "", email: "" }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "participants"
  });

  const addParticipantsMutation = useMutation({
    mutationFn: async (data: ParticipantForm) => {
      const results = [];
      for (const participant of data.participants) {
        if (participant.name.trim()) {
          const result = await apiRequest('POST', `/api/chillbill/bills/${billId}/participants`, {
            ...participant,
            paymentStatus: 'pending'
          });
          results.push(result);
        }
      }
      return results;
    },
    onSuccess: async (participants) => {
      // Calculate equal split
      await apiRequest('POST', `/api/chillbill/bills/${billId}/split/equal`, {});
      
      queryClient.invalidateQueries({ queryKey: ['/api/chillbill/bills', billId] });
      
      toast({
        title: "Participants Added",
        description: `${participants.length} participants added successfully!`,
      });
      
      setLocation(`/bill/${billId}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add participants. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: ParticipantForm) => {
    addParticipantsMutation.mutate(data);
  };

  if (billLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen p-4">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/bill/${billId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold text-text-primary ml-4">Add Participants</h1>
        </div>

        {/* Bill Info */}
        <Card className="bg-primary/10">
          <CardContent className="p-4">
            <div className="text-center">
              <h3 className="font-semibold text-text-primary mb-2">{bill?.merchantName}</h3>
              <p className="text-lg font-bold text-text-primary">
                Total: ${bill?.totalAmount}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Participants Form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-text-primary">
                <Users className="w-5 h-5 mr-2" />
                Participants
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-text-primary">Person {index + 1}</h4>
                    {fields.length > 1 && (
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
                    <Label htmlFor={`participants.${index}.name`}>Name *</Label>
                    <Input
                      placeholder="Enter full name"
                      {...form.register(`participants.${index}.name`)}
                    />
                    {form.formState.errors.participants?.[index]?.name && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.participants[index]?.name?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`participants.${index}.phone`}>Phone (Optional)</Label>
                    <Input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      {...form.register(`participants.${index}.phone`)}
                    />
                  </div>

                  <div>
                    <Label htmlFor={`participants.${index}.email`}>Email (Optional)</Label>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      {...form.register(`participants.${index}.email`)}
                    />
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => append({ name: "", phone: "", email: "" })}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Person
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button
              type="submit"
              className="w-full bg-primary text-white py-4 text-lg hover:bg-primary/90"
              disabled={addParticipantsMutation.isPending}
            >
              {addParticipantsMutation.isPending ? 'Adding Participants...' : 'Add Participants & Calculate Split'}
            </Button>
            
            <p className="text-center text-sm text-gray-600">
              Bill will be split equally among all participants
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}