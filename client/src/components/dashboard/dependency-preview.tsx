import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function DependencyPreview() {
  const { data: dependencies, isLoading: dependenciesLoading } = useQuery({
    queryKey: ["/api/dependencies"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  if (dependenciesLoading || statsLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Dependency Overview</CardTitle>
            <Skeleton className="h-4 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full rounded-lg mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="text-center p-4 bg-slate-50 rounded-lg">
                <Skeleton className="h-8 w-16 mx-auto mb-2" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Dependency Overview</CardTitle>
          <Link href="/dependencies">
            <a className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View Full Map
            </a>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {/* ReactFlow Integration Placeholder */}
        <div className="h-64 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center mb-6">
          <div className="text-center">
            <i className="fas fa-project-diagram text-slate-400 text-3xl mb-4"></i>
            <p className="text-slate-600 font-medium">Interactive Dependency Map</p>
            <p className="text-sm text-slate-500 mt-1">
              {dependencies && dependencies.length > 0
                ? `${dependencies.length} dependencies found`
                : "No dependencies defined yet"
              }
            </p>
          </div>
        </div>
        
        {/* Dependency Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-slate-900">
              {stats?.totalConnections || 0}
            </p>
            <p className="text-sm text-slate-600">Total Connections</p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-amber-600">
              {stats?.criticalPaths || 0}
            </p>
            <p className="text-sm text-slate-600">Critical Paths</p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">
              {stats?.isolatedAssets || 0}
            </p>
            <p className="text-sm text-slate-600">Isolated Assets</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
