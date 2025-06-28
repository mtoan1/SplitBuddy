import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
        // Convert to integer VND (round to nearest dong)
        amountToPay: Math.round(parseFloat(p.amountToPay)).toString()
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
  const billTotalVND = Math.round(billTotal); // Convert to integer VND
  
  // Calculate total assigned with integer arithmetic (amounts are in VND)
  const totalAssignedVND = currentParticipants.reduce((sum, p) => {
    const amountVND = parseInt(p.amountToPay) || 0;
    return sum + amountVND;
  }, 0);
  
  const totalAssigned = totalAssignedVND;
  const remaining = billTotalVND - totalAssigned;
  const isBalanced = remaining === 0; // Perfect balance for integer currency

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
    
    // Calculate base amount per person in VND
    const baseAmountVND = Math.floor(billTotalVND / participantCount);
    
    // Calculate remainder after distributing base amounts
    const totalBaseAmountVND = baseAmountVND * participantCount;
    const remainderVND = billTotalVND - totalBaseAmountVND;
    
    // Distribute amounts: first participant gets the remainder added
    const updatedParticipants = currentParticipants.map((participant, index) => ({
      ...participant,
      amountToPay: (index === 0 ? baseAmountVND + remainderVND : baseAmountVND).toString()
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

    if (remaining === 0) {
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
    
    // Calculate remaining amount in VND
    const remainingVND = remaining;
    
    // Distribute the remaining amount only among unedited participants
    const adjustmentPerPersonVND = Math.floor(remainingVND / unEditedIndices.length);
    const redistributionRemainderVND = remainingVND - (adjustmentPerPersonVND * unEditedIndices.length);
    
    const updatedParticipants = currentParticipants.map((participant, index) => {
      // Only adjust amounts for participants that haven't been manually edited
      if (unEditedIndices.includes(index)) {
        const currentAmountVND = parseInt(participant.amountToPay) || 0;
        // Give the remainder to the first unedited participant
        const adjustmentVND = index === unEditedIndices[0] ? adjustmentPerPersonVND + redistributionRemainderVND : adjustmentPerPersonVND;
        const newAmountVND = currentAmountVND + adjustmentVND;
        
        return {
          ...participant,
          amountToPay: Math.max(0, newAmountVND).toString() // Ensure no negative amounts
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
      // Update existing participants
      for (let i = 0; i < data.participants.length; i++) {
        const participant = data.participants[i];
        const participantData = {
          billId,
          name: participant.name,
          phone: participant.phone,
          // Store as integer VND
          amountToPay: parseInt(participant.amountToPay).toString(),
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

  // Count manually edited vs unedited participants for better UX
  const unEditedCount = currentParticipants.length - manuallyEditedParticipants.size;
  const canRedistribute = unEditedCount > 0 && !isBalanced;

  return (
    <div className="mobile-container">
      {/* Header */}
      <header className="mobile-header">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/')}
              className="rounded-full w-10 h-10 hover:bg-primary/10 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-primary" />
            </Button>
            <img 
              src="https://cake.vn/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FCake-logo-01.e915daf7.webp&w=256&q=75"
              alt="Cake Logo"
              className="w-10 h-10 rounded-xl object-contain"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Review Participants</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Adjust amounts and details</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mobile-content">
        {/* Bill Summary Card */}
        <Card className="mobile-card">
          <CardContent className="p-6">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/15 to-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                <DollarSign className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{billQuery.data.merchantName}</h3>
                <p className="text-3xl font-bold text-primary mt-2">{formatCurrency(billTotalVND)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(billQuery.data.billDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Balance Status Card */}
        <Card className={`border-2 ${
          isBalanced ? 'border-green-200 bg-green-50' : 
          remaining > 0 ? 'border-orange-200 bg-orange-50' : 
          'border-red-200 bg-red-50'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {isBalanced ? (
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {isBalanced ? 'Perfectly Balanced' : remaining > 0 ? 'Under-allocated' : 'Over-allocated'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {isBalanced ? 'Ready to save' : `${formatCurrency(Math.abs(remaining))} ${remaining > 0 ? 'missing' : 'excess'}`}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(billTotalVND)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Assigned</p>
                <p className={`text-lg font-bold ${totalAssigned > billTotalVND ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatCurrency(totalAssigned)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Remaining</p>
                <p className={`text-lg font-bold ${
                  isBalanced ? 'text-green-600' : 
                  remaining > 0 ? 'text-orange-600' : 
                  'text-red-600'
                }`}>
                  {formatCurrency(remaining)}
                </p>
              </div>
            </div>

            {/* Edit Status */}
            {manuallyEditedParticipants.size > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Manual edits:</span>
                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                    {manuallyEditedParticipants.size} of {currentParticipants.length}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={autoSplitAmounts}
                disabled={fields.length === 0}
                className="flex flex-col items-center py-4 h-auto border-blue-200 hover:border-blue-300 hover:bg-blue-50"
              >
                <Shuffle className="w-5 h-5 text-blue-600 mb-1" />
                <span className="text-sm font-medium text-blue-700">Equal Split</span>
                <span className="text-xs text-blue-600">Reset all amounts</span>
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={redistributeRemaining}
                disabled={!canRedistribute}
                className="flex flex-col items-center py-4 h-auto border-orange-200 hover:border-orange-300 hover:bg-orange-50"
              >
                <Calculator className="w-5 h-5 text-orange-600 mb-1" />
                <span className="text-sm font-medium text-orange-700">Redistribute</span>
                <span className="text-xs text-orange-600">
                  {unEditedCount === 0 ? 'All edited' : `${unEditedCount} unedited`}
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Participants Form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Participants ({fields.length})
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ name: '', phone: '', amountToPay: '0' })}
                  className="flex items-center gap-1"
                >
                  <UserPlus className="w-4 h-4" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {fields.map((field, index) => {
                  const isOwner = index === 0;
                  const isManuallyEdited = manuallyEditedParticipants.has(index);
                  
                  return (
                    <div key={field.id} className={`relative rounded-xl border-2 p-4 transition-all ${
                      isManuallyEdited ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 bg-white'
                    } ${isOwner ? 'ring-2 ring-yellow-200' : ''}`}>
                      {/* Remove Button */}
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
                          className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-50 w-8 h-8 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {/* Status Badges */}
                      <div className="flex items-center gap-2 mb-3">
                        {isOwner && (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                            <Crown className="w-3 h-3 mr-1" />
                            Bill Owner
                          </Badge>
                        )}
                        {isManuallyEdited && (
                          <Badge variant="outline" className="bg-blue-100 border-blue-300 text-blue-700">
                            Manually Edited
                          </Badge>
                        )}
                      </div>

                      {/* Form Fields */}
                      <div className="space-y-3">
                        {/* Name Field */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            Full Name
                          </Label>
                          <Input
                            {...form.register(`participants.${index}.name`)}
                            placeholder="Enter participant's name"
                            className="mt-1 h-11 text-base"
                          />
                        </div>

                        {/* Phone Field */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            Phone Number
                          </Label>
                          <Input
                            {...form.register(`participants.${index}.phone`)}
                            placeholder="+84 xxx xxx xxx"
                            className="mt-1 h-11 text-base"
                          />
                        </div>

                        {/* Amount Field */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            Amount (VND)
                          </Label>
                          <FormattedNumberInput
                            value={form.watch(`participants.${index}.amountToPay`) || ''}
                            onChange={(value) => handleAmountChange(index, value)}
                            placeholder="0"
                            className={`mt-1 h-11 text-base font-semibold ${
                              isOwner ? 'text-primary' : 'text-gray-900'
                            } ${isManuallyEdited ? 'border-blue-300 bg-blue-50' : ''}`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Empty State */}
                {fields.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">No Participants Yet</h4>
                    <p className="text-gray-600 mb-4">Add people to split this bill</p>
                    <Button
                      type="button"
                      onClick={() => append({ name: '', phone: '', amountToPay: '0' })}
                      className="bg-primary text-white"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add First Participant
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-4">
            <Button
              type="submit"
              className="w-full bg-primary text-white py-4 text-lg font-semibold hover:bg-primary/90"
              disabled={createParticipantsMutation.isPending || !isBalanced || fields.length === 0}
            >
              {createParticipantsMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving Changes...
                </div>
              ) : (
                'Continue to Bill Details'
              )}
            </Button>
            
            {/* Balance Warning */}
            {!isBalanced && fields.length > 0 && (
              <Card className={`border-2 ${
                remaining > 0 ? 'border-orange-200 bg-orange-50' : 'border-red-200 bg-red-50'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                      remaining > 0 ? 'text-orange-600' : 'text-red-600'
                    }`} />
                    <div>
                      <h4 className={`font-semibold ${
                        remaining > 0 ? 'text-orange-800' : 'text-red-800'
                      }`}>
                        {remaining > 0 ? 'Under-allocated' : 'Over-allocated'} by {formatCurrency(Math.abs(remaining))}
                      </h4>
                      <p className={`text-sm mt-1 ${
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
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}