import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, Users, Receipt } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBillSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import AIProcessingModal from "@/components/ai-processing-modal";

const createBillFormSchema = insertBillSchema.extend({
  totalAmount: z.string().min(1, "Total amount is required"),
  merchantName: z.string().min(1, "Merchant name is required"),
  billDate: z.string().min(1, "Bill date is required")
});

type CreateBillForm = z.infer<typeof createBillFormSchema>;

export default function CreateBill() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [billImage, setBillImage] = useState<File | null>(null);
  const [groupImage, setGroupImage] = useState<File | null>(null);
  const [showAIProcessing, setShowAIProcessing] = useState(false);
  const [createdBillId, setCreatedBillId] = useState<string | null>(null);

  const form = useForm<CreateBillForm>({
    resolver: zodResolver(createBillFormSchema),
    defaultValues: {
      creatorId: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID for demo
      totalAmount: '',
      merchantName: '',
      billDate: new Date().toISOString().split('T')[0],
      status: 'created',
      splitMethod: 'equal'
    }
  });

  const createBillMutation = useMutation({
    mutationFn: async (data: CreateBillForm) => {
      const billData = {
        ...data,
        billDate: data.billDate // Send as string, backend will transform it
      };
      console.log('Sending bill data:', billData);
      return apiRequest('POST', '/api/chillbill/bills', billData);
    },
    onSuccess: async (newBill) => {
      setCreatedBillId(newBill.id);
      
      // Always show success message first
      toast({
        title: "Bill Created",
        description: "Your bill has been created successfully!",
      });
      
      // If images were uploaded, start AI processing, otherwise go directly to bill page
      if (billImage || groupImage) {
        setShowAIProcessing(true);
      } else {
        // No images uploaded, redirect to manual participant addition
        setTimeout(() => {
          setLocation(`/bill/${newBill.id}/add-participants`);
        }, 1000);
      }
    },
    onError: (error) => {
      console.error('Bill creation error:', error);
      toast({
        title: "Error",
        description: "Failed to create bill. Please try again.",
        variant: "destructive",
      });
    }
  });

  const processBillImage = async (billId: string) => {
    try {
      await apiRequest('POST', `/api/chillbill/bills/${billId}/bill-image`, {});
    } catch (error) {
      console.error('Failed to process bill image:', error);
    }
  };

  const processGroupImage = async (billId: string) => {
    try {
      await apiRequest('POST', `/api/chillbill/bills/${billId}/group-image`, {});
    } catch (error) {
      console.error('Failed to process group image:', error);
    }
  };

  const onSubmit = (data: CreateBillForm) => {
    console.log('Form submitted with data:', data);
    console.log('Form errors:', form.formState.errors);
    createBillMutation.mutate(data);
  };

  const handleAIProcessingComplete = (processedData: any) => {
    setShowAIProcessing(false);
    toast({
      title: "AI Processing Complete",
      description: `Bill processed: ${processedData.participants?.length || 0} participants identified`,
    });
    
    if (createdBillId) {
      setLocation(`/bill/${createdBillId}/detail`);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold text-text-primary ml-4">Create New Bill</h1>
        </div>

        {/* Bill Form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-text-primary">
                <Receipt className="w-5 h-5 mr-2" />
                Bill Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="merchantName">Restaurant/Merchant</Label>
                <Input
                  id="merchantName"
                  placeholder="e.g., Olive Garden"
                  {...form.register('merchantName')}
                />
                {form.formState.errors.merchantName && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.merchantName.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="totalAmount">Total Amount ($)</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...form.register('totalAmount')}
                />
                {form.formState.errors.totalAmount && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.totalAmount.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="billDate">Date</Label>
                <Input
                  id="billDate"
                  type="date"
                  {...form.register('billDate')}
                />
                {form.formState.errors.billDate && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.billDate.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Image Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-text-primary">
                <Upload className="w-5 h-5 mr-2" />
                Smart Processing (Optional)
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Skip this section to create your bill manually, or upload images for AI assistance
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="billImage">Receipt Photo</Label>
                <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Receipt className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    Optional: Auto-extract bill details from receipt
                  </p>
                  <input
                    id="billImage"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setBillImage(e.target.files?.[0] || null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('billImage')?.click()}
                  >
                    Choose Receipt
                  </Button>
                  {billImage && (
                    <p className="text-sm text-green-600 mt-2">✓ {billImage.name}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="groupImage">Group Photo</Label>
                <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Users className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    Optional: Auto-identify participants from group photo
                  </p>
                  <input
                    id="groupImage"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setGroupImage(e.target.files?.[0] || null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('groupImage')?.click()}
                  >
                    Choose Photo
                  </Button>
                  {groupImage && (
                    <p className="text-sm text-green-600 mt-2">✓ {groupImage.name}</p>
                  )}
                </div>
              </div>
              
              {(billImage || groupImage) && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium">
                    🤖 AI will process your {billImage ? 'receipt' : ''}{billImage && groupImage ? ' and ' : ''}{groupImage ? 'group photo' : ''} after creation
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-primary text-white py-4 text-lg hover:bg-primary/90"
            disabled={createBillMutation.isPending}
          >
            {createBillMutation.isPending ? 'Creating Bill...' : (billImage || groupImage) ? 'Create Bill & Process with AI' : 'Create Bill & Generate QR Code'}
          </Button>
          
          <p className="text-center text-sm text-gray-600">
            {(billImage || groupImage) ? 
              'Bill will be created first, then AI will process your images' : 
              'You can add participants manually after creation'
            }
          </p>
        </form>

        {/* AI Processing Modal */}
        {showAIProcessing && createdBillId && (
          <AIProcessingModal
            isOpen={showAIProcessing}
            billId={createdBillId}
            onComplete={handleAIProcessingComplete}
          />
        )}
      </div>
    </div>
  );
}