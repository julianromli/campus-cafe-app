import { Outlet } from "react-router";

import Header from "@/components/header";

export default function CustomerLayout() {
	return (
		<div className="min-h-svh bg-background text-foreground">
			<Header />
			<main className="mx-auto flex w-full max-w-6xl flex-col px-4 py-6">
				<Outlet />
			</main>
		</div>
	);
}
