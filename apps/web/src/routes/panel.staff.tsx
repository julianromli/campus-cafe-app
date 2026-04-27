import { api } from "@campus-cafe/backend/convex/_generated/api";
import { Badge } from "@campus-cafe/ui/components/badge";
import { Button } from "@campus-cafe/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@campus-cafe/ui/components/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@campus-cafe/ui/components/dropdown-menu";
import { Input } from "@campus-cafe/ui/components/input";
import { Label } from "@campus-cafe/ui/components/label";
import { Skeleton } from "@campus-cafe/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@campus-cafe/ui/components/table";
import { useMutation, useQuery } from "convex/react";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import ConfirmDialog from "@/components/confirm-dialog";

function formatJoined(createdAt: number) {
	return new Intl.DateTimeFormat("id-ID", {
		dateStyle: "medium",
	}).format(new Date(createdAt));
}

function roleBadgeVariant(
	role: "admin" | "customer" | "staff",
): "default" | "secondary" {
	return role === "admin" ? "default" : "secondary";
}

export default function PanelStaffPage() {
	const me = useQuery(api.users.getMe);
	const staffList = useQuery(api.users.listStaff);
	const setRole = useMutation(api.users.setRole);
	const revokeAccess = useMutation(api.users.revokeAccess);

	const [promoteEmail, setPromoteEmail] = useState("");
	const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
	const findResult = useQuery(
		api.users.findByEmail,
		submittedEmail !== null && submittedEmail.length > 0
			? { email: submittedEmail }
			: "skip",
	);

	const [revokeUserId, setRevokeUserId] = useState<string | null>(null);
	const [pendingRevoke, setPendingRevoke] = useState(false);
	const [roleChangePendingId, setRoleChangePendingId] = useState<string | null>(
		null,
	);

	const revokeTarget = revokeUserId
		? staffList?.find((row) => row._id === revokeUserId)
		: null;

	return (
		<div className="grid gap-8">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">Staff</h1>
				<p className="text-muted-foreground text-sm">
					Kelola akses staff dan admin, atau promosi pengguna yang sudah
					terdaftar.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Promosi berdasarkan email</CardTitle>
					<CardDescription>
						Cari pengguna yang sudah punya akun, lalu naikkan ke Staff atau
						Admin.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
					<div className="grid flex-1 gap-2">
						<Label htmlFor="promote-email">Email</Label>
						<Input
							id="promote-email"
							placeholder="nama@email.com"
							type="email"
							value={promoteEmail}
							onChange={(e) => setPromoteEmail(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									setSubmittedEmail(promoteEmail.trim());
								}
							}}
						/>
					</div>
					<Button
						type="button"
						onClick={() => {
							setSubmittedEmail(promoteEmail.trim());
						}}
					>
						Cari
					</Button>
				</CardContent>
				{submittedEmail && submittedEmail.length > 0 ? (
					<CardContent className="border-border border-t pt-4">
						{findResult === undefined ? (
							<p className="text-muted-foreground text-sm">Mencari…</p>
						) : findResult === null ? (
							<p className="text-muted-foreground text-sm">
								Pengguna dengan email ini tidak ditemukan. Minta mereka untuk
								mendaftar dulu.
							</p>
						) : findResult.role === "staff" || findResult.role === "admin" ? (
							<div className="flex flex-wrap items-center gap-3">
								<div>
									<p className="font-medium text-foreground">
										{findResult.name}
									</p>
									<p className="text-muted-foreground text-sm">
										{findResult.email}
									</p>
								</div>
								<Badge
									variant={roleBadgeVariant(findResult.role)}
									className="capitalize"
								>
									{findResult.role}
								</Badge>
								<Button disabled type="button" variant="outline">
									Sudah memiliki akses
								</Button>
							</div>
						) : (
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<p className="font-medium text-foreground">
										{findResult.name}
									</p>
									<p className="text-muted-foreground text-sm">
										{findResult.email}
									</p>
								</div>
								<div className="flex flex-wrap gap-2">
									<Button
										type="button"
										variant="outline"
										onClick={async () => {
											try {
												await setRole({
													role: "staff",
													userId: findResult._id,
												});
												toast.success("Pengguna dipromosikan menjadi Staff");
												setPromoteEmail("");
												setSubmittedEmail(null);
											} catch (error) {
												toast.error(
													error instanceof Error
														? error.message
														: "Gagal mengubah role",
												);
											}
										}}
									>
										Promote to Staff
									</Button>
									<Button
										type="button"
										onClick={async () => {
											try {
												await setRole({
													role: "admin",
													userId: findResult._id,
												});
												toast.success("Pengguna dipromosikan menjadi Admin");
												setPromoteEmail("");
												setSubmittedEmail(null);
											} catch (error) {
												toast.error(
													error instanceof Error
														? error.message
														: "Gagal mengubah role",
												);
											}
										}}
									>
										Promote to Admin
									</Button>
								</div>
							</div>
						)}
					</CardContent>
				) : null}
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Staff &amp; Admin</CardTitle>
					<CardDescription>
						Semua akun dengan role staff atau admin.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{staffList === undefined ? (
						<div className="grid gap-2">
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
						</div>
					) : staffList.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Belum ada staff terdaftar.
						</p>
					) : (
						<div className="-mx-1 max-w-[100vw] overflow-x-auto px-1 md:mx-0">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead>Email</TableHead>
										<TableHead>Role</TableHead>
										<TableHead>Joined</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{staffList.map((row) => {
										const isSelf =
											me !== undefined && me !== null && row._id === me._id;
										const isPending = roleChangePendingId === row._id;
										return (
											<TableRow key={row._id}>
												<TableCell className="font-medium">
													{row.name}
												</TableCell>
												<TableCell className="text-muted-foreground">
													{row.email}
												</TableCell>
												<TableCell>
													<Badge
														variant={roleBadgeVariant(row.role)}
														className="capitalize"
													>
														{row.role}
													</Badge>
												</TableCell>
												<TableCell className="text-muted-foreground">
													{formatJoined(row.createdAt)}
												</TableCell>
												<TableCell className="text-right">
													{isSelf ? (
														<span className="text-muted-foreground text-xs">
															Tidak dapat mengubah role sendiri
														</span>
													) : (
														<div className="flex justify-end gap-2">
															<DropdownMenu>
																<DropdownMenuTrigger
																	render={
																		<Button
																			disabled={isPending}
																			size="sm"
																			variant="outline"
																		/>
																	}
																>
																	Change role
																	<ChevronDownIcon className="ml-1 size-4 opacity-60" />
																</DropdownMenuTrigger>
																<DropdownMenuContent
																	align="end"
																	className="bg-card"
																>
																	<DropdownMenuItem
																		disabled={row.role === "staff"}
																		onClick={async () => {
																			setRoleChangePendingId(row._id);
																			try {
																				await setRole({
																					role: "staff",
																					userId: row._id,
																				});
																				toast.success(
																					"Role diubah menjadi Staff",
																				);
																			} catch (error) {
																				toast.error(
																					error instanceof Error
																						? error.message
																						: "Gagal mengubah role",
																				);
																			} finally {
																				setRoleChangePendingId(null);
																			}
																		}}
																	>
																		Staff
																	</DropdownMenuItem>
																	<DropdownMenuItem
																		disabled={row.role === "admin"}
																		onClick={async () => {
																			setRoleChangePendingId(row._id);
																			try {
																				await setRole({
																					role: "admin",
																					userId: row._id,
																				});
																				toast.success(
																					"Role diubah menjadi Admin",
																				);
																			} catch (error) {
																				toast.error(
																					error instanceof Error
																						? error.message
																						: "Gagal mengubah role",
																				);
																			} finally {
																				setRoleChangePendingId(null);
																			}
																		}}
																	>
																		Admin
																	</DropdownMenuItem>
																</DropdownMenuContent>
															</DropdownMenu>
															<Button
																disabled={isPending}
																size="sm"
																variant="destructive"
																onClick={() => setRevokeUserId(row._id)}
															>
																Revoke access
															</Button>
														</div>
													)}
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			<ConfirmDialog
				confirmLabel="Revoke access"
				description="Akses akan diturunkan menjadi customer biasa."
				open={revokeTarget !== null}
				pending={pendingRevoke}
				title="Cabut akses staff?"
				onConfirm={async () => {
					if (!revokeTarget) {
						return;
					}
					setPendingRevoke(true);
					try {
						await revokeAccess({ userId: revokeTarget._id });
						toast.success("Akses dicabut");
						setRevokeUserId(null);
					} catch (error) {
						toast.error(
							error instanceof Error ? error.message : "Gagal mencabut akses",
						);
					} finally {
						setPendingRevoke(false);
					}
				}}
				onOpenChange={(open) => {
					if (!open) {
						setRevokeUserId(null);
						setPendingRevoke(false);
					}
				}}
			/>
		</div>
	);
}
