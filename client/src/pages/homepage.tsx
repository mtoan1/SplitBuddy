import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Receipt, Users, Clock, CheckCircle, XCircle } from "lucide-react";
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'active': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'active': return <Clock className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            ChillBill
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Split bills effortlessly with friends and colleagues
          </p>
        </div>

        {/* Quick Action */}
        <div className="text-center mb-8">
          <Button
            onClick={() => setLocation('/create-bill')}
            size="lg"
            className="bg-[#5BC5A7] hover:bg-[#4FADOA] text-white px-8 py-3 text-lg font-semibold"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create New Bill
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Receipt className="w-8 h-8 text-[#5BC5A7] mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Bills</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{bills.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Bills</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {bills.filter((bill: any) => bill.status === 'active' || bill.status === 'created').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {bills.filter((bill: any) => bill.status === 'completed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Bills */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Receipt className="w-5 h-5 mr-2" />
              Recent Bills
            </CardTitle>
          </CardHeader>
          <CardContent>
            {billsQuery.isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5BC5A7] mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading bills...</p>
              </div>
            ) : bills.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No bills found</p>
                <Button
                  onClick={() => setLocation('/create-bill')}
                  variant="outline"
                  className="border-[#5BC5A7] text-[#5BC5A7] hover:bg-[#5BC5A7] hover:text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Bill
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {bills.slice(0, 10).map((bill: any) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    onClick={() => setLocation(`/bill/${bill.id}`)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <Receipt className="w-6 h-6 text-[#5BC5A7]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {bill.merchantName}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(bill.billDate)} • {formatCurrency(parseFloat(bill.totalAmount))}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className={getStatusColor(bill.status)} variant="secondary">
                        <span className="flex items-center">
                          {getStatusIcon(bill.status)}
                          <span className="ml-1 capitalize">{bill.status}</span>
                        </span>
                      </Badge>
                    </div>
                  </div>
                ))}
                
                {bills.length > 10 && (
                  <div className="text-center pt-4">
                    <Button variant="outline" size="sm">
                      View All Bills ({bills.length})
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}