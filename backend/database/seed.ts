import type { RowDataPacket } from "mysql2";
import { database } from "../src/config/database";
import { hash } from "bcryptjs";

interface IdRow extends RowDataPacket {
  id: number;
}

interface PermissionRow extends RowDataPacket {
  id: number;
  code: string;
}
// helper funksion
function requiredSeedEnvironment(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing seed environment variable: ${name}`);
  }

  return value;
}

const permissionSeeds = [
  {
    code: "users.manage",
    description: "Create, update and disable dealership users",
  },
  {
    code: "inventory.read",
    description: "View vehicle inventory",
  },
  {
    code: "inventory.write",
    description: "Create and update vehicles",
  },
  {
    code: "inventory.reserve",
    description: "Reserve available vehicles",
  },
  {
    code: "crm.read",
    description: "View customers, leads and test drives",
  },
  {
    code: "crm.write",
    description: "Manage customers, leads and test drives",
  },
  {
    code: "sales.read",
    description: "View offers, reservations and sales",
  },
  {
    code: "sales.create_offer",
    description: "Create and manage sales offers",
  },
  {
    code: "sales.complete",
    description: "Complete vehicle sales",
  },
  {
    code: "reports.read",
    description: "View dealership reports",
  },
];

const roleSeeds = [
  {
    code: "DEALERSHIP_ADMIN",
    name: "Dealership Administrator",
    description: "Full dealership access",
    permissionCodes: permissionSeeds.map((permission) => permission.code),
  },
  {
    code: "SALES_MANAGER",
    name: "Sales Manager",
    description: "Manages inventory, CRM and sales operations",
    permissionCodes: [
      "inventory.read",
      "inventory.write",
      "inventory.reserve",
      "crm.read",
      "crm.write",
      "sales.read",
      "sales.create_offer",
      "sales.complete",
      "reports.read",
    ],
  },
  {
    code: "SALESPERSON",
    name: "Salesperson",
    description: "Handles customers, leads, offers and reservations",
    permissionCodes: [
      "inventory.read",
      "inventory.reserve",
      "crm.read",
      "crm.write",
      "sales.read",
      "sales.create_offer",
    ],
  },
];

async function runSeed(): Promise<void> {
    const systemAdminEmail = requiredSeedEnvironment(
        "SEED_SYSTEM_ADMIN_EMAIL",
    ).toLowerCase();

    const systemAdminPassword = requiredSeedEnvironment(
        "SEED_SYSTEM_ADMIN_PASSWORD",
    );

    const tenantAdminEmail = requiredSeedEnvironment(
        "SEED_TENANT_ADMIN_EMAIL",
    ).toLowerCase();

    const tenantAdminPassword = requiredSeedEnvironment(
        "SEED_TENANT_ADMIN_PASSWORD",
    );

    const [systemAdminPasswordHash, tenantAdminPasswordHash] =
        await Promise.all([
            hash(systemAdminPassword, 12),
            hash(tenantAdminPassword, 12),
        ]);

  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      `
        INSERT INTO tenants (
          name,
          slug,
          contact_email,
          contact_phone,
          currency_code,
          timezone,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
        ON DUPLICATE KEY UPDATE
          name = ?,
          contact_email = ?,
          contact_phone = ?,
          currency_code = ?,
          timezone = ?,
          status = 'ACTIVE',
          deleted_at = NULL
      `,
      [
        "Demo Motors",
        "demo-motors",
        "admin@demo-motors.test",
        "+381600000000",
        "EUR",
        "Europe/Belgrade",

        "Demo Motors",
        "admin@demo-motors.test",
        "+381600000000",
        "EUR",
        "Europe/Belgrade",
      ],
    );

    const [tenantRows] = await connection.execute<IdRow[]>(
      `
        SELECT id
        FROM tenants
        WHERE slug = ?
        LIMIT 1
      `,
      ["demo-motors"],
    );

    const tenant = tenantRows[0];

    if (!tenant) {
      throw new Error("Demo tenant could not be created");
    }

    await connection.execute(
      `
        INSERT INTO locations (
          tenant_id,
          name,
          code,
          address_line_1,
          city,
          postal_code,
          country_code,
          phone,
          email,
          is_primary,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, 'ACTIVE')
        ON DUPLICATE KEY UPDATE
          name = ?,
          address_line_1 = ?,
          city = ?,
          postal_code = ?,
          country_code = ?,
          phone = ?,
          email = ?,
          is_primary = TRUE,
          status = 'ACTIVE',
          deleted_at = NULL
      `,
      [
        tenant.id,
        "Main Location",
        "MAIN",
        "1 Development Street",
        "Preševo",
        "17523",
        "RS",
        "+381600000000",
        "admin@demo-motors.test",

        "Main Location",
        "1 Development Street",
        "Preševo",
        "17523",
        "RS",
        "+381600000000",
        "admin@demo-motors.test",
      ],
    );

    for (const permission of permissionSeeds) {
  await connection.execute(
    `
      INSERT INTO permissions (
        code,
        description
      )
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE
        description = ?
    `,
    [
      permission.code,
      permission.description,
      permission.description,
    ],
  );
}

const [permissionRows] = await connection.execute<PermissionRow[]>(
  `
    SELECT id, code
    FROM permissions
  `,
);

const permissionIdByCode = new Map(
  permissionRows.map((permission) => [
    permission.code,
    permission.id,
  ]),
);

for (const role of roleSeeds) {
  await connection.execute(
    `
      INSERT INTO roles (
        tenant_id,
        name,
        code,
        description,
        is_system
      )
      VALUES (?, ?, ?, ?, TRUE)
      ON DUPLICATE KEY UPDATE
        name = ?,
        description = ?,
        is_system = TRUE
    `,
    [
      tenant.id,
      role.name,
      role.code,
      role.description,

      role.name,
      role.description,
    ],
  );

  const [roleRows] = await connection.execute<IdRow[]>(
    `
      SELECT id
      FROM roles
      WHERE tenant_id = ?
        AND code = ?
      LIMIT 1
    `,
    [tenant.id, role.code],
  );

  const roleRecord = roleRows[0];

  if (!roleRecord) {
    throw new Error(`Role could not be created: ${role.code}`);
  }

  await connection.execute(
    `
      DELETE FROM role_permissions
      WHERE tenant_id = ?
        AND role_id = ?
    `,
    [tenant.id, roleRecord.id],
  );

  for (const permissionCode of role.permissionCodes) {
    const permissionId = permissionIdByCode.get(permissionCode);

    if (!permissionId) {
      throw new Error(`Permission not found: ${permissionCode}`);
    }

    await connection.execute(
      `
        INSERT INTO role_permissions (
          tenant_id,
          role_id,
          permission_id
        )
        VALUES (?, ?, ?)
      `,
      [tenant.id, roleRecord.id, permissionId],
    );
  }
}

console.log("Seeded permissions and roles");

const [locationRows] = await connection.execute<IdRow[]>(
  `
    SELECT id
    FROM locations
    WHERE tenant_id = ?
      AND code = 'MAIN'
    LIMIT 1
  `,
  [tenant.id],
);

const mainLocation = locationRows[0];

if (!mainLocation) {
  throw new Error("Primary dealership location was not found");
}

const [adminRoleRows] = await connection.execute<IdRow[]>(
  `
    SELECT id
    FROM roles
    WHERE tenant_id = ?
      AND code = 'DEALERSHIP_ADMIN'
    LIMIT 1
  `,
  [tenant.id],
);

const dealershipAdminRole = adminRoleRows[0];

if (!dealershipAdminRole) {
  throw new Error("DEALERSHIP_ADMIN role was not found");
}

await connection.execute(
  `
    INSERT INTO platform_users (
      first_name,
      last_name,
      email,
      password_hash,
      role,
      status
    )
    VALUES (?, ?, ?, ?, 'SYSTEM_ADMIN', 'ACTIVE')
    ON DUPLICATE KEY UPDATE
      first_name = ?,
      last_name = ?,
      password_hash = ?,
      role = 'SYSTEM_ADMIN',
      status = 'ACTIVE',
      deleted_at = NULL
  `,
  [
    "System",
    "Administrator",
    systemAdminEmail,
    systemAdminPasswordHash,

    "System",
    "Administrator",
    systemAdminPasswordHash,
  ],
);

await connection.execute(
  `
    INSERT INTO users (
      tenant_id,
      default_location_id,
      first_name,
      last_name,
      email,
      password_hash,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
    ON DUPLICATE KEY UPDATE
      default_location_id = ?,
      first_name = ?,
      last_name = ?,
      password_hash = ?,
      status = 'ACTIVE',
      deleted_at = NULL
  `,
  [
    tenant.id,
    mainLocation.id,
    "Dealership",
    "Administrator",
    tenantAdminEmail,
    tenantAdminPasswordHash,

    mainLocation.id,
    "Dealership",
    "Administrator",
    tenantAdminPasswordHash,
  ],
);

const [tenantAdminRows] = await connection.execute<IdRow[]>(
  `
    SELECT id
    FROM users
    WHERE tenant_id = ?
      AND email = ?
    LIMIT 1
  `,
  [tenant.id, tenantAdminEmail],
);

const tenantAdmin = tenantAdminRows[0];

if (!tenantAdmin) {
  throw new Error("Dealership administrator was not created");
}

await connection.execute(
  `
    INSERT INTO user_roles (
      tenant_id,
      user_id,
      role_id,
      assigned_by_user_id
    )
    VALUES (?, ?, ?, NULL)
    ON DUPLICATE KEY UPDATE
      assigned_by_user_id = NULL
  `,
  [
    tenant.id,
    tenantAdmin.id,
    dealershipAdminRole.id,
  ],
);

console.log("Seeded system administrator");
console.log("Seeded dealership administrator");

    await connection.commit();

    console.log(`Seeded tenant with ID ${tenant.id}`);
    console.log("Seeded primary location");
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function main(): Promise<void> {
  try {
    await runSeed();
    console.log("Seed completed successfully");
  } catch (error: unknown) {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  } finally {
    await database.end();
  }
}

void main();