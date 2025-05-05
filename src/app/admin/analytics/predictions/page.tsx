// app/predictions/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { createClient } from "@supabase/supabase-js";

interface FinanceRecord {
  created_at: string;
  amount_available: number;
}

interface ExpenseRecord {
  date: string;
  amount_spent: number;
  item: string;
}

interface Order {
  id: number;
  created_at: string;
  status: string;
}

interface OrderItem {
  order: number;
  quantity: number;
}

interface SupplyItem {
  purchase_date: string;
  balance: number;
}

export default function Predictions() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    financeRecords: [] as FinanceRecord[],
    expenses: [] as ExpenseRecord[],
    orders: [] as Order[],
    orderItems: [] as OrderItem[],
    supplyItems: [] as SupplyItem[]
  });

  // Calculate current cash position (Total Available - Total Expenses)
  const currentCash = useMemo(() => {
    const totalAvailable = data.financeRecords.reduce(
      (sum, record) => sum + (record.amount_available || 0), 0);
    const totalExpenses = data.expenses.reduce(
      (sum, expense) => sum + (expense.amount_spent || 0), 0);
    return totalAvailable - totalExpenses;
  }, [data.financeRecords, data.expenses]);

  // Calculate total sales volume from approved orders
  const totalSalesVolume = useMemo(() => {
    const approvedOrderIds = data.orders
      .filter(order => order.status === 'Approved')
      .map(order => order.id);
    
    return data.orderItems
      .filter(item => approvedOrderIds.includes(item.order))
      .reduce((sum, item) => sum + (item.quantity || 0), 0);
  }, [data.orders, data.orderItems]);

  // Find peak sales periods
  const peakSalesPeriods = useMemo(() => {
    const monthlySales: Record<string, number> = {};

    // Group sales by month
    data.orders
      .filter(order => order.status === 'Approved')
      .forEach(order => {
        const date = new Date(order.created_at);
        const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;
        
        const orderItems = data.orderItems.filter(oi => oi.order === order.id);
        const orderQuantity = orderItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
        
        monthlySales[monthYear] = (monthlySales[monthYear] || 0) + orderQuantity;
      });

    // Convert to array and sort by quantity
    return Object.entries(monthlySales)
      .map(([monthYear, quantity]) => ({
        monthYear,
        quantity
      }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [data.orders, data.orderItems]);

  // Find highest expense periods
  const highestExpensePeriods = useMemo(() => {
    const monthlyExpenses: Record<string, number> = {};

    // Group expenses by month
    data.expenses.forEach(expense => {
      const date = new Date(expense.date);
      const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;
      monthlyExpenses[monthYear] = (monthlyExpenses[monthYear] || 0) + (expense.amount_spent || 0);
    });

    // Convert to array and sort by amount
    return Object.entries(monthlyExpenses)
      .map(([monthYear, amount]) => ({
        monthYear,
        amount
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [data.expenses]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const [
        { data: financeRecords },
        { data: expenses },
        { data: orders },
        { data: orderItems },
        { data: supplyItems }
      ] = await Promise.all([
        supabase.from('finance').select('created_at, amount_available').order('created_at'),
        supabase.from('expenses').select('date, amount_spent, category').order('date'),
        supabase.from('order').select('id, created_at, status').order('created_at'),
        supabase.from('order_items').select('order, quantity'),
        supabase.from('supply_items').select('purchase_date, balance').order('purchase_date')
      ]);

      setData({
        financeRecords: financeRecords || [],
        expenses: expenses || [],
        orders: orders || [],
        orderItems: orderItems || [],
        supplyItems: supplyItems || []
      });
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Financial Predictions Dashboard
        </h1>
        <p className="text-gray-600">Data-driven financial insights and projections</p>
      </header>

      {/* Current Financial Position */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Current Financial Position</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-800 mb-1">Total Available Funds</h3>
            <p className="text-2xl font-bold">
              {data.financeRecords.reduce((sum, r) => sum + (r.amount_available || 0), 0).toLocaleString()} UGX
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Sum of all entries in finance table
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="font-medium text-red-800 mb-1">Total Expenses</h3>
            <p className="text-2xl font-bold">
              {data.expenses.reduce((sum, e) => sum + (e.amount_spent || 0), 0).toLocaleString()} UGX
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Sum of all entries in expenses table
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-1">Net Cash Position</h3>
            <p className={`text-2xl font-bold ${
              currentCash >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {currentCash.toLocaleString()} UGX
            </p>
            <p className={`text-sm mt-1 ${
              currentCash >= 0 ? 'text-gray-600' : 'text-red-600'
            }`}>
              {currentCash >= 0 
                ? 'Available funds exceed expenses'
                : 'Warning: Expenses exceed available funds'}
            </p>
          </div>
        </div>
      </div>

      {/* Sales and Expenses Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Sales Volume */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Sales Volume</h2>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-medium text-purple-800 mb-1">Total Approved Sales</h3>
            <p className="text-3xl font-bold">
              {totalSalesVolume.toLocaleString()} units
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Sum of quantities from all approved orders
            </p>
          </div>
          
          {peakSalesPeriods.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Peak Sales Periods</h3>
              <div className="space-y-2">
                {peakSalesPeriods.slice(0, 3).map((period, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="font-medium">{period.monthYear}</span>
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                      {period.quantity.toLocaleString()} units
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Expenses Analysis */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Expenses Analysis</h2>
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="font-medium text-red-800 mb-1">Total Expenses</h3>
            <p className="text-3xl font-bold">
              {data.expenses.reduce((sum, e) => sum + (e.amount_spent || 0), 0).toLocaleString()} UGX
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Sum of all expense records
            </p>
          </div>
          
          {highestExpensePeriods.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Highest Expense Periods</h3>
              <div className="space-y-2">
                {highestExpensePeriods.slice(0, 3).map((period, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="font-medium">{period.monthYear}</span>
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded">
                      {period.amount.toLocaleString()} UGX
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cash Flow Trends */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Cash Flow Trends</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Monthly Cash Flow */}
          <div>
            <h3 className="font-medium mb-2">Monthly Cash Flow</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Object.entries(
                    data.financeRecords.reduce((acc, record) => {
                      const date = new Date(record.created_at);
                      const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;
                      acc[monthYear] = (acc[monthYear] || 0) + (record.amount_available || 0);
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([monthYear, amount]) => ({
                    monthYear,
                    amount
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthYear" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} UGX`, 'Amount']} />
                  <Bar dataKey="amount" fill="#3b82f6" name="Funds Available" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Expenses */}
          <div>
            <h3 className="font-medium mb-2">Monthly Expenses</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Object.entries(
                    data.expenses.reduce((acc, expense) => {
                      const date = new Date(expense.date);
                      const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;
                      acc[monthYear] = (acc[monthYear] || 0) + (expense.amount_spent || 0);
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([monthYear, amount]) => ({
                    monthYear,
                    amount
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthYear" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} UGX`, 'Amount']} />
                  <Bar dataKey="amount" fill="#ef4444" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Working Capital */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Working Capital Analysis</h2>
        
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-1">Current Assets</h3>
            <p className="text-2xl font-bold">
              {data.financeRecords.reduce((sum, r) => sum + (r.amount_available || 0), 0).toLocaleString()} UGX
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="font-medium text-red-800 mb-1">Current Liabilities</h3>
            <p className="text-2xl font-bold">
              {data.expenses.reduce((sum, e) => sum + (e.amount_spent || 0), 0).toLocaleString()} UGX
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-800 mb-1">Working Capital</h3>
            <p className={`text-2xl font-bold ${
              currentCash >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {currentCash.toLocaleString()} UGX
            </p>
          </div>
        </div>

        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={[
                {
                  name: 'Assets',
                  value: data.financeRecords.reduce((sum, r) => sum + (r.amount_available || 0), 0)
                },
                {
                  name: 'Liabilities',
                  value: data.expenses.reduce((sum, e) => sum + (e.amount_spent || 0), 0)
                },
                {
                  name: 'Working Capital',
                  value: currentCash
                }
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value} UGX`, 'Amount']} />
              <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
