import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

export default function EnvironmentStatus() {
  const { data: environments, isLoading } = useQuery({
    queryKey: ["/api/environments"],
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
        return "bg-green-500";
      case "inactive":
        return "bg-red-500";
      case "maintenance":
        return "bg-amber-500";
      default:
        return "bg-slate-500";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Environment Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-3 w-3 rounded-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-10 w-full mt-6 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Environment Status</CardTitle>
      </CardHeader>
      <CardContent>
        {!environments || environments.length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-server text-slate-400 text-3xl mb-4"></i>
            <p className="text-slate-600 font-medium">No environments found</p>
            <p className="text-sm text-slate-500 mt-1">Add your first environment to get started</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {environments.slice(0, 4).map((env) => (
                <div key={env.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getEnvironmentColor(env.type)}`}>
                      <i className={getEnvironmentIcon(env.type)}></i>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{env.name}</p>
                      <p className="text-sm text-slate-500">
                        {env.instanceCount || 0} {env.type === "vm" ? "VMs" : env.type === "container" ? "containers" : "instances"}
                      </p>
                    </div>
                  </div>
                  <span className={`w-3 h-3 ${getStatusColor(env.status)} rounded-full`}></span>
                </div>
              ))}
            </div>

            <Link href="/environments">
              <Button variant="outline" className="w-full mt-6">
                View All Environments
              </Button>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
