import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Receipt, Bell, Clock, CheckCircle, DollarSign } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function Homepage() {
  const [, setLocation] = useLocation();

  // Query for bills created by the current user
  const billsQuery = useQuery({
    queryKey: ['/api/chillbill/bills'],
    queryFn: () => apiRequest('GET', '/api/chillbill/bills?creatorId=550e8400-e29b-41d4-a716-446655440000'),
  });

  const bills = billsQuery.data || [];
  const recentBills = bills.slice(0, 3); // Show only first 3 bills

  return (
    <div className="max-w-sm mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60 border-b border-gray-200 dark:border-gray-800">
        <div className="px-6 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg">
              <Receipt className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ChillBill</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Split bills effortlessly</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full w-11 h-11 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Bell className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="px-6 py-8 space-y-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => setLocation('/create-bill')}
            className="h-24 bg-gradient-to-br from-primary to-primary/90 text-white rounded-3xl flex flex-col items-center justify-center space-y-3 shadow-xl hover:shadow-2xl transition-all hover:scale-105 border-0"
          >
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Plus className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold">New Bill</span>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setLocation('/bills')}
            className="h-24 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-3xl flex flex-col items-center justify-center space-y-3 shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <Receipt className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">My Bills</span>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {bills.filter((bill: any) => bill.status === 'active').length}
                </p>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Active</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {bills.filter((bill: any) => bill.status === 'created').length}
                </p>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Pending</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {bills.filter((bill: any) => bill.status === 'completed').length}
                </p>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Done</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Bills */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Bills</h2>
            <Button variant="ghost" size="sm" onClick={() => setLocation('/bills')} className="text-primary font-semibold hover:bg-primary/10 rounded-full px-4">
              View All
            </Button>
          </div>
          
          <div className="space-y-4">
            {recentBills.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 text-center shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Receipt className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No bills yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-8">Start by creating your first bill split</p>
                <Button onClick={() => setLocation('/create-bill')} className="w-full bg-gradient-to-r from-primary to-primary/90 text-white font-semibold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105">
                  Create Your First Bill
                </Button>
              </div>
            ) : (
              recentBills.map((bill: any) => (
                <div key={bill.id} className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-xl transition-all hover:scale-[1.02]">
                  <div 
                    className="flex items-center justify-between"
                    onClick={() => setLocation(`/bill/${bill.id}`)}
                  >
                    <div className="flex items-center space-x-5">
                      <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                        <Receipt className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white text-lg">{bill.merchantName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(bill.billDate)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-white text-xl">{formatCurrency(parseFloat(bill.totalAmount))}</p>
                      <Badge variant={
                        bill.status === 'completed' ? 'default' : 
                        bill.status === 'active' ? 'secondary' : 'outline'
                      } className="mt-2 px-3 py-1 rounded-full">
                        {bill.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Bottom Spacing */}
        <div className="pb-8"></div>
      </div>
    </div>
  );
}