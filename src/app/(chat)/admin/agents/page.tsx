import { getEnhancedSession } from "@/lib/auth/server";
import { pgAgentRepository } from "@/lib/db/pg/repositories/agent-repository.pg";
import { notFound } from "next/navigation";
import { AdminAgentsList } from "@/components/admin/admin-agents-list";
import { AdminAgentTableRow } from "@/types/admin";

export default async function AdminAgentsPage() {
  const session = await getEnhancedSession();

  if (!session?.user?.id) {
    notFound();
  }

  // Fetch all agents to filter admin-all ones
  const allAgents = await pgAgentRepository.selectAgents(session.user.id, [
    "all",
  ]);
  const adminAgents = allAgents.filter(
    (agent) => agent.visibility === "admin-all",
  );

  // Transform to AdminAgentTableRow format
  const adminAgentRows: AdminAgentTableRow[] = adminAgents.map((agent) => ({
    ...agent,
    icon: agent.icon?.value,
    permissionCount: 0, // TODO: fetch actual permission count
    permissions: [], // TODO: fetch actual permissions
  }));

  return <AdminAgentsList agents={adminAgentRows} userId={session.user.id} />;
}
