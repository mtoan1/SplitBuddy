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
    <div className="mobile-container">
      {/* Header */}
      <header className="mobile-header">
        <div className="px-6 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-gradient-to-br from-primary via-primary to-neon-purple rounded-3xl flex items-center justify-center neon-glow">
              <Receipt className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold neon-text">ChillBill</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Split bills effortlessly</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full w-12 h-12 hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
          >
            <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </Button>
        </div>
      </header>

      <div className="mobile-content">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-5">
          <Button
            onClick={() => setLocation('/create-bill')}
            className="mobile-button-primary h-28 neon-glow"
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="w-10 h-10 bg-white/25 rounded-full flex items-center justify-center">
                <Plus className="h-6 w-6" />
              </div>
              <span className="text-sm font-bold">New Bill</span>
            </div>
          </Button>
          
          <Button
            onClick={() => setLocation('/bills')}
            className="mobile-button-secondary h-28"
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">My Bills</span>
            </div>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="mobile-card py-6">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-gradient-to-br from-neon-yellow/20 to-neon-yellow/10 rounded-3xl flex items-center justify-center">
                <Clock className="w-6 h-6" style={{ color: 'hsl(var(--neon-yellow))' }} />
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {bills.filter((bill: any) => bill.status === 'active').length}
                </p>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Active</p>
              </div>
            </div>
          </div>

          <div className="mobile-card py-6">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-3xl flex items-center justify-center">
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

          <div className="mobile-card py-6">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-gradient-to-br from-neon-green/20 to-neon-green/10 rounded-3xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6" style={{ color: 'hsl(var(--neon-green))' }} />
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
            <Button variant="ghost" size="sm" onClick={() => setLocation('/bills')} className="text-primary font-bold hover:bg-primary/10 rounded-full px-4 transition-colors">
              View All
            </Button>
          </div>
          
          <div className="space-y-5">
            {recentBills.length === 0 ? (
              <div className="mobile-card p-12 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Receipt className="h-12 w-12 text-primary/50" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">No bills yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-8">Start by creating your first bill split</p>
                <Button onClick={() => setLocation('/create-bill')} className="mobile-button-primary neon-glow">
                  Create Your First Bill
                </Button>
              </div>
            ) : (
              recentBills.map((bill: any) => (
                <div key={bill.id} className="mobile-card cursor-pointer hover:shadow-2xl transition-all hover:scale-[1.02] group">
                  <div 
                    className="flex items-center justify-between"
                    onClick={() => setLocation(`/bill/${bill.id}`)}
                  >
                    <div className="flex items-center space-x-5">
                      <div className="w-16 h-16 bg-gradient-to-br from-primary/15 to-neon-purple/15 rounded-3xl flex items-center justify-center group-hover:from-primary/25 group-hover:to-neon-purple/25 transition-colors">
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
                      } className="mt-2 px-4 py-1 rounded-full font-medium">
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