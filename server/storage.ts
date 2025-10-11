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
  discoveryAgents,
  discoverySessions,
  discoveredSoftware,
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
  type DiscoveryAgent,
  type InsertDiscoveryAgent,
  type DiscoverySession,
  type InsertDiscoverySession,
  type DiscoveredSoftware,
  type InsertDiscoveredSoftware,
  type InsertUser,
  type UserTenant,
  type InsertUserTenant,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Super Admin - User operations
  getAllUsers(): Promise<(User & { tenants?: (UserTenant & { tenant: Tenant })[] })[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUserRole(userId: string, role: string): Promise<User | undefined>;
  hasSuperAdmin(): Promise<boolean>;
  
  // Tenant operations
  getTenantByUserId(userId: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant, userId: string): Promise<Tenant>;
  
  // Super Admin - Tenant operations
  getAllTenants(): Promise<(Tenant & { userCount?: number })[]>;
  getTenantById(tenantId: string): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  updateTenant(tenantId: string, updates: Partial<InsertTenant>): Promise<Tenant | undefined>;
  deleteTenant(tenantId: string): Promise<boolean>;
  
  // Super Admin - User-Tenant operations
  getUsersByTenantId(tenantId: string): Promise<(UserTenant & { user: User })[]>;
  addUserToTenant(userId: string, tenantId: string, role: string): Promise<UserTenant>;
  removeUserFromTenant(userId: string, tenantId: string): Promise<boolean>;
  updateUserTenantRole(userId: string, tenantId: string, role: string): Promise<UserTenant | undefined>;
  
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
  
  // Discovery operations
  getDiscoveryAgents(tenantId: string): Promise<(DiscoveryAgent & { environment?: Environment })[]>;
  createDiscoveryAgent(agent: InsertDiscoveryAgent): Promise<DiscoveryAgent>;
  runDiscoveryAgent(tenantId: string, agentId: string): Promise<DiscoverySession>;
  getDiscoverySessions(tenantId: string): Promise<(DiscoverySession & { agent: DiscoveryAgent })[]>;
  getDiscoveredSoftware(tenantId: string, status?: string): Promise<(DiscoveredSoftware & { 
    agent: DiscoveryAgent; 
    session: DiscoverySession;
    environment?: Environment;
    department?: Department;
  })[]>;
  approveDiscoveredSoftware(tenantId: string, discoveredId: string, userId: string): Promise<SoftwareAsset>;
  rejectDiscoveredSoftware(tenantId: string, discoveredId: string, userId: string): Promise<void>;
  
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

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First try to find existing user by ID or email
    const existing = await db
      .select()
      .from(users)
      .where(userData.email ? eq(users.email, userData.email) : eq(users.id, userData.id!))
      .limit(1);

    if (existing.length > 0) {
      // Update existing user
      const [user] = await db
        .update(users)
        .set({
          ...userData,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing[0].id))
        .returning();
      return user;
    }

    // Insert new user
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  // Super Admin - User operations
  async getAllUsers(): Promise<(User & { tenants?: (UserTenant & { tenant: Tenant })[] })[]> {
    const allUsers = await db.select().from(users);
    
    const usersWithTenants = await Promise.all(
      allUsers.map(async (user) => {
        const userTenantData = await db
          .select({
            userTenant: userTenants,
            tenant: tenants,
          })
          .from(userTenants)
          .innerJoin(tenants, eq(tenants.id, userTenants.tenantId))
          .where(eq(userTenants.userId, user.id));
        
        return {
          ...user,
          tenants: userTenantData.map(({ userTenant, tenant }) => ({
            ...userTenant,
            tenant,
          })),
        };
      })
    );
    
    return usersWithTenants;
  }

  async createUser(userData: InsertUser): Promise<User> {
    // Hash password if provided
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUserRole(userId: string, role: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async hasSuperAdmin(): Promise<boolean> {
    const [superAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.role, "super-admin"))
      .limit(1);
    return !!superAdmin;
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

  // Super Admin - Tenant operations
  async getAllTenants(): Promise<(Tenant & { userCount?: number })[]> {
    const allTenants = await db.select().from(tenants);
    
    const tenantsWithCounts = await Promise.all(
      allTenants.map(async (tenant) => {
        const [result] = await db
          .select({ count: count() })
          .from(userTenants)
          .where(eq(userTenants.tenantId, tenant.id));
        
        return {
          ...tenant,
          userCount: Number(result?.count || 0),
        };
      })
    );
    
    return tenantsWithCounts;
  }

  async getTenantById(tenantId: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    return tenant;
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
    return tenant;
  }

  async updateTenant(tenantId: string, updates: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const [tenant] = await db
      .update(tenants)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId))
      .returning();
    return tenant;
  }

  async deleteTenant(tenantId: string): Promise<boolean> {
    await db.delete(tenants).where(eq(tenants.id, tenantId));
    return true;
  }

  // Super Admin - User-Tenant operations
  async getUsersByTenantId(tenantId: string): Promise<(UserTenant & { user: User })[]> {
    const results = await db
      .select({
        userTenant: userTenants,
        user: users,
      })
      .from(userTenants)
      .innerJoin(users, eq(users.id, userTenants.userId))
      .where(eq(userTenants.tenantId, tenantId));
    
    return results.map(({ userTenant, user }) => ({
      ...userTenant,
      user,
    }));
  }

  async addUserToTenant(userId: string, tenantId: string, role: string): Promise<UserTenant> {
    const [userTenant] = await db
      .insert(userTenants)
      .values({ userId, tenantId, role })
      .returning();
    return userTenant;
  }

  async removeUserFromTenant(userId: string, tenantId: string): Promise<boolean> {
    await db
      .delete(userTenants)
      .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)));
    return true;
  }

  async updateUserTenantRole(userId: string, tenantId: string, role: string): Promise<UserTenant | undefined> {
    const [userTenant] = await db
      .update(userTenants)
      .set({ role })
      .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)))
      .returning();
    return userTenant;
  }

  // Department operations
  async getDepartmentsByTenantId(tenantId: string): Promise<Department[]> {
    return db.select().from(departments).where(eq(departments.tenantId, tenantId));
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    const [newDepartment] = await db.insert(departments).values(department).returning();
    return newDepartment;
  }

  async getDepartmentById(id: string): Promise<Department | undefined> {
    const [department] = await db.select().from(departments).where(eq(departments.id, id));
    return department;
  }

  async updateDepartment(id: string, updates: Partial<InsertDepartment>): Promise<Department> {
    const [updatedDepartment] = await db
      .update(departments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(departments.id, id))
      .returning();
    return updatedDepartment;
  }

  async deleteDepartment(id: string): Promise<void> {
    await db.delete(departments).where(eq(departments.id, id));
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
    const [softwareAssetsResult, envs, costs, deps] = await Promise.all([
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
      totalSoftware: softwareAssetsResult.length,
      activeEnvironments,
      monthlyCost,
      criticalDependencies,
      totalConnections: deps.length,
      criticalPaths: criticalDependencies,
      isolatedAssets: softwareAssetsResult.filter(asset => 
        !deps.some(dep => 
          dep.parentSoftwareId === asset.id || dep.dependentSoftwareId === asset.id
        )
      ).length,
    };
  }

  // Discovery operations
  async getDiscoveryAgents(tenantId: string): Promise<(DiscoveryAgent & { environment?: Environment })[]> {
    const result = await db
      .select({
        agent: discoveryAgents,
        environment: environments
      })
      .from(discoveryAgents)
      .leftJoin(environments, eq(discoveryAgents.environmentId, environments.id))
      .where(eq(discoveryAgents.tenantId, tenantId))
      .orderBy(desc(discoveryAgents.createdAt));

    return result.map(row => ({
      ...row.agent,
      environment: row.environment || undefined
    }));
  }

  async createDiscoveryAgent(agent: InsertDiscoveryAgent): Promise<DiscoveryAgent> {
    const [newAgent] = await db.insert(discoveryAgents).values(agent).returning();
    return newAgent;
  }

  async runDiscoveryAgent(tenantId: string, agentId: string): Promise<DiscoverySession> {
    // Create a discovery session
    const [session] = await db.insert(discoverySessions).values({
      tenantId,
      agentId,
      status: 'running'
    }).returning();

    // Update agent's last run time
    await db
      .update(discoveryAgents)
      .set({ lastRun: new Date() })
      .where(eq(discoveryAgents.id, agentId));

    // Simulate discovery process - in real implementation this would run actual discovery logic
    setTimeout(async () => {
      try {
        // Mock discovered software for demo
        const mockDiscoveries = [
          {
            tenantId,
            sessionId: session.id,
            agentId,
            name: 'Microsoft Office 365',
            version: '16.0.14931.20216',
            vendor: 'Microsoft Corporation',
            technology: 'productivity',
            installPath: 'C:\\Program Files\\Microsoft Office',
            sourceType: 'registry',
            confidence: 95,
            fingerprint: 'ms-office-365-' + Date.now()
          },
          {
            tenantId,
            sessionId: session.id,
            agentId,
            name: 'Google Chrome',
            version: '119.0.6045.199',
            vendor: 'Google LLC',
            technology: 'browser',
            installPath: 'C:\\Program Files\\Google\\Chrome',
            sourceType: 'filesystem',
            confidence: 100,
            fingerprint: 'chrome-' + Date.now()
          },
          {
            tenantId,
            sessionId: session.id,
            agentId,
            name: 'Docker Desktop',
            version: '4.25.2',
            vendor: 'Docker Inc.',
            technology: 'containers',
            installPath: 'C:\\Program Files\\Docker\\Docker',
            sourceType: 'process',
            confidence: 90,
            fingerprint: 'docker-' + Date.now()
          }
        ];

        // Insert discovered software
        await db.insert(discoveredSoftware).values(mockDiscoveries);

        // Update session as completed
        await db
          .update(discoverySessions)
          .set({
            status: 'completed',
            completedAt: new Date(),
            totalFound: mockDiscoveries.length,
            newAssets: mockDiscoveries.length
          })
          .where(eq(discoverySessions.id, session.id));

      } catch (error) {
        await db
          .update(discoverySessions)
          .set({
            status: 'failed',
            completedAt: new Date(),
            errors: { error: error.message }
          })
          .where(eq(discoverySessions.id, session.id));
      }
    }, 2000); // 2 second delay to simulate processing

    return session;
  }

  async getDiscoverySessions(tenantId: string): Promise<(DiscoverySession & { agent: DiscoveryAgent })[]> {
    const result = await db
      .select({
        session: discoverySessions,
        agent: discoveryAgents
      })
      .from(discoverySessions)
      .innerJoin(discoveryAgents, eq(discoverySessions.agentId, discoveryAgents.id))
      .where(eq(discoverySessions.tenantId, tenantId))
      .orderBy(desc(discoverySessions.startedAt));

    return result.map(row => ({
      ...row.session,
      agent: row.agent
    }));
  }

  async getDiscoveredSoftware(tenantId: string, status = 'discovered'): Promise<(DiscoveredSoftware & { 
    agent: DiscoveryAgent; 
    session: DiscoverySession;
    environment?: Environment;
    department?: Department;
  })[]> {
    const result = await db
      .select({
        discovered: discoveredSoftware,
        agent: discoveryAgents,
        session: discoverySessions,
        environment: environments,
        department: departments
      })
      .from(discoveredSoftware)
      .innerJoin(discoveryAgents, eq(discoveredSoftware.agentId, discoveryAgents.id))
      .innerJoin(discoverySessions, eq(discoveredSoftware.sessionId, discoverySessions.id))
      .leftJoin(environments, eq(discoveredSoftware.environmentId, environments.id))
      .leftJoin(departments, eq(discoveredSoftware.departmentId, departments.id))
      .where(and(
        eq(discoveredSoftware.tenantId, tenantId),
        eq(discoveredSoftware.status, status)
      ))
      .orderBy(desc(discoveredSoftware.discoveredAt));

    return result.map(row => ({
      ...row.discovered,
      agent: row.agent,
      session: row.session,
      environment: row.environment || undefined,
      department: row.department || undefined
    }));
  }

  async approveDiscoveredSoftware(tenantId: string, discoveredId: string, userId: string): Promise<SoftwareAsset> {
    const [discovered] = await db
      .select()
      .from(discoveredSoftware)
      .where(and(
        eq(discoveredSoftware.id, discoveredId),
        eq(discoveredSoftware.tenantId, tenantId)
      ));

    if (!discovered) {
      throw new Error('Discovered software not found');
    }

    // Create software asset from discovered data
    const [asset] = await db.insert(softwareAssets).values({
      tenantId,
      name: discovered.name,
      version: discovered.version,
      vendor: discovered.vendor,
      technology: discovered.technology,
      departmentId: discovered.departmentId,
      description: `Auto-discovered via ${discovered.sourceType}`
    }).returning();

    // Update discovered software status and link to asset
    await db
      .update(discoveredSoftware)
      .set({
        status: 'approved',
        assetId: asset.id,
        reviewedAt: new Date(),
        reviewedBy: userId
      })
      .where(eq(discoveredSoftware.id, discoveredId));

    return asset;
  }

  async rejectDiscoveredSoftware(tenantId: string, discoveredId: string, userId: string): Promise<void> {
    await db
      .update(discoveredSoftware)
      .set({
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: userId
      })
      .where(and(
        eq(discoveredSoftware.id, discoveredId),
        eq(discoveredSoftware.tenantId, tenantId)
      ));
  }
}

export const storage = new DatabaseStorage();