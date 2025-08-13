import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

const formSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function Setup() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: (user as any)?.email?.split('@')[1]?.split('.')[0]?.charAt(0).toUpperCase() + 
            (user as any)?.email?.split('@')[1]?.split('.')[0]?.slice(1) || "My Company",
      description: "Software Asset Management Workspace",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Generate slug from name
      const slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 50);
      
      // Create tenant
      const tenant = await apiRequest("POST", "/api/tenants", {
        ...data,
        slug,
      });
      
      // Create sample department
      await apiRequest("POST", "/api/departments", {
        name: "IT Department",
        description: "Information Technology Department",
      });
      
      // Create sample environments
      await apiRequest("POST", "/api/environments", {
        name: "Production",
        type: "cloud",
        status: "active",
        description: "Production environment",
      });
      
      await apiRequest("POST", "/api/environments", {
        name: "Development",
        type: "on-premise",
        status: "active", 
        description: "Development environment",
      });
      
      return tenant;
    },
    onSuccess: () => {
      setIsSetupComplete(true);
      toast({
        title: "Welcome to AssetFlow!",
        description: "Your workspace has been created successfully.",
      });
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Setup Error",
        description: error.message || "Failed to create workspace",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  if (isSetupComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-check text-green-600 text-2xl"></i>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Setup Complete!</h2>
            <p className="text-slate-600 mb-4">Your workspace is ready. Redirecting to dashboard...</p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-cube text-white text-2xl"></i>
          </div>
          <CardTitle className="text-2xl">Welcome to AssetFlow</CardTitle>
          <CardDescription>
            Let's set up your software asset management workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter your company name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Brief description of your workspace"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full" 
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Workspace...
                  </>
                ) : (
                  "Create Workspace"
                )}
              </Button>
            </form>
          </Form>
          
          <div className="mt-6 text-center text-sm text-slate-600">
            <p>This will create your tenant and sample data to get started.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}