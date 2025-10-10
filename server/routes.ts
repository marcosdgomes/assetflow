import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertTenantSchema,
  insertDepartmentSchema,
  insertEnvironmentSchema,
  insertSoftwareAssetSchema,
  insertSoftwareCostSchema,
  insertSoftwareDependencySchema,
  insertEnvironmentSoftwareSchema,
  insertActivitySchema,
  insertDiscoveryAgentSchema,
  insertDiscoverySessionSchema,
  insertDiscoveredSoftwareSchema,
  insertUserSchema,
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

// Super Admin middleware
const isSuperAdmin = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const user = await storage.getUser(userId);
    if (!user || user.role !== "super-admin") {
      return res.status(403).json({ message: "Super admin access required" });
    }
    
    next();
  } catch (error) {
    console.error("Error checking super admin:", error);
    res.status(500).json({ message: "Failed to verify permissions" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const tenant = await storage.getTenantByUserId(userId);
      
      res.json({ ...user, tenant });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Promote to super admin (only if no super admin exists - self-promotion for first user only)
  app.post("/api/auth/promote-to-super-admin", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if a super admin already exists
      const hasSuperAdmin = await storage.hasSuperAdmin();
      if (hasSuperAdmin) {
        return res.status(403).json({ message: "A super admin already exists. Only existing super admins can promote other users." });
      }
      
      // Promote the current user to super admin
      const user = await storage.updateUserRole(userId, "super-admin");
      
      // Log the promotion
      console.log(`User ${userId} (${user?.email}) promoted to super admin`);
      
      res.json(user);
    } catch (error) {
      console.error("Error promoting to super admin:", error);
      res.status(500).json({ message: "Failed to promote to super admin" });
    }
  });

  // Super Admin - User Management
  app.get("/api/admin/users", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/admin/users/:id/role", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const superAdminId = req.user.claims.sub;
      
      if (!role || !["user", "super-admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be 'user' or 'super-admin'" });
      }
      
      // Prevent users from demoting themselves
      if (id === superAdminId && role !== "super-admin") {
        return res.status(400).json({ message: "Cannot demote yourself from super admin" });
      }
      
      const user = await storage.updateUserRole(id, role);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Log the role change
      console.log(`Super admin ${superAdminId} changed user ${id} role to ${role}`);
      
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Super Admin - Tenant Management
  app.get("/api/admin/tenants", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const tenants = await storage.getAllTenants();
      res.json(tenants);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      res.status(500).json({ message: "Failed to fetch tenants" });
    }
  });

  app.post("/api/admin/tenants", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { tenant, adminUser } = req.body;
      const superAdminId = req.user.claims.sub;
      
      const validatedTenant = insertTenantSchema.parse(tenant);
      const validatedUser = insertUserSchema.parse(adminUser);
      
      // Ensure the user being created has regular user role (not super-admin)
      if (validatedUser.role === "super-admin") {
        return res.status(400).json({ message: "Cannot create super admin through tenant creation" });
      }
      
      // Create user first
      const newUser = await storage.createUser(validatedUser);
      
      // Create tenant with the new user as admin (this also adds them to userTenants)
      const newTenant = await storage.createTenant(validatedTenant, newUser.id);
      
      // Log the creation
      console.log(`Super admin ${superAdminId} created tenant ${newTenant.id} with admin user ${newUser.id}`);
      
      res.json({ tenant: newTenant, user: newUser });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error creating tenant:", error);
      res.status(500).json({ message: "Failed to create tenant" });
    }
  });

  app.get("/api/admin/tenants/:id", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const tenant = await storage.getTenantById(id);
      
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      res.json(tenant);
    } catch (error) {
      console.error("Error fetching tenant:", error);
      res.status(500).json({ message: "Failed to fetch tenant" });
    }
  });

  app.patch("/api/admin/tenants/:id", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = insertTenantSchema.partial().parse(req.body);
      
      const tenant = await storage.updateTenant(id, updates);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      res.json(tenant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error updating tenant:", error);
      res.status(500).json({ message: "Failed to update tenant" });
    }
  });

  app.delete("/api/admin/tenants/:id", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTenant(id);
      res.json({ message: "Tenant deleted successfully" });
    } catch (error) {
      console.error("Error deleting tenant:", error);
      res.status(500).json({ message: "Failed to delete tenant" });
    }
  });

  // Super Admin - Tenant User Management
  app.get("/api/admin/tenants/:id/users", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const users = await storage.getUsersByTenantId(id);
      res.json(users);
    } catch (error) {
      console.error("Error fetching tenant users:", error);
      res.status(500).json({ message: "Failed to fetch tenant users" });
    }
  });

  app.post("/api/admin/tenants/:id/users", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { id: tenantId } = req.params;
      const { userId, role } = req.body;
      
      if (!userId || !role) {
        return res.status(400).json({ message: "userId and role are required" });
      }
      
      const userTenant = await storage.addUserToTenant(userId, tenantId, role);
      res.json(userTenant);
    } catch (error) {
      console.error("Error adding user to tenant:", error);
      res.status(500).json({ message: "Failed to add user to tenant" });
    }
  });

  app.delete("/api/admin/tenants/:tenantId/users/:userId", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { tenantId, userId } = req.params;
      await storage.removeUserFromTenant(userId, tenantId);
      res.json({ message: "User removed from tenant successfully" });
    } catch (error) {
      console.error("Error removing user from tenant:", error);
      res.status(500).json({ message: "Failed to remove user from tenant" });
    }
  });

  app.patch("/api/admin/tenants/:tenantId/users/:userId/role", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { tenantId, userId } = req.params;
      const { role } = req.body;
      
      if (!role || !["admin", "user"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const userTenant = await storage.updateUserTenantRole(userId, tenantId, role);
      if (!userTenant) {
        return res.status(404).json({ message: "User tenant relationship not found" });
      }
      
      res.json(userTenant);
    } catch (error) {
      console.error("Error updating user tenant role:", error);
      res.status(500).json({ message: "Failed to update user tenant role" });
    }
  });

  // Tenant routes
  app.post("/api/tenants", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertTenantSchema.parse(req.body);
      const userId = req.user.claims.sub;
      const tenant = await storage.createTenant(validatedData, userId);
      
      await storage.createActivity({
        tenantId: tenant.id,
        userId,
        action: "created",
        entityType: "tenant",
        entityId: tenant.id,
        description: `Created tenant: ${tenant.name}`,
      });
      
      res.json(tenant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error creating tenant:", error);
      res.status(500).json({ message: "Failed to create tenant" });
    }
  });

  // Get current tenant
  app.get("/api/tenant", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tenant = await storage.getTenantByUserId(userId);
      
      if (!tenant) {
        return res.status(404).json({ message: "No tenant found" });
      }
      
      res.json(tenant);
    } catch (error) {
      console.error("Error fetching tenant:", error);
      res.status(500).json({ message: "Failed to fetch tenant" });
    }
  });

  // Department routes
  app.get("/api/departments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tenant = await storage.getTenantByUserId(userId);
      
      if (!tenant) {
        return res.status(404).json({ message: "No tenant found" });
      }
      
      const departments = await storage.getDepartmentsByTenantId(tenant.id);
      res.json(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  app.post("/api/departments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tenant = await storage.getTenantByUserId(userId);
      
      if (!tenant) {
        return res.status(404).json({ message: "No tenant found" });
      }
      
      const validatedData = insertDepartmentSchema.parse({
        ...req.body,
        tenantId: tenant.id,
      });
      
      const department = await storage.createDepartment(validatedData);
      
      await storage.createActivity({
        tenantId: tenant.id,
        userId,
        action: "created",
        entityType: "department",
        entityId: department.id,
        description: `Created department: ${department.name}`,
      });
      
      res.json(department);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error creating department:", error);
      res.status(500).json({ message: "Failed to create department" });
    }
  });

  // Update department
  app.put("/api/departments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tenant = await storage.getTenantByUserId(userId);
      const departmentId = req.params.id;
      
      if (!tenant) {
        return res.status(404).json({ message: "No tenant found" });
      }
      
      // Check if department exists and belongs to tenant
      const existingDepartment = await storage.getDepartmentById(departmentId);
      if (!existingDepartment || existingDepartment.tenantId !== tenant.id) {
        return res.status(404).json({ message: "Department not found" });
      }
      
      const validatedData = insertDepartmentSchema.partial().parse(req.body);
      const updatedDepartment = await storage.updateDepartment(departmentId, validatedData);
      
      await storage.createActivity({
        tenantId: tenant.id,
        userId,
        action: "updated",
        entityType: "department",
        entityId: departmentId,
        description: `Updated department: ${updatedDepartment.name}`,
      });
      
      res.json(updatedDepartment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error updating department:", error);
      res.status(500).json({ message: "Failed to update department" });
    }
  });

  // Delete department
  app.delete("/api/departments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tenant = await storage.getTenantByUserId(userId);
      const departmentId = req.params.id;
      
      if (!tenant) {
        return res.status(404).json({ message: "No tenant found" });
      }
      
      // Check if department exists and belongs to tenant
      const existingDepartment = await storage.getDepartmentById(departmentId);
      if (!existingDepartment || existingDepartment.tenantId !== tenant.id) {
        return res.status(404).json({ message: "Department not found" });
      }
      
      await storage.deleteDepartment(departmentId);
      
      await storage.createActivity({
        tenantId: tenant.id,
        userId,
        action: "deleted",
        entityType: "department",
        entityId: departmentId,
        description: `Deleted department: ${existingDepartment.name}`,
      });
      
      res.json({ message: "Department deleted successfully" });
    } catch (error) {
      console.error("Error deleting department:", error);
      res.status(500).json({ message: "Failed to delete department" });
    }
  });

  // Environment routes
  app.get("/api/environments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tenant = await storage.getTenantByUserId(userId);
      
      if (!tenant) {
        return res.status(404).json({ message: "No tenant found" });
      }
      
      const environments = await storage.getEnvironmentsByTenantId(tenant.id);
      res.json(environments);
    } catch (error) {
      console.error("Error fetching environments:", error);
      res.status(500).json({ message: "Failed to fetch environments" });
    }
  });

  app.post("/api/environments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tenant = await storage.getTenantByUserId(userId);
      
      if (!tenant) {
        return res.status(404).json({ message: "No tenant found" });
      }
      
      const validatedData = insertEnvironmentSchema.parse({
        ...req.body,
        tenantId: tenant.id,
      });
      
      const environment = await storage.createEnvironment(validatedData);
      
      await storage.createActivity({
        tenantId: tenant.id,
        userId,
        action: "created",
        entityType: "environment",
        entityId: environment.id,
        description: `Created environment: ${environment.name}`,
      });
      
      res.json(environment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error creating environment:", error);
      res.status(500).json({ message: "Failed to create environment" });
    }
  });

  app.put("/api/environments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const tenant = await storage.getTenantByUserId(userId);
      
      if (!tenant) {
        return res.status(404).json({ message: "No tenant found" });
      }
      
      const updates = insertEnvironmentSchema.partial().parse(req.body);
      const environment = await storage.updateEnvironment(id, updates);
      
      if (!environment) {
        return res.status(404).json({ message: "Environment not found" });
      }
      
      await storage.createActivity({
        tenantId: tenant.id,
        userId,
        action: "updated",
        entityType: "environment",
        entityId: environment.id,
        description: `Updated environment: ${environment.name}`,
      });
      
      res.json(environment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error updating environment:", error);
      res.status(500).json({ message: "Failed to update environment" });
    }
  });

  // Software Asset routes
  app.get("/api/software", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tenant = await storage.getTenantByUserId(userId);
      
      if (!tenant) {
        return res.status(404).json({ message: "No tenant found" });
      }
      
      const software = await storage.getSoftwareAssetsByTenantId(tenant.id);
      res.json(software);
    } catch (error) {
      console.error("Error fetching software assets:", error);
      res.status(500).json({ message: "Failed to fetch software assets" });
    }
  });

  app.post("/api/software", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tenant = await storage.getTenantByUserId(userId);
      
      if (!tenant) {
        return res.status(404).json({ message: "No tenant found" });
      }
      
      const { environments: selectedEnvironments, cost, ...softwareData } = req.body;
      
      const validatedData = insertSoftwareAssetSchema.parse({
        ...softwareData,
        tenantId: tenant.id,
      });
      
      const software = await storage.createSoftwareAsset(validatedData);
      
      // Create cost if provided
      if (cost && cost.amount > 0) {
        await storage.createSoftwareCost({
          ...cost,
          softwareAssetId: software.id,
        });
      }
      
      // Link to environments if provided
      if (selectedEnvironments && selectedEnvironments.length > 0) {
        for (const envId of selectedEnvironments) {
          await storage.createEnvironmentSoftware({
            environmentId: envId,
            softwareAssetId: software.id,
          });
        }
      }
      
      await storage.createActivity({
        tenantId: tenant.id,
        userId,
        action: "created",
        entityType: "software",
        entityId: software.id,
        description: `Created software asset: ${software.name}`,
      });
      
      res.json(software);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error creating software asset:", error);
      res.status(500).json({ message: "Failed to create software asset" });
    }
  });

  app.put("/api/software/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const tenant = await storage.getTenantByUserId(userId);
      
      if (!tenant) {
        return res.status(404).json({ message: "No tenant found" });
      }
      
      const updates = insertSoftwareAssetSchema.partial().parse(req.body);
      const software = await storage.updateSoftwareAsset(id, updates);
      
      if (!software) {
        return res.status(404).json({ message: "Software asset not found" });
      }
      
      await storage.createActivity({
        tenantId: tenant.id,
        userId,
        action: "updated",
        entityType: "software",
        entityId: software.id,
        description: `Updated software asset: ${software.name}`,
      });
      
      res.json(software);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error updating software asset:", error);
      res.status(500).json({ message: "Failed to update software asset" });
    }
  });

  // Cost tracking routes
  app.get("/api/costs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tenant = await storage.getTenantByUserId(userId);
      
      if (!tenant) {
        return res.status(404).json({ message: "No tenant found" });
      }
      
      const costs = await storage.getSoftwareCostsByTenantId(tenant.id);
      res.json(costs);
    } catch (error) {
      console.error("Error fetching costs:", error);
      res.status(500).json({ message: "Failed to fetch costs" });
    }
  });

  // Dependency routes
  app.get("/api/dependencies", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tenant = await storage.getTenantByUserId(userId);
      
      if (!tenant) {
        return res.status(404).json({ message: "No tenant found" });
      }
      
      const dependencies = await storage.getDependenciesByTenantId(tenant.id);
      res.json(dependencies);
    } catch (error) {
      console.error("Error fetching dependencies:", error);
      res.status(500).json({ message: "Failed to fetch dependencies" });
    }
  });

  app.post("/api/dependencies", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tenant = await storage.getTenantByUserId(userId);
      
      if (!tenant) {
        return res.status(404).json({ message: "No tenant found" });
      }
      
      const validatedData = insertSoftwareDependencySchema.parse(req.body);
      const dependency = await storage.createSoftwareDependency(validatedData);
      
      await storage.createActivity({
        tenantId: tenant.id,
        userId,
        action: "created",
        entityType: "dependency",
        entityId: dependency.id,
        description: `Created dependency between software assets`,
      });
      
      res.json(dependency);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error creating dependency:", error);
      res.status(500).json({ message: "Failed to create dependency" });
    }
  });

  // Environment-Software relationships
  app.get("/api/environment-software", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tenant = await storage.getTenantByUserId(userId);
      
      if (!tenant) {
        return res.status(404).json({ message: "No tenant found" });
      }
      
      const relations = await storage.getEnvironmentSoftwareByTenantId(tenant.id);
      res.json(relations);
    } catch (error) {
      console.error("Error fetching environment-software relations:", error);
      res.status(500).json({ message: "Failed to fetch environment-software relations" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tenant = await storage.getTenantByUserId(userId);
      
      if (!tenant) {
        return res.status(404).json({ message: "No tenant found" });
      }
      
      const stats = await storage.getDashboardStats(tenant.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Activity feed
  app.get("/api/activities", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tenant = await storage.getTenantByUserId(userId);
      
      if (!tenant) {
        return res.status(404).json({ message: "No tenant found" });
      }
      
      const limit = parseInt(req.query.limit as string) || 10;
      const activities = await storage.getActivitiesByTenantId(tenant.id, limit);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // Discovery Agent Routes
  app.get("/api/discovery/agents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tenant = await storage.getTenantByUserId(userId);
      
      if (!tenant) {
        return res.status(404).json({ message: "No tenant found" });
      }

      const agents = await storage.getDiscoveryAgents(tenant.id);
      res.json(agents);
    } catch (error) {
      console.error("Error fetching discovery agents:", error);
      res.status(500).json({ message: "Failed to fetch discovery agents" });
    }
  });

  app.post("/api/discovery/agents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tenant = await storage.getTenantByUserId(userId);
      
      if (!tenant) {
        return res.status(404).json({ message: "No tenant found" });
      }

      const agentData = insertDiscoveryAgentSchema.parse({
        ...req.body,
        tenantId: tenant.id,
      });

      const agent = await storage.createDiscoveryAgent(agentData);
      
      await storage.createActivity({
        tenantId: tenant.id,
        userId,
        action: "created",
        entityType: "discovery_agent",
        entityId: agent.id,
        description: `Created discovery agent "${agent.name}"`,
      });

      res.json(agent);
    } catch (error) {
      console.error("Error creating discovery agent:", error);
      res.status(500).json({ message: "Failed to create discovery agent" });
    }
  });

  app.post("/api/discovery/agents/:id/run", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tenant = await storage.getTenantByUserId(userId);
      const agentId = req.params.id;
      
      if (!tenant) {
        return res.status(404).json({ message: "No tenant found" });
      }

      const session = await storage.runDiscoveryAgent(tenant.id, agentId);
      res.json(session);
    } catch (error) {
      console.error("Error running discovery agent:", error);
      res.status(500).json({ message: "Failed to run discovery agent" });
    }
  });

  // Discovery Sessions Routes
  app.get("/api/discovery/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tenant = await storage.getTenantByUserId(userId);
      
      if (!tenant) {
        return res.status(404).json({ message: "No tenant found" });
      }

      const sessions = await storage.getDiscoverySessions(tenant.id);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching discovery sessions:", error);
      res.status(500).json({ message: "Failed to fetch discovery sessions" });
    }
  });

  // Discovered Software Routes
  app.get("/api/discovery/discovered", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tenant = await storage.getTenantByUserId(userId);
      
      if (!tenant) {
        return res.status(404).json({ message: "No tenant found" });
      }

      const status = req.query.status as string || 'discovered';
      const discoveries = await storage.getDiscoveredSoftware(tenant.id, status);
      res.json(discoveries);
    } catch (error) {
      console.error("Error fetching discovered software:", error);
      res.status(500).json({ message: "Failed to fetch discovered software" });
    }
  });

  app.post("/api/discovery/discovered/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tenant = await storage.getTenantByUserId(userId);
      const discoveredId = req.params.id;
      
      if (!tenant) {
        return res.status(404).json({ message: "No tenant found" });
      }

      const result = await storage.approveDiscoveredSoftware(tenant.id, discoveredId, userId);
      res.json(result);
    } catch (error) {
      console.error("Error approving discovered software:", error);
      res.status(500).json({ message: "Failed to approve discovered software" });
    }
  });

  app.post("/api/discovery/discovered/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tenant = await storage.getTenantByUserId(userId);
      const discoveredId = req.params.id;
      
      if (!tenant) {
        return res.status(404).json({ message: "No tenant found" });
      }

      await storage.rejectDiscoveredSoftware(tenant.id, discoveredId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error rejecting discovered software:", error);
      res.status(500).json({ message: "Failed to reject discovered software" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
