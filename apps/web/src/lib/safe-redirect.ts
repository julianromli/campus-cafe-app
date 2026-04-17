const DEFAULT_REDIRECT = "/";

/**
 * Sanitizes a `?redirect=` query parameter to prevent open-redirect attacks.
 *
 * Only same-origin relative paths are allowed. Any attacker-controlled URL
 * (absolute `https://evil.com/...`, protocol-relative `//evil.com`, backslash
 * variants, or scheme URIs like `javascript:`) falls back to `"/"`.
 */
export function safeRedirect(input: string | null | undefined): string {
	if (!input) {
		return DEFAULT_REDIRECT;
	}

	if (
		!input.startsWith("/") ||
		input.startsWith("//") ||
		input.startsWith("/\\")
	) {
		return DEFAULT_REDIRECT;
	}

	return input;
}
