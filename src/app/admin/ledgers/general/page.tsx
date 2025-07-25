"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CashFlowLedgerPage() {
  const [cashFlowData, setCashFlowData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"daily" | "monthly" | "yearly" | "all">("all");
  const [users, setUsers] = useState<Record<string, string>>({});

  // Fetch all users to map user IDs to names
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name");
      
      if (error) throw error;

      const usersMap = data.reduce((acc, user) => {
        acc[user.id] = user.name;
        return acc;
      }, {} as Record<string, string>);

      setUsers(usersMap);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // Fetch and combine data from finance and expenses tables
  const fetchCashFlowData = async (filterType: "daily" | "monthly" | "yearly" | "all") => {
    setLoading(true);
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    switch (filterType) {
      case "daily":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "monthly":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case "yearly":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      default:
        startDate = null;
        endDate = null;
        break;
    }

    try {
      // Fetch inflows from finance table
      let inflowsQuery = supabase
        .from("finance")
        .select(`
          id,
          amount_paid,
          purpose,
          created_at,
          user_id
        `);

      if (startDate && endDate) {
        inflowsQuery = inflowsQuery
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());
      }

      const { data: inflows, error: inflowsError } = await inflowsQuery;

      if (inflowsError) throw inflowsError;

      // Fetch outflows from expenses table
      let outflowsQuery = supabase
        .from("expenses")
        .select(`
          id,
          amount_spent,
          item,
          date,
          department
        `);

      if (startDate && endDate) {
        outflowsQuery = outflowsQuery
          .gte("date", startDate.toISOString())
          .lte("date", endDate.toISOString());
      }

      const { data: outflows, error: outflowsError } = await outflowsQuery;

      if (outflowsError) throw outflowsError;

      // Transform and combine data
      const transformedInflows = (inflows || []).map(item => ({
        id: item.id,
        date: item.created_at,
        name: users[item.user_id] || "Unknown",
        reason: item.purpose || "N/A",
        inflow: item.amount_paid,
        outflow: null,
        type: "inflow"
      }));

      const transformedOutflows = (outflows || []).map(item => ({
        id: item.id,
        date: item.date,
        name: item.department || "N/A",
        reason: item.item || "N/A",
        inflow: null,
        outflow: item.amount_spent,
        type: "outflow"
      }));

      // Combine and sort by date
      const combinedData = [...transformedInflows, ...transformedOutflows].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Calculate running balance
      let balance = 0;
      const dataWithBalance = combinedData.map(item => {
        if (item.type === "inflow") {
          balance += item.inflow || 0;
        } else {
          balance -= item.outflow || 0;
        }
        return { ...item, balance };
      });

      setCashFlowData(dataWithBalance);
    } catch (error) {
      console.error("Error fetching cash flow data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (Object.keys(users).length > 0) {
      fetchCashFlowData(filter);
    }
  }, [filter, users]);

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Cash Flow Ledger
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Track all cash inflows and outflows with running balance
        </p>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Select onValueChange={(value) => setFilter(value as any)} value={filter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="daily">Today</SelectItem>
            <SelectItem value="monthly">This Month</SelectItem>
            <SelectItem value="yearly">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cash Flow Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-semibold text-gray-700">Date & Time</TableHead>
              <TableHead className="font-semibold text-gray-700">Name</TableHead>
              <TableHead className="font-semibold text-gray-700">Reason</TableHead>
              <TableHead className="font-semibold text-gray-700 text-right">Inflow (Debit)</TableHead>
              <TableHead className="font-semibold text-gray-700 text-right">Outflow (Credit)</TableHead>
              <TableHead className="font-semibold text-gray-700 text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : cashFlowData.length > 0 ? (
              cashFlowData.map((entry) => (
                <TableRow key={`${entry.type}-${entry.id}`} className="hover:bg-gray-50">
                  <TableCell>{formatDate(entry.date)}</TableCell>
                  <TableCell>{entry.name}</TableCell>
                  <TableCell>{entry.reason}</TableCell>
                  <TableCell className="text-right font-mono text-green-600">
                    {entry.inflow ? formatCurrency(entry.inflow) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-red-600">
                    {entry.outflow ? formatCurrency(entry.outflow) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <Badge variant={entry.balance >= 0 ? "default" : "destructive"}>
                      {formatCurrency(entry.balance)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No cash flow records found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary Cards */}
      {cashFlowData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-green-600">Total Inflows</h3>
            <p className="text-xl font-mono font-bold">
              {formatCurrency(
                cashFlowData.reduce((sum, entry) => sum + (entry.inflow || 0), 0)
              )}
            </p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-red-600">Total Outflows</h3>
            <p className="text-xl font-mono font-bold">
              {formatCurrency(
                cashFlowData.reduce((sum, entry) => sum + (entry.outflow || 0), 0)
              )}
            </p>
          </div>
          <div className={`border rounded-lg p-4 ${
            cashFlowData[cashFlowData.length - 1]?.balance >= 0 
              ? "bg-blue-50 border-blue-200" 
              : "bg-orange-50 border-orange-200"
          }`}>
            <h3 className="text-sm font-medium">
              Current Balance
            </h3>
            <p className="text-xl font-mono font-bold">
              {formatCurrency(cashFlowData[cashFlowData.length - 1]?.balance || 0)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
