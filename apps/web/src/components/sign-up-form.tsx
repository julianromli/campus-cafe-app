import { Button } from "@campus-cafe/ui/components/button";
import { Input } from "@campus-cafe/ui/components/input";
import { Label } from "@campus-cafe/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import z from "zod";

import { authClient, googleAuthEnabled } from "@/lib/auth-client";

type SignUpFormProps = {
  onSwitchToSignIn?: () => void;
};

export default function SignUpForm({ onSwitchToSignIn }: SignUpFormProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";

  const handleGoogleSignIn = async () => {
    try {
      await authClient.signIn.social({
        callbackURL: redirectTo,
        provider: "google",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google sign up failed");
    }
  };

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signUp.email(
        {
          email: value.email,
          password: value.password,
          name: value.name,
        },
        {
          onSuccess: () => {
            navigate(redirectTo);
            toast.success("Sign up successful");
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    },
  });

  return (
    <div className="mx-auto mt-10 w-full max-w-md p-6">
      <div className="mb-6 space-y-2 text-center">
        <h1 className="text-3xl font-bold">Create Account</h1>
        <p className="text-sm text-muted-foreground">Create your customer account to unlock reservations and in-seat ordering.</p>
      </div>

      {googleAuthEnabled ? (
        <div className="mb-4 space-y-3">
          <Button type="button" variant="outline" className="w-full" onClick={handleGoogleSignIn}>
            Continue with Google
          </Button>
          <div className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">or</div>
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        <div>
          <form.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Name</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error, index) => (
                  <p key={`${field.name}-error-${index}`} className="text-red-500">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <div>
          <form.Field name="email">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Email</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error, index) => (
                  <p key={`${field.name}-error-${index}`} className="text-red-500">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <div>
          <form.Field name="password">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Password</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error, index) => (
                  <p key={`${field.name}-error-${index}`} className="text-red-500">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
        >
          {({ canSubmit, isSubmitting }) => (
            <Button type="submit" className="w-full" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? "Submitting..." : "Sign Up"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <div className="mt-4 text-center">
        {onSwitchToSignIn ? (
          <Button variant="link" onClick={onSwitchToSignIn} className="text-indigo-600 hover:text-indigo-800">
            Already have an account? Sign In
          </Button>
        ) : (
          <Button variant="link" render={<Link to="/sign-in" />}>
            Already have an account? Sign In
          </Button>
        )}
      </div>
    </div>
  );
}
