import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Search, 
  Play, 
  Plus, 
  Server, 
  CheckCircle, 
  XCircle, 
  Clock,
  Activity,
  Eye,
  Download,
  RefreshCw
} from "lucide-react";

const agentFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["network-scan", "api-integration", "agent-based", "registry-scan"]),
  environmentId: z.string().optional(),
  schedule: z.string().optional(),
  configuration: z.string().optional(),
});

type AgentFormData = z.infer<typeof agentFormSchema>;

interface DiscoveryAgent {
  id: string;
  name: string;
  type: string;
  status: string;
  lastRun?: string;
  nextRun?: string;
  environment?: {
    id: string;
    name: string;
  };
}

interface DiscoverySession {
  id: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  totalFound: number;
  newAssets: number;
  agent: {
    id: string;
    name: string;
  };
}

interface DiscoveredSoftware {
  id: string;
  name: string;
  version?: string;
  vendor?: string;
  technology?: string;
  sourceType: string;
  confidence: number;
  status: string;
  discoveredAt: string;
  agent: {
    id: string;
    name: string;
  };
  session: {
    id: string;
  };
}

export default function Discovery() {
  const [showAddAgentModal, setShowAddAgentModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AgentFormData>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: "",
      type: "network-scan",
      environmentId: "",
      schedule: "",
      configuration: "",
    },
  });

  // Fetch discovery agents
  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ["/api/discovery/agents"],
    retry: false,
  });

  // Fetch discovery sessions
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["/api/discovery/sessions"],
    retry: false,
  });

  // Fetch discovered software
  const { data: discovered = [], isLoading: discoveredLoading } = useQuery({
    queryKey: ["/api/discovery/discovered"],
    retry: false,
  });

  // Fetch environments for agent creation
  const { data: environments = [] } = useQuery({
    queryKey: ["/api/environments"],
    retry: false,
  });

  // Create discovery agent mutation
  const createAgentMutation = useMutation({
    mutationFn: async (data: AgentFormData) => {
      const payload = {
        ...data,
        configuration: data.configuration ? JSON.parse(data.configuration) : null,
      };
      return await apiRequest("/api/discovery/agents", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discovery/agents"] });
      setShowAddAgentModal(false);
      form.reset();
      toast({
        title: "Success",
        description: "Discovery agent created successfully",
      });
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
        description: "Failed to create discovery agent",
        variant: "destructive",
      });
    },
  });

  // Run discovery agent mutation
  const runAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      return await apiRequest(`/api/discovery/agents/${agentId}/run`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discovery/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/discovery/agents"] });
      toast({
        title: "Success",
        description: "Discovery scan started successfully",
      });
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
        description: "Failed to start discovery scan",
        variant: "destructive",
      });
    },
  });

  // Approve discovered software mutation
  const approveMutation = useMutation({
    mutationFn: async (discoveredId: string) => {
      return await apiRequest(`/api/discovery/discovered/${discoveredId}/approve`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discovery/discovered"] });
      queryClient.invalidateQueries({ queryKey: ["/api/software"] });
      toast({
        title: "Success",
        description: "Software approved and added to inventory",
      });
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
        description: "Failed to approve discovered software",
        variant: "destructive",
      });
    },
  });

  // Reject discovered software mutation
  const rejectMutation = useMutation({
    mutationFn: async (discoveredId: string) => {
      return await apiRequest(`/api/discovery/discovered/${discoveredId}/reject`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discovery/discovered"] });
      toast({
        title: "Success",
        description: "Discovered software rejected",
      });
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
        description: "Failed to reject discovered software",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AgentFormData) => {
    createAgentMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "completed":
        return "bg-green-100 text-green-800";
      case "running":
        return "bg-blue-100 text-blue-800";
      case "failed":
      case "error":
        return "bg-red-100 text-red-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "bg-green-100 text-green-800";
    if (confidence >= 70) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Automated Discovery</h1>
          <p className="text-gray-600">Discover and manage software assets automatically</p>
        </div>
        <Dialog open={showAddAgentModal} onOpenChange={setShowAddAgentModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Discovery Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Discovery Agent</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agent Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Production Network Scanner" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discovery Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select discovery type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="network-scan">Network Scan</SelectItem>
                          <SelectItem value="api-integration">API Integration</SelectItem>
                          <SelectItem value="agent-based">Agent-based</SelectItem>
                          <SelectItem value="registry-scan">Registry Scan</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="environmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Environment (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select environment" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">All Environments</SelectItem>
                          {environments.map((env: any) => (
                            <SelectItem key={env.id} value={env.id}>
                              {env.name}
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
                  name="schedule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Schedule (Cron Expression, Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 0 0 * * 0 (weekly)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="configuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Configuration (JSON, Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder='{"timeout": 30, "retries": 3}'
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddAgentModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createAgentMutation.isPending}>
                    {createAgentMutation.isPending ? "Creating..." : "Create Agent"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents">Discovery Agents</TabsTrigger>
          <TabsTrigger value="sessions">Scan Sessions</TabsTrigger>
          <TabsTrigger value="discovered">Discovered Software</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          {agentsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent: DiscoveryAgent) => (
                <Card key={agent.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      <Badge className={getStatusColor(agent.status)}>
                        {agent.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 capitalize">{agent.type.replace('-', ' ')}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {agent.environment && (
                      <div className="flex items-center space-x-2">
                        <Server className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{agent.environment.name}</span>
                      </div>
                    )}
                    
                    {agent.lastRun && (
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          Last run: {new Date(agent.lastRun).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => runAgentMutation.mutate(agent.id)}
                        disabled={runAgentMutation.isPending || agent.status !== 'active'}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        {runAgentMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Run Scan"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          {sessionsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                    <Skeleton className="h-3 w-1/2 mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session: DiscoverySession) => (
                <Card key={session.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{session.agent.name}</h3>
                        <p className="text-sm text-gray-600">
                          Started: {new Date(session.startedAt).toLocaleString()}
                          {session.completedAt && (
                            <> • Completed: {new Date(session.completedAt).toLocaleString()}</>
                          )}
                        </p>
                      </div>
                      <Badge className={getStatusColor(session.status)}>
                        {session.status}
                      </Badge>
                    </div>
                    
                    {session.status === 'completed' && (
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Search className="h-4 w-4 text-blue-500" />
                          <span className="text-sm">Found: {session.totalFound}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Download className="h-4 w-4 text-green-500" />
                          <span className="text-sm">New: {session.newAssets}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="discovered" className="space-y-4">
          {discoveredLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                    <Skeleton className="h-3 w-2/3 mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {discovered.map((item: DiscoveredSoftware) => (
                <Card key={item.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold">{item.name}</h3>
                          {item.version && (
                            <Badge variant="outline">v{item.version}</Badge>
                          )}
                          <Badge className={getConfidenceColor(item.confidence)}>
                            {item.confidence}% confidence
                          </Badge>
                        </div>
                        
                        <div className="mt-2 space-y-1">
                          {item.vendor && (
                            <p className="text-sm text-gray-600">Vendor: {item.vendor}</p>
                          )}
                          {item.technology && (
                            <p className="text-sm text-gray-600">Technology: {item.technology}</p>
                          )}
                          <p className="text-sm text-gray-600">
                            Source: {item.sourceType} • Agent: {item.agent.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            Discovered: {new Date(item.discoveredAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate(item.id)}
                          disabled={approveMutation.isPending || item.status !== 'discovered'}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectMutation.mutate(item.id)}
                          disabled={rejectMutation.isPending || item.status !== 'discovered'}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}