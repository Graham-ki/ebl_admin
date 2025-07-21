"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Material {
  id?: string;
  name: string;
  amount_available: number;
  unit: number;
  cost: string;
  amount_used?: number;
}

interface MaterialMovement {
  date: string;
  inflow: number;
  outflow: number;
  damages: number;
  balance: number;
}

interface MaterialEntry {
  id: number;
  material_id: string;
  quantity: number;
  damage: number;
  action: string;
  date: string;
  created_by: string;
}

const MaterialsPage = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMaterial, setEditMaterial] = useState<Material | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [viewMaterial, setViewMaterial] = useState<Material | null>(null);
  const [materialMovements, setMaterialMovements] = useState<MaterialMovement[]>([]);
  const [materialEntries, setMaterialEntries] = useState<MaterialEntry[]>([]);
  const [filter, setFilter] = useState("all");
  const [customDate, setCustomDate] = useState("");

  const [newMaterial, setNewMaterial] = useState<Material>({
    name: "",
    amount_available: 0,
    unit: 0,
    cost: "",
  });

  useEffect(() => {
    fetchMaterials();
    fetchMaterialEntries();
  }, [filter, customDate]);

  const fetchMaterials = async () => {
    setLoading(true);
    const { data: materialsData, error } = await supabase
      .from("materials")
      .select("id, amount_available, unit, name, cost");
    if (error) {
      console.error("Error fetching materials:", error);
    } else {
      setMaterials(materialsData || []);
    }
    setLoading(false);
  };

  const fetchMaterialEntries = async () => {
    let query = supabase
      .from("material_entries")
      .select("id, material_id, quantity, damage, action, date, created_by");

    if (filter === "daily") {
      const today = new Date().toISOString().split("T")[0];
      query = query.gte("date", today);
    } else if (filter === "monthly") {
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      query = query.gte("date", firstDayOfMonth.toISOString());
    } else if (filter === "yearly") {
      const firstDayOfYear = new Date(new Date().getFullYear(), 0, 1);
      query = query.gte("date", firstDayOfYear.toISOString());
    } else if (filter === "custom" && customDate) {
      query = query.eq("date", customDate);
    }

    const { data: entries, error: entriesError } = await query;
    if (entriesError) {
      console.error("Error fetching material entries:", entriesError);
      return;
    }

    const materialIds = [...new Set(entries.map((entry) => entry.material_id))];
    const { data: materials, error: materialsError } = await supabase
      .from("materials")
      .select("id, name")
      .in("id", materialIds);

    if (materialsError) {
      console.error("Error fetching materials:", materialsError);
      return;
    }

    const mergedEntries = entries.map((entry) => ({
      ...entry,
      material_name: materials.find((m) => m.id === entry.material_id)?.name || "Unknown",
    }));

    setMaterialEntries(mergedEntries);
  };

  const handleAddMaterial = async () => {
    const { name, amount_available, unit, cost } = newMaterial;
    if (!name || amount_available < 0 || unit < 0) {
      alert("Please enter valid details.");
      return;
    }

    const { error } = await supabase.from("materials").insert([{ name, amount_available, unit, cost }]);
    if (error) {
      console.error("Error adding material:", error);
      alert("Failed to add material.");
      return;
    }

    setIsAdding(false);
    setNewMaterial({ name: "", amount_available: 0, unit: 0, cost: "" });
    fetchMaterials();
    alert("✅ Material added successfully!");
  };

  const handleEditMaterial = (material: Material) => {
    setEditMaterial(material);
    setIsEditing(true);
  };

  const handleUpdateMaterial = async () => {
    if (!editMaterial) return;

    const { id, name, amount_available, unit, cost } = editMaterial;
    const { error } = await supabase
      .from("materials")
      .update({ name, amount_available, unit, cost })
      .eq("id", id);

    if (error) {
      console.error("Error updating material:", error);
      alert("Failed to update material.");
      return;
    }

    setIsEditing(false);
    fetchMaterials();
    alert("✏️ Material updated successfully!");
  };

  const handleDeleteMaterial = async (id: string) => {
    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (error) {
      console.error("Error deleting material:", error);
      alert("Failed to delete material.");
      return;
    }
    fetchMaterials();
    alert("🗑️ Material deleted successfully!");
  };

  const handleViewDetails = async (material: Material) => {
    setViewMaterial(material);
    setIsViewDetailsOpen(true);

    // Fetch all entries for this material
    const { data: entries, error } = await supabase
      .from("material_entries")
      .select("*")
      .eq("material_id", material.id)
      .order("date", { ascending: true });

    if (error) {
      console.error("Error fetching material entries:", error);
      return;
    }

    // Calculate movements
    const movements: MaterialMovement[] = [];
    let balance = 0;

    entries?.forEach(entry => {
      const date = new Date(entry.date).toLocaleDateString();
      
      let inflow = 0;
      let outflow = 0;
      let damages = 0;

      if (entry.action === "Received from store") {
        inflow = entry.quantity;
        balance += inflow;
      } else if (entry.action === "Used in production" || entry.action === "Sold") {
        outflow = entry.quantity;
        damages = entry.damage || 0;
        balance -= (outflow + damages);
      }

      movements.push({
        date,
        inflow,
        outflow,
        damages,
        balance
      });
    });

    setMaterialMovements(movements);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-blue-200 to-purple-200 text-blue-900 p-4 rounded-xl shadow-md">
        📦 Materials Management
      </h1>

      <div className="flex justify-between mb-6">
        <Button onClick={() => setIsAdding(true)} className="bg-green-100 text-green-900 hover:bg-green-200">
          ➕ Add Material
        </Button>
      </div>

      {loading ? (
        <p className="text-center">Loading materials...</p>
      ) : (
        <Table className="rounded-xl border shadow-sm bg-white">
          <TableHeader>
            <TableRow className="bg-blue-50">
              <TableHead className="text-center">Name</TableHead>
              <TableHead className="text-center">Unit Cost(UGX)</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.length > 0 ? (
              materials.map((material) => (
                <TableRow key={material.id}>
                  <TableCell className="text-center">{material.name}</TableCell>
                  <TableCell className="text-center">{material.cost}</TableCell>
                  <TableCell className="text-center flex justify-center gap-2">
                    <Button size="sm" onClick={() => handleViewDetails(material)}>📄 Details</Button>
                    <Button size="sm" variant="secondary" onClick={() => handleEditMaterial(material)}>✏️ Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteMaterial(material.id!)}>🗑️ Delete</Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-4">No materials found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      {/* Add Material Dialog */}
      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>➕ Add New Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Material Name" value={newMaterial.name} onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })} />
            <Input placeholder="Unit Cost" value={newMaterial.cost} onChange={(e) => setNewMaterial({ ...newMaterial, cost: e.target.value })} />
            <Input type="number" placeholder="Amount Available" value={newMaterial.amount_available || ""} onChange={(e) => setNewMaterial({ ...newMaterial, amount_available: parseFloat(e.target.value) })} />
            <Input type="number" placeholder="Unit Per Box" value={newMaterial.unit || ""} onChange={(e) => setNewMaterial({ ...newMaterial, unit: parseFloat(e.target.value) })} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
            <Button onClick={handleAddMaterial}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Material Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>✏️ Edit Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Material Name" value={editMaterial?.name || ""} onChange={(e) => setEditMaterial({ ...editMaterial!, name: e.target.value })} />
            <Input placeholder="Cost" value={editMaterial?.cost || ""} onChange={(e) => setEditMaterial({ ...editMaterial!, cost: e.target.value })} />
            <Input type="number" placeholder="Amount Available" value={editMaterial?.amount_available || 0} onChange={(e) => setEditMaterial({ ...editMaterial!, amount_available: +e.target.value })} />
            <Input type="number" placeholder="Unit Per Box" value={editMaterial?.unit || 0} onChange={(e) => setEditMaterial({ ...editMaterial!, unit: +e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button onClick={handleUpdateMaterial}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>📊 Material Movement - {viewMaterial?.name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Inflow</TableHead>
                  <TableHead className="text-right">Outflow</TableHead>
                  <TableHead className="text-right">Damages</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materialMovements.length > 0 ? (
                  materialMovements.map((movement, index) => (
                    <TableRow key={index}>
                      <TableCell>{movement.date}</TableCell>
                      <TableCell className="text-right text-green-600">{movement.inflow > 0 ? movement.inflow : '-'}</TableCell>
                      <TableCell className="text-right text-red-600">{movement.outflow > 0 ? movement.outflow : '-'}</TableCell>
                      <TableCell className="text-right text-orange-600">{movement.damages > 0 ? movement.damages : '-'}</TableCell>
                      <TableCell className="text-right font-medium">{movement.balance}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">No movement data available</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsViewDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Material Entries Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-4">📘 Material Entries</h2>
        <div className="flex gap-2 mb-4">
          <Select onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          {filter === "custom" && (
            <Input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
          )}
        </div>

        <Table className="bg-white rounded-xl shadow-md">
          <TableHeader>
            <TableRow className="bg-blue-50">
              <TableHead>Material</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Created By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materialEntries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{entry.material_name}</TableCell>
                <TableCell>{entry.quantity}</TableCell>
                <TableCell>{entry.action}</TableCell>
                <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                <TableCell>{entry.created_by}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default MaterialsPage;
