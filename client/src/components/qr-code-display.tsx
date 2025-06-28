import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Share2, Copy, Download, ExternalLink, Users, DollarSign, Smartphone, Link } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

interface QRCodeDisplayProps {
  billId: string;
}

export default function QRCodeDisplay({ billId }: QRCodeDisplayProps) {
  const { toast } = useToast();
  
  const qrQuery = useQuery({
    queryKey: ['/api/chillbill/bills', billId, 'qr-code'],
    queryFn: () => apiRequest('GET', `/api/chillbill/bills/${billId}/qr-code`),
    enabled: !!billId,
  });

  const qrData = qrQuery.data;

  const copyToClipboard = async () => {
    if (qrData?.shareUrl) {
      try {
        await navigator.clipboard.writeText(qrData.shareUrl);
        toast({
          title: "Link Copied!",
          description: "Share link has been copied to clipboard",
        });
      } catch (err) {
        toast({
          title: "Copy Failed",
          description: "Unable to copy link to clipboard",
          variant: "destructive",
        });
      }
    }
  };

  const shareLink = async () => {
    if (qrData?.shareUrl && navigator.share) {
      try {
        await navigator.share({
          title: `Join Bill Split - ${qrData.billName}`,
          text: `You've been invited to join a bill split for ${qrData.billName} (${formatCurrency(parseFloat(qrData.totalAmount))})`,
          url: qrData.shareUrl,
        });
      } catch (err) {
        // Fallback to copy
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const downloadQR = () => {
    if (qrData?.qrCodeUrl) {
      const link = document.createElement('a');
      link.download = `${qrData.billName}-bill-qr.png`;
      link.href = qrData.qrCodeUrl;
      link.click();
      
      toast({
        title: "QR Code Downloaded",
        description: "QR code image saved to your device",
      });
    }
  };

  const openLink = () => {
    if (qrData?.shareUrl) {
      window.open(qrData.shareUrl, '_blank');
    }
  };

  if (qrQuery.isLoading) {
    return (
      <div className="w-full py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
          <span className="text-gray-600 dark:text-gray-400">Generating QR code...</span>
        </div>
      </div>
    );
  }

  if (qrQuery.error || !qrData) {
    return (
      <div className="w-full py-8">
        <div className="text-center">
          <QrCode className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 mb-4 font-medium">Failed to generate QR code</p>
          <Button 
            onClick={() => qrQuery.refetch()}
            variant="outline"
            size="sm"
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <QrCode className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Share with participants
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {qrData.billName} • {formatCurrency(parseFloat(qrData.totalAmount))}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - Flat Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        
        {/* QR Code */}
        <div className="flex flex-col items-center space-y-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <img 
              src={qrData.qrCodeUrl} 
              alt={`QR Code for ${qrData.billName}`}
              className="w-32 h-32 object-contain"
            />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Scan to join
            </p>
            <p className="text-xs text-gray-500">
              Works on any device
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <Button 
            onClick={shareLink}
            className="w-full bg-primary hover:bg-primary/90 text-white py-3 font-semibold"
            size="lg"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Invitation
          </Button>
          
          <div className="grid grid-cols-3 gap-2">
            <Button 
              onClick={copyToClipboard}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <Copy className="w-3 h-3 mr-1" />
              Copy
            </Button>
            
            <Button 
              onClick={downloadQR}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              Save
            </Button>

            <Button 
              onClick={openLink}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Open
            </Button>
          </div>
        </div>

        {/* Share Link */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Link className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Direct Link
            </span>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-600 dark:text-gray-400 font-mono break-all">
              {qrData.shareUrl}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Smartphone className="w-3 h-3" />
              <span>Mobile friendly</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>No app required</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}