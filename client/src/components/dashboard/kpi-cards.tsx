import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function KPICards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-8 w-20 mb-4" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpis = [
    {
      title: "Total Software Assets",
      value: stats?.totalSoftware || 0,
      change: "+12%",
      changeType: "positive" as const,
      icon: "fas fa-desktop",
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100",
    },
    {
      title: "Active Environments",
      value: stats?.activeEnvironments || 0,
      change: "+5%",
      changeType: "positive" as const,
      icon: "fas fa-server",
      iconColor: "text-green-600",
      iconBg: "bg-green-100",
    },
    {
      title: "Monthly License Cost",
      value: `$${stats?.monthlyCost?.toLocaleString() || "0"}`,
      change: "+3%",
      changeType: "negative" as const,
      icon: "fas fa-dollar-sign",
      iconColor: "text-amber-600",
      iconBg: "bg-amber-100",
    },
    {
      title: "Critical Dependencies",
      value: stats?.criticalDependencies || 0,
      change: "+2",
      changeType: "negative" as const,
      icon: "fas fa-exclamation-triangle",
      iconColor: "text-red-600",
      iconBg: "bg-red-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((kpi, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">{kpi.title}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{kpi.value}</p>
              </div>
              <div className={`w-12 h-12 ${kpi.iconBg} rounded-lg flex items-center justify-center`}>
                <i className={`${kpi.icon} ${kpi.iconColor}`}></i>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className={`text-sm flex items-center ${
                kpi.changeType === "positive" ? "text-green-600" : "text-red-600"
              }`}>
                <i className={`fas fa-arrow-${kpi.changeType === "positive" ? "up" : "up"} mr-1`}></i>
                {kpi.change}
              </span>
              <span className="text-slate-500 text-sm ml-2">vs last month</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
