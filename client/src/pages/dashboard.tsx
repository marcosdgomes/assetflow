import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import KPICards from "@/components/dashboard/kpi-cards";
import SoftwareTable from "@/components/dashboard/software-table";
import EnvironmentStatus from "@/components/dashboard/environment-status";
import DependencyPreview from "@/components/dashboard/dependency-preview";
import ActivityFeed from "@/components/dashboard/activity-feed";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

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
          title="Dashboard"
          description="Overview of your software assets and environments"
        />
        
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <KPICards />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            <div className="lg:col-span-2">
              <SoftwareTable />
            </div>
            <div>
              <EnvironmentStatus />
            </div>
          </div>
          
          <div className="mt-8">
            <DependencyPreview />
          </div>
          
          <div className="mt-8">
            <ActivityFeed />
          </div>
        </div>
      </main>
    </div>
  );
}
