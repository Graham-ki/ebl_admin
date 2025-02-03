'use client'
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const supabaseUrl = "https://kxnrfzcurobahklqefjs.supabase.co"; // Replace with actual Supabase URL
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bnJmemN1cm9iYWhrbHFlZmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5NTk1MzUsImV4cCI6MjA1MzUzNTUzNX0.pHrrAPHV1ln1OHugnB93DTUY5TL9K8dYREhz1o0GkjE"; // Replace with actual Supabase Key
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const UsersPage = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
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
  const handleEditUser = (user: any) => {
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
    setSelectedUser(userId);
    setIsOrdersOpen(true);
    
    const { data, error } = await supabase
      .from("order") // Orders table
      .select("slug, status, totalPrice,created_at")
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
            <Input 
              label="Name" 
              value={editUser?.name || ""} 
              onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
            />
            <Input 
              label="Email" 
              type="email" 
              value={editUser?.email || ""} 
              onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
            />
            <Input 
              label="Phone" 
              value={editUser?.phone || ""} 
              onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })}
            />
            <Input 
              label="Address" 
              value={editUser?.address || ""} 
              onChange={(e) => setEditUser({ ...editUser, address: e.target.value })}
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleUpdateUser}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Orders Modal */}
      <Dialog open={isOrdersOpen} onOpenChange={setIsOrdersOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User: {selectedUser}</DialogTitle>
          </DialogHeader>
          {orders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Order date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.slug}>
                    <TableCell>{order.slug}</TableCell>
                    <TableCell>{order.created_at}</TableCell>
                    <TableCell>{order.status}</TableCell>
                    <TableCell>{order.totalPrice}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500">No orders found for this user!.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
