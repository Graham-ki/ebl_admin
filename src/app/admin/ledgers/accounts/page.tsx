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
  const [purpose, setPurpose] = useState("");
  const [financialSummary, setFinancialSummary] = useState<any>({
    cash: 0,
    bank: 0,
    mobileMoney: 0,
    mtn: 0,
    airtel: 0,
    bankNames: {},
    balanceForward: {
      cash: 0,
      bank: 0,
      mobileMoney: 0
    }
  });
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [currentDetailsMode, setCurrentDetailsMode] = useState("");
  const [depositDetails, setDepositDetails] = useState<any[]>([]);
  const [expenseDetails, setExpenseDetails] = useState<any[]>([]);

  const fetchAllLedgerEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("finance").select("*").order('id',{ascending:false});

    if (error) {
      alert("Error fetching ledger entries: " + error.message);
      setLoading(false);
      return;
    }

    setLedger(data || []);
    calculateFinancialSummary(data || []);
    setLoading(false);
  };

  const calculateFinancialSummary = async (ledger: any[]) => {
    const summary = {
      cash: 0,
      bank: 0,
      mobileMoney: 0,
      mtn: 0,
      airtel: 0,
      bankNames: {} as { [key: string]: number },
      balanceForward: {
        cash: 0,
        bank: 0,
        mobileMoney: 0
      }
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

    const { data: expenses, error } = await supabase.from("expenses").select("amount_spent, mode_of_payment");

    if (!error && expenses) {
      const expenseSummary = {
        cash: 0,
        bank: 0,
        mobileMoney: 0
      };

      expenses.forEach((expense) => {
        if (expense.amount_spent) {
          if (expense.mode_of_payment === "Cash") {
            expenseSummary.cash += expense.amount_spent;
          } else if (expense.mode_of_payment === "Bank") {
            expenseSummary.bank += expense.amount_spent;
          } else if (expense.mode_of_payment === "Mobile Money") {
            expenseSummary.mobileMoney += expense.amount_spent;
          }
        }
      });

      summary.balanceForward.cash = summary.cash - expenseSummary.cash;
      summary.balanceForward.bank = summary.bank - expenseSummary.bank;
      summary.balanceForward.mobileMoney = summary.mobileMoney - expenseSummary.mobileMoney;
    }

    setFinancialSummary(summary);
  };

  const handleDepositSubmit = async () => {
    if (!amountPaid || !modeOfPayment || !purpose) {
      alert("Please fill in all required fields.");
      return;
    }

    const depositData: any = {
      amount_paid: amountPaid,
      mode_of_payment: modeOfPayment,
      amount_available: amountPaid,
      submittedby: "Admin",
      purpose: purpose
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
    setPurpose("");
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

  const fetchPaymentDetails = async (mode: string) => {
    setCurrentDetailsMode(mode);
    setLoading(true);
    
    try {
      let query = supabase
        .from('finance')
        .select('amount_paid, created_at, submittedby, purpose, bank_name, mode_of_mobilemoney')
        .eq('mode_of_payment', mode)
        .order('created_at', { ascending: false });

      const { data: deposits, error: depositError } = await query;

      if (depositError) throw depositError;

      const { data: expenses, error: expenseError } = await supabase
        .from('expenses')
        .select('item, amount_spent, date, department, submittedby, account')
        .eq('mode_of_payment', mode)
        .order('date', { ascending: false });

      if (expenseError) throw expenseError;

      setDepositDetails(deposits || []);
      setExpenseDetails(expenses || []);
      setDetailsDialogOpen(true);
    } catch (error) {
      console.error('Error fetching payment details:', error);
      alert('Failed to load payment details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDetails = () => {
    const depositsCSV = [
      ['Amount', 'Date', 'Submitted By', 'Purpose', 
       currentDetailsMode === 'Bank' ? 'Bank Name' : '', 
       currentDetailsMode === 'Mobile Money' ? 'Provider' : '']
      .filter(Boolean).join(','),
      ...depositDetails.map(deposit => [
        deposit.amount_paid,
        new Date(deposit.created_at).toLocaleDateString(),
        deposit.submittedby,
        deposit.purpose,
        currentDetailsMode === 'Bank' ? deposit.bank_name : '',
        currentDetailsMode === 'Mobile Money' ? deposit.mode_of_mobilemoney : ''
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const expensesCSV = [
      ['Item', 'Amount', 'Date', 'Department', 'Submitted By', 'Account'].join(','),
      ...expenseDetails.map(expense => [
        expense.item,
        expense.amount_spent,
        new Date(expense.date).toLocaleDateString(),
        expense.department,
        expense.submittedby,
        expense.account
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const depositsBlob = new Blob([depositsCSV], { type: 'text/csv' });
    const expensesBlob = new Blob([expensesCSV], { type: 'text/csv' });

    const depositsUrl = URL.createObjectURL(depositsBlob);
    const expensesUrl = URL.createObjectURL(expensesBlob);

    const depositsLink = document.createElement('a');
    depositsLink.href = depositsUrl;
    depositsLink.download = `${currentDetailsMode}_deposits.csv`;
    document.body.appendChild(depositsLink);
    depositsLink.click();
    document.body.removeChild(depositsLink);

    const expensesLink = document.createElement('a');
    expensesLink.href = expensesUrl;
    expensesLink.download = `${currentDetailsMode}_expenses.csv`;
    document.body.appendChild(expensesLink);
    expensesLink.click();
    document.body.removeChild(expensesLink);

    URL.revokeObjectURL(depositsUrl);
    URL.revokeObjectURL(expensesUrl);
  };

  useEffect(() => {
    fetchAllLedgerEntries();
  }, []);

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Button 
        onClick={() => setIsModalOpen(true)}
        className="mb-6 bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
      >
        <span>➕</span>
        <span>Make Deposit</span>
      </Button>

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
                  <TableHead className="font-medium">Purpose</TableHead>
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
                      <TableCell>{entry.purpose || "-"}</TableCell>
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
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No deposit records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
              <Input
                type="text"
                placeholder="Enter deposit purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </div>
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

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="rounded-lg max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>📊</span>
              <span>{currentDetailsMode} Cash Flow Details</span>
            </DialogTitle>
            <DialogDescription className="flex justify-between items-center">
              <span>Deposits and expenses for {currentDetailsMode.toLowerCase()}</span>
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={handleDownloadDetails}
              >
                <span>↓</span>
                Download CSV
              </Button>
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Deposits</h3>
                {depositDetails.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead>Amount</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Submitted By</TableHead>
                          <TableHead>Purpose</TableHead>
                          {currentDetailsMode === "Bank" && <TableHead>Bank Name</TableHead>}
                          {currentDetailsMode === "Mobile Money" && <TableHead>Provider</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {depositDetails.map((deposit, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono">{formatCurrency(deposit.amount_paid)}</TableCell>
                            <TableCell>{new Date(deposit.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>{deposit.submittedby}</TableCell>
                            <TableCell>{deposit.purpose}</TableCell>
                            {currentDetailsMode === "Bank" && <TableCell>{deposit.bank_name}</TableCell>}
                            {currentDetailsMode === "Mobile Money" && <TableCell>{deposit.mode_of_mobilemoney}</TableCell>}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-gray-500">No deposits found</p>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Expenses</h3>
                {expenseDetails.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Submitted By</TableHead>
                          <TableHead>Account</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenseDetails.map((expense, index) => (
                          <TableRow key={index}>
                            <TableCell>{expense.item}</TableCell>
                            <TableCell className="font-mono">{formatCurrency(expense.amount_spent)}</TableCell>
                            <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                            <TableCell>{expense.department}</TableCell>
                            <TableCell>{expense.submittedby}</TableCell>
                            <TableCell>{expense.account}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-gray-500">No expenses found</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
