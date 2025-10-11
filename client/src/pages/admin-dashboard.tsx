import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Building2, Users, Plus, Settings } from "lucide-react";
import { Link } from "wouter";

const createTenantSchema = z.object({
  tenant: z.object({
    name: z.string().min(1, "Tenant name is required"),
    slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  }),
  adminUser: z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    role: z.literal("user").default("user"),
  }),
});

type CreateTenantFormData = z.infer<typeof createTenantSchema>;

export default function AdminDashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { toast } = useToast();

  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ["/api/admin/tenants"],
    retry: false,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  const form = useForm<CreateTenantFormData>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      tenant: {
        name: "",
        slug: "",
      },
      adminUser: {
        username: "",
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "user",
      },
    },
  });

  const createTenantMutation = useMutation({
    mutationFn: async (data: CreateTenantFormData) => {
      await apiRequest("POST", "/api/admin/tenants", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowCreateModal(false);
      form.reset();
      toast({
        title: "Success",
        description: "Tenant and admin user created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create tenant",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: CreateTenantFormData) => {
    createTenantMutation.mutate(data);
  };

  const handleNameChange = (name: string) => {
    form.setValue("tenant.name", name);
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    form.setValue("tenant.slug", slug);
  };

  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">Super Admin Dashboard</h1>
          <p className="text-muted-foreground" data-testid="page-description">
            Manage tenants and users across the platform
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} data-testid="button-create-tenant">
          <Plus className="mr-2 h-4 w-4" />
          Create Tenant
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-total-tenants">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-tenants">
              {tenantsLoading ? "..." : tenants.length}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-users">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-users">
              {usersLoading ? "..." : users.length}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-active-tenants">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-active-tenants">
              {tenantsLoading ? "..." : tenants.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-tenants-table">
        <CardHeader>
          <CardTitle>Tenants</CardTitle>
          <CardDescription>View and manage all tenants in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {tenantsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading tenants...</div>
          ) : tenants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tenants found. Create your first tenant to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant: any) => (
                  <TableRow key={tenant.id} data-testid={`row-tenant-${tenant.id}`}>
                    <TableCell className="font-medium" data-testid={`text-tenant-name-${tenant.id}`}>
                      {tenant.name}
                    </TableCell>
                    <TableCell data-testid={`text-tenant-slug-${tenant.id}`}>{tenant.slug}</TableCell>
                    <TableCell data-testid={`text-tenant-users-${tenant.id}`}>
                      {tenant.userCount || 0}
                    </TableCell>
                    <TableCell data-testid={`text-tenant-created-${tenant.id}`}>
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/tenants/${tenant.id}`}>
                        <Button variant="outline" size="sm" data-testid={`button-manage-${tenant.id}`}>
                          Manage
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[600px]" data-testid="dialog-create-tenant">
          <DialogHeader>
            <DialogTitle>Create New Tenant</DialogTitle>
            <DialogDescription>
              Create a new tenant and its admin user. The admin user will be able to manage the tenant.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Tenant Information</h3>
                
                <FormField
                  control={form.control}
                  name="tenant.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tenant Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => handleNameChange(e.target.value)}
                          placeholder="Acme Corporation"
                          data-testid="input-tenant-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tenant.slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug (URL identifier)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="acme-corporation" data-testid="input-tenant-slug" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">Admin User Information</h3>
                
                <FormField
                  control={form.control}
                  name="adminUser.username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="admin"
                          data-testid="input-admin-username"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="adminUser.email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="admin@example.com"
                          data-testid="input-admin-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="adminUser.password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="••••••••"
                          data-testid="input-admin-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="adminUser.firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="John" data-testid="input-admin-firstname" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="adminUser.lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Doe" data-testid="input-admin-lastname" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createTenantMutation.isPending}
                  data-testid="button-submit-tenant"
                >
                  {createTenantMutation.isPending ? "Creating..." : "Create Tenant"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
