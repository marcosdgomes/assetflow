import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Plus, Trash2, Shield } from "lucide-react";
import { Link } from "wouter";
import AdminSidebar from "@/components/layout/admin-sidebar";
import Header from "@/components/layout/header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const addUserSchema = z.object({
  userId: z.string().min(1, "User is required"),
  role: z.enum(["admin", "user"]),
});

const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["admin", "user"]),
});

type AddUserFormData = z.infer<typeof addUserSchema>;
type CreateUserFormData = z.infer<typeof createUserSchema>;

export default function AdminTenantDetail() {
  const [, params] = useRoute("/admin/tenants/:id");
  const [, setLocation] = useLocation();
  const tenantId = params?.id;
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [userToRemove, setUserToRemove] = useState<string | null>(null);
  const [showDeleteTenantDialog, setShowDeleteTenantDialog] = useState(false);
  const { toast } = useToast();

  const { data: tenant, isLoading: tenantLoading } = useQuery<any>({
    queryKey: ["/api/admin/tenants", tenantId],
    enabled: !!tenantId,
    retry: false,
  });

  const { data: tenantUsers = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/tenants", tenantId, "users"],
    enabled: !!tenantId,
    retry: false,
  });

  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  const addUserForm = useForm<AddUserFormData>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      userId: "",
      role: "user",
    },
  });

  const createUserForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      role: "user",
    },
  });

  const addUserMutation = useMutation({
    mutationFn: async (data: AddUserFormData) => {
      await apiRequest("POST", `/api/admin/tenants/${tenantId}/users`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants", tenantId, "users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowAddUserModal(false);
      addUserForm.reset();
      toast({
        title: "Success",
        description: "User added to tenant successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add user to tenant",
        variant: "destructive",
      });
    },
  });

  const createAndAddUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      // Create user first
      const response = await apiRequest("POST", "/api/admin/users", {
        username: data.username,
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: "user", // Always create as regular user
      });
      const newUser = await response.json();
      
      // Then add to tenant
      await apiRequest("POST", `/api/admin/tenants/${tenantId}/users`, {
        userId: newUser.id,
        role: data.role,
      });
      
      return newUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants", tenantId, "users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowAddUserModal(false);
      createUserForm.reset();
      toast({
        title: "Success",
        description: "User created and added to tenant successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/admin/tenants/${tenantId}/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants", tenantId, "users"] });
      setUserToRemove(null);
      toast({
        title: "Success",
        description: "User removed from tenant successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove user from tenant",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest("PATCH", `/api/admin/tenants/${tenantId}/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants", tenantId, "users"] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const deleteTenantMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/admin/tenants/${tenantId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      setLocation("/admin");
      toast({
        title: "Success",
        description: "Tenant deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete tenant",
        variant: "destructive",
      });
    },
  });

  const handleAddExistingUser = (data: AddUserFormData) => {
    addUserMutation.mutate(data);
  };

  const handleCreateNewUser = (data: CreateUserFormData) => {
    createAndAddUserMutation.mutate(data);
  };

  const handleRemoveUser = () => {
    if (userToRemove) {
      removeUserMutation.mutate(userToRemove);
    }
  };

  // Get available users (not already in this tenant)
  const availableUsers = allUsers.filter((user: any) => 
    !tenantUsers.some((tu: any) => tu.userId === user.id)
  );

  if (!tenantId) {
    return <div>Invalid tenant ID</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AdminSidebar />
      
      <main className="flex flex-col flex-1 overflow-hidden">
        <Header 
          title={tenantLoading ? "Loading..." : tenant?.name || "Tenant Details"}
          description={tenantLoading ? "" : `Manage users and settings for ${tenant?.slug}`}
        />
        
        <div className="flex-1 overflow-y-auto p-6" data-testid="admin-tenant-detail">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="outline" size="icon" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h2 className="text-2xl font-bold" data-testid="page-title">Tenant Management</h2>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowAddUserModal(true)} data-testid="button-add-user">
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => setShowDeleteTenantDialog(true)}
                data-testid="button-delete-tenant"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Tenant
              </Button>
            </div>
          </div>

          <div className="space-y-6">

      <Card data-testid="card-tenant-info">
        <CardHeader>
          <CardTitle>Tenant Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="font-medium" data-testid="text-tenant-name">{tenant?.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Slug</p>
            <p className="font-medium" data-testid="text-tenant-slug">{tenant?.slug}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="font-medium" data-testid="text-tenant-created">
              {tenant?.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : ""}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="font-medium" data-testid="text-tenant-user-count">{tenantUsers.length}</p>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-users-table">
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Manage users and their roles in this tenant</CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : tenantUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found. Add users to this tenant to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenantUsers.map((userTenant: any) => (
                  <TableRow key={userTenant.id} data-testid={`row-user-${userTenant.userId}`}>
                    <TableCell className="font-medium" data-testid={`text-user-name-${userTenant.userId}`}>
                      {userTenant.user.firstName} {userTenant.user.lastName}
                    </TableCell>
                    <TableCell data-testid={`text-user-email-${userTenant.userId}`}>
                      {userTenant.user.email}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={userTenant.role}
                        onValueChange={(value) => 
                          updateRoleMutation.mutate({ userId: userTenant.userId, role: value })
                        }
                        data-testid={`select-user-role-${userTenant.userId}`}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell data-testid={`text-user-added-${userTenant.userId}`}>
                      {new Date(userTenant.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUserToRemove(userTenant.userId)}
                        data-testid={`button-remove-${userTenant.userId}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddUserModal} onOpenChange={setShowAddUserModal}>
        <DialogContent data-testid="dialog-add-user">
          <DialogHeader>
            <DialogTitle>Add User to Tenant</DialogTitle>
            <DialogDescription>
              Select a user and assign their role within this tenant.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="existing" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing">Existing User</TabsTrigger>
              <TabsTrigger value="new">Create New User</TabsTrigger>
            </TabsList>

            {/* Tab 1: Add Existing User */}
            <TabsContent value="existing" className="space-y-4">
              <Form {...addUserForm}>
                <form onSubmit={addUserForm.handleSubmit(handleAddExistingUser)} className="space-y-4">
                  <FormField
                    control={addUserForm.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-user">
                              <SelectValue placeholder="Select a user" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableUsers.length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground">No available users. Create a new user instead.</div>
                            ) : (
                              availableUsers.map((user: any) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.email} - {user.firstName} {user.lastName}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addUserForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tenant Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-role">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddUserModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={addUserMutation.isPending || availableUsers.length === 0}
                    >
                      {addUserMutation.isPending ? "Adding..." : "Add User"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>

            {/* Tab 2: Create New User */}
            <TabsContent value="new" className="space-y-4">
              <Form {...createUserForm}>
                <form onSubmit={createUserForm.handleSubmit(handleCreateNewUser)} className="space-y-4">
                  <FormField
                    control={createUserForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="john.doe" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createUserForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="john@example.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createUserForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" placeholder="••••••••" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createUserForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="John" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createUserForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Doe" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={createUserForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tenant Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddUserModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createAndAddUserMutation.isPending}
                    >
                      {createAndAddUserMutation.isPending ? "Creating..." : "Create & Add User"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!userToRemove} onOpenChange={() => setUserToRemove(null)}>
        <AlertDialogContent data-testid="dialog-confirm-remove">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User from Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this user from the tenant? They will lose access to all tenant resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-remove">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-remove"
            >
              Remove User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Tenant Confirmation */}
      <AlertDialog open={showDeleteTenantDialog} onOpenChange={setShowDeleteTenantDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this tenant? This will permanently remove the tenant and all associated data including users, software assets, departments, and environments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTenantMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Tenant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
          </div>
        </div>
      </main>
    </div>
  );
}
