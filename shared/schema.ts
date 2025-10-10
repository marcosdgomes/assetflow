import { sql } from "drizzle-orm";
import { 
  index, 
  jsonb, 
  pgTable, 
  text, 
  varchar, 
  timestamp, 
  decimal, 
  integer,
  boolean
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Users table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("user"), // super-admin, user
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tenants table for multi-tenancy
export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: varchar("slug").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User-tenant relationships
export const userTenants = pgTable("user_tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  role: varchar("role").notNull().default("user"), // admin, user
  createdAt: timestamp("created_at").defaultNow(),
});

// Departments within tenants
export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Environments (infrastructure, VMs, cloud)
export const environments = pgTable("environments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: varchar("type").notNull(), // cloud, on-premise, vm, container
  provider: varchar("provider"), // aws, azure, gcp, etc.
  status: varchar("status").notNull().default("active"), // active, inactive, maintenance
  description: text("description"),
  instanceCount: integer("instance_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Software assets
export const softwareAssets: any = pgTable("software_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  departmentId: varchar("department_id").references(() => departments.id),
  parentSoftwareId: varchar("parent_software_id"),
  name: text("name").notNull(),
  description: text("description"),
  version: varchar("version"),
  technology: varchar("technology"), // database, web-app, api, desktop, etc.
  vendor: varchar("vendor"),
  licenseType: varchar("license_type"), // subscription, perpetual, open-source, internal
  status: varchar("status").notNull().default("active"), // active, inactive, deprecated, update-available
  isInternal: boolean("is_internal").default(false),
  gitProvider: varchar("git_provider"), // gitlab, github, bitbucket, azure-devops
  gitRepositoryUrl: varchar("git_repository_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Software version history
export const softwareVersions = pgTable("software_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  softwareAssetId: varchar("software_asset_id").notNull().references(() => softwareAssets.id, { onDelete: "cascade" }),
  version: varchar("version").notNull(),
  releaseDate: timestamp("release_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Software costs (licenses, subscriptions)
export const softwareCosts = pgTable("software_costs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  softwareAssetId: varchar("software_asset_id").notNull().references(() => softwareAssets.id, { onDelete: "cascade" }),
  costType: varchar("cost_type").notNull(), // license, subscription, development, maintenance
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").notNull().default("USD"),
  billingCycle: varchar("billing_cycle").notNull(), // monthly, yearly, one-time
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Software dependencies (software-to-software relationships)
export const softwareDependencies = pgTable("software_dependencies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentSoftwareId: varchar("parent_software_id").notNull().references(() => softwareAssets.id, { onDelete: "cascade" }),
  dependentSoftwareId: varchar("dependent_software_id").notNull().references(() => softwareAssets.id, { onDelete: "cascade" }),
  dependencyType: varchar("dependency_type").notNull(), // required, optional, integration
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Environment-software relationships (traceability)
export const environmentSoftware = pgTable("environment_software", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  environmentId: varchar("environment_id").notNull().references(() => environments.id, { onDelete: "cascade" }),
  softwareAssetId: varchar("software_asset_id").notNull().references(() => softwareAssets.id, { onDelete: "cascade" }),
  deploymentStatus: varchar("deployment_status").default("deployed"), // deployed, pending, failed
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity log
export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action").notNull(), // created, updated, deleted, deployed
  entityType: varchar("entity_type").notNull(), // software, environment, dependency
  entityId: varchar("entity_id").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Discovery agents/scanners
export const discoveryAgents = pgTable("discovery_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: varchar("type").notNull(), // network-scan, api-integration, agent-based, registry-scan
  environmentId: varchar("environment_id").references(() => environments.id, { onDelete: "cascade" }),
  status: varchar("status").notNull().default("active"), // active, inactive, error
  configuration: jsonb("configuration"), // Scanner-specific config
  lastRun: timestamp("last_run"),
  nextRun: timestamp("next_run"),
  schedule: varchar("schedule"), // cron expression
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Discovery scan results/sessions
export const discoverySessions = pgTable("discovery_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  agentId: varchar("agent_id").notNull().references(() => discoveryAgents.id, { onDelete: "cascade" }),
  status: varchar("status").notNull().default("running"), // running, completed, failed
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  totalFound: integer("total_found").default(0),
  newAssets: integer("new_assets").default(0),
  updatedAssets: integer("updated_assets").default(0),
  errors: jsonb("errors"), // Error details
  metadata: jsonb("metadata"), // Scan details
});

// Discovered software items (before they become assets)
export const discoveredSoftware = pgTable("discovered_software", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id").notNull().references(() => discoverySessions.id, { onDelete: "cascade" }),
  agentId: varchar("agent_id").notNull().references(() => discoveryAgents.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  version: varchar("version"),
  vendor: text("vendor"),
  technology: varchar("technology"),
  installPath: text("install_path"),
  environmentId: varchar("environment_id").references(() => environments.id),
  departmentId: varchar("department_id").references(() => departments.id),
  sourceType: varchar("source_type").notNull(), // registry, filesystem, process, api
  sourceData: jsonb("source_data"), // Raw discovery data
  fingerprint: varchar("fingerprint"), // Unique identifier for deduplication
  status: varchar("status").notNull().default("discovered"), // discovered, approved, rejected, merged
  assetId: varchar("asset_id").references(() => softwareAssets.id), // Link to created asset
  confidence: integer("confidence").default(100), // Confidence level 0-100
  discoveredAt: timestamp("discovered_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  userTenants: many(userTenants),
  activities: many(activities),
}));

export const tenantsRelations = relations(tenants, ({ many }) => ({
  userTenants: many(userTenants),
  departments: many(departments),
  environments: many(environments),
  softwareAssets: many(softwareAssets),
  activities: many(activities),
}));

export const userTenantsRelations = relations(userTenants, ({ one }) => ({
  user: one(users, {
    fields: [userTenants.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [userTenants.tenantId],
    references: [tenants.id],
  }),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [departments.tenantId],
    references: [tenants.id],
  }),
  softwareAssets: many(softwareAssets),
}));

export const environmentsRelations = relations(environments, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [environments.tenantId],
    references: [tenants.id],
  }),
  environmentSoftware: many(environmentSoftware),
}));

export const softwareAssetsRelations: any = relations(softwareAssets, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [softwareAssets.tenantId],
    references: [tenants.id],
  }),
  department: one(departments, {
    fields: [softwareAssets.departmentId],
    references: [departments.id],
  }),
  parentSoftware: one(softwareAssets, {
    fields: [softwareAssets.parentSoftwareId],
    references: [softwareAssets.id],
    relationName: "softwareHierarchy",
  }),
  subSoftware: many(softwareAssets, {
    relationName: "softwareHierarchy",
  }),
  versions: many(softwareVersions),
  costs: many(softwareCosts),
  parentDependencies: many(softwareDependencies, { relationName: "parent" }),
  childDependencies: many(softwareDependencies, { relationName: "dependent" }),
  environmentSoftware: many(environmentSoftware),
}));

