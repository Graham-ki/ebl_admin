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
import { ChevronDown, ChevronRight } from "lucide-react";

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

interface MaterialTransaction {
  id: string;
  date: string;
  type: "inflow" | "outflow";
  quantity: number;
  action: string;
  material_id: string;
  material_name: string;
}

interface OutflowFormData {
  material_id: string;
  action: "Damaged" | "Sold" | "Used in production";
  quantity: number;
  date: string;
}

const CATEGORIES = ["Labels", "Bottles", "Spirit", "Boxes", "Flavor"];

const MaterialsPage = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [isOutflowDialogOpen, setIsOutflowDialogOpen] = useState(false);
  const [viewMaterial, setViewMaterial] = useState<Material | null>(null);
  const [allTransactions, setAllTransactions] = useState<MaterialTransaction[]>([]);
  const [materialQuantities, setMaterialQuantities] = useState<Record<string, number>>({});
  const [newMaterial, setNewMaterial] = useState<Omit<Material, "id">>({
    name: "",
    quantity_available: 0,
    category: "Labels",
  });
  const [outflowForm, setOutflowForm] = useState<OutflowFormData>({
    material_id: "",
    action: "Damaged",
    quantity: 0,
    date: new Date().toISOString().split("T")[0],
  });
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch materials
      const { data: materialsData, error: materialsError } = await supabase
        .from("materials")
        .select("id, name, quantity_available, category")
        .order("name", { ascending: true });
      if (materialsError) throw materialsError;

      // Fetch deliveries with supply items
      const { data: deliveriesData, error: deliveriesError } = await supabase
        .from("deliveries")
        .select("id, supply_item_id, quantity, delivery_date");
      if (deliveriesError) throw deliveriesError;

      const { data: supplyItemsData, error: supplyItemsError } = await supabase
        .from("supply_items")
        .select("id, name");
      if (supplyItemsError) throw supplyItemsError;

      // Fetch outflows
      const { data: outflows, error: outflowError } = await supabase
        .from("material_entries")
        .select("id, material_id, quantity, action, date");
      if (outflowError) throw outflowError;

      // Build inflow transactions from deliveries
      const inflowTransactions: MaterialTransaction[] = (deliveriesData || []).map(delivery => {
        const supplyItem = supplyItemsData?.find(si => si.id === delivery.supply_item_id);
        const material = materialsData?.find(m => m.name === supplyItem?.name);
        return {
          id: delivery.id,
          date: new Date(delivery.delivery_date).toLocaleDateString(),
          type: "inflow",
          quantity: delivery.quantity,
          action: "Delivered",
          material_id: material?.id || "",
          material_name: material?.name || supplyItem?.name || "",
        };
      }).filter(t => t.material_id); // remove unmatched

      // Build outflow transactions
      const outflowTransactions: MaterialTransaction[] = (outflows || []).map(entry => ({
        id: entry.id,
        date: new Date(entry.date).toLocaleDateString(),
        type: "outflow",
        quantity: entry.quantity,
        action: entry.action,
        material_id: entry.material_id,
        material_name: materialsData?.find(m => m.id === entry.material_id)?.name || "",
      }));

      // Combine
      const combinedTransactions = [...inflowTransactions, ...outflowTransactions];
      setAllTransactions(combinedTransactions);

      // Calculate quantities
      const quantities: Record<string, number> = {};
      materialsData?.forEach(material => {
        const materialTransactions = combinedTransactions.filter(t => t.material_id === material.id);
        const totalInflow = materialTransactions.filter(t => t.type === "inflow")
          .reduce((sum, t) => sum + t.quantity, 0);
        const totalOutflow = materialTransactions.filter(t => t.type === "outflow")
          .reduce((sum, t) => sum + t.quantity, 0);
        quantities[material.id] = totalInflow - totalOutflow;
      });

      setMaterialQuantities(quantities);
      setMaterials(materialsData || {});

      // Expand categories by default
      const expanded: Record<string, boolean> = {};
      CATEGORIES.forEach(c => expanded[c] = true);
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
    if (error) return alert("Failed to add material");
    setIsAdding(false);
    setNewMaterial({ name: "", quantity_available: 0, category: "Labels" });
    fetchAllData();
  };

  const handleRecordOutflow = async () => {
    if (!outflowForm.material_id || outflowForm.quantity <= 0) {
      return alert("Please fill all required fields");
    }
    const { error } = await supabase.from("material_entries").insert([outflowForm]);
    if (error) return alert("Failed to record outflow");
    setIsOutflowDialogOpen(false);
    setOutflowForm({
      material_id: "",
      action: "Damaged",
      quantity: 0,
      date: new Date().toISOString().split("T")[0],
    });
    fetchAllData();
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    await supabase.from("material_entries").delete().eq("material_id", id);
    await supabase.from("materials").delete().eq("id", id);
    fetchAllData();
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const getMaterialsByCategory = (cat: string) =>
    materials.filter(m => m.category === cat);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Materials Inventory</h1>

      <div className="mb-6 flex justify-between">
        <span>Total Materials: {materials.length}</span>
        <Button onClick={() => setIsAdding(true)}>Add Material</Button>
      </div>

      {loading ? <div>Loading...</div> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {CATEGORIES.map(cat => {
              const catMats = getMaterialsByCategory(cat);
              if (!catMats.length) return null;
              return (
                <div key={cat}>
                  <TableRow onClick={() => toggleCategory(cat)} className="cursor-pointer">
                    <TableCell className="font-bold flex items-center">
                      {expandedCategories[cat] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      {cat}
                    </TableCell>
                    <TableCell className="text-right">
                      {catMats.reduce((sum, m) => sum + (materialQuantities[m.id] || 0), 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); setViewMaterial({ id: cat, name: cat, category: cat, quantity_available: 0 }); setIsViewDetailsOpen(true); }}>
                        View All
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedCategories[cat] && catMats.map(mat => (
                    <TableRow key={mat.id} className="bg-gray-50">
                      <TableCell className="pl-8">{mat.name}</TableCell>
                      <TableCell className="text-right">{materialQuantities[mat.id] || 0}</TableCell>
                      <TableCell className="text-right flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setViewMaterial(mat); setIsViewDetailsOpen(true); }}>Details</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteMaterial(mat.id)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </div>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Add Material Dialog */}
      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Material</DialogTitle></DialogHeader>
          <Input placeholder="Material Name" value={newMaterial.name} onChange={e => setNewMaterial({ ...newMaterial, name: e.target.value })} />
          <Select value={newMaterial.category} onValueChange={v => setNewMaterial({ ...newMaterial, category: v })}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
            <Button onClick={handleAddMaterial}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Outflow Dialog */}
      <Dialog open={isOutflowDialogOpen} onOpenChange={setIsOutflowDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Outflow</DialogTitle></DialogHeader>
          <Select value={outflowForm.action} onValueChange={v => setOutflowForm({ ...outflowForm, action: v as any })}>
            <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Damaged">Damaged</SelectItem>
              <SelectItem value="Sold">Sold</SelectItem>
              <SelectItem value="Used in production">Used in production</SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" value={outflowForm.quantity} onChange={e => setOutflowForm({ ...outflowForm, quantity: Number(e.target.value) })} />
          <Input type="date" value={outflowForm.date} onChange={e => setOutflowForm({ ...outflowForm, date: e.target.value })} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOutflowDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRecordOutflow}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MaterialsPage;
