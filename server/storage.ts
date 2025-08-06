import {
  users,
  tenants,
  userTenants,
  departments,
  environments,
  softwareAssets,
  softwareVersions,
  softwareCosts,
  softwareDependencies,
  environmentSoftware,
  activities,
  type User,
  type UpsertUser,
  type Tenant,
  type InsertTenant,
  type Department,
  type InsertDepartment,
  type Environment,
  type InsertEnvironment,
  type SoftwareAsset,
  type InsertSoftwareAsset,
  type SoftwareCost,
  type InsertSoftwareCost,
  type SoftwareDependency,
  type InsertSoftwareDependency,
  type EnvironmentSoftware,
  type InsertEnvironmentSoftware,
  type Activity,
  type InsertActivity,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Tenant operations
  getTenantByUserId(userId: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant, userId: string): Promise<Tenant>;
  
  // Department operations
  getDepartmentsByTenantId(tenantId: string): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  
  // Environment operations
  getEnvironmentsByTenantId(tenantId: string): Promise<Environment[]>;
  createEnvironment(environment: InsertEnvironment): Promise<Environment>;
  updateEnvironment(id: string, updates: Partial<InsertEnvironment>): Promise<Environment | undefined>;
  deleteEnvironment(id: string): Promise<boolean>;
  
  // Software Asset operations
  getSoftwareAssetsByTenantId(tenantId: string): Promise<(SoftwareAsset & { department?: Department })[]>;
  getSoftwareAssetById(id: string): Promise<SoftwareAsset | undefined>;
  createSoftwareAsset(asset: InsertSoftwareAsset): Promise<SoftwareAsset>;
  updateSoftwareAsset(id: string, updates: Partial<InsertSoftwareAsset>): Promise<SoftwareAsset | undefined>;
  deleteSoftwareAsset(id: string): Promise<boolean>;
  
  // Software Cost operations
  getSoftwareCostsByTenantId(tenantId: string): Promise<(SoftwareCost & { software: SoftwareAsset })[]>;
  createSoftwareCost(cost: InsertSoftwareCost): Promise<SoftwareCost>;
  
  // Dependency operations
  getDependenciesByTenantId(tenantId: string): Promise<(SoftwareDependency & { 
    parentSoftware: SoftwareAsset; 
    dependentSoftware: SoftwareAsset; 
  })[]>;
  createSoftwareDependency(dependency: InsertSoftwareDependency): Promise<SoftwareDependency>;
  deleteSoftwareDependency(id: string): Promise<boolean>;
  
  // Environment-Software relationships
  getEnvironmentSoftwareByTenantId(tenantId: string): Promise<(EnvironmentSoftware & {
    environment: Environment;
    software: SoftwareAsset;
  })[]>;
  createEnvironmentSoftware(relation: InsertEnvironmentSoftware): Promise<EnvironmentSoftware>;
  
  // Activity operations
  getActivitiesByTenantId(tenantId: string, limit?: number): Promise<(Activity & { user?: User })[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  // Dashboard stats
  getDashboardStats(tenantId: string): Promise<{
    totalSoftware: number;
    activeEnvironments: number;
    monthlyCost: number;
    criticalDependencies: number;
    totalConnections: number;
    criticalPaths: number;
    isolatedAssets: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Tenant operations
  async getTenantByUserId(userId: string): Promise<Tenant | undefined> {
    const [userTenant] = await db
      .select({ tenant: tenants })
      .from(userTenants)
      .innerJoin(tenants, eq(tenants.id, userTenants.tenantId))
      .where(eq(userTenants.userId, userId))
      .limit(1);
    
    return userTenant?.tenant;
  }

  async createTenant(tenant: InsertTenant, userId: string): Promise<Tenant> {
    const [newTenant] = await db.insert(tenants).values(tenant).returning();
    
    // Add user as admin of the new tenant
    await db.insert(userTenants).values({
      userId,
      tenantId: newTenant.id,
      role: "admin",
    });
    
    return newTenant;
  }

  // Department operations
  async getDepartmentsByTenantId(tenantId: string): Promise<Department[]> {
    return db.select().from(departments).where(eq(departments.tenantId, tenantId));
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    const [newDepartment] = await db.insert(departments).values(department).returning();
    return newDepartment;
  }

  // Environment operations
  async getEnvironmentsByTenantId(tenantId: string): Promise<Environment[]> {
    return db.select().from(environments).where(eq(environments.tenantId, tenantId));
  }

  async createEnvironment(environment: InsertEnvironment): Promise<Environment> {
    const [newEnvironment] = await db.insert(environments).values(environment).returning();
    return newEnvironment;
  }

  async updateEnvironment(id: string, updates: Partial<InsertEnvironment>): Promise<Environment | undefined> {
    const [updated] = await db
      .update(environments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(environments.id, id))
      .returning();
    return updated;
  }

  async deleteEnvironment(id: string): Promise<boolean> {
    const result = await db.delete(environments).where(eq(environments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Software Asset operations
  async getSoftwareAssetsByTenantId(tenantId: string): Promise<(SoftwareAsset & { department?: Department })[]> {
    const results = await db
      .select({
        software: softwareAssets,
        department: departments,
      })
      .from(softwareAssets)
      .leftJoin(departments, eq(departments.id, softwareAssets.departmentId))
      .where(eq(softwareAssets.tenantId, tenantId))
      .orderBy(desc(softwareAssets.updatedAt));

    return results.map(result => ({
      ...result.software,
      department: result.department || undefined,
    }));
  }

  async getSoftwareAssetById(id: string): Promise<SoftwareAsset | undefined> {
    const [asset] = await db.select().from(softwareAssets).where(eq(softwareAssets.id, id));
    return asset;
  }

  async createSoftwareAsset(asset: InsertSoftwareAsset): Promise<SoftwareAsset> {
    const [newAsset] = await db.insert(softwareAssets).values(asset).returning();
    return newAsset;
  }

  async updateSoftwareAsset(id: string, updates: Partial<InsertSoftwareAsset>): Promise<SoftwareAsset | undefined> {
    const [updated] = await db
      .update(softwareAssets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(softwareAssets.id, id))
      .returning();
    return updated;
  }

  async deleteSoftwareAsset(id: string): Promise<boolean> {
    const result = await db.delete(softwareAssets).where(eq(softwareAssets.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Software Cost operations
  async getSoftwareCostsByTenantId(tenantId: string): Promise<(SoftwareCost & { software: SoftwareAsset })[]> {
    const results = await db
      .select({
        cost: softwareCosts,
        software: softwareAssets,
      })
      .from(softwareCosts)
      .innerJoin(softwareAssets, eq(softwareAssets.id, softwareCosts.softwareAssetId))
      .where(eq(softwareAssets.tenantId, tenantId));

    return results.map(result => ({
      ...result.cost,
      software: result.software,
    }));
  }

  async createSoftwareCost(cost: InsertSoftwareCost): Promise<SoftwareCost> {
    const [newCost] = await db.insert(softwareCosts).values(cost).returning();
    return newCost;
  }

  // Dependency operations
  async getDependenciesByTenantId(tenantId: string): Promise<(SoftwareDependency & { 
    parentSoftware: SoftwareAsset; 
    dependentSoftware: SoftwareAsset; 
  })[]> {
    // First get all dependencies and then fetch related software separately
    const allDependencies = await db.select().from(softwareDependencies);
    const allSoftware = await db.select().from(softwareAssets).where(eq(softwareAssets.tenantId, tenantId));
    
    const softwareMap = new Map(allSoftware.map(s => [s.id, s]));
    
    const results = allDependencies
      .filter(dep => {
        const parent = softwareMap.get(dep.parentSoftwareId);
        const dependent = softwareMap.get(dep.dependentSoftwareId);
        return parent && dependent;
      })
      .map(dep => ({
        ...dep,
        parentSoftware: softwareMap.get(dep.parentSoftwareId)!,
        dependentSoftware: softwareMap.get(dep.dependentSoftwareId)!,
      }));

    return results;
  }

  async createSoftwareDependency(dependency: InsertSoftwareDependency): Promise<SoftwareDependency> {
    const [newDependency] = await db.insert(softwareDependencies).values(dependency).returning();
    return newDependency;
  }

  async deleteSoftwareDependency(id: string): Promise<boolean> {
    const result = await db.delete(softwareDependencies).where(eq(softwareDependencies.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Environment-Software relationships
  async getEnvironmentSoftwareByTenantId(tenantId: string): Promise<(EnvironmentSoftware & {
    environment: Environment;
    software: SoftwareAsset;
  })[]> {
    const results = await db
      .select({
        relation: environmentSoftware,
        environment: environments,
        software: softwareAssets,
      })
      .from(environmentSoftware)
      .innerJoin(environments, eq(environments.id, environmentSoftware.environmentId))
      .innerJoin(softwareAssets, eq(softwareAssets.id, environmentSoftware.softwareAssetId))
      .where(eq(environments.tenantId, tenantId));

    return results.map(result => ({
      ...result.relation,
      environment: result.environment,
      software: result.software,
    }));
  }

  async createEnvironmentSoftware(relation: InsertEnvironmentSoftware): Promise<EnvironmentSoftware> {
    const [newRelation] = await db.insert(environmentSoftware).values(relation).returning();
    return newRelation;
  }

  // Activity operations
  async getActivitiesByTenantId(tenantId: string, limit: number = 10): Promise<(Activity & { user?: User })[]> {
    const results = await db
      .select({
        activity: activities,
        user: users,
      })
      .from(activities)
      .leftJoin(users, eq(users.id, activities.userId))
      .where(eq(activities.tenantId, tenantId))
      .orderBy(desc(activities.createdAt))
      .limit(limit);

    return results.map(result => ({
      ...result.activity,
      user: result.user || undefined,
    }));
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db.insert(activities).values(activity).returning();
    return newActivity;
  }

  // Dashboard stats
  async getDashboardStats(tenantId: string): Promise<{
    totalSoftware: number;
    activeEnvironments: number;
    monthlyCost: number;
    criticalDependencies: number;
    totalConnections: number;
    criticalPaths: number;
    isolatedAssets: number;
  }> {
    // Get counts in parallel
    const [softwareAssets, envs, costs, deps] = await Promise.all([
      db.select().from(softwareAssets).where(eq(softwareAssets.tenantId, tenantId)),
      db.select().from(environments).where(eq(environments.tenantId, tenantId)),
      this.getSoftwareCostsByTenantId(tenantId),
      this.getDependenciesByTenantId(tenantId),
    ]);

    const activeEnvironments = envs.filter(env => env.status === 'active').length;
    
    // Calculate monthly costs
    const monthlyCost = costs
      .filter(cost => cost.isActive && cost.billingCycle === 'monthly')
      .reduce((sum, cost) => sum + parseFloat(cost.amount), 0);

    // Calculate critical dependencies (dependencies marked as "required")
    const criticalDependencies = deps.filter(dep => dep.dependencyType === 'required').length;

    return {
      totalSoftware: softwareAssets.length,
      activeEnvironments,
      monthlyCost,
      criticalDependencies,
      totalConnections: deps.length,
      criticalPaths: criticalDependencies,
      isolatedAssets: softwareAssets.filter(asset => 
        !deps.some(dep => 
          dep.parentSoftwareId === asset.id || dep.dependentSoftwareId === asset.id
        )
      ).length,
    };
  }
}

export const storage = new DatabaseStorage();