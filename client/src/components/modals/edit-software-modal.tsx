import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const formSchema = z.object({
  name: z.string().min(1, "Software name is required"),
  vendor: z.string().optional(),
  description: z.string().optional(),
  technology: z.string().min(1, "Technology type is required"),
  status: z.string().min(1, "Status is required"),
  version: z.string().optional(),
  licenseType: z.string().optional(),
  departmentId: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface SoftwareAsset {
  id: string;
  tenantId: string;
  name: string;
  vendor?: string;
  description?: string;
  technology: string;
  status: string;
  version?: string;
  licenseType?: string;
  departmentId?: string;
  createdAt: string;
  updatedAt: string;
  department?: {
    id: string;
    name: string;
  };
}

interface EditSoftwareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  software: SoftwareAsset | null;
}

const technologyOptions = [
  { value: "web-app", label: "Web Application" },
  { value: "database", label: "Database" },
  { value: "api", label: "API/Service" },
  { value: "desktop", label: "Desktop Software" },
  { value: "mobile", label: "Mobile App" },
  { value: "cloud", label: "Cloud Service" },
  { value: "security", label: "Security Tool" },
  { value: "monitoring", label: "Monitoring" },
  { value: "other", label: "Other" },
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "update-available", label: "Update Available" },
  { value: "deprecated", label: "Deprecated" },
];

const licenseOptions = [
  { value: "commercial", label: "Commercial" },
  { value: "open-source", label: "Open Source" },
  { value: "freemium", label: "Freemium" },
  { value: "subscription", label: "Subscription" },
  { value: "perpetual", label: "Perpetual" },
  { value: "internal", label: "Internal" },
];

export default function EditSoftwareModal({ open, onOpenChange, software }: EditSoftwareModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  interface Department {
    id: string;
    name: string;
  }

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      vendor: "",
      description: "",
      technology: "",
      status: "",
      version: "",
      licenseType: "",
      departmentId: "",
    },
  });

  // Update form when software changes
  useEffect(() => {
    if (software) {
      form.reset({
        name: software.name,
        vendor: software.vendor || "",
        description: software.description || "",
        technology: software.technology,
        status: software.status,
        version: software.version || "",
        licenseType: software.licenseType || "",
        departmentId: software.departmentId || "none",
      });
    }
  }, [software, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!software) throw new Error("No software selected");
      // Clean the data - replace "none" with undefined for departmentId
      const cleanData = {
        ...data,
        departmentId: data.departmentId === "none" ? undefined : data.departmentId,
      };
      const response = await apiRequest("PUT", `/api/software/${software.id}`, cleanData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Software Updated",
        description: "Software asset has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/software"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
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
        title: "Update Failed",
        description: error.message || "Failed to update software asset",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <i className="fas fa-edit text-primary-600 mr-2"></i>
            Edit Software Asset
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Software Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., PostgreSQL, Node.js" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Microsoft, Google" />
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
                    <Textarea 
                      {...field} 
                      placeholder="Brief description of the software and its purpose"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="technology"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Technology Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select technology type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {technologyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Version</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., 14.2, 18.0.1" />
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select license type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {licenseOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="departmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No Department</SelectItem>
                      {departments.map((dept) => (
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

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending}
                className="bg-primary-600 hover:bg-primary-700"
              >
                {mutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-2"></i>
                    Update Software
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}