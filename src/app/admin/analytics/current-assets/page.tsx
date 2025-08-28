"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface MaterialAsset {
  id: string;
  name: string;
  available: number;
  prepaid: number;
  total: number;
}

interface CashAssets {
  available: number;
  accountsReceivable: number;
  total: number;
}

interface OrderBalance {
  order_id: string;
  total_amount: number;
  amount_paid: number;
  balance: number;
}

export default function CurrentAssetsPage() {
  const [materialAssets, setMaterialAssets] = useState<MaterialAsset[]>([]);
  const [cashAssets, setCashAssets] = useState<CashAssets>({
    available: 0,
    accountsReceivable: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [orderBalances, setOrderBalances] = useState<OrderBalance[]>([]);

  const fetchMaterialAssets = async () => {
    try {
      // Fetch all materials first
      const { data: materials, error: materialsError } = await supabase
        .from("materials")
        .select("id, name");

      if (materialsError) throw materialsError;

      const materialAssetsData: MaterialAsset[] = [];

      for (const material of materials || []) {
        // Calculate inflow from opening_stocks
        const { data: openingStocks, error: openingStocksError } = await supabase
          .from("opening_stocks")
          .select("quantity")
          .eq("material_id", material.id)
          .not("material_id", "is", null);

        if (openingStocksError) throw openingStocksError;

        // Calculate inflow from deliveries with notes = 'Stock'
        const { data: stockDeliveries, error: deliveriesError } = await supabase
          .from("deliveries")
          .select("quantity")
          .eq("notes", "Stock")
          .eq("supply_item_id", material.id);

        if (deliveriesError) throw deliveriesError;

        // Calculate outflow from material_entries (treat all quantities as positive)
        const { data: materialEntries, error: entriesError } = await supabase
          .from("material_entries")
          .select("quantity")
          .eq("material_id", material.id);

        if (entriesError) throw entriesError;

        // Calculate prepaid from supply_items minus deliveries
        const { data: supplyItems, error: supplyItemsError } = await supabase
          .from("supply_items")
          .select("quantity")
          .eq("name", material.name);

        if (supplyItemsError) throw supplyItemsError;

        const { data: allDeliveries, error: allDeliveriesError } = await supabase
          .from("deliveries")
          .select("quantity")
          .eq("notes", "Stock")
          .eq("supply_item_id", material.id);

        if (allDeliveriesError) throw allDeliveriesError;

        // Calculate totals
        const openingStocksTotal = openingStocks?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
        const stockDeliveriesTotal = stockDeliveries?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
        const inflow = openingStocksTotal + stockDeliveriesTotal;
        
        const outflow = materialEntries?.reduce((sum, item) => sum + Math.abs(item.quantity || 0), 0) || 0;
        const available = inflow - outflow;

        const supplyItemsTotal = supplyItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
        const deliveriesTotal = allDeliveries?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
        const prepaid = supplyItemsTotal - deliveriesTotal;

        materialAssetsData.push({
          id: material.id,
          name: material.name,
          available,
          prepaid: Math.max(0, prepaid), // Ensure prepaid is not negative
          total: available + Math.max(0, prepaid)
        });
      }

      setMaterialAssets(materialAssetsData);
    } catch (error) {
      console.error("Error fetching material assets:", error);
    }
  };

  const fetchCashAssets = async () => {
    try {
      // Calculate available cash (finance.amount_paid - expenses.amount_spent)
      const { data: financeData, error: financeError } = await supabase
        .from("finance")
        .select("amount_paid");

      if (financeError) throw financeError;

      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select("amount_spent");

      if (expensesError) throw expensesError;

      const totalPayments = financeData?.reduce((sum, item) => sum + (item.amount_paid || 0), 0) || 0;
      const totalExpenses = expensesData?.reduce((sum, item) => sum + (item.amount_spent || 0), 0) || 0;
      const availableCash = totalPayments - totalExpenses;

      // Calculate accounts receivable (money owed by clients)
      const { data: orders, error: ordersError } = await supabase
        .from("order")
        .select("id, total_amount");

      if (ordersError) throw ordersError;

      let totalAccountsReceivable = 0;
      const balances: OrderBalance[] = [];

      for (const order of orders || []) {
        const { data: orderPayments, error: paymentsError } = await supabase
          .from("finance")
          .select("amount_paid")
          .eq("order_id", order.id)
          .not("order_id", "is", null);

        if (paymentsError) throw paymentsError;

        const totalPaid = orderPayments?.reduce((sum, payment) => sum + (payment.amount_paid || 0), 0) || 0;
        const balance = (order.total_amount || 0) - totalPaid;

        if (balance > 0) {
          totalAccountsReceivable += balance;
          balances.push({
            order_id: order.id,
            total_amount: order.total_amount || 0,
            amount_paid: totalPaid,
            balance
          });
        }
      }

      setCashAssets({
        available: availableCash,
        accountsReceivable: totalAccountsReceivable,
        total: availableCash + totalAccountsReceivable
      });

      setOrderBalances(balances);
    } catch (error) {
      console.error("Error fetching cash assets:", error);
    }
  };

  const fetchAllAssets = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchMaterialAssets(), fetchCashAssets()]);
    } catch (error) {
      console.error("Error fetching assets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAssets();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Current Assets</h1>
          <p className="text-gray-600">Loading assets data...</p>
        </div>
        <div className="grid gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Current Assets
        </h1>
        <p className="text-gray-600">Overview of company's current assets including materials and cash</p>
      </div>

      <div className="grid gap-6 mb-8">
        {/* Cash Assets Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-green-600">💰</span>
              Cash & Cash Equivalents
            </CardTitle>
            <CardDescription>Liquid assets available to the company</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="border rounded-lg p-4 bg-green-50">
                <div className="text-sm text-green-600 mb-1">Available Cash</div>
                <div className="text-2xl font-bold text-green-700">
                  {formatCurrency(cashAssets.available)}
                </div>
                <div className="text-xs text-green-500 mt-1">Cash on hand & in accounts</div>
              </div>
              
              <div className="border rounded-lg p-4 bg-blue-50">
                <div className="text-sm text-blue-600 mb-1">Accounts Receivable</div>
                <div className="text-2xl font-bold text-blue-700">
                  {formatCurrency(cashAssets.accountsReceivable)}
                </div>
                <div className="text-xs text-blue-500 mt-1">Money owed by clients</div>
              </div>
              
              <div className="border rounded-lg p-4 bg-purple-50">
                <div className="text-sm text-purple-600 mb-1">Total Cash Assets</div>
                <div className="text-2xl font-bold text-purple-700">
                  {formatCurrency(cashAssets.total)}
                </div>
                <div className="text-xs text-purple-500 mt-1">Sum of all cash assets</div>
              </div>
            </div>

            {orderBalances.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Accounts Receivable Details</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead className="text-right">Amount Paid</TableHead>
                        <TableHead className="text-right">Balance Due</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderBalances.map((order) => (
                        <TableRow key={order.order_id}>
                          <TableCell className="font-medium">#{order.order_id}</TableCell>
                          <TableCell className="text-right">{formatCurrency(order.total_amount)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(order.amount_paid)}</TableCell>
                          <TableCell className="text-right font-semibold text-red-600">
                            {formatCurrency(order.balance)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                              Pending
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Material Assets Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-blue-600">📦</span>
              Material Assets
            </CardTitle>
            <CardDescription>Physical inventory and prepaid materials</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="border rounded-lg p-4 bg-blue-50">
                <div className="text-sm text-blue-600 mb-1">Available Inventory</div>
                <div className="text-2xl font-bold text-blue-700">
                  {materialAssets.reduce((sum, item) => sum + item.available, 0)} units
                </div>
                <div className="text-xs text-blue-500 mt-1">Physically in stock</div>
              </div>
              
              <div className="border rounded-lg p-4 bg-orange-50">
                <div className="text-sm text-orange-600 mb-1">Prepaid Materials</div>
                <div className="text-2xl font-bold text-orange-700">
                  {materialAssets.reduce((sum, item) => sum + item.prepaid, 0)} units
                </div>
                <div className="text-xs text-orange-500 mt-1">Paid for but not yet delivered</div>
              </div>
              
              <div className="border rounded-lg p-4 bg-purple-50">
                <div className="text-sm text-purple-600 mb-1">Total Material Assets</div>
                <div className="text-2xl font-bold text-purple-700">
                  {materialAssets.reduce((sum, item) => sum + item.total, 0)} units
                </div>
                <div className="text-xs text-purple-500 mt-1">Sum of all material assets</div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Material Details</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead className="text-right">Prepaid</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materialAssets.map((material) => (
                      <TableRow key={material.id}>
                        <TableCell className="font-medium">{material.name}</TableCell>
                        <TableCell className="text-right">
                          <span className={material.available > 0 ? "text-green-600" : "text-red-600"}>
                            {material.available} units
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={material.prepaid > 0 ? "text-orange-600" : "text-gray-400"}>
                            {material.prepaid} units
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {material.total} units
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={
                              material.available > 0 
                                ? "bg-green-100 text-green-800" 
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {material.available > 0 ? "In Stock" : "Out of Stock"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Assets Summary */}
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-indigo-600">📊</span>
              Total Current Assets Summary
            </CardTitle>
            <CardDescription>Complete overview of all current assets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-indigo-700">Cash Assets</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Available Cash:</span>
                    <span className="font-semibold">{formatCurrency(cashAssets.available)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Accounts Receivable:</span>
                    <span className="font-semibold">{formatCurrency(cashAssets.accountsReceivable)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Total Cash:</span>
                    <span className="font-semibold text-indigo-600">{formatCurrency(cashAssets.total)}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-indigo-700">Material Assets</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Available Inventory:</span>
                    <span className="font-semibold">
                      {materialAssets.reduce((sum, item) => sum + item.available, 0)} units
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Prepaid Materials:</span>
                    <span className="font-semibold">
                      {materialAssets.reduce((sum, item) => sum + item.prepaid, 0)} units
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Total Materials:</span>
                    <span className="font-semibold text-indigo-600">
                      {materialAssets.reduce((sum, item) => sum + item.total, 0)} units
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-indigo-100 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-indigo-800">Grand Total Current Assets:</span>
                <span className="text-2xl font-bold text-indigo-900">
                  {formatCurrency(cashAssets.total)} + {materialAssets.reduce((sum, item) => sum + item.total, 0)} units
                </span>
              </div>
              <p className="text-sm text-indigo-600 mt-2">
                Represents the total value of all liquid and convertible assets
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
