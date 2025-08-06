import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

export default function SoftwareTable() {
  const { data: software, isLoading } = useQuery({
    queryKey: ["/api/software"],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "update-available":
        return "bg-amber-100 text-amber-800";
      case "deprecated":
        return "bg-red-100 text-red-800";
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
      default:
        return "text-slate-600 bg-slate-100";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Software Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentSoftware = software?.slice(0, 5) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Software Assets</CardTitle>
          <Link href="/software">
            <a className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View All
            </a>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {recentSoftware.length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-desktop text-slate-400 text-3xl mb-4"></i>
            <p className="text-slate-600 font-medium">No software assets found</p>
            <p className="text-sm text-slate-500 mt-1">Add your first software asset to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-slate-200">
                  <th className="pb-3 text-sm font-medium text-slate-600">Software</th>
                  <th className="pb-3 text-sm font-medium text-slate-600">Version</th>
                  <th className="pb-3 text-sm font-medium text-slate-600">Department</th>
                  <th className="pb-3 text-sm font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSoftware.map((item, index) => (
                  <tr key={item.id} className={`border-b border-slate-100 ${index === recentSoftware.length - 1 ? 'border-0' : ''}`}>
                    <td className="py-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTechnologyColor(item.technology || "")}`}>
                          <i className={`${getTechnologyIcon(item.technology || "")} text-sm`}></i>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{item.name}</p>
                          <p className="text-sm text-slate-500">{item.technology || "Unknown"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="font-mono text-sm">{item.version || "N/A"}</span>
                    </td>
                    <td className="py-3">
                      <span className="text-sm text-slate-600">{item.department?.name || "Unassigned"}</span>
                    </td>
                    <td className="py-3">
                      <Badge className={`text-xs ${getStatusColor(item.status)}`}>
                        {item.status.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
