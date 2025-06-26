import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, XCircle, AlertTriangle, CreditCard } from "lucide-react";
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
  onPayClick?: (participantId: string) => void;
}

export default function ParticipantCard({ 
  participant, 
  onClick, 
  selectable = false, 
  showPayButton = false,
  onPayClick 
}: ParticipantCardProps) {
  const { name, phone, amountToPay, paymentStatus } = participant;
  const initials = getInitials(name);
  const amount = parseFloat(amountToPay || '0');

  const getStatusConfig = () => {
    switch (paymentStatus) {
      case 'paid':
        return {
          bgColor: 'bg-green-50 border-green-100',
          avatarColor: 'bg-green-500',
          textColor: 'text-green-600',
          icon: CheckCircle,
          label: 'Paid'
        };
      case 'failed':
        return {
          bgColor: 'bg-red-50 border-red-100',
          avatarColor: 'bg-red-500',
          textColor: 'text-red-600',
          icon: XCircle,
          label: 'Failed'
        };
      case 'overdue':
        return {
          bgColor: 'bg-red-50 border-red-100',
          avatarColor: 'bg-red-500',
          textColor: 'text-red-600',
          icon: AlertTriangle,
          label: 'Overdue'
        };
      default:
        return {
          bgColor: 'bg-orange-50 border-orange-100',
          avatarColor: 'bg-orange-400',
          textColor: 'text-orange-600',
          icon: Clock,
          label: 'Pending'
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <div
      className={cn(
        "flex items-center justify-between py-2 hover:bg-gray-50/50 transition-colors",
        selectable && "cursor-pointer",
        paymentStatus === 'paid' && "text-green-600"
      )}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-1">
          <span className="font-medium text-sm truncate">{name}</span>
          {phone && <span className="text-xs text-gray-400">•</span>}
          {phone && <span className="text-xs text-gray-400 truncate">{phone}</span>}
        </div>
      </div>
      <div className="flex items-center space-x-2 ml-4">
        <span className="font-semibold text-sm">{formatCurrency(amount)}</span>
        {showPayButton && paymentStatus === 'pending' && onPayClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPayClick(participant.id);
            }}
            className="bg-primary text-white px-2 py-0.5 rounded text-xs font-medium hover:bg-primary/90"
          >
            Pay
          </button>
        )}
      </div>
    </div>
  );
}
