'use client';

import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function LedgerPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center shadow-lg p-4 rounded-lg bg-blue-100 dark:bg-gray-800 dark:text-white">Ledger Management</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Ledger Card */}
        <Card 
          className="cursor-pointer bg-gray-50 hover:bg-gray-100 shadow-md hover:shadow-lg transition-all duration-200"
          onClick={() => router.push('/admin/ledgers/user')}
        >
          <CardHeader>
            <CardTitle>Marketer Ledger</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Track Marketer orders, payments, and pending balances.</p>
          </CardContent>
        </Card>

        {/* General Ledger Card */}
        <Card 
          className="cursor-pointer bg-gray-50 hover:bg-gray-100 shadow-md hover:shadow-lg transition-all duration-200"
          onClick={() => router.push('/admin/ledgers/general')}
        >
          <CardHeader>
            <CardTitle>General Ledger</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Monitor all financial transactions and revenue flow.</p>
          </CardContent>
        </Card>

        {/* Expenses Ledger Card */}
        <Card 
          className="cursor-pointer bg-gray-50 hover:bg-gray-100 shadow-md hover:shadow-lg transition-all duration-200"
          onClick={() => router.push('/admin/ledgers/expenses')}
        >
          <CardHeader>
            <CardTitle>Expenses Ledger</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Track company expenses like on materials, wages, and other costs.</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer bg-gray-50 hover:bg-gray-100 shadow-md hover:shadow-lg transition-all duration-200"
          onClick={() => router.push('/admin/ledgers/accounts')}
        >
          <CardHeader>
            <CardTitle>Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Track amount received via various company accounts.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
