"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "ui/button";
import { Input } from "ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "ui/avatar";
import { Checkbox } from "ui/checkbox";
import { Badge } from "ui/badge";
import { ScrollArea } from "ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "ui/dropdown-menu";
import { Search, Users, Crown, Check, X, ChevronDown } from "lucide-react";

import { AdminAgentTableRow, User } from "@/types/admin";

interface AgentPermissionDropdownProps {
  agent: AdminAgentTableRow;
  onUpdate?: (userIds: string[], visibility: string) => Promise<void>;
  disabled?: boolean;
}

export function AgentPermissionDropdown({
  agent,
  onUpdate,
  disabled = false,
}: AgentPermissionDropdownProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Local state for optimistic updates
  const [localVisibility, setLocalVisibility] = useState<
    "private" | "admin-all" | "admin-selective"
  >(
    agent.visibility === "readonly" || agent.visibility === "public"
      ? "private"
      : agent.visibility,
  );
  const [localSelectedUserIds, setLocalSelectedUserIds] = useState<string[]>(
    agent.permissions.map((p) => p.userId),
  );

  useEffect(() => {
    // Map visibility to only allowed local states
    const mappedVisibility =
      agent.visibility === "readonly" || agent.visibility === "public"
        ? "private"
        : agent.visibility;
    setLocalVisibility(mappedVisibility);
    setLocalSelectedUserIds(agent.permissions.map((p) => p.userId));
  }, [agent.visibility, agent.permissions]);

  useEffect(() => {
    if (isOpen && users.length === 0) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/agent-permissions");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;

    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query),
    );
  }, [users, searchQuery]);

  const handleVisibilityChange = async (
    newVisibility: "private" | "admin-all" | "admin-selective" | "admin-all",
  ) => {
    if (disabled || isUpdating) return;

    // Optimistic update
    const prevVisibility = localVisibility;
    const prevSelectedUserIds = localSelectedUserIds;

    setLocalVisibility(newVisibility);

    // Clear selections for non-selective modes
    if (newVisibility !== "admin-selective") {
      setLocalSelectedUserIds([]);
    }

    if (onUpdate) {
      setIsUpdating(true);
      try {
        const userIds =
          newVisibility === "admin-selective" ? localSelectedUserIds : [];
        await onUpdate(userIds, newVisibility);
      } catch (error) {
        // Rollback on error
        setLocalVisibility(prevVisibility);
        setLocalSelectedUserIds(prevSelectedUserIds);
        console.error("Failed to update permissions:", error);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleUserToggle = async (userId: string) => {
    if (disabled || isUpdating || localVisibility !== "admin-selective") return;

    const isSelected = localSelectedUserIds.includes(userId);
    const newSelectedUserIds = isSelected
      ? localSelectedUserIds.filter((id) => id !== userId)
      : [...localSelectedUserIds, userId];

    // Optimistic update
    setLocalSelectedUserIds(newSelectedUserIds);

    if (onUpdate) {
      setIsUpdating(true);
      try {
        await onUpdate(newSelectedUserIds, "admin-selective");
      } catch (error) {
        // Rollback on error
        setLocalSelectedUserIds(localSelectedUserIds);
        console.error("Failed to update permissions:", error);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleSelectAll = async () => {
    if (disabled || isUpdating || localVisibility !== "admin-selective") return;

    const newSelectedUserIds =
      localSelectedUserIds.length === filteredUsers.length
        ? []
        : filteredUsers.map((user) => user.id);

    // Optimistic update
    setLocalSelectedUserIds(newSelectedUserIds);

    if (onUpdate) {
      setIsUpdating(true);
      try {
        await onUpdate(newSelectedUserIds, "admin-selective");
      } catch (error) {
        // Rollback on error
        setLocalSelectedUserIds(localSelectedUserIds);
        console.error("Failed to update permissions:", error);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Display summary based on visibility type
  const getPermissionSummary = () => {
    switch (localVisibility) {
      case "private":
        return "Private";
      case "admin-all":
        return "All Users";
      case "admin-selective":
        const count = localSelectedUserIds.length;
        return count === 0
          ? "No Users"
          : `${count} User${count === 1 ? "" : "s"}`;
      case "admin-all":
        return "All Users"; // Legacy support
      default:
        return "Unknown";
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="justify-between min-w-[120px]"
          disabled={disabled || isUpdating}
        >
          <span className="truncate">{getPermissionSummary()}</span>
          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Users className="size-4" />
          Agent Permissions
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Visibility Type Selection */}
        <div className="p-2">
          <div className="text-sm font-medium mb-2">Visibility</div>
          <DropdownMenuRadioGroup
            value={localVisibility}
            onValueChange={(value) =>
              handleVisibilityChange(
                value as
                  | "private"
                  | "admin-all"
                  | "admin-selective"
                  | "admin-all",
              )
            }
          >
            <DropdownMenuRadioItem value="private" disabled={isUpdating}>
              Private (Agent owner only)
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="admin-all" disabled={isUpdating}>
              All Users (Everyone can use)
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem
              value="admin-selective"
              disabled={isUpdating}
            >
              Selected Users (Choose specific users)
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </div>

        {/* User Selection (only for admin-selective) */}
        {localVisibility === "admin-selective" && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-8"
                    disabled={disabled || isUpdating}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={
                    disabled || isUpdating || filteredUsers.length === 0
                  }
                  className="text-xs px-2 py-1 h-8"
                >
                  {localSelectedUserIds.length === filteredUsers.length ? (
                    <>
                      <X className="size-3 mr-1" />
                      Clear
                    </>
                  ) : (
                    <>
                      <Check className="size-3 mr-1" />
                      All
                    </>
                  )}
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Loading users...
                </div>
              ) : (
                <ScrollArea className="h-48">
                  <div className="space-y-1">
                    {filteredUsers.map((user) => {
                      const isSelected = localSelectedUserIds.includes(user.id);
                      return (
                        <div
                          key={user.id}
                          className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          } ${disabled || isUpdating ? "opacity-50 cursor-not-allowed" : ""}`}
                          onClick={() => handleUserToggle(user.id)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleUserToggle(user.id)}
                            disabled={disabled || isUpdating}
                            className="pointer-events-none"
                          />

                          <Avatar className="size-6">
                            <AvatarImage src={user.image} alt={user.name} />
                            <AvatarFallback className="text-xs">
                              {getUserInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-sm truncate">
                                {user.name}
                              </span>
                              {user.role === "admin" && (
                                <Badge
                                  variant="outline"
                                  className="text-xs px-1 py-0"
                                >
                                  <Crown className="size-2 mr-0.5" />
                                  Admin
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </div>
                          </div>

                          {isSelected && (
                            <div className="size-4 rounded-full bg-primary flex items-center justify-center">
                              <Check className="size-3 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {filteredUsers.length === 0 && (
                      <div className="text-center py-4">
                        <Users className="size-8 text-muted-foreground mx-auto mb-2" />
                        <div className="text-sm text-muted-foreground">
                          {searchQuery
                            ? "No users found matching your search"
                            : "No users available"}
                        </div>
                        {searchQuery && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSearchQuery("")}
                            className="mt-2 text-xs"
                          >
                            Clear search
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}

              {localSelectedUserIds.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground text-center">
                  {localSelectedUserIds.length} user
                  {localSelectedUserIds.length === 1 ? "" : "s"} selected
                </div>
              )}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
