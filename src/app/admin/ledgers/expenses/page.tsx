'use client';
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { sub } from "date-fns";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Predefined expense categories
const EXPENSE_CATEGORIES = [
  "Labour",
  "Salary",
  "Wage",
  "Repairs",
  "Stock",
  "Allowance",
  "Utility/Welfare",
  "Other"
];

export default function ExpensesLedgerPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [balanceForward, setBalanceForward] = useState(0);
  const [filter, setFilter] = useState<"daily" | "monthly" | "yearly" | "all">("all");
  const [formData, setFormData] = useState({
    item: "",
    customItem: "",
    amount_spent: 0,
    department: "",
    mode_of_payment: "",
    account: "",
  });
  const [editExpense, setEditExpense] = useState<any>(null);
  const [modes, setModes] = useState<string[]>([]);
  const [subModes, setSubModes] = useState<string[]>([]);
  const [existingItems, setExistingItems] = useState<string[]>([]);
  const [showNotice, setShowNotice] = useState(true);

  useEffect(() => {
    fetchExpenses(filter);
    fetchTotalIncome();
    fetchModes();
    fetchBalanceForward();
    fetchExistingItems();
  }, [filter]);

  const fetchExistingItems = async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("item");
    
    if (error) {
      console.error("Error fetching existing items:", error);
      return;
    }
    
    const uniqueItems = Array.from(new Set(data.map(item => item.item)));
    setExistingItems(uniqueItems);
  };

  const fetchBalanceForward = async () => {
    // Get total amount available
    const { data: financeData, error: financeError } = await supabase
      .from("finance")
      .select("amount_available");

    if (financeError) {
      alert("Error fetching finance data: " + financeError.message);
      return;
    }

    const totalAmountAvailable = financeData.reduce((sum, entry) => sum + (entry.amount_available || 0), 0);

    // Get total expenses
    const { data: expensesData, error: expensesError } = await supabase
      .from("expenses")
      .select("amount_spent");

    if (expensesError) {
      alert("Error fetching expenses: " + expensesError.message);
      return;
    }

    const totalExpenses = expensesData.reduce((sum, entry) => sum + (entry.amount_spent || 0), 0);

    // Calculate balance forward
    const balance = totalAmountAvailable - totalExpenses;
    setBalanceForward(balance);
  };

  const fetchModes = async () => {
    const { data, error } = await supabase
      .from("finance")
      .select("mode_of_payment");

    if (error) {
      alert("Error fetching modes of payment: " + error.message);
      return;
    }

    const uniqueModes = Array.from(new Set(data.map((entry) => entry.mode_of_payment)));
    setModes(uniqueModes);
  };

  const fetchSubModes = async (mode: string) => {
    if (mode === "cash") {
      setSubModes([]);
      return;
    }

    const { data, error } = await supabase
      .from("finance")
      .select(mode === "Bank" ? "bank_name" : "mode_of_mobilemoney")
      .eq("mode_of_payment", mode) as { data: { bank_name?: string; mode_of_mobilemoney?: string }[], error: any };

    if (error) {
      alert("Error fetching submodes: " + error.message);
      return;
    }

    const uniqueSubModes = Array.from(
      new Set(data.map((entry) => (mode === "Bank" ? entry.bank_name : entry.mode_of_mobilemoney))
    ).filter((subMode): subMode is string => !!subMode);

    setSubModes(uniqueSubModes);
  };

  const fetchExpenses = async (filterType: "daily" | "monthly" | "yearly" | "all") => {
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

    let query = supabase.from("expenses").select("*").order('date',{ascending:false});

    if (startDate && endDate) {
      query = query.gte("date", startDate.toISOString()).lte("date", endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      alert("Error fetching expenses: " + error.message);
      setLoading(false);
      return;
    }

    setExpenses(data || []);
    calculateTotalExpenses(data || []);
    setLoading(false);
  };

  const fetchTotalIncome = async () => {
    const { data, error } = await supabase
      .from("finance")
      .select("amount_paid");

    if (error) {
      alert("Error fetching total income: " + error.message);
      return;
    }

    const total = data.reduce((sum, entry) => sum + (entry.amount_paid || 0), 0);
    setTotalIncome(total);
  };

  const calculateTotalExpenses = (data: any[]) => {
    const total = data.reduce((sum, entry) => sum + (entry.amount_spent || 0), 0);
    setTotalExpenses(total);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === "mode_of_payment") {
      fetchSubModes(value);
      setFormData((prev) => ({ ...prev, account: "" }));
    }

    // Reset customItem when selecting a non-"Other" category
    if (name === "item" && value !== "Other") {
      setFormData(prev => ({ ...prev, customItem: "" }));
    }
  };

  const submitExpense = async () => {
    // Determine the final item name (use customItem if "Other" was selected)
    const finalItem = formData.item === "Other" ? formData.customItem : formData.item;
    
    if (!finalItem || !formData.amount_spent || !formData.department || !formData.mode_of_payment) {
      alert("Please fill in all required fields.");
      return;
    }

    const expenseData = {
      item: finalItem,
      amount_spent: formData.amount_spent,
      department: formData.department,
      mode_of_payment: formData.mode_of_payment,
      account: formData.account,
      submittedby: "You",
    };

    const { data, error } = editExpense
      ? await supabase
          .from("expenses")
          .update(expenseData)
          .eq("id", editExpense.id)
      : await supabase.from("expenses").insert([expenseData]);

    if (error) {
      alert("Error submitting expense: " + error.message);
      return;
    }

    alert("Expense successfully submitted!");
    fetchExpenses(filter);
    fetchBalanceForward();
    fetchExistingItems(); // Refresh the items list
    setFormData({ 
      item: "", 
      customItem: "", 
      amount_spent: 0, 
      department: "", 
      mode_of_payment: "", 
      account: "" 
    });
    setEditExpense(null);
  };

  const handleEdit = (expense: any) => {
    setEditExpense(expense);
    // Check if the expense item is in our existing items or predefined categories
    const isExistingItem = existingItems.includes(expense.item) || EXPENSE_CATEGORIES.includes(expense.item);
    setFormData({
      item: isExistingItem ? expense.item : "Other",
      customItem: isExistingItem ? "" : expense.item,
      amount_spent: expense.amount_spent,
      department: expense.department,
      mode_of_payment: expense.mode_of_payment,
      account: expense.account,
    });
    fetchSubModes(expense.mode_of_payment);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      const { error } = await supabase.from("expenses").delete().eq("id", id);

      if (error) {
        alert("Error deleting expense: " + error.message);
        return;
      }

      alert("Expense successfully deleted!");
      fetchExpenses(filter);
      fetchBalanceForward();
      fetchExistingItems(); // Refresh the items list
    }
  };

  const exportToCSV = () => {
    const csvData = expenses.map((expense) => ({
      Item: expense.item,
      "Amount Spent": expense.amount_spent,
      Department: expense.department,
      "Mode of Payment": expense.mode_of_payment,
      Account: expense.account,
      Createdby: expense.submittedby,
      Date: new Date(expense.date).toLocaleDateString(),
    }));

    const csvHeaders = Object.keys(csvData[0]).join(",") + "\n";
    const csvRows = csvData
      .map((row) => Object.values(row).join(","))
      .join("\n");

    const csvBlob = new Blob([csvHeaders + csvRows], { type: "text/csv;charset=utf-8" });
    
    // Create download link and trigger click
    const link = document.createElement("a");
    link.href = URL.createObjectURL(csvBlob);
    link.download = "expenses.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Modern header with gradient */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">
          Expenses Ledger
        </h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Track and manage all company expenditures
        </p>
      </div>

      {/* Financial summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 shadow-md text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Total Income</h2>
              <p className="text-2xl font-bold">UGX {totalIncome.toLocaleString()}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 shadow-md text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Total Expenses</h2>
              <p className="text-2xl font-bold">UGX {totalExpenses.toLocaleString()}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 shadow-md text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Balance Forward</h2>
              <p className="text-2xl font-bold">UGX {balanceForward.toLocaleString()}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Filters and Export Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === "all" 
                ? "bg-blue-600 text-white shadow-md" 
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            All Expenses
          </button>
          <button
            onClick={() => setFilter("daily")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === "daily" 
                ? "bg-blue-600 text-white shadow-md" 
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setFilter("monthly")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === "monthly" 
                ? "bg-blue-600 text-white shadow-md" 
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setFilter("yearly")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === "yearly" 
                ? "bg-blue-600 text-white shadow-md" 
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            This Year
          </button>
        </div>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-medium shadow-md hover:shadow-lg transition-all flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download CSV
        </button>
      </div>

      {/* Add/Edit Expense Form */}
      <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {editExpense ? "Edit Expense" : "Add New Expense"}
        </h2>

        {/* Dismissible notice */}
        {showNotice && (
          <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
            <div className="flex justify-between items-start">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-blue-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm text-blue-800 font-medium">
                    Please endeavor to select from the existing items list, to enable organized data
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowNotice(false)}
                className="text-blue-500 hover:text-blue-700"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
            <select
              name="item"
              value={formData.item}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select an item</option>
              {/* Predefined categories */}
              <optgroup label="Common Categories">
                {EXPENSE_CATEGORIES.filter(cat => cat !== "Other").map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </optgroup>
              {/* Existing items from database */}
              <optgroup label="Previously Used Items">
                {existingItems
                  .filter(item => !EXPENSE_CATEGORIES.includes(item))
                  .map((item, index) => (
                    <option key={`existing-${index}`} value={item}>{item}</option>
                  ))}
              </optgroup>
              {/* Option to add new item */}
              <option value="Other">Other (specify below)</option>
            </select>
            {formData.item === "Other" && (
              <div className="mt-2">
                <input
                  type="text"
                  name="customItem"
                  placeholder="Specify new item name"
                  value={formData.customItem}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (UGX)</label>
            <input
              type="number"
              name="amount_spent"
              placeholder="0"
              value={formData.amount_spent}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <input
              type="text"
              name="department"
              placeholder="Department/person"
              value={formData.department}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source Account</label>
            <select
              name="mode_of_payment"
              value={formData.mode_of_payment}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Account to spend from</option>
              {modes.map((mode, index) => (
                <option key={index} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>
          {formData.mode_of_payment && formData.mode_of_payment !== "Cash" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.mode_of_payment === "Bank" ? "Bank Name" : "Mobile Provider"}
              </label>
              <select
                name="account"
                value={formData.account}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!formData.mode_of_payment}
              >
                <option value="">Select {formData.mode_of_payment === "Bank" ? "Bank" : "Provider"}</option>
                {subModes.map((subMode, index) => (
                  <option key={index} value={subMode}>
                    {subMode}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end">
          {editExpense && (
            <button
              onClick={() => {
                setEditExpense(null);
                setFormData({ 
                  item: "", 
                  customItem: "", 
                  amount_spent: 0, 
                  department: "", 
                  mode_of_payment: "", 
                  account: "" 
                });
              }}
              className="mr-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            onClick={submitExpense}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-md hover:shadow-md transition-all"
          >
            {editExpense ? "Update Expense" : "Add Expense"}
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64 rounded-lg bg-gray-50 border border-gray-100">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Loading expense data...</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-left border-b border-gray-200">
                  <th className="p-4 font-medium text-gray-500">Item</th>
                  <th className="p-4 font-medium text-gray-500 text-right">Amount</th>
                  <th className="p-4 font-medium text-gray-500">Department</th>
                  <th className="p-4 font-medium text-gray-500">Source Account</th>
                  <th className="p-4 font-medium text-gray-500">Details</th>
                  <th className="p-4 font-medium text-gray-500">Added By</th>
                  <th className="p-4 font-medium text-gray-500">Date</th>
                  <th className="p-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium">{expense.item}</td>
                    <td className="p-4 text-right font-mono text-red-600">
                      UGX {expense.amount_spent?.toLocaleString()}
                    </td>
                    <td className="p-4">{expense.department}</td>
                    <td className="p-4">{expense.mode_of_payment}</td>
                    <td className="p-4">{expense.account || 'N/A'}</td>
                    <td className="p-4">{expense.submittedby}</td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(expense.date).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="p-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="p-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {expenses.length === 0 && !loading && (
            <div className="p-8 text-center text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-lg">No expenses found</p>
              <p className="text-sm mt-1">Try adjusting your filters or add a new expense</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
