'use client';

import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LedgerPage() {
  const router = useRouter();
  const [summaryData, setSummaryData] = useState({
    totalAmountPaid: 0,
    totalAmountAvailable: 0,
    totalExpenses: 0,
    balanceForward: 0,
    lastUpdated: null as Date | null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        setLoading(true);
        
        // Get sum of amount_paid and amount_available from finance table (Cashier only)
        const { data: financeData } = await supabase
          .from('finance')
          .select('amount_paid, amount_available')
          .eq('submittedby', 'Cashier');

        // Get sum of expenses (Cashier only)
        const { data: expensesData } = await supabase
          .from('expenses')
          .select('amount_spent')
          .eq('submittedby', 'Cashier');

        // Get latest created_at date
        const { data: latestDate } = await supabase
          .from('finance')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1);

        if (financeData && expensesData) {
          const totalPaid = financeData.reduce((acc, entry) => acc + (entry.amount_paid || 0), 0);
          const totalAvailable = financeData.reduce((acc, entry) => acc + (entry.amount_available || 0), 0);
          const totalExpenses = expensesData.reduce((acc, entry) => acc + (entry.amount_spent || 0), 0);
          
          setSummaryData({
            totalAmountPaid: totalPaid,
            totalAmountAvailable: totalAvailable,
            totalExpenses: totalExpenses,
            balanceForward: totalAvailable - totalExpenses,
            lastUpdated: latestDate?.[0]?.created_at ? new Date(latestDate[0].created_at) : null
          });
        }
      } catch (error) {
        console.error('Error fetching summary data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSummaryData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Modern header with gradient */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Ledger Management
        </h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Track and manage all financial transactions and records
        </p>
      </div>

      {/* Enhanced card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-8">
        {/* Marketer Ledger Card */}
        <Card 
          className="cursor-pointer border border-gray-100 hover:border-blue-200 bg-white hover:bg-blue-50 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out group"
          onClick={() => router.push('/admin/ledgers/user')}
        >
          <CardHeader className="flex flex-row items-center space-x-4">
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-200 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-800">Marketer Ledger</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Track marketer orders and balances</p>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-blue-600 text-sm font-medium flex items-center">
              View details
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* General Ledger Card */}
        <Card 
          className="cursor-pointer border border-gray-100 hover:border-green-200 bg-white hover:bg-green-50 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out group"
          onClick={() => router.push('/admin/ledgers/general')}
        >
          <CardHeader className="flex flex-row items-center space-x-4">
            <div className="p-3 rounded-lg bg-green-100 text-green-600 group-hover:bg-green-200 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-800">General Ledger</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Monitor all financial transactions</p>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-green-600 text-sm font-medium flex items-center">
              View details
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Ledger Card */}
        <Card 
          className="cursor-pointer border border-gray-100 hover:border-red-200 bg-white hover:bg-red-50 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out group"
          onClick={() => router.push('/admin/ledgers/expenses')}
        >
          <CardHeader className="flex flex-row items-center space-x-4">
            <div className="p-3 rounded-lg bg-red-100 text-red-600 group-hover:bg-red-200 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-800">Expenses Ledger</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Track company costs and expenditures</p>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-red-600 text-sm font-medium flex items-center">
              View details
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* Accounts Card */}
        <Card 
          className="cursor-pointer border border-gray-100 hover:border-purple-200 bg-white hover:bg-purple-50 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out group"
          onClick={() => router.push('/admin/ledgers/accounts')}
        >
          <CardHeader className="flex flex-row items-center space-x-4">
            <div className="p-3 rounded-lg bg-purple-100 text-purple-600 group-hover:bg-purple-200 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-800">Accounts</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Track payments across accounts</p>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-purple-600 text-sm font-medium flex items-center">
              View details
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Section */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
          {/* Total Amount Paid */}
          <Card className="bg-blue-50 border-blue-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">
                Total Deposits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-800">
                {formatCurrency(summaryData.totalAmountPaid)}
              </p>
            </CardContent>
          </Card>
          {/* Total Expenses */}
          <Card className="bg-red-50 border-red-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">
                Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-800">
                {formatCurrency(summaryData.totalExpenses)}
              </p>
            </CardContent>
          </Card>

          {/* Balance Forward */}
          <Card className="bg-purple-50 border-purple-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-600">
                Balance Forward
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-800">
                {formatCurrency(summaryData.balanceForward)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Last updated: {summaryData.lastUpdated ? 
                  summaryData.lastUpdated.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  }) : 
                  'N/A'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
