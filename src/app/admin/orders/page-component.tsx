'use client';

import { useState, useEffect } from 'react';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, isSameDay, getYear } from 'date-fns';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

import { OrdersWithProducts } from '@/app/admin/orders/types';
import { updateOrderStatus } from '@/actions/orders';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kxnrfzcurobahklqefjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bnJmemN1cm9iYWhrbHFlZmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5NTk1MzUsImV4cCI6MjA1MzUzNTUzNX0.pHrrAPHV1ln1OHugnB93DTUY5TL9K8dYREhz1o0GkjE';
const supabase = createClient(supabaseUrl, supabaseKey);

const statusOptions = ['Pending', 'Approved', 'Cancelled', 'Completed', 'Balanced'];

type OrderItem = {
  product: string;
  quantity: string;
};

type Props = {
  ordersWithProducts: OrdersWithProducts;
};

export default function PageComponent({ ordersWithProducts }: Props) {
  const [selectedProducts, setSelectedProducts] = useState<
    { order_id: number; product: any; quantity: number }[]
  >([]);
  const [proofs, setProofs] = useState<{ id: number; file_url: string }[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'daily' | 'monthly' | 'yearly' | 'custom'>('all');
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(true);
  const [marketers, setMarketers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [newOrder, setNewOrder] = useState({
    user: '',
    total_amount: '',
    status: 'Approved'
  });
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [currentOrderItem, setCurrentOrderItem] = useState<OrderItem>({
    product: '',
    quantity: '',
  });
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showOrderItemForm, setShowOrderItemForm] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string>('');

  useEffect(() => {
    // Fetch marketers from users table
    const fetchMarketers = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, email');
      
      if (!error && data) {
        setMarketers(data);
      }
    };

    // Fetch products from product table
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('product')
        .select('id, title');
      
      if (!error && data) {
        setProducts(data);
      }
    };

    fetchMarketers();
    fetchProducts();
  }, []);

  const handleStatusChange = async (orderId: number, status: string) => {
    try {
      await updateOrderStatus(orderId, status);
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const fetchProofs = async (orderId: number) => {
    try {
      const { data, error } = await supabase
        .from('proof_of_payment')
        .select('id, file_url')
        .eq('order_id', orderId);

      if (error) throw error;
      setProofs(data || []);
    } catch (error) {
      console.error('Error fetching proofs:', error);
    }
  };

  const handleViewProofs = async (orderId: number) => {
    setSelectedOrderId(orderId);
    await fetchProofs(orderId);
  };

  const handleDeleteOrder = async (orderId: number) => {
    try {
      const { data: proofs, error: fetchProofsError } = await supabase
        .from('proof_of_payment')
        .select('id, file_url')
        .eq('order_id', orderId);

      if (fetchProofsError) {
        throw new Error('Failed to fetch proofs for the order.');
      }

      for (const proof of proofs) {
        const fileUrl = proof.file_url;
        const filePath = fileUrl.split('/storage/v1/object/public/app-images/')[1];

        if (!filePath) {
          alert(`Error: Invalid file URL for proof ID ${proof.id}.`);
          continue;
        }

        const { error: deleteStorageError } = await supabase
          .storage
          .from('app-images')
          .remove([filePath]);

        if (deleteStorageError) {
          alert(`Error: Failed to delete file for proof ID ${proof.id}.`);
          continue;
        }

        const { error: deleteProofError } = await supabase
          .from('proof_of_payment')
          .delete()
          .eq('id', proof.id);

        if (deleteProofError) {
          alert(`Error: Failed to delete proof ID ${proof.id} from the database.`);
          continue;
        }
      }

      const { error: deleteOrderError } = await supabase
        .from('order')
        .delete()
        .eq('id', orderId);

      if (deleteOrderError) {
        throw new Error('Failed to delete the order from the database.');
      }

      alert('Success: Order deleted successfully!');
      window.location.reload();
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Error: Failed to delete order. Please try again.');
    }
  };

  const handleCreateOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('order')
        .insert([{
          user: newOrder.user,
          total_amount: parseFloat(newOrder.total_amount),
          status: newOrder.status,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      setCurrentOrderId(data.id);
      setShowOrderForm(false);
      setShowOrderItemForm(true);
      alert('Order created successfully! Now add items to this order.');
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Error creating order. Please try again.');
    }
  };

  const addOrderItem = () => {
    if (!currentOrderItem.product || !currentOrderItem.quantity) {
      alert('Please select a product and enter quantity');
      return;
    }

    setOrderItems([...orderItems, currentOrderItem]);
    setCurrentOrderItem({ product: '', quantity: '' });
  };

  const removeOrderItem = (index: number) => {
    const updatedItems = [...orderItems];
    updatedItems.splice(index, 1);
    setOrderItems(updatedItems);
  };

  const handleAddOrderItems = async () => {
    if (orderItems.length === 0) {
      alert('Please add at least one order item');
      return;
    }

    try {
      const itemsToInsert = orderItems.map(item => ({
        product: item.product,
        order: currentOrderId,
        quantity: parseInt(item.quantity),
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('order_item')
        .insert(itemsToInsert);

      if (error) throw error;

      setOrderItems([]);
      setShowOrderItemForm(false);
      alert('Order items added successfully!');
      window.location.reload();
    } catch (error) {
      console.error('Error adding order items:', error);
      alert('Error adding order items. Please try again.');
    }
  };

  const filterOrders = (orders: OrdersWithProducts) => {
    const now = new Date();
    switch (filter) {
      case 'daily':
        return orders.filter(order => isSameDay(new Date(order.created_at), now));
      case 'monthly':
        return orders.filter(order =>
          new Date(order.created_at) >= startOfMonth(now) &&
          new Date(order.created_at) <= endOfMonth(now)
        );
      case 'yearly':
        return selectedYear
          ? orders.filter(order => getYear(new Date(order.created_at)) === selectedYear)
          : orders;
      case 'custom':
        return customDate ? orders.filter(order => isSameDay(new Date(order.created_at), customDate)) : orders;
      default:
        return orders;
    }
  };

  const filteredOrders = filterOrders(ordersWithProducts);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2019 }, (_, i) => 2020 + i);

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Modern header with gradient */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Orders Management
        </h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Track and manage customer orders efficiently
        </p>
      </div>

      {/* Warning banner with improved visibility */}
      {showWarning && (
        <div className="bg-amber-50 border-l-4 border-amber-400 text-amber-800 p-4 mb-6 rounded-lg flex justify-between items-center">
          <div>
            <span className="font-semibold">⚠️ Important Notice:</span>
            <p className="mt-1">All proofs of payment will be automatically deleted after 7 days!</p>
          </div>
          <button
            onClick={() => setShowWarning(false)}
            className="text-amber-600 hover:text-amber-800 text-xl font-bold p-1"
          >
            &times;
          </button>
        </div>
      )}

      {/* Filter controls with better organization */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-600">Filter by:</span>
            <Select onValueChange={(value: 'all' | 'daily' | 'monthly' | 'yearly' | 'custom') => setFilter(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="daily">Today</SelectItem>
                <SelectItem value="monthly">This Month</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
                <SelectItem value="custom">Custom Date</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Add Order Button */}
          <Dialog open={showOrderForm} onOpenChange={setShowOrderForm}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                Add New Order
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-lg max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg">Create New Order</DialogTitle>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marketer</label>
                  <Select 
                    onValueChange={(value) => setNewOrder({...newOrder, user: value})}
                    value={newOrder.user}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a marketer" />
                    </SelectTrigger>
                    <SelectContent>
                      {marketers.map((marketer) => (
                        <SelectItem key={marketer.id} value={marketer.id}>
                          {marketer.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                  <Input
                    type="number"
                    placeholder="Enter total amount"
                    value={newOrder.total_amount}
                    onChange={(e) => setNewOrder({...newOrder, total_amount: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <Select 
                    onValueChange={(value) => setNewOrder({...newOrder, status: value})}
                    value={newOrder.status}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowOrderForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateOrder}
                    disabled={!newOrder.user || !newOrder.total_amount}
                  >
                    Create Order
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {filter === 'custom' && (
          <div className="bg-white p-2 rounded-lg border border-gray-200 mt-3">
            <Calendar
              onChange={(date: Date) => setCustomDate(date)}
              value={customDate}
              className="border-none"
            />
          </div>
        )}

        {filter === 'yearly' && (
          <div className="flex items-center space-x-2 mt-3">
            <span className="text-sm font-medium text-gray-600">Year:</span>
            <Select onValueChange={(value: string) => setSelectedYear(parseInt(value))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Order Items Dialog */}
      <Dialog open={showOrderItemForm} onOpenChange={setShowOrderItemForm}>
        <DialogContent className="rounded-lg max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Add Order Items</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <Select 
                  onValueChange={(value) => setCurrentOrderItem({...currentOrderItem, product: value})}
                  value={currentOrderItem.product}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <Input
                  type="number"
                  placeholder="Enter quantity"
                  value={currentOrderItem.quantity}
                  onChange={(e) => setCurrentOrderItem({...currentOrderItem, quantity: e.target.value})}
                />
              </div>

              <div className="flex items-end">
                <Button 
                  onClick={addOrderItem}
                  disabled={!currentOrderItem.product || !currentOrderItem.quantity}
                  className="w-full"
                >
                  Add Item
                </Button>
              </div>
            </div>

            {/* List of added items */}
            {orderItems.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Order Items</h3>
                <div className="space-y-2">
                  {orderItems.map((item, index) => {
                    const product = products.find(p => p.id === item.product);
                    return (
                      <div key={index} className="flex justify-between items-center border-b pb-2">
                        <div>
                          <p className="font-medium">{product?.title || 'Unknown Product'}</p>
                          <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeOrderItem(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowOrderItemForm(false);
                  setOrderItems([]);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddOrderItems}
                disabled={orderItems.length === 0}
              >
                Save All Items
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced table with better visual hierarchy */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <Table className="min-w-full">
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-semibold text-gray-700">Date</TableHead>
              <TableHead className="font-semibold text-gray-700">Track ID</TableHead>
              <TableHead className="font-semibold text-gray-700">Status</TableHead>
              <TableHead className="font-semibold text-gray-700">Marketer</TableHead>
              <TableHead className="font-semibold text-gray-700">Order Items</TableHead>
              <TableHead className="font-semibold text-gray-700">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map(order => (
              <TableRow key={order.id} className="hover:bg-gray-50 border-b border-gray-100">
                <TableCell className="text-gray-600">
                  {format(new Date(order.created_at), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell className="font-medium text-gray-900">{order.id}</TableCell>
                <TableCell>
                  <Select
                    onValueChange={value => handleStatusChange(order.id, value)}
                    defaultValue={order.status}
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue>
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                          order.status === 'Completed' ? 'bg-green-500' :
                          order.status === 'Pending' ? 'bg-amber-500' :
                          order.status === 'Cancelled' ? 'bg-red-500' :
                          'bg-blue-500'
                        }`}></span>
                        {order.status}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(status => (
                        <SelectItem key={status} value={status} className="flex items-center">
                          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                            status === 'Completed' ? 'bg-green-500' :
                            status === 'Pending' ? 'bg-amber-500' :
                            status === 'Cancelled' ? 'bg-red-500' :
                            'bg-blue-500'
                          }`}></span>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-gray-600">
                  {(order.user as { email?: string })?.email || 'N/A'}
                </TableCell>
                <TableCell className="text-gray-600">
                  <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-full text-xs font-medium">
                    {order.order_items.length} item{order.order_items.length > 1 ? 's' : ''}
                  </span>
                </TableCell>

                {/* View Proofs Button */}

                {/* Action Buttons */}
                <TableCell>
                  <div className="flex space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setSelectedProducts(order.order_items.map(item => ({
                              order_id: order.id,
                              product: item.product,
                              quantity: item.quantity,
                            })))
                          }
                          className="text-gray-700 hover:bg-gray-100"
                        >
                          View Items
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-lg max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-lg">Ordered Products</DialogTitle>
                        </DialogHeader>
                        <div className="mt-4 space-y-4">
                          {selectedProducts.map(({ product, quantity }, index) => (
                            <div key={index} className="border-b border-gray-100 pb-3 last:border-0">
                              <h4 className="font-medium text-gray-900">{product.title}</h4>
                              <p className="text-sm text-gray-600 mt-1">
                                Quantity: <span className="font-medium">{quantity}</span> boxes
                              </p>
                            </div>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
                          handleDeleteOrder(order.id);
                        }
                      }}
                      className="hover:bg-red-600"
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Empty state */}
      {filteredOrders.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg mt-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-700">No orders found</h3>
          <p className="mt-1 text-gray-500">Try adjusting your filters or check back later</p>
        </div>
      )}
    </div>
  );
}
