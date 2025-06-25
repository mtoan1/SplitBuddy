import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Bell, Receipt, Home } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function BillDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: bills = [], isLoading: billsLoading } = useQuery({
    queryKey: ['/api/chillbill/bills'],
    queryFn: () => apiRequest('GET', '/api/chillbill/bills'),
  });

  if (billsLoading) {
    return (
      <div className="mobile-container">
        <header className="mobile-header">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation('/')}
                className="rounded-full w-10 h-10 hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
              >
                <Home className="h-5 w-5 text-primary" />
              </Button>
              <img 
                src="https://cake.vn/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FCake-logo-01.e915daf7.webp&w=256&q=75"
                alt="Cake Logo"
                className="w-10 h-10 rounded-xl object-contain"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Recent Bills</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Your bill splitting history</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-4 w-4" />
            </Button>
          </div>
        </header>
        
        <div className="p-4 space-y-6">
          <Card>
            <CardContent className="p-4">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-8 w-20 mb-4" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container">
      {/* Header */}
      <header className="mobile-header">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/')}
              className="rounded-full w-10 h-10 hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
            >
              <Home className="h-5 w-5 text-primary" />
            </Button>
            <img 
              src="https://cake.vn/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FCake-logo-01.e915daf7.webp&w=256&q=75"
              alt="Cake Logo"
              className="w-10 h-10 rounded-xl object-contain"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Bill Dashboard</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Demo Bill</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full w-10 h-10 hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
          >
            <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </Button>
        </div>
      </header>

      <div className="mobile-content">
        {bills.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Receipt className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No bills yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Create your first bill to start splitting expenses with friends</p>
            <Button 
              onClick={() => setLocation('/create-bill')}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Bill
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {bills.map((bill: any) => {
              const totalAmount = parseFloat(bill.totalAmount);
              return (
                <Card 
                  key={bill.id} 
                  className="mobile-card cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  onClick={() => setLocation(`/bill/${bill.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary/15 to-primary/10 rounded-xl flex items-center justify-center">
                          <Receipt className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{bill.merchantName}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(bill.billDate)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(totalAmount)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{bill.status}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Split Method</span>
                      <span className="text-gray-900 dark:text-white font-medium capitalize">{bill.splitMethod}</span>
                    </div>
                    
                    {bill.status === 'created' && (
                      <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <p className="text-xs text-amber-700 dark:text-amber-300">Waiting for participants to be added</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="h-12 flex flex-col items-center justify-center space-y-1"
              onClick={() => setLocation('/create-bill')}
            >
              <Plus className="h-4 w-4" />
              <span className="text-xs">New Bill</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-12 flex flex-col items-center justify-center space-y-1"
              onClick={() => setLocation('/')}
            >
              <Home className="h-4 w-4" />
              <span className="text-xs">Home</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
