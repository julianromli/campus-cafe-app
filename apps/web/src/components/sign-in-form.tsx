import { Button } from "@campus-cafe/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
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
import { useForm } from "@tanstack/react-form";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import z from "zod";

import { authClient, googleAuthEnabled } from "@/lib/auth-client";
import { safeRedirect } from "@/lib/safe-redirect";

type SignInFormProps = {
	onSwitchToSignUp?: () => void;
};

export default function SignInForm({ onSwitchToSignUp }: SignInFormProps) {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const redirectTo = safeRedirect(searchParams.get("redirect"));

	const handleGoogleSignIn = async () => {
		try {
			await authClient.signIn.social({
				callbackURL: redirectTo,
				provider: "google",
			});
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Google sign in failed",
			);
		}
	};

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			await authClient.signIn.email(
				{
					email: value.email,
					password: value.password,
				},
				{
					onSuccess: () => {
						navigate(redirectTo);
						toast.success("Sign in successful");
					},
					onError: (error) => {
						toast.error(error.error.message || error.error.statusText);
					},
				},
			);
		},
		validators: {
			onSubmit: z.object({
				email: z.email("Invalid email address"),
				password: z.string().min(8, "Password must be at least 8 characters"),
			}),
		},
	});

	return (
		<div className="mx-auto mt-10 w-full max-w-md px-4">
			<Card>
				<CardHeader className="text-center">
					<CardTitle className="font-heading text-2xl">Welcome back</CardTitle>
					<CardDescription>
						Sign in to manage reservations, orders, and your profile.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-6">
					{googleAuthEnabled ? (
						<div className="flex flex-col gap-3">
							<Button
								type="button"
								variant="outline"
								className="w-full"
								onClick={handleGoogleSignIn}
							>
								Continue with Google
							</Button>
							<p className="text-center text-muted-foreground text-xs uppercase tracking-[0.2em]">
								or
							</p>
						</div>
					) : null}

					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="contents"
					>
						<FieldGroup className="gap-4">
							<form.Field name="email">
								{(field) => {
									const invalid = field.state.meta.errors.length > 0;
									return (
										<Field data-invalid={invalid || undefined}>
											<FieldLabel htmlFor={field.name}>Email</FieldLabel>
											<FieldContent>
												<Input
													id={field.name}
													name={field.name}
													type="email"
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

							<form.Field name="password">
								{(field) => {
									const invalid = field.state.meta.errors.length > 0;
									return (
										<Field data-invalid={invalid || undefined}>
											<FieldLabel htmlFor={field.name}>Password</FieldLabel>
											<FieldContent>
												<Input
													id={field.name}
													name={field.name}
													type="password"
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
						</FieldGroup>

						<form.Subscribe
							selector={(state) => ({
								canSubmit: state.canSubmit,
								isSubmitting: state.isSubmitting,
							})}
						>
							{({ canSubmit, isSubmitting }) => (
								<Button
									type="submit"
									className="w-full"
									disabled={!canSubmit || isSubmitting}
								>
									{isSubmitting ? "Submitting…" : "Sign in"}
								</Button>
							)}
						</form.Subscribe>
					</form>
				</CardContent>
				<CardFooter className="flex justify-center border-t pt-6">
					{onSwitchToSignUp ? (
						<Button variant="link" onClick={onSwitchToSignUp}>
							Need an account? Sign up
						</Button>
					) : (
						<Button variant="link" render={<Link to="/sign-up" />}>
							Need an account? Sign up
						</Button>
					)}
				</CardFooter>
			</Card>
		</div>
	);
}
