import { PrismaClient, HierarchyTier, PermissionAccess } from "@prisma/client";

const prisma = new PrismaClient();

// Starting permission/role set for the admin panel's frozen-by-default
// access model. This is illustrative, not the final AIPCA position/rights
// matrix (that still needs research) - edit freely as real requirements
// firm up. A MemberPosition's Role determines what unlocks in /admin;
// anything without a matching RolePermission row stays frozen.
const PERMISSIONS = [
  { key: "admin.attendance", label: "Attendance Register", section: "Admin" },
  { key: "admin.contributions", label: "Contributions Ledger", section: "Admin" },
  { key: "admin.members", label: "Member Management", section: "Admin" },
  { key: "admin.projects", label: "Projects & Welfare", section: "Admin" },
  { key: "admin.rollup", label: "Financial Rollup (Consolidated View)", section: "Admin" },
  { key: "notifications.finance", label: "Receive Finance Notifications", section: "Notifications" },
] as const;

const ROLES: Array<{
  name: string;
  scope: HierarchyTier;
  description: string;
  grants: Array<{ key: (typeof PERMISSIONS)[number]["key"]; access: PermissionAccess }>;
}> = [
  {
    name: "Parish Chairman",
    scope: HierarchyTier.PARISH,
    description: "Full oversight of a single parish's admin panel.",
    grants: [
      { key: "admin.attendance", access: PermissionAccess.EDIT },
      { key: "admin.contributions", access: PermissionAccess.EDIT },
      { key: "admin.members", access: PermissionAccess.EDIT },
      { key: "admin.projects", access: PermissionAccess.EDIT },
      { key: "admin.rollup", access: PermissionAccess.VIEW },
    ],
  },
  {
    name: "Parish Treasurer",
    scope: HierarchyTier.PARISH,
    description: "Manages contributions, projects, and welfare cases for a parish.",
    grants: [
      { key: "admin.contributions", access: PermissionAccess.EDIT },
      { key: "admin.projects", access: PermissionAccess.EDIT },
      { key: "admin.rollup", access: PermissionAccess.VIEW },
      { key: "notifications.finance", access: PermissionAccess.VIEW },
    ],
  },
  {
    name: "Local Church Group Leader",
    scope: HierarchyTier.LOCAL_CHURCH,
    description: "Runs attendance and views membership for one local church.",
    grants: [
      { key: "admin.attendance", access: PermissionAccess.EDIT },
      { key: "admin.members", access: PermissionAccess.VIEW },
    ],
  },
  {
    name: "Local Church Treasurer",
    scope: HierarchyTier.LOCAL_CHURCH,
    description:
      "Financially accountable for one local church's own giving (tithe, cess, call registry, etc.) - " +
      "the 'account holder' for that church specifically, distinct from the parish-wide treasurer.",
    grants: [
      { key: "admin.contributions", access: PermissionAccess.EDIT },
      { key: "admin.rollup", access: PermissionAccess.VIEW },
      { key: "notifications.finance", access: PermissionAccess.VIEW },
    ],
  },
  {
    name: "National Treasurer",
    scope: HierarchyTier.HEADQUARTERS,
    description:
      "The consolidated, national-level financial view - every archdiocese, diocese, parish, and local " +
      "church rolled up, the way an investor sees every subsidiary in a corporation. Reporting only for " +
      "now; doesn't grant edit rights over any individual parish's own admin panel.",
    grants: [
      { key: "admin.rollup", access: PermissionAccess.VIEW },
      { key: "notifications.finance", access: PermissionAccess.VIEW },
    ],
  },
];

