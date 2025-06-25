import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Share2, Copy, Download, ExternalLink } from "lucide-react";
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
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-gray-600">Generating QR code...</span>
        </CardContent>
      </Card>
    );
  }

  if (qrQuery.error || !qrData) {
    return (
      <Card>
        <CardContent className="text-center p-8">
          <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-red-500 mb-2">Failed to generate QR code</p>
          <Button 
            onClick={() => qrQuery.refetch()}
            variant="outline"
            size="sm"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <QrCode className="w-5 h-5 mr-2" />
            Share Bill
          </div>
          <Badge variant="secondary" className="bg-primary text-white">
            {formatCurrency(parseFloat(qrData.totalAmount))}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-6">
        <div className="flex flex-col items-center space-y-3">
          <div className="p-4 bg-white rounded-xl shadow-sm border">
            <img 
              src={qrData.qrCodeUrl} 
              alt={`QR Code for ${qrData.billName} bill sharing`}
              className="max-w-full h-auto"
              style={{ width: '250px', height: '250px' }}
            />
          </div>
          
          <div className="text-center">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {qrData.billName}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Scan to join this bill split
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          <Button 
            onClick={shareLink}
            className="w-full bg-primary hover:bg-primary/90 text-white"
            size="lg"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Link
          </Button>
          
          <div className="grid grid-cols-3 gap-2">
            <Button 
              onClick={copyToClipboard}
              variant="outline"
              size="sm"
              className="border-primary text-primary hover:bg-primary/10"
            >
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </Button>
            
            <Button 
              onClick={downloadQR}
              variant="outline"
              size="sm"
              className="border-primary text-primary hover:bg-primary/10"
            >
              <Download className="w-4 h-4 mr-1" />
              Save
            </Button>

            <Button 
              onClick={openLink}
              variant="outline"
              size="sm"
              className="border-primary text-primary hover:bg-primary/10"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Open
            </Button>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-800 rounded break-all">
          {qrData.shareUrl}
        </div>
      </CardContent>
    </Card>
  );
}
