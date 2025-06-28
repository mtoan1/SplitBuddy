import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Share2, Copy, Download, ExternalLink, Users, DollarSign, Smartphone, Link, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

interface QRCodeDisplayProps {
  billId: string;
}

export default function QRCodeDisplay({ billId }: QRCodeDisplayProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
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
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
    <div className="w-full space-y-8">
      {/* Section Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-2">
          <QrCode className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Share with participants
          </h3>
        </div>
        <div className="flex items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">{qrData.billName}</span>
          <span>•</span>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            {formatCurrency(parseFloat(qrData.totalAmount))}
          </Badge>
        </div>
      </div>

      {/* QR Code Section */}
      <div className="flex flex-col items-center space-y-4">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <img 
            src={qrData.qrCodeUrl} 
            alt={`QR Code for ${qrData.billName}`}
            className="w-40 h-40 object-contain"
          />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Scan with any camera app
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Works on iPhone, Android, and tablets
          </p>
        </div>
      </div>

      {/* Primary Action */}
      <div className="space-y-3">
        <Button 
          onClick={shareLink}
          className="w-full bg-primary hover:bg-primary/90 text-white py-4 text-base font-semibold rounded-xl"
          size="lg"
        >
          <Share2 className="w-5 h-5 mr-2" />
          Share Bill Invitation
        </Button>
        
        {/* Secondary Actions */}
        <div className="grid grid-cols-3 gap-3">
          <Button 
            onClick={copyToClipboard}
            variant="outline"
            className="flex flex-col items-center py-3 h-auto border-gray-200 hover:border-primary/30 hover:bg-primary/5"
          >
            {copied ? (
              <CheckCircle className="w-4 h-4 text-green-500 mb-1" />
            ) : (
              <Copy className="w-4 h-4 text-gray-600 mb-1" />
            )}
            <span className="text-xs font-medium">
              {copied ? 'Copied!' : 'Copy Link'}
            </span>
          </Button>
          
          <Button 
            onClick={downloadQR}
            variant="outline"
            className="flex flex-col items-center py-3 h-auto border-gray-200 hover:border-primary/30 hover:bg-primary/5"
          >
            <Download className="w-4 h-4 text-gray-600 mb-1" />
            <span className="text-xs font-medium">Save QR</span>
          </Button>

          <Button 
            onClick={openLink}
            variant="outline"
            className="flex flex-col items-center py-3 h-auto border-gray-200 hover:border-primary/30 hover:bg-primary/5"
          >
            <ExternalLink className="w-4 h-4 text-gray-600 mb-1" />
            <span className="text-xs font-medium">Preview</span>
          </Button>
        </div>
      </div>

      {/* Share Link Details */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Link className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Direct Link
          </span>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400 font-mono break-all leading-relaxed">
            {qrData.shareUrl}
          </p>
        </div>
        
        {/* Features */}
        <div className="flex items-center justify-center gap-6 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Smartphone className="w-3 h-3" />
            <span>Mobile optimized</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>No app required</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            <span>Instant access</span>
          </div>
        </div>
      </div>
    </div>
  );
}