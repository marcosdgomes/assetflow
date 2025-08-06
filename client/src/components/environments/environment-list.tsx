import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const formSchema = z.object({
  name: z.string().min(1, "Environment name is required"),
  type: z.string().min(1, "Environment type is required"),
  provider: z.string().optional(),
  status: z.string().default("active"),
  description: z.string().optional(),
  instanceCount: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function EnvironmentList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "",
      provider: "",
      status: "active",
      description: "",
      instanceCount: "",
    },
  });

  const { data: environments, isLoading } = useQuery({
    queryKey: ["/api/environments"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const envData = {
        name: data.name,
        type: data.type,
        provider: data.provider || null,
        status: data.status,
        description: data.description || null,
        instanceCount: data.instanceCount ? parseInt(data.instanceCount) : 0,
      };
      return await apiRequest("POST", "/api/environments", envData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Environment created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/environments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      form.reset();
      setShowAddModal(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create environment",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest("PUT", `/api/environments/${id}`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Environment status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/environments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update environment status",
        variant: "destructive",
      });
    },
  });

  const getEnvironmentIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "cloud":
        return "fas fa-cloud";
      case "on-premise":
        return "fas fa-server";
      case "vm":
        return "fas fa-desktop";
      case "container":
        return "fab fa-docker";
      default:
        return "fas fa-server";
    }
  };

  const getEnvironmentColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case "cloud":
        return "text-green-600 bg-green-100";
      case "on-premise":
        return "text-gray-600 bg-gray-100";
      case "vm":
        return "text-blue-600 bg-blue-100";
      case "container":
        return "text-purple-600 bg-purple-100";
      default:
        return "text-slate-600 bg-slate-100";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-red-100 text-red-800";
      case "maintenance":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider?.toLowerCase()) {
      case "aws":
        return "fab fa-aws";
      case "azure":
        return "fab fa-microsoft";
      case "gcp":
      case "google":
        return "fab fa-google";
      case "oracle":
        return "fab fa-oracle";
      default:
        return "fas fa-cloud";
    }
  };

  const filteredEnvironments = environments?.filter((env) => {
    const matchesSearch = env.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         env.provider?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         env.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || env.type === typeFilter;
    const matchesStatus = statusFilter === "all" || env.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  }) || [];

  const uniqueTypes = [...new Set(environments?.map(e => e.type).filter(Boolean))] || [];

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Filters Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Environments</CardTitle>
            <Button onClick={() => setShowAddModal(true)}>
              <i className="fas fa-plus mr-2"></i>
              Add Environment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Search environments, provider, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Environment Grid */}
      {filteredEnvironments.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <i className="fas fa-server text-slate-400 text-4xl mb-4"></i>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                {environments?.length === 0 ? "No environments found" : "No matching environments found"}
              </h3>
              <p className="text-slate-500 mb-6">
                {environments?.length === 0 
                  ? "Add your first environment to start tracking your infrastructure"
                  : "Try adjusting your search terms or filters"
                }
              </p>
              {environments?.length === 0 && (
                <Button onClick={() => setShowAddModal(true)}>
                  <i className="fas fa-plus mr-2"></i>
                  Add First Environment
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEnvironments.map((env) => (
            <Card key={env.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getEnvironmentColor(env.type)}`}>
                      <i className={getEnvironmentIcon(env.type)}></i>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{env.name}</p>
                      <p className="text-sm text-slate-500 capitalize">{env.type}</p>
                    </div>
                  </div>
                  <Badge className={`text-xs ${getStatusColor(env.status)}`}>
                    {env.status.charAt(0).toUpperCase() + env.status.slice(1)}
                  </Badge>
                </div>

                {env.provider && (
                  <div className="flex items-center space-x-2 mb-3">
                    <i className={`${getProviderIcon(env.provider)} text-slate-600`}></i>
                    <span className="text-sm text-slate-600 capitalize">{env.provider}</span>
                  </div>
                )}

                <div className="flex items-center space-x-4 mb-3">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-slate-900">{env.instanceCount || 0}</p>
                    <p className="text-xs text-slate-500">
                      {env.type === "vm" ? "VMs" : env.type === "container" ? "Containers" : "Instances"}
                    </p>
                  </div>
                </div>

                {env.description && (
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">{env.description}</p>
                )}

                <div className="flex items-center justify-between">
                  <Select
                    value={env.status}
                    onValueChange={(value) => updateStatusMutation.mutate({ id: env.id, status: value })}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className={`w-3 h-3 rounded-full ${
                    env.status === "active" ? "bg-green-500" :
                    env.status === "maintenance" ? "bg-amber-500" : "bg-red-500"
                  }`}></span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Environment Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Environment</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Environment Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Production AWS" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cloud">Cloud</SelectItem>
                          <SelectItem value="on-premise">On-Premise</SelectItem>
                          <SelectItem value="vm">Virtual Machine</SelectItem>
                          <SelectItem value="container">Container</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="aws">AWS</SelectItem>
                          <SelectItem value="azure">Microsoft Azure</SelectItem>
                          <SelectItem value="gcp">Google Cloud</SelectItem>
                          <SelectItem value="oracle">Oracle Cloud</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="instanceCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instance Count</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Brief description of the environment" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-end space-x-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddModal(false)}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Environment"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
