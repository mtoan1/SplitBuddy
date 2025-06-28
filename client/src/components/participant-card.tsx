import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, XCircle, AlertTriangle, CreditCard, Bell } from "lucide-react";
import { formatCurrency, getInitials, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ParticipantCardProps {
  participant: {
    id: string;
    name: string;
    phone?: string;
    amountToPay: string;
    paymentStatus: 'pending' | 'paid' | 'failed' | 'overdue';
    paidAt?: string;
    paymentMethod?: string;
    transactionId?: string;
  };
  onClick?: () => void;
  selectable?: boolean;
  showPayButton?: boolean;
  showRemindButton?: boolean;
  onPayClick?: (participantId: string) => void;
  onRemindClick?: (participantId: string, participantName: string) => void;
}

export default function ParticipantCard({ 
  participant, 
  onClick, 
  selectable = false, 
  showPayButton = false,
  showRemindButton = false,
  onPayClick,
  onRemindClick
}: ParticipantCardProps) {
  const { name, phone, amountToPay, paymentStatus } = participant;
  const amount = parseFloat(amountToPay || '0');

  return (
    <div
      className={cn(
        "flex items-center justify-between py-1 hover:bg-gray-50",
        selectable && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <div className="flex-1">
        <span className="text-sm font-medium">{name}</span>
        {phone && <span className="text-xs text-gray-500 ml-2">{phone}</span>}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{formatCurrency(amount)}</span>
        {showPayButton && paymentStatus === 'pending' && onPayClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPayClick(participant.id);
            }}
            className="bg-primary text-white px-1.5 py-0.5 rounded text-xs"
          >
            Pay
          </button>
        )}
        {showRemindButton && paymentStatus === 'pending' && onRemindClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemindClick(participant.id, participant.name);
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-1.5 py-0.5 rounded text-xs flex items-center gap-1"
          >
            <Bell className="w-3 h-3" />
            Remind
          </button>
        )}
      </div>
    </div>
  );
}