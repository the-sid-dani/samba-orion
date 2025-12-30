"use client";

import { AdminUsersTable } from "./admin-users-table";

interface Props {
  users: Array<{
    id: string;
    name: string | null;
    email: string;
    role: "admin" | "user";
    image?: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  currentUserId: string;
}

export function AdminUsersList({ users, currentUserId }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          User Management
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Manage user roles and permissions across the platform.
        </p>
      </div>

      <AdminUsersTable
        users={users.map((user) => ({ ...user, name: user.name || "Unknown" }))}
        currentUserId={currentUserId}
        // onRoleUpdate handler not passed - uses default behavior
      />
    </div>
  );
}