export const softwareVersionsRelations = relations(softwareVersions, ({ one }) => ({
  software: one(softwareAssets, {
    fields: [softwareVersions.softwareAssetId],
    references: [softwareAssets.id],
  }),
}));

export const softwareCostsRelations = relations(softwareCosts, ({ one }) => ({
  software: one(softwareAssets, {
    fields: [softwareCosts.softwareAssetId],
    references: [softwareAssets.id],
  }),
}));

export const softwareDependenciesRelations = relations(softwareDependencies, ({ one }) => ({
  parentSoftware: one(softwareAssets, {
    fields: [softwareDependencies.parentSoftwareId],
    references: [softwareAssets.id],
    relationName: "parent",
  }),
  dependentSoftware: one(softwareAssets, {
    fields: [softwareDependencies.dependentSoftwareId],
    references: [softwareAssets.id],
    relationName: "dependent",
  }),
}));

export const environmentSoftwareRelations = relations(environmentSoftware, ({ one }) => ({
  environment: one(environments, {
    fields: [environmentSoftware.environmentId],
    references: [environments.id],
  }),
  software: one(softwareAssets, {
    fields: [environmentSoftware.softwareAssetId],
    references: [softwareAssets.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  tenant: one(tenants, {
    fields: [activities.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

export const discoveryAgentsRelations = relations(discoveryAgents, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [discoveryAgents.tenantId],
    references: [tenants.id],
  }),
  environment: one(environments, {
    fields: [discoveryAgents.environmentId],
    references: [environments.id],
  }),
  sessions: many(discoverySessions),
  discoveries: many(discoveredSoftware),
}));

export const discoverySessionsRelations = relations(discoverySessions, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [discoverySessions.tenantId],
    references: [tenants.id],
  }),
  agent: one(discoveryAgents, {
    fields: [discoverySessions.agentId],
    references: [discoveryAgents.id],
  }),
  discoveries: many(discoveredSoftware),
}));

export const discoveredSoftwareRelations = relations(discoveredSoftware, ({ one }) => ({
  tenant: one(tenants, {
    fields: [discoveredSoftware.tenantId],
    references: [tenants.id],
  }),
  session: one(discoverySessions, {
    fields: [discoveredSoftware.sessionId],
    references: [discoverySessions.id],
  }),
  agent: one(discoveryAgents, {
    fields: [discoveredSoftware.agentId],
    references: [discoveryAgents.id],
  }),
  environment: one(environments, {
    fields: [discoveredSoftware.environmentId],
    references: [environments.id],
  }),
  department: one(departments, {
    fields: [discoveredSoftware.departmentId],
    references: [departments.id],
  }),
  asset: one(softwareAssets, {
    fields: [discoveredSoftware.assetId],
    references: [softwareAssets.id],
  }),
  reviewedByUser: one(users, {
    fields: [discoveredSoftware.reviewedBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserTenantSchema = createInsertSchema(userTenants).omit({
  id: true,
  createdAt: true,
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEnvironmentSchema = createInsertSchema(environments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSoftwareAssetSchema = createInsertSchema(softwareAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSoftwareCostSchema = createInsertSchema(softwareCosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSoftwareDependencySchema = createInsertSchema(softwareDependencies).omit({
  id: true,
  createdAt: true,
});

export const insertEnvironmentSoftwareSchema = createInsertSchema(environmentSoftware).omit({
  id: true,
  createdAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertDiscoveryAgentSchema = createInsertSchema(discoveryAgents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDiscoverySessionSchema = createInsertSchema(discoverySessions).omit({
  id: true,
  startedAt: true,
});

export const insertDiscoveredSoftwareSchema = createInsertSchema(discoveredSoftware).omit({
  id: true,
  discoveredAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserTenant = typeof userTenants.$inferSelect;
export type InsertUserTenant = z.infer<typeof insertUserTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Environment = typeof environments.$inferSelect;
export type InsertEnvironment = z.infer<typeof insertEnvironmentSchema>;
export type SoftwareAsset = typeof softwareAssets.$inferSelect;
export type InsertSoftwareAsset = z.infer<typeof insertSoftwareAssetSchema>;
export type SoftwareCost = typeof softwareCosts.$inferSelect;
export type InsertSoftwareCost = z.infer<typeof insertSoftwareCostSchema>;
export type SoftwareDependency = typeof softwareDependencies.$inferSelect;
export type InsertSoftwareDependency = z.infer<typeof insertSoftwareDependencySchema>;
export type EnvironmentSoftware = typeof environmentSoftware.$inferSelect;
export type InsertEnvironmentSoftware = z.infer<typeof insertEnvironmentSoftwareSchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type DiscoveryAgent = typeof discoveryAgents.$inferSelect;
export type InsertDiscoveryAgent = z.infer<typeof insertDiscoveryAgentSchema>;
export type DiscoverySession = typeof discoverySessions.$inferSelect;
export type InsertDiscoverySession = z.infer<typeof insertDiscoverySessionSchema>;
export type DiscoveredSoftware = typeof discoveredSoftware.$inferSelect;
export type InsertDiscoveredSoftware = z.infer<typeof insertDiscoveredSoftwareSchema>;
