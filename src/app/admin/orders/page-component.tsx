'use client';

import { useState } from 'react';
import { format, startOfDay, startOfMonth, startOfYear, isWithinInterval } from 'date-fns';
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

import { OrdersWithProducts } from '@/app/admin/orders/types';
import { updateOrderStatus } from '@/actions/orders';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kxnrfzcurobahklqefjs.supabase.co';
const supabaseKey = 'YeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bnJmemN1cm9iYWhrbHFlZmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5NTk1MzUsImV4cCI6MjA1MzUzNTUzNX0.pHrrAPHV1ln1OHugnB93DTUY5TL9K8dYREhz1o0GkjE';
const supabase = createClient(supabaseUrl, supabaseKey);

const statusOptions = ['Pending', 'Approved', 'Cancelled', 'Completed', 'Balanced'];

type Props = {
  ordersWithProducts: OrdersWithProducts;
};

export default function PageComponent({ ordersWithProducts }: Props) {
  const [selectedProducts, setSelectedProducts] = useState<{ order_id: number; product: any; quantity: number }[]>([]);
  const [proofs, setProofs] = useState<{ id: number; file_url: string }[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [dateFilter, setDateFilter] = useState('All'); // Default to show all orders
  const [customDate, setCustomDate] = useState('');

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
      const { error } = await supabase.from('order').delete().eq('id', orderId);

      if (error) throw error;
      alert('Order deleted successfully!');
      window.location.reload();
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Failed to delete order. Please try again.');
    }
  };

  // **FILTER LOGIC**
  const filteredOrders = ordersWithProducts.filter((order) => {
    const orderDate = new Date(order.created_at);
    const today = startOfDay(new Date());

    switch (dateFilter) {
      case 'Daily':
        return orderDate >= today;
      case 'Monthly':
        return orderDate >= startOfMonth(today);
      case 'Yearly':
        return orderDate >= startOfYear(today);
      case 'Custom':
        if (!customDate) return true;
        return format(orderDate, 'yyyy-MM-dd') === customDate;
      default:
        return true; // Show all orders by default
    }
  });

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center shadow-lg p-4 rounded-lg bg-blue-100 dark:bg-gray-800 dark:text-white">
        Orders Management Dashboard
      </h1>

      {/* Filter Section */}
      <div className="flex flex-wrap gap-4 items-center mb-6 ">
        <h2 className="font-semibold text-sky-500">Filter Orders:</h2>
        <Select onValueChange={setDateFilter} defaultValue="All">
          <SelectTrigger className="w-[150px] shadow-sm  text-sky-500">
            <SelectValue>{dateFilter}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All</SelectItem>
            <SelectItem value="Daily">Daily</SelectItem>
            <SelectItem value="Monthly">Monthly</SelectItem>
            <SelectItem value="Yearly">Yearly</SelectItem>
            <SelectItem value="Custom">Custom Date</SelectItem>
          </SelectContent>
        </Select>

        {dateFilter === 'Custom' && (
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="border rounded-md p-2 shadow-sm"
          />
        )}
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto">
        <Table className="transition-shadow duration-300 hover:shadow-lg">
          <TableHeader>
            <TableRow>
              <TableHead className="shadow-md">Order Date</TableHead>
              <TableHead className="shadow-md">Track ID</TableHead>
              <TableHead className="shadow-md">Order ID</TableHead>
              <TableHead className="shadow-md">Reception Status</TableHead>
              <TableHead className="shadow-md">Delivery Status</TableHead>
              <TableHead className="shadow-md">Marketeer</TableHead>
              <TableHead className="shadow-md">No. of items</TableHead>
              <TableHead className="shadow-md">Payments</TableHead>
              <TableHead colSpan={2} className="shadow-md">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order) => (
              <TableRow key={order.id} className="hover:bg-gray-100 transition-colors duration-200">
                <TableCell>{format(new Date(order.created_at), 'MMM dd, yyyy')}</TableCell>
                <TableCell>{order.id}</TableCell>
                <TableCell>{order.slug}</TableCell>
                <TableCell>{order.receiption_status}</TableCell>
                <TableCell>
                  <Select onValueChange={(value) => handleStatusChange(order.id, value)} defaultValue={order.status}>
                    <SelectTrigger className="w-[120px] shadow-sm">
                      <SelectValue>{order.status}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{(order.user as { email?: string })?.email || 'N/A'}</TableCell>
                <TableCell>{order.order_items.length} item{order.order_items.length > 1 ? 's' : ''}</TableCell>

                {/* VIEW PROOFS BUTTON */}
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => handleViewProofs(order.id)}>
                        View
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Payment Receipts</DialogTitle>
                      </DialogHeader>
                      <div className="flex flex-col space-y-4 max-h-[400px] overflow-y-auto">
                        {proofs.length > 0 ? proofs.map((proof) => (
                          <Image key={proof.id} src={proof.file_url} alt={`Proof ${proof.id}`} width={200} height={150} className="rounded-lg object-cover" />
                        )) : <span>No Proofs Available</span>}
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>

                <TableCell>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteOrder(order.id)}>
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
