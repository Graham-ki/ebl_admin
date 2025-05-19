// app/optimization/page.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, Legend
} from 'recharts';
import { createClient } from "@supabase/supabase-js";

interface SupplyItem {
  name: string;
  quantity: number;
  price: number;
  total_cost: number;
  amount_paid: number;
  balance: number;
  purchase_date: string;
}

interface Expense {
  item: string;
  amount_spent: number;
  date: string;
  department?: string;
}

interface Finance {
  amount_available: number;
  created_at: string;
}

interface Material {
  name: string;
  unit: number;
  cost: number;
}

interface Product {
  title: string;
  maQuantity: number;
}

interface OrderItem {
  id?: number;
  order: number;
  product_id: number;
  quantity: number;
  price?: number;
}

interface Employee {
  name: string;
  role: string;
  start_date: string;
  salary: number;
  status: string;
}

export default function Optimization() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    supplyItems: [] as SupplyItem[],
    expenses: [] as Expense[],
    finances: [] as Finance[],
    materials: [] as Material[],
    products: [] as Product[],
    approvedOrderItems: [] as OrderItem[],
    taxPayments: [] as Expense[],
    nssfPayments: [] as Expense[],
    otherTaxPayments: [] as Expense[],
    employees: [] as Employee[],
    salaryPayments: [] as Expense[]
  });
  
  const [inputs, setInputs] = useState({
    newHires: 0,
    purchaseAmount: 0,
    sellingPrice: 0,
    projectedRevenue: 0,
    newHireSalary: 0,
    fixedCosts: 5000000
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        console.log('Starting data fetch...');
        
        const [
          { data: supplyItems, error: supplyError }, 
          { data: expenses, error: expensesError }, 
          { data: finances, error: financeError },
          { data: materials, error: materialsError },
          { data: products, error: productsError },
          { data: employees, error: employeesError }
        ] = await Promise.all([
          supabase.from('supply_items').select('*'),
          supabase.from('expenses').select('*'),
          supabase.from('finance').select('*'),
          supabase.from('materials').select('*'),
          supabase.from('product').select('*'),
          supabase.from('employees').select('*')
        ]);

        // Log any errors from initial fetches
        if (supplyError) console.error('Supply items error:', supplyError);
        if (expensesError) console.error('Expenses error:', expensesError);
        if (financeError) console.error('Finance error:', financeError);
        if (materialsError) console.error('Materials error:', materialsError);
        if (productsError) console.error('Products error:', productsError);
        if (employeesError) console.error('Employees error:', employeesError);

        // Fetch salary payments
        const { data: salaryPayments, error: salaryError } = await supabase
          .from('expenses')
          .select('*')
          .eq('item', 'Salary');
        
        if (salaryError) console.error('Salary payments error:', salaryError);

        // Fetch tax payments - updated queries
        const { data: taxPayments, error: taxError } = await supabase
          .from('expenses')
          .select('*')
          .or('item.eq.Tax,department.eq.URA');
        
        if (taxError) console.error('Tax payments error:', taxError);

        // Fetch NSSF payments - updated query
        const { data: nssfPayments, error: nssfError } = await supabase
          .from('expenses')
          .select('*')
          .or('item.eq.NSSF,department.eq.NSSF');
        
        if (nssfError) console.error('NSSF payments error:', nssfError);

        // Fetch other tax payments - updated comprehensive query
        const { data: otherTaxPayments, error: otherTaxError } = await supabase
          .from('expenses')
          .select('*')
          .or('item.ilike.%tax%,item.ilike.%fee%,item.ilike.%levy%')
          .not('item', 'in', '("Tax","NSSF")')
          .not('department', 'in', '("URA","NSSF")');
        
        if (otherTaxError) console.error('Other tax payments error:', otherTaxError);

        // Fetch approved orders and their items
        console.log('Fetching approved orders...');
        const { data: approvedOrders, error: ordersError } = await supabase
          .from('order')
          .select('id')
          .eq('status', 'Approved');
        
        if (ordersError) {
          console.error('Approved orders error:', ordersError);
        } else {
          console.log('Found approved orders:', approvedOrders);
        }

        let approvedOrderItems: OrderItem[] = [];
        if (approvedOrders && approvedOrders.length > 0) {
          const orderIds = approvedOrders.map(order => order.id);
          console.log('Fetching order items for order IDs:', orderIds);

          try {
            // First try the standard .in() method
            const { data: items, error } = await supabase
              .from('order_item')
              .select('*')
              .in('order', orderIds);

            if (error) throw error;
            
            approvedOrderItems = items || [];
            console.log('Found order items using .in():', approvedOrderItems);
          } catch (error) {
            console.error('Standard .in() failed, trying alternative methods:', error);
            
            // Fallback 1: Using .or() with multiple .eq()
            try {
              const orConditions = orderIds.map(id => `order.eq.${id}`).join(',');
              const { data: items, error: orError } = await supabase
                .from('order_item')
                .select('*')
                .or(orConditions);

              if (orError) throw orError;
              
              approvedOrderItems = items || [];
              console.log('Found order items using .or():', approvedOrderItems);
            } catch (orError) {
              console.error('.or() method failed, trying raw filter:', orError);
              
              // Fallback 2: Using raw filter syntax
              try {
                const { data: items, error: rawError } = await supabase
                  .from('order_item')
                  .select('*')
                  .filter('order', 'in', `(${orderIds.join(',')})`);

                if (rawError) throw rawError;
                
                approvedOrderItems = items || [];
                console.log('Found order items using raw filter:', approvedOrderItems);
              } catch (rawError) {
                console.error('Raw filter failed, trying manual filtering:', rawError);
                
                // Final Fallback: Fetch all and filter client-side
                try {
                  const { data: allItems, error: allError } = await supabase
                    .from('order_item')
                    .select('*');

                  if (allError) throw allError;
                  
                  approvedOrderItems = allItems?.filter(item => 
                    orderIds.includes(item.order)
                  ) || [];
                  console.log('Filtered order items client-side:', approvedOrderItems);
                } catch (finalError) {
                  console.error('All methods failed:', finalError);
                }
              }
            }
          }

          if (approvedOrderItems.length === 0) {
            console.warn('No order items found after trying all methods');
          }
        }
        
        setData({
          supplyItems: supplyItems || [],
          expenses: expenses || [],
          finances: finances || [],
          materials: materials || [],
          products: products || [],
          approvedOrderItems,
          taxPayments: taxPayments || [],
          nssfPayments: nssfPayments || [],
          otherTaxPayments: otherTaxPayments || [],
          employees: employees || [],
          salaryPayments: salaryPayments || []
        });

        console.log('Data fetch completed. Approved order items count:', approvedOrderItems.length);
      } catch (error) {
        console.error('Error in fetchData:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Current cash position
  const totalAvailable = data.finances.reduce((sum, item) => sum + (item.amount_available || 0), 0);
  const totalExpenses = data.expenses.reduce((sum, item) => sum + (item.amount_spent || 0), 0);
  const currentCash = totalAvailable - totalExpenses;

  // Employee calculations
  const totalEmployees = data.employees.length;
  const totalMonthlySalary = data.salaryPayments.reduce((sum, payment) => sum + (payment.amount_spent || 0), 0);
  const avgEmployeeSalary = totalEmployees > 0 ? totalMonthlySalary / totalEmployees : 0;

  // What-if scenarios
  const monthlyExpenses = data.expenses
    .filter(e => new Date(e.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    .reduce((sum, item) => sum + (item.amount_spent || 0), 0);
  
  const projectedPayroll = totalMonthlySalary + (inputs.newHires * (inputs.newHireSalary || avgEmployeeSalary));
  const projectedCash = currentCash - inputs.purchaseAmount - (inputs.newHires * (inputs.newHireSalary || avgEmployeeSalary));

  // Break-even calculations
  const productionCostPerUnit = data.materials.reduce((sum, material) => 
    sum + ((material.unit || 0) * (material.cost || 0)), 0);
  
  const totalSalesVolume = data.approvedOrderItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  console.log('Calculating sales volume:', {
    approvedOrderItemsCount: data.approvedOrderItems.length,
    totalSalesVolume
  });
  
  const breakEvenPoint = inputs.sellingPrice > 0 
    ? Math.ceil(inputs.fixedCosts / (inputs.sellingPrice - productionCostPerUnit))
    : 0;

  // Updated tax calculations
  const totalTaxPayments = data.taxPayments.reduce((sum, payment) => sum + (payment.amount_spent || 0), 0);
  const totalNSSFPayments = data.nssfPayments.reduce((sum, payment) => sum + (payment.amount_spent || 0), 0);
  const totalOtherTaxPayments = data.otherTaxPayments.reduce((sum, tax) => sum + (tax.amount_spent || 0), 0);
  
  const totalRevenue = data.finances.reduce((sum, f) => sum + (f.amount_available || 0), 0);
  const totalTaxesPaid = totalTaxPayments + totalNSSFPayments + totalOtherTaxPayments;
  const avgTaxRate = totalRevenue > 0 ? totalTaxesPaid / totalRevenue : 0.18;
  
  const projectedTax = inputs.projectedRevenue * avgTaxRate;
  const projectedNSSF = data.nssfPayments.length > 0 
    ? totalNSSFPayments / Math.max(1, data.nssfPayments.length)
    : 100000;
  
  const avgOtherTaxes = data.otherTaxPayments.length > 0 
    ? totalOtherTaxPayments / Math.max(1, data.otherTaxPayments.length)
    : 0;

  // Chart data preparation
  const cashFlowData = [
    { name: 'Available', value: totalAvailable },
    { name: 'Expenses', value: totalExpenses },
    { name: 'Current', value: currentCash }
  ];

  const expenseBreakdown = data.expenses
    .filter(e => e.item && e.amount_spent)
    .reduce((acc, item) => {
      const existing = acc.find(i => i.name === item.item);
      if (existing) {
        existing.value += item.amount_spent || 0;
      } else {
        acc.push({ name: item.item, value: item.amount_spent || 0 });
      }
      return acc;
    }, [] as {name: string, value: number}[])
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const taxPaymentData = [...data.taxPayments, ...data.nssfPayments, ...data.otherTaxPayments]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(payment => ({
      date: new Date(payment.date).toLocaleDateString(),
      amount: payment.amount_spent || 0,
      type: payment.department?.includes('URA') ? 'URA Tax' : 
            payment.department?.includes('NSSF') ? 'NSSF' : 
            payment.item
    }));

  // Enhanced break-even chart data with proper labels
  const breakEvenChartData = [
    { 
      units: 0, 
      cost: inputs.fixedCosts, 
      revenue: 0,
      label: `Fixed Costs: ${inputs.fixedCosts.toLocaleString()} UGX` 
    },
    { 
      units: breakEvenPoint / 2, 
      cost: inputs.fixedCosts + (productionCostPerUnit * breakEvenPoint / 2), 
      revenue: inputs.sellingPrice * breakEvenPoint / 2,
      label: `Midpoint: ${(inputs.sellingPrice * breakEvenPoint / 2).toLocaleString()} UGX Revenue`
    },
    { 
      units: breakEvenPoint, 
      cost: inputs.fixedCosts + (productionCostPerUnit * breakEvenPoint), 
      revenue: inputs.sellingPrice * breakEvenPoint,
      label: `Break-even: ${breakEvenPoint} units, ${(inputs.sellingPrice * breakEvenPoint).toLocaleString()} UGX`
    },
    { 
      units: breakEvenPoint * 1.5, 
      cost: inputs.fixedCosts + (productionCostPerUnit * breakEvenPoint * 1.5), 
      revenue: inputs.sellingPrice * breakEvenPoint * 1.5,
      label: `Profit Zone: ${(inputs.sellingPrice * breakEvenPoint * 0.5).toLocaleString()} UGX Profit`
    }
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
          <p className="font-semibold">{label} units</p>
          <p className="text-sm text-gray-600">{payload[0].payload.label}</p>
          <p className="text-red-500">Cost: {payload[0].value.toLocaleString()} UGX</p>
          <p className="text-green-500">Revenue: {payload[1].value.toLocaleString()} UGX</p>
          <p className="text-blue-500">Profit: {(payload[1].value - payload[0].value).toLocaleString()} UGX</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Financial Optimization Dashboard
            </h1>
            <p className="text-gray-600">Actionable insights to maximize financial efficiency</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('overview')} 
              className={`px-4 py-2 rounded-lg ${activeTab === 'overview' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('scenarios')} 
              className={`px-4 py-2 rounded-lg ${activeTab === 'scenarios' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            >
              Scenarios
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* ... (rest of the overview tab content remains the same) ... */}
            </div>
          )}

          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
            {/* ... (what-if scenarios section remains the same) ... */}
          </section>

          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
            {/* ... (break-even analysis section remains the same) ... */}
          </section>

          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Tax Liability Estimator</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Projected Revenue (UGX)</label>
                  <input
                    type="number"
                    value={inputs.projectedRevenue}
                    onChange={(e) => setInputs({...inputs, projectedRevenue: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Historical Tax Rate:</span>
                    <span className="font-medium">{Math.round(avgTaxRate * 100)}%</span>
                  </div>
                  {data.nssfPayments.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm">Average NSSF Payment:</span>
                      <span className="font-medium">
                        {projectedNSSF.toLocaleString()} UGX
                      </span>
                    </div>
                  )}
                  {data.otherTaxPayments.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm">Other Taxes (Avg):</span>
                      <span className="font-medium">
                        {avgOtherTaxes.toLocaleString()} UGX
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {inputs.projectedRevenue > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3 text-center">Projected Tax Obligations</h3>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-sm">URA Tax ({Math.round(avgTaxRate * 100)}%):</span>
                      <span className="font-medium">{projectedTax.toLocaleString()} UGX</span>
                    </div>
                    {data.nssfPayments.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm">NSSF Contribution:</span>
                        <span className="font-medium">{projectedNSSF.toLocaleString()} UGX</span>
                      </div>
                    )}
                    {data.otherTaxPayments.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm">Other Taxes:</span>
                        <span className="font-medium">{avgOtherTaxes.toLocaleString()} UGX</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between font-semibold">
                      <span>Total Estimated Tax:</span>
                      <span className="text-indigo-600">{(projectedTax + projectedNSSF + avgOtherTaxes).toLocaleString()} UGX</span>
                    </div>
                  </div>

                  <div className="mt-3 bg-blue-50 p-3 rounded-md">
                    <p className="text-sm text-blue-800">
                      Based on historical data. Set aside {(projectedTax + projectedNSSF + avgOtherTaxes).toLocaleString()} UGX for tax obligations.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {inputs.projectedRevenue > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-2">Tax Payment History</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={taxPaymentData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} UGX`, 'Amount']} />
                      <Bar dataKey="amount" name="Amount">
                        {taxPaymentData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={
                              entry.type === 'URA Tax' ? '#6366F1' : 
                              entry.type === 'NSSF' ? '#8B5CF6' : 
                              '#A78BFA'
                            } 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
