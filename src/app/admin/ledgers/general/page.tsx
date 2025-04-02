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
  const [allAmountsAvailable, setAllAmountsAvailable] = useState<any[]>([]);
  const [filter, setFilter] = useState<"daily" | "monthly" | "yearly" | "all">("all");
  const [showIncomeStatement, setShowIncomeStatement] = useState(false);
  const [incomeData, setIncomeData] = useState<any[]>([]);
  const [expenseData, setExpenseData] = useState<any[]>([]);
  const [statementFilter, setStatementFilter] = useState<"daily" | "weekly" | "monthly" | "yearly" | "custom">("monthly");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showFullAmountHistory, setShowFullAmountHistory] = useState(false);

  useEffect(() => {
    fetchGeneralLedger(filter);
    fetchAmountAvailable();
  }, [filter]);

  const fetchAmountAvailable = async () => {
    const { data, error } = await supabase
      .from("finance")
      .select("amount_available, created_at")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAllAmountsAvailable(data);
      const totalAmount = data.reduce((sum, entry) => sum + (entry.amount_available || 0), 0);
      setAmountAvailable(totalAmount);
    } else if (error) {
      console.error("Error fetching amount_available:", error);
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

    const { data: incomeData, error: incomeError } = await supabase
      .from("finance")
      .select("amount_paid, amount_available, created_at, mode_of_payment, submittedby,total_amount")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    if (incomeError) {
      alert("Error fetching income data: " + incomeError.message);
      setLoading(false);
      return;
    }

    const { data: expenseData, error: expenseError } = await supabase
      .from("expenses")
      .select("item, amount_spent, date, department, submittedby")
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
    // Calculate total income as sum of all amount_paid entries
    const totalIncome = incomeData.reduce((sum, item) => sum + (item.total_amount || 0), 0);
    
    // Calculate total profit as sum of all amount_available entries
    const totalProfit = incomeData.reduce((sum, item) => sum + (item.amount_available || 0), 0);
    
    // Calculate total expenses directly from expenseData
    const totalExpenses = expenseData.reduce((sum, item) => sum + (item.amount_spent || 0), 0);
    
    // Calculate potential loss (only where total_amount exists and is greater than amount_paid)
    const lossEntries = ledger.filter(entry => 
      entry.total_amount !== null && 
      entry.total_amount !== undefined &&
      (entry.total_amount || 0) > (entry.amount_paid || 0)
    );
    
    const totalPotentialLoss = lossEntries.reduce((sum, entry) => {
      return sum + ((entry.total_amount || 0) - (entry.amount_paid || 0));
    }, 0);
    
    // Net profit calculation (amount_available minus expenses)
    const netProfit = totalProfit - totalExpenses;
    
    return { 
      totalIncome,
      totalProfit,
      totalExpenses,
      totalPotentialLoss,
      netProfit: netProfit > 0 ? netProfit : 0,
      netLoss: netProfit < 0 ? Math.abs(netProfit) : 0
    };
  };

  const exportIncomeStatementToCSV = () => {
    const { 
      totalIncome, 
      totalProfit, 
      totalExpenses, 
      totalPotentialLoss,
      netProfit,
      netLoss 
    } = calculateProfitLoss();
    
    const incomeRows = incomeData.map((item) => ({
      "Type": "Income",
      "Description": `Payment via ${item.mode_of_payment}`,
      "Amount Paid": item.amount_paid,
      "Amount Available": item.amount_available,
      "Date": new Date(item.created_at).toLocaleDateString(),
      "Submitted By": item.submittedby
    }));

    const expenseRows = expenseData.map((item) => ({
      "Type": "Expense",
      "Description": item.item,
      "Amount": -item.amount_spent,
      "Date": new Date(item.date).toLocaleDateString(),
      "Department": item.department,
      "Issued By": item.submittedby
    }));

    const lossRows = ledger
      .filter(entry => 
        entry.total_amount !== null && 
        entry.total_amount !== undefined &&
        (entry.total_amount || 0) > (entry.amount_paid || 0)
      )
      .map(entry => ({
        "Type": "Potential Loss",
        "Description": `Order ${entry.order_id}`,
        "Amount": -((entry.total_amount || 0) - (entry.amount_paid || 0)),
        "Date": new Date(entry.created_at).toLocaleDateString(),
        "Submitted By": entry.users?.name || "Unknown"
      }));

    const summaryRows = [
      { "Type": "SUMMARY", "Description": "Total Income (Amount Paid)", "Amount": totalIncome, "Date": "", "Department": "" },
      { "Type": "SUMMARY", "Description": "Total Profit (Amount Available)", "Amount": totalProfit, "Date": "", "Department": "" },
      { "Type": "SUMMARY", "Description": "Total Expenses", "Amount": -totalExpenses, "Date": "", "Department": "" },
      { "Type": "SUMMARY", "Description": "Total Potential Loss", "Amount": -totalPotentialLoss, "Date": "", "Department": "" },
      { "Type": "SUMMARY", "Description": "Net Profit", "Amount": totalProfit > 0 ? totalProfit : "", "Date": "", "Department": "" },
      { "Type": "SUMMARY", "Description": "Net Loss", "Amount": netLoss > 0 ? -netLoss : "", "Date": "", "Department": "" }
    ];

    const csvData = [...incomeRows, ...expenseRows, ...lossRows, ...summaryRows];
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-white text-center mb-6">
        <div className="p-4 bg-green-500 rounded-lg">
          <h2 className="text-xl font-semibold">Total Revenue</h2>
          <p className="text-2xl">UGX {totalRevenue.toLocaleString()}</p>
          <h6 className="text-sm font-medium text-gray-700 italic">Total sum of all orders made</h6>
        </div>
        <div className="p-4 bg-blue-500 rounded-lg">
          <h2 className="text-xl font-semibold">Total Payments</h2>
          <p className="text-2xl">UGX {totalPayments.toLocaleString()}</p>
          <h6 className="text-sm font-medium text-gray-700 italic">Total payments made so far</h6>
        </div>
        <div className="p-4 bg-red-500 rounded-lg">
          <h2 className="text-xl font-semibold">Outstanding Balance</h2>
          <p className="text-2xl">UGX {outstandingBalance.toLocaleString()}</p>
          <h6 className="text-sm font-medium text-gray-700 italic">Amount not submitted</h6>
        </div>
        <div className="p-4 bg-purple-500 rounded-lg">
          <h2 className="text-xl font-semibold">Total Amount Available</h2>
          <p className="text-2xl">UGX {amountAvailable.toLocaleString()}</p>
          <h6 className="text-sm font-medium text-gray-700 italic">
            Includes order payments and all other deposits (Accounts receivable)
          </h6>
        </div>
      </div>

      {allAmountsAvailable.length > 0 && (
        <div className="mb-6 bg-gray-50 p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">Amount Available History</h3>
            {allAmountsAvailable.length > 3 && (
              <button 
                onClick={() => setShowFullAmountHistory(true)}
                className="text-blue-500 hover:underline"
              >
                View More
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-right">Amount (UGX)</th>
                </tr>
              </thead>
              <tbody>
                {allAmountsAvailable.slice(0, 3).map((entry, index) => (
                  <tr 
                    key={`amount-${index}`} 
                    className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <td className="p-3">{new Date(entry.created_at).toLocaleDateString()}</td>
                    <td className="p-3 text-right font-mono">
                      {entry.amount_available?.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="overflow-x-auto shadow-lg rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="p-3 text-left">Marketer Name</th>
                <th className="p-3 text-right">Total Amount</th>
                <th className="p-3 text-right">Amount Paid</th>
                <th className="p-3 text-right">Balance</th>
                <th className="p-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((entry) => (
                <tr key={entry.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{entry.users?.name || "Unknown"}</td>
                  <td className="p-3 text-right font-mono">UGX {entry.total_amount?.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono">UGX {entry.amount_paid?.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono">UGX {entry.balance?.toLocaleString()}</td>
                  <td className="p-3">{new Date(entry.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showIncomeStatement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-auto shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Income Statement</h2>
              <div className="flex gap-2">
                <button
                  onClick={exportIncomeStatementToCSV}
                  className="bg-green-500 text-white p-2 rounded hover:bg-green-600"
                >
                  Download
                </button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 mb-6 items-center">
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
                <div className="flex gap-2 items-center">
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
                className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
              >
                Apply Filter
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h3 className="font-semibold text-blue-800">Total Income (Amount expected from orders made)</h3>
                <p className="text-xl font-mono">UGX {calculateProfitLoss().totalIncome.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <h3 className="font-semibold text-green-800">Total Profit (Amount Available)</h3>
                <p className="text-xl font-mono">UGX {calculateProfitLoss().totalProfit.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                <h3 className="font-semibold text-red-800">Total Expenses</h3>
                <p className="text-xl font-mono">UGX {calculateProfitLoss().totalExpenses.toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className={`p-4 rounded-lg border ${
                calculateProfitLoss().netProfit > 0 
                  ? "bg-green-50 border-green-100" 
                  : "bg-gray-50 border-gray-100"
              }`}>
                <h3 className="font-semibold text-green-800">Net Profit</h3>
                <p className="text-xl font-mono">
                  {calculateProfitLoss().totalProfit > 0 
                    ? `UGX ${calculateProfitLoss().totalProfit.toLocaleString()}`
                    : "N/A"}
                </p>
              </div>
              <div className={`p-4 rounded-lg border ${
                calculateProfitLoss().netLoss > 0 
                  ? "bg-red-50 border-red-100" 
                  : "bg-gray-50 border-gray-100"
              }`}>
                <h3 className="font-semibold text-red-800">Net Loss</h3>
                <p className="text-xl font-mono">
                  {calculateProfitLoss().netLoss > 0 
                    ? `UGX ${calculateProfitLoss().netLoss.toLocaleString()}`
                    : "N/A"}
                </p>
              </div>
            </div>

            {/* Potential Loss Section */}
            {calculateProfitLoss().totalPotentialLoss > 0 && (
              <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-100">
                <h3 className="font-semibold text-orange-800 mb-2">Potential Loss (Unpaid Balances)</h3>
                <p className="text-xl font-mono">UGX {calculateProfitLoss().totalPotentialLoss.toLocaleString()}</p>
                <p className="text-sm text-orange-600 mt-1">
                  This represents unpaid balances from orders taken!
                </p>
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3 text-blue-700">Income</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-blue-100">
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-left">Payment Mode</th>
                      <th className="p-3 text-right">Amount Paid</th>
                      <th className="p-3 text-right">Amount Available</th>
                      <th className="p-3 text-left">Submitted By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeData.map((item, index) => (
                      <tr key={`income-${index}`} className="border-b hover:bg-blue-50">
                        <td className="p-3">{new Date(item.created_at).toLocaleDateString()}</td>
                        <td className="p-3">{item.mode_of_payment}</td>
                        <td className="p-3 text-right font-mono">UGX {item.amount_paid?.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono">UGX {item.amount_available?.toLocaleString()}</td>
                        <td className="p-3">{item.submittedby}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-red-700">Expenses</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-red-100">
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-left">Item</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-left">Department</th>
                      <th className="p-3 text-left">Issued By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseData.map((item, index) => (
                      <tr key={`expense-${index}`} className="border-b hover:bg-red-50">
                        <td className="p-3">{new Date(item.date).toLocaleDateString()}</td>
                        <td className="p-3">{item.item}</td>
                        <td className="p-3 text-right font-mono">UGX {item.amount_spent?.toLocaleString()}</td>
                        <td className="p-3">{item.department}</td>
                        <td className="p-3">{item.submittedby}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowIncomeStatement(false)}
                className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showFullAmountHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-auto shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Full Amount Available History</h2>
              <button
                onClick={() => setShowFullAmountHistory(false)}
                className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
              >
                Close
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-right">Amount (UGX)</th>
                  </tr>
                </thead>
                <tbody>
                  {allAmountsAvailable.map((entry, index) => (
                    <tr 
                      key={`full-amount-${index}`} 
                      className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="p-3">{new Date(entry.created_at).toLocaleDateString()}</td>
                      <td className="p-3 text-right font-mono">
                        {entry.amount_available?.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
