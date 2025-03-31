"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { saveAs } from "file-saver";

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
  const [amountAvailable, setAmountAvailable] = useState(0);
  const [filter, setFilter] = useState<"daily" | "monthly" | "yearly" | "all">("all");
  const [showIncomeStatement, setShowIncomeStatement] = useState(false);
  const [incomeData, setIncomeData] = useState<any[]>([]);
  const [expenseData, setExpenseData] = useState<any[]>([]);
  const [statementFilter, setStatementFilter] = useState<"daily" | "weekly" | "monthly" | "yearly" | "custom">("monthly");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  useEffect(() => {
    fetchGeneralLedger(filter);
    fetchAmountAvailable();
  }, [filter]);

  const fetchAmountAvailable = async () => {
    const { data, error } = await supabase
      .from("finance")
      .select("amount_available")
      .order("created_at", { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      setAmountAvailable(data[0].amount_available || 0);
    }
  };

  const fetchGeneralLedger = async (filterType: "daily" | "monthly" | "yearly" | "all") => {
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

  const fetchIncomeStatementData = async () => {
    setLoading(true);
    
    // Calculate date range based on filter
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (statementFilter) {
      case "daily":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "weekly":
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        endDate = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        break;
      case "monthly":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case "yearly":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case "custom":
        if (!customStartDate || !customEndDate) {
          alert("Please select both start and end dates");
          setLoading(false);
          return;
        }
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Fetch income data
    const { data: incomeData, error: incomeError } = await supabase
      .from("finance")
      .select("amount_paid, created_at, mode_of_payment, submittedby")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    if (incomeError) {
      alert("Error fetching income data: " + incomeError.message);
      setLoading(false);
      return;
    }

    // Fetch expense data
    const { data: expenseData, error: expenseError } = await supabase
      .from("expenses")
      .select("item, amount_spent, date, department")
      .gte("date", startDate.toISOString())
      .lte("date", endDate.toISOString());

    if (expenseError) {
      alert("Error fetching expense data: " + expenseError.message);
      setLoading(false);
      return;
    }

    setIncomeData(incomeData || []);
    setExpenseData(expenseData || []);
    setLoading(false);
  };

  const calculateProfitLoss = () => {
    const totalIncome = incomeData.reduce((sum, item) => sum + (item.amount_paid || 0), 0);
    const totalExpenses = expenseData.reduce((sum, item) => sum + (item.amount_spent || 0), 0);
    
    const profit = amountAvailable - totalExpenses;
    const loss = (totalRevenue - totalIncome) + totalExpenses;

    return { profit, loss, totalIncome, totalExpenses };
  };

  const exportIncomeStatementToCSV = () => {
    const { profit, loss, totalIncome, totalExpenses } = calculateProfitLoss();
    
    const incomeRows = incomeData.map((item) => ({
      "Type": "Income",
      "Description": `Payment via ${item.mode_of_payment}`,
      "Amount": item.amount_paid,
      "Date": new Date(item.created_at).toLocaleDateString(),
      "Submitted By": item.submittedby
    }));

    const expenseRows = expenseData.map((item) => ({
      "Type": "Expense",
      "Description": item.item,
      "Amount": -item.amount_spent, // Negative for expenses
      "Date": new Date(item.date).toLocaleDateString(),
      "Department": item.department
    }));

    const summaryRows = [
      { "Type": "SUMMARY", "Description": "Total Income", "Amount": totalIncome, "Date": "", "Department": "" },
      { "Type": "SUMMARY", "Description": "Total Expenses", "Amount": -totalExpenses, "Date": "", "Department": "" },
      { "Type": "SUMMARY", "Description": "Profit", "Amount": profit > 0 ? profit : "", "Date": "", "Department": "" },
      { "Type": "SUMMARY", "Description": "Loss", "Amount": loss > 0 ? -loss : "", "Date": "", "Department": "" }
    ];

    const csvData = [...incomeRows, ...expenseRows, ...summaryRows];
    const csvHeaders = Object.keys(csvData[0]).join(",") + "\n";
    const csvRows = csvData.map((row) => Object.values(row).join(",")).join("\n");

    const csvBlob = new Blob([csvHeaders + csvRows], { type: "text/csv;charset=utf-8" });
    saveAs(csvBlob, `income_statement_${new Date().toISOString().split('T')[0]}.csv`);
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
    const csvRows = csvData.map((row) => Object.values(row).join(",")).join("\n");

    const csvBlob = new Blob([csvHeaders + csvRows], { type: "text/csv;charset=utf-8" });
    saveAs(csvBlob, "general_ledger.csv");
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-center shadow-lg p-4 rounded-lg bg-blue-100 dark:bg-gray-800 dark:text-white">
        General Ledger
      </h1>

      {/* Financial Summary - Now with 4 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-white text-center mb-6">
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
        <div className="p-4 bg-purple-500 rounded-lg">
          <h2 className="text-xl font-semibold">Amount Available</h2>
          <p className="text-2xl">UGX {amountAvailable.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters and Export Buttons */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <div className="flex gap-2 flex-wrap">
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
          <button
            onClick={() => {
              setShowIncomeStatement(true);
              fetchIncomeStatementData();
            }}
            className="bg-orange-500 text-white p-2 rounded ml-2"
          >
            Income Statement
          </button>
        </div>
        <button
          onClick={exportToCSV}
          className="bg-green-500 text-white p-2 rounded"
        >
          Download Ledger
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
                <td className="border p-2">UGX {entry.total_amount?.toLocaleString()}</td>
                <td className="border p-2">UGX {entry.amount_paid?.toLocaleString()}</td>
                <td className="border p-2">UGX {entry.balance?.toLocaleString()}</td>
                <td className="border p-2">{new Date(entry.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Income Statement Dialog */}
      {showIncomeStatement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-auto">
            <h2 className="text-2xl font-bold mb-4">Income Statement</h2>
            
            {/* Income Statement Filters */}
            <div className="flex flex-wrap gap-4 mb-4 items-center">
              <select
                value={statementFilter}
                onChange={(e) => setStatementFilter(e.target.value as any)}
                className="p-2 border rounded"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="custom">Custom Range</option>
              </select>

              {statementFilter === "custom" && (
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="p-2 border rounded"
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="p-2 border rounded"
                  />
                </div>
              )}

              <button
                onClick={fetchIncomeStatementData}
                className="bg-blue-500 text-white p-2 rounded"
              >
                Apply Filter
              </button>

              <button
                onClick={exportIncomeStatementToCSV}
                className="bg-green-500 text-white p-2 rounded ml-auto"
              >
                Download Statement
              </button>
            </div>

            {/* Income Statement Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-3 bg-blue-100 rounded-lg">
                <h3 className="font-semibold">Total Income</h3>
                <p className="text-xl">UGX {calculateProfitLoss().totalIncome.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <h3 className="font-semibold">Total Expenses</h3>
                <p className="text-xl">UGX {calculateProfitLoss().totalExpenses.toLocaleString()}</p>
              </div>
              <div className={`p-3 rounded-lg ${
                calculateProfitLoss().profit > 0 ? "bg-green-100" : "bg-red-100"
              }`}>
                <h3 className="font-semibold">
                  {calculateProfitLoss().profit > 0 ? "Profit" : "Loss"}
                </h3>
                <p className="text-xl">
                  UGX {Math.abs(
                    calculateProfitLoss().profit > 0 
                      ? calculateProfitLoss().profit 
                      : calculateProfitLoss().loss
                  ).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Income Statement Tables */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Income</h3>
              <table className="w-full border-collapse border mb-4">
                <thead>
                  <tr>
                    <th className="border p-2">Date</th>
                    <th className="border p-2">Payment Mode</th>
                    <th className="border p-2">Amount</th>
                    <th className="border p-2">Submitted By</th>
                  </tr>
                </thead>
                <tbody>
                  {incomeData.map((item, index) => (
                    <tr key={`income-${index}`}>
                      <td className="border p-2">{new Date(item.created_at).toLocaleDateString()}</td>
                      <td className="border p-2">{item.mode_of_payment}</td>
                      <td className="border p-2">UGX {item.amount_paid?.toLocaleString()}</td>
                      <td className="border p-2">{item.submittedby}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Expenses</h3>
              <table className="w-full border-collapse border">
                <thead>
                  <tr>
                    <th className="border p-2">Date</th>
                    <th className="border p-2">Item</th>
                    <th className="border p-2">Amount</th>
                    <th className="border p-2">Department</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseData.map((item, index) => (
                    <tr key={`expense-${index}`}>
                      <td className="border p-2">{new Date(item.date).toLocaleDateString()}</td>
                      <td className="border p-2">{item.item}</td>
                      <td className="border p-2">UGX {item.amount_spent?.toLocaleString()}</td>
                      <td className="border p-2">{item.department}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => setShowIncomeStatement(false)}
              className="bg-red-500 text-white p-2 rounded float-right"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
