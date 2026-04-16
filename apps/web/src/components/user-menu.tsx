import { Button } from "@campus-cafe/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@campus-cafe/ui/components/dropdown-menu";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router";

import { authClient } from "@/lib/auth-client";
import { api } from "@campus-cafe/backend/convex/_generated/api";

export default function UserMenu() {
  const navigate = useNavigate();
  const user = useQuery(api.users.getMe);

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>{user?.name}</DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card">
        <DropdownMenuGroup>
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>{user?.email}</DropdownMenuItem>
          {user.role === "customer" ? (
            <>
              <DropdownMenuItem onClick={() => navigate("/my-reservations")}>My Reservations</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/my-orders")}>My Orders</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/profile")}>Profile</DropdownMenuItem>
            </>
          ) : null}
          {(user.role === "staff" || user.role === "admin") ? (
            <DropdownMenuItem onClick={() => navigate("/staff/orders")}>Staff Panel</DropdownMenuItem>
          ) : null}
          {user.role === "admin" ? (
            <DropdownMenuItem onClick={() => navigate("/admin/dashboard")}>Admin Panel</DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    navigate("/");
                  },
                },
              });
            }}
          >
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
