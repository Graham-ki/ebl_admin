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
  total_amount: number;
}

interface OrderItem {
  order: number;
  product: number;
  quantity: number;
  created_at:string;
}

interface SupplyItem {
  purchase_date: string;
  balance: number;
  created_at:string;
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
        supabase.from('finance').select('date, amount_available,created_at').order('created_at',{ascending:false}),
        supabase.from('expenses').select('date, amount_spent, item').order('date',{ascending:false}),
        supabase.from('order').select('*').order('created_at',{ascending:false}),
        supabase.from('order_items').select('*'),
        supabase.from('supply_items').select('purchase_date, balance,created_at').order('created_at',{ascending:false})
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

  // Calculate current cash position
  const currentCash = useMemo(() => {
    const totalAvailable = data.financeRecords.reduce(
      (sum, record) => sum + (record.amount_available || 0), 0);
    const totalExpenses = data.expenses.reduce(
      (sum, expense) => sum + (expense.amount_spent || 0), 0);
    return totalAvailable - totalExpenses;
  }, [data.financeRecords, data.expenses]);

  // 1. Cash Flow Forecast Calculation
  const cashFlowForecast = useMemo(() => {
    // Combine finance and expenses to create daily cash records
    const dailyRecords: Record<string, number> = {};
    
    // Process finance records (additions to cash)
    data.financeRecords.forEach(record => {
      const dateStr = new Date(record.created_at).toISOString().split('T')[0];
      dailyRecords[dateStr] = (dailyRecords[dateStr] || 0) + record.amount_available;
    });
    
    // Process expenses (subtractions from cash)
    data.expenses.forEach(expense => {
      const dateStr = new Date(expense.date).toISOString().split('T')[0];
      dailyRecords[dateStr] = (dailyRecords[dateStr] || 0) - expense.amount_spent;
    });
    
    // Convert to array and sort by date
    const history = Object.entries(dailyRecords)
      .map(([date, amount]) => ({
        date,
        amount,
        type: 'actual'
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    let runningBalance = 0;
    const runningHistory = history.map(record => {
      runningBalance += record.amount;
      return {
        ...record,
        amount: runningBalance
      };
    });

    // Calculate average daily change (last 30 days)
    const recentHistory = runningHistory.slice(-30);
    const changes = [];
    for (let i = 1; i < recentHistory.length; i++) {
      changes.push(recentHistory[i].amount - recentHistory[i-1].amount);
    }
    const avgDailyChange = changes.length > 0 
      ? changes.reduce((sum, change) => sum + change, 0) / changes.length
      : 0;

    // Generate forecast
    const forecast = [];
    const today = new Date();
    const lastAmount = runningHistory.length > 0 
      ? runningHistory[runningHistory.length-1].amount 
      : currentCash;

    for (let i = 1; i <= 90; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Base projection
      let projectedAmount = lastAmount + (avgDailyChange * i);
      
      // Adjust for confirmed orders in the pipeline
      const orderAdjustment = data.orders
        .filter(order => order.status === 'Approved')
        .filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate > today && orderDate <= date;
        })
        .reduce((sum, order) => sum + order.total_amount, 0);

      forecast.push({
        date: dateStr,
        amount: projectedAmount + orderAdjustment,
        type: i <= 30 ? '30-day' : i <= 60 ? '60-day' : '90-day'
      });
    }

    return [...runningHistory.slice(-30), ...forecast];
  }, [data.financeRecords, data.expenses, data.orders, currentCash]);

  // 2. Seasonal Trend Analysis
  const seasonalTrends = useMemo(() => {
    const monthlyData: Record<string, { sales: number; expenses: number }> = {};

    // Process sales from orders
    data.orders.forEach(order => {
      const date = new Date(order.created_at);
      const month = date.toLocaleString('default', { month: 'long' });
      
      if (!monthlyData[month]) {
        monthlyData[month] = { sales: 0, expenses: 0 };
      }
      
      monthlyData[month].sales += order.total_amount;
    });

    // Process expenses
    data.expenses.forEach(expense => {
      const date = new Date(expense.date);
      const month = date.toLocaleString('default', { month: 'long' });
      
      if (!monthlyData[month]) {
        monthlyData[month] = { sales: 0, expenses: 0 };
      }
      
      monthlyData[month].expenses += expense.amount_spent;
    });

    // Convert to array format
    return Object.entries(monthlyData).map(([month, values]) => ({
      month,
      sales: values.sales,
      expenses: values.expenses
    }));
  }, [data.orders, data.expenses]);

  // 3. Working Capital Projections
  const workingCapitalProjection = useMemo(() => {
    const currentLiabilities = data.supplyItems.reduce(
      (sum, item) => sum + (item.balance || 0), 0);
    
    // Project for next 12 months
    const projection = [];
    const today = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(today);
      date.setMonth(today.getMonth() + i);
      
      // Project assets based on cash flow forecast
      const cashFlowMonth = cashFlowForecast
        .filter(f => {
          const forecastDate = new Date(f.date);
          return forecastDate.getMonth() === date.getMonth() && 
                 forecastDate.getFullYear() === date.getFullYear();
        });
      
      const projectedAssets = cashFlowMonth.length > 0
        ? cashFlowMonth[cashFlowMonth.length - 1].amount
        : currentCash * (1 + (0.05 * (i + 1))); // Fallback: 5% monthly growth
      
      // Project liabilities reduction (3% monthly)
      const projectedLiabilities = currentLiabilities * (1 - (0.03 * (i + 1)));
      
      projection.push({
        month: date.toLocaleString('default', { month: 'short' }),
        assets: projectedAssets,
        liabilities: projectedLiabilities,
        workingCapital: projectedAssets - projectedLiabilities
      });
    }
    
    return {
      current: currentCash - currentLiabilities,
      projection
    };
  }, [currentCash, data.supplyItems, cashFlowForecast]);

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
        <p className="text-gray-600">Data-driven forecasts for better financial planning</p>
      </header>

