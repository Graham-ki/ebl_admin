"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function UserLedgerPage() {
  const [userId, setUserId] = useState(""); 
  const [userName, setUserName] = useState(""); 
  const [orderId, setOrderId] = useState(""); 
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0); 
  const [amountPaid, setAmountPaid] = useState(0); 
  const [editEntry, setEditEntry] = useState<any>(null); 
  const [isModalOpen, setIsModalOpen] = useState(false); 
  const [showWarning, setShowWarning] = useState(true); // State to control visibility of the warning message

  const fetchUserDetails = async (userId: string) => {
    if (!userId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("name")
      .eq("id", userId)
      .single();

    if (error) {
      alert("Error fetching user details: " + error.message);
      setLoading(false);
      return;
    }

    setUserName(data?.name || "Unknown User");
    setLoading(false);
  };

  const fetchOrderDetails = async () => {
    if (!orderId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("order")
      .select("user, total_amount")
      .eq("id", orderId)
      .single();

    if (error) {
      alert("Order not found! Please enter a valid track ID.");
      setLoading(false);
      return;
    }

    setUserId(data?.user || "");
    setTotalAmount(data?.total_amount || 0); 
    fetchUserDetails(data?.user || ""); 
    fetchUserLedger(data?.user || ""); 
    setLoading(false);
  };

  const fetchUserLedger = async (userId: string) => {
    if (!userId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("user_ledger")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      alert("Error fetching user ledger: " + error.message);
      setLoading(false);
      return;
    }

    setLedger(data || []);
    setLoading(false);
  };

  const submitPayment = async () => {
    if (!orderId || totalAmount <= 0 || amountPaid < 0) {
      alert("Please fill in all fields correctly.");
      return;
    }
    const balance = totalAmount - amountPaid;
    const { data, error } = await supabase
      .from("user_ledger")
      .upsert(
        {
          user_id: userId,
          order_id: orderId,
          total_amount: totalAmount,
          amount_paid: amountPaid,
          balance: balance,
        },
        { onConflict: "user_id,order_id"} 
      );

    if (error) {
      alert("Error submitting payment: " + error.message);
      return;
    }

    alert("Payment successfully submitted!");
    fetchUserLedger(userId); 
    setEditEntry(null); 
    setIsModalOpen(false);
  };

  const handleEdit = (entry: any) => {
    setEditEntry(entry);
    setOrderId(entry.order_id);
    setTotalAmount(entry.total_amount);
    setAmountPaid(entry.amount_paid);
    setIsModalOpen(true); 
  };

  const handleDelete = async (entryId: string) => {
    if (window.confirm("Are you sure you want to delete this entry?")) {
      const { error } = await supabase
        .from("user_ledger")
        .delete()
        .eq("id", entryId);

      if (error) {
        alert("Error deleting entry: " + error.message);
        return;
      }

      alert("Entry successfully deleted!");
      fetchUserLedger(userId); 
    }
  };

  const hasPaymentData = ledger.some((entry) => entry.order_id === orderId);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-center shadow-lg p-4 rounded-lg bg-blue-100 dark:bg-gray-800 dark:text-white">Orders Ledger</h1>

      {/* Dismissible Warning Message */}
      {showWarning && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 relative">
          <p>Confirm proof of payment from the orders dashboard before adding payment!</p>
          <button
            onClick={() => setShowWarning(false)}
            className="absolute top-2 right-2 text-yellow-700 hover:text-yellow-900"
          >
            ×
          </button>
        </div>
      )}

      {/* Input field for Order ID */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Tracking ID"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)} 
          className="border p-2 rounded"
        />
        <button
          onClick={fetchOrderDetails} 
          className="bg-black hover:bg-gray-500 text-white p-2 rounded mt-2"
        >
          Submit
        </button>
      </div>

      {/* Show user name if fetched */}
      {userName && (
        <>
          <h3 className="font-semibold">Marketer: {userName}</h3>

          {/* Ledger Table */}
          {loading ? (
            <p>Loading...</p>
          ) : (
            <table className="w-full border-collapse border mt-4">
              <thead>
                <tr>
                  <th className="border p-2">Track ID</th>
                  <th className="border p-2">Total Order Amount</th>
                  <th className="border p-2">Amount submitted</th>
                  <th className="border p-2">Balance</th>
                  <th className="border p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((entry) => (
                  <tr key={entry.id}>
                    <td className="border p-2">{entry.order_id}</td>
                    <td className="border p-2">UGX {entry.total_amount}</td>
                    <td className="border p-2">UGX {entry.amount_paid}</td>
                    <td className="border p-2">UGX {entry.balance}</td>
                    <td className="border p-2">
                      <button
                        onClick={() => handleEdit(entry)}
                        className="bg-gray-500 text-white p-1 rounded mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
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

          {/* Form for entering and updating payment details */}
          {!hasPaymentData && (
            <div className="mt-6">
              <h2 className="text-xl font-semibold">Add Payment</h2>

              {/* Input for Total Amount */}
              <div className="mb-4">
                <label className="block mb-2">Total Order Amount (UGX):</label>
                <input
                  type="number"
                  placeholder="Total Amount"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(parseFloat(e.target.value))}
                  className="border p-2 rounded"
                />
              </div>

              {/* Input for Amount Paid */}
              <div className="mb-4">
                <label className="block mb-2">Amount submitted (UGX):</label>
                <input
                  type="number"
                  placeholder="Amount Paid"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value))}
                  className="border p-2 rounded"
                />
              </div>

              <button
                className="bg-green-500 text-white p-2 rounded mt-2"
                onClick={submitPayment}
              >
                {editEntry ? "Update Payment" : "Submit Payment"}
              </button>
            </div>
          )}

          {/* Modal for Edit Form */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg w-96">
                <h2 className="text-xl font-semibold mb-4">Edit Payment</h2>

                {/* Input for Total Amount */}
                <div className="mb-4">
                  <label className="block mb-2">Total Order Amount (UGX):</label>
                  <input
                    type="number"
                    placeholder="Total Amount"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(parseFloat(e.target.value))}
                    className="border p-2 rounded w-full"
                  />
                </div>

                {/* Input for Amount Paid */}
                <div className="mb-4">
                  <label className="block mb-2">Amount submitted (UGX):</label>
                  <input
                    type="number"
                    placeholder="Amount Paid"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(parseFloat(e.target.value))}
                    className="border p-2 rounded w-full"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="bg-gray-500 text-white p-2 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitPayment}
                    className="bg-blue-500 text-white p-2 rounded"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}