// app/predictions/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
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

// Simple linear trend calculation
const calculateTrend = (data: number[]) => {
  if (data.length < 2) return data;
  
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  
  data.forEach((y, x) => {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return data.map((_, i) => intercept + slope * i);
};

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

  // Process and format data for predictions
  const processedData = useMemo(() => {
    // Group financial data by month
    const monthlyFinances = data.financeRecords.reduce((acc, record) => {
      const date = new Date(record.created_at);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      acc[monthYear] = (acc[monthYear] || 0) + (record.amount_available || 0);
      return acc;
    }, {} as Record<string, number>);

    // Group expenses by month
    const monthlyExpenses = data.expenses.reduce((acc, expense) => {
      const date = new Date(expense.date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      acc[monthYear] = (acc[monthYear] || 0) + (expense.amount_spent || 0);
      return acc;
    }, {} as Record<string, number>);

    // Group sales by month
    const monthlySales: Record<string, number> = {};
    data.orders
      .filter(order => order.status === 'Approved')
      .forEach(order => {
        const date = new Date(order.created_at);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        const orderItems = data.orderItems.filter(oi => oi.order === order.id);
        const orderQuantity = orderItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
        
        monthlySales[monthYear] = (monthlySales[monthYear] || 0) + orderQuantity;
      });

    // Convert to arrays and sort by date
    const financeArray = Object.entries(monthlyFinances)
      .map(([monthYear, amount]) => ({
        monthYear,
        amount,
        date: new Date(monthYear)
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const expensesArray = Object.entries(monthlyExpenses)
      .map(([monthYear, amount]) => ({
        monthYear,
        amount,
        date: new Date(monthYear)
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const salesArray = Object.entries(monthlySales)
      .map(([monthYear, quantity]) => ({
        monthYear,
        quantity,
        date: new Date(monthYear)
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      finances: financeArray,
      expenses: expensesArray,
      sales: salesArray
    };
  }, [data]);

  // Generate trend data for charts
  const trendData = useMemo(() => {
    const financeTrend = calculateTrend(processedData.finances.map(d => d.amount));
    const expenseTrend = calculateTrend(processedData.expenses.map(d => d.amount));
    const salesTrend = calculateTrend(processedData.sales.map(d => d.quantity));
    
    return {
      finances: financeTrend,
      expenses: expenseTrend,
      sales: salesTrend
    };
  }, [processedData]);

  // Prepare chart data with consistent property names
  const financeChartData = processedData.finances.map((d, i) => ({
    date: d.monthYear,
    actual: d.amount,
    trend: trendData.finances[i]
  }));

  const expenseChartData = processedData.expenses.map((d, i) => ({
    date: d.monthYear,
    actual: d.amount,
    trend: trendData.expenses[i]
  }));

  const salesChartData = processedData.sales.map((d, i) => ({
    date: d.monthYear,
    actual: d.quantity,
    trend: trendData.sales[i]
  }));

  // Calculate current cash position
  const currentCash = useMemo(() => {
    const totalAvailable = data.financeRecords.reduce(
      (sum, record) => sum + (record.amount_available || 0), 0);
    const totalExpenses = data.expenses.reduce(
      (sum, expense) => sum + (expense.amount_spent || 0), 0);
    return totalAvailable - totalExpenses;
  }, [data.financeRecords, data.expenses]);

  // Calculate burn rate (average monthly expenses)
  const burnRate = useMemo(() => {
    if (processedData.expenses.length < 1) return 0;
    const totalExpenses = processedData.expenses.reduce((sum, e) => sum + e.amount, 0);
    return totalExpenses / processedData.expenses.length;
  }, [processedData.expenses]);

  // Calculate runway (how many months until funds run out)
  const runway = useMemo(() => {
    if (burnRate <= 0) return Infinity;
    return currentCash / burnRate;
  }, [currentCash, burnRate]);

  // Calculate growth rates
  const growthRates = useMemo(() => {
    if (processedData.finances.length < 2 || processedData.sales.length < 2) {
      return { financeGrowth: 0, salesGrowth: 0 };
    }
    
    const financeGrowth = 
      (processedData.finances[processedData.finances.length - 1].amount - 
       processedData.finances[0].amount) / 
      Math.max(1, processedData.finances[0].amount) * 100;
    
    const salesGrowth = 
      (processedData.sales[processedData.sales.length - 1].quantity - 
       processedData.sales[0].quantity) / 
      Math.max(1, processedData.sales[0].quantity) * 100;
    
    return {
      financeGrowth,
      salesGrowth
    };
  }, [processedData]);

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
        supabase.from('expenses').select('date, amount_spent, item').order('date'),
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

  // Find the last date in the historical data
  const lastHistoricalDate = processedData.finances.length > 0 
    ? processedData.finances[processedData.finances.length - 1].monthYear
    : '';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Financial Predictions Dashboard
        </h1>
        <p className="text-gray-600">Data-driven financial insights and trend analysis</p>
      </header>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-medium text-gray-700 mb-1">Current Cash</h3>
          <p className={`text-2xl font-bold ${
            currentCash >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {currentCash.toLocaleString()} UGX
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {currentCash >= 0 ? 'Healthy' : 'Critical'} position
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-medium text-gray-700 mb-1">Monthly Burn Rate</h3>
          <p className="text-2xl font-bold text-red-600">
            {burnRate.toLocaleString()} UGX
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Avg. monthly expenses
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-medium text-gray-700 mb-1">Runway</h3>
          <p className={`text-2xl font-bold ${
            runway >= 6 ? 'text-green-600' : runway >= 3 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {runway === Infinity ? '∞' : runway.toFixed(1)} months
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {runway >= 6 ? 'Comfortable' : runway >= 3 ? 'Monitor closely' : 'Immediate action needed'}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-medium text-gray-700 mb-1">Revenue Growth</h3>
          <p className={`text-2xl font-bold ${
            growthRates.financeGrowth >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {growthRates.financeGrowth.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {growthRates.financeGrowth >= 0 ? 'Growing' : 'Declining'} MoM
          </p>
        </div>
      </div>

      {/* Financial Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Cash Flow Trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Cash Flow Trend</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={financeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString()} UGX`, 
                    name === 'actual' ? 'Actual' : 'Trend'
                  ]}
                  labelFormatter={(label) => `Period: ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  name="Actual"
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="trend" 
                  name="Trend"
                  stroke="#10b981" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
                {lastHistoricalDate && (
                  <ReferenceLine 
                    x={lastHistoricalDate} 
                    stroke="#ef4444" 
                    label={{ 
                      value: 'Current', 
                      position: 'top',
                      fill: '#ef4444'
                    }} 
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>Trend analysis based on historical cash flow data. {growthRates.financeGrowth >= 0 ? 
              `Growing at ${growthRates.financeGrowth.toFixed(1)}% monthly` : 
              `Declining at ${Math.abs(growthRates.financeGrowth).toFixed(1)}% monthly`}</p>
          </div>
        </div>

        {/* Expense Trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Expense Trend</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={expenseChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString()} UGX`, 
                    name === 'actual' ? 'Actual' : 'Trend'
                  ]}
                  labelFormatter={(label) => `Period: ${label}`}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="actual" 
                  name="Actual"
                  stroke="#ef4444" 
                  fill="#fecaca"
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="trend" 
                  name="Trend"
                  stroke="#f59e0b" 
                  fill="#fef3c7"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
                {lastHistoricalDate && (
                  <ReferenceLine 
                    x={lastHistoricalDate} 
                    stroke="#ef4444" 
                    label={{ 
                      value: 'Current', 
                      position: 'top',
                      fill: '#ef4444'
                    }} 
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>Expense trend showing {burnRate > processedData.expenses[0]?.amount ? 
              'increasing' : 'decreasing'} monthly expenses.</p>
          </div>
        </div>
      </div>

      {/* Sales Analysis */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Sales Analysis</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      `${value.toLocaleString()} units`, 
                      name === 'actual' ? 'Actual' : 'Trend'
                    ]}
                    labelFormatter={(label) => `Period: ${label}`}
                  />
                  <Legend />
                  <Bar 
                    dataKey="actual" 
                    name="Actual Sales"
                    fill="#8b5cf6"
                  />
                  <Bar 
                    dataKey="trend" 
                    name="Trend"
                    fill="#a78bfa"
                    opacity={0.7}
                  />
                  {lastHistoricalDate && (
                    <ReferenceLine 
                      x={lastHistoricalDate} 
                      stroke="#8b5cf6" 
                      label={{ 
                        value: 'Current', 
                        position: 'top',
                        fill: '#8b5cf6'
                      }} 
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>Sales trend showing {growthRates.salesGrowth >= 0 ? 
                `growth of ${growthRates.salesGrowth.toFixed(1)}%` : 
                `decline of ${Math.abs(growthRates.salesGrowth).toFixed(1)}%`} month-over-month.</p>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Sales Insights</h3>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-1">Current Growth Rate</h4>
                <p className={`text-xl font-bold ${
                  growthRates.salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {growthRates.salesGrowth.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Month-over-month sales {growthRates.salesGrowth >= 0 ? 'growth' : 'decline'}
                </p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-800 mb-1">Peak Performance</h4>
                {salesChartData.length > 0 && (
                  <>
                    <p className="text-xl font-bold text-purple-600">
                      {Math.max(...salesChartData.map(s => s.actual)).toLocaleString()} units
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Highest monthly sales volume achieved
                    </p>
                  </>
                )}
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-800 mb-1">Recent Performance</h4>
                {salesChartData.length > 0 && (
                  <>
                    <p className={`text-xl font-bold ${
                      salesChartData[salesChartData.length - 1].actual >= 
                      (salesChartData[salesChartData.length - 2]?.actual || 0) ? 
                      'text-green-600' : 'text-red-600'
                    }`}>
                      {salesChartData[salesChartData.length - 1].actual.toLocaleString()} units
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Last month's sales volume
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Health */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Financial Health</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-1">Liquidity Ratio</h3>
            <p className={`text-2xl font-bold ${
              currentCash >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {(currentCash / (burnRate || 1)).toFixed(1)}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Months of operating cash available
            </p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-medium text-purple-800 mb-1">Expense Coverage</h3>
            <p className={`text-2xl font-bold ${
              (currentCash / (data.expenses.reduce((sum, e) => sum + (e.amount_spent || 0), 0) || 1)) >= 1 ? 'text-green-600' : 'text-red-600'
            }`}>
              {(currentCash / (data.expenses.reduce((sum, e) => sum + (e.amount_spent || 0), 0) || 1)).toFixed(1)}x
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Current cash vs. total expenses
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-800 mb-1">Growth Potential</h3>
            <p className={`text-2xl font-bold ${
              growthRates.financeGrowth >= 10 ? 'text-green-600' : 
              growthRates.financeGrowth >= 0 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {growthRates.financeGrowth.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Revenue growth rate
            </p>
          </div>
        </div>
        
        {/* Financial Health Alert */}
        <div className={`p-4 rounded-lg ${
          runway < 3 ? 'bg-red-50 border-l-4 border-red-400' :
          runway < 6 ? 'bg-yellow-50 border-l-4 border-yellow-400' :
          'bg-green-50 border-l-4 border-green-400'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {runway < 3 ? (
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              ) : runway < 6 ? (
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${
                runway < 3 ? 'text-red-800' : runway < 6 ? 'text-yellow-800' : 'text-green-800'
              }`}>
                {runway < 3 ? 'Critical Alert' : runway < 6 ? 'Warning' : 'Good Status'}
              </h3>
              <div className={`mt-2 text-sm ${
                runway < 3 ? 'text-red-700' : runway < 6 ? 'text-yellow-700' : 'text-green-700'
              }`}>
                <p>
                  {runway < 3 ? 
                    'Immediate action required: Cash runway is critically low.' :
                    runway < 6 ? 
                    'Monitor closely: Cash position may become tight in the near future.' :
                    'Healthy cash position detected. Current runway is sufficient.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
