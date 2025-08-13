// app/suppliers/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Supplier {
  id: string;
  name: string;
  contact: string;
  address: string;
  created_at: string;
}

interface SupplyItem {
  id: string;
  supplier_id: string;
  name: string;
  quantity: number;
  price: number;
  created_at: string;
}

interface Delivery {
  id: string;
  supply_item_id: string;
  quantity: number;
  value: number;
  delivery_date: string;
  notes?: string;
  created_at: string;
}

interface Payment {
  id: string;
  supply_item_id: string;
  amount: number;
  payment_date: string;
  method: string;
  reference?: string;
  created_at: string;
}

interface Material {
  id: string;
  name: string;
  created_at: string;
}

interface SupplierBalance {
  id: string;
  supplier_id: string;
  opening_balance: number;
  balance_type: 'debit' | 'credit';
  current_balance: number;
  created_at: string;
  updated_at: string;
}

type Transaction = {
  id: string;
  type: 'delivery' | 'payment';
  date: string;
  quantity?: number;
  amount?: number;
  value?: number;
  method?: string;
  reference?: string;
  notes?: string;
};

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplyItems, setSupplyItems] = useState<SupplyItem[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [supplierBalances, setSupplierBalances] = useState<SupplierBalance[]>([]);
  const [showOtherInput, setShowOtherInput] = useState(false);
  
  const getEastAfricanDate = () => {
    const now = new Date();
    const offset = 3 * 60 * 60 * 1000;
    const eastAfricanTime = new Date(now.getTime() + offset);
    return eastAfricanTime.toISOString().split('T')[0];
  };
  
  const [supplierForm, setSupplierForm] = useState<Omit<Supplier, "id" | "created_at">>({
    name: "",
    contact: "",
    address: "",
  });
  
  const [itemForm, setItemForm] = useState<Omit<SupplyItem, "id" | "created_at">>({
    supplier_id: "",
    name: "",
    quantity: 0,
    price: 0,
  });
  
  const [deliveryForm, setDeliveryForm] = useState<Omit<Delivery, "id" | "created_at" | "value">>({
    supply_item_id: "",
    quantity: 0,
    delivery_date: getEastAfricanDate(),
    notes: "",
  });
  
  const [paymentForm, setPaymentForm] = useState<Omit<Payment, "id" | "created_at">>({
    supply_item_id: "",
    amount: 0,
    payment_date: getEastAfricanDate(),
    method: "cash",
    reference: "",
  });

  const [balanceForm, setBalanceForm] = useState({
    supplier_id: "",
    opening_balance: 0,
    balance_type: "credit" as 'credit' | 'debit',
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedItem, setSelectedItem] = useState<SupplyItem | null>(null);
  const [showSuppliesModal, setShowSuppliesModal] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [showBalanceForm, setShowBalanceForm] = useState(false);

  const getSupplierItems = (supplierId: string) => {
    return supplyItems.filter(item => item.supplier_id === supplierId);
  };

  const getItemDeliveries = (itemId: string) => {
    return deliveries.filter(d => d.supply_item_id === itemId)
                    .sort((a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime());
  };

  const getItemPayments = (itemId: string) => {
    return payments.filter(p => p.supply_item_id === itemId)
                  .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
  };

  const getSupplierBalance = (supplierId: string) => {
    return supplierBalances.find(b => b.supplier_id === supplierId);
  };

  const getCombinedTransactions = (itemId: string): Transaction[] => {
    const itemDeliveries = getItemDeliveries(itemId).map(d => ({
      id: d.id,
      type: 'delivery' as const,
      date: d.delivery_date,
      quantity: d.quantity,
      value: d.value,
      notes: d.notes,
    }));

    const itemPayments = getItemPayments(itemId).map(p => ({
      id: p.id,
      type: 'payment' as const,
      date: p.payment_date,
      amount: p.amount,
      method: p.method,
      reference: p.reference,
    }));

    return [...itemDeliveries, ...itemPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getTotalDeliveredValue = (itemId: string) => {
    return getItemDeliveries(itemId).reduce((sum, d) => sum + d.value, 0);
  };

  const getTotalPaid = (itemId: string) => {
    return getItemPayments(itemId).reduce((sum, p) => sum + p.amount, 0);
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleString('en-US', options);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX'
    }).format(amount);
  };

  const formatBalance = (balance: SupplierBalance | undefined) => {
    if (!balance) return "Not set";
    const amount = formatCurrency(balance.current_balance);
    return balance.balance_type === 'debit' 
      ? `${amount} (Company owes supplier)`
      : `${amount} (Supplier owes company)`;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const [
          { data: suppliersData, error: suppliersError },
          { data: itemsData, error: itemsError },
          { data: deliveriesData, error: deliveriesError },
          { data: paymentsData, error: paymentsError },
          { data: materialsData, error: materialsError },
          { data: balancesData, error: balancesError }
        ] = await Promise.all([
          supabase.from('suppliers').select('*').order('created_at', { ascending: false }),
          supabase.from('supply_items').select('*'),
          supabase.from('deliveries').select('*'),
          supabase.from('payments').select('*'),
          supabase.from('materials').select('*').order('name', { ascending: true }),
          supabase.from('supplier_balances').select('*')
        ]);

        if (suppliersError) throw suppliersError;
        if (itemsError) throw itemsError;
        if (deliveriesError) throw deliveriesError;
        if (paymentsError) throw paymentsError;
        if (materialsError) throw materialsError;
        if (balancesError) throw balancesError;

        setSuppliers(suppliersData || []);
        setSupplyItems(itemsData || []);
        setDeliveries(deliveriesData || []);
        setPayments(paymentsData || []);
        setMaterials(materialsData || []);
        setSupplierBalances(balancesData || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert([supplierForm])
        .select();

      if (error) throw error;

      if (data?.[0]) {
        setSuppliers(prev => [data[0], ...prev]);
        resetSupplierForm();
      }
    } catch (err) {
      console.error('Error saving supplier:', err);
      setError('Failed to save supplier. Please try again.');
    }
  };

  const handleBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (!selectedSupplier) return;
      
      const { data, error } = await supabase
        .from('supplier_balances')
        .upsert([{ 
          supplier_id: selectedSupplier.id,
          opening_balance: balanceForm.opening_balance,
          balance_type: balanceForm.balance_type,
          current_balance: balanceForm.opening_balance
        }])
        .select();

      if (error) throw error;

      if (data?.[0]) {
        setSupplierBalances(prev => {
          const existing = prev.find(b => b.supplier_id === selectedSupplier.id);
          if (existing) {
            return prev.map(b => b.supplier_id === selectedSupplier.id ? data[0] : b);
          }
          return [...prev, data[0]];
        });
        setShowBalanceForm(false);
      }
    } catch (err) {
      console.error('Error saving balance:', err);
      setError('Failed to save balance. Please try again.');
    }
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (!selectedSupplier) return;
      
      const { data, error } = await supabase
        .from('supply_items')
        .insert([{ ...itemForm, supplier_id: selectedSupplier.id }])
        .select();

      if (error) throw error;

      if (data?.[0]) {
        setSupplyItems(prev => [...prev, data[0]]);
        resetItemForm();
      }
    } catch (err) {
      console.error('Error saving supply item:', err);
      setError('Failed to save supply item. Please try again.');
    }
  };

  const handleDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (!selectedItem) return;
      
      const deliveryValue = deliveryForm.quantity * selectedItem.price;
      const deliveryData = {
        ...deliveryForm,
        supply_item_id: selectedItem.id,
        value: deliveryValue
      };

      const { data, error } = await supabase
        .from('deliveries')
        .insert([deliveryData])
        .select();

      if (error) throw error;

      if (data?.[0]) {
        setDeliveries(prev => [...prev, data[0]]);
        
        const supplierBalance = getSupplierBalance(selectedItem.supplier_id);
        if (supplierBalance) {
          let newBalance = supplierBalance.current_balance;
          
          if (supplierBalance.balance_type === 'credit') {
            newBalance = Math.max(0, supplierBalance.current_balance - deliveryValue);
          } else {
            newBalance = supplierBalance.current_balance + deliveryValue;
          }
          
          const { error: balanceError } = await supabase
            .from('supplier_balances')
            .update({ current_balance: newBalance })
            .eq('supplier_id', selectedItem.supplier_id);

          if (balanceError) throw balanceError;

          setSupplierBalances(prev => 
            prev.map(b => 
              b.supplier_id === selectedItem.supplier_id 
                ? { ...b, current_balance: newBalance } 
                : b
            )
          );
        }

        resetDeliveryForm();
      }
    } catch (err) {
      console.error('Error saving delivery:', err);
      setError('Failed to save delivery. Please try again.');
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (!selectedItem) return;
      
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert([{ ...paymentForm, supply_item_id: selectedItem.id }])
        .select();

      if (paymentError) throw paymentError;

      if (paymentData?.[0]) {
        setPayments(prev => [...prev, paymentData[0]]);
        
        const expenseData = {
          item: 'Payment of Material',
          amount_spent: paymentForm.amount,
          date: paymentForm.payment_date,
          department: selectedItem.name,
          account: paymentForm.method === 'mobile_money' ? paymentForm.reference || '' : 
                  paymentForm.method === 'bank' ? paymentForm.reference || '' : 'Cash',
          mode_of_payment: paymentForm.method,
          submittedby: 'Admin'
        };

        const { error: expenseError } = await supabase
          .from('expenses')
          .insert([expenseData]);

        if (expenseError) throw expenseError;

        const supplierBalance = getSupplierBalance(selectedItem.supplier_id);
        if (supplierBalance) {
          let newBalance = supplierBalance.current_balance;
          
          if (supplierBalance.balance_type === 'debit') {
            newBalance = Math.max(0, supplierBalance.current_balance - paymentForm.amount);
          } else {
            newBalance = supplierBalance.current_balance + paymentForm.amount;
          }
          
          const { error: balanceError } = await supabase
            .from('supplier_balances')
            .update({ current_balance: newBalance })
            .eq('supplier_id', selectedItem.supplier_id);

          if (balanceError) throw balanceError;

          setSupplierBalances(prev => 
            prev.map(b => 
              b.supplier_id === selectedItem.supplier_id 
                ? { ...b, current_balance: newBalance } 
                : b
            )
          );
        }

        resetPaymentForm();
      }
    } catch (err) {
      console.error('Error saving payment:', err);
      setError('Failed to save payment. Please try again.');
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    setError(null);
    
    try {
      const { data: items, error: itemsError } = await supabase
        .from('supply_items')
        .select('id')
        .eq('supplier_id', id);

      if (itemsError) throw itemsError;

      if (items && items.length > 0) {
        const itemIds = items.map(item => item.id);
        
        await supabase
          .from('deliveries')
          .delete()
          .in('supply_item_id', itemIds);

        await supabase
          .from('payments')
          .delete()
          .in('supply_item_id', itemIds);

        await supabase
          .from('supply_items')
          .delete()
          .in('id', itemIds);
      }

      await supabase
        .from('supplier_balances')
        .delete()
        .eq('supplier_id', id);

      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSuppliers(prev => prev.filter(s => s.id !== id));
      setSupplierBalances(prev => prev.filter(b => b.supplier_id !== id));
    } catch (err) {
      console.error('Error deleting supplier:', err);
      setError('Failed to delete supplier. Please try again.');
    }
  };

  const handleDeleteItem = async (id: string) => {
    setError(null);
    
    try {
      await supabase
        .from('deliveries')
        .delete()
        .eq('supply_item_id', id);

      await supabase
        .from('payments')
        .delete()
        .eq('supply_item_id', id);

      const { error } = await supabase
        .from('supply_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSupplyItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error('Error deleting item:', err);
      setError('Failed to delete item. Please try again.');
    }
  };

  const resetSupplierForm = () => {
    setSupplierForm({
      name: "",
      contact: "",
      address: ""
    });
    setShowSupplierForm(false);
  };

  const resetItemForm = () => {
    setItemForm({
      supplier_id: "",
      name: "",
      quantity: 0,
      price: 0,
    });
    setShowItemForm(false);
    setShowOtherInput(false);
  };

  const resetDeliveryForm = () => {
    setDeliveryForm({
      supply_item_id: "",
      quantity: 0,
      delivery_date: getEastAfricanDate(),
      notes: "",
    });
    setShowDeliveryForm(false);
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      supply_item_id: "",
      amount: 0,
      payment_date: getEastAfricanDate(),
      method: "cash",
      reference: "",
    });
    setShowPaymentForm(false);
  };

  const resetBalanceForm = () => {
    setBalanceForm({
      supplier_id: "",
      opening_balance: 0,
      balance_type: "credit",
    });
    setShowBalanceForm(false);
  };

  const handleMaterialChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    if (selectedValue === "other") {
      setShowOtherInput(true);
      setItemForm({...itemForm, name: ""});
    } else {
      setShowOtherInput(false);
      setItemForm({...itemForm, name: selectedValue});
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p>Loading service providers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-blue-500">📦</span> Service providers
            </h1>
            <p className="text-gray-600">Manage your service providers and their supplies</p>
          </div>
          <button
            onClick={() => setShowSupplierForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <span>+</span> Add new
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        {suppliers.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">📭</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No data yet</h3>
            <p className="text-gray-500 mb-4">Get started by adding your first service provider</p>
            <button
              onClick={() => setShowSupplierForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Add new
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplies
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Added
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {suppliers.map((supplier) => {
                  const balance = getSupplierBalance(supplier.id);
                  return (
                    <tr key={supplier.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{supplier.name}</div>
                        <div className="text-sm text-gray-500">{supplier.address}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {supplier.contact}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          balance?.current_balance 
                            ? balance.balance_type === 'credit' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {formatBalance(balance)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {getSupplierItems(supplier.id).length} items
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(supplier.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => {
                              setSelectedSupplier(supplier);
                              setShowSuppliesModal(true);
                            }}
                            className="px-3 py-1 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 flex items-center gap-1"
                          >
                            <span>📦</span> View Supplies
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSupplier(supplier);
                              setBalanceForm({
                                supplier_id: supplier.id,
                                opening_balance: balance?.current_balance || 0,
                                balance_type: balance?.balance_type || 'credit'
                              });
                              setShowBalanceForm(true);
                            }}
                            className="px-3 py-1 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 flex items-center gap-1"
                          >
                            <span>💰</span> Set Balance
                          </button>
                          <button 
                            onClick={() => handleDeleteSupplier(supplier.id)}
                            className="px-3 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center gap-1"
                          >
                            <span>🗑️</span> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Supplier Form Modal */}
      {showSupplierForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Add New Supplier
                </h3>
                <button 
                  onClick={resetSupplierForm}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSupplierSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact
                  </label>
                  <input
                    type="text"
                    name="contact"
                    value={supplierForm.contact}
                    onChange={(e) => setSupplierForm({...supplierForm, contact: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={supplierForm.address}
                    onChange={(e) => setSupplierForm({...supplierForm, address: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {error && (
                  <div className="p-2 bg-red-100 text-red-700 text-sm rounded-lg">
                    {error}
                  </div>
                )}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetSupplierForm}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Save Supplier
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Balance Form Modal */}
      {showBalanceForm && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Set Balance for {selectedSupplier.name}
                </h3>
                <button 
                  onClick={resetBalanceForm}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleBalanceSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Balance Type
                  </label>
                  <select
                    value={balanceForm.balance_type}
                    onChange={(e) => setBalanceForm({
                      ...balanceForm,
                      balance_type: e.target.value as 'credit' | 'debit'
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="credit">Supplier owes company</option>
                    <option value="debit">Company owes supplier</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (UGX)
                  </label>
                  <input
                    type="number"
                    name="opening_balance"
                    value={balanceForm.opening_balance}
                    onChange={(e) => setBalanceForm({
                      ...balanceForm,
                      opening_balance: Number(e.target.value)
                    })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {error && (
                  <div className="p-2 bg-red-100 text-red-700 text-sm rounded-lg">
                    {error}
                  </div>
                )}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetBalanceForm}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Save Balance
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Supplies Table Modal */}
      {showSuppliesModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="p-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Services from {selectedSupplier.name}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setItemForm({
                        ...itemForm,
                        supplier_id: selectedSupplier.id
                      });
                      setShowItemForm(true);
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1"
                  >
                    <span>+</span> Add Item
                  </button>
                  <button 
                    onClick={() => setShowSuppliesModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="overflow-y-auto max-h-[60vh]">
                {getSupplierItems(selectedSupplier.id).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No items found for this service provider.
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Item
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Delivered
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Paid
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Balance
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getSupplierItems(selectedSupplier.id).map((item) => {
                        const totalDelivered = getTotalDeliveredValue(item.id);
                        const totalPaid = getTotalPaid(item.id);
                        const balance = totalDelivered - totalPaid;

                        return (
                          <tr key={item.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(item.price)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(totalDelivered)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(totalPaid)}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                              balance > 0 ? 'text-blue-600' : 'text-green-600'
                            }`}>
                              {formatCurrency(Math.abs(balance))}
                              {balance > 0 ? ' (Company owes)' : ' (Supplier owes)'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setShowTransactionsModal(true);
                                  }}
                                  className="text-purple-600 hover:text-purple-900"
                                >
                                  View Details
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setShowDeliveryForm(true);
                                  }}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Record Delivery
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setPaymentForm({
                                      ...paymentForm,
                                      supply_item_id: item.id,
                                      amount: Math.max(0, totalDelivered - totalPaid)
                                    });
                                    setShowPaymentForm(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Record Payment
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transactions History Modal */}
      {showTransactionsModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Transaction History for {selectedItem.name}
                </h3>
                <button 
                  onClick={() => setShowTransactionsModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              
              <div className="overflow-y-auto max-h-[70vh]">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getCombinedTransactions(selectedItem.id).map((txn) => (
                      <tr key={`${txn.type}-${txn.id}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            txn.type === 'delivery' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {txn.type === 'delivery' ? 'Delivery' : 'Payment'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(txn.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {txn.type === 'delivery' ? txn.quantity : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {txn.type === 'delivery' 
                            ? formatCurrency(txn.value || 0)
                            : formatCurrency(txn.amount || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {txn.type === 'payment' ? (
                            <div>
                              <div className="font-medium">{txn.method}</div>
                              {txn.reference && <div className="text-xs">Ref: {txn.reference}</div>}
                            </div>
                          ) : (
                            txn.notes || '-'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Item Form Modal */}
      {showItemForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Add New Item
                </h3>
                <button 
                  onClick={resetItemForm}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleItemSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name
                  </label>
                  <select
                    onChange={handleMaterialChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    defaultValue=""
                  >
                    <option value="" disabled>Select item</option>
                    {materials.map((material) => (
                      <option key={material.id} value={material.name}>
                        {material.name}
                      </option>
                    ))}
                    <option value="other">Other (specify below)</option>
                  </select>
                  
                  {showOtherInput && (
                    <input
                      type="text"
                      name="name"
                      value={itemForm.name}
                      onChange={(e) => setItemForm({...itemForm, name: e.target.value})}
                      required
                      placeholder="Enter supply item name"
                      className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity Ordered
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      value={itemForm.quantity}
                      onChange={(e) => setItemForm({...itemForm, quantity: Number(e.target.value)})}
                      required
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Price (UGX)
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={itemForm.price}
                      onChange={(e) => setItemForm({...itemForm, price: Number(e.target.value)})}
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Total Cost:</span>
                    <span className="font-medium">
                      {formatCurrency((itemForm.quantity || 0) * (itemForm.price || 0))}
                    </span>
                  </div>
                </div>

                {error && (
                  <div className="p-2 bg-red-100 text-red-700 text-sm rounded-lg">
                    {error}
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetItemForm}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Save Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Form Modal */}
      {showDeliveryForm && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Record Delivery for {selectedItem.name}
                </h3>
                <button 
                  onClick={resetDeliveryForm}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleDeliverySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity Delivered
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={deliveryForm.quantity}
                    onChange={(e) => setDeliveryForm({...deliveryForm, quantity: Number(e.target.value)})}
                    required
                    min="0.01"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price (UGX)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={selectedItem.price}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-100 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Date
                  </label>
                  <input
                    type="date"
                    name="delivery_date"
                    value={deliveryForm.delivery_date}
                    onChange={(e) => setDeliveryForm({...deliveryForm, delivery_date: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    name="notes"
                    value={deliveryForm.notes || ''}
                    onChange={(e) => setDeliveryForm({...deliveryForm, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 mb-2">
                    <div>
                      <span className="text-sm font-medium">Unit Price:</span>
                      <div className="font-medium">
                        {formatCurrency(selectedItem.price)}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Delivery Value:</span>
                      <div className="font-medium">
                        {formatCurrency(deliveryForm.quantity * selectedItem.price)}
                      </div>
                    </div>
                  </div>
                  
                  {supplierBalance && (
                    <div className="mt-2">
                      <span className="text-sm font-medium">Current Balance:</span>
                      <div className={`font-medium ${
                        supplierBalance.current_balance > 0 
                          ? supplierBalance.balance_type === 'credit' 
                            ? 'text-red-600' 
                            : 'text-blue-600'
                          : 'text-green-600'
                      }`}>
                        {supplierBalance.balance_type === 'credit' 
                          ? `${formatCurrency(supplierBalance.current_balance)} (Supplier owes company)`
                          : `${formatCurrency(supplierBalance.current_balance)} (Company owes supplier)`}
                      </div>
                      
                      <span className="text-sm font-medium">Balance After Delivery:</span>
                      <div className={`font-medium ${
                        supplierBalance.balance_type === 'credit'
                          ? (supplierBalance.current_balance - (deliveryForm.quantity * selectedItem.price)) > 0
                            ? 'text-red-600'
                            : 'text-green-600'
                          : (supplierBalance.current_balance + (deliveryForm.quantity * selectedItem.price)) > 0
                            ? 'text-blue-600'
                            : 'text-green-600'
                      }`}>
                        {supplierBalance.balance_type === 'credit'
                          ? formatCurrency(supplierBalance.current_balance - (deliveryForm.quantity * selectedItem.price))
                          : formatCurrency(supplierBalance.current_balance + (deliveryForm.quantity * selectedItem.price))}
                        {supplierBalance.balance_type === 'credit'
                          ? ` (Supplier will ${supplierBalance.current_balance - (deliveryForm.quantity * selectedItem.price) > 0 ? 'still owe' : 'be settled with'})`
                          : ` (Company will ${supplierBalance.current_balance + (deliveryForm.quantity * selectedItem.price) > 0 ? 'still owe' : 'be settled with'})`}
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-2 bg-red-100 text-red-700 text-sm rounded-lg">
                    {error}
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetDeliveryForm}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Record Delivery
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Record Payment for {selectedItem.name}
                </h3>
                <button 
                  onClick={resetPaymentForm}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (UGX)
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({...paymentForm, amount: Number(e.target.value)})}
                    required
                    min="0.01"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    name="payment_date"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    name="method"
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({...paymentForm, method: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference (Optional)
                  </label>
                  <input
                    type="text"
                    name="reference"
                    value={paymentForm.reference || ''}
                    onChange={(e) => setPaymentForm({...paymentForm, reference: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  {supplierBalance && (
                    <div>
                      <span className="text-sm font-medium">Current Balance:</span>
                      <div className={`font-medium ${
                        supplierBalance.current_balance > 0 
                          ? supplierBalance.balance_type === 'credit' 
                            ? 'text-red-600' 
                            : 'text-blue-600'
                          : 'text-green-600'
                      }`}>
                        {supplierBalance.balance_type === 'credit' 
                          ? `${formatCurrency(supplierBalance.current_balance)} (Supplier owes company)`
                          : `${formatCurrency(supplierBalance.current_balance)} (Company owes supplier)`}
                      </div>
                      
                      <span className="text-sm font-medium">Balance After Payment:</span>
                      <div className={`font-medium ${
                        supplierBalance.balance_type === 'debit'
                          ? (supplierBalance.current_balance - paymentForm.amount) > 0
                            ? 'text-blue-600'
                            : 'text-green-600'
                          : (supplierBalance.current_balance + paymentForm.amount) > 0
                            ? 'text-red-600'
                            : 'text-green-600'
                      }`}>
                        {supplierBalance.balance_type === 'debit'
                          ? formatCurrency(supplierBalance.current_balance - paymentForm.amount)
                          : formatCurrency(supplierBalance.current_balance + paymentForm.amount)}
                        {supplierBalance.balance_type === 'debit'
                          ? ` (Company will ${supplierBalance.current_balance - paymentForm.amount > 0 ? 'still owe' : 'be settled with'})`
                          : ` (Supplier will ${supplierBalance.current_balance + paymentForm.amount > 0 ? 'still owe' : 'be settled with'})`}
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-2 bg-red-100 text-red-700 text-sm rounded-lg">
                    {error}
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetPaymentForm}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Record Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
