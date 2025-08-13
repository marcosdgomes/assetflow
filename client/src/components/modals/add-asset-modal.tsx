import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const formSchema = z.object({
  name: z.string().min(1, "Software name is required"),
  version: z.string().optional(),
  departmentId: z.string().optional(),
  parentSoftwareId: z.string().optional(),
  technology: z.string().optional(),
  vendor: z.string().optional(),
  licenseType: z.string().optional(),
  description: z.string().optional(),
  gitProvider: z.string().optional(),
  gitRepositoryUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  // Cost information
  costType: z.string().optional(),
  amount: z.string().optional(),
  currency: z.string().default("USD"),
  billingCycle: z.string().optional(),
  // Environment selection
  environments: z.array(z.string()).default([]),
});

type FormData = z.infer<typeof formSchema>;

interface AddAssetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddAssetModal({ open, onOpenChange }: AddAssetModalProps) {
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      version: "",
      departmentId: "",
      parentSoftwareId: "none",
      technology: "",
      vendor: "",
      licenseType: "subscription",
      description: "",
      gitProvider: "",
      gitRepositoryUrl: "",
      costType: "license",
      amount: "",
      currency: "USD",
      billingCycle: "monthly",
      environments: [],
    },
  });

  const { data: departments } = useQuery({
    queryKey: ["/api/departments"],
    enabled: open,
  });

  const { data: environments } = useQuery({
    queryKey: ["/api/environments"],
    enabled: open,
  });

  const { data: parentSoftwareOptions } = useQuery({
    queryKey: ["/api/software"],
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const softwareData = {
        name: data.name,
        version: data.version || null,
        departmentId: data.departmentId || null,
        technology: data.technology || null,
        vendor: data.vendor || null,
        licenseType: data.licenseType || null,
        description: data.description || null,
        isInternal: data.licenseType === "internal",
        environments: selectedEnvironments,
        cost: data.amount && parseFloat(data.amount) > 0 ? {
          costType: data.costType || "license",
          amount: parseFloat(data.amount),
          currency: data.currency,
          billingCycle: data.billingCycle || "monthly",
          isActive: true,
        } : null,
      };

      return await apiRequest("POST", "/api/software", softwareData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Software asset created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/software"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      form.reset();
      setSelectedEnvironments([]);
      onOpenChange(false);
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
        description: "Failed to create software asset",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const handleEnvironmentChange = (envId: string, checked: boolean) => {
    if (checked) {
      setSelectedEnvironments(prev => [...prev, envId]);
    } else {
      setSelectedEnvironments(prev => prev.filter(id => id !== envId));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Software Asset</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Software Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Oracle Database" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Version</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 19.0.0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments?.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
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
                name="parentSoftwareId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Software Asset</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Parent (Optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Parent</SelectItem>
                        {parentSoftwareOptions?.map((software: any) => (
                          <SelectItem key={software.id} value={software.id}>
                            {software.name} ({software.technology})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="technology"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Technology Stack</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Technology" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="database">Database</SelectItem>
                        <SelectItem value="web-app">Web Application</SelectItem>
                        <SelectItem value="api">API Service</SelectItem>
                        <SelectItem value="desktop">Desktop Application</SelectItem>
                        <SelectItem value="mobile">Mobile Application</SelectItem>
                        <SelectItem value="cloud">Cloud Platform</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Oracle, Microsoft" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="licenseType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select License Type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="subscription">Subscription</SelectItem>
                        <SelectItem value="perpetual">Perpetual</SelectItem>
                        <SelectItem value="open-source">Open Source</SelectItem>
                        <SelectItem value="internal">Internal Development</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <Input placeholder="Brief description of the software" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Git Repository Information */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-4">Git Repository</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gitProvider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Git Provider</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Git Provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="github">
                            <div className="flex items-center">
                              <i className="fab fa-github mr-2"></i>
                              GitHub
                            </div>
                          </SelectItem>
                          <SelectItem value="gitlab">
                            <div className="flex items-center">
                              <i className="fab fa-gitlab mr-2"></i>
                              GitLab
                            </div>
                          </SelectItem>
                          <SelectItem value="bitbucket">
                            <div className="flex items-center">
                              <i className="fab fa-bitbucket mr-2"></i>
                              Bitbucket
                            </div>
                          </SelectItem>
                          <SelectItem value="azure-devops">
                            <div className="flex items-center">
                              <i className="fab fa-microsoft mr-2"></i>
                              Azure DevOps
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gitRepositoryUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repository URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://github.com/user/repo" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Cost Information */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-4">Cost Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="costType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Cost Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="license">License</SelectItem>
                          <SelectItem value="subscription">Subscription</SelectItem>
                          <SelectItem value="development">Development</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          placeholder="0.00" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="CAD">CAD</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="billingCycle"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>Billing Cycle</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                        <SelectItem value="one-time">One-time</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Environment Assignment */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-4">Environment Assignment</h4>
              {environments && environments.length > 0 ? (
                <div className="space-y-2">
                  {environments.map((env) => (
                    <div key={env.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={env.id}
                        checked={selectedEnvironments.includes(env.id)}
                        onCheckedChange={(checked) => handleEnvironmentChange(env.id, checked as boolean)}
                      />
                      <label htmlFor={env.id} className="text-sm text-slate-700 cursor-pointer">
                        {env.name} ({env.type})
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No environments available</p>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-200">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Creating..." : "Add Software Asset"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
