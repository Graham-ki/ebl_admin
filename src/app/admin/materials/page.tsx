"use client";

import { useState, useEffect } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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

const MaterialsPage = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMaterial, setEditMaterial] = useState<Material | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [viewMaterial, setViewMaterial] = useState<Material | null>(null);

  const [newMaterial, setNewMaterial] = useState<Material>({
    name: "",
    amount_available: 0,
    unit: 0,
  });

  useEffect(() => {
    fetchMaterials();
  }, []);

  // Fetch materials and apply automatic deduction
  const fetchMaterials = async () => {
    setLoading(true);

    // Fetch total boxes produced
    const { data: productSum, error: productError } = await supabase
      .from("product")
      .select("maxQuantity");

    if (productError) {
      console.error("Error fetching product quantities:", productError);
      setLoading(false);
      return;
    }

    // Calculate total boxes produced
    const totalBoxes = productSum?.reduce((sum, product) => sum + product.maxQuantity, 0) || 0;

    // Fetch materials from the database
    const { data: materialsData, error: materialsError } = await supabase
      .from("materials")
      .select("id, amount_available, unit, name");

    if (materialsError) {
      console.error("Error fetching materials:", materialsError);
      setLoading(false);
      return;
    }

    // Apply automatic deduction logic
    const updatedMaterials = materialsData.map((material) => {
      const unitUsedPerBox = parseFloat(material.unit) || 0;
      const amountUsed = totalBoxes * unitUsedPerBox;
      const newAmountAvailable = Math.max(material.amount_available - amountUsed, 0); // Prevent negatives

      return { ...material, amount_used: amountUsed, amount_available: newAmountAvailable };
    });

    setMaterials(updatedMaterials);
    setLoading(false);
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
  const handleViewDetails = (material: Material) => {
    setViewMaterial(material);
    setIsViewDetailsOpen(true);
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
        <Table className="w-full"> {/* Ensure the table takes full width */}
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">Name</TableHead> {/* Center header text */}
            <TableHead className="text-center">Actions</TableHead> {/* Center header text */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {materials.length > 0 ? (
            materials.map((material) => (
              <TableRow key={material.id}>
                <TableCell className="text-center">{material.name}</TableCell> {/* Center cell text */}
                <TableCell className="text-center"> {/* Center cell content */}
                  <Button variant="default" onClick={() => handleViewDetails(material)}>Details</Button>
                  <Button variant="secondary" onClick={() => handleEditMaterial(material)}>Edit</Button>
                  <Button variant="destructive" onClick={() => handleDeleteMaterial(material.id!)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={2} className="text-center"> {/* Center "No materials found" message */}
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
                  {viewMaterial && (
                    <>
                      <DialogHeader>
                        <DialogTitle>Details of {viewMaterial.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Table>
                          <TableBody>
                            <TableRow>
                              <TableCell>Amount Available</TableCell>
                              <TableCell>{viewMaterial.amount_available}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Amount Used</TableCell>
                              <TableCell>{viewMaterial.amount_used}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Unit Per Box</TableCell>
                              <TableCell>{viewMaterial.unit}</TableCell>
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
    </div>
  );
};

export default MaterialsPage;
