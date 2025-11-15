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
  id: string;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  
  // Form states
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  
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
    notes: ""
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const [
          { data: suppliersData, error: suppliersError },
          { data: clientsData, error: clientsError },
          { data: materialsData, error: materialsError }
        ] = await Promise.all([
          supabase.from('suppliers').select('*').order('created_at', { ascending: false }),
          supabase.from('clients').select('id, name, created_at').order('name', { ascending: true }),
          supabase.from('materials').select('*').order('name', { ascending: true })
        ]);

        if (suppliersError) throw suppliersError;
        if (clientsError) throw clientsError;
        if (materialsError) throw materialsError;

        setSuppliers(suppliersData || []);
        setClients(clientsData || []);
        setMaterials(materialsData || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchLedgerData = async (supplierId: string) => {
    try {
      // In a real implementation, you would fetch from a ledger table
      // For now, we'll simulate with existing data structure
      const { data, error } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('date', { ascending: true });

      if (error) throw error;
      setLedgerData(data || []);
    } catch (err) {
      console.error('Error fetching ledger data:', err);
      setError('Failed to load ledger data');
    }
  };

  const calculateRunningBalance = (entries: LedgerEntry[]) => {
    let balance = 0;
    return entries.map(entry => {
      balance += entry.debit - entry.credit;
      return { ...entry, balance };
    });
  };

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

  const handleDeleteSupplier = async (id: string) => {
    setError(null);
    
    try {
      // First delete all ledger entries for this supplier
      await supabase
        .from('ledger_entries')
        .delete()
        .eq('supplier_id', id);

      // Then delete the supplier
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSuppliers(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting supplier:', err);
      setError('Failed to delete supplier. Please try again.');
    }
  };

  const handleDeleteLedgerEntry = async (id: string) => {
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
      notes: ""
    });
  };

  const getCurrentBalance = () => {
    if (ledgerData.length === 0) return 0;
    const lastEntry = ledgerData[ledgerData.length - 1];
    return lastEntry.balance;
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
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {supplier.contact}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {supplier.address}
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
