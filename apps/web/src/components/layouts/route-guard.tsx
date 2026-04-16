import { api } from "@campus-cafe/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";

import Loader from "@/components/loader";

type Role = "customer" | "staff" | "admin";

type RouteGuardProps = {
  allowedRoles?: Role[];
  children: ReactNode;
};

export default function RouteGuard({ allowedRoles, children }: RouteGuardProps) {
  const location = useLocation();
  const user = useQuery(api.users.getMe);

  if (user === undefined) {
    return <Loader />;
  }

  if (!user) {
    const redirectTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/sign-in?redirect=${encodeURIComponent(redirectTo)}`} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
