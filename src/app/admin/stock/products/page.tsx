'use client';
import slugify from 'slugify';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const supabaseUrl = 'https://kxnrfzcurobahklqefjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bnJmemN1cm9iYWhrbHFlZmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5NTk1MzUsImV4cCI6MjA1MzUzNTUzNX0.pHrrAPHV1ln1OHugnB93DTUY5TL9K8dYREhz1o0GkjE';
const supabase = createClient(supabaseUrl, supabaseKey);

type Product = {
  id: number;
  title: string;
  maxQuantity: number;
};

type ProductEntry = {
  id: number;
  title: string;
  quantity: number;
  created_at: string;
  Created_by: string;
  status: string; // Add status field
};

type SoldProduct = {
  product_name: string;
  quantity: number;
  created_at: string;
};

type Category = {
  id: number;
  name: string;
};

export default function SummaryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productEntries, setProductEntries] = useState<ProductEntry[]>([]);
  const [soldProducts, setSoldProducts] = useState<SoldProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [combinedData, setCombinedData] = useState<{ type: string; data: any }[]>([]);
  const [filteredSales, setFilteredSales] = useState<SoldProduct[]>([]);
  const [dateRange, setDateRange] = useState<[Date, Date]>([
    new Date(new Date().setMonth(new Date().getMonth() - 1)), // Default: Last 1 month
    new Date(),
  ]);

  // Fetch Products List
  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase.from('product').select('id, title, maxQuantity');
      if (error) console.error('Error fetching products:', error);
      else setProducts(data || []);
    };

    fetchProducts();
  }, []);

  // Fetch Categories
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from('category').select('*');
      if (error) console.error('Error fetching categories:', error);
      else setCategories(data || []);
    };

    fetchCategories();
  }, []);

  // Fetch Sold Products (from approved orders only)
  const fetchSoldProducts = async () => {
    try {
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_item')
        .select('order');

      if (orderItemsError) {
        console.error('Error fetching order items:', orderItemsError);
        return;
      }

      if (!orderItems || orderItems.length === 0) {
        console.log('No order items found.');
        return;
      }

      const orderIds = [...new Set(orderItems.map((item) => item.order))];

      const { data: approvedOrders, error: approvedOrdersError } = await supabase
        .from('order')
        .select('id')
        .in('id', orderIds)
        .eq('status', 'Approved');

      if (approvedOrdersError) {
        console.error('Error fetching approved orders:', approvedOrdersError);
        return;
      }

      if (!approvedOrders || approvedOrders.length === 0) {
        console.log('No approved orders found.');
        return;
      }

      const approvedOrderIds = approvedOrders.map((order) => order.id);

      const { data: validOrderItems, error: validOrderItemsError } = await supabase
        .from('order_item')
        .select('product, quantity, created_at')
        .or(approvedOrderIds.map((id) => `order.eq.${id}`).join(','));

      if (validOrderItemsError) {
        console.error('Error fetching valid order items:', validOrderItemsError);
        return;
      }

      if (!validOrderItems || validOrderItems.length === 0) {
        console.log('No valid order items found.');
        return;
      }

      const productIds = [...new Set(validOrderItems.map((item) => item.product))];
      const { data: products, error: productsError } = await supabase
        .from('product')
        .select('id, title')
        .in('id', productIds);

      if (productsError) {
        console.error('Error fetching product data:', productsError);
        return;
      }

      const productMap = products.reduce((acc, product) => {
        acc[product.id] = product.title;
        return acc;
      }, {});

      const soldProductsArray = validOrderItems.map((orderItem) => ({
        product_name: productMap[orderItem.product] || 'Unknown Product',
        quantity: orderItem.quantity,
        created_at: orderItem.created_at,
      }));

      setSoldProducts(soldProductsArray);
      setFilteredSales(soldProductsArray);
    } catch (error) {
      console.error('Error in fetching sold products:', error);
    }
  };

  // Fetch Sold Products on Component Mount
  useEffect(() => {
    fetchSoldProducts();
  }, []);

  // Handle Add Product
  const handleAddProduct = async () => {
    const slug = slugify(title, { lower: true, strict: true });

    if (!title || !selectedCategory) {
      alert('Please enter product title and select a category.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('product')
        .insert([{ title, category: selectedCategory, maxQuantity: 0, slug }]);

      if (error) {
        console.error('Error adding product:', error);
        alert('Failed to add product.');
      } else {
        alert('Product added successfully!');
        window.location.reload();
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Combined Data for a Specific Product
  const fetchCombinedData = async (productId: number) => {
    const { data: entries, error: entriesError } = await supabase
      .from('product_entries')
      .select('*')
      .eq('product_id', productId);

    if (entriesError) {
      console.error('Error fetching product entries:', entriesError);
      return;
    }

    const { data: soldItems, error: soldItemsError } = await supabase
      .from('order_item')
      .select('product, quantity, created_at')
      .eq('product', productId);

    if (soldItemsError) {
      console.error('Error fetching sold products:', soldItemsError);
      return;
    }

    const combined = [
      ...(entries?.map((entry) => ({ type: 'Entry', data: entry })) || []),
      ...(soldItems?.map((soldItem) => ({ type: 'Sold', data: soldItem })) || []),
    ];

    setCombinedData(combined);
  };

  // Handle Product Click
  const handleProductClick = async (productId: number) => {
    setSelectedProductId(productId);
    await fetchCombinedData(productId);
  };

  // Handle Date Range Change
  const handleDateRangeChange = (value: [Date, Date]) => {
    setDateRange(value);

    const filtered = soldProducts.filter((sale) => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= value[0] && saleDate <= value[1];
    });

    setFilteredSales(filtered);
  };

  // Get Most Selling Products
  const getMostSellingProducts = () => {
    const productSales: { [key: string]: number } = {};

    filteredSales.forEach((sale) => {
      if (productSales[sale.product_name]) {
        productSales[sale.product_name] += sale.quantity;
      } else {
        productSales[sale.product_name] = sale.quantity;
      }
    });

    return Object.entries(productSales)
      .map(([product, quantity]) => ({ product, quantity }))
      .sort((a, b) => b.quantity - a.quantity);
  };

  // Get Sales Trends Over Time
  const getSalesTrends = () => {
    const trends: { [key: string]: number } = {};

    filteredSales.forEach((sale) => {
      const date = new Date(sale.created_at).toLocaleDateString();
      if (trends[date]) {
        trends[date] += sale.quantity;
      } else {
        trends[date] = sale.quantity;
      }
    });

    return Object.entries(trends).map(([date, quantity]) => ({ date, quantity }));
  };

  // Pie Chart Data
  const pieChartData = getMostSellingProducts().map((item) => ({
    name: item.product,
    value: item.quantity,
  }));

  // Pie Chart Colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

  // Handle Approve Entry
  const handleApproveEntry = async (entryId: number) => {
    const { error } = await supabase
      .from('product_entries')
      .update({ status: 'Approved' })
      .eq('id', entryId);

    if (error) {
      console.error('Error approving entry:', error);
      alert('Failed to approve entry.');
    } else {
      alert('Entry approved successfully!');
      // Refresh the combined data
      if (selectedProductId) {
        await fetchCombinedData(selectedProductId);
      }
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold shadow-lg p-4 rounded-lg bg-blue-100 dark:bg-gray-800 dark:text-white">
          Beverages Summary
        </h1>

        {/* Add Product Button */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="default">Add new</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New beverage</DialogTitle>
              <DialogDescription>Fill in the details below.</DialogDescription>
            </DialogHeader>

            <Input
              type="text"
              placeholder="Product Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full"
            />

            <Select onValueChange={(value) => setSelectedCategory(Number(value))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleAddProduct} disabled={loading}>
              {loading ? 'Adding...' : 'Add Product'}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* List of Products */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {products.map((product) => (
          <div key={product.id} className="p-4 bg-white shadow-md rounded-lg text-center">
            <h2 className="text-lg font-semibold">{product.title}</h2>
            <p className="text-gray-600">Available boxes: {product.maxQuantity}</p>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  onClick={() => handleProductClick(product.id)}
                  className="mt-2"
                >
                  View Details
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Details for {product.title}</DialogTitle>
                </DialogHeader>
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transaction</TableHead>
                        <TableHead>Boxes</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {combinedData.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.type}</TableCell>
                          <TableCell>{item.data.quantity}</TableCell>
                          <TableCell>
                            {new Date(item.data.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {item.type === 'Entry' ? item.data.Created_by : '-'}
                          </TableCell>
                          <TableCell>
                            {item.type === 'Entry' && item.data.status === 'Pending' ? (
                              <Button
                                variant="outline"
                                onClick={() => handleApproveEntry(item.data.id)}
                              >
                                Approve
                              </Button>
                            ) : item.type === 'Entry' && item.data.status === 'Approved' ? (
                              <span className="text-green-500">Approved</span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ))}
      </div>

      {/* Sales Table and Charts Section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Sales Overview</h2>

        {/* Date Range Picker */}
        <div className="mb-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Date Range</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                onChange={handleDateRangeChange as any}
                value={dateRange}
                selectRange={true}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sales Table */}
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales Table</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Beverage</TableHead>
                      <TableHead>Boxes sold</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale, index) => (
                      <TableRow key={index}>
                        <TableCell>{sale.product_name}</TableCell>
                        <TableCell>{sale.quantity}</TableCell>
                        <TableCell>
                          {new Date(sale.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Selling Products Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Most Selling beverages</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getMostSellingProducts()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="product" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="quantity" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Sales Trends Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Sales Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getSalesTrends()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="quantity" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie Chart for Most Selling Products */}
          <Card>
            <CardHeader>
              <CardTitle>Beverage Sales Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    label
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
