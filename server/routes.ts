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
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

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

  const httpServer = createServer(app);
  return httpServer;
}
