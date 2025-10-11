import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  RefreshCw,
  HelpCircle,
  Copy,
  Code
} from "lucide-react";

const agentFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["network-scan", "api-integration", "agent-based", "registry-scan"]),
  environmentId: z.string().optional(),
  configuration: z.string().optional(),
});

type AgentFormData = z.infer<typeof agentFormSchema>;

interface DiscoveryAgent {
  id: string;
  name: string;
  type: string;
  status: string;
  environmentId?: string;
  configuration?: any;
  lastRun?: string;
  createdAt: string;
}

interface DiscoverySession {
  id: string;
  agentId: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  itemsDiscovered: number;
  agent?: {
    name: string;
  };
}

interface DiscoveredSoftware {
  id: string;
  sessionId: string;
  name: string;
  vendor?: string;
  version?: string;
  installPath?: string;
  confidence: number;
  status: string;
  discoveredAt: string;
}

export default function Discovery() {
  const [showAddAgentModal, setShowAddAgentModal] = useState(false);
  const [showDocumentationModal, setShowDocumentationModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AgentFormData>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: "",
      type: "network-scan",
      environmentId: "",
      configuration: "",
    },
  });

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ["/api/discovery/agents"],
    retry: false,
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["/api/discovery/sessions"],
    retry: false,
  });

  const { data: discovered = [], isLoading: discoveredLoading } = useQuery({
    queryKey: ["/api/discovery/discovered"],
    retry: false,
  });

  const { data: environments = [] } = useQuery({
    queryKey: ["/api/environments"],
    retry: false,
  });

  const createAgentMutation = useMutation({
    mutationFn: async (data: AgentFormData) => {
      await apiRequest("POST", "/api/discovery/agents", data);
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

  const runAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      await apiRequest("POST", `/api/discovery/agents/${agentId}/run`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discovery/sessions"] });
      toast({
        title: "Success",
        description: "Discovery scan started",
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

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/discovery/discovered/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discovery/discovered"] });
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
        description: "Failed to approve software",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/discovery/discovered/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discovery/discovered"] });
      toast({
        title: "Success",
        description: "Software rejected",
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
        description: "Failed to reject software",
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
          <p className="text-gray-600">Discover and manage software assets automatically across your infrastructure</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={showDocumentationModal} onOpenChange={setShowDocumentationModal}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <HelpCircle className="h-4 w-4 mr-2" />
                Documentation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Discovery Documentation & API Configuration</DialogTitle>
                <DialogDescription>
                  Learn how to configure and use automated discovery agents with API examples
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-6">
                  {/* How to Use Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">How to Use Automated Discovery</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                        <h4 className="font-semibold text-blue-900 mb-2">1. Create Discovery Agents</h4>
                        <p className="text-sm text-blue-800">
                          Set up automated discovery agents to scan your infrastructure. Choose from network scanning, 
                          API integrations, agent-based discovery, or registry scanning methods.
                        </p>
                      </div>
                      <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                        <h4 className="font-semibold text-green-900 mb-2">2. Run Discovery Scans</h4>
                        <p className="text-sm text-green-800">
                          Execute discovery agents to scan for installed software. Agents will automatically detect 
                          applications, versions, vendors, and installation paths across your environments.
                        </p>
                      </div>
                      <div className="p-4 border border-purple-200 rounded-lg bg-purple-50">
                        <h4 className="font-semibold text-purple-900 mb-2">3. Review & Approve</h4>
                        <p className="text-sm text-purple-800">
                          Review discovered software with confidence scores. Approve items to automatically add them 
                          to your software inventory, or reject false positives to keep your data clean.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Discovery Methods */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Discovery Methods</h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="p-3 border rounded-lg">
                        <span className="font-medium text-blue-600">Network Scan:</span> Discovers software across network-connected devices
                      </div>
                      <div className="p-3 border rounded-lg">
                        <span className="font-medium text-green-600">API Integration:</span> Connects to external systems and APIs
                      </div>
                      <div className="p-3 border rounded-lg">
                        <span className="font-medium text-purple-600">Agent-based:</span> Uses installed agents for deep system scanning
                      </div>
                      <div className="p-3 border rounded-lg">
                        <span className="font-medium text-orange-600">Registry Scan:</span> Scans Windows registry and system catalogs
                      </div>
                    </div>
                  </div>

                  {/* API Configuration Examples */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Code className="h-5 w-5 mr-2" />
                      API Configuration Examples
                    </h3>
                    
                    <div className="space-y-4">
                      {/* Create Agent API */}
                      <div>
                        <h4 className="font-medium mb-2">Create Discovery Agent</h4>
                        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400">POST /api/discovery/agents</span>
                            <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText('POST /api/discovery/agents')}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <pre className="whitespace-pre-wrap">{`{
  "name": "Production Network Scanner",
  "type": "network-scan",
  "environmentId": "env-123",
  "schedule": "0 2 * * 1",
  "configuration": {
    "ipRanges": ["192.168.1.0/24", "10.0.0.0/16"],
    "ports": [22, 80, 443, 3389],
    "timeout": 30,
    "parallel": 10,
    "protocols": ["ssh", "http", "rdp"],
    "credentials": {
      "username": "scanner",
      "keyFile": "/path/to/key"
    }
  }
}`}</pre>
                        </div>
                      </div>

                      {/* Demo Mode Note */}
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <h4 className="font-semibold text-amber-900 mb-2">Demo Mode</h4>
                        <p className="text-sm text-amber-800">
                          The discovery system is currently in demo mode. When you run discovery agents, they simulate 
                          finding popular software like Microsoft Office, Chrome, and Docker for demonstration purposes. 
                          In production, agents would connect to real infrastructure using the configurations above.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
          
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
                <DialogDescription>
                  Configure a new discovery agent to automatically scan and detect software in your infrastructure
                </DialogDescription>
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
                          <Input placeholder="Production Network Scanner" {...field} />
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
                        <FormLabel>Discovery Method</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select discovery method" />
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
                            {Array.isArray(environments) && environments.map((env: any) => (
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
                    name="configuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Configuration (JSON)</FormLabel>
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
          ) : Array.isArray(agents) && agents.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Server className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Discovery Agents Yet</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Create your first discovery agent to start automatically finding software across your infrastructure. 
                  Agents can scan networks, integrate with APIs, or use system-level detection methods.
                </p>
                <Dialog open={showAddAgentModal} onOpenChange={setShowAddAgentModal}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Discovery Agent
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.isArray(agents) && agents.map((agent: DiscoveryAgent) => (
                <Card key={agent.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      <Badge className={getStatusColor(agent.status)}>
                        {agent.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {agent.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-gray-600">
                      <p>Created: {new Date(agent.createdAt).toLocaleDateString()}</p>
                      {agent.lastRun && (
                        <p>Last run: {new Date(agent.lastRun).toLocaleDateString()}</p>
                      )}
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => runAgentMutation.mutate(agent.id)}
                      disabled={runAgentMutation.isPending}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {runAgentMutation.isPending ? "Starting..." : "Run Scan"}
                    </Button>
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
          ) : Array.isArray(sessions) && sessions.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Activity className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Discovery Sessions</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Discovery sessions are created when you run discovery agents. Each session tracks the scanning 
                  progress, results, and discovered software. Create and run a discovery agent to see sessions here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Array.isArray(sessions) && sessions.map((session: DiscoverySession) => (
                <Card key={session.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{session.agent?.name || `Session ${session.id.slice(0, 8)}`}</h4>
                        <p className="text-sm text-gray-600">
                          Started: {new Date(session.startedAt).toLocaleString()}
                        </p>
                        {session.completedAt && (
                          <p className="text-sm text-gray-600">
                            Completed: {new Date(session.completedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(session.status)}>
                          {session.status}
                        </Badge>
                        <p className="text-sm text-gray-600 mt-1">
                          {session.itemsDiscovered} items found
                        </p>
                      </div>
                    </div>
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
          ) : Array.isArray(discovered) && discovered.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Search className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Software Discovered Yet</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  When discovery agents scan your infrastructure, found software will appear here with confidence 
                  scores and detection details. You can then approve items to add them to your software inventory 
                  or reject false positives.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-lg mx-auto">
                  <p className="text-sm text-amber-800">
                    <strong>Demo Mode:</strong> Discovery agents simulate finding popular software like Microsoft Office, 
                    Chrome, and Docker for demonstration purposes. In production, agents would connect to real 
                    infrastructure and use actual discovery protocols.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Array.isArray(discovered) && discovered.map((item: DiscoveredSoftware) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium">{item.name}</h4>
                          <Badge className={getConfidenceColor(item.confidence)}>
                            {item.confidence}% confidence
                          </Badge>
                          <Badge className={getStatusColor(item.status)}>
                            {item.status}
                          </Badge>
                        </div>
                        
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          {item.vendor && <p>Vendor: {item.vendor}</p>}
                          {item.version && <p>Version: {item.version}</p>}
                          {item.installPath && <p>Path: {item.installPath}</p>}
                          <p>
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