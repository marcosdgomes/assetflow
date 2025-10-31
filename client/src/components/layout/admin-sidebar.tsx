import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Shield } from "lucide-react";
import { getConfig, keycloakLogout } from "@/lib/keycloak";

const navigationItems = [
  {
    name: "Dashboard",
    path: "/admin",
    icon: "fas fa-chart-pie",
  },
  {
    name: "Tenants",
    path: "/admin/tenants",
    icon: "fas fa-building",
  },
  {
    name: "Users",
    path: "/admin/users",
    icon: "fas fa-users",
  },
];

export default function AdminSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const handleLogout = async () => {
    const config = getConfig();
    
    if (config?.auth.provider === "keycloak") {
      await keycloakLogout();
    } else {
      window.location.href = "/api/logout";
    }
  };

  return (
    <nav className="w-64 bg-white border-r border-slate-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <img src="/icon-mon-black.png" alt="RNC Atlas" className="w-8 h-8" />
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              RNC Atlas
            </h1>
            <p className="text-xs text-slate-500">
              Super Admin
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 px-4 py-6 space-y-2">
        {navigationItems.map((item) => {
          const isActive = item.path === "/admin"
            ? location === "/admin"
            : location === item.path || location.startsWith(`${item.path}/`);
          return (
            <Link
              key={`${item.path}-${item.name}`}
              href={item.path}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                isActive ? "bg-primary-50 text-primary-700" : "text-slate-600 hover:bg-slate-100",
              )}
            >
              <i className={`${item.icon} w-5`}></i>
              <span className={isActive ? "font-medium" : ""}>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* User Menu */}
      <div className="p-4 border-t border-slate-200 sticky bottom-0 bg-white z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {(user as any)?.firstName && (user as any)?.lastName
                ? `${(user as any).firstName} ${(user as any).lastName}`
                : (user as any)?.email || "Super Admin"}
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Super Admin
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

