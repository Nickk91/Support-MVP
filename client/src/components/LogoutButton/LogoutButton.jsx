// src/components/LogoutButton/LogoutButton.jsx - WITH USER INFO
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function LogoutButton() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div
      role="group"
      aria-label="User menu"
      className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:shadow-sm"
    >
      {/* User Info */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <User className="h-4 w-4" />
        <span className="hidden sm:inline">
          {user?.firstName} {user?.lastName}
        </span>
      </div>

      {/* Logout Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className="flex h-auto items-center gap-2 p-0 hover:bg-transparent"
        title="Logout"
      >
        <LogOut className="h-4 w-4" />
        <span className="sr-only">Logout</span>
      </Button>
    </div>
  );
}
