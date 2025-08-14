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
  const [expenses, setExpenses] = useState<any[]>([]);
  const [openingBalances, setOpeningBalances] = useState<any[]>([]);
  const [newPayment, setNewPayment] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: "",
    mode_of_payment: "",
    bank_name: "",
    mobile_money_provider: "",
    purpose: "Order Payment"
  });
  const [newOrder, setNewOrder] = useState({
    date: new Date().toISOString().split('T')[0],
    item: "",
    quantity: "",
    cost: ""
  });
  const [newExpense, setNewExpense] = useState({
    date: new Date().toISOString().split('T')[0],
    item: "",
    amount: ""
  });
  const [newOpeningBalance, setNewOpeningBalance] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: "",
    marketer_id: "",
    status: "Unpaid"
  });
  const [showOrdersDialog, setShowOrdersDialog] = useState(false);
  const [showPaymentsDialog, setShowPaymentsDialog] = useState(false);
  const [showAddOrderDialog, setShowAddOrderDialog] = useState(false);
  const [showLedgerDialog, setShowLedgerDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showOpeningBalanceDialog, setShowOpeningBalanceDialog] = useState(false);
  const [showOpeningBalancesList, setShowOpeningBalancesList] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const fetchMarketers = async () => {
    setLoading(true);
    try {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, name")
        .eq("type", "USER");
      
      if (usersError) throw usersError;

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

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("product")
        .select("id, title")
        .order("title", { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOpeningBalances = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("opening_balances")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOpeningBalances(data || []);
    } catch (error) {
      console.error("Error fetching opening balances:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const fetchExpenses = async (userId: string) => {
    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("name")
        .eq("id", userId)
        .single();

      if (userError) throw userError;
      if (!userData) throw new Error("User not found");

      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("department", userData.name)
        .order("date", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (userId: string) => {
    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("name")
        .eq("id", userId)
        .single();

      if (userError) throw userError;
      if (!userData) throw new Error("User not found");

      const { data: ordersData, error: ordersError } = await supabase
        .from("order")
        .select("*")
        .eq("user", userId)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      const { data: paymentsData, error: paymentsError } = await supabase
        .from("finance")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (paymentsError) throw paymentsError;

      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select("*")
        .eq("department", userData.name)
        .order("date", { ascending: false });

      if (expensesError) throw expensesError;

      const { data: openingBalancesData, error: openingBalancesError } = await supabase
        .from("opening_balances")
        .select("*")
        .eq("marketer_id", userId)
        .order("created_at", { ascending: false });

      if (openingBalancesError) throw openingBalancesError;

      const allTransactions = [
        ...(openingBalancesData?.map(balance => ({
          type: 'opening_balance',
          id: balance.id,
          date: balance.created_at,
          item: `Opening Balance`,
          amount: balance.amount,
          quantity: 1,
          unit_price: balance.amount,
          payment: 0,
          expense: 0,
          status: balance.status,
          purpose: '',
          mode_of_payment: '',
          bank_name: '',
          mobile_money_provider: ''
        })) || []),
        ...(ordersData?.map(order => ({
          type: 'order',
          id: order.id,
          date: order.created_at,
          item: order.item,
          quantity: order.quantity,
          unit_price: order.cost,
          amount: order.quantity * order.cost,
          payment: 0,
          expense: 0,
          purpose: '',
          status: '',
          mode_of_payment: '',
          bank_name: '',
          mobile_money_provider: ''
        })) || []),
        ...(paymentsData?.map(payment => ({
          type: 'payment',
          id: payment.id,
          date: payment.created_at,
          order_id: payment.order_id,
          amount: 0,
          payment: payment.amount_paid,
          expense: 0,
          item: `Payment (${payment.mode_of_payment})`,
          mode_of_payment: payment.mode_of_payment,
          bank_name: payment.bank_name,
          mobile_money_provider: payment.mode_of_mobilemoney,
          purpose: payment.purpose || '',
          status: '',
          quantity: 0,
          unit_price: 0
        })) || []),
        ...(expensesData?.map(expense => ({
          type: 'expense',
          id: expense.id,
          date: expense.date,
          item: expense.item,
          amount: 0,
          payment: 0,
          expense: expense.amount_spent,
          description: `Expense: ${expense.item}`,
          purpose: '',
          status: '',
          mode_of_payment: '',
          bank_name: '',
          mobile_money_provider: '',
          quantity: 0,
          unit_price: 0
        })) || [])
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      let orderBalance = 0;
      let netBalance = 0;
      const transactionsWithBalance = allTransactions.map(transaction => {
        if (transaction.type === 'opening_balance') {
          netBalance += transaction.amount;
        } else if (transaction.type === 'order') {
          orderBalance += transaction.amount;
          netBalance += transaction.amount;
        } else if (transaction.type === 'payment') {
          if (transaction.purpose === 'Debt Clearance') {
            netBalance -= transaction.payment;
          } else {
            orderBalance -= transaction.payment;
            netBalance -= transaction.payment;
          }
        } else if (transaction.type === 'expense') {
          netBalance -= transaction.expense;
        }
        return {
          ...transaction,
          order_balance: orderBalance,
          net_balance: netBalance
        };
      });

      setTransactions(transactionsWithBalance);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const addPayment = async () => {
    if (!selectedOrder || !newPayment.amount || !newPayment.mode_of_payment) return;

    try {
      const paymentData: any = {
        order_id: selectedOrder.id,
        amount_paid: parseFloat(newPayment.amount),
        created_at: newPayment.date,
        user_id: selectedMarketer.id,
        mode_of_payment: newPayment.mode_of_payment,
        payment_reference: `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        purpose: newPayment.purpose
      };

      if (newPayment.mode_of_payment === 'Bank') {
        paymentData.bank_name = newPayment.bank_name;
      } else if (newPayment.mode_of_payment === 'Mobile Money') {
        paymentData.mode_of_mobilemoney = newPayment.mobile_money_provider;
      }

      const { data, error } = await supabase
        .from("finance")
        .insert([paymentData]);

      if (error) throw error;
      
      await fetchPayments(selectedOrder.id);
      await fetchTransactions(selectedMarketer.id);
      setNewPayment({
        date: new Date().toISOString().split('T')[0],
        amount: "",
        mode_of_payment: "",
        bank_name: "",
        mobile_money_provider: "",
        purpose: newPayment.purpose
      });
    } catch (error) {
      console.error("Error adding payment:", error);
      alert("Error adding payment. Please try again.");
    }
  };

  const addOrder = async () => {
    if (!selectedMarketer || !newOrder.item || !newOrder.quantity || !newOrder.cost) return;

    try {
      const product = products.find(p => p.title === newOrder.item);
      if (!product) throw new Error("Product not found");

      const { data: orderData, error: orderError } = await supabase
        .from("order")
        .insert([{
          user: selectedMarketer.id,
          item: newOrder.item,
          quantity: parseFloat(newOrder.quantity),
          cost: parseFloat(newOrder.cost),
          created_at: newOrder.date,
          total_amount: parseFloat(newOrder.quantity) * parseFloat(newOrder.cost)
        }])
        .select();

      if (orderError) throw orderError;
      
      const { error: entryError } = await supabase
        .from("product_entries")
        .insert([{
          product_id: product.id,
          title: newOrder.item,
          quantity: -parseFloat(newOrder.quantity),
          created_at: newOrder.date,
          created_by: 'Admin',
          transaction: `${selectedMarketer.name}-Order`
        }]);

      if (entryError) throw entryError;
      
      await fetchOrders(selectedMarketer.id);
      await fetchTransactions(selectedMarketer.id);
      setNewOrder({
        date: new Date().toISOString().split('T')[0],
        item: "",
        quantity: "",
        cost: ""
      });
      setShowAddOrderDialog(false);
    } catch (error) {
      console.error("Error adding order:", error);
      alert("Error adding order. Please try again.");
    }
  };

  const addExpense = async () => {
    if (!selectedMarketer || !newExpense.item || !newExpense.amount) return;

    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("name")
        .eq("id", selectedMarketer.id)
        .single();

      if (userError) throw userError;
      if (!userData) throw new Error("User not found");

      const { data, error } = await supabase
        .from("expenses")
        .insert([{
          date: newExpense.date,
          item: newExpense.item,
          amount_spent: parseFloat(newExpense.amount),
          department: userData.name
        }]);

      if (error) throw error;
      
      await fetchExpenses(selectedMarketer.id);
      await fetchTransactions(selectedMarketer.id);
      setNewExpense({
        date: new Date().toISOString().split('T')[0],
        item: "",
        amount: ""
      });
      setShowExpenseDialog(false);
    } catch (error) {
      console.error("Error adding expense:", error);
      alert("Error adding expense. Please try again.");
    }
  };

  const addOpeningBalance = async () => {
    if (!newOpeningBalance.marketer_id || !newOpeningBalance.amount) return;

    try {
      const { data, error } = await supabase
        .from("opening_balances")
        .insert([{
          marketer_id: newOpeningBalance.marketer_id,
          amount: parseFloat(newOpeningBalance.amount),
          status: newOpeningBalance.status,
          created_at: newOpeningBalance.date
        }]);

      if (error) throw error;
      
      await fetchOpeningBalances();
      await fetchTransactions(newOpeningBalance.marketer_id);
      setNewOpeningBalance({
        date: new Date().toISOString().split('T')[0],
        amount: "",
        marketer_id: "",
        status: "Unpaid"
      });
      setShowOpeningBalanceDialog(false);
    } catch (error) {
      console.error("Error adding opening balance:", error);
      alert("Error adding opening balance. Please try again.");
    }
  };

  const updateOpeningBalanceStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("opening_balances")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
      
      await fetchOpeningBalances();
      
      if (status === "Pay") {
        const balance = openingBalances.find(b => b.id === id);
        if (balance) {
          setSelectedMarketer(marketers.find(m => m.id === balance.marketer_id));
          setNewPayment({
            date: new Date().toISOString().split('T')[0],
            amount: balance.amount.toString(),
            mode_of_payment: "",
            bank_name: "",
            mobile_money_provider: "",
            purpose: "Debt Clearance"
          });
          setShowPaymentForm(true);
        }
      }
    } catch (error) {
      console.error("Error updating opening balance status:", error);
      alert("Error updating status. Please try again.");
    }
  };

  const downloadLedger = () => {
    if (transactions.length === 0) return;

    const headers = [
      "Date",
      "Type",
      "Description",
      "Quantity",
      "Unit Price",
      "Order Amount",
      "Payment",
      "Expense",
      "Order Balance",
      "Net Balance"
    ];

    const csvRows = [
      headers.join(","),
      ...transactions.map(t => [
        new Date(t.date).toLocaleDateString(),
        t.type,
        t.type === 'order' ? 
          `${t.item} (Order #${t.id})` : 
          t.type === 'payment' ?
          `Payment (${t.mode_of_payment})` :
          t.type === 'opening_balance' ?
          `Opening Balance (${t.status})` :
          `Expense: ${t.item}`,
        t.type === 'order' || t.type === 'opening_balance' ? t.quantity : '',
        t.type === 'order' || t.type === 'opening_balance' ? t.unit_price : '',
        t.type === 'order' || t.type === 'opening_balance' ? t.amount : '',
        t.type === 'payment' ? t.payment : '',
        t.type === 'expense' ? t.expense : '',
        t.order_balance,
        t.net_balance
      ].map(v => `"${v}"`).join(","))
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ledger_${selectedMarketer?.name}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount_paid, 0);
  const balance = selectedOrder ? selectedOrder.total_amount - totalPaid : 0;
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount_spent, 0);

  useEffect(() => {
    fetchMarketers();
    fetchProducts();
    fetchOpeningBalances();
  }, []);

  const handleViewOrders = (marketer: any) => {
    setSelectedMarketer(marketer);
    fetchOrders(marketer.id);
    fetchExpenses(marketer.id);
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

      <div className="flex space-x-4 mb-6">
        <Button
          variant="outline"
          onClick={() => setShowOpeningBalanceDialog(true)}
        >
          Record Opening Balance
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowOpeningBalancesList(true)}
        >
          View Opening Balances
        </Button>
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

      {/* Add Opening Balance Dialog */}
      <Dialog open={showOpeningBalanceDialog} onOpenChange={setShowOpeningBalanceDialog}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Record Opening Balance
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <Input
                type="date"
                value={newOpeningBalance.date}
                onChange={(e) => setNewOpeningBalance({
                  ...newOpeningBalance,
                  date: e.target.value
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marketer
              </label>
              <Select
                value={newOpeningBalance.marketer_id}
                onValueChange={(value) => setNewOpeningBalance({
                  ...newOpeningBalance,
                  marketer_id: value
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a marketer" />
                </SelectTrigger>
                <SelectContent>
                  {marketers.map((marketer) => (
                    <SelectItem key={marketer.id} value={marketer.id}>
                      {marketer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={newOpeningBalance.amount}
                onChange={(e) => setNewOpeningBalance({
                  ...newOpeningBalance,
                  amount: e.target.value
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <Select
                value={newOpeningBalance.status}
                onValueChange={(value) => setNewOpeningBalance({
                  ...newOpeningBalance,
                  status: value
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Pending Clearance">Pending Clearance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={addOpeningBalance} disabled={!newOpeningBalance.marketer_id || !newOpeningBalance.amount}>
              Record Opening Balance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Opening Balances List Dialog */}
      <Dialog open={showOpeningBalancesList} onOpenChange={setShowOpeningBalancesList}>
        <DialogContent className="max-w-4xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Opening Balances
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Marketer</TableHead>
                  <TableHead className="font-semibold text-right">Amount</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openingBalances.map((balance) => {
                  const marketer = marketers.find(m => m.id === balance.marketer_id);
                  return (
                    <TableRow key={balance.id}>
                      <TableCell>
                        {new Date(balance.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{marketer?.name || 'Unknown'}</TableCell>
                      <TableCell className="text-right">
                        {parseFloat(balance.amount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            balance.status === 'Paid' ? 'default' :
                            balance.status === 'Pending Clearance' ? 'secondary' :
                            'destructive'
                          }
                        >
                          {balance.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Select
                          value={balance.status}
                          onValueChange={(value) => updateOpeningBalanceStatus(balance.id, value)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Change Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Unpaid">Unpaid</SelectItem>
                            <SelectItem value="Pay">Pay</SelectItem>
                            <SelectItem value="Paid">Paid</SelectItem>
                            <SelectItem value="Pending Clearance">Pending Clearance</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {openingBalances.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No opening balances recorded
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Form for Debt Clearance */}
      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Record Payment for Debt Clearance
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mode of Payment
              </label>
              <Select
                value={newPayment.mode_of_payment}
                onValueChange={(value) => setNewPayment({
                  ...newPayment,
                  mode_of_payment: value,
                  bank_name: "",
                  mobile_money_provider: ""
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank">Bank</SelectItem>
                  <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newPayment.mode_of_payment === 'Bank' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <Input
                  type="text"
                  placeholder="Enter bank name"
                  value={newPayment.bank_name}
                  onChange={(e) => setNewPayment({
                    ...newPayment,
                    bank_name: e.target.value
                  })}
                />
              </div>
            )}
            {newPayment.mode_of_payment === 'Mobile Money' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Money Provider
                </label>
                <Select
                  value={newPayment.mobile_money_provider}
                  onValueChange={(value) => setNewPayment({
                    ...newPayment,
                    mobile_money_provider: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MTN">MTN</SelectItem>
                    <SelectItem value="Airtel">Airtel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                addPayment();
                setShowPaymentForm(false);
              }}
              disabled={!newPayment.amount || !newPayment.mode_of_payment || 
                (newPayment.mode_of_payment === 'Bank' && !newPayment.bank_name) ||
                (newPayment.mode_of_payment === 'Mobile Money' && !newPayment.mobile_money_provider)}
            >
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Orders Dialog */}
      <Dialog open={showOrdersDialog} onOpenChange={setShowOrdersDialog}>
        <DialogContent className="max-w-6xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Orders for {selectedMarketer?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-end mb-4 space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddOrderDialog(true)}
            >
              Add New Order
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExpenseDialog(true)}
            >
              Record Expense
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

      {/* Add Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Record Expense for {selectedMarketer?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <Input
                type="date"
                value={newExpense.date}
                onChange={(e) => setNewExpense({
                  ...newExpense,
                  date: e.target.value
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item
              </label>
              <Input
                type="text"
                placeholder="Enter expense item"
                value={newExpense.item}
                onChange={(e) => setNewExpense({
                  ...newExpense,
                  item: e.target.value
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
                value={newExpense.amount}
                onChange={(e) => setNewExpense({
                  ...newExpense,
                  amount: e.target.value
                })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={addExpense} disabled={!newExpense.item || !newExpense.amount}>
              Record Expense
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
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadLedger}
            >
              Download as CSV
            </Button>
          </div>
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
                  <TableHead className="font-semibold text-right">Expense</TableHead>
                  <TableHead className="font-semibold text-right">Order Balance</TableHead>
                  <TableHead className="font-semibold text-right">Net Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction, index) => (
                  <TableRow key={`${transaction.type}-${transaction.id}-${index}`}>
                    <TableCell>
                      {new Date(transaction.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {transaction.type === 'order' ? 
                        `${transaction.item} (Order #${transaction.id})` : 
                        transaction.type === 'payment' ?
                        `Payment (${transaction.mode_of_payment})` :
                        transaction.type === 'opening_balance' ?
                        `Opening Balance (${transaction.status})` :
                        `Expense: ${transaction.item}`}
                      {transaction.bank_name && ` - ${transaction.bank_name}`}
                      {transaction.mobile_money_provider && ` - ${transaction.mobile_money_provider}`}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.type === 'order' || transaction.type === 'opening_balance' ? transaction.quantity : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.type === 'order' || transaction.type === 'opening_balance' ? transaction.unit_price.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.type === 'order' || transaction.type === 'opening_balance' ? transaction.amount.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.type === 'payment' ? transaction.payment.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.type === 'expense' ? transaction.expense.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      transaction.order_balance > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {transaction.order_balance.toLocaleString()}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      transaction.net_balance > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {transaction.net_balance.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
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
                    <TableHead>Mode</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {new Date(payment.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{payment.mode_of_payment}</TableCell>
                      <TableCell>
                        {payment.mode_of_payment === 'Bank' && payment.bank_name}
                        {payment.mode_of_payment === 'Mobile Money' && payment.mode_of_mobilemoney}
                      </TableCell>
                      <TableCell>
                        {payment.amount_paid.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                        No payments recorded
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Add New Payment</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mode of Payment
                  </label>
                  <Select
                    value={newPayment.mode_of_payment}
                    onValueChange={(value) => setNewPayment({
                      ...newPayment,
                      mode_of_payment: value,
                      bank_name: "",
                      mobile_money_provider: ""
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank">Bank</SelectItem>
                      <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newPayment.mode_of_payment === 'Bank' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Name
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter bank name"
                      value={newPayment.bank_name}
                      onChange={(e) => setNewPayment({
                        ...newPayment,
                        bank_name: e.target.value
                      })}
                    />
                  </div>
                )}
                {newPayment.mode_of_payment === 'Mobile Money' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mobile Money Provider
                    </label>
                    <Select
                      value={newPayment.mobile_money_provider}
                      onValueChange={(value) => setNewPayment({
                        ...newPayment,
                        mobile_money_provider: value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MTN">MTN</SelectItem>
                        <SelectItem value="Airtel">Airtel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purpose
                  </label>
                  <Select
                    value={newPayment.purpose}
                    onValueChange={(value) => setNewPayment({
                      ...newPayment,
                      purpose: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select purpose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Order Payment">Order Payment</SelectItem>
                      <SelectItem value="Debt Clearance">Debt Clearance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={addPayment}
                  className="w-full"
                  disabled={!newPayment.amount || !newPayment.mode_of_payment || 
                    (newPayment.mode_of_payment === 'Bank' && !newPayment.bank_name) ||
                    (newPayment.mode_of_payment === 'Mobile Money' && !newPayment.mobile_money_provider)}
                >
                  Add Payment
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
