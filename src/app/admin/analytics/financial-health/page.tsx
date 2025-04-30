// app/financial-health/page.tsx
'use client';

import { useState, useEffect } from 'react';

export default function FinancialHealth() {
  // State management
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    end: new Date()
  });

  // Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch data with error handling
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Format dates for query
      const startDate = dateRange.start.toISOString().split('T')[0];
      const endDate = dateRange.end.toISOString().split('T')[0];

      // Execute all queries in parallel
      const [
        { data: expenses, error: expensesError },
        { data: finance, error: financeError },
        { data: liabilities, error: liabilitiesError }
      ] = await Promise.all([
        supabase
          .from('expenses')
          .select('item, amount_spent, date')
          .gte('date', startDate)
          .lte('date', endDate),
        supabase
          .from('finance')
          .select('amount_paid, amount_available, created_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate),
        supabase
          .from('supply_items')
          .select('total_cost, amount_paid, balance, created_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
      ]);

      // Check for errors
      const errors = [expensesError, financeError, liabilitiesError].filter(Boolean);
      if (errors.length > 0) {
        throw new Error(`Database errors: ${errors.map(e => e?.message).join(', ')}`);
      }

      // Process data
      const processedData = processFinancialData(expenses || [], finance || [], liabilities || []);
      setData(processedData);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Process raw data into metrics
  const processFinancialData = (expenses: any[], finance: any[], liabilities: any[]) => {
    // Calculate totals
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount_spent || 0), 0);
    const totalIncome = finance.reduce((sum, f) => sum + (f.amount_paid || 0), 0);
    const totalCashAvailable = finance.reduce((sum, f) => sum + (f.amount_available || 0), 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + (l.balance || 0), 0);

    // Group expenses by item
    const expenseByItem = expenses.reduce((acc: any[], expense) => {
      const existing = acc.find(item => item.name === expense.item);
      if (existing) {
        existing.value += expense.amount_spent || 0;
      } else {
        acc.push({ name: expense.item, value: expense.amount_spent || 0 });
      }
      return acc;
    }, []);

    // Sort and get top expenses
    expenseByItem.sort((a, b) => b.value - a.value);
    const largestExpenses = [...expenseByItem].slice(0, 3);

    return {
      liquidityRatio: totalLiabilities > 0 ? totalCashAvailable / totalLiabilities : 0,
      cashFlowRatio: totalLiabilities > 0 ? (totalIncome - totalExpenses) / totalLiabilities : 0,
      burnRate: totalExpenses - totalIncome,
      runway: Math.round(totalCashAvailable / Math.max(totalExpenses - totalIncome, 1)),
      totalCashAvailable,
      totalLiabilities,
      expenseByItem,
      largestExpenses,
      monthlyTrends: [
        { month: 'Current', inflow: totalIncome, outflow: totalExpenses, net: totalIncome - totalExpenses }
      ],
      liabilitiesStatus: [
        { name: 'Paid', value: liabilities.reduce((sum, l) => sum + (l.amount_paid || 0), 0) },
        { name: 'Pending', value: totalLiabilities }
      ]
    };
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [dateRange]);

  // Date range change handler
  const handleDateChange = (start: Date, end: Date) => {
    setDateRange({ start, end });
  };

  // Supabase client creation
  function createClient(url: string, key: string) {
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null })
      },
      from: (table: string) => ({
        select: (columns: string) => ({
          gte: (col: string, val: string) => ({
            lte: (col2: string, val2: string) => ({
              limit: (count: number) => Promise.resolve({ data: [], error: null })
            })
          })
        })
      })
    };
  }

  // Loading skeleton UI
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse" />
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-64 animate-pulse" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-lg shadow">
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
            <div className="h-8 bg-gray-200 rounded w-full mb-3 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-lg shadow">
            <div className="h-5 bg-gray-200 rounded w-1/2 mb-4 animate-pulse" />
            <div className="h-64 bg-gray-200 rounded w-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );

  // Date range picker component
  const DateRangePicker = ({ onChange }: { onChange: (start: Date, end: Date) => void }) => {
    const [start, setStart] = useState(dateRange.start.toISOString().split('T')[0]);
    const [end, setEnd] = useState(dateRange.end.toISOString().split('T')[0]);

    const handleApply = () => {
      onChange(new Date(start), new Date(end));
    };

    return (
      <div className="flex flex-col sm:flex-row gap-2 mt-4">
        <div className="flex items-center">
          <label className="mr-2 text-sm text-gray-600">From:</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
            max={end}
          />
        </div>
        <div className="flex items-center">
          <label className="mr-2 text-sm text-gray-600">To:</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
            min={start}
          />
        </div>
        <button
          onClick={handleApply}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          Apply
        </button>
      </div>
    );
  };

  // Metric card component
  const MetricCard = ({ 
    title, value, idealRange, isGood, description, isCurrency = false, unit = '' 
  }: {
    title: string;
    value: number;
    idealRange: string;
    isGood: boolean;
    description: string;
    isCurrency?: boolean;
    unit?: string;
  }) => (
    <div className="bg-white p-5 rounded-lg shadow">
      <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 m-0 mb-1">
        {isCurrency ? '$' : ''}{value.toLocaleString()}{unit ? ` ${unit}` : ''}
      </p>
      <div className="flex items-center mb-1">
        <div className={`w-3 h-3 rounded-full mr-2 ${isGood ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-xs text-gray-500">Ideal: {idealRange}</span>
      </div>
      <p className="text-xs text-gray-500 m-0">{description}</p>
    </div>
  );

  // Chart card component
  const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white p-5 rounded-lg shadow">
      <h3 className="text-sm font-medium text-gray-500 mb-4">{title}</h3>
      {children}
    </div>
  );

  // Error display component
  const ErrorDisplay = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
    <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
      <h3 className="text-lg font-medium text-red-800">Error</h3>
      <p className="text-red-700">{message}</p>
      <button
        onClick={onRetry}
        className="mt-2 px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
      >
        Retry
      </button>
    </div>
  );

  // Main render
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
        <DateRangePicker onChange={handleDateChange} />
      </header>

      {/* Error state */}
      {error && <ErrorDisplay message={error} onRetry={fetchData} />}

      {/* Loading state */}
      {loading && !data && <LoadingSkeleton />}

      {/* Data display */}
      {!loading && data && !error && (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <MetricCard 
              title="Liquidity Ratio" 
              value={data.liquidityRatio} 
              idealRange="1.5-3" 
              isGood={data.liquidityRatio >= 1.5}
              description="Cash available vs current liabilities"
            />
            <MetricCard 
              title="Operating Cash Flow" 
              value={data.cashFlowRatio} 
              idealRange="≥1" 
              isGood={data.cashFlowRatio >= 1}
              description="Operating cash vs current liabilities"
            />
            <MetricCard 
              title="Monthly Burn Rate" 
              value={data.burnRate} 
              isCurrency={true}
              idealRange="Negative is good" 
              isGood={data.burnRate < 0}
              description="Net monthly cash consumption"
            />
            <MetricCard 
              title="Cash Runway" 
              value={data.runway} 
              unit="months"
              idealRange="6+ months" 
              isGood={data.runway >= 6}
              description="At current burn rate"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
            <ChartCard title="Cash Flow Trend">
              <div style={{ height: 300 }}>
                <BarChart
                  width={500}
                  height={300}
                  data={data.monthlyTrends}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="inflow" fill="#4ade80" name="Income" />
                  <Bar dataKey="outflow" fill="#f87171" name="Expenses" />
                </BarChart>
              </div>
            </ChartCard>

            <ChartCard title="Expenses Breakdown">
              <div style={{ height: 300 }}>
                <PieChart width={400} height={300}>
                  <Pie
                    data={data.expenseByItem.slice(0, 5)}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {data.expenseByItem.slice(0, 5).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value}`} />
                </PieChart>
              </div>
            </ChartCard>
          </div>

          {/* Recommendations */}
          <ChartCard title="Actionable Insights">
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800">Cash Position</h4>
                <p className="text-sm text-blue-700">
                  Available: ${data.totalCashAvailable.toLocaleString()} | 
                  Liabilities: ${data.totalLiabilities.toLocaleString()}
                </p>
              </div>

              <ul className="list-disc pl-5 space-y-2 text-gray-700">
                {data.liquidityRatio < 1.5 && (
                  <li>Increase cash reserves (current ratio: {data.liquidityRatio.toFixed(2)})</li>
                )}
                {data.cashFlowRatio < 1 && (
                  <li>Improve operating cash flow by increasing revenue</li>
                )}
                {data.burnRate > 0 && (
                  <li>Reduce monthly burn rate (currently ${data.burnRate.toLocaleString()})</li>
                )}
                {data.runway < 6 && (
                  <li>Extend cash runway beyond {data.runway} months</li>
                )}
                {data.largestExpenses.length > 0 && (
                  <li>
                    Review top expenses: {data.largestExpenses.map((e: any) => 
                      `${e.name} ($${e.value.toLocaleString()})`).join(', ')}
                  </li>
                )}
              </ul>
            </div>
          </ChartCard>
        </>
      )}
    </div>
  );
}

// Color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF'];
