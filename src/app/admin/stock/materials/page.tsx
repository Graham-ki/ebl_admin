"use client";

import { useState, useEffect } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  amount_used?: number;
}

interface MaterialDetails {
  amount_available: number;
  amount_used: number;
  boxes_expected: number;
  boxes_produced: number;
  percentage_damage: number;
}

interface MaterialEntry {
  id: number;
  material_name: string;
  quantity: number;
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
  const [materialDetails, setMaterialDetails] = useState<MaterialDetails | null>(null);
  const [materialEntries, setMaterialEntries] = useState<MaterialEntry[]>([]);
  const [filter, setFilter] = useState("all");
  const [customDate, setCustomDate] = useState("");

  const [newMaterial, setNewMaterial] = useState<Material>({
    name: "",
    amount_available: 0,
    unit: 0,
  });

  useEffect(() => {
    fetchMaterials();
    fetchMaterialEntries();
  }, [filter, customDate]);

  // Fetch materials and apply automatic deduction
  const fetchMaterials = async () => {
    setLoading(true);

    // Fetch materials from the database
    const { data: materialsData, error: materialsError } = await supabase
      .from("materials")
      .select("id, amount_available, unit, name");

    if (materialsError) {
      console.error("Error fetching materials:", materialsError);
      setLoading(false);
      return;
    }

    // Set materials without modifying amount_available
    setMaterials(materialsData || []);
    setLoading(false);
  };

  // Fetch material entries with filtering
  const fetchMaterialEntries = async () => {
    let query = supabase
      .from("material_entries")
      .select("id, material_id, quantity, action, date, created_by");

    // Apply filtering logic
    if (filter === "daily" || filter === "monthly" || filter === "yearly") {
      query = query.order("date", { ascending: false });
    }
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

    // Fetch material names separately
    const materialIds = [...new Set(entries.map((entry) => entry.material_id))];

    const { data: materials, error: materialsError } = await supabase
      .from("materials")
      .select("id, name")
      .in("id", materialIds);

    if (materialsError) {
      console.error("Error fetching materials:", materialsError);
      return;
    }

    // Merge material names into entries
    const mergedEntries = entries.map((entry) => ({
      ...entry,
      material_name: materials.find((material) => material.id === entry.material_id)?.name || "Unknown",
    }));

    setMaterialEntries(mergedEntries);
  };

  // Handle adding new material
  const handleAddMaterial = async () => {
    const { name, amount_available, unit } = newMaterial;

    if (!name || amount_available < 0 || unit < 0) {
      alert("Please enter valid details.");
      return;
    }

    const { data, error } = await supabase.from("materials").insert([{
      name, amount_available, unit
    }]);

    if (error) {
      console.error("Error adding material:", error);
      alert("Failed to add material.");
      return;
    }

    setMaterials([...materials, { ...newMaterial }]);
    setIsAdding(false);
    alert("Material added successfully!");
  };

  // Handle editing material
  const handleEditMaterial = (material: Material) => {
    setEditMaterial(material);
    setIsEditing(true);
  };

  const handleUpdateMaterial = async () => {
    if (!editMaterial) return;

    const { id, name, amount_available, unit } = editMaterial;
    const { error } = await supabase
      .from("materials")
      .update({ name, amount_available, unit })
      .eq("id", id);

    if (error) {
      console.error("Error updating material:", error);
      alert("Failed to update material.");
      return;
    }

    setMaterials(materials.map((m) => (m.id === id ? editMaterial : m)));
    setIsEditing(false);
    alert("Material updated successfully!");
  };

  // Handle deleting material
  const handleDeleteMaterial = async (id: string) => {
    const { error } = await supabase.from("materials").delete().eq("id", id);

    if (error) {
      console.error("Error deleting material:", error);
      alert("Failed to delete material.");
      return;
    }

    setMaterials(materials.filter((m) => m.id !== id));
    alert("Material deleted successfully!");
  };

