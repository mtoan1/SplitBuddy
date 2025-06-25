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
        "flex items-center justify-between p-3 rounded-lg border transition-all",
        config.bgColor,
        selectable && "hover:border-primary hover:bg-primary hover:bg-opacity-5 cursor-pointer"
      )}
      onClick={onClick}
    >
      <div className="flex items-center space-x-3">
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", config.avatarColor)}>
          <span className="text-white font-medium text-sm">{initials}</span>
        </div>
        <div>
          <p className="font-medium text-text-primary">{name}</p>
          {phone && <p className="text-xs text-gray-500">{phone}</p>}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <div className="text-right">
          <p className={cn("font-semibold", config.textColor)}>{formatCurrency(amount)}</p>
          <div className={cn("flex items-center text-xs", config.textColor)}>
            <StatusIcon className="w-3 h-3 mr-1" />
            <span>{config.label}</span>
          </div>
          {participant.paidAt && (
            <div className="text-xs text-gray-500 mt-1">
              {formatDate(participant.paidAt)}
            </div>
          )}
        </div>
        {showPayButton && paymentStatus === 'pending' && onPayClick && (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onPayClick(participant.id);
            }}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <CreditCard className="w-3 h-3 mr-1" />
            Pay
          </Button>
        )}
      </div>
    </div>
  );
}
