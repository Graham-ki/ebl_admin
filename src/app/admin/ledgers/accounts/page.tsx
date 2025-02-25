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

  // Fetch ledger entries on component mount
  useEffect(() => {
    fetchAllLedgerEntries();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-center shadow-lg p-4 rounded-lg bg-blue-100 dark:bg-gray-800 dark:text-white">
        Accounts Summary
      </h1>

      {/* Loading State */}
      {loading && <p className="text-center">Loading...</p>}

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
    </div>
  );
}