import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import AddAssetModal from "@/components/modals/add-asset-modal";
import EditSoftwareModal from "@/components/modals/edit-software-modal";

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

export default function SoftwareList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [technologyFilter, setTechnologyFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSoftware, setSelectedSoftware] = useState<SoftwareAsset | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: software = [], isLoading } = useQuery<SoftwareAsset[]>({
    queryKey: ["/api/software"],
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["/api/departments"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest("PUT", `/api/software/${id}`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Software status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/software"] });
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
        description: "Failed to update software status",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "update-available":
        return "bg-amber-100 text-amber-800";
      case "deprecated":
        return "bg-red-100 text-red-800";
      case "inactive":
        return "bg-slate-100 text-slate-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getTechnologyIcon = (technology: string) => {
    switch (technology?.toLowerCase()) {
      case "database":
        return "fas fa-database";
      case "web-app":
        return "fas fa-globe";
      case "api":
        return "fas fa-code";
      case "desktop":
        return "fas fa-desktop";
      case "mobile":
        return "fas fa-mobile";
      case "cloud":
        return "fas fa-cloud";
      default:
        return "fas fa-cube";
    }
  };

  const getTechnologyColor = (technology: string) => {
    switch (technology?.toLowerCase()) {
      case "database":
        return "text-red-600 bg-red-100";
      case "web-app":
        return "text-blue-600 bg-blue-100";
      case "api":
        return "text-purple-600 bg-purple-100";
      case "desktop":
        return "text-green-600 bg-green-100";
      case "mobile":
        return "text-orange-600 bg-orange-100";
      case "cloud":
        return "text-sky-600 bg-sky-100";
      default:
        return "text-slate-600 bg-slate-100";
    }
  };

  const filteredSoftware = software.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.vendor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesTechnology = technologyFilter === "all" || item.technology === technologyFilter;
    
    return matchesSearch && matchesStatus && matchesTechnology;
  });

  const uniqueTechnologies = [...new Set(software.map(s => s.technology).filter(Boolean))];

  const handleEditSoftware = (software: SoftwareAsset) => {
    setSelectedSoftware(software);
    setShowEditModal(true);
  };

  const handleDeleteSoftware = (software: SoftwareAsset) => {
    if (window.confirm(`Are you sure you want to delete "${software.name}"?`)) {
      // TODO: Implement delete functionality
      toast({
        title: "Delete Functionality",
        description: "Delete functionality will be implemented soon.",
        variant: "destructive",
      });
    }
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

        {/* Table Skeleton */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Software Assets</CardTitle>
            <Button onClick={() => setShowAddModal(true)}>
              <i className="fas fa-plus mr-2"></i>
              Add Software
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Search software, vendor, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="update-available">Update Available</SelectItem>
                <SelectItem value="deprecated">Deprecated</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={technologyFilter} onValueChange={setTechnologyFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Technology" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Technologies</SelectItem>
                {uniqueTechnologies.map((tech) => (
                  <SelectItem key={tech} value={tech}>
                    {tech.charAt(0).toUpperCase() + tech.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Software List */}
      <Card>
        <CardContent className="p-6">
          {filteredSoftware.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-desktop text-slate-400 text-4xl mb-4"></i>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                {software.length === 0 ? "No software assets found" : "No matching software found"}
              </h3>
              <p className="text-slate-500 mb-6">
                {software.length === 0 
                  ? "Add your first software asset to get started with tracking your portfolio"
                  : "Try adjusting your search terms or filters"
                }
              </p>
              {software.length === 0 && (
                <Button onClick={() => setShowAddModal(true)}>
                  <i className="fas fa-plus mr-2"></i>
                  Add First Software Asset
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-slate-200">
                    <th className="pb-3 text-sm font-medium text-slate-600">Software</th>
                    <th className="pb-3 text-sm font-medium text-slate-600">Version</th>
                    <th className="pb-3 text-sm font-medium text-slate-600">Department</th>
                    <th className="pb-3 text-sm font-medium text-slate-600">Vendor</th>
                    <th className="pb-3 text-sm font-medium text-slate-600">License</th>
                    <th className="pb-3 text-sm font-medium text-slate-600">Status</th>
                    <th className="pb-3 text-sm font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSoftware.map((item, index) => (
                    <tr key={item.id} className={`border-b border-slate-100 ${index === filteredSoftware.length - 1 ? 'border-0' : ''}`}>
                      <td className="py-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getTechnologyColor(item.technology || "")}`}>
                            <i className={`${getTechnologyIcon(item.technology || "")} text-sm`}></i>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{item.name}</p>
                            <p className="text-sm text-slate-500">{item.technology || "Unknown"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="font-mono text-sm">{item.version || "N/A"}</span>
                      </td>
                      <td className="py-4">
                        <span className="text-sm text-slate-600">{item.department?.name || "Unassigned"}</span>
                      </td>
                      <td className="py-4">
                        <span className="text-sm text-slate-600">{item.vendor || "N/A"}</span>
                      </td>
                      <td className="py-4">
                        <span className="text-sm text-slate-600 capitalize">
                          {item.licenseType?.replace("-", " ") || "N/A"}
                        </span>
                      </td>
                      <td className="py-4">
                        <Badge className={`text-xs ${getStatusColor(item.status)}`}>
                          {item.status.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSoftware(item)}
                            className="h-8 w-8 p-0 hover:bg-slate-100"
                          >
                            <i className="fas fa-edit text-slate-600"></i>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSoftware(item)}
                            className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                          >
                            <i className="fas fa-trash text-slate-600"></i>
                          </Button>
                          <Select
                            value={item.status}
                            onValueChange={(value) => updateStatusMutation.mutate({ id: item.id, status: value })}
                          >
                            <SelectTrigger className="w-24 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="update-available">Update Available</SelectItem>
                              <SelectItem value="deprecated">Deprecated</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddAssetModal 
        open={showAddModal} 
        onOpenChange={setShowAddModal}
      />
      
      <EditSoftwareModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        software={selectedSoftware}
      />
    </div>
  );
}
