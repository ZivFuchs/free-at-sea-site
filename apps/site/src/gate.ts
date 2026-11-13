/**
 * Staging's Worker: the prebuilt site (`dist/client`) behind a password. Deployed by `pnpm run deploy:staging`
 * with `wrangler.staging.jsonc`, outside Astro's build, which ships no Worker for an all-static site.
 * Password: `wrangler secret put SITE_PASSWORD -c wrangler.staging.jsonc`. Unset, the gate is open.
 */
interface GateEnv {
	ASSETS: Fetcher;
	SITE_PASSWORD?: string;
}

const challenge = () =>
	new Response("Password required.", {
		status: 401,
		headers: {
			"WWW-Authenticate": 'Basic realm="Free at Sea staging", charset="UTF-8"',
			"Cache-Control": "no-store",
		},
	});

const digest = async (text: string) =>
	new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));

/** Any username; the password must match. Compared as digests so timing reveals nothing. */
const allowed = async (request: Request, password: string) => {
	const header = request.headers.get("Authorization") ?? "";
	if (!header.startsWith("Basic ")) return false;
	let given: string;
	try {
		given = atob(header.slice(6)).split(":").slice(1).join(":");
	} catch {
		return false;
	}
	const [a, b] = await Promise.all([digest(given), digest(password)]);
	return a.every((byte, i) => byte === b[i]);
};

export default {
	async fetch(request, env) {
		if (env.SITE_PASSWORD && !(await allowed(request, env.SITE_PASSWORD))) return challenge();
		return env.ASSETS.fetch(request);
	},
} satisfies ExportedHandler<GateEnv>;