      <div className="grid grid-cols-1 gap-8">
        {/* Current Financial Position */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Current Financial Position</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-800 mb-1">Available Cash</h3>
              <p className="text-2xl font-bold">
                {data.financeRecords.reduce((sum, r) => sum + r.amount_available, 0).toLocaleString()} UGX
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-medium text-red-800 mb-1">Total Expenses</h3>
              <p className="text-2xl font-bold">
                {data.expenses.reduce((sum, e) => sum + e.amount_spent, 0).toLocaleString()} UGX
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-1">Net Cash Position</h3>
              <p className={`text-2xl font-bold ${
                currentCash >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {currentCash.toLocaleString()} UGX
              </p>
            </div>
          </div>
        </div>

        {/* 1. Cash Flow Forecast */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Cash Flow Forecast (30/60/90 Days)</h2>
          </div>
          
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashFlowForecast}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`${Number(value).toLocaleString()} UGX`, 'Amount']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  name="Cash Flow"
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-1">30-Day Projection</h3>
              <p className="text-2xl font-bold">
                {cashFlowForecast
                  .filter(f => f.type === '30-day')
                  .slice(-1)[0]?.amount.toLocaleString() || 'N/A'} UGX
              </p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg">
              <h3 className="font-medium text-indigo-800 mb-1">60-Day Projection</h3>
              <p className="text-2xl font-bold">
                {cashFlowForecast
                  .filter(f => f.type === '60-day')
                  .slice(-1)[0]?.amount.toLocaleString() || 'N/A'} UGX
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-medium text-purple-800 mb-1">90-Day Projection</h3>
              <p className="text-2xl font-bold">
                {cashFlowForecast
                  .filter(f => f.type === '90-day')
                  .slice(-1)[0]?.amount.toLocaleString() || 'N/A'} UGX
              </p>
            </div>
          </div>
        </section>

        {/* 2. Seasonal Trend Analysis */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Seasonal Trend Analysis</h2>
          </div>
          
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seasonalTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`${Number(value).toLocaleString()} UGX`, 'Amount']}
                />
                <Legend />
                <Bar dataKey="sales" name="Sales" fill="#10b981" />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-6">
            <h3 className="font-medium mb-2">Seasonal Insights</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-green-800 font-medium mb-1">Peak Sales Month</h4>
                <p className="text-xl font-bold">
                  {seasonalTrends.reduce((max, curr) => 
                    curr.sales > max.sales ? curr : max
                  ).month}
                </p>
                <p className="text-sm">
                  {seasonalTrends.reduce((max, curr) => 
                    curr.sales > max.sales ? curr : max
                  ).sales.toLocaleString()} UGX
                </p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="text-red-800 font-medium mb-1">Highest Expenses Month</h4>
                <p className="text-xl font-bold">
                  {seasonalTrends.reduce((max, curr) => 
                    curr.expenses > max.expenses ? curr : max
                  ).month}
                </p>
                <p className="text-sm">
                  {seasonalTrends.reduce((max, curr) => 
                    curr.expenses > max.expenses ? curr : max
                  ).expenses.toLocaleString()} UGX
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Working Capital Projections */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Working Capital Projections</h2>
          </div>
          
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={workingCapitalProjection.projection}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`${Number(value).toLocaleString()} UGX`, 'Amount']}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="workingCapital" 
                  name="Working Capital" 
                  stroke="#8b5cf6" 
                  fill="#ddd6fe" 
                />
                <Area 
                  type="monotone" 
                  dataKey="assets" 
                  name="Assets" 
                  stroke="#3b82f6" 
                  fill="#dbeafe" 
                />
                <Area 
                  type="monotone" 
                  dataKey="liabilities" 
                  name="Liabilities" 
                  stroke="#ef4444" 
                  fill="#fee2e2" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-medium text-purple-800 mb-1">Current Working Capital</h3>
              <p className={`text-2xl font-bold ${
                workingCapitalProjection.current >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {workingCapitalProjection.current.toLocaleString()} UGX
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-1">Projected Growth (12mo)</h3>
              <p className="text-2xl font-bold">
                {(
                  (workingCapitalProjection.projection[11].workingCapital - 
                   workingCapitalProjection.current) / 
                  Math.abs(workingCapitalProjection.current) * 100
                ).toFixed(1)}%
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-medium text-red-800 mb-1">Potential Shortfall</h3>
              <p className="text-2xl font-bold">
                {Math.min(
                  ...workingCapitalProjection.projection.map(p => p.workingCapital)
                ).toLocaleString()} UGX
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
