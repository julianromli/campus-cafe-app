import { api } from "@campus-cafe/backend/convex/_generated/api";
import type { Id } from "@campus-cafe/backend/convex/_generated/dataModel";
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
import { Skeleton } from "@campus-cafe/ui/components/skeleton";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import z from "zod";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

function getInitials(name: string) {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) {
		return "?";
	}
	if (parts.length === 1) {
		return parts[0].slice(0, 2).toUpperCase();
	}
	return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getRoleLabel(role: "admin" | "customer" | "staff") {
	switch (role) {
		case "admin":
			return "Admin";
		case "staff":
			return "Staff";
		default:
			return "Customer";
	}
}

export default function ProfilePage() {
	const user = useQuery(api.users.getMe);
	const generateAvatarUploadUrl = useMutation(
		api.users.generateAvatarUploadUrl,
	);
	const updateProfile = useMutation(api.users.updateProfile);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [avatarPending, setAvatarPending] = useState(false);

	const form = useForm({
		defaultValues: {
			name: "",
			phone: "",
		},
		onSubmit: async ({ value }) => {
			const phoneNormalized = value.phone.replace(/[^\d+]/g, "").trim();
			try {
				await updateProfile({
					name: value.name,
					phone: phoneNormalized.length > 0 ? phoneNormalized : undefined,
				});
				toast.success("Profile updated");
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to update profile",
				);
			}
		},
		validators: {
			onSubmit: z.object({
				name: z.string().min(2, "Name must be at least 2 characters"),
				phone: z.string(),
			}),
		},
	});

	useEffect(() => {
		if (!user) {
			return;
		}
		form.setFieldValue("name", user.name);
		form.setFieldValue("phone", user.phone ?? "");
	}, [form, user]);

	if (user === undefined) {
		return (
			<div className="mx-auto grid max-w-2xl gap-6">
				<Skeleton className="h-10 w-48" />
				<Skeleton className="h-40 w-full" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	if (!user) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Profile</CardTitle>
					<CardDescription>Sign in to manage your profile.</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<div className="mx-auto grid max-w-2xl gap-6">
			<Card>
				<CardHeader>
					<CardTitle>Profile</CardTitle>
					<CardDescription>
						Update your display name, phone, and avatar.
					</CardDescription>
				</CardHeader>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Account</CardTitle>
					<CardDescription>
						Email and role cannot be changed here.
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-3 text-sm">
					<div>
						<span className="font-medium text-foreground">Email</span>
						<p className="text-muted-foreground">{user.email}</p>
					</div>
					<div>
						<span className="font-medium text-foreground">Role</span>
						<p>
							<span className="inline-flex rounded-full border border-border bg-muted px-2 py-0.5 text-muted-foreground text-xs capitalize">
								{getRoleLabel(user.role)}
							</span>
						</p>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Avatar</CardTitle>
					<CardDescription>Upload a square image (max 2 MB).</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
					<div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted font-semibold text-lg text-muted-foreground">
						{user.avatarUrl ? (
							<img
								alt=""
								className="h-full w-full object-cover"
								src={user.avatarUrl}
							/>
						) : (
							getInitials(user.name)
						)}
					</div>
					<div className="flex flex-wrap gap-2">
						<input
							ref={fileInputRef}
							accept="image/*"
							className="hidden"
							type="file"
							onChange={async (event) => {
								const file = event.target.files?.[0];
								event.target.value = "";
								if (!file) {
									return;
								}
								if (!file.type.startsWith("image/")) {
									toast.error("Please choose an image file");
									return;
								}
								if (file.size > MAX_AVATAR_BYTES) {
									toast.error("Image must be 2 MB or smaller");
									return;
								}

								setAvatarPending(true);
								try {
									const postUrl = await generateAvatarUploadUrl();
									const uploadResponse = await fetch(postUrl, {
										body: file,
										headers: { "Content-Type": file.type },
										method: "POST",
									});
									if (!uploadResponse.ok) {
										throw new Error("Upload failed");
									}
									const json = (await uploadResponse.json()) as {
										storageId?: string;
									};
									if (!json.storageId) {
										throw new Error("Missing storage id from upload");
									}
									await updateProfile({
										avatarStorageId: json.storageId as Id<"_storage">,
									});
									toast.success("Avatar updated");
								} catch (error) {
									toast.error(
										error instanceof Error
											? error.message
											: "Failed to upload avatar",
									);
								} finally {
									setAvatarPending(false);
								}
							}}
						/>
						<Button
							disabled={avatarPending}
							type="button"
							variant="outline"
							onClick={() => fileInputRef.current?.click()}
						>
							{avatarPending ? "Uploading…" : "Upload"}
						</Button>
						{(user.avatarStorageId ?? user.avatarUrl) ? (
							<Button
								disabled={avatarPending}
								type="button"
								variant="ghost"
								onClick={async () => {
									setAvatarPending(true);
									try {
										await updateProfile({ avatarStorageId: null });
										toast.success("Avatar removed");
									} catch (error) {
										toast.error(
											error instanceof Error
												? error.message
												: "Failed to remove avatar",
										);
									} finally {
										setAvatarPending(false);
									}
								}}
							>
								Remove
							</Button>
						) : null}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Details</CardTitle>
				</CardHeader>
				<CardContent>
					<form
						className="grid gap-4"
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							void form.handleSubmit();
						}}
					>
						<form.Field name="name">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>Display name</Label>
									<Input
										defaultValue={user.name}
										id={field.name}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
									{field.state.meta.errors.map((error, index) => (
										<p
											key={`${field.name}-error-${index}`}
											className="text-destructive text-sm"
										>
											{error?.message}
										</p>
									))}
								</div>
							)}
						</form.Field>

						<form.Field name="phone">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>Phone</Label>
									<Input
										id={field.name}
										name={field.name}
										placeholder="Optional"
										type="tel"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
								</div>
							)}
						</form.Field>

						<form.Subscribe
							selector={(state) => ({
								canSubmit: state.canSubmit,
								isSubmitting: state.isSubmitting,
							})}
						>
							{({ canSubmit, isSubmitting }) => (
								<Button disabled={!canSubmit || isSubmitting} type="submit">
									{isSubmitting ? "Saving…" : "Save changes"}
								</Button>
							)}
						</form.Subscribe>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
