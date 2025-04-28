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
  purchase_date?: string;
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplyItems, setSupplyItems] = useState<SupplyItem[]>([]);
  const [formData, setFormData] = useState<Omit<Supplier, "id" | "created_at">>({
    name: "",
    contact: "",
    address: "",
  });
  const [itemFormData, setItemFormData] = useState<Omit<SupplyItem, "id">>({
    supplier_id: "",
    name: "",
    quantity: 0,
    price: 0,
    purchase_date: new Date().toISOString().split('T')[0],
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showSuppliesModal, setShowSuppliesModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch suppliers
        const { data: suppliersData, error: suppliersError } = await supabase
          .from('suppliers')
          .select('*')
          .order('created_at', { ascending: false });

        if (suppliersError) throw suppliersError;

        // Fetch supply items
        const { data: itemsData, error: itemsError } = await supabase
          .from('supply_items')
          .select('*');

        if (itemsError) throw itemsError;

        setSuppliers(suppliersData || []);
        setSupplyItems(itemsData || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setItemFormData((prev) => ({ 
      ...prev, 
      [name]: name === 'quantity' || name === 'price' ? Number(value) : value 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert([formData])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        setSuppliers((prev) => [data[0], ...prev]);
        setFormData({ name: "", contact: "", address: "" });
        setIsDialogOpen(false);
      }
    } catch (err) {
      console.error('Error adding supplier:', err);
      setError('Failed to add supplier. Please try again.');
    }
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (!selectedSupplier) return;
      
      const itemToSubmit = {
        ...itemFormData,
        supplier_id: selectedSupplier.id,
      };

      const { data, error } = await supabase
        .from('supply_items')
        .insert([itemToSubmit])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        setSupplyItems((prev) => [...prev, data[0]]);
        setItemFormData({
          supplier_id: "",
          name: "",
          quantity: 0,
          price: 0,
          purchase_date: new Date().toISOString().split('T')[0],
        });
        setShowAddItemModal(false);
      }
    } catch (err) {
      console.error('Error adding supply item:', err);
      setError('Failed to add supply item. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    
    try {
      // First delete related supply items
      const { error: itemsError } = await supabase
        .from('supply_items')
        .delete()
        .eq('supplier_id', id);

      if (itemsError) throw itemsError;

      // Then delete the supplier
      const { error: supplierError } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (supplierError) throw supplierError;

      setSuppliers((prev) => prev.filter((supplier) => supplier.id !== id));
      setSupplyItems((prev) => prev.filter((item) => item.supplier_id !== id));
    } catch (err) {
      console.error('Error deleting supplier:', err);
      setError('Failed to delete supplier. Please try again.');
    }
  };

  const handleDeleteItem = async (id: string) => {
    setError(null);
    
    try {
      const { error } = await supabase
        .from('supply_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSupplyItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Error deleting supply item:', err);
      setError('Failed to delete supply item. Please try again.');
    }
  };

  const getSupplierItems = (supplierId: string) => {
    return supplyItems.filter(item => item.supplier_id === supplierId);
  };

  const getSupplierItemsCount = (supplierId: string) => {
    return getSupplierItems(supplierId).length;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const openSuppliesModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowSuppliesModal(true);
  };

  const openAddItemModal = () => {
    setItemFormData({
      supplier_id: selectedSupplier?.id || "",
      name: "",
      quantity: 0,
      price: 0,
      purchase_date: new Date().toISOString().split('T')[0],
    });
    setShowAddItemModal(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p>Loading suppliers...</p>
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
              <span className="text-blue-500">📦</span> Suppliers
            </h1>
            <p className="text-gray-600">Manage your suppliers and their supplies</p>
          </div>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <span>+</span> Add Supplier
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {suppliers.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">📭</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No suppliers yet</h3>
            <p className="text-gray-500 mb-4">Get started by adding your first supplier</p>
            <button
              onClick={() => setIsDialogOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Supplier
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplies
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Added
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {getSupplierItemsCount(supplier.id)} items
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(supplier.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(supplier.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          🗑️ Delete
                        </button>
                        <button
                          onClick={() => openSuppliesModal(supplier)}
                          className="text-green-600 hover:text-green-900"
                        >
                          📦 Supplies
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

      {/* Add Supplier Modal */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add New Supplier</h3>
                <button 
                  onClick={() => setIsDialogOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-1">
                    Contact
                  </label>
                  <input
                    type="text"
                    id="contact"
                    name="contact"
                    value={formData.contact}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {error && (
                  <div className="p-2 bg-red-100 text-red-700 text-sm rounded">
                    {error}
                  </div>
                )}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsDialogOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Save Supplier
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
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Supplies for {selectedSupplier.name}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={openAddItemModal}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                  >
                    + Add Item
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
                    No supply items found for this supplier.
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Item Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Purchase Date
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getSupplierItems(selectedSupplier.id).map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(item.price)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.purchase_date ? formatDate(item.purchase_date) : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Supply Item Modal */}
      {showAddItemModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Add New Supply Item for {selectedSupplier.name}
                </h3>
                <button 
                  onClick={() => setShowAddItemModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleItemSubmit} className="space-y-4">
                <div>
                  <label htmlFor="item-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name
                  </label>
                  <input
                    type="text"
                    id="item-name"
                    name="name"
                    value={itemFormData.name}
                    onChange={handleItemInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    value={itemFormData.quantity}
                    onChange={handleItemInputChange}
                    required
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                    Price
                  </label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={itemFormData.price}
                    onChange={handleItemInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="purchase_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    id="purchase_date"
                    name="purchase_date"
                    value={itemFormData.purchase_date}
                    onChange={handleItemInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {error && (
                  <div className="p-2 bg-red-100 text-red-700 text-sm rounded">
                    {error}
                  </div>
                )}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddItemModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Save Item
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
