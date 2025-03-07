'use client';

import { useState } from 'react';
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
import Calendar from 'react-calendar'; // Import the Calendar component
import 'react-calendar/dist/Calendar.css'; // Import the default CSS for the calendar

import { OrdersWithProducts } from '@/app/admin/orders/types';
import { updateOrderStatus } from '@/actions/orders';
import { createClient } from '@supabase/supabase-js';
//import { Alert } from 'react-native';
// Use browser's alert function for visible alerts
const supabaseUrl = 'https://kxnrfzcurobahklqefjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bnJmemN1cm9iYWhrbHFlZmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5NTk1MzUsImV4cCI6MjA1MzUzNTUzNX0.pHrrAPHV1ln1OHugnB93DTUY5TL9K8dYREhz1o0GkjE';
const supabase = createClient(supabaseUrl, supabaseKey);

const statusOptions = ['Pending', 'Approved', 'Cancelled', 'Completed', 'Balanced'];

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
    // Step 1: Fetch all proofs related to the order
    const { data: proofs, error: fetchProofsError } = await supabase
      .from('proof_of_payment')
      .select('id, file_url')
      .eq('order_id', orderId); // Assuming 'order_id' is the foreign key in proof_of_payment

    if (fetchProofsError) {
      throw new Error('Failed to fetch proofs for the order.');
    }

    // Step 2: Delete each proof file from the storage bucket
    for (const proof of proofs) {
      const fileUrl = proof.file_url;
      const filePath = fileUrl.split('/storage/v1/object/public/app-images/')[1]; // Extract the file path

      if (!filePath) {
        alert(`Error: Invalid file URL for proof ID ${proof.id}.`);
        continue; // Skip to the next proof
      }

      const { error: deleteStorageError } = await supabase
        .storage
        .from('app-images') // Replace with your bucket name
        .remove([filePath]);

      if (deleteStorageError) {
        alert(`Error: Failed to delete file for proof ID ${proof.id}.`);
        continue; // Skip to the next proof
      }

      // Step 3: Delete the proof from the proof_of_payment table
      const { error: deleteProofError } = await supabase
        .from('proof_of_payment')
        .delete()
        .eq('id', proof.id);

      if (deleteProofError) {
        alert(`Error: Failed to delete proof ID ${proof.id} from the database.`);
        continue; // Skip to the next proof
      }
    }

    // Step 4: Delete the order from the order table
    const { error: deleteOrderError } = await supabase
      .from('order')
      .delete()
      .eq('id', orderId);

    if (deleteOrderError) {
      throw new Error('Failed to delete the order from the database.');
    }

    // Step 5: Show success message and reload the page
    alert('Success: Order deleted successfully!');
    window.location.reload(); // Reload the page to reflect the changes
  } catch (error) {
    console.error('Error deleting order:', error);
    alert('Error: Failed to delete order. Please try again.');
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

  // Generate a list of years for the year filter (e.g., 2020 to current year)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2019 }, (_, i) => 2020 + i);

  return (
    <div className="container mx-auto p-6">
      <h1 className='text-3xl font-bold mb-6 text-center shadow-lg p-4 rounded-lg bg-white dark:bg-gray-800 dark:text-white'>
        Orders Management Dashboard
      </h1>
      <div className="flex space-x-4 mb-6">
        <Select onValueChange={(value: 'all' | 'daily' | 'monthly' | 'yearly' | 'custom') => setFilter(value)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        {filter === 'custom' && (
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <Calendar
              onChange={(date: Date) => setCustomDate(date)}
              value={customDate}
              className="border-none"
            />
          </div>
        )}
        {filter === 'yearly' && (
          <Select onValueChange={(value: string) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-[120px]">
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
        )}
      </div>
      <div className="overflow-x-auto">
        <Table className="transition-shadow duration-300 hover:shadow-lg">
          <TableHeader>
            <TableRow>
              <TableHead className="shadow-md">Order Date</TableHead>
              <TableHead className="shadow-md">Track ID</TableHead>
              <TableHead className="shadow-md">Order ID</TableHead>
              <TableHead className="shadow-md">Reception Status</TableHead>
              <TableHead className="shadow-md">Delivery Status</TableHead>
              <TableHead className="shadow-md">Marketer</TableHead>
              <TableHead className="shadow-md">Products</TableHead>
              <TableHead className="shadow-md">Payments</TableHead>
              <TableHead colSpan={2} className="shadow-md">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="transition-shadow duration-300 hover:shadow-lg">
            {filteredOrders.map(order => (
              <TableRow key={order.id} className="hover:bg-gray-100 transition-colors duration-200">
                <TableCell className="border-2 border-gray-200">{format(new Date(order.created_at), 'MMM dd, yyyy')}</TableCell>
                <TableCell className="border-2 border-gray-200">{order.id}</TableCell>
                <TableCell className="border-2 border-gray-200">{order.slug}</TableCell>
                <TableCell className="border-2 border-gray-200">{order.receiption_status}</TableCell>
                <TableCell className="border-2 border-gray-200">
                  <Select
                    onValueChange={value => handleStatusChange(order.id, value)}
                    defaultValue={order.status}
                  >
                    <SelectTrigger className="w-[120px] shadow-sm">
                      <SelectValue>{order.status}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(status => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="border-2 border-gray-200">{(order.user as { email?: string })?.email || 'N/A'}</TableCell>
                <TableCell className="border-2 border-gray-200">
                  {order.order_items.length} item
                  {order.order_items.length > 1 ? 's' : ''}
                </TableCell>

                {/* VIEW PROOFS BUTTON */}
                <TableCell className="border-2 border-gray-200">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewProofs(order.id)}
                        className="transition-all duration-200"
                      >
                        View
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl rounded-lg shadow-xl transition-all duration-200">
                      <DialogHeader>
                        <DialogTitle>Payment receipts</DialogTitle>
                      </DialogHeader>
                      <div className="flex flex-col space-y-4 max-h-[400px] overflow-y-auto">
                        {proofs.length > 0 ? (
                          proofs.map(proof => (
                            <div key={proof.id} className="flex flex-col items-center">
                              <Image
                                src={proof.file_url}
                                alt={`Proof of payment ${proof.id}`}
                                width={200}
                                height={150}
                                className="rounded-lg object-cover"
                              />
                              <a href={proof.file_url} download className="mt-2 text-blue-600 underline">
                                Download Proof
                              </a>
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-500">No Proofs Available</span>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>

                {/* VIEW PRODUCTS BUTTON */}
                <TableCell className="border-2 border-gray-200">
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
                      >
                        View Products
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-lg shadow-xl transition-all duration-200">
                      <DialogHeader>
                        <DialogTitle>Order Products</DialogTitle>
                      </DialogHeader>
                      <div className="mt-4">
                        {selectedProducts.map(({ product, quantity }, index) => (
                          <div key={index} className="mr-2 mb-2 flex items-center space-x-2">
                            <div className="flex flex-col">
                              <span className="font-semibold">{product.title}</span>
                              <span className="text-sm text-gray-500">Boxes ordered: {quantity}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>

                {/* DELETE BUTTON */}
                <TableCell className="border-2 border-gray-200">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteOrder(order.id)}
                    className="transition-all duration-200"
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
