"use client";

import { useState, useEffect } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { createClient } from "@supabase/supabase-js";

const formatDateToEAT = (dateString: string) => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Africa/Kampala", // Nairobi is in EAT (UTC+3)
  };
  return new Intl.DateTimeFormat("en-GB", options).format(date);
};
// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface User {
  id?: string; // UUID is a string
  name: string;
  email: string;
  phone: string;
  address: string;
  password?: string;
  type: string;
}
interface Order {
  id: string;
  user_id: string;
  status: string;
  totalPrice: number;
  slug: string;
  created_at: string
}
const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [viewOrdersUser, setViewOrdersUser] = useState<User | null>(null);
   const [userOrders, setUserOrders] = useState<Order[]>([]); 
  const [isViewingOrders, setIsViewingOrders] = useState(false);
  const [newUser, setNewUser] = useState<User>({
    name: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    type: "USER", // Default type
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch users from the database
  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("users").select("id, name, email, phone, address, type");

    if (error) {
      console.error("Error fetching users:", error);
    } else {
      setUsers(data ?? []);
    }
    setLoading(false);
  };

  const handleAddUser = async () => {
    const { name, email, phone, address, password } = newUser;
  
    // Step 1: Validate input
    if (!name || !email || !phone || !address || !password) {
      alert("Please fill in all the fields.");
      return;
    }
  
    try {
      // Step 2: Create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password, // Password entered by the admin
      });
  
      if (authError) {
        throw authError;
      }
  
      const authUser = authData.user;
  
      // Step 3: Insert the user data into the 'users' table
      const { data: dbData, error: dbError } = await supabase.from("users").insert([
        {
          name,
          email,
          phone,
          address,
          password, // Store password (should ideally be hashed or managed securely in production)
          type: "USER", // Default user type
        },
      ]);
  
      if (dbError) {
        throw dbError;
      }
  
      // Step 4: Check if `dbData` is not null before updating the UI
      if (dbData && Array.isArray(dbData)) {
        setUsers([...users, ...dbData]); // Add the newly created user to the state
      } else {
        alert("No user data was returned. Please check the database.");
      }
  
      setIsAdding(false); // Close the modal
      alert("User added successfully!");
    } catch (error: any) {
      console.error("Error adding user:", error.message);
      alert("User added: Please confirm the user by updating the details!");
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
    const updatedUser = { ...editUser, type: "USER" };
    const { error } = await supabase
      .from("users")
      .update({
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        type: updatedUser.type,
      })
      .eq("id", updatedUser.id);

    if (error) {
      console.error("Error updating user:", error.message);
      alert("Failed to update user: " + error.message);
    } else {
      setUsers(users.map((user) => (user.id === updatedUser.id ? updatedUser : user))); // Update UI
      setIsEditing(false); // Close modal
      alert("User updated successfully!");
    }
  };

  // Delete user function
  const handleDeleteUser = async (id: string) => {
    const { error } = await supabase.from("users").delete().eq("id", id);

    if (error) {
      console.error("Error deleting user:", error.message);
      alert("Failed to delete user: " + error.message);
    } else {
      setUsers(users.filter((user) => user.id !== id)); // Remove from UI
      alert("User deleted successfully!");
    }
  };
  const handleViewOrders = async (user: User) => {
    setViewOrdersUser(user);
    setIsViewingOrders(true);

    const { data: orders, error } = await supabase.from("order").select("*").eq("user", user.id);
    if (error) {
      console.error("Error fetching orders:", error.message);
      alert("Failed to fetch orders for the user.");
    } else {
      setUserOrders(orders ?? []);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="'text-3xl font-bold mb-6 text-center shadow-lg p-4 rounded-lg bg-white dark:bg-gray-800 dark:text-white'">User Management</h1>

      <Button variant="default" onClick={() => setIsAdding(true)} className="mb-4">
        Add User
      </Button>

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
              <TableHead>Type</TableHead>
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
                  <TableCell>{user.type}</TableCell>
                  <TableCell className="flex gap-2">
                  <Button variant="default" onClick={() => handleViewOrders(user)}>
                      View Orders
                    </Button>
                    <Button variant="outline" onClick={() => handleEditUser(user)}>
                      Edit
                    </Button>
                    <Button variant="destructive" onClick={() => handleDeleteUser(user.id!)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      {/* Add User Modal */}
      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <label>
              Name:
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              />
            </label>
            <label>
              Email:
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </label>
            <label>
              Phone:
              <Input
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
              />
            </label>
            <label>
              Address:
              <Input
                value={newUser.address}
                onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
              />
            </label>
            <label>
              Password:
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              />
            </label>
          </div>
          <DialogFooter className="flex gap-2">
            <Button onClick={() => setIsAdding(false)}>Cancel</Button>
            <Button variant="secondary" onClick={handleAddUser}>
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                value={editUser?.name}
                onChange={(e) =>
                  setEditUser({ ...editUser!, name: e.target.value })
                }
              />
            </label>
            <label>
              Email:
              <Input
                type="email"
                value={editUser?.email}
                onChange={(e) =>
                  setEditUser({ ...editUser!, email: e.target.value })
                }
              />
            </label>
            <label>
              Phone:
              <Input
                value={editUser?.phone}
                onChange={(e) =>
                  setEditUser({ ...editUser!, phone: e.target.value })
                }
              />
            </label>
            <label>
              Address:
              <Input
                value={editUser?.address}
                onChange={(e) =>
                  setEditUser({ ...editUser!, address: e.target.value })
                }
              />
            </label>
            <label>
              Type:
              <Input
                 value="USER"
                 readOnly
                 disabled
              />
            </label>
          </div>
          <DialogFooter className="flex gap-2">
            <Button onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button variant="secondary" onClick={handleUpdateUser}>
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* View Orders Modal */}
            <Dialog open={isViewingOrders} onOpenChange={setIsViewingOrders}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Orders for {viewOrdersUser?.name}</DialogTitle>
                </DialogHeader>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>OrderID</TableHead>
                      <TableHead>Order date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userOrders.length > 0 ? (
                      userOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>{order.slug}</TableCell>
                          <TableCell>{formatDateToEAT(order.created_at)}</TableCell>
                          <TableCell>{order.status}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center">
                          No orders found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <DialogFooter>
                  <Button onClick={() => setIsViewingOrders(false)}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
    </div>
  );
};

export default UsersPage;
function setUserOrders(arg0: any[]) {
  throw new Error("Function not implemented.");
}

