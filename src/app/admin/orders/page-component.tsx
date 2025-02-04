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

const statusOptions = ['Pending', 'Approved', 'Cancelled', 'Completed'];

type Props = {
  ordersWithProducts: OrdersWithProducts;
};

export default function PageComponent({ ordersWithProducts }: Props) {
  const [selectedProducts, setSelectedProducts] = useState<
    { order_id: number; product: any }[]
  >([]);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);

  const handleStatusChange = async (orderId: number, status: string) => {
    await updateOrderStatus(orderId, status);
  };

  return (
    <div className='container mx-auto p-6'>
      <h1 className='text-2xl font-bold mb-6 text-center'>Orders Management Dashboard</h1>
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
            <TableHead>Payment Proof</TableHead>
            <TableHead>Actions</TableHead>
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
                  <SelectTrigger className='w-[120px]'>
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

              {/* PAYMENT PROOF COLUMN */}
              <TableCell>
                {order.proof ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setSelectedProof(order.proof)}>
                        View Proof
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Payment Proof</DialogTitle>
                      </DialogHeader>
                      <div className="flex flex-col items-center">
                        <Image
                          src={selectedProof || order.proof}
                          alt="Payment Proof"
                          width={300}
                          height={300}
                          className="rounded-lg"
                        />
                        <a href={selectedProof || order.proof} download className="mt-4 text-blue-600 underline">
                          Download Proof
                        </a>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <span className="text-gray-500">No Proof</span>
                )}
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
                          <Image
                            className="w-16 h-16 object-cover rounded"
                            src={product.heroImage}
                            alt={product.title}
                            width={64}
                            height={64}
                          />
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
