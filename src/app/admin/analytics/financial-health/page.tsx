// app/financial-health/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from "@supabase/supabase-js";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { DateRangePicker } from '@/components/DateRangePicker';
import { Skeleton } from '@/components/Skeleton';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF6E83'];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type FinancialData = {
  liquidityRatio: number;
  cashFlowRatio: number;
  burnRate: number;
  runway: number;
  totalCashAvailable: number;
  totalLiabilities: number;
  expenseByItem: { name: string; value: number }[];
  liabilitiesStatus: { name: string; value: number }[];
  monthlyTrends: { month: string; inflow: number; outflow: number; net: number }[];
  largestExpenses: { name: string; value: number }[];
  recentTransactions: { description: string; amount: number; type: 'income' | 'expense'; date: string }[];
};

export default function FinancialHealth() {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(new Date().setMonth(new Date().getMonth() - 6)),
    end: new Date()
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Format dates for Supabase query
      const startDate = dateRange.start.toISOString().split('T')[0];
      const endDate = dateRange.end.toISOString().split('T')[0];

      // Fetch expenses within date range
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('item, amount_spent, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (expensesError) throw expensesError;

      // Fetch finance data within date range
      const { data: finance, error: financeError } = await supabase
        .from('finance')
        .select('amount_paid, amount_available, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (financeError) throw financeError;

      // Fetch liabilities
      const { data: liabilities, error: liabilitiesError } = await supabase
        .from('supply_items')
        .select('total_cost, amount_paid, balance, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (liabilitiesError) throw liabilitiesError;

      // Process data
      const processedData = processFinancialData(expenses, finance, liabilities);
      setData(processedData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load financial data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const handleDateChange = (range: { start: Date; end: Date }) => {
    setDateRange(range);
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen p-6 bg-gray-50">
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 bg-gray-50">
        <div className="p-4 bg-white rounded-lg shadow">
          <div className="text-red-500">{error}</div>
          <button 
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
            <span className="text-2xl">💓</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 m-0">Financial Health</h1>
            <p className="text-gray-500 m-0 text-sm">
              {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}
            </p>
          </div>
        </div>
        <DateRangePicker onChange={handleDateChange} initialRange={dateRange} />
      </header>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <p>Refreshing data...</p>
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <MetricCard 
          title="Liquidity Ratio" 
          value={data?.liquidityRatio || 0} 
          idealRange="1.5-3" 
          isGood={(data?.liquidityRatio || 0) >= 1.5}
          description="Cash available vs current liabilities"
          loading={loading}
        />
        
        <MetricCard 
          title="Operating Cash Flow" 
          value={data?.cashFlowRatio || 0} 
          idealRange="≥1" 
          isGood={(data?.cashFlowRatio || 0) >= 1}
          description="Operating cash vs current liabilities"
          loading={loading}
        />
        
        <MetricCard 
          title="Monthly Burn Rate" 
          value={data?.burnRate || 0} 
          isCurrency={true}
          idealRange="Negative is good" 
          isGood={(data?.burnRate || 0) < 0}
          description="Net monthly cash consumption"
          loading={loading}
        />
        
        <MetricCard 
          title="Cash Runway" 
          value={data?.runway || 0} 
          unit="months"
          idealRange="6+ months" 
          isGood={(data?.runway || 0) >= 6}
          description="At current burn rate"
          loading={loading}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        {/* Cash Flow Trend */}
        <ChartCard title="Cash Flow Trend">
          {loading ? (
            <Skeleton className="h-[300px]" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data?.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 
                  value === 'inflow' ? 'Income' : value === 'outflow' ? 'Expenses' : 'Net']} />
                <Area type="monotone" dataKey="inflow" stroke="#4ade80" fill="#bbf7d0" name="Income" />
                <Area type="monotone" dataKey="outflow" stroke="#f87171" fill="#fecaca" name="Expenses" />
                <Area type="monotone" dataKey="net" stroke="#60a5fa" fill="#bfdbfe" name="Net" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Expenses Breakdown */}
        <ChartCard title="Expenses Breakdown">
          {loading ? (
            <Skeleton className="h-[300px]" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data?.expenseByItem}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {data?.expenseByItem.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        {/* Liabilities Status */}
        <ChartCard title="Liabilities Status">
          {loading ? (
            <Skeleton className="h-[300px]" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data?.liabilitiesStatus}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  <Cell fill="#4ade80" />
                  <Cell fill="#f87171" />
                </Pie>
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Recent Transactions */}
        <ChartCard title="Recent Transactions" className="lg:col-span-2">
          {loading ? (
            <Skeleton className="h-[300px]" />
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data?.recentTransactions.slice(0, 5).map((txn, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {new Date(txn.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {txn.description}
                      </td>
                      <td className={`px-4 py-2 text-right text-sm whitespace-nowrap ${
                        txn.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {txn.type === 'income' ? '+' : '-'}${Math.abs(txn.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Recommendations */}
      <ChartCard title="Actionable Insights">
        <div className="space-y-4">
          {data && (
            <>
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800">Cash Position</h4>
                <p className="text-sm text-blue-700">
                  Available cash: ${data.totalCashAvailable.toLocaleString()} | 
                  Liabilities: ${data.totalLiabilities.toLocaleString()}
                </p>
              </div>

              <ul className="list-disc pl-5 space-y-2 text-gray-700">
                {data.liquidityRatio < 1.5 && (
                  <li>Increase cash reserves to improve liquidity (current ratio: {data.liquidityRatio.toFixed(2)})</li>
                )}
                {data.cashFlowRatio < 1 && (
                  <li>Improve operating cash flow by increasing revenue or reducing expenses</li>
                )}
                {data.burnRate > 0 && (
                  <li>Reduce monthly burn rate (currently ${data.burnRate.toLocaleString()})</li>
                )}
                {data.runway < 6 && (
                  <li>Extend cash runway beyond current {data.runway} months</li>
                )}
                {data.largestExpenses.length > 0 && (
                  <li>
                    Focus on top expenses: {data.largestExpenses.slice(0, 3).map((e, i) => (
                      <span key={i}>
                        {e.name} (${e.value.toLocaleString()}){i < 2 ? ', ' : ''}
                      </span>
                    ))}
                  </li>
                )}
              </ul>
            </>
          )}
        </div>
      </ChartCard>
    </div>
  );
}

// Helper function to process raw data
function processFinancialData(expenses: any[], finance: any[], liabilities: any[]): FinancialData {
  // Calculate totals
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount_spent || 0), 0);
  const totalIncome = finance.reduce((sum, f) => sum + (f.amount_paid || 0), 0);
  const totalCashAvailable = finance.reduce((sum, f) => sum + (f.amount_available || 0), 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + (l.balance || 0), 0);
  const totalPaidLiabilities = liabilities.reduce((sum, l) => sum + (l.amount_paid || 0), 0);

  // Group expenses by item
  const expenseByItem = expenses.reduce((acc, expense) => {
    const existing = acc.find(item => item.name === expense.item);
    if (existing) {
      existing.value += expense.amount_spent || 0;
    } else {
      acc.push({ name: expense.item, value: expense.amount_spent || 0 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  // Sort expenses descending
  expenseByItem.sort((a, b) => b.value - a.value);
  const largestExpenses = [...expenseByItem].slice(0, 5);

  // Create monthly trends (simplified - would group by month in real implementation)
  const monthlyTrends = [
    { month: 'Current', inflow: totalIncome, outflow: totalExpenses, net: totalIncome - totalExpenses }
  ];

  // Create recent transactions list
  const recentTransactions = [
    ...expenses.map(e => ({
      description: e.item,
      amount: -(e.amount_spent || 0),
      type: 'expense' as const,
      date: e.created_at
    })),
    ...finance.map(f => ({
      description: 'Income',
      amount: f.amount_paid || 0,
      type: 'income' as const,
      date: f.created_at
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    liquidityRatio: totalLiabilities > 0 ? totalCashAvailable / totalLiabilities : 0,
    cashFlowRatio: totalLiabilities > 0 ? (totalIncome - totalExpenses) / totalLiabilities : 0,
    burnRate: totalExpenses - totalIncome,
    runway: totalCashAvailable > 0 ? Math.round(totalCashAvailable / Math.max(totalExpenses - totalIncome, 1)) : 0,
    totalCashAvailable,
    totalLiabilities,
    expenseByItem,
    liabilitiesStatus: [
      { name: 'Paid', value: totalPaidLiabilities },
      { name: 'Pending', value: totalLiabilities }
    ],
    monthlyTrends,
    largestExpenses,
    recentTransactions
  };
}

// Component for metric cards
function MetricCard({ 
  title, 
  value, 
  idealRange, 
  isGood, 
  description, 
  isCurrency = false, 
  unit = '',
  loading = false
}: {
  title: string;
  value: number;
  idealRange: string;
  isGood: boolean;
  description: string;
  isCurrency?: boolean;
  unit?: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-white p-5 rounded-lg shadow">
      <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
      {loading ? (
        <Skeleton className="h-8 w-3/4 mb-2" />
      ) : (
        <p className="text-2xl font-bold text-gray-900 m-0 mb-1">
          {isCurrency ? '$' : ''}{value.toLocaleString()}{unit ? ` ${unit}` : ''}
        </p>
      )}
      <div className="flex items-center mb-1">
        {!loading && (
          <>
            <div className={`w-3 h-3 rounded-full mr-2 ${isGood ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500">Ideal: {idealRange}</span>
          </>
        )}
      </div>
      {loading ? (
        <Skeleton className="h-4 w-full" />
      ) : (
        <p className="text-xs text-gray-500 m-0">{description}</p>
      )}
    </div>
  );
}

// Component for chart cards
function ChartCard({ 
  title, 
  children, 
  className = ''
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white p-5 rounded-lg shadow ${className}`}>
      <h3 className="text-sm font-medium text-gray-500 mb-4">{title}</h3>
      {children}
    </div>
  );
}

// Skeleton loader for dashboard
function DashboardSkeleton() {
  return (
    <>
      <div className="flex items-center gap-4 mb-8">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-lg shadow">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-8 w-full mb-3" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-lg shadow">
            <Skeleton className="h-5 w-1/2 mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-lg shadow">
            <Skeleton className="h-5 w-1/2 mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>
        ))}
      </div>
    </>
  );
}
