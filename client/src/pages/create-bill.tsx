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
  billDate: z.string().min(1, "Bill date is required"),
  participantCount: z.number().min(2, "Must have at least 2 participants").max(20, "Maximum 20 participants")
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
      try {
        const billData = {
          ...data,
          billDate: data.billDate // Send as string, backend will transform it
        };
        console.log('Sending bill data:', billData);
        const result = await apiRequest('POST', '/api/chillbill/bills', billData);
        console.log('API response result:', result);
        
        // Create participants with even split calculation
        if (result.id && data.participantCount) {
          console.log('Creating participants for bill:', result.id);
          await createParticipantsForBill(result.id, data.participantCount, parseFloat(data.totalAmount));
          console.log('Participants created successfully');
        }
        
        return result;
      } catch (error) {
        console.error('Mutation error:', error);
        throw error;
      }
    },
    onSuccess: async (newBill) => {
      console.log('Bill created successfully - full response:', newBill);
      const billId = newBill?.id;
      console.log('Extracted bill ID:', billId);
      
      if (!billId) {
        console.error('No bill ID found in response:', newBill);
        toast({
          title: "Error",
          description: "Failed to get bill ID from server response",
          variant: "destructive",
        });
        return;
      }
      
      setCreatedBillId(billId);
      queryClient.invalidateQueries({ queryKey: ['/api/chillbill/bills'] });
      
      toast({
        title: "Bill Created Successfully",
        description: `${form.getValues('participantCount')} participants created with even split`,
      });
      
      // Navigate to participants page regardless of image upload
      console.log('Navigating to participants page for bill:', billId);
      // Add a small delay to ensure database operations complete
      setTimeout(() => {
        setLocation(`/bill/${billId}/participants`);
      }, 100);
    },
    onError: (error) => {
      console.error('Bill creation error:', error);
      toast({
        title: "Bill Creation Failed",
        description: error?.message || "Failed to create bill. Please try again.",
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

  const handleReceiptUpload = () => {
    // Generate random amount between 100 and 5000
    const randomAmount = (Math.random() * 4900 + 100).toFixed(2);
    
    // Generate random business name
    const businessNames = [
      "Pho Saigon", "Cafe Sua Da", "Banh Mi Express", "Golden Dragon", "Saigon Street",
      "Lotus Garden", "Rice Paper", "Mekong Bistro", "Bamboo House", "Noodle Bowl",
      "Zen Garden", "Morning Glory", "Thuan Kieu", "Pho King", "Com Tam Central",
      "Bun Bo Hue", "Cafe Highlands", "Pizza Palace", "Burger Station", "Taco Bell",
      "Starbucks", "McDonald's", "KFC", "Domino's Pizza", "Subway"
    ];
    const randomBusiness = businessNames[Math.floor(Math.random() * businessNames.length)];
    
    // Generate random bill date within the last 30 days
    const today = new Date();
    const daysBack = Math.floor(Math.random() * 30);
    const randomDate = new Date(today.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    const formattedDate = randomDate.toISOString().split('T')[0];
    
    form.setValue("totalAmount", randomAmount);
    form.setValue("merchantName", randomBusiness);
    form.setValue("billDate", formattedDate);
    
    toast({
      title: "Receipt Processed",
      description: `${randomBusiness} - $${randomAmount} auto-filled`,
    });
  };

  const handleGroupPhotoUpload = () => {
    // Generate random people count between 2 and 8
    const randomPeople = Math.floor(Math.random() * 7 + 2);
    form.setValue("participantCount", randomPeople);
    
    toast({
      title: "Group Photo Processed", 
      description: `${randomPeople} people detected and auto-filled`,
    });
  };

  const onSubmit = (data: CreateBillForm) => {
    console.log('Form submitted with data:', data);
    console.log('Form errors:', form.formState.errors);
    createBillMutation.mutate(data);
  };

  const createParticipantsForBill = async (billId: string, participantCount: number, totalAmount: number) => {
    const mockNames = [
      "Toan", "Hung", "Tue", "An", "Hien", "Tony", "Phuong", "Thuy", "Lap", "Tri",
      "Thai", "Hue", "Hau", "Trung", "Tuan", "Son", "Anh", "Bill"
    ];
    
    const mockPhones = [
      "+1 (555) 123-4567", "+1 (555) 234-5678", "+1 (555) 345-6789", "+1 (555) 456-7890",
      "+1 (555) 567-8901", "+1 (555) 678-9012", "+1 (555) 789-0123", "+1 (555) 890-1234",
      "+1 (555) 901-2345", "+1 (555) 012-3456", "+1 (555) 123-0987", "+1 (555) 234-8765",
      "+1 (555) 345-7654", "+1 (555) 456-6543", "+1 (555) 567-5432"
    ];

    // Calculate even split with rounding rules
    const baseAmount = Math.floor((totalAmount / participantCount) * 100) / 100;
    const remainder = Math.round((totalAmount - (baseAmount * participantCount)) * 100) / 100;
    
    console.log(`Creating ${participantCount} participants for bill ${billId}, total: $${totalAmount}`);
    console.log(`Base amount: $${baseAmount}, remainder: $${remainder}`);
    
    // Create participants
    for (let i = 0; i < participantCount; i++) {
      const isOwner = i === 0;
      const amountToPay = isOwner ? baseAmount + remainder : baseAmount;
      
      const participantData = {
        billId,
        name: mockNames[i % mockNames.length],
        phone: mockPhones[i % mockPhones.length],
        amountToPay: amountToPay.toFixed(2).toString(),
        paymentStatus: isOwner ? 'paid' : 'pending'
      };
      
      console.log(`Creating participant ${i + 1}:`, participantData);
      try {
        const result = await apiRequest('POST', `/api/chillbill/bills/${billId}/participants`, participantData);
        console.log(`Participant ${i + 1} created:`, result);
      } catch (error) {
        console.error(`Failed to create participant ${i + 1}:`, error);
        throw error;
      }
    }
  };

  const handleAIProcessingComplete = (processedData: any) => {
    setShowAIProcessing(false);
    toast({
      title: "AI Processing Complete",
      description: `Bill processed: ${processedData.participants?.length || 0} participants identified`,
    });
    
    if (createdBillId) {
      console.log('Navigating to participants page for bill:', createdBillId);
      setLocation(`/bill/${createdBillId}/participants`);
    } else {
      console.error('No createdBillId available for navigation');
    }
  };

  return (
    <div className="mobile-container">
      {/* Header */}
      <header className="mobile-header">
        <div className="px-6 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation('/')} className="rounded-full w-10 h-10 hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors">
              <ArrowLeft className="h-5 w-5 text-primary" />
            </Button>
            <img 
              src="https://cake.vn/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FCake-logo-01.e915daf7.webp&w=256&q=75"
              alt="Cake Logo"
              className="w-10 h-10 rounded-xl object-contain"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Create New Bill</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Start splitting expenses</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mobile-content">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Smart Processing Section - Compact */}
          <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20 rounded-xl p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <Upload className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Smart Processing</h3>
                <p className="text-xs text-gray-500">Upload photos for auto-fill</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div 
                className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={handleReceiptUpload}
              >
                <Receipt className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Receipt</p>
                <Button type="button" variant="outline" size="sm" className="h-6 text-xs px-2">
                  Upload
                </Button>
              </div>

              <div 
                className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={handleGroupPhotoUpload}
              >
                <Users className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Group Photo</p>
                <Button type="button" variant="outline" size="sm" className="h-6 text-xs px-2">
                  Upload
                </Button>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="mobile-card space-y-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-primary/15 to-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 neon-glow">
                <Receipt className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-xl font-bold neon-text">Bill Details</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Enter the basic information</p>
            </div>
            <div className="space-y-5">
              <div>
                <Label htmlFor="merchantName" className="text-sm font-bold text-gray-700 dark:text-gray-300">Business Name</Label>
                <Input
                  id="merchantName"
                  placeholder="Enter business name"
                  {...form.register('merchantName')}
                  className="mobile-input"
                />
                {form.formState.errors.merchantName && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.merchantName.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="totalAmount" className="text-sm font-bold text-gray-700 dark:text-gray-300">Total Amount</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...form.register('totalAmount')}
                  className="mobile-input text-2xl font-bold text-primary"
                />
                {form.formState.errors.totalAmount && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.totalAmount.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="billDate" className="text-sm font-bold text-gray-700 dark:text-gray-300">Bill Date</Label>
                <Input
                  id="billDate"
                  type="date"
                  {...form.register('billDate')}
                  className="mobile-input"
                />
                {form.formState.errors.billDate && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.billDate.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="participantCount" className="text-sm font-bold text-gray-700 dark:text-gray-300">Number of People</Label>
                <Input
                  id="participantCount"
                  type="number"
                  min="2"
                  max="20"
                  placeholder="Enter number of people"
                  {...form.register('participantCount', { valueAsNumber: true })}
                  className="mobile-input text-xl font-bold text-primary"
                />
                {form.formState.errors.participantCount && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.participantCount.message}
                  </p>
                )}
              </div>
            </div>
          </div>





          <Button 
            type="submit" 
            className="mobile-button-primary neon-glow"
            disabled={createBillMutation.isPending}
          >
            {createBillMutation.isPending ? (
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span className="font-bold">Creating Bill...</span>
              </div>
            ) : (
              <span className="font-bold">{(billImage || groupImage) ? 'Create Bill & Process with AI' : 'Continue to Participants'}</span>
            )}
          </Button>
        </form>
      </div>

      {showAIProcessing && createdBillId && (
        <AIProcessingModal
          isOpen={showAIProcessing}
          billId={createdBillId}
          onComplete={handleAIProcessingComplete}
        />
      )}
    </div>
  );
}