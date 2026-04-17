import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import tsconfigPaths from "vite-tsconfig-paths";

const themeColor = "#0f172a";

export default defineConfig({
	optimizeDeps: {
		include: ["@hugeicons/react", "@hugeicons/core-free-icons"],
	},
	ssr: {
		// Workspace UI imports Hugeicons; inline so the SSR/dev runner resolves these deps.
		noExternal: [
			"@campus-cafe/ui",
			"@hugeicons/react",
			"@hugeicons/core-free-icons",
		],
	},
	plugins: [
		tailwindcss(),
		reactRouter(),
		VitePWA({
			devOptions: {
				enabled: true,
			},
			injectRegister: "auto",
			manifest: {
				background_color: "#0a0a0a",
				description:
					"Reservasi meja, event mendatang, dan pesanan di Campus Cafe.",
				display: "standalone",
				icons: [
					{
						purpose: "any",
						sizes: "192x192",
						src: "/icons/icon-192.png",
						type: "image/png",
					},
					{
						purpose: "any",
						sizes: "512x512",
						src: "/icons/icon-512.png",
						type: "image/png",
					},
					{
						purpose: "maskable",
						sizes: "512x512",
						src: "/icons/icon-maskable-512.png",
						type: "image/png",
					},
				],
				name: "Campus Cafe",
				scope: "/",
				short_name: "CampusCafe",
				start_url: "/",
				theme_color: themeColor,
			},
			registerType: "autoUpdate",
			workbox: {
				globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2,webmanifest}"],
				navigateFallback: "/",
				runtimeCaching: [
					{
						handler: "CacheFirst",
						options: {
							cacheName: "google-fonts-stylesheets",
							expiration: {
								maxAgeSeconds: 60 * 60 * 24 * 365,
								maxEntries: 8,
							},
						},
						urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
					},
					{
						handler: "CacheFirst",
						options: {
							cacheName: "google-fonts-webfonts",
							expiration: {
								maxAgeSeconds: 60 * 60 * 24 * 365,
								maxEntries: 8,
							},
						},
						urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
					},
					{
						handler: "StaleWhileRevalidate",
						options: {
							cacheName: "static-images",
						},
						urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
					},
				],
			},
		}),
		tsconfigPaths(),
	],
});
