import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Share2, Copy, Download, ExternalLink, Users, DollarSign } from "lucide-react";
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
      <div className="w-full bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20 rounded-xl p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-gray-600">Generating QR code...</span>
        </div>
      </div>
    );
  }

  if (qrQuery.error || !qrData) {
    return (
      <div className="w-full bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20 rounded-xl p-6">
        <div className="text-center">
          <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-red-500 mb-2">Failed to generate QR code</p>
          <Button 
            onClick={() => qrQuery.refetch()}
            variant="outline"
            size="sm"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20 rounded-xl p-6">
      {/* Header Section */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <QrCode className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Share Bill</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Scan or share to invite participants
        </p>
      </div>

      {/* Bill Info Bar */}
      <div className="flex items-center justify-between bg-white/60 dark:bg-gray-800/60 rounded-xl p-3 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {qrData.billName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Total Amount
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-primary text-white font-semibold">
          {formatCurrency(parseFloat(qrData.totalAmount))}
        </Badge>
      </div>

      {/* QR Code Section */}
      <div className="flex flex-col items-center mb-6">
        <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-4">
          <img 
            src={qrData.qrCodeUrl} 
            alt={`QR Code for ${qrData.billName} bill sharing`}
            className="w-48 h-48 object-contain"
          />
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Scan with camera to join
          </p>
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
            <Users className="w-3 h-3" />
            <span>Works on any device</span>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="space-y-3">
        <Button 
          onClick={shareLink}
          className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-medium"
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
            className="border-primary/30 text-primary hover:bg-primary/10 rounded-lg"
          >
            <Copy className="w-3 h-3 mr-1" />
            Copy
          </Button>
          
          <Button 
            onClick={downloadQR}
            variant="outline"
            size="sm"
            className="border-primary/30 text-primary hover:bg-primary/10 rounded-lg"
          >
            <Download className="w-3 h-3 mr-1" />
            Save
          </Button>

          <Button 
            onClick={openLink}
            variant="outline"
            size="sm"
            className="border-primary/30 text-primary hover:bg-primary/10 rounded-lg"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Open
          </Button>
        </div>
      </div>
      
      {/* Share URL - Compact Display */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Share Link:</p>
        <p className="text-xs text-gray-700 dark:text-gray-300 font-mono break-all leading-relaxed">
          {qrData.shareUrl}
        </p>
      </div>
    </div>
  );
}