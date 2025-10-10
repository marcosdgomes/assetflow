import bcrypt from "bcrypt";
import { storage } from "./storage";

export async function seedDefaultSuperAdmin() {
  try {
    // Check if any super admin exists
    const hasSuperAdmin = await storage.hasSuperAdmin();
    
    if (hasSuperAdmin) {
      console.log("Super admin already exists, skipping seed");
      return;
    }

    // Check if default admin user exists
    const existingAdmin = await storage.getUserByUsername("admin");
    
    if (existingAdmin) {
      console.log("Default admin user already exists, skipping seed");
      return;
    }

    // Hash the default password
    const hashedPassword = await bcrypt.hash("admin123", 10);

    // Create default super admin
    const superAdmin = await storage.createUser({
      username: "admin",
      email: "admin@assetflow.local",
      password: hashedPassword,
      firstName: "Super",
      lastName: "Admin",
      role: "super-admin",
    });

    console.log("✓ Default super admin created successfully");
    console.log("  Username: admin");
    console.log("  Password: admin123");
    console.log("  ⚠️  Please change the password after first login!");
    
    return superAdmin;
  } catch (error) {
    console.error("Error seeding default super admin:", error);
    throw error;
  }
}