async function main() {
  console.log("?? Starting church hierarchy database seeding...");

  // 1. Seed National Headquarters (The Root of AIPCA Hierarchy) - a
  // singleton, so reuse whichever HQ row already exists rather than
  // matching on title (which isn't a real unique key).
  const hq =
    (await prisma.nationalHeadquarters.findFirst()) ??
    (await prisma.nationalHeadquarters.create({
      data: {
        title: "AIPCA Supreme Board - Bahati HQ",
        archbishopName: "Archbishop Samson Muthuri"
      }
    }));

  // 2. Seed Archdiocese (upsert on name+headquarters - re-running this
  // script must never create a second copy of the same org unit)
  const archdiocese = await prisma.archdiocese.upsert({
    where: { name_headquartersId: { name: "Central Western Archdiocese", headquartersId: hq.id } },
    update: {},
    create: {
      name: "Central Western Archdiocese",
      headquartersId: hq.id
    }
  });

  // 3. Seed Diocese
  const diocese = await prisma.diocese.upsert({
    where: { name_archidId: { name: "Gatundu Diocese", archidId: archdiocese.id } },
    update: {},
    create: {
      name: "Gatundu Diocese",
      bishopName: "Bishop Njoroge",
      archidId: archdiocese.id
    }
  });

  // 4. Seed Local Parish Core
  const parish = await prisma.parish.upsert({
    where: { name_dioceseId: { name: "Gatundu Central Parish", dioceseId: diocese.id } },
    update: {},
    create: {
      name: "Gatundu Central Parish",
      dioceseId: diocese.id,
      tithePaybill: "700000",
      cessPaybill: "700001",
      operationsPaybill: "700002",
      projectsPaybill: "700003"
    }
  });

  // 5. Seed Grassroots Outpost
  const outpost = await prisma.localChurch.upsert({
    where: { name_parishId: { name: "Ngarariga Local Outpost", parishId: parish.id } },
    update: {},
    create: {
      name: "Ngarariga Local Outpost",
      parishId: parish.id
    }
  });

  // 6. Seed Baseline Test Member (plain member, no admin rights - used to
  // verify the padlock stays frozen for non-leaders)
  await prisma.member.upsert({
    where: { membershipNo: "AIPCA-GAT-0422" },
    update: {},
    create: {
      membershipNo: "AIPCA-GAT-0422",
      idNumber: "30112233",
      name: "Samuel Mwangi",
      phone: "254700000000",
      localChurchId: outpost.id
    }
  });

  // 7. Seed Permissions and Roles (idempotent - safe to re-run)
  const permissionsByKey = new Map<string, { id: string }>();
  for (const permission of PERMISSIONS) {
    const row = await prisma.permission.upsert({
      where: { key: permission.key },
      update: { label: permission.label, section: permission.section },
      create: permission
    });
    permissionsByKey.set(permission.key, row);
  }

  const rolesByName = new Map<string, { id: string }>();
  for (const role of ROLES) {
    const row = await prisma.role.upsert({
      where: { name: role.name },
      update: { scope: role.scope, description: role.description },
      create: { name: role.name, scope: role.scope, description: role.description }
    });
    rolesByName.set(role.name, row);

    for (const grant of role.grants) {
      const permission = permissionsByKey.get(grant.key)!;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: row.id, permissionId: permission.id } },
        update: { access: grant.access },
        create: { roleId: row.id, permissionId: permission.id, access: grant.access }
      });
    }
  }

  // 8. Seed a Leader test Member holding the Parish Chairman role at the
  // seeded parish - used to verify the padlock unlocks /admin after
  // reverification. Set up a login for this member (see
  // /api/admin/members/[id]/set-pin) to test end-to-end.
  const leader = await prisma.member.upsert({
    where: { membershipNo: "AIPCA-GAT-0001" },
    update: {},
    create: {
      membershipNo: "AIPCA-GAT-0001",
      name: "Grace Wanjiru",
      phone: "254700000001",
      localChurchId: outpost.id
    }
  });

  const chairman = rolesByName.get("Parish Chairman")!;
  const existingPosition = await prisma.memberPosition.findFirst({
    where: { memberId: leader.id, roleId: chairman.id, scopeId: parish.id, endDate: null }
  });
  if (!existingPosition) {
    await prisma.memberPosition.create({
      data: { memberId: leader.id, roleId: chairman.id, scopeId: parish.id }
    });
  }

  console.log("? AIPCA Database Hierarchy successfully seeded!");
}

main()
  .catch((e) => {
    console.error("? Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
