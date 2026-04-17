import { Outlet } from "react-router";

import Header from "@/components/header";
import { InstallPromptBanner } from "@/components/pwa/install-prompt";

export default function CustomerLayout() {
	return (
		<div className="min-h-svh bg-background text-foreground pb-16 md:pb-0">
			<Header />
			<main className="mx-auto flex w-full max-w-6xl flex-col px-4 py-6">
				<Outlet />
			</main>
			<InstallPromptBanner />
		</div>
	);
}
