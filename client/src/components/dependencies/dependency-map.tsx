import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
} from "reactflow";
import "reactflow/dist/style.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const nodeTypes = {
  // Custom node types can be added here if needed
};

export default function DependencyMap() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState("");
  const [selectedDependent, setSelectedDependent] = useState("");
  const [dependencyType, setDependencyType] = useState("required");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: software, isLoading: softwareLoading } = useQuery({
    queryKey: ["/api/software"],
  });

  const { data: dependencies, isLoading: dependenciesLoading } = useQuery({
    queryKey: ["/api/dependencies"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const createDependencyMutation = useMutation({
    mutationFn: async (data: { parentSoftwareId: string; dependentSoftwareId: string; dependencyType: string; description?: string }) => {
      return await apiRequest("POST", "/api/dependencies", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Dependency created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dependencies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      setSelectedParent("");
      setSelectedDependent("");
      setDependencyType("required");
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
        description: "Failed to create dependency",
        variant: "destructive",
      });
    },
  });

  // Create nodes from software assets
  const createNodes = useCallback((): Node[] => {
    if (!software) return [];

    const nodeSpacing = 200;
    const nodesPerRow = Math.ceil(Math.sqrt(software.length));

    return software.map((asset, index) => {
      const row = Math.floor(index / nodesPerRow);
      const col = index % nodesPerRow;
      
      return {
        id: asset.id,
        type: 'default',
        position: {
          x: col * nodeSpacing,
          y: row * nodeSpacing,
        },
        data: {
          label: (
            <div className="text-center">
              <div className="font-medium text-sm">{asset.name}</div>
              <div className="text-xs text-slate-500">{asset.technology || 'Unknown'}</div>
            </div>
          ),
        },
        style: {
          background: '#ffffff',
          border: '2px solid #e2e8f0',
          borderRadius: '8px',
          padding: '10px',
          minWidth: '150px',
        },
      };
    });
  }, [software]);

  // Create edges from dependencies
  const createEdges = useCallback((): Edge[] => {
    if (!dependencies) return [];

    return dependencies.map((dep) => ({
      id: dep.id,
      source: dep.parentSoftwareId,
      target: dep.dependentSoftwareId,
      type: 'smoothstep',
      animated: dep.dependencyType === 'required',
      style: {
        stroke: dep.dependencyType === 'required' ? '#ef4444' : 
               dep.dependencyType === 'optional' ? '#3b82f6' : '#8b5cf6',
        strokeWidth: 2,
      },
      label: dep.dependencyType,
      labelStyle: {
        fontSize: '10px',
        fontWeight: 'bold',
      },
    }));
  }, [dependencies]);

  const [nodes, setNodes, onNodesChange] = useNodesState(createNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(createEdges());

  // Update nodes and edges when data changes
  useState(() => {
    setNodes(createNodes());
    setEdges(createEdges());
  }, [software, dependencies, createNodes, createEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      // Handle manual connection creation if needed
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges]
  );

  const getDependencyTypeColor = (type: string) => {
    switch (type) {
      case "required":
        return "bg-red-100 text-red-800";
      case "optional":
        return "bg-blue-100 text-blue-800";
      case "integration":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const handleCreateDependency = () => {
    if (!selectedParent || !selectedDependent) {
      toast({
        title: "Error",
        description: "Please select both parent and dependent software",
        variant: "destructive",
      });
      return;
    }

    if (selectedParent === selectedDependent) {
      toast({
        title: "Error",
        description: "Software cannot depend on itself",
        variant: "destructive",
      });
      return;
    }

    createDependencyMutation.mutate({
      parentSoftwareId: selectedParent,
      dependentSoftwareId: selectedDependent,
      dependencyType,
      description: `${dependencyType} dependency`,
    });
  };

  if (softwareLoading || dependenciesLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Dependency Map</CardTitle>
            <Button onClick={() => setShowAddModal(true)} disabled={!software || software.length < 2}>
              <i className="fas fa-plus mr-2"></i>
              Add Dependency
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{stats?.totalConnections || 0}</p>
            <p className="text-sm text-slate-600">Total Dependencies</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats?.criticalPaths || 0}</p>
            <p className="text-sm text-slate-600">Critical Paths</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats?.isolatedAssets || 0}</p>
            <p className="text-sm text-slate-600">Isolated Assets</p>
          </CardContent>
        </Card>
      </div>

      {/* Dependency Visualization */}
      <Card>
        <CardContent className="p-0">
          {!software || software.length === 0 ? (
            <div className="h-96 flex items-center justify-center">
              <div className="text-center">
                <i className="fas fa-project-diagram text-slate-400 text-4xl mb-4"></i>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No software assets found</h3>
                <p className="text-slate-500">Add software assets to visualize dependencies</p>
              </div>
            </div>
          ) : (
            <div className="h-96 relative">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                attributionPosition="bottom-left"
              >
                <Controls />
                <MiniMap />
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
              </ReactFlow>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dependencies List */}
      {dependencies && dependencies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dependencies List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dependencies.map((dep) => (
                <div key={dep.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm">
                      <span className="font-medium">{dep.parentSoftware.name}</span>
                      <i className="fas fa-arrow-right mx-2 text-slate-400"></i>
                      <span className="font-medium">{dep.dependentSoftware.name}</span>
                    </div>
                  </div>
                  <Badge className={`text-xs ${getDependencyTypeColor(dep.dependencyType)}`}>
                    {dep.dependencyType.charAt(0).toUpperCase() + dep.dependencyType.slice(1)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Dependency Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Software Dependency</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Parent Software (depends on)
              </label>
              <Select value={selectedParent} onValueChange={setSelectedParent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent software" />
                </SelectTrigger>
                <SelectContent>
                  {software?.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Dependent Software (is depended on)
              </label>
              <Select value={selectedDependent} onValueChange={setSelectedDependent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select dependent software" />
                </SelectTrigger>
                <SelectContent>
                  {software?.filter(asset => asset.id !== selectedParent).map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Dependency Type
              </label>
              <Select value={dependencyType} onValueChange={setDependencyType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="required">Required</SelectItem>
                  <SelectItem value="optional">Optional</SelectItem>
                  <SelectItem value="integration">Integration</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowAddModal(false)}
                disabled={createDependencyMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateDependency}
                disabled={createDependencyMutation.isPending}
              >
                {createDependencyMutation.isPending ? "Creating..." : "Create Dependency"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
