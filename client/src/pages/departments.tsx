import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useAuth } from "@/hooks/useAuth";
import AddDepartmentModal from "@/components/modals/add-department-modal";
import EditDepartmentModal from "@/components/modals/edit-department-modal";

interface Department {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export default function Departments() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  // Fetch departments
  const { data: departments = [], isLoading: departmentsLoading } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    enabled: !!isAuthenticated,
  });

  // Delete department mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/departments/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Department Deleted",
        description: "Department has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
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
        title: "Delete Failed",
        description: error.message || "Failed to delete department",
        variant: "destructive",
      });
    },
  });

  // Filter departments based on search
  const filteredDepartments = departments.filter((dept: Department) =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (department: Department) => {
    setSelectedDepartment(department);
    setEditModalOpen(true);
  };

  const handleDelete = (department: Department) => {
    if (window.confirm(`Are you sure you want to delete "${department.name}"?`)) {
      deleteMutation.mutate(department.id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      
      <main className="flex-1 overflow-hidden">
        <Header 
          title="Departments"
          description="Manage organizational departments and teams"
        />
        
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                <Input
                  placeholder="Search departments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button 
              onClick={() => setAddModalOpen(true)}
              className="bg-primary-600 hover:bg-primary-700"
            >
              <i className="fas fa-plus mr-2"></i>
              Add Department
            </Button>
          </div>

          {/* Departments Grid */}
          {departmentsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2 mt-2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-3 bg-slate-200 rounded w-full"></div>
                    <div className="h-3 bg-slate-200 rounded w-2/3 mt-2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredDepartments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <i className="fas fa-building text-slate-300 text-4xl mb-4"></i>
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  {searchTerm ? "No matching departments" : "No departments yet"}
                </h3>
                <p className="text-slate-600 mb-4">
                  {searchTerm 
                    ? "Try adjusting your search terms" 
                    : "Create your first department to organize your software assets"
                  }
                </p>
                {!searchTerm && (
                  <Button 
                    onClick={() => setAddModalOpen(true)}
                    className="bg-primary-600 hover:bg-primary-700"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    Add Department
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDepartments.map((department: Department) => (
                <Card key={department.id} className="group hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">
                          {department.name}
                        </CardTitle>
                        <p className="text-sm text-slate-500 mt-1">
                          Created {new Date(department.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(department)}
                          className="h-8 w-8 p-0 hover:bg-slate-100"
                        >
                          <i className="fas fa-edit text-slate-600"></i>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(department)}
                          className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                          disabled={deleteMutation.isPending}
                        >
                          <i className="fas fa-trash text-slate-600"></i>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {department.description && (
                      <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                        {department.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        <i className="fas fa-users mr-1"></i>
                        Department
                      </Badge>
                      
                      <div className="text-xs text-slate-500">
                        ID: {department.id.slice(0, 8)}...
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <AddDepartmentModal 
        open={addModalOpen} 
        onOpenChange={setAddModalOpen}
      />
      <EditDepartmentModal 
        open={editModalOpen} 
        onOpenChange={setEditModalOpen}
        department={selectedDepartment}
      />
    </div>
  );
}