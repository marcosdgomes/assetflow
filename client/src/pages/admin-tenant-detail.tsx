import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

type AddUserFormData = z.infer<typeof addUserSchema>;

export default function AdminTenantDetail() {
  const [, params] = useRoute("/admin/tenants/:id");
  const [, setLocation] = useLocation();
  const tenantId = params?.id;
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [userToRemove, setUserToRemove] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ["/api/admin/tenants", tenantId],
    enabled: !!tenantId,
    retry: false,
  });

  const { data: tenantUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/tenants", tenantId, "users"],
    enabled: !!tenantId,
    retry: false,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  const form = useForm<AddUserFormData>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      userId: "",
      role: "user",
    },
  });

  const addUserMutation = useMutation({
    mutationFn: async (data: AddUserFormData) => {
      await apiRequest("POST", `/api/admin/tenants/${tenantId}/users`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants", tenantId, "users"] });
      setShowAddUserModal(false);
      form.reset();
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

  const handleSubmit = (data: AddUserFormData) => {
    addUserMutation.mutate(data);
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
    <div className="space-y-6" data-testid="admin-tenant-detail">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold" data-testid="page-title">
              {tenantLoading ? "Loading..." : tenant?.name || "Tenant Details"}
            </h1>
            <p className="text-muted-foreground" data-testid="page-description">
              {tenantLoading ? "" : `Manage users and settings for ${tenant?.slug}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddUserModal(true)} data-testid="button-add-user">
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

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

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
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
                        {availableUsers.map((user: any) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.email} - {user.firstName} {user.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
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
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addUserMutation.isPending}
                  data-testid="button-submit-user"
                >
                  {addUserMutation.isPending ? "Adding..." : "Add User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
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
    </div>
  );
}
