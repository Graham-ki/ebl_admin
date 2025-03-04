"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function FinancialSummaryPage() {
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Deposit form state
  const [amountPaid, setAmountPaid] = useState<number | "">("");
  const [modeOfPayment, setModeOfPayment] = useState("");
  const [modeOfMobileMoney, setModeOfMobileMoney] = useState("");
  const [bankName, setBankName] = useState("");

  // Financial summary state
  const [financialSummary, setFinancialSummary] = useState<any>({
    cash: 0,
    bank: 0,
    mobileMoney: 0,
    mtn: 0,
    airtel: 0,
    bankNames: {} as { [key: string]: number }, // Track bank names and their amounts
  });

  // Fetch all ledger entries
  const fetchAllLedgerEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("finance").select("*");

    if (error) {
      alert("Error fetching ledger entries: " + error.message);
      setLoading(false);
      return;
    }

    setLedger(data || []);
    calculateFinancialSummary(data || []);
    setLoading(false);
  };

  // Calculate financial summary
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
          summary.bankNames[entry.bank_name] =
            (summary.bankNames[entry.bank_name] || 0) + entry.amount_paid;
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

  // Handle deposit submission
  const handleDepositSubmit = async () => {
    if (!amountPaid || !modeOfPayment) {
      alert("Please fill in all required fields.");
      return;
    }

    const depositData: any = {
      amount_paid: amountPaid,
      mode_of_payment: modeOfPayment,
      amount_available: amountPaid,
      submittedby: "You", // Hardcoded for now, should be dynamic  
    };

    if (modeOfPayment === "Mobile Money") {
      depositData.mode_of_mobilemoney = modeOfMobileMoney;
    } else if (modeOfPayment === "Bank") {
      depositData.bank_name = bankName;
    }

    const { error } = await supabase.from("finance").insert([depositData]);

    if (error) {
      alert("Error making deposit: " + error.message);
      return;
    }

    alert("Deposit successfully recorded!");
    setIsModalOpen(false);
    fetchAllLedgerEntries();
  };

  // Fetch ledger entries on component mount
  useEffect(() => {
    fetchAllLedgerEntries();
  }, []);

  //delete ledger
  const deleteFinanceEntry = async (entryId: number) => {
    const { error } = await supabase
      .from('finance')
      .delete()
      .eq('id', entryId); // Delete entry by ID
  
    if (error) {
      console.error('Error deleting finance entry:', error);
      alert('Failed to delete entry.');
    } else {
      alert('Entry deleted successfully.');
      // Refresh the list after deletion
      fetchAllLedgerEntries(); 
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-center shadow-lg p-4 rounded-lg bg-blue-100 dark:bg-gray-800 dark:text-white">
        Accounts Summary
      </h1>

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
        {Object.entries(financialSummary.bankNames).map(([bankName, amount]: [string, number]) => (
          <div key={bankName} className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold">{bankName}</h3>
            <p className="text-gray-600">UGX {amount}</p>
          </div>
        ))}
      </div>

      {/* Make Deposit Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="bg-blue-500 text-white p-2 rounded mt-4"
      >
        Make Deposit
      </button>

      {/* Deposit Records Table */}
      <h2 className="text-2xl font-semibold mt-6 mb-4">Deposit Records</h2>
      <table className="w-full border-collapse border mt-4">
        <thead>
          <tr>
            <th className="border p-2">Amount</th>
            <th className="border p-2">Mode</th>
            <th className="border p-2">Service Provider</th>
            <th className="border p-2">Deposited by</th>
            <th className="border p-2">Date</th>
            <th className="border p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {ledger.map((entry) => (
            <tr key={entry.id}>
              <td className="border p-2">UGX {entry.amount_paid}</td>
              <td className="border p-2">{entry.mode_of_payment}</td>
              <td className="border p-2">{entry.mode_of_mobilemoney || entry.bank_name || "-"}</td>
              <td className="border p-2">{entry.submittedby}</td>
                <td className="border p-2">{new Date(entry.created_at).toLocaleDateString()}</td>
                <td><button
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-700"
                onClick={() => deleteFinanceEntry(entry.id)}
                >
                Delete
              </button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Deposit Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-semibold mb-4">Make a Deposit</h2>
            <input type="number" placeholder="Amount" value={amountPaid} onChange={(e) => setAmountPaid(parseFloat(e.target.value))} className="border p-2 rounded w-full mb-2" />
            <select value={modeOfPayment} onChange={(e) => setModeOfPayment(e.target.value)} className="border p-2 rounded w-full mb-2">
              <option value="">Select Mode</option>
              <option value="Cash">Cash</option>
              <option value="Bank">Bank</option>
              <option value="Mobile Money">Mobile Money</option>
            </select>
            {modeOfPayment === "Mobile Money" && (
              <select value={modeOfMobileMoney} onChange={(e) => setModeOfMobileMoney(e.target.value)} className="border p-2 rounded w-full mb-2">
                <option value="">Select Provider</option>
                <option value="MTN">MTN</option>
                <option value="Airtel">Airtel</option>
              </select>
            )}
            {modeOfPayment === "Bank" && (
              <input type="text" placeholder="Bank Name" value={bankName} onChange={(e) => setBankName(e.target.value)} className="border p-2 rounded w-full mb-2" />
            )}
            <button onClick={handleDepositSubmit} className="bg-green-500 text-white p-2 rounded w-full">Submit Deposit</button>
          </div>
        </div>
      )}
    </div>
  );
}
