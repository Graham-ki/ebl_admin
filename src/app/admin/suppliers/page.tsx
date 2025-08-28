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
  client_id?: string;
  created_at: string;
}

interface Payment {
  id: string;
  supply_item_id: string;
  supplier_id: string;
  amount: number;
  payment_date: string;
  method: string;
  bank_name?: string;
  mode_of_mobilemoney?: string;
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

interface Client {
  id: string;
  name: string;
  created_at: string;
}

interface Order {
  id: string;
  user: string;
  item: string;
  cost: number;
  quantity: number;
  created_at: string;
}

interface FinanceRecord {
  mode_of_payment: string;
  bank_name?: string;
  mode_of_mobilemoney?: string;
}

// Define helper functions first
let supplierBalances: SupplierBalance[] = [];

const getSupplierBalance = (supplierId: string) => {
  return supplierBalances.find(b => b.supplier_id === supplierId);
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'UGX'
  }).format(amount);
};

type Transaction = {
  id: string;
  type: 'delivery' | 'payment';
  date: string;
  quantity?: number;
  amount?: number;
  value?: number;
  method?: string;
  bank_name?: string;
  mode_of_mobilemoney?: string;
  notes?: string;
  client_id?: string;
};

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplyItems, setSupplyItems] = useState<SupplyItem[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [localSupplierBalances, setLocalSupplierBalances] = useState<SupplierBalance[]>([]);
  
  // Update the global supplierBalances variable when localSupplierBalances changes
  useEffect(() => {
    supplierBalances = localSupplierBalances;
  }, [localSupplierBalances]);
  const [clients, setClients] = useState<Client[]>([]);
  const [financeRecords, setFinanceRecords] = useState<FinanceRecord[]>([]);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [deliveryNoteType, setDeliveryNoteType] = useState('');
  
  const getEastAfricanDateTime = () => {
    const now = new Date();
    const offset = 3 * 60 * 60 * 1000; // East Africa Time (UTC+3)
    const eastAfricanTime = new Date(now.getTime() + offset);
    
    // Format as YYYY-MM-DDTHH:MM for datetime-local input
    const year = eastAfricanTime.getFullYear();
    const month = String(eastAfricanTime.getMonth() + 1).padStart(2, '0');
    const day = String(eastAfricanTime.getDate()).padStart(2, '0');
    const hours = String(eastAfricanTime.getHours()).padStart(2, '0');
    const minutes = String(eastAfricanTime.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
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
    delivery_date: getEastAfricanDateTime(),
    notes: "",
    client_id: "",
  });

  const [selectedClient, setSelectedClient] = useState('');
  
  const [paymentForm, setPaymentForm] = useState<Omit<Payment, "id" | "created_at">>({    
    supply_item_id: "",    
    supplier_id: "",    
    amount: 0,    
    payment_date: getEastAfricanDateTime(),    
    method: "cash",    
    bank_name: "",    
    mode_of_mobilemoney: "",  
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

  // Get unique payment methods from finance records
  const getUniquePaymentMethods = () => {
      const methods = new Set<string>();
      financeRecords.forEach(record => {
        if (record.mode_of_payment) {
          // Normalize the payment method values for consistency
          const normalizedMethod = record.mode_of_payment.toLowerCase()
            .replace(/\s+/g, '_')
            .replace('mobile_money', 'mobile_money')
            .replace('mobile money', 'mobile_money')
            .replace('bank', 'bank')
            .replace('cash', 'cash');

          methods.add(normalizedMethod);
        }
      });
    
    // Always include the basic methods
    methods.add('cash');
    methods.add('bank');
    methods.add('mobile_money');
    
    return Array.from(methods);
  };

  // Get unique bank names for Bank payment method
  const getUniqueBankNames = () => {
      const banks = new Set<string>();
      financeRecords.forEach(record => {
        // Match both 'bank' and 'Bank' etc.
        const isBank = record.mode_of_payment && 
          (record.mode_of_payment.toLowerCase() === 'bank' ||
           record.mode_of_payment.toLowerCase() === 'bank transfer');

        if (isBank && record.bank_name) {
          banks.add(record.bank_name);
        }
      });
      return Array.from(banks);
  };

  // Get unique mobile money modes for Mobile Money payment method
  const getUniqueMobileMoneyModes = () => {
      const modes = new Set<string>();
      financeRecords.forEach(record => {
        // Match both 'mobile money' and 'mobile_money' etc.
        const isMobileMoney = record.mode_of_payment &&
          (record.mode_of_payment.toLowerCase().includes('mobile') ||
           record.mode_of_payment.toLowerCase().includes('mtn') ||
           record.mode_of_payment.toLowerCase().includes('airtel'));

        if (isMobileMoney && record.mode_of_mobilemoney) {
          modes.add(record.mode_of_mobilemoney);
        }
      });
    
    // Always include the common mobile money options
    //modes.add('MTN Mobile Money');
    //modes.add('Airtel Money');
    
    return Array.from(modes);
  };

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
      client_id: d.client_id || undefined,
    }));

    const itemPayments = getItemPayments(itemId).map(p => ({
      id: p.id,
      type: 'payment' as const,
      date: p.payment_date,
      amount: p.amount,
      method: p.method,
      bank_name: p.bank_name,
      mode_of_mobilemoney: p.mode_of_mobilemoney,
    }));

    return [...itemDeliveries, ...itemPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getClientName = (clientId: string | undefined) => {
    if (!clientId) return null;
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : null;
  };

  const getTotalDeliveredValue = (itemId: string) => {
    return getItemDeliveries(itemId).reduce((sum, d) => sum + d.value, 0);
  };

  const getTotalPaid = (itemId: string) => {
    return getItemPayments(itemId).reduce((sum, p) => sum + p.amount, 0);
  };

  const formatDate = (dateString: string) => {
    // Handle both date-only and datetime strings
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleString('en-US', options);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX'
    }).format(amount);
  };

  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case 'cash': return 'Cash';
      case 'bank': return 'Bank';
      case 'mobile_money': return 'Mobile Money';
      default: return method.charAt(0).toUpperCase() + method.slice(1);
    }
  };

  const SupplierBalanceDisplay = ({ 
    supplierId,
    balanceOverride 
  }: { 
    supplierId: string;
    balanceOverride?: SupplierBalance;
  }) => {
    const balance = balanceOverride || getSupplierBalance(supplierId);
    
    if (!balance) return <span className="text-gray-500">Not set</span>;

    const amount = formatCurrency(Math.abs(balance.current_balance));
    const isCredit = balance.balance_type === 'credit';
    const isPositive = balance.current_balance > 0;

    if (balance.current_balance === 0) {
      return <span className="text-green-600">Settled (0)</span>;
    }

    return (
      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          isPositive 
            ? isCredit ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
            : 'bg-green-100 text-green-800'
        }`}>
          {amount}
        </span>
        <span className="text-sm text-gray-600">
          {isPositive
            ? isCredit 
              ? "(Supplier owes company)"
              : "(Company owes supplier)"
            : isCredit
              ? "(Company overpaid)"
              : "(Supplier overpaid)"}
        </span>
      </div>
    );
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
          { data: balancesData, error: balancesError },
          { data: clientsData, error: clientsError },
          { data: financeData, error: financeError }
        ] = await Promise.all([
          supabase.from('suppliers').select('*').order('created_at', { ascending: false }),
          supabase.from('supply_items').select('*'),
          supabase.from('deliveries').select('*'),
          supabase.from('payments').select('*'),
          supabase.from('materials').select('*').order('name', { ascending: true }),
          supabase.from('supplier_balances').select('*'),
          supabase.from('clients').select('id, name, created_at').order('name', { ascending: true }),
          supabase.from('finance').select('mode_of_payment, bank_name, mode_of_mobilemoney')
        ]);

        if (suppliersError) throw suppliersError;
        if (itemsError) throw itemsError;
        if (deliveriesError) throw deliveriesError;
        if (paymentsError) throw paymentsError;
        if (materialsError) throw materialsError;
        if (balancesError) throw balancesError;
        if (clientsError) throw clientsError;
        if (financeError) throw financeError;

        setSuppliers(suppliersData || []);
        setSupplyItems(itemsData || []);
        setDeliveries(deliveriesData || []);
        setPayments(paymentsData || []);
        setMaterials(materialsData || []);
        setLocalSupplierBalances(balancesData || []);
        setClients(clientsData || []);
        setFinanceRecords(financeData || []);
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
        setLocalSupplierBalances(prev => {
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
      
      // Get the fresh item data to ensure we have the latest name
      const { data: freshItem, error: itemError } = await supabase
        .from('supply_items')
        .select('*')
        .eq('id', selectedItem.id)
        .single();

      if (itemError) throw itemError;
      if (!freshItem) throw new Error('Item not found');

      const deliveryValue = deliveryForm.quantity * freshItem.price;
      let notes = deliveryForm.notes;
      let clientId = null;
      
      if (deliveryNoteType === 'client' && selectedClient) {
        const clientName = clients.find(c => c.id === selectedClient)?.name || '';
        notes = `Client: ${clientName}`;
        clientId = selectedClient;
        
        console.log('Creating order with item:', freshItem.name);
        
        const { error: orderError } = await supabase
          .from('order')
          .insert([{
            client_id: selectedClient,
            user: selectedClient,
            item: freshItem.name, // Use the fresh item data
            material: freshItem.name,
            cost: freshItem.price,
            quantity: deliveryForm.quantity,
            created_at: new Date().toISOString()
          }]);

        if (orderError) {
          console.error('Order creation error details:', {
            error: orderError,
            itemData: {
              name: freshItem.name,
              price: freshItem.price,
              quantity: deliveryForm.quantity
            }
          });
          throw orderError;
        }
      } else if (deliveryNoteType === 'stock') {
        notes = 'Stock';
      } else if (deliveryNoteType === 'client' && !selectedClient) {
        throw new Error('Please select a client');
      }
      
      const deliveryData = {
        ...deliveryForm,
        supply_item_id: selectedItem.id,
        value: deliveryValue,
        notes,
        client_id: clientId
      };

      const { data, error } = await supabase
        .from('deliveries')
        .insert([deliveryData])
        .select();

      if (error) {
        console.error('Delivery creation error:', error);
        throw error;
      }

      if (data?.[0]) {
        setDeliveries(prev => [...prev, data[0]]);
        
        setLocalSupplierBalances(prev => {
            return prev.map(balance => {
              if (balance.supplier_id === selectedItem.supplier_id) {
              let newBalance = balance.current_balance;
              
              if (balance.balance_type === 'credit') {
                newBalance = balance.current_balance - deliveryValue;
              } else {
                newBalance = balance.current_balance + deliveryValue;
              }
              
              supabase
                .from('supplier_balances')
                .update({ current_balance: newBalance })
                .eq('supplier_id', selectedItem.supplier_id)
                .then(({ error }) => {
                  if (error) console.error('Balance update error:', error);
                });

              return { ...balance, current_balance: newBalance };
            }
            return balance;
          });
        });

        resetDeliveryForm();
        setShowDeliveryForm(false);
        setDeliveryNoteType('');
        setSelectedClient('');
      }
    } catch (err) {
      console.error('Error saving delivery:', err);
      setError(err instanceof Error ? err.message : 'Failed to save delivery. Please try again.');
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (!selectedItem) return;
      
      const paymentData: any = {
        supply_item_id: selectedItem.id,
        supplier_id: selectedItem.supplier_id,
        amount: paymentForm.amount,
        payment_date: paymentForm.payment_date,
        method: paymentForm.method
      };
      
      if (paymentForm.method === 'bank') {
        paymentData.bank_name = paymentForm.bank_name;
      } else if (paymentForm.method === 'mobile_money') {
        paymentData.mode_of_mobilemoney = paymentForm.mode_of_mobilemoney;
      }
      
      const { data: paymentResponse, error: paymentError } = await supabase
        .from('payments')
        .insert([paymentData])
        .select();

      if (paymentError) throw paymentError;

      if (paymentResponse?.[0]) {
        setPayments(prev => [...prev, paymentResponse[0]]);
        
        setLocalSupplierBalances(prev => {
            return prev.map(balance => {
              if (balance.supplier_id === selectedItem.supplier_id) {
              let newBalance = balance.current_balance;
              
              if (balance.balance_type === 'debit') {
                newBalance = balance.current_balance - paymentForm.amount;
              } else {
                newBalance = balance.current_balance + paymentForm.amount;
              }
              
              supabase
                .from('supplier_balances')
                .update({ current_balance: newBalance })
                .eq('supplier_id', selectedItem.supplier_id)
                .then(({ error }) => {
                  if (error) console.error('Balance update error:', error);
                });

              return { ...balance, current_balance: newBalance };
            }
            return balance;
          });
        });

        // Get supplier and item details for the expense record
        const supplier = suppliers.find(s => s.id === selectedItem.supplier_id);
        const item = supplyItems.find(i => i.id === selectedItem.id);
        
        // Create expense record
        const expenseData = {
          item: 'Payment To Supplier',
          amount_spent: paymentForm.amount,
          date: paymentForm.payment_date,
          department: `${supplier?.name || 'Unknown Supplier'} | ${item?.name || 'Unknown Item'}`,
          account: paymentForm.method === 'mobile_money' 
            ? paymentForm.mode_of_mobilemoney || 'Mobile Money'
            : paymentForm.method === 'bank' 
            ? paymentForm.bank_name || 'Bank'
            : 'Cash',
          mode_of_payment: formatPaymentMethod(paymentForm.method),
          submittedby: 'Admin'
        };

        // Insert into expenses table
        const { error: expenseError } = await supabase
          .from('expenses')
          .insert([expenseData]);

        if (expenseError) {
          console.error('Error saving expense record:', expenseError);
          // Don't throw the error as the payment was successful
        }

        resetPaymentForm();
        setShowPaymentForm(false);
        setPaymentMethod('cash');
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
      setLocalSupplierBalances(prev => prev.filter(b => b.supplier_id !== id));
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
      delivery_date: getEastAfricanDateTime(),
      notes: "",
      client_id: "",
    });
    setShowDeliveryForm(false);
    setDeliveryNoteType('');
    setSelectedClient('');
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      supply_item_id: "",
      supplier_id: "",
      amount: 0,
      payment_date: getEastAfricanDateTime(),
      method: "cash",
      bank_name: "",
      mode_of_mobilemoney: "",
    });
    setShowPaymentForm(false);
    setPaymentMethod('cash');
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

  const handlePaymentMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const method = e.target.value;
    setPaymentMethod(method);
    setPaymentForm({
      ...paymentForm,
      method,
      bank_name: method === 'bank' ? paymentForm.bank_name : '',
      mode_of_mobilemoney: method === 'mobile_money' ? paymentForm.mode_of_mobilemoney : ''
    });
  };

  const handleDeliveryNoteTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDeliveryNoteType(e.target.value);
    if (e.target.value !== 'client') {
      setSelectedClient('');
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
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{supplier.name}</div>
                      <div className="text-sm text-gray-500">{supplier.address}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {supplier.contact}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <SupplierBalanceDisplay supplierId={supplier.id} />
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
                            const balance = getSupplierBalance(supplier.id);
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
                ))}
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
                                      supplier_id: item.supplier_id,
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
                        Value                      </th>
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
                              <div className="font-medium">{formatPaymentMethod(txn.method || '')}</div>
                              {txn.method === 'bank' && txn.bank_name && (
                                <div className="text-xs">Bank: {txn.bank_name}</div>
                              )}
                              {txn.method === 'mobile_money' && txn.mode_of_mobilemoney && (
                                <div className="text-xs">Mobile Money: {txn.mode_of_mobilemoney}</div>
                              )}
                            </div>
                          ) : (
                            <div>
                              {txn.client_id ? (
                                <div>
                                  <div className="font-medium">Client Delivery</div>
                                  <div className="text-xs">Client: {getClientName(txn.client_id) || 'Unknown Client'}</div>
                                  {txn.notes && <div className="text-xs">Notes: {txn.notes}</div>}
                                </div>
                              ) : (
                                txn.notes || '-'
                              )}
                            </div>
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
                    Delivery Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    name="delivery_date"
                    value={deliveryForm.delivery_date}
                    onChange={(e) => setDeliveryForm({...deliveryForm, delivery_date: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes Type
                  </label>
                  <select
                    value={deliveryNoteType}
                    onChange={handleDeliveryNoteTypeChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required={deliveryForm.notes !== ''}
                  >
                    <option value="">Select type</option>
                    <option value="stock">Stock</option>
                    <option value="client">Client</option>
                  </select>
                </div>

                {deliveryNoteType === 'client' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Client
                    </label>
                    <select
                      value={selectedClient}
                      onChange={(e) => setSelectedClient(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select client</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {deliveryNoteType !== 'client' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={deliveryForm.notes}
                      onChange={(e) => setDeliveryForm({...deliveryForm, notes: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      rows={2}
                    />
                  </div>
                )}

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
                  
                  {getSupplierBalance(selectedItem.supplier_id) && (
                    <div className="mt-2">
                      <span className="text-sm font-medium">Current Balance:</span>
                      <div className="font-medium">
                        <SupplierBalanceDisplay supplierId={selectedItem.supplier_id} />
                      </div>
                      
                      <span className="text-sm font-medium">New Balance:</span>
                      <div className="font-medium">
                        <SupplierBalanceDisplay 
                          supplierId={selectedItem.supplier_id}
                          balanceOverride={{
                            ...getSupplierBalance(selectedItem.supplier_id)!,
                            current_balance: getSupplierBalance(selectedItem.supplier_id)!.balance_type === 'credit'
                              ? getSupplierBalance(selectedItem.supplier_id)!.current_balance - (deliveryForm.quantity * selectedItem.price)
                              : getSupplierBalance(selectedItem.supplier_id)!.current_balance + (deliveryForm.quantity * selectedItem.price)
                          }}
                        />
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
                    Payment Date & Time
                  </label>
                  <input
                    type="datetime-local"
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
                    onChange={handlePaymentMethodChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="cash">Cash</option>
                    {getUniquePaymentMethods().map(method => (
                      <option key={method} value={method}>
                        {formatPaymentMethod(method)}
                      </option>
                    ))}
                  </select>
                </div>
                
                {paymentForm.method === 'bank' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Name
                    </label>
                    <select
                      name="bank_name"
                      value={paymentForm.bank_name || ''}
                      onChange={(e) => setPaymentForm({...paymentForm, bank_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select bank</option>
                      {getUniqueBankNames().map(bank => (
                        <option key={bank} value={bank}>
                          {bank}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {paymentForm.method === 'mobile_money' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mobile Money Account
                    </label>
                    <select
                      name="mode_of_mobilemoney"
                      value={paymentForm.mode_of_mobilemoney || ''}
                      onChange={(e) => setPaymentForm({...paymentForm, mode_of_mobilemoney: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select account</option>
                      {getUniqueMobileMoneyModes().map(mode => (
                        <option key={mode} value={mode}>
                          {mode}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="bg-blue-50 p-3 rounded-lg">
                  {getSupplierBalance(selectedItem.supplier_id) && (
                    <div>
                      <span className="text-sm font-medium">Current Balance:</span>
                      <div className="font-medium">
                        <SupplierBalanceDisplay supplierId={selectedItem.supplier_id} />
                      </div>
                      
                      <span className="text-sm font-medium">New Balance:</span>
                      <div className="font-medium">
                        <SupplierBalanceDisplay 
                          supplierId={selectedItem.supplier_id}
                          balanceOverride={{
                            ...getSupplierBalance(selectedItem.supplier_id)!,
                            current_balance: getSupplierBalance(selectedItem.supplier_id)!.balance_type === 'debit'
                              ? getSupplierBalance(selectedItem.supplier_id)!.current_balance - paymentForm.amount
                              : getSupplierBalance(selectedItem.supplier_id)!.current_balance + paymentForm.amount
                          }}
                        />
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
