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
const supabaseKey = 'ey...your_key_here...';
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
  status: string;
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
    new Date(new Date().setMonth(new Date().getMonth() - 1)),
    new Date(),
  ]);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase.from('product').select('id, title, maxQuantity');
      if (!error) setProducts(data || []);
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from('category').select('*');
      if (!error) setCategories(data || []);
    };
    fetchCategories();
  }, []);

  const fetchSoldProducts = async () => {
    const { data: orderItems } = await supabase.from('order_item').select('order');
    if (!orderItems?.length) return;

    const orderIds = [...new Set(orderItems.map((item) => item.order))];
    const { data: approvedOrders } = await supabase
      .from('order')
      .select('id')
      .in('id', orderIds)
      .eq('status', 'Approved');

    const approvedOrderIds = approvedOrders?.map((order) => order.id) || [];
    const { data: validOrderItems } = await supabase
      .from('order_item')
      .select('product, quantity, created_at')
      .or(approvedOrderIds.map((id) => `order.eq.${id}`).join(','));

    const productIds = [...new Set(validOrderItems?.map((item) => item.product))];
    const { data: products } = await supabase
      .from('product')
      .select('id, title')
      .in('id', productIds);

    const productMap = products?.reduce((acc, product) => {
      acc[product.id] = product.title;
      return acc;
    }, {} as Record<number, string>);

    const soldProductsArray = validOrderItems?.map((orderItem) => ({
      product_name: productMap?.[orderItem.product] || 'Unknown',
      quantity: orderItem.quantity,
      created_at: orderItem.created_at,
    })) || [];

    setSoldProducts(soldProductsArray);
    setFilteredSales(soldProductsArray);
  };

  useEffect(() => {
    fetchSoldProducts();
  }, []);

  const handleAddProduct = async () => {
    if (!title || !selectedCategory) {
      alert('Please fill all fields');
      return;
    }

    setLoading(true);
    const slug = slugify(title, { lower: true, strict: true });

    const { error } = await supabase
      .from('product')
      .insert([{ title, category: selectedCategory, maxQuantity: 0, slug }]);

    if (error) alert('Failed to add product');
    else window.location.reload();
    setLoading(false);
  };

  const fetchCombinedData = async (productId: number) => {
    const { data: entries } = await supabase.from('product_entries').select('*').eq('product_id', productId);
    const { data: soldItems } = await supabase.from('order_item').select('*').eq('product', productId);
    const combined = [
      ...(entries?.map((e) => ({ type: 'Entry', data: e })) || []),
      ...(soldItems?.map((s) => ({ type: 'Sold', data: s })) || []),
    ];
    setCombinedData(combined);
  };

  const handleProductClick = async (productId: number) => {
    setSelectedProductId(productId);
    await fetchCombinedData(productId);
  };

  const handleDateRangeChange = (value: [Date, Date]) => {
    setDateRange(value);
    const filtered = soldProducts.filter((sale) => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= value[0] && saleDate <= value[1];
    });
    setFilteredSales(filtered);
  };

  const getMostSellingProducts = () => {
    const counts: Record<string, number> = {};
    filteredSales.forEach((sale) => {
      counts[sale.product_name] = (counts[sale.product_name] || 0) + sale.quantity;
    });
    return Object.entries(counts)
      .map(([product, quantity]) => ({ product, quantity }))
      .sort((a, b) => b.quantity - a.quantity);
  };

  const getSalesTrends = () => {
    const trends: Record<string, number> = {};
    filteredSales.forEach((sale) => {
      const date = new Date(sale.created_at).toLocaleDateString();
      trends[date] = (trends[date] || 0) + sale.quantity;
    });
    return Object.entries(trends).map(([date, quantity]) => ({ date, quantity }));
  };

  const pieChartData = getMostSellingProducts().map((item) => ({
    name: item.product,
    value: item.quantity,
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

  const handleApproveEntry = async (entryId: number) => {
    const { error } = await supabase.from('product_entries').update({ status: 'Approved' }).eq('id', entryId);
    if (!error && selectedProductId) {
      await fetchCombinedData(selectedProductId);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-200 to-blue-100 text-blue-800 px-6 py-3 rounded-xl shadow-md dark:bg-gray-800 dark:text-white">
          Beverages Summary
        </h1>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">Add New</Button>
          </DialogTrigger>
          <DialogContent className="space-y-4">
            <DialogHeader>
              <DialogTitle>Add New Beverage</DialogTitle>
              <DialogDescription>Fill in the product details.</DialogDescription>
            </DialogHeader>
            <Input
              placeholder="Product Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Select onValueChange={(value) => setSelectedCategory(Number(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
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

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <Card key={product.id} className="bg-white shadow-lg hover:shadow-xl transition-all duration-200">
            <CardHeader className="text-center">
              <CardTitle className="text-lg">{product.title}</CardTitle>
              <p className="text-gray-500">Available: {product.maxQuantity}</p>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Dialog>
                <DialogTrigger asChild>
                  <Button onClick={() => handleProductClick(product.id)}>View Details</Button>
                </DialogTrigger>
                <DialogContent className="max-h-[500px] overflow-y-auto space-y-4">
                  <DialogHeader>
                    <DialogTitle>Details for {product.title}</DialogTitle>
                  </DialogHeader>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>By</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {combinedData.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.type}</TableCell>
                          <TableCell>{item.data.quantity}</TableCell>
                          <TableCell>{new Date(item.data.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{item.type === 'Entry' ? item.data.Created_by : '-'}</TableCell>
                          <TableCell>
                            {item.type === 'Entry' && item.data.status === 'Pending' ? (
                              <Button onClick={() => handleApproveEntry(item.data.id)} variant="outline" size="sm">
                                Approve
                              </Button>
                            ) : item.type === 'Entry' ? (
                              <span className="text-green-600 font-semibold">Approved</span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts and Table Section */}
      <section className="space-y-10">
        <Card>
          <CardHeader>
            <CardTitle>Select Date Range</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar onChange={handleDateRangeChange as any} value={dateRange} selectRange />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales Table</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Beverage</TableHead>
                  <TableHead>Boxes Sold</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{sale.product_name}</TableCell>
                    <TableCell>{sale.quantity}</TableCell>
                    <TableCell>{new Date(sale.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Selling Beverages</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getMostSellingProducts()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="product" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="quantity" fill="#4F46E5" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sales Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getSalesTrends()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="quantity" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Beverage Sales Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieChartData} dataKey="value" nameKey="name" outerRadius={100} label>
                    {pieChartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
