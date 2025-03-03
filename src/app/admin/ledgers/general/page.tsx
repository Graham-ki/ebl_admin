"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { saveAs } from "file-saver"; // For CSV export

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function GeneralLedgerPage() {
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPayments, setTotalPayments] = useState(0);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [filter, setFilter] = useState<"daily" | "monthly" | "yearly" | "all">("all"); // Filter state

  useEffect(() => {
    fetchGeneralLedger(filter);
  }, [filter]);

  const fetchGeneralLedger = async (filterType: "daily" | "monthly" | "yearly" | "all") => {
    setLoading(true);

    // Calculate date range based on filter
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

    // Build the query
    let query = supabase
      .from("finance")
      .select(`
        id,
        order_id,
        total_amount,
        amount_paid,
        amount_available,
        balance,
        created_at,
        users (
          name
        )
      `).not("order_id", "is", null);

    // Apply date filter if applicable
    if (startDate && endDate) {
      query = query.gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      alert("Error fetching general ledger: " + error.message);
      setLoading(false);
      return;
    }

    setLedger(data || []);
    calculateFinancials(data || []);
    setLoading(false);
  };

  const calculateFinancials = (data: any[]) => {
    let totalRevenue = 0;
    let totalPayments = 0;
    let outstandingBalance = 0;

    data.forEach((entry) => {
      totalRevenue += entry.total_amount || 0;
      totalPayments += entry.amount_paid || 0;
      outstandingBalance += entry.balance || 0;
    });

    setTotalRevenue(totalRevenue);
    setTotalPayments(totalPayments);
    setOutstandingBalance(outstandingBalance);
  };

  const exportToCSV = () => {
    const csvData = ledger.map((entry) => ({
      "Marketer Name": entry.users?.name || "Unknown",
      "Total Order Amount": entry.total_amount,
      "Amount Paid": entry.amount_paid,
      "Balance": entry.balance,
      "Date": new Date(entry.created_at).toLocaleDateString(),
    }));

    const csvHeaders = Object.keys(csvData[0]).join(",") + "\n";
    const csvRows = csvData
      .map((row) => Object.values(row).join(","))
      .join("\n");

    const csvBlob = new Blob([csvHeaders + csvRows], { type: "text/csv;charset=utf-8" });
    saveAs(csvBlob, "general_ledger.csv");
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-center shadow-lg p-4 rounded-lg bg-blue-100 dark:bg-gray-800 dark:text-white">
        General Ledger
      </h1>

      {/* Financial Summary */}
      <div className="grid grid-cols-3 gap-4 text-white text-center mb-6">
        <div className="p-4 bg-green-500 rounded-lg">
          <h2 className="text-xl font-semibold">Total Revenue</h2>
          <p className="text-2xl">UGX {totalRevenue.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-blue-500 rounded-lg">
          <h2 className="text-xl font-semibold">Total Payments</h2>
          <p className="text-2xl">UGX {totalPayments.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-red-500 rounded-lg">
          <h2 className="text-xl font-semibold">Outstanding Balance</h2>
          <p className="text-2xl">UGX {outstandingBalance.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters and Export Button */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`p-2 rounded ${filter === "all" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("daily")}
            className={`p-2 rounded ${filter === "daily" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          >
            Daily
          </button>
          <button
            onClick={() => setFilter("monthly")}
            className={`p-2 rounded ${filter === "monthly" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setFilter("yearly")}
            className={`p-2 rounded ${filter === "yearly" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          >
            Yearly
          </button>
        </div>
        <button
          onClick={exportToCSV}
          className="bg-green-500 text-white p-2 rounded"
        >
          Download
        </button>
      </div>

      {/* Ledger Table */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full border-collapse border mt-4">
          <thead>
            <tr>
              <th className="border p-2">Marketer Name</th>
              <th className="border p-2">Total Order Amount</th>
              <th className="border p-2">Amount Paid</th>
              <th className="border p-2">Balance</th>
              <th className="border p-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((entry) => (
              <tr key={entry.id}>
                <td className="border p-2">{entry.users?.name || "Unknown"}</td>
                <td className="border p-2">UGX {entry.total_amount}</td>
                <td className="border p-2">UGX {entry.amount_paid}</td>
                <td className="border p-2">UGX {entry.balance}</td>
                <td className="border p-2">{new Date(entry.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}