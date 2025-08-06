import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface CostSummary {
  totalMonthlyCost: number;
  totalYearlyCost: number;
  totalOneTimeCost: number;
  activeLicenses: number;
  costByType: { [key: string]: number };
  costByDepartment: { [key: string]: number };
}

export default function CostDashboard() {
  const [timePeriod, setTimePeriod] = useState("monthly");
  const [costTypeFilter, setCostTypeFilter] = useState("all");

  const { data: costs, isLoading: costsLoading } = useQuery({
    queryKey: ["/api/costs"],
  });

  const { data: software } = useQuery({
    queryKey: ["/api/software"],
  });

  const { data: departments } = useQuery({
    queryKey: ["/api/departments"],
  });

  // Calculate cost summary
  const costSummary: CostSummary = {
    totalMonthlyCost: 0,
    totalYearlyCost: 0,
    totalOneTimeCost: 0,
    activeLicenses: 0,
    costByType: {},
    costByDepartment: {},
  };

  if (costs) {
    costs.forEach((cost) => {
      if (!cost.isActive) return;

      const amount = Number(cost.amount);
      costSummary.activeLicenses++;

      // Sum by billing cycle
      if (cost.billingCycle === "monthly") {
        costSummary.totalMonthlyCost += amount;
      } else if (cost.billingCycle === "yearly") {
        costSummary.totalYearlyCost += amount;
      } else if (cost.billingCycle === "one-time") {
        costSummary.totalOneTimeCost += amount;
      }

      // Sum by cost type
      costSummary.costByType[cost.costType] = (costSummary.costByType[cost.costType] || 0) + amount;

      // Sum by department
      const deptName = cost.software.department?.name || "Unassigned";
      costSummary.costByDepartment[deptName] = (costSummary.costByDepartment[deptName] || 0) + amount;
    });
  }

  const filteredCosts = costs?.filter((cost) => {
    if (!cost.isActive) return false;
    if (costTypeFilter !== "all" && cost.costType !== costTypeFilter) return false;
    if (timePeriod !== "all" && cost.billingCycle !== timePeriod) return false;
    return true;
  }) || [];

  const getCostTypeColor = (type: string) => {
    switch (type) {
      case "license":
        return "bg-blue-100 text-blue-800";
      case "subscription":
        return "bg-green-100 text-green-800";
      case "development":
        return "bg-purple-100 text-purple-800";
      case "maintenance":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getBillingCycleColor = (cycle: string) => {
    switch (cycle) {
      case "monthly":
        return "bg-green-100 text-green-800";
      case "yearly":
        return "bg-blue-100 text-blue-800";
      case "one-time":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const exportCostReport = () => {
    if (!costs) return;

    const csvData = [
      ["Software", "Department", "Cost Type", "Amount", "Currency", "Billing Cycle", "Status"],
      ...costs.map((cost) => [
        cost.software.name,
        cost.software.department?.name || "Unassigned",
        cost.costType,
        cost.amount,
        cost.currency,
        cost.billingCycle,
        cost.isActive ? "Active" : "Inactive",
      ]),
    ];

    const csvContent = csvData.map(row => row.map(field => `"${field}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "software_costs_report.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (costsLoading) {
    return (
      <div className="space-y-6">
        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-20 mb-4" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>

        {/* Table Skeleton */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
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
      {/* Cost Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Monthly Costs</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {formatCurrency(costSummary.totalMonthlyCost)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-calendar-alt text-green-600"></i>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-green-600 text-sm">Recurring monthly</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Yearly Costs</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {formatCurrency(costSummary.totalYearlyCost)}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-calendar text-blue-600"></i>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-blue-600 text-sm">Annual payments</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">One-time Costs</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {formatCurrency(costSummary.totalOneTimeCost)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-shopping-cart text-purple-600"></i>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-purple-600 text-sm">Perpetual licenses</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Active Licenses</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {costSummary.activeLicenses}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-key text-amber-600"></i>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-amber-600 text-sm">Total active</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Export */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cost Breakdown</CardTitle>
            <Button onClick={exportCostReport} variant="outline">
              <i className="fas fa-download mr-2"></i>
              Export Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={timePeriod} onValueChange={setTimePeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Periods</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
                <SelectItem value="one-time">One-time</SelectItem>
              </SelectContent>
            </Select>
            <Select value={costTypeFilter} onValueChange={setCostTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="license">License</SelectItem>
                <SelectItem value="subscription">Subscription</SelectItem>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cost Analysis Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Cost by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(costSummary.costByType).length === 0 ? (
              <div className="text-center py-8">
                <i className="fas fa-chart-pie text-slate-400 text-3xl mb-4"></i>
                <p className="text-slate-600">No cost data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(costSummary.costByType).map(([type, amount]) => {
                  const percentage = ((amount / (costSummary.totalMonthlyCost + costSummary.totalYearlyCost + costSummary.totalOneTimeCost)) * 100).toFixed(1);
                  return (
                    <div key={type} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge className={`text-xs ${getCostTypeColor(type)}`}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Badge>
                        <span className="text-sm font-medium">{percentage}%</span>
                      </div>
                      <span className="text-sm font-semibold">{formatCurrency(amount)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cost by Department */}
        <Card>
          <CardHeader>
            <CardTitle>Cost by Department</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(costSummary.costByDepartment).length === 0 ? (
              <div className="text-center py-8">
                <i className="fas fa-chart-bar text-slate-400 text-3xl mb-4"></i>
                <p className="text-slate-600">No department cost data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(costSummary.costByDepartment).map(([dept, amount]) => {
                  const percentage = ((amount / (costSummary.totalMonthlyCost + costSummary.totalYearlyCost + costSummary.totalOneTimeCost)) * 100).toFixed(1);
                  return (
                    <div key={dept} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium">{dept}</span>
                        <span className="text-xs text-slate-500">{percentage}%</span>
                      </div>
                      <span className="text-sm font-semibold">{formatCurrency(amount)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Cost List */}
      <Card>
        <CardHeader>
          <CardTitle>Software Costs ({filteredCosts.length} items)</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCosts.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-dollar-sign text-slate-400 text-4xl mb-4"></i>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No cost data found</h3>
              <p className="text-slate-500">
                {costs?.length === 0 
                  ? "Add cost information to your software assets to track expenses"
                  : "Try adjusting your filters to see more results"
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-slate-200">
                    <th className="pb-3 text-sm font-medium text-slate-600">Software</th>
                    <th className="pb-3 text-sm font-medium text-slate-600">Department</th>
                    <th className="pb-3 text-sm font-medium text-slate-600">Cost Type</th>
                    <th className="pb-3 text-sm font-medium text-slate-600">Amount</th>
                    <th className="pb-3 text-sm font-medium text-slate-600">Billing Cycle</th>
                    <th className="pb-3 text-sm font-medium text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCosts.map((cost, index) => (
                    <tr key={cost.id} className={`border-b border-slate-100 ${index === filteredCosts.length - 1 ? 'border-0' : ''}`}>
                      <td className="py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <i className="fas fa-cube text-blue-600 text-sm"></i>
                          </div>
                          <span className="font-medium text-slate-900">{cost.software.name}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="text-sm text-slate-600">
                          {cost.software.department?.name || "Unassigned"}
                        </span>
                      </td>
                      <td className="py-4">
                        <Badge className={`text-xs ${getCostTypeColor(cost.costType)}`}>
                          {cost.costType.charAt(0).toUpperCase() + cost.costType.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <span className="text-sm font-semibold">
                          {formatCurrency(Number(cost.amount), cost.currency)}
                        </span>
                      </td>
                      <td className="py-4">
                        <Badge className={`text-xs ${getBillingCycleColor(cost.billingCycle)}`}>
                          {cost.billingCycle.charAt(0).toUpperCase() + cost.billingCycle.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <Badge className={`text-xs ${cost.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {cost.isActive ? 'Active' : 'Inactive'}
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
    </div>
  );
}
