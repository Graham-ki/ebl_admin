"use client";

import { useState, useEffect } from "react";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { createClient } from "@supabase/supabase-js";
import { ChevronDown, ChevronRight, Edit, Trash2, Plus, RefreshCw } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Material {
  id: string;
  name: string;
  quantity_available: number;
  category: string;
}

type TransactionType = "inflow" | "outflow" | "opening_stock";

interface MaterialTransaction {
  id: string;
  date: string;
  type: TransactionType;
  quantity: number;
  action: string;
  material_id: string;
  material_name: string;
}

interface OpeningStockRecord {
  id: string;
  material_id: string;
  date: string;
  quantity: number;
}

interface OutflowFormData {
  id?: string;
  material_id: string;
  action: "Damaged" | "Sold" | "Used in production";
  quantity: number;
  date: string;
}

interface OpeningStockFormData {
  id?: string;
  material_id: string;
  quantity: number;
  date: string;
}

const CATEGORIES = ["Labels", "Bottles", "Spirit", "Boxes", "Flavor"];

const MaterialsPage = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [isOutflowDialogOpen, setIsOutflowDialogOpen] = useState(false);
  const [isOpeningStockDialogOpen, setIsOpeningStockDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [viewMaterial, setViewMaterial] = useState<Material | null>(null);
  const [allTransactions, setAllTransactions] = useState<MaterialTransaction[]>([]);
  const [openingStocks, setOpeningStocks] = useState<OpeningStockRecord[]>([]);
  const [materialQuantities, setMaterialQuantities] = useState<Record<string, number>>({});
  const [newMaterial, setNewMaterial] = useState<Omit<Material, "id">>({
    name: "",
    quantity_available: 0,
    category: "Labels",
  });
  const [editMaterial, setEditMaterial] = useState<Material | null>(null);
  const [outflowForm, setOutflowForm] = useState<OutflowFormData>({
    material_id: "",
    action: "Damaged",
    quantity: 0,
    date: new Date().toISOString().split("T")[0],
  });
  const [openingStockForm, setOpeningStockForm] = useState<OpeningStockFormData>({
    material_id: "",
    quantity: 0,
    date: new Date().toISOString().split("T")[0],
  });
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<Date>(new Date());
  const [editingTransaction, setEditingTransaction] = useState<MaterialTransaction | null>(null);
  const [editingOpeningStock, setEditingOpeningStock] = useState<OpeningStockRecord | null>(null);

  useEffect(() => {
    console.log("Component mounted, fetching data...");
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    console.log("=== STARTING DATA FETCH ===");
    
    try {
      // Fetch materials
      const { data: materialsData = [], error: materialsError } = await supabase
        .from("materials")
        .select("id, name, quantity_available, category")
        .order("name", { ascending: true });
      
      if (materialsError) {
        console.error("Error fetching materials:", materialsError);
        throw materialsError;
      }
      console.log("Materials fetched:", materialsData);

      // Fetch deliveries (inflows) with 'Stock' notes
      console.log("Fetching deliveries with 'Stock' notes...");
      const { data: deliveriesData = [], error: deliveriesError } = await supabase
        .from("deliveries")
        .select("id, material_id, quantity, delivery_date, notes")
        .eq("notes", "Stock");
      
      if (deliveriesError) {
        console.error("Error fetching deliveries:", deliveriesError);
        throw deliveriesError;
      }
      

      // Fetch outflows - convert negative values to positive
      const { data: outflows = [], error: outflowError } = await supabase
        .from("material_entries")
        .select("id, material_id, quantity, action, date");
      
      if (outflowError) {
        console.error("Error fetching outflows:", outflowError);
        throw outflowError;
      }
      
      // Convert negative outflow quantities to positive
      const processedOutflows = outflows.map(outflow => ({
        ...outflow,
        quantity: Math.abs(outflow.quantity) // Convert negative values to positive
      }));

      // Fetch opening stocks
      console.log("Fetching opening stocks...");
      const { data: openingStocksData = [], error: openingStocksError } = await supabase
        .from("opening_stocks")
        .select("id, material_id, quantity, date")
        .order("date", { ascending: false });
      
      if (openingStocksError) {
        console.error("Error fetching opening stocks:", openingStocksError);
        throw openingStocksError;
      }
      

      setOpeningStocks(openingStocksData);

      // Process transactions
      const inflowTransactions: MaterialTransaction[] = deliveriesData
        .map(delivery => {
          const material = materialsData.find(m => m.id === delivery.material_id);
          if (!material) {
            console.warn("No material found for delivery:", delivery);
            return null;
          }
          return {
            id: delivery.id,
            date: new Date(delivery.delivery_date).toISOString().split("T")[0],
            type: "inflow",
            quantity: delivery.quantity ?? 0,
            action: "Delivered (Stock)",
            material_id: material.id,
            material_name: material.name,
          };
        })
        .filter((t): t is MaterialTransaction => t !== null);

      const outflowTransactions: MaterialTransaction[] = processedOutflows.map(entry => ({
        id: entry.id,
        date: new Date(entry.date).toISOString().split("T")[0],
        type: "outflow",
        quantity: entry.quantity ?? 0,
        action: entry.action ?? "",
        material_id: entry.material_id,
        material_name: materialsData.find(m => m.id === entry.material_id)?.name || "Unknown Material",
      }));

      const openingStockTransactions: MaterialTransaction[] = openingStocksData.map(record => ({
        id: record.id,
        date: record.date,
        type: "opening_stock",
        quantity: record.quantity,
        action: "Opening Stock",
        material_id: record.material_id,
        material_name: materialsData.find(m => m.id === record.material_id)?.name || "Unknown Material",
      }));

      const combinedTransactions = [...openingStockTransactions, ...inflowTransactions, ...outflowTransactions];
      setAllTransactions(combinedTransactions);
      

      // Calculate current quantities with corrected logic
      const quantities: Record<string, number> = {};
      
      materialsData.forEach(material => {
        // Calculate total inflow (opening stock + deliveries with 'Stock' notes)
        const materialOpeningStocks = openingStocksData.filter(os => os.material_id === material.id);
        const openingStock = materialOpeningStocks.reduce((sum, os) => sum + (os.quantity || 0), 0);
       
        // Get all deliveries for this material
        const materialDeliveries = deliveriesData.filter(d => d.material_id === material.id);
        const totalDeliveries = materialDeliveries.reduce((sum, d) => sum + (d.quantity || 0), 0);
        
        // Total inflow = opening stock + deliveries
        const totalInflow = openingStock + totalDeliveries;
      
        // Calculate total outflow (from material_entries) - using absolute values
        const materialOutflows = processedOutflows.filter(o => o.material_id === material.id);
        const totalOutflow = materialOutflows.reduce((sum, o) => sum + (o.quantity || 0), 0);
        
        // Current quantity = inflow - outflow
        quantities[material.id] = totalInflow - totalOutflow;
      });

      setMaterialQuantities(quantities);
      setMaterials(materialsData);

      // Initialize expanded categories
      const expanded: Record<string, boolean> = {};
      CATEGORIES.forEach(c => (expanded[c] = true));
      setExpandedCategories(expanded);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = async () => {
    if (!newMaterial.name) return alert("Please enter a material name");
    
    const { error } = await supabase.from("materials").insert([newMaterial]);
    if (error) {
      console.error("Failed to add material:", error);
      return alert("Failed to add material");
    }
    setIsAdding(false);
    setNewMaterial({ name: "", quantity_available: 0, category: "Labels" });
    fetchAllData();
  };

  const handleEditMaterial = async () => {
    if (!editMaterial?.name) return alert("Please enter a material name");
    
    const { error } = await supabase
      .from("materials")
      .update({
        name: editMaterial.name,
        category: editMaterial.category
      })
      .eq("id", editMaterial.id);
    
    if (error) {
      console.error("Failed to update material:", error);
      return alert("Failed to update material");
    }
    
    setIsEditing(false);
    setEditMaterial(null);
    fetchAllData();
  };

  const handleRecordOutflow = async () => {
    if (!outflowForm.material_id || outflowForm.quantity <= 0) {
      return alert("Please fill all required fields");
    }
    
    // If we're editing an existing outflow
    if (outflowForm.id) {
      const { error } = await supabase
        .from("material_entries")
        .update({
          material_id: outflowForm.material_id,
          action: outflowForm.action,
          quantity: outflowForm.quantity,
          date: outflowForm.date
        })
        .eq("id", outflowForm.id);
      
      if (error) {
        console.error("Failed to update outflow:", error);
        return alert("Failed to update outflow");
      }
    } else {
      // Creating a new outflow
      const { error } = await supabase.from("material_entries").insert([{
        material_id: outflowForm.material_id,
        action: outflowForm.action,
        quantity: outflowForm.quantity,
        date: outflowForm.date
      }]);
      
      if (error) {
        console.error("Failed to record outflow:", error);
        return alert("Failed to record outflow");
      }
    }
    
    setIsOutflowDialogOpen(false);
    setOutflowForm({
      material_id: "",
      action: "Damaged",
      quantity: 0,
      date: new Date().toISOString().split("T")[0],
    });
    fetchAllData();
  };

  const handleRecordOpeningStock = async () => {
    if (!openingStockForm.material_id || openingStockForm.quantity < 0) {
      return alert("Please fill all required fields");
    }

    // If we're editing an existing opening stock
    if (openingStockForm.id) {
      const { error } = await supabase
        .from("opening_stocks")
        .update({
          material_id: openingStockForm.material_id,
          quantity: openingStockForm.quantity,
          date: openingStockForm.date
        })
        .eq("id", openingStockForm.id);
      
      if (error) {
        console.error("Failed to update opening stock:", error);
        return alert("Failed to update opening stock");
      }
    } else {
      // Check if opening stock already exists for this material and date
      const { data: existingRecord, error: checkError } = await supabase
        .from("opening_stocks")
        .select("*")
        .eq("material_id", openingStockForm.material_id)
        .eq("date", openingStockForm.date)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking existing records:", checkError);
        return alert("Error checking existing records");
      }
      if (existingRecord) {
        return alert("Opening stock already recorded for this material on selected date");
      }

      const { error } = await supabase.from("opening_stocks").insert([{
        material_id: openingStockForm.material_id,
        quantity: openingStockForm.quantity,
        date: openingStockForm.date
      }]);
      
      if (error) {
        console.error("Failed to record opening stock:", error);
        return alert("Failed to record opening stock");
      }
    }
    
    setIsOpeningStockDialogOpen(false);
    setOpeningStockForm({
      material_id: "",
      quantity: 0,
      date: new Date().toISOString().split("T")[0],
    });
    fetchAllData();
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm("Are you sure you want to delete this material?")) return;
    
    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete material:", error);
      return alert("Failed to delete material");
    }
    
    fetchAllData();
  };

  const handleDeleteTransaction = async (id: string, type: TransactionType) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    
    let tableName = "";
    switch(type) {
      case "inflow":
        tableName = "deliveries";
        break;
      case "outflow":
        tableName = "material_entries";
        break;
      case "opening_stock":
        tableName = "opening_stocks";
        break;
    }
    
    if (!tableName) return;
    
    const { error } = await supabase.from(tableName).delete().eq("id", id);
    if (error) {
      console.error("Failed to delete transaction:", error);
      return alert("Failed to delete transaction");
    }
    
    fetchAllData();
  };

  const handleDeleteOpeningStock = async (id: string) => {
    if (!confirm("Are you sure you want to delete this opening stock record?")) return;
    
    const { error } = await supabase.from("opening_stocks").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete opening stock:", error);
      return alert("Failed to delete opening stock");
    }
    
    fetchAllData();
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const getMaterialsByCategory = (cat: string) =>
    materials.filter(m => m.category === cat);

  const getMaterialTransactions = (materialId: string) => {
    return allTransactions.filter(t => t.material_id === materialId);
  };

  const getCategoryTransactions = (category: string) => {
    const categoryMaterials = materials.filter(m => m.category === category);
    return allTransactions.filter(t => 
      categoryMaterials.some(m => m.id === t.material_id)
    );
  };

  const calculateOpeningStock = (materialId: string, date: string) => {
    // Find the most recent opening stock before the given date
    const previousOpeningStocks = openingStocks
      .filter(record => record.material_id === materialId && record.date < date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const mostRecentOpeningStock = previousOpeningStocks[0]?.quantity || 0;
    const mostRecentOpeningStockDate = previousOpeningStocks[0]?.date || "";

    // Get all transactions between the most recent opening stock date and the target date
    const relevantTransactions = allTransactions.filter(t => 
      t.material_id === materialId && 
      t.date >= mostRecentOpeningStockDate && 
      t.date < date
    );

    const totalInflow = relevantTransactions
      .filter(t => t.type === "inflow" || t.type === "opening_stock")
      .reduce((sum, t) => sum + (t.quantity || 0), 0);
    
    const totalOutflow = relevantTransactions
      .filter(t => t.type === "outflow")
      .reduce((sum, t) => sum + (t.quantity || 0), 0);

    const result = mostRecentOpeningStock + totalInflow - totalOutflow;
    
    return result;
  };

  const viewHistoryForDate = async () => {
    setIsHistoryDialogOpen(true);
  };

  const openEditTransactionDialog = (transaction: MaterialTransaction) => {
    setEditingTransaction(transaction);
    
    if (transaction.type === "outflow") {
      setOutflowForm({
        id: transaction.id,
        material_id: transaction.material_id,
        action: transaction.action as OutflowFormData["action"],
        quantity: transaction.quantity,
        date: transaction.date
      });
      setIsOutflowDialogOpen(true);
    } else if (transaction.type === "opening_stock") {
      setOpeningStockForm({
        id: transaction.id,
        material_id: transaction.material_id,
        quantity: transaction.quantity,
        date: transaction.date
      });
      setIsOpeningStockDialogOpen(true);
    }
    // Note: Inflows are from deliveries table which might have a different structure
  };

  const openEditOpeningStockDialog = (record: OpeningStockRecord) => {
    setEditingOpeningStock(record);
    setOpeningStockForm({
      id: record.id,
      material_id: record.material_id,
      quantity: record.quantity,
      date: record.date
    });
    setIsOpeningStockDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Materials Inventory</h1>

      <div className="mb-6 flex justify-between items-center">
        <span>Total Materials: {materials.length}</span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => viewHistoryForDate()}>
            View Opening Stock History
          </Button>
          <Button onClick={() => setIsAdding(true)}>
            <Plus size={16} className="mr-1" /> Add Material
          </Button>
          <Button variant="outline" onClick={() => {
            console.log("Manual refresh triggered");
            fetchAllData();
          }}>
            <RefreshCw size={16} className="mr-1" /> Refresh Data
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="text-right font-semibold">Quantity</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CATEGORIES.map(cat => {
                const catMats = getMaterialsByCategory(cat);
                if (!catMats.length) return null;
                return (
                  <>
                    <TableRow key={`${cat}-header`} onClick={() => toggleCategory(cat)} className="cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <TableCell className="font-bold flex items-center">
                        {expandedCategories[cat] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        {cat}
                      </TableCell>
                      <TableCell className="text-right">
                        {catMats.reduce((sum, m) => sum + (materialQuantities[m.id] || 0), 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={e => {
                            e.stopPropagation();
                            setViewMaterial({ id: cat, name: cat, category: cat, quantity_available: 0 });
                            setIsViewDetailsOpen(true);
                          }}
                        >
                          View All
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedCategories[cat] &&
                      catMats.map(mat => (
                        <TableRow key={mat.id} className="hover:bg-gray-50">
                          <TableCell className="pl-8">{mat.name}</TableCell>
                          <TableCell className="text-right font-medium">{materialQuantities[mat.id] || 0}</TableCell>
                          <TableCell className="text-right flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewMaterial(mat);
                                setIsViewDetailsOpen(true);
                              }}
                            >
                              Details
                            </Button>
                            <Button 
                              size="sm" 
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditMaterial(mat);
                                setIsEditing(true);
                              }}
                            >
                              <Edit size={16} />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpeningStockForm({
                                  ...openingStockForm,
                                  material_id: mat.id,
                                  date: new Date().toISOString().split("T")[0],
                                });
                                setIsOpeningStockDialogOpen(true);
                              }}
                            >
                              Record Opening
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMaterial(mat.id);
                              }}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Material Dialog */}
      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Material</DialogTitle></DialogHeader>
          <Input placeholder="Material Name" value={newMaterial.name} onChange={e => setNewMaterial({ ...newMaterial, name: e.target.value })} />
          <Select value={newMaterial.category} onValueChange={v => setNewMaterial({ ...newMaterial, category: v as Material["category"] })}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
            <Button onClick={handleAddMaterial}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Material Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Material</DialogTitle></DialogHeader>
          <Input 
            placeholder="Material Name" 
            value={editMaterial?.name || ""} 
            onChange={e => setEditMaterial(prev => prev ? {...prev, name: e.target.value} : null)} 
          />
          <Select 
            value={editMaterial?.category || "Labels"} 
            onValueChange={v => setEditMaterial(prev => prev ? {...prev, category: v as Material["category"]} : null)}
          >
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button onClick={handleEditMaterial}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {viewMaterial?.id === viewMaterial?.category ? 
                `All ${viewMaterial?.category} Transactions` : 
                `${viewMaterial?.name} Details`}
            </DialogTitle>
            <DialogDescription>
              {viewMaterial?.id === viewMaterial?.category ? 
                `Showing all transactions for ${viewMaterial?.category} category` : 
                `Showing details for ${viewMaterial?.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(viewMaterial?.id === viewMaterial?.category ? 
                  getCategoryTransactions(viewMaterial?.category || "") : 
                  getMaterialTransactions(viewMaterial?.id || ""))
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                      <TableCell className="capitalize">{transaction.type.replace("_", " ")}</TableCell>
                      <TableCell>{transaction.quantity}</TableCell>
                      <TableCell>{transaction.action}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditTransactionDialog(transaction)}
                            disabled={transaction.type === "inflow"} // Disable edit for inflows for now
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteTransaction(transaction.id, transaction.type)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="gap-2">
            {viewMaterial?.id !== viewMaterial?.category && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsOutflowDialogOpen(true);
                    setOutflowForm({
                      ...outflowForm,
                      material_id: viewMaterial?.id || "",
                      date: new Date().toISOString().split("T")[0],
                    });
                  }}
                >
                  Record Outflow
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    setIsOpeningStockDialogOpen(true);
                    setOpeningStockForm({
                      material_id: viewMaterial?.id || "",
                      quantity: calculateOpeningStock(viewMaterial?.id || "", new Date().toISOString().split("T")[0]),
                      date: new Date().toISOString().split("T")[0],
                    });
                  }}
                >
                  Record Opening Stock
                </Button>
              </>
            )}
            <Button onClick={() => setIsViewDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Opening Stock Dialog */}
      <Dialog open={isOpeningStockDialogOpen} onOpenChange={setIsOpeningStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {openingStockForm.id ? "Edit Opening Stock" : "Record Opening Stock"}
            </DialogTitle>
            <DialogDescription>
              {openingStockForm.id 
                ? "Edit the opening stock quantity for a material" 
                : "Record the opening stock quantity for a material on a specific date"}
            </DialogDescription>
          </DialogHeader>
          <Select 
            value={openingStockForm.material_id}
            onValueChange={v => setOpeningStockForm({ ...openingStockForm, material_id: v })}
            disabled={!!openingStockForm.id} // Disable material selection when editing
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Material" />
            </SelectTrigger>
            <SelectContent>
              {materials.map(material => (
                <SelectItem key={material.id} value={material.id}>{material.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input 
            type="number" 
            placeholder="Quantity" 
            value={openingStockForm.quantity} 
            onChange={e => setOpeningStockForm({ ...openingStockForm, quantity: Number(e.target.value) })} 
          />
          <Input 
            type="date" 
            value={openingStockForm.date} 
            onChange={e => setOpeningStockForm({ ...openingStockForm, date: e.target.value })} 
            disabled={!!openingStockForm.id} // Disable date change when editing
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsOpeningStockDialogOpen(false);
              setOpeningStockForm({
                material_id: "",
                quantity: 0,
                date: new Date().toISOString().split("T")[0],
              });
            }}>Cancel</Button>
            <Button onClick={handleRecordOpeningStock}>
              {openingStockForm.id ? "Update" : "Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Outflow Dialog */}
      <Dialog open={isOutflowDialogOpen} onOpenChange={setIsOutflowDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {outflowForm.id ? "Edit Outflow" : "Record Outflow"}
            </DialogTitle>
          </DialogHeader>
          <Select 
            value={outflowForm.material_id}
            onValueChange={v => setOutflowForm({ ...outflowForm, material_id: v })}
            disabled={!!outflowForm.id} // Disable material selection when editing
          >
            <SelectTrigger><SelectValue placeholder="Select Material" /></SelectTrigger>
            <SelectContent>
              {materials.map(material => (
                <SelectItem key={material.id} value={material.id}>{material.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={outflowForm.action} onValueChange={v => setOutflowForm({ ...outflowForm, action: v as OutflowFormData["action"] })}>
            <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Damaged">Damaged</SelectItem>
              <SelectItem value="Used in production">Used in production</SelectItem>
            </SelectContent>
          </Select>
          <Input 
            type="number" 
            placeholder="Quantity" 
            value={outflowForm.quantity} 
            onChange={e => setOutflowForm({ ...outflowForm, quantity: Number(e.target.value) })} 
          />
          <Input 
            type="date" 
            value={outflowForm.date} 
            onChange={e => setOutflowForm({ ...outflowForm, date: e.target.value })} 
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsOutflowDialogOpen(false);
              setOutflowForm({
                material_id: "",
                action: "Damaged",
                quantity: 0,
                date: new Date().toISOString().split("T")[0],
              });
            }}>Cancel</Button>
            <Button onClick={handleRecordOutflow}>
              {outflowForm.id ? "Update" : "Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Opening Stock History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Opening Stock History</DialogTitle>
            <DialogDescription>
              View opening stock records by date
            </DialogDescription>
          </DialogHeader>
          <div className="mb-4">
            <Input 
              type="date" 
              value={selectedHistoryDate.toISOString().split('T')[0]}
              onChange={e => setSelectedHistoryDate(new Date(e.target.value))}
            />
            <Button 
              className="mt-2"
              onClick={() => viewHistoryForDate()}
            >
              View Records
            </Button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Opening Stock</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openingStocks
                  .filter(record => record.date === selectedHistoryDate.toISOString().split("T")[0])
                  .map(record => {
                    const material = materials.find(m => m.id === record.material_id);
                    return (
                      <TableRow key={record.id}>
                        <TableCell>{material?.name || "Unknown Material"}</TableCell>
                        <TableCell>{material?.category || "Unknown"}</TableCell>
                        <TableCell className="text-right">{record.quantity}</TableCell>
                        <TableCell>{record.date}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditOpeningStockDialog(record)}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteOpeningStock(record.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsHistoryDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MaterialsPage;
