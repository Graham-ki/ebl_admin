"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// Initialize Supabase client
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface Order {
  slug: string;
  created_at: string;
  status: string;
  totalPrice: number;
}

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch users from the database
  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("users").select("id, name, email, phone, address");

    if (error) {
      console.error("Error fetching users:", error);
    } else {
      setUsers(data ?? []);
    }
    setLoading(false);
  };

  // Delete user function
  const handleDeleteUser = async (id: number) => {
    const { error } = await supabase.from("users").delete().eq("id", id);

    if (error) {
      console.error("Error deleting user:", error.message);
      alert("Failed to delete user: " + error.message);
    } else {
      setUsers(users.filter((user) => user.id !== id)); // Remove from UI
      alert("User deleted successfully!");
    }
  };

  // Open Edit Modal
  const handleEditUser = (user: User) => {
    setEditUser(user);
    setIsEditing(true);
  };

  // Update User in Supabase
  const handleUpdateUser = async () => {
    if (!editUser) return;

    const { error } = await supabase
      .from("users")
      .update({
        name: editUser.name,
        email: editUser.email,
        phone: editUser.phone,
        address: editUser.address,
      })
      .eq("id", editUser.id);

    if (error) {
      console.error("Error updating user:", error.message);
      alert("Failed to update user: " + error.message);
    } else {
      setUsers(users.map((user) => (user.id === editUser.id ? editUser : user))); // Update UI
      setIsEditing(false); // Close modal
      alert("User updated successfully!");
    }
  };

  // Fetch Orders for a Specific User
  const handleViewOrders = async (userId: number) => {
    setSelectedUser(users.find((user) => user.id === userId) || null);
    setIsOrdersOpen(true);

    const { data, error } = await supabase
      .from("order")
      .select("slug, status, totalPrice, created_at")
      .eq("user", userId);

    if (error) {
      console.error("Error fetching orders:", error.message);
    } else {
      setOrders(data ?? []);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">User Management</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone}</TableCell>
                  <TableCell>{user.address}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button variant="outline" onClick={() => handleEditUser(user)}>Edit</Button>
                    <Button variant="destructive" onClick={() => handleDeleteUser(user.id)}>Delete</Button>
                    <Button variant="default" onClick={() => handleViewOrders(user.id)}>View Orders</Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center">No users found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      {/* Edit User Modal */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <label>
              Name:
              <Input
                value={editUser?.name || ""}
                onChange={(e) => setEditUser({ ...editUser!, name: e.target.value })}
              />
            </label>
            <label>
              Email:
              <Input
                type="email"
                value={editUser?.email || ""}
                onChange={(e) => setEditUser({ ...editUser!, email: e.target.value })}
              />
            </label>
            <label>
              Phone:
              <Input
                value={editUser?.phone || ""}
                onChange={(e) => setEditUser({ ...editUser!, phone: e.target.value })}
              />
            </label>
            <label>
              Address:
              <Input
                value={editUser?.address || ""}
                onChange={(e) => setEditUser({ ...editUser!, address: e.target.value })}
              />
            </label>
          </div>
          <DialogFooter className="flex gap-2">
            <Button onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button variant="secondary" onClick={handleUpdateUser}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Orders Modal with Table */}
      <Dialog open={isOrdersOpen} onOpenChange={setIsOrdersOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Orders for {selectedUser?.name || "Unknown"}</DialogTitle>
          </DialogHeader>
          <div>
            {orders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Price</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.slug}>
                      <TableCell>{order.slug}</TableCell>
                      <TableCell>{order.status}</TableCell>
                      <TableCell>UGX {order.totalPrice}</TableCell>
                      <TableCell>{new Date(order.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p>No orders found for this user.</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsOrdersOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
