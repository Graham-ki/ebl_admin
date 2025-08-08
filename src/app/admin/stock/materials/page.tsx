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
  DialogDescription,
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
  id: string;
  name: string;
  quantity_available: number;
}

interface MaterialEntry {
  id: string;
  material_id: string;
  quantity: number;
  action: string;
  date: string;
  created_at: string;
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

const MaterialsPage = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [isOutflowDialogOpen, setIsOutflowDialogOpen] = useState(false);
  const [viewMaterial, setViewMaterial] = useState<Material | null>(null);
  const [transactions, setTransactions] = useState<MaterialTransaction[]>([]);
  const [newMaterial, setNewMaterial] = useState<Omit<Material, "id">>({
    name: "",
    quantity_available: 0,
  });
  const [outflowForm, setOutflowForm] = useState<OutflowFormData>({
    material_id: "",
    action: "Damaged",
    quantity: 0,
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchMaterials();
  }, []);

  useEffect(() => {
    if (viewMaterial) {
      fetchMaterialTransactions(viewMaterial.id);
    }
  }, [viewMaterial]);

  const fetchMaterials = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("materials")
      .select("id, name, quantity_available")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching materials:", error);
    } else {
      setMaterials(data || []);
    }
    setLoading(false);
  };

  const fetchMaterialTransactions = async (materialId: string) => {
    // Get inflows from supply_items
    const { data: inflows, error: inflowError } = await supabase
      .from("supply_items")
      .select("id, name, quantity, created_at")
      .eq("name", viewMaterial?.name);

    // Get outflows from material_entries
    const { data: outflows, error: outflowError } = await supabase
      .from("material_entries")
      .select("id, material_id, quantity, action, date, created_at")
      .eq("material_id", materialId);

    if (inflowError || outflowError) {
      console.error("Error fetching transactions:", inflowError || outflowError);
      return;
    }

    // Combine and format transactions
    const formattedTransactions: MaterialTransaction[] = [
      ...(inflows?.map((item) => ({
        id: item.id,
        date: new Date(item.created_at).toLocaleDateString(),
        type: "inflow" as const,
        quantity: item.quantity,
        action: "Purchased",
        material_id: materialId,
        material_name: viewMaterial?.name || "",
      })) || [],
      ...(outflows?.map((entry) => ({
        id: entry.id,
        date: new Date(entry.date).toLocaleDateString(),
        type: "outflow" as const,
        quantity: entry.quantity,
        action: entry.action,
        material_id: entry.material_id,
        material_name: viewMaterial?.name || "",
      })) || [],
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setTransactions(formattedTransactions);
  };

  const calculateAvailableQuantity = (materialId: string) => {
    const materialTransactions = transactions.filter(
      (t) => t.material_id === materialId
    );
    const totalInflow = materialTransactions
      .filter((t) => t.type === "inflow")
      .reduce((sum, t) => sum + t.quantity, 0);
    const totalOutflow = materialTransactions
      .filter((t) => t.type === "outflow")
      .reduce((sum, t) => sum + t.quantity, 0);
    return totalInflow - totalOutflow;
  };

  const handleAddMaterial = async () => {
    if (!newMaterial.name) {
      alert("Please enter a material name");
      return;
    }

    const { data, error } = await supabase
      .from("materials")
      .insert([newMaterial])
      .select();

    if (error) {
      console.error("Error adding material:", error);
      alert("Failed to add material");
      return;
    }

    if (data?.[0]) {
      setMaterials([...materials, data[0]]);
      setIsAdding(false);
      setNewMaterial({ name: "", quantity_available: 0 });
    }
  };

  const handleRecordOutflow = async () => {
    if (!outflowForm.material_id || outflowForm.quantity <= 0) {
      alert("Please fill all required fields");
      return;
    }

    const { error } = await supabase.from("material_entries").insert([
      {
        material_id: outflowForm.material_id,
        quantity: outflowForm.quantity,
        action: outflowForm.action,
        date: outflowForm.date,
      },
    ]);

    if (error) {
      console.error("Error recording outflow:", error);
      alert("Failed to record outflow");
      return;
    }

    // Update material quantity
    const currentMaterial = materials.find((m) => m.id === outflowForm.material_id);
    if (currentMaterial) {
      const { error: updateError } = await supabase
        .from("materials")
        .update({
          quantity_available: currentMaterial.quantity_available - outflowForm.quantity,
        })
        .eq("id", outflowForm.material_id);

      if (updateError) {
        console.error("Error updating material quantity:", updateError);
      }
    }

    // Refresh data
    fetchMaterials();
    if (viewMaterial) {
      fetchMaterialTransactions(viewMaterial.id);
    }
    setIsOutflowDialogOpen(false);
    setOutflowForm({
      material_id: "",
      action: "Damaged",
      quantity: 0,
      date: new Date().toISOString().split("T")[0],
    });
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm("Are you sure you want to delete this material?")) return;

    // First delete related entries
    await supabase.from("material_entries").delete().eq("material_id", id);

    // Then delete the material
    const { error } = await supabase.from("materials").delete().eq("id", id);

    if (error) {
      console.error("Error deleting material:", error);
      alert("Failed to delete material");
      return;
    }

    setMaterials(materials.filter((m) => m.id !== id));
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Materials Inventory</h1>

      <div className="mb-6 flex justify-between items-center">
        <div className="text-gray-600">
          Total Materials: {materials.length}
        </div>
        <Button onClick={() => setIsAdding(true)}>Add Material</Button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading materials...</div>
      ) : (
        <Table className="border rounded-lg">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Quantity Available</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.length > 0 ? (
              materials.map((material) => (
                <TableRow key={material.id}>
                  <TableCell>{material.name}</TableCell>
                  <TableCell className="text-right">
                    {calculateAvailableQuantity(material.id)}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setViewMaterial(material);
                        setIsViewDetailsOpen(true);
                      }}
                    >
                      Details
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteMaterial(material.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-4">
                  No materials found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      {/* Add Material Dialog */}
      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Material Name"
              value={newMaterial.name}
              onChange={(e) =>
                setNewMaterial({ ...newMaterial, name: e.target.value })
              }
            />
            <Input
              type="number"
              placeholder="Initial Quantity"
              value={newMaterial.quantity_available}
              onChange={(e) =>
                setNewMaterial({
                  ...newMaterial,
                  quantity_available: Number(e.target.value),
                })
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMaterial}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Material Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Transactions for {viewMaterial?.name}
            </DialogTitle>
            <DialogDescription>
              Quantity Available: {calculateAvailableQuantity(viewMaterial?.id || "")}
            </DialogDescription>
          </DialogHeader>
          <div className="mb-4">
            <Button
              onClick={() => {
                setOutflowForm({
                  ...outflowForm,
                  material_id: viewMaterial?.id || "",
                });
                setIsOutflowDialogOpen(true);
              }}
            >
              Record Outflow
            </Button>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length > 0 ? (
                  transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.date}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded ${
                            transaction.type === "inflow"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {transaction.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {transaction.quantity}
                      </TableCell>
                      <TableCell>{transaction.action}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">
                      No transactions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Outflow Dialog */}
      <Dialog open={isOutflowDialogOpen} onOpenChange={setIsOutflowDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Material Outflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Action</label>
              <Select
                value={outflowForm.action}
                onValueChange={(value) =>
                  setOutflowForm({
                    ...outflowForm,
                    action: value as "Damaged" | "Sold" | "Used in production",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Damaged">Damaged</SelectItem>
                  <SelectItem value="Sold">Sold</SelectItem>
                  <SelectItem value="Used in production">
                    Used in production
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <Input
                type="number"
                value={outflowForm.quantity}
                onChange={(e) =>
                  setOutflowForm({
                    ...outflowForm,
                    quantity: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <Input
                type="date"
                value={outflowForm.date}
                onChange={(e) =>
                  setOutflowForm({ ...outflowForm, date: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOutflowDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordOutflow}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MaterialsPage;
