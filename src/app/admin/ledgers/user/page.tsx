"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function MarketersPage() {
  const [marketers, setMarketers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMarketer, setSelectedMarketer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [newPayment, setNewPayment] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: ""
  });
  const [newOrder, setNewOrder] = useState({
    date: new Date().toISOString().split('T')[0],
    item: "",
    quantity: "",
    cost: ""
  });
  const [showOrdersDialog, setShowOrdersDialog] = useState(false);
  const [showPaymentsDialog, setShowPaymentsDialog] = useState(false);
  const [showAddOrderDialog, setShowAddOrderDialog] = useState(false);
  const [showLedgerDialog, setShowLedgerDialog] = useState(false);

  // Fetch all marketers with their order counts
  const fetchMarketers = async () => {
    setLoading(true);
    try {
      // First get all users with type 'USERS'
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, name")
        .eq("type", "USER");
      
      if (usersError) throw usersError;

      // Then get order counts for each user
      const marketersWithCounts = await Promise.all(
        users.map(async (user) => {
          const { count, error: countError } = await supabase
            .from("order")
            .select("*", { count: "exact", head: true })
            .eq("user", user.id);
          
          if (countError) throw countError;

          return {
            ...user,
            orderCount: count || 0
          };
        })
      );

      setMarketers(marketersWithCounts);
    } catch (error) {
      console.error("Error fetching marketers:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("product")
        .select("title")
        .order("title", { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch orders for a specific marketer
  const fetchOrders = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("order")
        .select("*")
        .eq("user", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch payments for a specific order
  const fetchPayments = async (orderId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("finance")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all transactions (orders + payments) for a marketer
  const fetchTransactions = async (userId: string) => {
    setLoading(true);
    try {
      // Get all orders for the marketer
      const { data: ordersData, error: ordersError } = await supabase
        .from("order")
        .select("*")
        .eq("user", userId)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      // Get all payments for the marketer
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("finance")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (paymentsError) throw paymentsError;

      // Combine and sort all transactions by date
      const allTransactions = [
        ...(ordersData?.map(order => ({
          type: 'order',
          id: order.id,
          date: order.created_at,
          item: order.item,
          quantity: order.quantity,
          unit_price: order.cost,
          amount: order.quantity * order.cost,
          payment: 0
        })) || []),
        ...(paymentsData?.map(payment => ({
          type: 'payment',
          id: payment.id,
          date: payment.created_at,
          order_id: payment.order_id,
          amount: 0,
          payment: payment.amount_paid,
          item: 'Payment'
        })) || [])
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Calculate running balance
      let balance = 0;
      const transactionsWithBalance = allTransactions.map(transaction => {
        if (transaction.type === 'order') {
          balance += transaction.amount;
        } else {
          balance -= transaction.payment;
        }
        return {
          ...transaction,
          balance
        };
      });

      setTransactions(transactionsWithBalance);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  // Add a new payment
  const addPayment = async () => {
    if (!selectedOrder || !newPayment.amount) return;

    try {
      const { data, error } = await supabase
        .from("finance")
        .insert([{
          order_id: selectedOrder.id,
          amount_paid: parseFloat(newPayment.amount),
          created_at: newPayment.date,
          user_id: selectedMarketer.id
        }]);

      if (error) throw error;
      
      // Refresh payments and transactions
      await fetchPayments(selectedOrder.id);
      await fetchTransactions(selectedMarketer.id);
      // Reset form
      setNewPayment({
        date: new Date().toISOString().split('T')[0],
        amount: ""
      });
    } catch (error) {
      console.error("Error adding payment:", error);
    }
  };

  // Add a new order
  const addOrder = async () => {
    if (!selectedMarketer || !newOrder.item || !newOrder.quantity || !newOrder.cost) return;

    try {
      const { data, error } = await supabase
        .from("order")
        .insert([{
          user: selectedMarketer.id,
          item: newOrder.item,
          quantity: parseFloat(newOrder.quantity),
          cost: parseFloat(newOrder.cost),
          created_at: newOrder.date,
          total_amount: parseFloat(newOrder.quantity) * parseFloat(newOrder.cost)
        }]);

      if (error) throw error;
      
      // Refresh orders and transactions
      await fetchOrders(selectedMarketer.id);
      await fetchTransactions(selectedMarketer.id);
      // Reset form
      setNewOrder({
        date: new Date().toISOString().split('T')[0],
        item: "",
        quantity: "",
        cost: ""
      });
      setShowAddOrderDialog(false);
    } catch (error) {
      console.error("Error adding order:", error);
    }
  };

  // Calculate total paid amount
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount_paid, 0);
  const balance = selectedOrder ? selectedOrder.total_amount - totalPaid : 0;

  useEffect(() => {
    fetchMarketers();
    fetchProducts();
  }, []);

  const handleViewOrders = (marketer: any) => {
    setSelectedMarketer(marketer);
    fetchOrders(marketer.id);
    fetchTransactions(marketer.id);
    setShowOrdersDialog(true);
  };

  const handleViewPayments = (order: any) => {
    setSelectedOrder(order);
    fetchPayments(order.id);
    setShowPaymentsDialog(true);
  };

  const handleViewLedger = () => {
    setShowLedgerDialog(true);
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Marketers Management
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          View and manage marketers and their orders
        </p>
      </div>

      {/* Marketers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mb-8">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-semibold text-gray-700">Marketer Name</TableHead>
              <TableHead className="font-semibold text-gray-700">Number of Orders</TableHead>
              <TableHead className="font-semibold text-gray-700 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : marketers.length > 0 ? (
              marketers.map((marketer) => (
                <TableRow key={marketer.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{marketer.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{marketer.orderCount}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewOrders(marketer)}
                      className="mr-2"
                    >
                      View Orders
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                  No marketers found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Orders Dialog */}
      <Dialog open={showOrdersDialog} onOpenChange={setShowOrdersDialog}>
        <DialogContent className="max-w-6xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Orders for {selectedMarketer?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddOrderDialog(true)}
              className="mr-2"
            >
              Add New Order
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewLedger}
            >
              View General Ledger
            </Button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Item</TableHead>
                  <TableHead className="font-semibold">Quantity</TableHead>
                  <TableHead className="font-semibold">Unit Price</TableHead>
                  <TableHead className="font-semibold">Total Amount</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      {new Date(order.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{order.item}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>{order.cost.toLocaleString()}</TableCell>
                    <TableCell>
                      {(order.quantity * order.cost).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewPayments(order)}
                      >
                        View Payments
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No orders found for this marketer
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Order Dialog */}
      <Dialog open={showAddOrderDialog} onOpenChange={setShowAddOrderDialog}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Add New Order for {selectedMarketer?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <Input
                type="date"
                value={newOrder.date}
                onChange={(e) => setNewOrder({
                  ...newOrder,
                  date: e.target.value
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item
              </label>
              <Select
                value={newOrder.item}
                onValueChange={(value) => setNewOrder({
                  ...newOrder,
                  item: value
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.title} value={product.title}>
                      {product.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity
              </label>
              <Input
                type="number"
                placeholder="Enter quantity"
                value={newOrder.quantity}
                onChange={(e) => setNewOrder({
                  ...newOrder,
                  quantity: e.target.value
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Price
              </label>
              <Input
                type="number"
                placeholder="Enter unit price"
                value={newOrder.cost}
                onChange={(e) => setNewOrder({
                  ...newOrder,
                  cost: e.target.value
                })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={addOrder} disabled={!newOrder.item || !newOrder.quantity || !newOrder.cost}>
              Add Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* General Ledger Dialog */}
      <Dialog open={showLedgerDialog} onOpenChange={setShowLedgerDialog}>
        <DialogContent className="max-w-6xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              General Ledger for {selectedMarketer?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="font-semibold text-right">Quantity</TableHead>
                  <TableHead className="font-semibold text-right">Unit Price</TableHead>
                  <TableHead className="font-semibold text-right">Order Amount</TableHead>
                  <TableHead className="font-semibold text-right">Payment</TableHead>
                  <TableHead className="font-semibold text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction, index) => (
                  <TableRow key={`${transaction.type}-${transaction.id}`}>
                    <TableCell>
                      {new Date(transaction.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {transaction.type === 'order' ? 
                        `${transaction.item} (Order #${transaction.id})` : 
                        `Payment for Order #${transaction.order_id}`}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.type === 'order' ? transaction.quantity : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.type === 'order' ? transaction.unit_price.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.type === 'order' ? transaction.amount.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.type === 'payment' ? transaction.payment.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      transaction.balance > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {transaction.balance.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No transactions found for this marketer
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payments Dialog */}
      <Dialog open={showPaymentsDialog} onOpenChange={setShowPaymentsDialog}>
        <DialogContent className="max-w-2xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Payments for Order #{selectedOrder?.id}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="border rounded-lg p-3">
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="font-bold">{selectedOrder?.total_amount.toLocaleString()}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-sm text-gray-500">Amount Paid</p>
                <p className="font-bold">{totalPaid.toLocaleString()}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-sm text-gray-500">Balance</p>
                <p className={`font-bold ${
                  balance > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {balance.toLocaleString()}
                </p>
              </div>
            </div>

            <h3 className="font-medium">Payment History</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {new Date(payment.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {payment.amount_paid.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-4 text-gray-500">
                        No payments recorded
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Add New Payment</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <Input
                    type="date"
                    value={newPayment.date}
                    onChange={(e) => setNewPayment({
                      ...newPayment,
                      date: e.target.value
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({
                      ...newPayment,
                      amount: e.target.value
                    })}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={addPayment}
                    className="w-full"
                    disabled={!newPayment.amount}
                  >
                    Add Payment
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
