"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function FinancialSummaryPage() {
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amountPaid, setAmountPaid] = useState<number | "">("");
  const [modeOfPayment, setModeOfPayment] = useState("");
  const [modeOfMobileMoney, setModeOfMobileMoney] = useState("");
  const [bankName, setBankName] = useState("");
  const [financialSummary, setFinancialSummary] = useState<any>({
    cash: 0,
    bank: 0,
    mobileMoney: 0,
    mtn: 0,
    airtel: 0,
    bankNames: {},
  });

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

  const calculateFinancialSummary = (ledger: any[]) => {
    const summary = {
      cash: 0,
      bank: 0,
      mobileMoney: 0,
      mtn: 0,
      airtel: 0,
      bankNames: {} as { [key: string]: number },
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

  const handleDepositSubmit = async () => {
    if (!amountPaid || !modeOfPayment) {
      alert("Please fill in all required fields.");
      return;
    }

    const depositData: any = {
      amount_paid: amountPaid,
      mode_of_payment: modeOfPayment,
      amount_available: amountPaid,
      submittedby: "You",
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
    setAmountPaid("");
    setModeOfPayment("");
    setModeOfMobileMoney("");
    setBankName("");
    fetchAllLedgerEntries();
  };

  const deleteFinanceEntry = async (entryId: number) => {
    if (window.confirm("Are you sure you want to delete this entry?")) {
      const { error } = await supabase
        .from('finance')
        .delete()
        .eq('id', entryId);

      if (error) {
        console.error('Error deleting finance entry:', error);
        alert('Failed to delete entry.');
      } else {
        alert('Entry deleted successfully.');
        fetchAllLedgerEntries();
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  useEffect(() => {
    fetchAllLedgerEntries();
  }, []);

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">💰</span>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Financial Summary Dashboard
          </h1>
        </div>
      </div>

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <span>💵</span>
              <span>Cash Deposits</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-mono font-bold">{formatCurrency(financialSummary.cash)}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600">
              <span>🏦</span>
              <span>Bank Transfers</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-mono font-bold">{formatCurrency(financialSummary.bank)}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-purple-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-600">
              <span>📱</span>
              <span>Mobile Money</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-mono font-bold">{formatCurrency(financialSummary.mobileMoney)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span>📊</span>
          <span>Detailed Breakdown</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {financialSummary.mtn > 0 && (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardHeader className="p-4">
                <CardTitle className="flex items-center gap-2 text-yellow-600 text-sm">
                  <span>🟨</span>
                  <span>MTN Mobile Money</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-lg font-mono">{formatCurrency(financialSummary.mtn)}</p>
              </CardContent>
            </Card>
          )}
          
          {financialSummary.airtel > 0 && (
            <Card className="bg-red-50 border-red-200">
              <CardHeader className="p-4">
                <CardTitle className="flex items-center gap-2 text-red-600 text-sm">
                  <span>🟥</span>
                  <span>Airtel Money</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-lg font-mono">{formatCurrency(financialSummary.airtel)}</p>
              </CardContent>
            </Card>
          )}
          
          {Object.entries(financialSummary.bankNames).map(([bankName, amount]) => (
            <Card key={bankName} className="bg-gray-50 border-gray-200">
              <CardHeader className="p-4">
                <CardTitle className="flex items-center gap-2 text-gray-600 text-sm">
                  <span>🏛️</span>
                  <span>{bankName}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-lg font-mono">{formatCurrency(amount as number)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Deposit Button */}
      <Button 
        onClick={() => setIsModalOpen(true)}
        className="mb-6 bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
      >
        <span>➕</span>
        <span>Make Deposit</span>
      </Button>

      {/* Deposit Records Table */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span>📋</span>
          <span>Deposit Records</span>
        </h2>
        
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-medium">Amount</TableHead>
                  <TableHead className="font-medium">Payment Method</TableHead>
                  <TableHead className="font-medium">Service Provider</TableHead>
                  <TableHead className="font-medium">Deposited By</TableHead>
                  <TableHead className="font-medium">Date</TableHead>
                  <TableHead className="font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.length > 0 ? (
                  ledger.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono">{formatCurrency(entry.amount_paid)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.mode_of_payment}</Badge>
                      </TableCell>
                      <TableCell>
                        {entry.mode_of_mobilemoney || entry.bank_name || "-"}
                      </TableCell>
                      <TableCell>{entry.submittedby}</TableCell>
                      <TableCell>{new Date(entry.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteFinanceEntry(entry.id)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No deposit records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Deposit Form Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="rounded-lg max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>💰</span>
              <span>Make a Deposit</span>
            </DialogTitle>
            <DialogDescription>
              Record a new financial deposit
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amountPaid}
                onChange={(e) => setAmountPaid(parseFloat(e.target.value))}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <Select value={modeOfPayment} onValueChange={setModeOfPayment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank">Bank Transfer</SelectItem>
                  <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {modeOfPayment === "Mobile Money" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Provider</label>
                <Select value={modeOfMobileMoney} onValueChange={setModeOfMobileMoney}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MTN">MTN</SelectItem>
                    <SelectItem value="Airtel">Airtel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {modeOfPayment === "Bank" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                <Input
                  type="text"
                  placeholder="Enter bank name"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDepositSubmit} className="bg-blue-600 hover:bg-blue-700">
              Submit Deposit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
