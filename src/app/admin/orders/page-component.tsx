'use client';

import { useState } from 'react';
import { format } from 'date-fns';
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
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bnJmemN1cm9iYWhrbHFlZmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5NTk1MzUsImV4cCI6MjA1MzUzNTUzNX0.pHrrAPHV1ln1OHugnB93DTUY5TL9K8dYREhz1o0GkjE';
const supabase = createClient(supabaseUrl, supabaseKey);

const statusOptions = ['Pending', 'Approved', 'Cancelled', 'Completed','Balanced'];

type Props = {
  ordersWithProducts: OrdersWithProducts;
};

export default function PageComponent({ ordersWithProducts }: Props) {
  const [selectedProducts, setSelectedProducts] = useState<
    { order_id: number; product: any }[]
  >([]);
  const [proofs, setProofs] = useState<{ id: number; file_url: string }[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

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
      const { error } = await supabase
        .from('order') // Replace 'orders' with your actual table name
        .delete()
        .eq('id', orderId); // Delete the order with the matching ID

      if (error) throw error;

      // Optionally, refresh the orders list or remove the deleted order from the state
      alert('Order deleted successfully!');
      window.location.reload(); // Refresh the page to reflect changes
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Failed to delete order. Please try again.');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">Orders Management Dashboard</h1>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Order Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>Total Price</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Payments</TableHead>
              <TableHead colSpan={2}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordersWithProducts.map(order => (
              <TableRow key={order.id}>
                <TableCell>{order.id}</TableCell>
                <TableCell>{format(new Date(order.created_at), 'MMM dd, yyyy')}</TableCell>
                <TableCell>
                  <Select
                    onValueChange={value => handleStatusChange(order.id, value)}
                    defaultValue={order.status}
                  >
                    <SelectTrigger className="w-[120px]">
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
                <TableCell>{order.description || 'No Description'}</TableCell>
                <TableCell>{(order.user as { email?: string })?.email || 'N/A'}</TableCell>
                <TableCell>{order.slug}</TableCell>
                <TableCell>UGX {order.totalPrice.toFixed(1)}</TableCell>
                <TableCell>
                  {order.order_items.length} item
                  {order.order_items.length > 1 ? 's' : ''}
                </TableCell>

                {/* VIEW PROOFS BUTTON */}
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewProofs(order.id)}
                      >
                        View
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
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
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSelectedProducts(order.order_items.map(item => ({
                            order_id: order.id,
                            product: item.product,
                          })))
                        }
                      >
                        View Products
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Order Products</DialogTitle>
                      </DialogHeader>
                      <div className="mt-4">
                        {selectedProducts.map(({ product }, index) => (
                          <div key={index} className="mr-2 mb-2 flex items-center space-x-2">
                            <div className="flex flex-col">
                              <span className="font-semibold">{product.title}</span>
                              <span className="text-gray-600">UGX {product.price.toFixed(1)}</span>
                              <span className="text-sm text-gray-500">Available Quantity: {product.maxQuantity}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>

                {/* DELETE BUTTON */}
                <TableCell>
                  <Button
                    variant="destructive" // Use a destructive style for delete actions
                    size="sm"
                    onClick={() => handleDeleteOrder(order.id)} // Pass the order ID to the function
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