import { env } from "@campus-cafe/env/web";
import { Button } from "@campus-cafe/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@campus-cafe/ui/components/card";
import { Toaster } from "@campus-cafe/ui/components/sonner";

import "./index.css";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import {
	isRouteErrorResponse,
	Link,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from "react-router";

import { authClient } from "@/lib/auth-client";

import type { Route } from "./+types/root";
import { ThemeProvider } from "./components/theme-provider";

const convex = new ConvexReactClient(env.VITE_CONVEX_URL, {
	expectAuth: true,
});

/** Matches `.dark` `--background` in `@campus-cafe/ui/globals.css` (oklch taupe). */
const themeColor = "#1b1a19";

export const links: Route.LinksFunction = () => [
	{ rel: "manifest", href: "/manifest.webmanifest" },
	{ href: "/icons/icon.svg", rel: "icon", type: "image/svg+xml" },
	{
		href: "/icons/apple-touch-icon.png",
		rel: "apple-touch-icon",
		sizes: "180x180",
	},
	{
		href: "/icons/icon-192.png",
		rel: "icon",
		sizes: "192x192",
		type: "image/png",
	},
];

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html className="dark" lang="en" suppressHydrationWarning>
			<head>
				<meta charSet="utf-8" />
				<meta content={themeColor} name="theme-color" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<Links />
			</head>
			<body className="min-h-svh overflow-x-hidden bg-background text-foreground text-sm antialiased">
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	return (
		<ConvexBetterAuthProvider client={convex} authClient={authClient}>
			<ThemeProvider
				attribute="class"
				defaultTheme="dark"
				disableTransitionOnChange
				storageKey="vite-ui-theme"
			>
				<Outlet />
				<Toaster richColors />
			</ThemeProvider>
		</ConvexBetterAuthProvider>
	);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = "Oops!";
	let details = "An unexpected error occurred.";
	let stack: string | undefined;
	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "404" : "Error";
		details =
			error.status === 404
				? "The requested page could not be found."
				: error.statusText || details;
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}
	return (
		<div className="flex min-h-svh items-center justify-center bg-background p-4">
			<Card className="w-full max-w-lg">
				<CardHeader>
					<CardTitle>{message}</CardTitle>
					<CardDescription>{details}</CardDescription>
				</CardHeader>
				{stack ? (
					<CardContent>
						<pre className="max-h-64 w-full overflow-auto rounded-md bg-muted p-4 text-xs">
							<code>{stack}</code>
						</pre>
					</CardContent>
				) : null}
				<CardFooter className="flex flex-wrap gap-2">
					<Button render={<Link to="/" />}>Back home</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
