"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { saveAs } from "file-saver"; // For CSV export
import { sub } from "date-fns";

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
    mode_of_payment: "",
    account: "",
  });
  const [editExpense, setEditExpense] = useState<any>(null); // For editing expenses
  const [modes, setModes] = useState<string[]>([]); // For storing modes of payment from finance table
  const [subModes, setSubModes] = useState<string[]>([]); // For storing submodes/accounts based on selected mode

  // Fetch expenses, total income, and modes on component mount and when filter changes
  useEffect(() => {
    fetchExpenses(filter);
    fetchTotalIncome();
    fetchModes();
    fetchBalanceForward(); // Fetch balance forward from amount_available
  }, [filter]);

  // Fetch balance forward (total sum of amount_available from finance table)
  const fetchBalanceForward = async () => {
    const { data, error } = await supabase
      .from("finance")
      .select("amount_available");

    if (error) {
      alert("Error fetching balance forward: " + error.message);
      return;
    }

    const total = data.reduce((sum, entry) => sum + (entry.amount_available || 0), 0);
    setBalanceForward(total);
  };

  // Fetch modes of payment from finance table
  const fetchModes = async () => {
    const { data, error } = await supabase
      .from("finance")
      .select("mode_of_payment");

    if (error) {
      alert("Error fetching modes of payment: " + error.message);
      return;
    }

    // Extract unique modes of payment
    const uniqueModes = Array.from(new Set(data.map((entry) => entry.mode_of_payment)));
    setModes(uniqueModes);
  };

  // Fetch submodes/accounts based on the selected mode of payment
  const fetchSubModes = async (mode: string) => {
    if (mode === "cash") {
      setSubModes([]); // No submodes for cash
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

    // Extract unique submodes/accounts
    const uniqueSubModes = Array.from(
      new Set(data.map((entry) => (mode === "Bank" ? entry.bank_name : entry.mode_of_mobilemoney)))
    ).filter((subMode): subMode is string => !!subMode); // Filter out null/undefined values

    setSubModes(uniqueSubModes);
  };

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

  // Fetch total income from finance table
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

  // Calculate total expenses
  const calculateTotalExpenses = (data: any[]) => {
    const total = data.reduce((sum, entry) => sum + (entry.amount_spent || 0), 0);
    setTotalExpenses(total);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === "mode_of_payment") {
      fetchSubModes(value); // Fetch submodes when mode changes
      setFormData((prev) => ({ ...prev, account: "" })); // Reset account when mode changes
    }
  };

  // Submit expense (add or update)
  const submitExpense = async () => {
    if (!formData.item || !formData.amount_spent || !formData.department || !formData.mode_of_payment) {
      alert("Please fill in all fields.");
      return;
    }

    // Prepare the expense data to be inserted/updated
    const expenseData = {
      item: formData.item,
      amount_spent: formData.amount_spent,
      department: formData.department,
      mode_of_payment: formData.mode_of_payment,
      account: formData.account, // Include the account (bank name or mobile money mode)
      submittedby: "You", // Hardcoded for now
    };

    // Submit the expense
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

    // Deduct the amount from the total amount_available for the selected mode
    const { data: financeData, error: financeError } = await supabase
      .from("finance")
      .select("amount_available")
      .eq("submittedby","You")
      .eq("mode_of_payment", formData.mode_of_payment);

    if (financeError) {
      alert("Error fetching finance data: " + financeError.message);
      return;
    }

    if (financeData.length === 0) {
      alert("No finance data found for the selected mode.");
      return;
    }

    // Calculate the total amount_available for the selected mode
    const totalAmountAvailable = financeData.reduce((sum, entry) => sum + (entry.amount_available || 0), 0);
    const updatedAmountAvailable = totalAmountAvailable - formData.amount_spent;

    // Update all entries for the selected mode with the new total amount_available
    const { error: updateError } = await supabase
      .from("finance")
      .update({ amount_available: updatedAmountAvailable })
      .eq("mode_of_payment", formData.mode_of_payment);

    if (updateError) {
      alert("Error updating finance data: " + updateError.message);
      return;
    }

    // Refresh data
    fetchExpenses(filter);
    fetchBalanceForward(); // Update balance forward
    setFormData({ item: "", amount_spent: 0, department: "", mode_of_payment: "", account: "" });
    setEditExpense(null);
  };

  // Handle edit action
  const handleEdit = (expense: any) => {
    setEditExpense(expense);
    setFormData({
      item: expense.item,
      amount_spent: expense.amount_spent,
      department: expense.department,
      mode_of_payment: expense.mode_of_payment,
      account: expense.account,
    });
    fetchSubModes(expense.mode_of_payment); // Fetch submodes for the edited expense's mode
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
          <select
            name="mode_of_payment"
            value={formData.mode_of_payment}
            onChange={handleInputChange}
            className="border p-2 rounded"
          >
            <option value="">Select Account</option>
            {modes.map((mode, index) => (
              <option key={index} value={mode}>
                {mode}
              </option>
            ))}
          </select>
          {formData.mode_of_payment !== "Cash" && (
            <select
              name="account"
              value={formData.account}
              onChange={handleInputChange}
              className="border p-2 rounded"
              disabled={!formData.mode_of_payment}
            >
              <option value="">Provider</option>
              {subModes.map((subMode, index) => (
                <option key={index} value={subMode}>
                  {subMode}
                </option>
              ))}
            </select>
          )}
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
              <th className="border p-2">Account</th>
              <th className="border p-2">Provider</th>
              <th className="border p-2">Added by</th>
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
                <td className="border p-2">{expense.mode_of_payment}</td>
                <td className="border p-2">{expense.account}</td>
                <td className="border p-2">{expense.submittedby}</td>
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
