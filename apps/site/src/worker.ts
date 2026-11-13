/**
 * The deployed Worker (`wrangler.deploy.jsonc`): `/api/subscribe`, then the prebuilt static site (`dist/client`).
 * Staging sets `SITE_PASSWORD` (`wrangler secret put SITE_PASSWORD -c wrangler.deploy.jsonc --env staging`)
 * to put the whole site behind a password; production leaves it unset.
 */
import { subscribe } from "./lib/subscribe";

interface WorkerEnv {
	ASSETS: Fetcher;
	SITE_PASSWORD?: string;
	BREVO_API_KEY?: string;
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
		if (new URL(request.url).pathname === "/api/subscribe")
			return subscribe(request, env.BREVO_API_KEY);
		return env.ASSETS.fetch(request);
	},
} satisfies ExportedHandler<WorkerEnv>;
