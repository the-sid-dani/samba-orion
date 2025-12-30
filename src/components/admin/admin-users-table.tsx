"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { AdminUserTableRow } from "@/types/admin";
import { ArrowDownUp, Eye, Crown, Settings } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { Input } from "ui/input";
import { Badge } from "ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import { Button } from "ui/button";

// Column configuration
interface Column {
  key: keyof AdminUserTableRow | "actions" | "roleManagement";
  label: string;
  type?: "string" | "number" | "date" | "custom";
  sortable?: boolean;
}

const columns: Column[] = [
  { key: "name", label: "Name", type: "string", sortable: true },
  { key: "email", label: "Email", type: "string", sortable: true },
  { key: "roleManagement", label: "Role", type: "custom", sortable: false },
  { key: "createdAt", label: "Created", type: "date", sortable: true },
  { key: "actions", label: "Actions", type: "custom", sortable: false },
];

// Sort direction type
type SortDirection = "asc" | "desc" | null;

interface UserRoleDropdownProps {
  userId: string;
  currentRole: "admin" | "user";
  onRoleChange?: (userId: string, newRole: "admin" | "user") => Promise<void>;
  disabled?: boolean;
}

function UserRoleDropdown({
  userId,
  currentRole,
  onRoleChange,
  disabled = false,
}: UserRoleDropdownProps) {
  const [localRole, setLocalRole] = useState<"admin" | "user">(currentRole);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleRoleChange = async (newRole: string) => {
    if (disabled || isUpdating) return;

    const roleValue = newRole as "admin" | "user";
    const prevRole = localRole;

    // Optimistic update
    setLocalRole(roleValue);

    if (onRoleChange) {
      setIsUpdating(true);
      try {
        await onRoleChange(userId, roleValue);
      } catch (error) {
        // Rollback on error
        setLocalRole(prevRole);
        console.error("Failed to update user role:", error);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 justify-between min-w-[80px]"
          disabled={disabled || isUpdating}
        >
          <Badge
            variant={localRole === "admin" ? "default" : "secondary"}
            className="border-0 bg-transparent px-0"
          >
            {localRole === "admin" ? (
              <>
                <Crown className="size-3 mr-1 text-purple-600" />
                <span className="text-purple-600">Admin</span>
              </>
            ) : (
              <>
                <Settings className="size-3 mr-1 text-gray-600" />
                <span className="text-gray-600">User</span>
              </>
            )}
          </Badge>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuLabel>User Role</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuRadioGroup
          value={localRole}
          onValueChange={handleRoleChange}
        >
          <DropdownMenuRadioItem value="admin" disabled={isUpdating}>
            <Crown className="size-3 mr-2 text-purple-600" />
            Admin
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="user" disabled={isUpdating}>
            <Settings className="size-3 mr-2 text-gray-600" />
            User
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface AdminUsersTableProps {
  users: AdminUserTableRow[];
  currentUserId?: string;
  onRoleUpdate?: (userId: string, newRole: "admin" | "user") => Promise<void>;
}

export function AdminUsersTable({
  users,
  currentUserId: _currentUserId,
  onRoleUpdate,
}: AdminUsersTableProps) {
  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(columns.map((col) => col.key)),
  );

  // Helper function to format cell values
  const formatCellValue = (value: any, columnType: string = "string") => {
    if (value === null || value === undefined) return "";

    switch (columnType) {
      case "date":
        try {
          return new Date(value).toLocaleDateString();
        } catch {
          return value;
        }
      default:
        return String(value);
    }
  };

  // Helper function to get user initials for avatar
  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = [...users];

    // Apply global search
    if (searchTerm) {
      filtered = filtered.filter((user) =>
        Object.values(user).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      );
    }

    // Apply sorting
    if (sortColumn && sortDirection) {
      filtered.sort((a, b) => {
        const aValue = a[sortColumn as keyof AdminUserTableRow];
        const bValue = b[sortColumn as keyof AdminUserTableRow];

        let comparison = 0;

        if (sortColumn === "createdAt") {
          comparison =
            new Date(aValue as Date).getTime() -
            new Date(bValue as Date).getTime();
        } else {
          comparison = String(aValue || "").localeCompare(String(bValue || ""));
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return filtered;
  }, [users, searchTerm, sortColumn, sortDirection]);

  // Handle sorting
  const handleSort = (columnKey: string) => {
    const column = columns.find((col) => col.key === columnKey);
    if (!column?.sortable) return;

    if (sortColumn === columnKey) {
      setSortDirection(
        sortDirection === "asc"
          ? "desc"
          : sortDirection === "desc"
            ? null
            : "asc",
      );
      if (sortDirection === "desc") {
        setSortColumn(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
  };

  const visibleColumnsArray = columns.filter((col) =>
    visibleColumns.has(col.key),
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="size-5 text-primary" />
              Platform Users ({users.length})
            </CardTitle>
          </div>

          {/* Search and Column Visibility */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="data-[state=open]:bg-accent">
                  <Eye className="size-3.5" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {columns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.key}
                    checked={visibleColumns.has(column.key)}
                    onCheckedChange={(checked) => {
                      const newVisible = new Set(visibleColumns);
                      if (checked) {
                        newVisible.add(column.key);
                      } else {
                        newVisible.delete(column.key);
                      }
                      setVisibleColumns(newVisible);
                    }}
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0">
        <Table>
          <TableHeader className="bg-secondary border-t">
            <TableRow>
              {visibleColumnsArray.map((column, index) => (
                <TableHead
                  key={column.key}
                  className={`relative select-none ${
                    index === 0
                      ? "pl-6"
                      : index === visibleColumnsArray.length - 1
                        ? "pr-6"
                        : ""
                  } ${column.type === "date" ? "text-center" : ""}`}
                >
                  {column.sortable ? (
                    <div
                      className="flex items-center gap-2 cursor-pointer hover:text-primary"
                      onClick={() => handleSort(column.key)}
                    >
                      <span>{column.label}</span>
                      <ArrowDownUp
                        className={`h-3 w-3 ${
                          sortColumn === column.key
                            ? ""
                            : "text-muted-foreground/30"
                        }`}
                      />
                    </div>
                  ) : (
                    <span>{column.label}</span>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {processedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumnsArray.length}
                  className="text-center h-48"
                >
                  {searchTerm
                    ? "No users found matching your search"
                    : "No users found"}
                </TableCell>
              </TableRow>
            ) : (
              processedData.map((user) => (
                <TableRow key={user.id}>
                  {visibleColumnsArray.map((column, index) => (
                    <TableCell
                      key={column.key}
                      className={`py-3 ${
                        index === 0
                          ? "pl-6"
                          : index === visibleColumnsArray.length - 1
                            ? "pr-6"
                            : ""
                      } ${column.type === "date" ? "text-center" : ""}`}
                    >
                      {column.key === "name" ? (
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarImage src={user.image} alt={user.name} />
                            <AvatarFallback>
                              {getUserInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.name}</div>
                          </div>
                        </div>
                      ) : column.key === "email" ? (
                        <span className="text-sm">{user.email}</span>
                      ) : column.key === "roleManagement" ? (
                        <UserRoleDropdown
                          userId={user.id}
                          currentRole={user.role}
                          onRoleChange={onRoleUpdate}
                        />
                      ) : column.key === "actions" ? (
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            View Profile
                          </Button>
                        </div>
                      ) : column.key === "createdAt" ? (
                        formatCellValue(user.createdAt, "date")
                      ) : (
                        formatCellValue(
                          user[column.key as keyof AdminUserTableRow],
                        )
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Summary */}
        <div className="flex items-center justify-between pt-4 px-6">
          <div className="text-xs text-muted-foreground">
            Showing {processedData.length} of {users.length} users
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
