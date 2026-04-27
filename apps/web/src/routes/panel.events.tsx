import { api } from "@campus-cafe/backend/convex/_generated/api";
import type { Doc, Id } from "@campus-cafe/backend/convex/_generated/dataModel";
import { Button } from "@campus-cafe/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@campus-cafe/ui/components/card";
import { Input } from "@campus-cafe/ui/components/input";
import { Label } from "@campus-cafe/ui/components/label";
import { useMutation, useQuery } from "convex/react";
import { PlusIcon, TrashIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { usePanelRole } from "@/hooks/use-panel-role";
import { canWrite } from "@/lib/permissions";

function toDatetimeLocalValue(ms: number): string {
	const d = new Date(ms);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): number {
	return new Date(value).getTime();
}

type FormState = {
	category: string;
	coverImage: string;
	description: string;
	endLocal: string;
	externalUrl: string;
	locationText: string;
	organizerName: string;
	startLocal: string;
	status: "draft" | "published";
	title: string;
};

function emptyForm(now: number): FormState {
	const end = now + 2 * 60 * 60 * 1000;
	return {
		category: "Meetup",
		coverImage: "",
		description: "",
		endLocal: toDatetimeLocalValue(end),
		externalUrl: "",
		locationText: "Campus Cafe",
		organizerName: "",
		startLocal: toDatetimeLocalValue(now),
		status: "draft",
		title: "",
	};
}

function fromDoc(doc: Doc<"events">): FormState {
	return {
		category: doc.category,
		coverImage: doc.coverImage ?? "",
		description: doc.description,
		endLocal: toDatetimeLocalValue(doc.endTime),
		externalUrl: doc.externalUrl ?? "",
		locationText: doc.locationText ?? "",
		organizerName: doc.organizerName ?? "",
		startLocal: toDatetimeLocalValue(doc.startTime),
		status: doc.status,
		title: doc.title,
	};
}

export default function PanelEventsPage() {
	const role = usePanelRole();
	const canModify = role ? canWrite(role, "events") : false;

	const events = useQuery(api.events.listAllAdmin);
	const createEvent = useMutation(api.events.create);
	const updateEvent = useMutation(api.events.update);
	const removeEvent = useMutation(api.events.remove);
	const publishEvent = useMutation(api.events.publish);
	const unpublishEvent = useMutation(api.events.unpublish);

	const now = useMemo(() => Date.now(), []);
	const [mode, setMode] = useState<"create" | "edit">("create");
	const [editingId, setEditingId] = useState<Id<"events"> | undefined>(
		undefined,
	);
	const [form, setForm] = useState<FormState>(() => emptyForm(now));
	const [submitting, setSubmitting] = useState(false);

	const resetCreate = () => {
		setMode("create");
		setEditingId(undefined);
		setForm(emptyForm(Date.now()));
	};

	const loadEdit = (doc: Doc<"events">) => {
		setMode("edit");
		setEditingId(doc._id);
		setForm(fromDoc(doc));
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setSubmitting(true);
		try {
			const startTime = fromDatetimeLocalValue(form.startLocal);
			const endTime = fromDatetimeLocalValue(form.endLocal);
			if (endTime <= startTime) {
				toast.error("Waktu selesai harus setelah waktu mulai.");
				return;
			}

			if (mode === "create") {
				const id = await createEvent({
					category: form.category,
					coverImage: form.coverImage.trim() || undefined,
					description: form.description,
					endTime,
					externalUrl: form.externalUrl.trim() || undefined,
					locationText: form.locationText.trim() || undefined,
					organizerName: form.organizerName.trim() || undefined,
					startTime,
					status: form.status,
					title: form.title,
				});
				toast.success("Event dibuat.");
				setMode("edit");
				setEditingId(id);
			} else if (editingId) {
				await updateEvent({
					category: form.category,
					coverImage: form.coverImage.trim() ? form.coverImage.trim() : null,
					description: form.description,
					endTime,
					externalUrl: form.externalUrl.trim() ? form.externalUrl.trim() : null,
					id: editingId,
					locationText: form.locationText.trim()
						? form.locationText.trim()
						: null,
					organizerName: form.organizerName.trim()
						? form.organizerName.trim()
						: null,
					startTime,
					status: form.status,
					title: form.title,
				});
				toast.success("Event diperbarui.");
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Gagal menyimpan event.";
			toast.error(message);
		} finally {
			setSubmitting(false);
		}
	};

	const handleDelete = async (id: Id<"events">) => {
		if (!confirm("Hapus event ini?")) {
			return;
		}
		setSubmitting(true);
		try {
			await removeEvent({ id });
			toast.success("Event dihapus.");
			if (editingId === id) {
				resetCreate();
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Gagal menghapus.";
			toast.error(message);
		} finally {
			setSubmitting(false);
		}
	};

	const handlePublishToggle = async (doc: Doc<"events">) => {
		setSubmitting(true);
		try {
			if (doc.status === "published") {
				await unpublishEvent({ id: doc._id });
				toast.success("Event di-unpublish.");
			} else {
				await publishEvent({ id: doc._id });
				toast.success("Event dipublikasikan.");
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Gagal mengubah status.";
			toast.error(message);
		} finally {
			setSubmitting(false);
		}
	};

	if (events === undefined) {
		return <p className="text-muted-foreground text-sm">Memuat event…</p>;
	}

	return (
		<div className="flex flex-col gap-8">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">Kelola event</h1>
				<p className="text-muted-foreground text-sm">
					Listing informatif + link halaman resmi. Publish membutuhkan URL{" "}
					<code className="text-xs">https://</code> yang valid.
				</p>
			</div>

			<div className="grid gap-8 lg:grid-cols-[1fr_380px]">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between gap-2">
						<div>
							<CardTitle className="text-base">Daftar event</CardTitle>
							<CardDescription>Draft dan published.</CardDescription>
						</div>
						<Button
							size="sm"
							type="button"
							onClick={() => {
								resetCreate();
							}}
							disabled={!canModify}
							title={
								!canModify ? "Hanya admin yang dapat melakukan ini" : undefined
							}
						>
							<PlusIcon data-icon="inline-start" />
							Baru
						</Button>
					</CardHeader>
					<CardContent className="flex flex-col gap-2">
						{events.length === 0 ? (
							<p className="text-muted-foreground text-sm">Belum ada event.</p>
						) : (
							<ul className="divide-y divide-border rounded-md border border-border">
								{events.map((doc) => (
									<li
										key={doc._id}
										className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
									>
										<button
											type="button"
											className="min-w-0 flex-1 text-left"
											onClick={() => {
												loadEdit(doc);
											}}
										>
											<p className="truncate font-medium">{doc.title}</p>
											<p className="truncate text-muted-foreground text-xs">
												{doc.status === "published" ? "Published" : "Draft"} ·{" "}
												{doc.category}
												{doc.externalUrl ? ` · ${doc.externalUrl}` : ""}
											</p>
										</button>
										<div className="flex shrink-0 flex-wrap gap-2">
											<Button
												size="sm"
												variant="outline"
												type="button"
												disabled={submitting || !canModify}
												title={
													!canModify
														? "Hanya admin yang dapat melakukan ini"
														: undefined
												}
												onClick={() => {
													void handlePublishToggle(doc);
												}}
											>
												{doc.status === "published" ? "Unpublish" : "Publish"}
											</Button>
											<Button
												size="icon-sm"
												variant="destructive"
												type="button"
												disabled={submitting || !canModify}
												title={
													!canModify
														? "Hanya admin yang dapat melakukan ini"
														: undefined
												}
												aria-label="Hapus event"
												onClick={() => {
													void handleDelete(doc._id);
												}}
											>
												<TrashIcon />
											</Button>
										</div>
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							{mode === "create" ? "Buat event" : "Edit event"}
						</CardTitle>
						<CardDescription>
							{mode === "edit" && editingId
								? `ID: ${editingId}`
								: "Isi detail dan link resmi."}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form
							className="flex flex-col gap-4"
							onSubmit={(e) => void handleSubmit(e)}
						>
							<div className="flex flex-col gap-2">
								<Label htmlFor="title">Judul</Label>
								<Input
									id="title"
									value={form.title}
									onChange={(e) => {
										setForm((f) => ({ ...f, title: e.target.value }));
									}}
									disabled={!canModify}
									required
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="category">Kategori</Label>
								<Input
									id="category"
									value={form.category}
									onChange={(e) => {
										setForm((f) => ({ ...f, category: e.target.value }));
									}}
									disabled={!canModify}
									required
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="description">Deskripsi</Label>
								<textarea
									id="description"
									className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									value={form.description}
									onChange={(e) => {
										setForm((f) => ({ ...f, description: e.target.value }));
									}}
									disabled={!canModify}
									required
								/>
							</div>
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="flex flex-col gap-2">
									<Label htmlFor="start">Mulai</Label>
									<Input
										id="start"
										type="datetime-local"
										value={form.startLocal}
										onChange={(e) => {
											setForm((f) => ({ ...f, startLocal: e.target.value }));
										}}
										disabled={!canModify}
										required
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label htmlFor="end">Selesai</Label>
									<Input
										id="end"
										type="datetime-local"
										value={form.endLocal}
										onChange={(e) => {
											setForm((f) => ({ ...f, endLocal: e.target.value }));
										}}
										disabled={!canModify}
										required
									/>
								</div>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="externalUrl">Link halaman resmi (https)</Label>
								<Input
									id="externalUrl"
									type="url"
									placeholder="https://"
									value={form.externalUrl}
									onChange={(e) => {
										setForm((f) => ({ ...f, externalUrl: e.target.value }));
									}}
									disabled={!canModify}
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="coverImage">Cover image URL (opsional)</Label>
								<Input
									id="coverImage"
									type="url"
									value={form.coverImage}
									onChange={(e) => {
										setForm((f) => ({ ...f, coverImage: e.target.value }));
									}}
									disabled={!canModify}
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="organizerName">Penyelenggara (opsional)</Label>
								<Input
									id="organizerName"
									value={form.organizerName}
									onChange={(e) => {
										setForm((f) => ({ ...f, organizerName: e.target.value }));
									}}
									disabled={!canModify}
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="locationText">Lokasi teks (opsional)</Label>
								<Input
									id="locationText"
									value={form.locationText}
									onChange={(e) => {
										setForm((f) => ({ ...f, locationText: e.target.value }));
									}}
									disabled={!canModify}
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="status">Status</Label>
								<select
									id="status"
									className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
									value={form.status}
									onChange={(e) => {
										setForm((f) => ({
											...f,
											status:
												e.target.value === "published" ? "published" : "draft",
										}));
									}}
									disabled={!canModify}
								>
									<option value="draft">Draft</option>
									<option value="published">Published</option>
								</select>
							</div>
							<Button
								type="submit"
								className="w-full"
								disabled={submitting || !canModify}
							>
								{mode === "create" ? "Simpan event" : "Perbarui event"}
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
