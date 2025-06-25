import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface QRCodeDisplayProps {
  billId: string;
}

export default function QRCodeDisplay({ billId }: QRCodeDisplayProps) {
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQRCode = async () => {
      try {
        const response = await fetch(`/api/chillbill/bills/${billId}/qr-code`);
        const data = await response.json();
        setQrCodeData(data.qrCodeDataUrl);
      } catch (error) {
        console.error('Failed to fetch QR code:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQRCode();
  }, [billId]);

  if (loading) {
    return (
      <div className="text-center py-6 bg-gray-50 rounded-lg">
        <Skeleton className="w-32 h-32 mx-auto mb-4 rounded-lg" />
        <Skeleton className="h-4 w-48 mx-auto mb-2" />
        <Skeleton className="h-3 w-64 mx-auto" />
      </div>
    );
  }

  return (
    <div className="text-center py-6 bg-gray-50 rounded-lg">
      <div className="w-32 h-32 mx-auto mb-4 bg-white rounded-lg shadow-sm flex items-center justify-center">
        {qrCodeData ? (
          <img src={qrCodeData} alt="QR Code" className="w-28 h-28 rounded-sm" />
        ) : (
          <div className="w-28 h-28 bg-gray-200 rounded-sm flex items-center justify-center text-gray-500">
            QR Code
          </div>
        )}
      </div>
      <h3 className="font-semibold text-text-primary mb-2">Scan to Join & Pay</h3>
      <p className="text-sm text-gray-600 px-4">
        Share this QR code with friends to let them select themselves and pay their share
      </p>
    </div>
  );
}
