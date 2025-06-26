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
        "flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all duration-200",
        config.bgColor,
        selectable && "hover:border-primary hover:shadow-md cursor-pointer"
      )}
      onClick={onClick}
    >
      <div className="flex items-center space-x-2.5 flex-1 min-w-0">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          config.avatarColor
        )}>
          <span className="text-white font-bold text-xs">{initials}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-900 text-sm truncate">{name}</p>
            <div className="flex items-center space-x-2 ml-2">
              <p className={cn("font-bold text-sm", config.textColor)}>{formatCurrency(amount)}</p>
              {showPayButton && paymentStatus === 'pending' && onPayClick && (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPayClick(participant.id);
                  }}
                  className="bg-primary text-white hover:bg-primary/90 h-6 px-2 text-xs"
                >
                  Pay
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <div className="flex items-center">
              {phone && <p className="text-xs text-gray-500 truncate mr-2">{phone}</p>}
            </div>
            <div className={cn("flex items-center text-xs", config.textColor)}>
              <StatusIcon className="w-3 h-3 mr-1" />
              <span>{config.label}</span>
              {participant.paidAt && (
                <span className="text-gray-400 ml-1">• {formatDate(participant.paidAt)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
