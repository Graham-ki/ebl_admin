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

interface LedgerEntry {
  id: number;
  supplier_id: string;
  date: string;
  description: 'Deposit' | 'Delivery' | 'Sold to Client';
  unit_price: number;
  selling_price?: number;
  quantity?: number;
  credit: number;
  debit: number;
  balance: number;
  item_name?: string;
  client_name?: string;
  notes?: string;
  created_at: string;
}

interface Client {
  id: string;
  name: string;
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
  status: 'pending' | 'partially' | 'paid';
  partial_amount: number;
  created_at: string;
  updated_at: string;
}

interface FinanceAccount {
  mode_of_payment: string;
  bank_name?: string;
  mode_of_mobilemoney?: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'UGX'
  }).format(amount);
};

const getEastAfricanDateTime = () => {
  const now = new Date();
  const offset = 3 * 60 * 60 * 1000; // East Africa Time (UTC+3)
  const eastAfricanTime = new Date(now.getTime() + offset);
  
  const year = eastAfricanTime.getFullYear();
  const month = String(eastAfricanTime.getMonth() + 1).padStart(2, '0');
  const day = String(eastAfricanTime.getDate()).padStart(2, '0');
  const hours = String(eastAfricanTime.getHours()).padStart(2, '0');
  const minutes = String(eastAfricanTime.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatDate = (dateString: string) => {
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

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ledgerData, setLedgerData] = useState<LedgerEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [supplierBalances, setSupplierBalances] = useState<SupplierBalance[]>([]);
  const [financeAccounts, setFinanceAccounts] = useState<FinanceAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  
  // Form states
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showBalanceForm, setShowBalanceForm] = useState(false);
  
  const [supplierForm, setSupplierForm] = useState<Omit<Supplier, "id" | "created_at">>({
    name: "",
    contact: "",
    address: "",
  });

  const [transactionForm, setTransactionForm] = useState({
    type: 'deposit' as 'deposit' | 'delivery' | 'sold_to_client',
    date: getEastAfricanDateTime(),
    amount: 0,
    item_name: "",
    quantity: 0,
    unit_price: 0,
    selling_price: 0,
    client_id: "",
    notes: "",
    account: ""
  });

  const [balanceForm, setBalanceForm] = useState({
    supplier_id: "",
    opening_balance: 0,
    balance_type: "debit" as 'debit' | 'credit',
    status: 'pending' as 'pending' | 'partially' | 'paid',
    partial_amount: 0
  });

  // Fetch all data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const [
          { data: suppliersData, error: suppliersError },
          { data: clientsData, error: clientsError },
          { data: materialsData, error: materialsError },
          { data: balancesData, error: balancesError },
          { data: financeData, error: financeError }
        ] = await Promise.all([
          supabase.from('suppliers').select('*').order('created_at', { ascending: false }),
          supabase.from('clients').select('id, name, created_at').order('name', { ascending: true }),
          supabase.from('materials').select('*').order('name', { ascending: true }),
          supabase.from('supplier_balances').select('*'),
          supabase.from('finance').select('mode_of_payment, bank_name, mode_of_mobilemoney').limit(100)
        ]);

        if (suppliersError) throw suppliersError;
        if (clientsError) throw clientsError;
        if (materialsError) throw materialsError;
        if (balancesError) throw balancesError;
        if (financeError) throw financeError;

        console.log('Finance data loaded:', financeData?.length || 0, 'records');
        console.log('Supplier balances loaded:', balancesData?.length || 0, 'records');

        setSuppliers(suppliersData || []);
        setClients(clientsData || []);
        setMaterials(materialsData || []);
        setSupplierBalances(balancesData || []);
        setFinanceAccounts(financeData || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch ledger data for a specific supplier
  const fetchLedgerData = async (supplierId: string) => {
    try {
      console.log('Fetching ledger for supplier:', supplierId);
      const { data, error } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching ledger:', error);
        throw error;
      }

      console.log('Fetched ledger data:', data?.length || 0, 'records');
      setLedgerData(data || []);
    } catch (err) {
      console.error('Error fetching ledger data:', err);
      setError('Failed to load ledger data');
    }
  };

  // Calculate running balance for ledger entries
  const calculateRunningBalance = (entries: LedgerEntry[]) => {
    let balance = 0;
    return entries.map(entry => {
      balance += entry.debit - entry.credit;
      return { ...entry, balance };
    });
  };

  // Get current ledger balance for display
  const getCurrentBalance = () => {
    if (ledgerData.length === 0) return 0;
    const lastEntry = ledgerData[ledgerData.length - 1];
    return lastEntry.balance;
  };

  // Get ledger balance for a specific supplier
  const getSupplierLedgerBalance = (supplierId: string) => {
    const supplierLedgerEntries = ledgerData.filter(entry => entry.supplier_id === supplierId);
    if (supplierLedgerEntries.length === 0) return 0;
    
    let balance = 0;
    supplierLedgerEntries.forEach(entry => {
      balance += entry.debit - entry.credit;
    });
    return balance;
  };

  // Calculate total balance (opening + ledger) for a supplier
  const getSupplierTotalBalance = (supplierId: string) => {
    const openingBalance = supplierBalances.find(b => b.supplier_id === supplierId);
    const ledgerBalance = getSupplierLedgerBalance(supplierId);
    
    const openingAmount = openingBalance ? 
      (openingBalance.balance_type === 'debit' ? openingBalance.current_balance : -openingBalance.current_balance) : 0;
    
    const totalBalance = openingAmount + ledgerBalance;
    
    console.log(`Balance calculation for ${supplierId}:`, { 
      openingBalance: openingAmount, 
      ledgerBalance, 
      totalBalance 
    });
    
    return totalBalance;
  };

  // Supplier balance display component
  const SupplierBalanceDisplay = ({ supplierId }: { supplierId: string }) => {
    const totalBalance = getSupplierTotalBalance(supplierId);
    const openingBalance = supplierBalances.find(b => b.supplier_id === supplierId);
    const ledgerBalance = getSupplierLedgerBalance(supplierId);
    
    if (!openingBalance && totalBalance === 0) {
      return <span className="text-gray-500">No balance set</span>;
    }

    const amount = formatCurrency(Math.abs(totalBalance));
    const isPositive = totalBalance > 0;

    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            isPositive ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
          }`}>
            {isPositive ? '+' : ''}{amount}
          </span>
          <span className="text-sm text-gray-600">
            {isPositive ? "(Supplier owes company)" : "(Company owes supplier)"}
          </span>
        </div>
        {openingBalance && (
          <div className="text-xs text-gray-500 flex gap-2">
            <span>Opening: {formatCurrency(openingBalance.opening_balance)}</span>
            <span>•</span>
            <span>Ledger: {formatCurrency(ledgerBalance)}</span>
          </div>
        )}
      </div>
    );
  };

  // Get unique accounts from finance data
  const getUniqueAccounts = () => {
    const accounts = new Set<string>();
    
    console.log('Processing finance accounts:', financeAccounts);
    
    // Add default accounts first
    accounts.add('cash');
    
    // Process finance records
    financeAccounts.forEach(account => {
      if (account.mode_of_payment) {
        const mode = account.mode_of_payment.toLowerCase().trim();
        
        if (mode === 'cash') {
          accounts.add('cash');
        } else if (mode === 'bank' && account.bank_name) {
          const bankKey = `bank_${account.bank_name.trim()}`;
          accounts.add(bankKey);
        } else if ((mode === 'mobile_money' || mode === 'mobile money') && account.mode_of_mobilemoney) {
          const mobileKey = `mobile_${account.mode_of_mobilemoney.trim()}`;
          accounts.add(mobileKey);
        } else if (mode === 'bank') {
          // Add generic bank if no bank name specified
          accounts.add('bank_generic');
        } else if (mode === 'mobile_money' || mode === 'mobile money') {
          // Add generic mobile money if no provider specified
          accounts.add('mobile_generic');
        }
      }
    });

    const accountList = Array.from(accounts);
    console.log('Available accounts:', accountList);
    return accountList;
  };

  // Format account display name
  const formatAccountName = (account: string) => {
    if (account === 'cash') return 'Cash';
    if (account.startsWith('bank_')) {
      const bankName = account.split('_').slice(1).join(' ');
      return bankName === 'generic' ? 'Bank' : `Bank - ${bankName}`;
    }
    if (account.startsWith('mobile_')) {
      const provider = account.split('_').slice(1).join(' ');
      return provider === 'generic' ? 'Mobile Money' : `Mobile Money - ${provider}`;
    }
    return account.charAt(0).toUpperCase() + account.slice(1);
  };

  // Handle supplier form submission
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

  // Handle opening balance submission
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
          current_balance: balanceForm.opening_balance,
          status: balanceForm.status,
          partial_amount: balanceForm.partial_amount
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

  // Handle transaction submission
  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (!selectedSupplier) return;

      let ledgerEntry: Omit<LedgerEntry, 'id' | 'created_at' | 'balance'> = {
        supplier_id: selectedSupplier.id,
        date: transactionForm.date,
        unit_price: 0,
        credit: 0,
        debit: 0,
        description: 'Deposit'
      };

      switch (transactionForm.type) {
        case 'deposit':
          ledgerEntry = {
            ...ledgerEntry,
            description: 'Deposit',
            debit: transactionForm.amount,
            unit_price: 0
          };
          
          // Record expense for deposit
          const selectedFinanceAccount = financeAccounts.find(acc => {
            if (transactionForm.account === 'cash') return acc.mode_of_payment === 'cash';
            if (transactionForm.account.startsWith('bank_')) return acc.mode_of_payment === 'bank';
            if (transactionForm.account.startsWith('mobile_')) return acc.mode_of_payment === 'mobile_money' || acc.mode_of_payment === 'mobile money';
            return false;
          });

          const expenseData = {
            item: 'Material Payment',
            amount_spent: transactionForm.amount,
            department: selectedSupplier.name,
            account: transactionForm.account,
            mode_of_payment: selectedFinanceAccount?.mode_of_payment || transactionForm.account,
            submittedby: 'Admin',
            date: new Date(transactionForm.date).toISOString()
          };

          const { error: expenseError } = await supabase
            .from('expenses')
            .insert([expenseData]);

          if (expenseError) {
            console.error('Error saving expense:', expenseError);
            throw expenseError;
          }
          break;

        case 'delivery':
          const deliveryValue = transactionForm.quantity * transactionForm.unit_price;
          ledgerEntry = {
            ...ledgerEntry,
            description: 'Delivery',
            credit: deliveryValue,
            unit_price: transactionForm.unit_price,
            quantity: transactionForm.quantity,
            item_name: transactionForm.item_name
          };
          break;

        case 'sold_to_client':
          const saleValue = transactionForm.quantity * transactionForm.selling_price;
          const client = clients.find(c => c.id === transactionForm.client_id);
          ledgerEntry = {
            ...ledgerEntry,
            description: 'Sold to Client',
            credit: saleValue,
            unit_price: transactionForm.selling_price,
            quantity: transactionForm.quantity,
            item_name: transactionForm.item_name,
            client_name: client?.name
          };
          break;
      }

      // Insert into ledger_entries table
      const { data, error } = await supabase
        .from('ledger_entries')
        .insert([ledgerEntry])
        .select();

      if (error) throw error;

      if (data?.[0]) {
        // Update local state
        const updatedLedger = [...ledgerData, data[0]];
        const withBalances = calculateRunningBalance(updatedLedger);
        setLedgerData(withBalances);
        
        resetTransactionForm();
        setShowTransactionForm(false);
      }
    } catch (err) {
      console.error('Error saving transaction:', err);
      setError('Failed to save transaction. Please try again.');
    }
  };

  // Handle supplier deletion
  const handleDeleteSupplier = async (id: string) => {
    setError(null);
    
    try {
      // First delete all ledger entries for this supplier
      await supabase
        .from('ledger_entries')
        .delete()
        .eq('supplier_id', id);

      // Delete supplier balances
      await supabase
        .from('supplier_balances')
        .delete()
        .eq('supplier_id', id);

      // Then delete the supplier
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

  // Handle ledger entry deletion
  const handleDeleteLedgerEntry = async (id: number) => {
    setError(null);
    
    try {
      const { error } = await supabase
        .from('ledger_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setLedgerData(prev => prev.filter(entry => entry.id !== id));
    } catch (err) {
      console.error('Error deleting ledger entry:', err);
      setError('Failed to delete ledger entry. Please try again.');
    }
  };

  // Form reset functions
  const resetSupplierForm = () => {
    setSupplierForm({
      name: "",
      contact: "",
      address: ""
    });
    setShowSupplierForm(false);
  };

  const resetTransactionForm = () => {
    setTransactionForm({
      type: 'deposit',
      date: getEastAfricanDateTime(),
      amount: 0,
      item_name: "",
      quantity: 0,
      unit_price: 0,
      selling_price: 0,
      client_id: "",
      notes: "",
      account: ""
    });
  };

  const resetBalanceForm = () => {
    setBalanceForm({
      supplier_id: "",
      opening_balance: 0,
      balance_type: "debit",
      status: "pending",
      partial_amount: 0
    });
    setShowBalanceForm(false);
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
              <span className="text-blue-500">📦</span> Suppliers Ledger
            </h1>
            <p className="text-gray-600">Manage supplier transactions and ledger</p>
          </div>
          <button
            onClick={() => setShowSupplierForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <span>+</span> Add Supplier
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Debug Information */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
          <h4 className="font-medium mb-2">Debug Info:</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p>Suppliers: {suppliers.length}</p>
              <p>Finance Accounts: {financeAccounts.length}</p>
              <p>Supplier Balances: {supplierBalances.length}</p>
              <p>Ledger Entries: {ledgerData.length}</p>
            </div>
            <div>
              <p>Available Accounts:</p>
              <ul className="text-xs">
                {getUniqueAccounts().map(acc => (
                  <li key={acc}>- {formatAccountName(acc)}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        {suppliers.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">📭</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No suppliers yet</h3>
            <p className="text-gray-500 mb-4">Get started by adding your first supplier</p>
            <button
              onClick={() => setShowSupplierForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Add Supplier
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
                    Balance
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
                      <div className="text-sm text-gray-500">{supplier.contact}</div>
                      <div className="text-xs text-gray-400">{supplier.address}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <SupplierBalanceDisplay supplierId={supplier.id} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedSupplier(supplier);
                            setShowTransactionForm(true);
                            resetTransactionForm();
                          }}
                          className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1"
                        >
                          <span>💰</span> Record Transaction
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSupplier(supplier);
                            const balance = supplierBalances.find(b => b.supplier_id === supplier.id);
                            setBalanceForm({
                              supplier_id: supplier.id,
                              opening_balance: balance?.current_balance || 0,
                              balance_type: balance?.balance_type || 'debit',
                              status: balance?.status || 'pending',
                              partial_amount: balance?.partial_amount || 0
                            });
                            setShowBalanceForm(true);
                          }}
                          className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1"
                        >
                          <span>💼</span> Set Opening Balance
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSupplier(supplier);
                            fetchLedgerData(supplier.id);
                            setShowLedgerModal(true);
                          }}
                          className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1"
                        >
                          <span>📊</span> View Ledger
                        </button>
                        <button 
                          onClick={() => handleDeleteSupplier(supplier.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1"
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

      {/* Opening Balance Form Modal */}
      {showBalanceForm && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Set Opening Balance for {selectedSupplier.name}
                </h3>
                <button 
                  onClick={() => setShowBalanceForm(false)}
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
                      balance_type: e.target.value as 'debit' | 'credit'
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="debit">Supplier owes company</option>
                    <option value="credit">Company owes supplier</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (UGX)
                  </label>
                  <input
                    type="number"
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
                    onClick={() => setShowBalanceForm(false)}
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

      {/* Transaction Form Modal */}
      {showTransactionForm && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Record Transaction for {selectedSupplier.name}
                </h3>
                <button 
                  onClick={() => setShowTransactionForm(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleTransactionSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction Type
                  </label>
                  <select
                    value={transactionForm.type}
                    onChange={(e) => setTransactionForm({
                      ...transactionForm,
                      type: e.target.value as 'deposit' | 'delivery' | 'sold_to_client'
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="deposit">Deposit (Debit)</option>
                    <option value="delivery">Delivery (Credit)</option>
                    <option value="sold_to_client">Sold to Client (Credit)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={transactionForm.date}
                    onChange={(e) => setTransactionForm({...transactionForm, date: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {transactionForm.type === 'deposit' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Deposit Amount (UGX)
                      </label>
                      <input
                        type="number"
                        value={transactionForm.amount}
                        onChange={(e) => setTransactionForm({...transactionForm, amount: Number(e.target.value)})}
                        required
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account
                      </label>
                      <select
                        value={transactionForm.account}
                        onChange={(e) => setTransactionForm({...transactionForm, account: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Select Account</option>
                        {getUniqueAccounts().map(account => {
                          const displayName = formatAccountName(account);
                          return (
                            <option key={account} value={account}>
                              {displayName}
                            </option>
                          );
                        })}
                      </select>
                      {getUniqueAccounts().length === 0 && (
                        <p className="text-xs text-red-500 mt-1">
                          No accounts found. Please check your finance table data.
                        </p>
                      )}
                    </div>
                  </>
                )}

                {(transactionForm.type === 'delivery' || transactionForm.type === 'sold_to_client') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Item Name
                      </label>
                      <select
                        value={transactionForm.item_name}
                        onChange={(e) => setTransactionForm({...transactionForm, item_name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Select Item</option>
                        {materials.map(material => (
                          <option key={material.id} value={material.name}>
                            {material.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          value={transactionForm.quantity}
                          onChange={(e) => setTransactionForm({...transactionForm, quantity: Number(e.target.value)})}
                          required
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {transactionForm.type === 'sold_to_client' ? 'Selling Price' : 'Unit Price'} (UGX)
                        </label>
                        <input
                          type="number"
                          value={transactionForm.type === 'sold_to_client' ? transactionForm.selling_price : transactionForm.unit_price}
                          onChange={(e) => {
                            if (transactionForm.type === 'sold_to_client') {
                              setTransactionForm({...transactionForm, selling_price: Number(e.target.value)});
                            } else {
                              setTransactionForm({...transactionForm, unit_price: Number(e.target.value)});
                            }
                          }}
                          required
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {transactionForm.type === 'sold_to_client' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Client
                        </label>
                        <select
                          value={transactionForm.client_id}
                          onChange={(e) => setTransactionForm({...transactionForm, client_id: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="">Select Client</option>
                          {clients.map(client => (
                            <option key={client.id} value={client.id}>
                              {client.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={transactionForm.notes}
                    onChange={(e) => setTransactionForm({...transactionForm, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                  />
                </div>

                {/* Transaction Summary */}
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Transaction Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span className="font-medium">
                        {transactionForm.type === 'deposit' ? 'Deposit' : 
                         transactionForm.type === 'delivery' ? 'Delivery' : 'Sold to Client'}
                      </span>
                    </div>
                    
                    {transactionForm.type === 'deposit' && (
                      <div className="flex justify-between">
                        <span>Amount:</span>
                        <span className="font-medium text-green-600">
                          +{formatCurrency(transactionForm.amount)}
                        </span>
                      </div>
                    )}

                    {(transactionForm.type === 'delivery' || transactionForm.type === 'sold_to_client') && (
                      <>
                        <div className="flex justify-between">
                          <span>Item:</span>
                          <span className="font-medium">{transactionForm.item_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Quantity:</span>
                          <span className="font-medium">{transactionForm.quantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Unit Price:</span>
                          <span className="font-medium">
                            {formatCurrency(transactionForm.type === 'sold_to_client' ? transactionForm.selling_price : transactionForm.unit_price)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                          <span>Total Value:</span>
                          <span className="font-medium text-red-600">
                            -{formatCurrency(
                              transactionForm.quantity * 
                              (transactionForm.type === 'sold_to_client' ? transactionForm.selling_price : transactionForm.unit_price)
                            )}
                          </span>
                        </div>
                      </>
                    )}
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
                    onClick={() => setShowTransactionForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Record Transaction
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Modal */}
      {showLedgerModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="p-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  General Ledger for {selectedSupplier.name}
                </h3>
                <button 
                  onClick={() => setShowLedgerModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Current Balance:</span>
                    <span className={`ml-2 text-lg font-bold ${
                      getCurrentBalance() >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(Math.abs(getCurrentBalance()))}
                      {getCurrentBalance() >= 0 ? ' (Supplier owes company)' : ' (Company owes supplier)'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setShowTransactionForm(true);
                      setShowLedgerModal(false);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <span>+</span> New Transaction
                  </button>
                </div>
              </div>
              
              <div className="overflow-y-auto max-h-[60vh]">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit/Selling Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Credit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Debit
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
                    {calculateRunningBalance(ledgerData).map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(entry.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {entry.description}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {entry.item_name && (
                            <div>
                              <div>{entry.item_name}</div>
                              {entry.quantity && (
                                <div className="text-xs text-gray-400">Qty: {entry.quantity}</div>
                              )}
                              {entry.client_name && (
                                <div className="text-xs text-gray-400">Client: {entry.client_name}</div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.unit_price > 0 ? formatCurrency(entry.unit_price) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          entry.balance >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(Math.abs(entry.balance))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleDeleteLedgerEntry(entry.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    
                    {ledgerData.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                          No transactions recorded yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
