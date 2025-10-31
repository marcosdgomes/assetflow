import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { getConfig, keycloakLogout } from "@/lib/keycloak";

const navigationItems = [
  {
    name: "Dashboard",
    path: "/",
    icon: "fas fa-chart-pie",
  },
  {
    name: "Departments",
    path: "/departments",
    icon: "fas fa-building",
  },
  {
    name: "Software Assets",
    path: "/software",
    icon: "fas fa-desktop",
  },
  {
    name: "Automated Discovery",
    path: "/discovery",
    icon: "fas fa-search",
  },
  {
    name: "Environments",
    path: "/environments",
    icon: "fas fa-server",
  },
  {
    name: "Dependency Map",
    path: "/dependencies",
    icon: "fas fa-project-diagram",
  },
  {
    name: "Cost Management",
    path: "/costs",
    icon: "fas fa-dollar-sign",
  },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const { data: tenant } = useQuery({
    queryKey: ["/api/tenant"],
    enabled: !!user,
  });

  const handleLogout = async () => {
    const config = getConfig();
    
    if (config?.auth.provider === "keycloak") {
      await keycloakLogout();
    } else {
      window.location.href = "/api/logout";
    }
  };

  return (
    <nav className="w-64 bg-white border-r border-slate-200 flex flex-col sticky top-0 h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <img src="/icon-mon-black.png" alt="RNC Atlas" className="w-8 h-8" />
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              RNC Atlas
            </h1>
            <p className="text-xs text-slate-500">
              {(tenant as any)?.name || "Loading..."}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navigationItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={cn(
              "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
              location === item.path
                ? "bg-primary-50 text-primary-700"
                : "text-slate-600 hover:bg-slate-100",
            )}
          >
            <i className={`${item.icon} w-5`}></i>
            <span className={location === item.path ? "font-medium" : ""}>
              {item.name}
            </span>
          </Link>
        ))}
      </div>

      {/* User Menu */}
      <div className="p-4 border-t border-slate-200 sticky bottom-0 bg-white z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <i className="fas fa-user text-primary-600"></i>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {(user as any)?.firstName && (user as any)?.lastName
                ? `${(user as any).firstName} ${(user as any).lastName}`
                : (user as any)?.email || "User"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
            title="Logout"
          >
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>
    </nav>
  );
}
