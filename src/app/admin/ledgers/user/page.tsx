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
  const [showWarning, setShowWarning] = useState(true);
  const [modeOfPayment, setModeOfPayment] = useState("");
  const [modeOfMobileMoney, setModeOfMobileMoney] = useState("");
  const [bankName, setBankName] = useState("");
  const [financialSummary, setFinancialSummary] = useState<any>({
    cash: 0,
    bank: 0,
    mobileMoney: 0,
    mtn: 0,
    airtel: 0,
    bankNames: {}, // Object to store bank names and their amounts
  });

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
      .from("finance")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      alert("Error fetching user ledger: " + error.message);
      setLoading(false);
      return;
    }

    setLedger(data || []);
    calculateFinancialSummary(data || []);
    setLoading(false);
  };

  const calculateFinancialSummary = (ledger: any[]) => {
    const summary = {
      cash: 0,
      bank: 0,
      mobileMoney: 0,
      mtn: 0,
      airtel: 0,
      bankNames: {} as { [key: string]: number }, // Track bank names and their amounts
    };

    ledger.forEach((entry) => {
      if (entry.mode_of_payment === "Cash") {
        summary.cash += entry.amount_paid;
      } else if (entry.mode_of_payment === "Bank") {
        summary.bank += entry.amount_paid;
        if (entry.bank_name) {
          summary.bankNames[entry.bank_name] = (summary.bankNames[entry.bank_name] || 0) + entry.amount_paid;
        }
      } else if (entry.mode_of_payment === "Mobile Money") {
        summary.mobileMoney += entry.amount_paid;
        if (entry.mode_of_mobilemoney === "MTN") {
          summary.mtn += entry.amount_paid;
        } else if (entry.mode_of_mobilemoney === "Airtel") {
          summary.airtel += entry.amount_paid;
        }
      }
    });

    setFinancialSummary(summary);
  };

  const submitPayment = async () => {
    if (!orderId || totalAmount <= 0 || amountPaid < 0) {
      alert("Please fill in all fields correctly.");
      return;
    }
    const balance = totalAmount - amountPaid;
    const { data, error } = await supabase
      .from("finance")
      .upsert(
        {
          user_id: userId,
          order_id: orderId,
          total_amount: totalAmount,
          amount_paid: amountPaid,
          balance: balance,
          mode_of_payment: modeOfPayment,
          mode_of_mobilemoney: modeOfPayment === "Mobile Money" ? modeOfMobileMoney : null,
          bank_name: modeOfPayment === "Bank" ? bankName : null,
        },
        { onConflict: "user_id,order_id" }
      );

    if (error) {
      alert("Error submitting payment: " + error.message);
      return;
    }

    alert("Payment successfully submitted!");
    fetchUserLedger(userId); // Refresh the ledger data
    setEditEntry(null);
    setIsModalOpen(false);
    setModeOfPayment("");
    setModeOfMobileMoney("");
    setBankName("");
  };

  const handleEdit = (entry: any) => {
    setEditEntry(entry);
    setOrderId(entry.order_id);
    setTotalAmount(entry.total_amount);
    setAmountPaid(entry.amount_paid);
    setModeOfPayment(entry.mode_of_payment);
    setModeOfMobileMoney(entry.mode_of_mobilemoney || "");
    setBankName(entry.bank_name || "");
    setIsModalOpen(true);
  };

  const handleDelete = async (entryId: string) => {
    if (window.confirm("Are you sure you want to delete this entry?")) {
      const { error } = await supabase
        .from("finance")
        .delete()
        .eq("id", entryId);

      if (error) {
        alert("Error deleting entry: " + error.message);
        return;
      }

      alert("Entry successfully deleted!");
      fetchUserLedger(userId); // Refresh the ledger data
    }
  };

  const hasPaymentData = ledger.some((entry) => entry.order_id === orderId);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-center shadow-lg p-4 rounded-lg bg-blue-100 dark:bg-gray-800 dark:text-white">Orders Ledger</h1>

      {/* Financial Summary Cards */}
      <div className="mb-6">
        {/* Major Payment Modes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold">Cash</h3>
            <p className="text-gray-600 text-lg">UGX {financialSummary.cash}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold">Bank</h3>
            <p className="text-gray-600 text-lg">UGX {financialSummary.bank}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold">Mobile Money</h3>
            <p className="text-gray-600 text-lg">UGX {financialSummary.mobileMoney}</p>
          </div>
        </div>

        {/* Sub Payment Modes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {financialSummary.mtn > 0 && (
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold">MTN</h3>
              <p className="text-gray-600">UGX {financialSummary.mtn}</p>
            </div>
          )}
          {financialSummary.airtel > 0 && (
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold">Airtel</h3>
              <p className="text-gray-600">UGX {financialSummary.airtel}</p>
            </div>
          )}
          {Object.entries(financialSummary.bankNames).map(([bankName, amount]) => (
            <div key={bankName} className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold">{bankName}</h3>
              <p className="text-gray-600">UGX {amount as number}</p>
            </div>
          ))}
        </div>
      </div>

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
                  <th className="border p-2">Mode of Payment</th>
                  {ledger.some((entry) => entry.mode_of_payment === "Mobile Money") && (
                    <th className="border p-2">Mobile Money Provider</th>
                  )}
                  {ledger.some((entry) => entry.mode_of_payment === "Bank") && (
                    <th className="border p-2">Bank Name</th>
                  )}
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
                    <td className="border p-2">{entry.mode_of_payment}</td>
                    {entry.mode_of_payment === "Mobile Money" && (
                      <td className="border p-2">{entry.mode_of_mobilemoney}</td>
                    )}
                    {entry.mode_of_payment === "Bank" && (
                      <td className="border p-2">{entry.bank_name}</td>
                    )}
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

              {/* Input for Mode of Payment */}
              <div className="mb-4">
                <label className="block mb-2">Mode of Payment:</label>
                <select
                  value={modeOfPayment}
                  onChange={(e) => setModeOfPayment(e.target.value)}
                  className="border p-2 rounded"
                >
                  <option value="">Select Mode</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank</option>
                  <option value="Mobile Money">Mobile Money</option>
                </select>
              </div>

              {/* Input for Mobile Money Provider */}
              {modeOfPayment === "Mobile Money" && (
                <div className="mb-4">
                  <label className="block mb-2">Mobile Money Provider:</label>
                  <select
                    value={modeOfMobileMoney}
                    onChange={(e) => setModeOfMobileMoney(e.target.value)}
                    className="border p-2 rounded"
                  >
                    <option value="">Select Provider</option>
                    <option value="MTN">MTN</option>
                    <option value="Airtel">Airtel</option>
                  </select>
                </div>
              )}

              {/* Input for Bank Name */}
              {modeOfPayment === "Bank" && (
                <div className="mb-4">
                  <label className="block mb-2">Bank Name:</label>
                  <input
                    type="text"
                    placeholder="Enter Bank Name"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="border p-2 rounded"
                  />
                </div>
              )}

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

                {/* Input for Mode of Payment */}
                <div className="mb-4">
                  <label className="block mb-2">Mode of Payment:</label>
                  <select
                    value={modeOfPayment}
                    onChange={(e) => setModeOfPayment(e.target.value)}
                    className="border p-2 rounded w-full"
                  >
                    <option value="">Select Mode</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank</option>
                    <option value="Mobile Money">Mobile Money</option>
                  </select>
                </div>

                {/* Input for Mobile Money Provider */}
                {modeOfPayment === "Mobile Money" && (
                  <div className="mb-4">
                    <label className="block mb-2">Mobile Money Provider:</label>
                    <select
                      value={modeOfMobileMoney}
                      onChange={(e) => setModeOfMobileMoney(e.target.value)}
                      className="border p-2 rounded w-full"
                    >
                      <option value="">Select Provider</option>
                      <option value="MTN">MTN</option>
                      <option value="Airtel">Airtel</option>
                    </select>
                  </div>
                )}

                {/* Input for Bank Name */}
                {modeOfPayment === "Bank" && (
                  <div className="mb-4">
                    <label className="block mb-2">Bank Name:</label>
                    <input
                      type="text"
                      placeholder="Enter Bank Name"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="border p-2 rounded w-full"
                    />
                  </div>
                )}

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