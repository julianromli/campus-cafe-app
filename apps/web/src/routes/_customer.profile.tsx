import { api } from "@campus-cafe/backend/convex/_generated/api";
import type { Id } from "@campus-cafe/backend/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@campus-cafe/ui/components/avatar";
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
	Field,
	FieldContent,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@campus-cafe/ui/components/field";
import { Input } from "@campus-cafe/ui/components/input";
import { Skeleton } from "@campus-cafe/ui/components/skeleton";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "convex/react";
import { Camera, Mail, User as UserIcon } from "lucide-react";
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
			<div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
				<div className="flex flex-col gap-2">
					<Skeleton className="h-10 w-48" />
					<Skeleton className="h-5 w-64" />
				</div>
				<Skeleton className="h-[400px] w-full rounded-[2.5rem]" />
			</div>
		);
	}

	if (!user) {
		return (
			<div className="mx-auto w-full max-w-2xl">
				<Card className="rounded-[2.5rem] border-none bg-muted/30 p-8 text-center shadow-none">
					<div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-background">
						<UserIcon className="size-8 text-muted-foreground" />
					</div>
					<CardTitle className="text-xl">Not signed in</CardTitle>
					<CardDescription className="mt-2">
						Please sign in to view and manage your profile.
					</CardDescription>
				</Card>
			</div>
		);
	}

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-8 pb-8">
			<div className="flex flex-col gap-1">
				<h1 className="font-heading text-3xl font-semibold tracking-tight">
					My Profile
				</h1>
				<p className="text-muted-foreground">
					Manage your account settings
				</p>
			</div>

			<div className="flex flex-col gap-6">
				{/* Avatar & Account Details Combined */}
				<Card className="overflow-hidden rounded-[2rem] border-none bg-muted/30 shadow-none">
					<CardContent className="p-6 sm:p-8">
						<div className="flex flex-col gap-8 sm:flex-row sm:items-center">
							<div className="relative group">
								<Avatar className="size-28 border-4 border-background shadow-sm sm:size-32">
									<AvatarImage src={user.avatarUrl || ""} />
									<AvatarFallback className="bg-primary/10 text-3xl font-medium text-primary">
										{getInitials(user.name)}
									</AvatarFallback>
								</Avatar>
								<div 
									className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
									onClick={() => fileInputRef.current?.click()}
								>
									<Camera className="size-8 text-white" />
								</div>
								{/* Mobile upload button - visible without hover */}
								<Button 
									size="icon" 
									className="absolute bottom-0 right-0 rounded-full border-4 border-background sm:hidden"
									onClick={() => fileInputRef.current?.click()}
									disabled={avatarPending}
								>
									<Camera className="size-4" />
								</Button>
							</div>

							<div className="flex flex-1 flex-col gap-2">
								<div className="flex items-center gap-2">
									<h2 className="text-2xl font-semibold tracking-tight">{user.name}</h2>
									<Badge variant="secondary" className="bg-background font-medium text-xs capitalize">
										{getRoleLabel(user.role)}
									</Badge>
								</div>
								
								<div className="flex items-center gap-2 text-muted-foreground">
									<Mail className="size-4" />
									<span>{user.email}</span>
								</div>

								<div className="mt-2 flex flex-wrap gap-2">
									<input
										ref={fileInputRef}
										accept="image/*"
										className="hidden"
										type="file"
										onChange={async (event) => {
											const file = event.target.files?.[0];
											event.target.value = "";
											if (!file) return;
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
												if (!uploadResponse.ok) throw new Error("Upload failed");
												const json = (await uploadResponse.json()) as { storageId?: string };
												if (!json.storageId) throw new Error("Missing storage id from upload");
												
												await updateProfile({
													avatarStorageId: json.storageId as Id<"_storage">,
												});
												toast.success("Avatar updated");
											} catch (error) {
												toast.error(error instanceof Error ? error.message : "Failed to upload avatar");
											} finally {
												setAvatarPending(false);
											}
										}}
									/>
									<Button
										disabled={avatarPending}
										type="button"
										variant="outline"
										size="sm"
										className="hidden rounded-full bg-background hover:bg-muted sm:flex"
										onClick={() => fileInputRef.current?.click()}
									>
										{avatarPending ? "Uploading…" : "Change Photo"}
									</Button>
									{(user.avatarStorageId ?? user.avatarUrl) ? (
										<Button
											disabled={avatarPending}
											type="button"
											variant="ghost"
											size="sm"
											className="rounded-full text-destructive hover:bg-destructive/10"
											onClick={async () => {
												setAvatarPending(true);
												try {
													await updateProfile({ avatarStorageId: null });
													toast.success("Avatar removed");
												} catch (error) {
													toast.error(error instanceof Error ? error.message : "Failed to remove avatar");
												} finally {
													setAvatarPending(false);
												}
											}}
										>
											Remove
										</Button>
									) : null}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Personal Info Form */}
				<Card className="rounded-[2rem] border-none bg-muted/30 shadow-none">
					<CardHeader className="px-6 pb-2 pt-6 sm:px-8 sm:pt-8">
						<CardTitle className="text-lg">Personal Information</CardTitle>
						<CardDescription>Update your contact details</CardDescription>
					</CardHeader>
					<CardContent className="p-6 pt-0 sm:p-8 sm:pt-0">
						<form
							className="flex flex-col gap-6"
							onSubmit={(e) => {
								e.preventDefault();
								e.stopPropagation();
								void form.handleSubmit();
							}}
						>
							<FieldGroup className="gap-5">
								<form.Field name="name">
									{(field) => {
										const invalid = field.state.meta.errors.length > 0;
										return (
											<Field data-invalid={invalid || undefined}>
												<FieldLabel htmlFor={field.name}>Display Name</FieldLabel>
												<FieldContent>
													<Input
														className="h-12 rounded-xl bg-background"
														defaultValue={user.name}
														id={field.name}
														name={field.name}
														value={field.state.value}
														aria-invalid={invalid}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
													/>
													<FieldError errors={field.state.meta.errors} />
												</FieldContent>
											</Field>
										);
									}}
								</form.Field>

								<form.Field name="phone">
									{(field) => (
										<Field>
											<FieldLabel htmlFor={field.name}>Phone Number</FieldLabel>
											<FieldContent>
												<Input
													className="h-12 rounded-xl bg-background"
													id={field.name}
													name={field.name}
													placeholder="+62 812 3456 7890"
													type="tel"
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
												/>
											</FieldContent>
										</Field>
									)}
								</form.Field>
							</FieldGroup>

							<form.Subscribe
								selector={(state) => ({
									canSubmit: state.canSubmit,
									isSubmitting: state.isSubmitting,
								})}
							>
								{({ canSubmit, isSubmitting }) => (
									<Button 
										disabled={!canSubmit || isSubmitting} 
										type="submit"
										size="lg"
										className="w-full self-end rounded-xl sm:w-auto"
									>
										{isSubmitting ? "Saving changes…" : "Save changes"}
									</Button>
								)}
							</form.Subscribe>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
