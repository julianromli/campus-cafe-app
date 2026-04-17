import { Button } from "@campus-cafe/ui/components/button";
import { DownloadIcon, ShareIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "campus-cafe-pwa-install-dismissed";

type BeforeInstallPromptEvent = Event & {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos(): boolean {
	if (typeof navigator === "undefined") {
		return false;
	}
	return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
	if (typeof window === "undefined") {
		return false;
	}
	return (
		window.matchMedia("(display-mode: standalone)").matches ||
		(window.navigator as Navigator & { standalone?: boolean }).standalone ===
			true
	);
}

export function InstallPromptBanner() {
	const [ready, setReady] = useState(false);
	const [dismissed, setDismissed] = useState(false);
	const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
		null,
	);
	const [showIosHint, setShowIosHint] = useState(false);

	useEffect(() => {
		if (localStorage.getItem(STORAGE_KEY) === "1") {
			setDismissed(true);
			setReady(true);
			return;
		}
		if (isStandalone()) {
			setDismissed(true);
			setReady(true);
			return;
		}

		setReady(true);

		if (isIos()) {
			setShowIosHint(true);
			return;
		}

		function onBeforeInstall(e: Event) {
			e.preventDefault();
			setDeferred(e as BeforeInstallPromptEvent);
		}

		window.addEventListener("beforeinstallprompt", onBeforeInstall);
		return () => {
			window.removeEventListener("beforeinstallprompt", onBeforeInstall);
		};
	}, []);

	const hide = () => {
		localStorage.setItem(STORAGE_KEY, "1");
		setDismissed(true);
		setDeferred(null);
		setShowIosHint(false);
	};

	if (!ready || dismissed) {
		return null;
	}

	if (showIosHint) {
		return (
			<div
				className="fixed inset-x-0 bottom-0 z-50 border-t bg-popover p-4 text-popover-foreground shadow-lg md:right-4 md:bottom-4 md:left-auto md:max-w-md md:rounded-lg md:border"
				role="dialog"
			>
				<div className="flex items-start gap-3">
					<ShareIcon aria-hidden className="mt-0.5 size-5 shrink-0" />
					<div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
						<p className="font-medium">Tambahkan ke Layar Utama</p>
						<p className="text-muted-foreground text-xs leading-relaxed">
							Ketuk tombol bagikan{" "}
							<span className="whitespace-nowrap font-medium">
								Share → Add to Home Screen
							</span>{" "}
							untuk menginstal aplikasi.
						</p>
					</div>
					<Button
						aria-label="Tutup"
						className="min-h-11 min-w-11 shrink-0"
						onClick={hide}
						size="icon-sm"
						variant="ghost"
					>
						<XIcon className="size-4" />
					</Button>
				</div>
			</div>
		);
	}

	if (!deferred) {
		return null;
	}

	return (
		<div
			className="fixed inset-x-0 bottom-0 z-50 border-t bg-popover p-4 text-popover-foreground shadow-lg md:right-4 md:bottom-4 md:left-auto md:max-w-md md:rounded-lg md:border"
			role="dialog"
		>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<div className="flex min-w-0 flex-1 items-start gap-3">
					<DownloadIcon aria-hidden className="mt-0.5 size-5 shrink-0" />
					<div className="flex min-w-0 flex-col gap-1 text-sm">
						<p className="font-medium">Instal Campus Cafe</p>
						<p className="text-muted-foreground text-xs">
							Akses lebih cepat dari layar utama — pembaruan otomatis.
						</p>
					</div>
				</div>
				<div className="flex shrink-0 gap-2">
					<Button
						className="min-h-11 min-w-[44px]"
						onClick={async () => {
							if (!deferred) {
								return;
							}
							await deferred.prompt();
							await deferred.userChoice;
							hide();
						}}
						size="sm"
					>
						Instal
					</Button>
					<Button
						className="min-h-11 min-w-[44px]"
						onClick={hide}
						size="sm"
						variant="ghost"
					>
						Nanti
					</Button>
				</div>
			</div>
		</div>
	);
}
