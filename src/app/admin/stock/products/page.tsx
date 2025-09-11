'use client';
import slugify from 'slugify';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
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
import { Edit, Trash2, Plus, Minus } from 'lucide-react';

const supabaseUrl = 'https://kxnrfzcurobahklqefjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bnJmemN1cm9iYWhrbHFlZmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5NTk1MzUsImV4cCI6MjA1MzUzNTUzNX0.pHrrAPHV1ln1OHugnB93DTUY5TL9K8dYREhz1o0GkjE';
const supabase = createClient(supabaseUrl, supabaseKey);

type Product = {
  id: number;
  title: string;
  category: number;
};

type ProductEntry = {
  id: number;
  product_id: number;
  title: string;
  quantity: number;
  created_at: string;
  created_by: string;
  transaction: string;
};

type Category = {
  id: number;
  name: string;
};

type OpeningStock = {
  id: number;
  product_id: number;
  date: string;
  quantity: number;
  type: 'product' | 'material';
};

export default function SummaryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productEntries, setProductEntries] = useState<ProductEntry[]>([]);
  const [openingStocks, setOpeningStocks] = useState<OpeningStock[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<[Date, Date]>([
    new Date(new Date().setMonth(new Date().getMonth() - 1)),
    new Date(),
  ]);
  const [inflowForm, setInflowForm] = useState({
    id: null as number | null,
    date: new Date().toISOString().split('T')[0],
    product_id: '',
    source: '',
    quantity: '',
  });
  const [outflowForm, setOutflowForm] = useState({
    id: null as number | null,
    date: new Date().toISOString().split('T')[0],
    product_id: '',
    reason: '',
    quantity: '',
  });
  const [openingStockForm, setOpeningStockForm] = useState({
    id: null as number | null,
    date: new Date().toISOString().split('T')[0],
    product_id: '',
    quantity: '',
  });
  const [productToDelete, setProductToDelete] = useState<number | null>(null);
  const [availableQuantities, setAvailableQuantities] = useState<Record<number, number>>({});
  const [isOpeningStockDialogOpen, setIsOpeningStockDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<Date>(new Date());
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [viewingTransactions, setViewingTransactions] = useState<Product | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<ProductEntry | null>(null);

  // Calculate available quantities with useCallback to prevent infinite re-renders
  const calculateAvailableQuantities = useCallback((entries: ProductEntry[], stocks: OpeningStock[]) => {
    const quantities: Record<number, number> = {};

    // Initialize with opening stocks
    stocks.forEach(stock => {
      if (!quantities[stock.product_id]) quantities[stock.product_id] = 0;
      quantities[stock.product_id] += stock.quantity;
    });

    // Add inflows and subtract outflows
    entries.forEach(entry => {
      if (!quantities[entry.product_id]) quantities[entry.product_id] = 0;
      quantities[entry.product_id] += entry.quantity;
    });

    setAvailableQuantities(quantities);
  }, []);

  // Fetch all data
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        // Fetch products
        const { data: productsData, error: productsError } = await supabase
          .from('product')
          .select('id, title, category');
        if (productsError) throw productsError;

        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('category')
          .select('*');
        if (categoriesError) throw categoriesError;

        // Fetch opening stocks
        const { data: openingStocksData, error: openingStocksError } = await supabase
          .from('opening_stocks')
          .select('*')
          .eq('type', 'product')
          .order('date', { ascending: false });
        if (openingStocksError) throw openingStocksError;

        // Fetch product entries
        const { data: productEntriesData, error: entriesError } = await supabase
          .from('product_entries')
          .select('*');
        if (entriesError) throw entriesError;

        setProducts(productsData || []);
        setCategories(categoriesData || []);
        setOpeningStocks(openingStocksData || []);
        setProductEntries(productEntriesData || []);
        calculateAvailableQuantities(productEntriesData || [], openingStocksData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [calculateAvailableQuantities]);

  // Recalculate available quantities when product entries or opening stocks change
  useEffect(() => {
    calculateAvailableQuantities(productEntries, openingStocks);
  }, [productEntries, openingStocks, calculateAvailableQuantities]);

  const fetchProductEntriesForProduct = async (productId: number) => {
    const { data, error } = await supabase
      .from('product_entries')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching product entries:', error);
    else setProductEntries(data || []);
  };

  const handleAddProduct = async () => {
    const slug = slugify(title, { lower: true, strict: true });

    if (!title || !selectedCategory) {
      alert('Please enter product title and select a category.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('product')
        .insert([{ title, category: selectedCategory, slug }])
        .select();

      if (error) throw error;
      
      alert('Beverage added successfully!');
      setProducts(prev => [...prev, data[0]]);
      setAvailableQuantities(prev => ({ ...prev, [data[0].id]: 0 }));
      setTitle('');
      setSelectedCategory(null);
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = async () => {
    if (!editingProduct || !editingProduct.title || !editingProduct.category) {
      alert('Please enter product title and select a category.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('product')
        .update({ 
          title: editingProduct.title, 
          category: editingProduct.category 
        })
        .eq('id', editingProduct.id);

      if (error) throw error;
      
      alert('Beverage updated successfully!');
      setProducts(prev => prev.map(p => 
        p.id === editingProduct.id ? editingProduct : p
      ));
      setIsEditingProduct(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory) {
      alert('Please enter a category name.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('category')
        .insert([{ name: newCategory }])
        .select();

      if (error) throw error;
      
      alert('Category added successfully!');
      setCategories(prev => [...prev, data[0]]);
      setNewCategory('');
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Failed to add category.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !editingCategory.name) {
      alert('Please enter a category name.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('category')
        .update({ name: editingCategory.name })
        .eq('id', editingCategory.id);

      if (error) throw error;
      
      alert('Category updated successfully!');
      setCategories(prev => prev.map(c => 
        c.id === editingCategory.id ? editingCategory : c
      ));
      setIsEditingCategory(false);
      setEditingCategory(null);
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Failed to update category.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category? Products in this category will not be deleted.')) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('category')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      alert('Category deleted successfully!');
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    setDeleteLoading(true);

    try {
      // Delete related entries
      await supabase
        .from('product_entries')
        .delete()
        .eq('product_id', productToDelete);

      // Delete opening stocks
      await supabase
        .from('opening_stocks')
        .delete()
        .eq('product_id', productToDelete)
        .eq('type', 'product');

      // Delete product
      await supabase
        .from('product')
        .delete()
        .eq('id', productToDelete);

      alert('Beverage deleted successfully!');
      setProducts(prev => prev.filter(p => p.id !== productToDelete));
      setProductToDelete(null);
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete beverage.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleProductClick = async (productId: number) => {
    setSelectedProductId(productId);
    await fetchProductEntriesForProduct(productId);
  };

  const recordInflow = async () => {
    if (!inflowForm.product_id || !inflowForm.source || !inflowForm.quantity) {
      alert('Please fill all fields');
      return;
    }

    const productId = Number(inflowForm.product_id);
    const product = products.find(p => p.id === productId);
    if (!product) return;

    try {
      if (inflowForm.id) {
        // Update existing inflow
        const { error } = await supabase
          .from('product_entries')
          .update({
            quantity: Number(inflowForm.quantity),
            created_at: inflowForm.date,
            transaction: inflowForm.source,
          })
          .eq('id', inflowForm.id);

        if (error) throw error;
        alert('Inflow updated successfully!');
      } else {
        // Create new inflow
        const { error } = await supabase
          .from('product_entries')
          .insert([{
            product_id: productId,
            title: product.title,
            quantity: Number(inflowForm.quantity),
            created_at: inflowForm.date,
            created_by: 'Admin',
            transaction: inflowForm.source,
          }]);

        if (error) throw error;
        alert('Inflow recorded successfully!');
      }

      // Refresh data
      const { data: productEntriesData } = await supabase
        .from('product_entries')
        .select('*');
      
      const { data: stocks } = await supabase
        .from('opening_stocks')
        .select('*')
        .eq('type', 'product')
        .order('date', { ascending: false });
      
      setProductEntries(productEntriesData || []);
      setOpeningStocks(stocks || []);
      calculateAvailableQuantities(productEntriesData || [], stocks || []);

      setInflowForm({
        id: null,
        date: new Date().toISOString().split('T')[0],
        product_id: '',
        source: '',
        quantity: '',
      });
    } catch (error) {
      console.error('Error recording inflow:', error);
      alert('Failed to record inflow');
    }
  };

  const recordOutflow = async () => {
    if (!outflowForm.product_id || !outflowForm.reason || !outflowForm.quantity) {
      alert('Please fill all fields');
      return;
    }

    const productId = Number(outflowForm.product_id);
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const currentQuantity = availableQuantities[productId] || 0;
    if (currentQuantity < Number(outflowForm.quantity)) {
      alert('Not enough quantity available');
      return;
    }

    try {
      if (outflowForm.id) {
        // Update existing outflow
        const { error } = await supabase
          .from('product_entries')
          .update({
            quantity: -Number(outflowForm.quantity),
            created_at: outflowForm.date,
            transaction: outflowForm.reason,
          })
          .eq('id', outflowForm.id);

        if (error) throw error;
        alert('Outflow updated successfully!');
      } else {
        // Create new outflow
        const { error } = await supabase
          .from('product_entries')
          .insert([{
            product_id: productId,
            title: product.title,
            quantity: -Number(outflowForm.quantity),
            created_at: outflowForm.date,
            created_by: 'Admin',
            transaction: outflowForm.reason,
          }]);

        if (error) throw error;
        alert('Outflow recorded successfully!');
      }

      // Refresh data
      const { data: productEntriesData } = await supabase
        .from('product_entries')
        .select('*');
      
      const { data: stocks } = await supabase
        .from('opening_stocks')
        .select('*')
        .eq('type', 'product')
        .order('date', { ascending: false });
      
      setProductEntries(productEntriesData || []);
      setOpeningStocks(stocks || []);
      calculateAvailableQuantities(productEntriesData || [], stocks || []);

      setOutflowForm({
        id: null,
        date: new Date().toISOString().split('T')[0],
        product_id: '',
        reason: '',
        quantity: '',
      });
    } catch (error) {
      console.error('Error recording outflow:', error);
      alert('Failed to record outflow');
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      const { error } = await supabase
        .from('product_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Refresh data
      const { data: productEntriesData } = await supabase
        .from('product_entries')
        .select('*');
      
      const { data: stocks } = await supabase
        .from('opening_stocks')
        .select('*')
        .eq('type', 'product')
        .order('date', { ascending: false });
      
      setProductEntries(productEntriesData || []);
      setOpeningStocks(stocks || []);
      calculateAvailableQuantities(productEntriesData || [], stocks || []);

      alert('Transaction deleted successfully!');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction');
    }
  };

  const handleRecordOpeningStock = async () => {
    if (!openingStockForm.product_id || !openingStockForm.quantity) {
      alert('Please fill all required fields');
      return;
    }

    const productId = Number(openingStockForm.product_id);
    const quantity = Number(openingStockForm.quantity);

    try {
      if (openingStockForm.id) {
        // Update existing opening stock
        const { error } = await supabase
          .from('opening_stocks')
          .update({
            quantity: quantity,
          })
          .eq('id', openingStockForm.id);

        if (error) throw error;
        alert('Opening stock updated successfully!');
      } else {
        // Check for existing record
        const { data: existing, error: checkError } = await supabase
          .from('opening_stocks')
          .select('*')
          .eq('product_id', productId)
          .eq('date', openingStockForm.date)
          .eq('type', 'product')
          .maybeSingle();

        if (checkError) throw checkError;
        if (existing) {
          alert('Opening stock already recorded for this product on the selected date');
          return;
        }

        // Record new opening stock
        const { error } = await supabase
          .from('opening_stocks')
          .insert([{
            product_id: productId,
            date: openingStockForm.date,
            quantity: quantity,
            type: 'product'
          }]);

        if (error) throw error;
        alert('Opening stock recorded successfully!');
      }

      // Refresh ALL data
      const { data: productEntriesData, error: entriesError } = await supabase
        .from('product_entries')
        .select('*');
      if (entriesError) throw entriesError;

      const { data: stocks } = await supabase
        .from('opening_stocks')
        .select('*')
        .eq('type', 'product')
        .order('date', { ascending: false });
      
      setOpeningStocks(stocks || []);
      setProductEntries(productEntriesData || []);
      calculateAvailableQuantities(productEntriesData || [], stocks || []);

      setIsOpeningStockDialogOpen(false);
      setOpeningStockForm({
        id: null,
        date: new Date().toISOString().split('T')[0],
        product_id: '',
        quantity: '',
      });
    } catch (error) {
      console.error('Error recording opening stock:', error);
      alert('Failed to record opening stock');
    }
  };

  const handleDeleteOpeningStock = async (id: number) {
    if (!confirm('Are you sure you want to delete this opening stock record?')) return;

    try {
      const { error } = await supabase
        .from('opening_stocks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Refresh data
      const { data: stocks } = await supabase
        .from('opening_stocks')
        .select('*')
        .eq('type', 'product')
        .order('date', { ascending: false });
      
      setOpeningStocks(stocks || []);
      calculateAvailableQuantities(productEntries, stocks || []);

      alert('Opening stock record deleted successfully!');
    } catch (error) {
      console.error('Error deleting opening stock:', error);
      alert('Failed to delete opening stock record');
    }
  };

  const calculateOpeningStock = (productId: number, date: string) => {
    // Check if there's an opening stock recorded exactly on this date
    const openingStockOnDate = openingStocks.find(
      stock => stock.product_id === productId && stock.date === date
    );
    
    if (openingStockOnDate) {
      return openingStockOnDate.quantity;
    }

    // If no opening stock on this date, find most recent opening stock before this date
    const previousStocks = openingStocks
      .filter(stock => 
        stock.product_id === productId && 
        stock.date < date
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const mostRecentStock = previousStocks[0]?.quantity || 0;
    const mostRecentStockDate = previousStocks[0]?.date || '';

    // Calculate net transactions since most recent opening stock
    const relevantTransactions = productEntries.filter(entry => 
      entry.product_id === productId &&
      entry.created_at >= mostRecentStockDate &&
      entry.created_at < date
    );

    const netTransactions = relevantTransactions.reduce((sum, entry) => sum + entry.quantity, 0);

    return mostRecentStock + netTransactions;
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown';
  };

  const openEditTransaction = (transaction: ProductEntry) => {
    setEditingTransaction(transaction);
    if (transaction.quantity > 0) {
      setInflowForm({
        id: transaction.id,
        date: new Date(transaction.created_at).toISOString().split('T')[0],
        product_id: String(transaction.product_id),
        source: transaction.transaction,
        quantity: String(transaction.quantity),
      });
    } else {
      setOutflowForm({
        id: transaction.id,
        date: new Date(transaction.created_at).toISOString().split('T')[0],
        product_id: String(transaction.product_id),
        reason: transaction.transaction,
        quantity: String(Math.abs(transaction.quantity)),
      });
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🥤</span>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            Beverage Inventory Dashboard
          </h1>
        </div>

        {/* Add Product Button */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="default" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700">
              <Plus size={16} />
              <span>Add New Beverage</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-lg max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>🥤</span>
                <span>Add New Beverage</span>
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Fill in the details below to add a new beverage to inventory.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beverage Name</label>
                <Input
                  type="text"
                  placeholder="e.g. Cola, Orange Juice"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
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
              </div>

              <Button 
                onClick={handleAddProduct} 
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                {loading ? 'Adding...' : 'Add Beverage'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Management */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Categories</span>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="flex items-center gap-1">
                  <Plus size={16} />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-lg max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Category</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Category Name"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  />
                  <Button onClick={handleAddCategory} disabled={loading}>
                    {loading ? 'Adding...' : 'Add Category'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map(category => (
              <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                <span>{category.name}</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingCategory(category);
                      setIsEditingCategory(true);
                    }}
                  >
                    <Edit size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteCategory(category.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Category Dialog */}
      <Dialog open={isEditingCategory} onOpenChange={setIsEditingCategory}>
        <DialogContent className="rounded-lg max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Category Name"
              value={editingCategory?.name || ''}
              onChange={(e) => setEditingCategory(prev => prev ? {...prev, name: e.target.value} : null)}
            />
            <Button onClick={handleEditCategory} disabled={loading}>
              {loading ? 'Updating...' : 'Update Category'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Recording Buttons */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Record Inflow Button */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="default" className="bg-green-600 hover:bg-green-700">
              📥 Record Inflow
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-lg max-w-md">
            <DialogHeader>
              <DialogTitle>{inflowForm.id ? 'Edit' : 'Record'} Beverage Inflow</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <Input
                  type="date"
                  name="date"
                  value={inflowForm.date}
                  onChange={(e) => setInflowForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beverage</label>
                <Select 
                  onValueChange={(value) => setInflowForm(prev => ({ ...prev, product_id: value }))}
                  value={inflowForm.product_id}
                  disabled={!!inflowForm.id}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a beverage" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(product => (
                      <SelectItem key={product.id} value={String(product.id)}>
                        {product.title} (Available: {availableQuantities[product.id] || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <Select 
                  onValueChange={(value) => setInflowForm(prev => ({ ...prev, source: value }))}
                  value={inflowForm.source}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Production">Production</SelectItem>
                    <SelectItem value="Return">Return</SelectItem>
                    <SelectItem value="Stamped">Stamped</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <Input
                  type="number"
                  name="quantity"
                  value={inflowForm.quantity}
                  onChange={(e) => setInflowForm(prev => ({ ...prev, quantity: e.target.value }))}
                  className="w-full"
                  min="1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={recordInflow} className="bg-green-600 hover:bg-green-700">
                {inflowForm.id ? 'Update' : 'Record'} Inflow
              </Button>
              <DialogClose asChild>
                <Button variant="outline" onClick={() => setInflowForm({
                  id: null,
                  date: new Date().toISOString().split('T')[0],
                  product_id: '',
                  source: '',
                  quantity: '',
                })}>
                  Cancel
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Record Outflow Button */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="default" className="bg-red-600 hover:bg-red-700">
              📤 Record Outflow
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-lg max-w-md">
            <DialogHeader>
              <DialogTitle>{outflowForm.id ? 'Edit' : 'Record'} Beverage Outflow</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <Input
                  type="date"
                  name="date"
                  value={outflowForm.date}
                  onChange={(e) => setOutflowForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beverage</label>
                <Select 
                  onValueChange={(value) => setOutflowForm(prev => ({ ...prev, product_id: value }))}
                  value={outflowForm.product_id}
                  disabled={!!outflowForm.id}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a beverage" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(product => (
                      <SelectItem key={product.id} value={String(product.id)}>
                        {product.title} (Available: {availableQuantities[product.id] || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <Select 
                  onValueChange={(value) => setOutflowForm(prev => ({ ...prev, reason: value }))}
                  value={outflowForm.reason}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Staff">Staff</SelectItem>
                    <SelectItem value="Non Conforming">Non Conforming</SelectItem>
                    <SelectItem value="Missing">Missing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <Input
                  type="number"
                  name="quantity"
                  value={outflowForm.quantity}
                  onChange={(e) => setOutflowForm(prev => ({ ...prev, quantity: e.target.value }))}
                  className="w-full"
                  min="1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={recordOutflow} className="bg-red-600 hover:bg-red-700">
                {outflowForm.id ? 'Update' : 'Record'} Outflow
              </Button>
              <DialogClose asChild>
                <Button variant="outline" onClick={() => setOutflowForm({
                  id: null,
                  date: new Date().toISOString().split('T')[0],
                  product_id: '',
                  reason: '',
                  quantity: '',
                })}>
                  Cancel
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Record Opening Stock Button */}
        <Dialog open={isOpeningStockDialogOpen} onOpenChange={setIsOpeningStockDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="default" className="bg-blue-600 hover:bg-blue-700">
              📅 Record Opening Stock
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-lg max-w-md">
            <DialogHeader>
              <DialogTitle>{openingStockForm.id ? 'Edit' : 'Record'} Opening Stock</DialogTitle>
              <DialogDescription>
                {openingStockForm.id ? 'Edit' : 'Record'} the starting quantity for a beverage on a specific date
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <Input
                  type="date"
                  value={openingStockForm.date}
                  onChange={(e) => setOpeningStockForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full"
                  disabled={!!openingStockForm.id}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beverage</label>
                <Select 
                  onValueChange={(value) => setOpeningStockForm(prev => ({ ...prev, product_id: value }))}
                  value={openingStockForm.product_id}
                  disabled={!!openingStockForm.id}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a beverage" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(product => (
                      <SelectItem key={product.id} value={String(product.id)}>
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
                  value={openingStockForm.quantity}
                  onChange={(e) => setOpeningStockForm(prev => ({ ...prev, quantity: e.target.value }))}
                  className="w-full"
                  min="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleRecordOpeningStock} className="bg-blue-600 hover:bg-blue-700">
                {openingStockForm.id ? 'Update' : 'Record'} Opening Stock
              </Button>
              <DialogClose asChild>
                <Button variant="outline" onClick={() => setOpeningStockForm({
                  id: null,
                  date: new Date().toISOString().split('T')[0],
                  product_id: '',
                  quantity: '',
                })}>
                  Cancel
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View History Button */}
        <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="default" className="bg-purple-600 hover:bg-purple-700">
              🕰️ View History
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-lg max-w-4xl">
            <DialogHeader>
              <DialogTitle>🕰️ Opening Stock History</DialogTitle>
              <DialogDescription>
                View opening stock records by date
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
                <Input
                  type="date"
                  value={selectedHistoryDate.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedHistoryDate(new Date(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Beverage</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Recorded Opening Stock</TableHead>
                      <TableHead>Calculated Opening Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map(product => {
                      const dateKey = selectedHistoryDate.toISOString().split('T')[0];
                      const recordedStock = openingStocks.find(
                        s => s.product_id === product.id && s.date === dateKey
                      );
                      
                      const calculatedStock = calculateOpeningStock(product.id, dateKey);

                      return (
                        <TableRow key={product.id}>
                          <TableCell>{product.title}</TableCell>
                          <TableCell>{getCategoryName(product.category)}</TableCell>
                          <TableCell>{recordedStock?.quantity ?? 'Not recorded'}</TableCell>
                          <TableCell>{calculatedStock}</TableCell>
                          <TableCell>
                            {recordedStock && recordedStock.quantity !== calculatedStock 
                              ? 'Mismatch' : 'Match'}
                          </TableCell>
                          <TableCell>
                            {recordedStock && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setOpeningStockForm({
                                      id: recordedStock.id,
                                      date: recordedStock.date,
                                      product_id: String(recordedStock.product_id),
                                      quantity: String(recordedStock.quantity),
                                    });
                                    setIsOpeningStockDialogOpen(true);
                                  }}
                                >
                                  <Edit size={14} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteOpeningStock(recordedStock.id)}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Product Dialog */}
      <Dialog open={isEditingProduct} onOpenChange={setIsEditingProduct}>
        <DialogContent className="rounded-lg max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Beverage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beverage Name</label>
              <Input
                type="text"
                value={editingProduct?.title || ''}
                onChange={(e) => setEditingProduct(prev => prev ? {...prev, title: e.target.value} : null)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <Select 
                value={String(editingProduct?.category || '')}
                onValueChange={(value) => setEditingProduct(prev => prev ? {...prev, category: Number(value)} : null)}
              >
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
            </div>
            <Button onClick={handleEditProduct} disabled={loading} className="w-full">
              {loading ? 'Updating...' : 'Update Beverage'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Beverage Inventory List */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Beverage Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {products.map((product) => (
              <div key={product.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-lg">{product.title}</h3>
                    <p className="text-sm text-gray-600">{getCategoryName(product.category)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl">{availableQuantities[product.id] || 0}</p>
                    <p className="text-sm text-gray-500">in stock</p>
                  </div>
                </div>
                
                <div className="mt-4 flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setViewingTransactions(product);
                          handleProductClick(product.id);
                        }}
                        className="flex-1"
                      >
                        View Transactions
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>Transaction History for {product.title}</DialogTitle>
                        <DialogDescription>
                          Available Quantity: {availableQuantities[product.id] || 0}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="max-h-[500px] overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Reason/Source</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableHeader>
                          <TableBody>
                            {productEntries
                              .filter(entry => entry.product_id === product.id)
                              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                              .map((entry) => (
                                <TableRow key={entry.id}>
                                  <TableCell>
                                    {new Date(entry.created_at).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell>
                                    {entry.quantity > 0 ? 'Inflow' : 'Outflow'}
                                  </TableCell>
                                  <TableCell>{entry.transaction}</TableCell>
                                  <TableCell className={entry.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                                    {entry.quantity > 0 ? '+' : ''}{entry.quantity}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openEditTransaction(entry)}
                                      >
                                        <Edit size={14} />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleDeleteTransaction(entry.id)}
                                      >
                                        <Trash2 size={14} />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setOpeningStockForm({
                        id: null, // Fixed: Added the missing id property
                        date: new Date().toISOString().split('T')[0],
                        product_id: String(product.id),
                        quantity: String(availableQuantities[product.id] || '0'),
                      });
                      setIsOpeningStockDialogOpen(true);
                    }}
                    className="flex-1"
                  >
                    Record Opening
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingProduct(product);
                      setIsEditingProduct(true);
                    }}
                    className="flex-1"
                  >
                    <Edit size={14} />
                  </Button>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setProductToDelete(product.id)}
                        className="flex-1"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to delete "{product.title}"? This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button 
                          variant="destructive" 
                          onClick={handleDeleteProduct}
                          disabled={deleteLoading}
                        >
                          {deleteLoading ? 'Deleting...' : 'Delete'}
                        </Button>
                        <DialogClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Analytics Dashboard */}
      {!loading && products.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <span>📈</span>
            <span>Inventory Analytics</span>
          </h2>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inventory Levels Bar Chart */}
            <Card className="border border-gray-200 rounded-xl overflow-hidden">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="flex items-center gap-2">
                  <span>📊</span>
                  <span>Inventory Levels</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={products.map(product => ({
                        name: product.title,
                        quantity: availableQuantities[product.id] || 0,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white',
                          borderColor: '#e5e7eb',
                          borderRadius: '0.5rem',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="quantity" 
                        fill="#6366F1" 
                        radius={[4, 4, 0, 0]}
                        name="Available Quantity"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Inventory Distribution Pie Chart */}
            <Card className="border border-gray-200 rounded-xl overflow-hidden">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="flex items-center gap-2">
                  <span>🍹</span>
                  <span>Inventory Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={products.map(product => ({
                          name: product.title,
                          value: availableQuantities[product.id] || 0,
                        }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {products.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white',
                          borderColor: '#e5e7eb',
                          borderRadius: '0.5rem',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value, name, props) => [
                          `${value} units`,
                          name
                        ]}
                      />
                      <Legend 
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{ paddingTop: '20px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
