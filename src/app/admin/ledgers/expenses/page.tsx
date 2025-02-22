"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { saveAs } from "file-saver"; // For CSV export

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ExpensesLedgerPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [balanceForward, setBalanceForward] = useState(0);
  const [filter, setFilter] = useState<"daily" | "monthly" | "yearly" | "all">("all"); // Filter state
  const [formData, setFormData] = useState({
    item: "",
    amount_spent: 0,
    department: "",
  });
  const [editExpense, setEditExpense] = useState<any>(null); // For editing expenses

  useEffect(() => {
    fetchExpenses(filter);
    fetchTotalIncome();
  }, [filter]);

  // Fetch expenses based on filter
  const fetchExpenses = async (filterType: "daily" | "monthly" | "yearly" | "all") => {
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
    let query = supabase.from("expenses").select("*");

    // Apply date filter if applicable
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

  // Fetch total income from user_ledger table
  const fetchTotalIncome = async () => {
    const { data, error } = await supabase
      .from("user_ledger")
      .select("amount_paid");

    if (error) {
      alert("Error fetching total income: " + error.message);
      return;
    }

    const total = data.reduce((sum, entry) => sum + (entry.amount_paid || 0), 0);
    setTotalIncome(total);
  };

  // Calculate total expenses
  const calculateTotalExpenses = (data: any[]) => {
    const total = data.reduce((sum, entry) => sum + (entry.amount_spent || 0), 0);
    setTotalExpenses(total);
    setBalanceForward(totalIncome - total);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Submit expense (add or update)
  const submitExpense = async () => {
    if (!formData.item || !formData.amount_spent || !formData.department) {
      alert("Please fill in all fields.");
      return;
    }

    const { data, error } = editExpense
      ? await supabase
          .from("expenses")
          .update({ ...formData })
          .eq("id", editExpense.id)
      : await supabase.from("expenses").insert([formData]);

    if (error) {
      alert("Error submitting expense: " + error.message);
      return;
    }

    alert("Expense successfully submitted!");
    fetchExpenses(filter);
    setFormData({ item: "", amount_spent: 0, department: "" });
    setEditExpense(null);
  };

  // Handle edit action
  const handleEdit = (expense: any) => {
    setEditExpense(expense);
    setFormData({
      item: expense.item,
      amount_spent: expense.amount_spent,
      department: expense.department,
    });
  };

  // Handle delete action
  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      const { error } = await supabase.from("expenses").delete().eq("id", id);

      if (error) {
        alert("Error deleting expense: " + error.message);
        return;
      }

      alert("Expense successfully deleted!");
      fetchExpenses(filter);
    }
  };

  // Export expenses to CSV
  const exportToCSV = () => {
    const csvData = expenses.map((expense) => ({
      Item: expense.item,
      "Amount Spent": expense.amount_spent,
      Department: expense.department,
      Date: new Date(expense.date).toLocaleDateString(),
    }));

    const csvHeaders = Object.keys(csvData[0]).join(",") + "\n";
    const csvRows = csvData
      .map((row) => Object.values(row).join(","))
      .join("\n");

    const csvBlob = new Blob([csvHeaders + csvRows], { type: "text/csv;charset=utf-8" });
    saveAs(csvBlob, "expenses.csv");
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-center shadow-lg p-4 rounded-lg bg-blue-100 dark:bg-gray-800 dark:text-white">
        Expenses Ledger
      </h1>

      {/* Financial Summary */}
      <div className="grid grid-cols-3 gap-4 text-white text-center mb-6">
        <div className="p-4 bg-green-500 rounded-lg">
          <h2 className="text-xl font-semibold">Total Income</h2>
          <p className="text-2xl">UGX {totalIncome.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-red-500 rounded-lg">
          <h2 className="text-xl font-semibold">Total Expenses</h2>
          <p className="text-2xl">UGX {totalExpenses.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-blue-500 rounded-lg">
          <h2 className="text-xl font-semibold">Balance Forward</h2>
          <p className="text-2xl">UGX {balanceForward.toLocaleString()}</p>
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

      {/* Add/Edit Expense Form */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">
          {editExpense ? "Edit Expense" : "Add Expense"}
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <input
            type="text"
            name="item"
            placeholder="Item"
            value={formData.item}
            onChange={handleInputChange}
            className="border p-2 rounded"
          />
          <input
            type="number"
            name="amount_spent"
            placeholder="Amount Spent"
            value={formData.amount_spent}
            onChange={handleInputChange}
            className="border p-2 rounded"
          />
          <input
            type="text"
            name="department"
            placeholder="Department"
            value={formData.department}
            onChange={handleInputChange}
            className="border p-2 rounded"
          />
        </div>
        <button
          onClick={submitExpense}
          className="bg-blue-500 text-white p-2 rounded mt-2"
        >
          {editExpense ? "Update Expense" : "Add Expense"}
        </button>
      </div>

      {/* Expenses Table */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full border-collapse border mt-4">
          <thead>
            <tr>
              <th className="border p-2">Item</th>
              <th className="border p-2">Amount Spent</th>
              <th className="border p-2">Department</th>
              <th className="border p-2">Date</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id}>
                <td className="border p-2">{expense.item}</td>
                <td className="border p-2">UGX {expense.amount_spent}</td>
                <td className="border p-2">{expense.department}</td>
                <td className="border p-2">{new Date(expense.date).toLocaleDateString()}</td>
                <td className="border p-2">
                  <button
                    onClick={() => handleEdit(expense)}
                    className="bg-gray-500 text-white p-1 rounded mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="bg-red-500 text-white p-1 rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}