  // Handle viewing material details
  const handleViewDetails = async (material: Material) => {
    setViewMaterial(material);
    setIsViewDetailsOpen(true);

    // Fetch the latest amount_available from the database
    const { data: latestMaterial, error: materialError } = await supabase
      .from("materials")
      .select("amount_available")
      .eq("id", material.id)
      .single();

    if (materialError) {
      console.error("Error fetching latest material data:", materialError);
      return;
    }

    // Fetch material entries for amount_used
    const { data: materialEntries, error: entriesError } = await supabase
      .from("material_entries")
      .select("quantity")
      .eq("material_id", material.id)
      .eq("action", "Taken to production");

    if (entriesError) {
      console.error("Error fetching material entries:", entriesError);
      return;
    }

    const amountUsed = materialEntries.reduce((sum, entry) => sum + entry.quantity, 0);

    // Fetch product entries for boxes_produced
    const { data: productEntries, error: productError } = await supabase
      .from("product_entries")
      .select("quantity")
      .eq("Created_by", "Store Manager");

    if (productError) {
      console.error("Error fetching product entries:", productError);
      return;
    }

    const boxesProduced = productEntries.reduce((sum, entry) => sum + entry.quantity, 0);

    // Calculate boxes_expected and percentage_damage
    const boxesExpected = amountUsed / material.unit;
    const percentageDamage = ((boxesExpected - boxesProduced) / boxesExpected) * 100;

    setMaterialDetails({
      amount_available: latestMaterial.amount_available, // Use the latest amount_available from the database
      amount_used: amountUsed,
      boxes_expected: boxesExpected,
      boxes_produced: boxesProduced,
      percentage_damage: percentageDamage,
    });
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className='text-3xl font-bold mb-6 text-center shadow-lg p-4 rounded-lg bg-blue-100 dark:bg-gray-800 dark:text-white'>
        Materials Management
      </h1>
      <Button onClick={() => setIsAdding(true)} className="mb-6">
        Add Material
      </Button>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Name</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.length > 0 ? (
              materials.map((material) => (
                <TableRow key={material.id}>
                  <TableCell className="text-center">{material.name}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="default" onClick={() => handleViewDetails(material)}>Details</Button>
                    <Button variant="secondary" onClick={() => handleEditMaterial(material)}>Edit</Button>
                    <Button variant="destructive" onClick={() => handleDeleteMaterial(material.id!)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="text-center">
                  No materials found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      {/* Add Material Modal */}
      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Material Name"
                value={newMaterial.name}
                onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
                className="w-full"
              />
            </div>
            <div>
              <Input
                type="number"
                placeholder="Amount Available"
                value={newMaterial.amount_available || ""}
                onChange={(e) => setNewMaterial({ ...newMaterial, amount_available: parseFloat(e.target.value) })}
                className="w-full"
                step="any"
              />
            </div>
            <div>
              <Input
                placeholder="Unit Per Box"
                value={newMaterial.unit ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || !isNaN(Number(value))) {
                    setNewMaterial({ ...newMaterial, unit: parseFloat(value) });
                  }
                }}
                className="w-full"
                type="number"
                step="any"
                inputMode="decimal"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsAdding(false)}>Cancel</Button>
            <Button onClick={handleAddMaterial}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Material Modal */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Material Name"
                value={editMaterial?.name || ""}
                onChange={(e) => setEditMaterial({ ...editMaterial!, name: e.target.value })}
                className="w-full"
              />
            </div>
            <div>
              <Input
                type="number"
                placeholder="Amount Available"
                value={editMaterial?.amount_available || 0}
                onChange={(e) =>
                  setEditMaterial({ ...editMaterial!, amount_available: +e.target.value })
                }
                className="w-full"
              />
            </div>
            <div>
              <Input
                type="number"
                placeholder="Unit Per Box"
                value={editMaterial?.unit || 0}
                onChange={(e) => setEditMaterial({ ...editMaterial!, unit: +e.target.value })}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button onClick={handleUpdateMaterial}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Material Details Modal */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent>
          {viewMaterial && materialDetails && (
            <>
              <DialogHeader>
                <DialogTitle>Details of {viewMaterial.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell>Amount Available</TableCell>
                      <TableCell>{materialDetails.amount_available}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Amount Used</TableCell>
                      <TableCell>{materialDetails.amount_used}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Boxes Expected</TableCell>
                      <TableCell>{materialDetails.boxes_expected.toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Boxes Produced</TableCell>
                      <TableCell>{materialDetails.boxes_produced}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Percentage Damage</TableCell>
                      <TableCell>{materialDetails.percentage_damage.toFixed(2)}%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Material Entries Table with Filters */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Material Entries</h2>
        <div className="mb-4 flex gap-2">
          <Select onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
              <SelectItem value="custom">Custom Date</SelectItem>
            </SelectContent>
          </Select>

          {filter === "custom" && (
            <Input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="w-[180px]"
            />
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
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