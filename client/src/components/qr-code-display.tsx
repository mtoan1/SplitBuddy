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
      <div className="w-full bg-gradient-to-br from-primary/8 to-secondary/8 rounded-2xl p-6 border border-primary/15">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
          <span className="text-gray-600 dark:text-gray-400">Generating QR code...</span>
        </div>
      </div>
    );
  }

  if (qrQuery.error || !qrData) {
    return (
      <div className="w-full bg-gradient-to-br from-red/5 to-red/10 rounded-2xl p-6 border border-red/20">
        <div className="text-center py-8">
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
    <div className="w-full bg-gradient-to-br from-primary/8 to-secondary/8 rounded-2xl border border-primary/15 overflow-hidden">
      {/* Header with Bill Info */}
      <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm px-6 py-4 border-b border-primary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
              <QrCode className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {qrData.billName}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Share with participants
              </p>
            </div>
          </div>
          <Badge className="bg-primary text-white font-semibold px-3 py-1 text-sm">
            {formatCurrency(parseFloat(qrData.totalAmount))}
          </Badge>
        </div>
      </div>

      <div className="p-6">
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          
          {/* QR Code Section */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="p-4 bg-white rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
                <img 
                  src={qrData.qrCodeUrl} 
                  alt={`QR Code for ${qrData.billName}`}
                  className="w-40 h-40 object-contain"
                />
              </div>
              {/* QR Code Badge */}
              <div className="absolute -bottom-2 -right-2 bg-primary text-white rounded-full p-2">
                <Smartphone className="w-4 h-4" />
              </div>
            </div>
            
            <div className="text-center mt-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Scan to Join
              </p>
              <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                <Users className="w-3 h-3" />
                <span>Works on any device</span>
              </div>
            </div>
          </div>

          {/* Actions Section */}
          <div className="space-y-4">
            {/* Primary Share Button */}
            <Button 
              onClick={shareLink}
              className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-xl font-semibold text-base shadow-lg hover:shadow-xl transition-all"
              size="lg"
            >
              <Share2 className="w-5 h-5 mr-3" />
              Share Invitation
            </Button>
            
            {/* Quick Actions Grid */}
            <div className="grid grid-cols-3 gap-3">
              <Button 
                onClick={copyToClipboard}
                variant="outline"
                className="border-primary/30 text-primary hover:bg-primary/10 rounded-xl py-3 flex flex-col items-center gap-1"
              >
                <Copy className="w-4 h-4" />
                <span className="text-xs">Copy</span>
              </Button>
              
              <Button 
                onClick={downloadQR}
                variant="outline"
                className="border-primary/30 text-primary hover:bg-primary/10 rounded-xl py-3 flex flex-col items-center gap-1"
              >
                <Download className="w-4 h-4" />
                <span className="text-xs">Save</span>
              </Button>

              <Button 
                onClick={openLink}
                variant="outline"
                className="border-primary/30 text-primary hover:bg-primary/10 rounded-xl py-3 flex flex-col items-center gap-1"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-xs">Open</span>
              </Button>
            </div>

            {/* Share Link Display */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Link className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Share Link
                </span>
              </div>
              <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                <p className="text-xs text-gray-600 dark:text-gray-400 font-mono break-all leading-relaxed">
                  {qrData.shareUrl}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 pt-4 border-t border-primary/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Smartphone className="w-4 h-4 text-primary" />
              <span>Scan with phone camera</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Share2 className="w-4 h-4 text-primary" />
              <span>Or share the link directly</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}