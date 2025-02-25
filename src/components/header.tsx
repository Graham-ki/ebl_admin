'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CircleUser, Menu, Moon, Package2, Search, Sun } from 'lucide-react';
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { createClient } from '@/supabase/client';
import { debounce } from 'lodash'; // Import debounce utility

const NAV_LINKS = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/stock', label: 'Stock' },
  { href: '/admin/users', label: 'Marketers' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/ledgers', label: 'Finances' },
];

export const Header = () => {
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const router = useRouter();
  const supabase = createClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Handle search input change
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    performSearch(query); // Trigger debounced search
  };

  // Debounced search function
  const performSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setLoading(true);

      // Perform search across multiple tables
      const searchPromises = [
        supabase
          .from('product')
          .select('*')
          .ilike('title', `%${query}%`), // Search in product table
        supabase
          .from('products_materials')
          .select('*')
          .ilike('product_id', `%${query}%`), // Search in products_materials table
        supabase
          .from('order')
          .select('*')
          .ilike('slug', `%${query}%`), // Search in order table
        supabase
          .from('materials')
          .select('*')
          .ilike('name', `%${query}%`), // Search in materials table
        supabase
          .from('expenses')
          .select('*')
          .ilike('item', `%${query}%`), // Search in expenses table
        supabase
          .from('users')
          .select('*')
          .ilike('name', `%${query}%`), // Search in users table
        supabase
          .from('finance')
          .select('*')
          .or(`mode_of_payment.ilike.%${query}%,mode_of_mobilemoney.ilike.%${query}%,bank_name.ilike.%${query}%`), // Search in user_ledger table
      ];

      try {
        const results = await Promise.all(searchPromises);
        const combinedResults = results.flatMap((result, index) => {
          const tableNames = [
            'product',
            'products_materials',
            'order',
            'materials',
            'expenses',
            'users',
            'finance',
          ];
          return (result.data || []).map((item) => ({
            ...item,
            table: tableNames[index], // Add table name to each result
          }));
        });
        setSearchResults(combinedResults);
      } catch (error) {
        console.error('Error searching:', error);
      } finally {
        setLoading(false);
      }
    }, 300), // Debounce delay of 300ms
    [supabase]
  );

  // Handle result click
  const handleResultClick = (result: any) => {
    if (result.table === 'user_ledger') {
      // Navigate to the user_ledger details page
      router.push(`/admin/search/user_ledger/${result.id}`);
    } else {
      // Navigate to the search result page for other tables
      router.push(`/admin/search/${result.table}/${result.id}`);
    }
    setSearchQuery(''); // Clear search query
    setSearchResults([]); // Clear search results
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 shadow-lg md:px-6">
      <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold md:text-base"
        >
          <Package2 className="h-6 w-6" />
        </Link>
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'rounded-lg px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-md bg-white dark:bg-gray-800 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors',
              {
                'bg-gray-300 dark:bg-gray-700 shadow-lg font-bold': pathname === href,
              }
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-semibold"
            >
              <Package2 className="h-6 w-6" />
            </Link>
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'block rounded-lg px-3 py-2 border shadow-md transition-colors',
                  'border-gray-300 bg-white text-black hover:bg-gray-200',
                  'dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700',
                  pathname === href &&
                    'bg-blue-500 text-white border-blue-600 shadow-lg dark:bg-blue-600 dark:border-blue-700 dark:text-gray-200',
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
      <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <form className="ml-auto flex-1 sm:flex-initial">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search anything..."
              className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
              value={searchQuery}
              onChange={handleSearchInputChange}
            />
          </div>
        </form>
        {/* Display search results */}
        {searchQuery && (
          <div className="absolute top-16 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg rounded-lg mx-4 z-20">
            <div className="p-4">
              {loading ? (
                <p>Loading...</p>
              ) : searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => handleResultClick(result)}
                  >
                    <p className="text-black dark:text-white">
                      {result.title || result.material_name || result.slug || result.name || result.item || result.email || result.mode_of_payment || result.mode_of_mobilemoney || result.bank_name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {result.table}
                    </p>
                    {result.table === 'finance' && (
                      <>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Amount: UGX {result.amount_paid}
                        </p>
                        {result.mode_of_payment === 'Bank' && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Bank Name: {result.bank_name}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                ))
              ) : (
                <p>No results found.</p>
              )}
            </div>
          </div>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="rounded-full">
              <CircleUser className="h-5 w-5" />
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
            <DropdownMenuItem asChild>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="w-full" variant="outline" size="icon">
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme('light')}>
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('dark')}>
                    Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('system')}>
                    System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};