'use client';

import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function LedgerPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center shadow-lg p-4 rounded-lg bg-blue-100 dark:bg-gray-800 dark:text-white">Stock Management</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Ledger Card */}
        <Card 
          className="cursor-pointer bg-gray-50 hover:bg-gray-100 shadow-md hover:shadow-lg transition-all duration-200"
          onClick={() => router.push('/admin/stock/materials')}
        >
          <CardHeader>
            <CardTitle>Materials</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Track materials used in production.</p>
          </CardContent>
        </Card>

        {/* General Ledger Card */}
        <Card 
          className="cursor-pointer bg-gray-50 hover:bg-gray-100 shadow-md hover:shadow-lg transition-all duration-200"
          onClick={() => router.push('/admin/stock/categories')}
        >
          <CardHeader>
            <CardTitle>Product categories</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Track product categories available for sale.</p>
          </CardContent>
        </Card>

        {/* Expenses Ledger Card */}
        <Card 
          className="cursor-pointer bg-gray-50 hover:bg-gray-100 shadow-md hover:shadow-lg transition-all duration-200"
          onClick={() => router.push('/admin/stock/products')}
        >
          <CardHeader>
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Track products available in stock.</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer bg-gray-50 hover:bg-gray-100 shadow-md hover:shadow-lg transition-all duration-200"
          onClick={() => router.push('/admin/stock/specifications')}
        >
          <CardHeader>
            <CardTitle> Product specifications</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Track product specifications. Contents and dimensions</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
