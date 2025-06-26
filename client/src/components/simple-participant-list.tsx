import { formatCurrency } from "@/lib/utils";

interface Participant {
  id: string;
  name: string;
  phone?: string;
  amountToPay: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'overdue';
}

interface SimpleParticipantListProps {
  participants: Participant[];
  onSelect?: (participantId: string) => void;
  showPayButton?: boolean;
  onPayClick?: (participantId: string) => void;
}

export default function SimpleParticipantList({ 
  participants, 
  onSelect, 
  showPayButton = false,
  onPayClick 
}: SimpleParticipantListProps) {
  return (
    <div className="bg-white border rounded-lg">
      {participants.map((participant, index) => (
        <div key={participant.id}>
          <div
            className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50"
            onClick={() => onSelect?.(participant.id)}
          >
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">{participant.name}</div>
              {participant.phone && (
                <div className="text-xs text-gray-500">{participant.phone}</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">
                {formatCurrency(parseFloat(participant.amountToPay))}
              </span>
              {showPayButton && participant.paymentStatus === 'pending' && onPayClick && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPayClick(participant.id);
                  }}
                  className="bg-primary text-white px-2 py-1 rounded text-xs hover:bg-primary/90"
                >
                  Pay
                </button>
              )}
            </div>
          </div>
          {index < participants.length - 1 && (
            <div className="border-b border-gray-100"></div>
          )}
        </div>
      ))}
    </div>
  );
}