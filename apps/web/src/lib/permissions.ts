export type PanelRole = "admin" | "staff";

export const PERMISSIONS = {
	dashboard: { read: ["admin", "staff"], write: ["admin"] },
	tables: { read: ["admin", "staff"], write: ["admin"] },
	events: { read: ["admin", "staff"], write: ["admin"] },
	menu: { read: ["admin", "staff"], write: ["admin"] },
	orders: { read: ["admin", "staff"], write: ["admin", "staff"] },
	reservations: { read: ["admin", "staff"], write: ["admin", "staff"] },
	payments: { read: ["admin", "staff"], write: ["admin"] },
	staff: { read: ["admin"], write: ["admin"] },
} as const;

export type Feature = keyof typeof PERMISSIONS;

export function canWrite(role: PanelRole, feature: Feature): boolean {
	return (PERMISSIONS[feature].write as readonly PanelRole[]).includes(role);
}

export function canRead(role: PanelRole, feature: Feature): boolean {
	return (PERMISSIONS[feature].read as readonly PanelRole[]).includes(role);
}
