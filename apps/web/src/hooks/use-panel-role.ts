import { api } from "@campus-cafe/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import type { PanelRole } from "@/lib/permissions";

export function usePanelRole(): PanelRole | null {
	const user = useQuery(api.users.getMe);
	if (!user || user.role === "customer") return null;
	return user.role as PanelRole;
}
