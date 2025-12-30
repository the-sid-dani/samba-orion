import { getSession } from "@/lib/auth/server";
import { pgAgentRepository } from "@/lib/db/pg/repositories/agent-repository.pg";
import { pgAgentPermissionRepository } from "@/lib/db/pg/repositories/agent-permission-repository.pg";
import { pgDb } from "@/lib/db/pg/db.pg";
import { UserSchema } from "@/lib/db/pg/schema.pg";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export default async function AdminPage() {
  const session = await getSession();

  if (!session?.user?.id) {
    return <div>Unauthorized</div>;
  }

  // Fetch admin agents (all agents owned by the admin)
  const adminAgents = await pgAgentRepository.selectAgents(session.user.id, [
    "mine",
  ]);

  // Enrich agents with permission data
  const enrichedAgents = await Promise.all(
    adminAgents.map(async (agent) => {
      const [permissions, permissionCount] = await Promise.all([
        pgAgentPermissionRepository.getAgentPermissions(agent.id),
        pgAgentPermissionRepository.countPermissions(agent.id),
      ]);

      return {
        ...agent,
        icon:
          typeof agent.icon === "string"
            ? agent.icon
            : (agent.icon as any)?.url || undefined,
        status: agent.status || "active", // Use database status, default to active
        permissionCount,
        permissions: permissions.map((p) => ({
          id: p.id,
          userId: p.userId,
          userName: p.userName,
          userEmail: p.userEmail,
          userImage: p.userImage,
          permissionLevel: p.permissionLevel,
        })),
      };
    }),
  );

  // Fetch all users for dashboard statistics
  const allUsers = await pgDb
    .select({
      id: UserSchema.id,
      name: UserSchema.name,
      email: UserSchema.email,
      image: UserSchema.image,
      role: UserSchema.role,
      createdAt: UserSchema.createdAt,
    })
    .from(UserSchema)
    .limit(100);

  const adminUsers = allUsers.filter((user) => user.role === "admin");

  return (
    <AdminDashboard
      adminAgents={enrichedAgents}
      allUsers={allUsers.map((user) => ({
        id: user.id,
        name: user.name || "Unknown User",
        email: user.email,
        image: user.image || undefined,
        role: user.role as "admin" | "user",
        createdAt: user.createdAt,
        updatedAt: (user as { updatedAt?: Date }).updatedAt || user.createdAt,
      }))}
      totalUsers={allUsers.length}
      adminUsers={adminUsers.length}
    />
  );
}
