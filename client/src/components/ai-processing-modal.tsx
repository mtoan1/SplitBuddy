import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Brain, Users, Receipt } from "lucide-react";

interface AIProcessingModalProps {
  isOpen: boolean;
  billId: string;
  onComplete: (data: any) => void;
}

export default function AIProcessingModal({ isOpen, billId, onComplete }: AIProcessingModalProps) {
  const [step, setStep] = useState(1);
  const [progress, setProgress] = useState(0);
  const [billData, setBillData] = useState<any>(null);
  const [participantsData, setParticipantsData] = useState<any>(null);

  const steps = [
    { id: 1, title: "Processing bill image", description: "Extracting amount and merchant details", icon: Receipt },
    { id: 2, title: "Analyzing group photo", description: "Identifying participants using AI", icon: Users },
    { id: 3, title: "Calculating splits", description: "Dividing bill amount equally", icon: Brain },
    { id: 4, title: "Complete", description: "Ready to share QR code", icon: CheckCircle }
  ];

  useEffect(() => {
    if (!isOpen) return;

    const processBill = async () => {
      // Step 1: Process bill image
      setStep(1);
      setProgress(25);
      
      try {
        const billResponse = await fetch(`/api/chillbill/bills/${billId}/bill-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const billResult = await billResponse.json();
        setBillData(billResult.extractedData);
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Step 2: Process group image
        setStep(2);
        setProgress(50);
        
        const groupResponse = await fetch(`/api/chillbill/bills/${billId}/group-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const groupResult = await groupResponse.json();
        setParticipantsData(groupResult.participants);
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Step 3: Calculate splits
        setStep(3);
        setProgress(75);
        
        const splitResponse = await fetch(`/api/chillbill/bills/${billId}/split/equal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const splitResult = await splitResponse.json();
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 4: Complete
        setStep(4);
        setProgress(100);
        
        await new Promise(resolve => setTimeout(resolve, 800));
        
        onComplete({
          bill: billResult.extractedData,
          participants: groupResult.participants,
          split: splitResult
        });
        
      } catch (error) {
        console.error('AI processing failed:', error);
      }
    };

    processBill();
  }, [isOpen, billId, onComplete]);

  const currentStep = steps.find(s => s.id === step) || steps[0];
  const StepIcon = currentStep.icon;

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-center">
            <Brain className="w-5 h-5 mr-2 text-primary" />
            AI Processing
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Processing...</span>
              <span className="text-primary font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Current Step */}
          <div className="flex items-center space-x-4 p-4 bg-primary/5 rounded-lg">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <StepIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-text-primary">{currentStep.title}</h3>
              <p className="text-sm text-gray-600">{currentStep.description}</p>
            </div>
          </div>

          {/* Steps Progress */}
          <div className="space-y-3">
            {steps.map((stepItem) => {
              const StepItemIcon = stepItem.icon;
              const isCompleted = stepItem.id < step;
              const isCurrent = stepItem.id === step;
              
              return (
                <div
                  key={stepItem.id}
                  className={`flex items-center space-x-3 ${
                    isCompleted ? 'text-success' : isCurrent ? 'text-primary' : 'text-gray-400'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-success' : isCurrent ? 'bg-primary' : 'bg-gray-200'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4 text-white" />
                    ) : (
                      <StepItemIcon className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <span className="text-sm font-medium">{stepItem.title}</span>
                </div>
              );
            })}
          </div>

          {/* Extracted Data Preview */}
          {billData && (
            <div className="p-3 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Bill Details Extracted:</h4>
              <div className="text-sm text-green-700 space-y-1">
                <p><strong>Restaurant:</strong> {billData.merchantName}</p>
                <p><strong>Total:</strong> ${billData.totalAmount}</p>
                <p><strong>Items:</strong> {billData.items?.length || 0} detected</p>
              </div>
            </div>
          )}

          {/* Participants Preview */}
          {participantsData && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Participants Identified:</h4>
              <div className="text-sm text-blue-700">
                <p><strong>{participantsData.length} people</strong> detected in photo</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {participantsData.slice(0, 4).map((p: any, i: number) => (
                    <span key={i} className="px-2 py-1 bg-blue-100 rounded text-xs">
                      {p.name}
                    </span>
                  ))}
                  {participantsData.length > 4 && (
                    <span className="px-2 py-1 bg-blue-100 rounded text-xs">
                      +{participantsData.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}