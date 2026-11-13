import { DONATIONS_QUERY, type DONATIONS_QUERY_RESULT } from "@fas/content";
import { renderSVG } from "uqr";
import { buildOnce } from "@/lib/once";
import { sanity } from "@/lib/sanity";

type Doc = NonNullable<DONATIONS_QUERY_RESULT>;
type WalletDoc = NonNullable<Doc["wallets"]>[number];

export interface Amount {
	value: number;
	label: string;
	oneTime: string | null;
	monthly: string | null;
	suggested: boolean;
}

export interface Wallet {
	label: string;
	symbol: string | null;
	network: string;
	address: string;
	memo: string | null;
	/** Opens the visitor's wallet app (`bitcoin:…`); null where no scheme is standard. */
	uri: string | null;
	/** QR of the bare address, as inline SVG. */
	qr: string;
}

export interface Donations {
	heading: string;
	blurb: string | null;
	note: string | null;
	amounts: Amount[];
	custom: { oneTime: string | null; monthly: string | null };
	wallets: Wallet[];
	other: { label: string; url: string }[];
	/** Placeholder content for design review; never in production. */
	sample?: boolean;
}

const CHAIN_NAMES: Record<string, string> = {
	bitcoin: "Bitcoin",
	lightning: "Lightning",
	ethereum: "Ethereum",
	solana: "Solana",
	litecoin: "Litecoin",
	dogecoin: "Dogecoin",
	monero: "Monero",
};

const QR_COLORS = { blackColor: "oklch(0.2 0.03 240)", whiteColor: "oklch(0.985 0.003 230)" };

const wallet = ({ label, symbol, chain, network, address, memo }: WalletDoc): Wallet | null => {
	if (!label || !address) return null;
	const scheme = chain && chain in CHAIN_NAMES ? chain : null;
	return {
		label,
		symbol,
		network: network || (chain && CHAIN_NAMES[chain]) || label,
		address,
		memo,
		uri: scheme ? `${scheme}:${address}` : null,
		qr: renderSVG(address, { border: 2, ...QR_COLORS }),
	};
};

const money = (currency: string) =>
	new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 });

const resolve = (doc: Doc): Donations => {
	const format = money(doc.currency || "USD");
	return {
		heading: doc.heading || "Support the film",
		blurb: doc.blurb,
		note: doc.note,
		amounts: (doc.amounts ?? [])
			.filter((a) => a.value && (a.oneTime || a.monthly))
			.map((a) => ({
				value: a.value ?? 0,
				label: format.format(a.value ?? 0),
				oneTime: a.oneTime,
				monthly: a.monthly,
				suggested: a.suggested ?? false,
			})),
		custom: { oneTime: doc.customOneTime, monthly: doc.customMonthly },
		wallets: (doc.wallets ?? []).map(wallet).filter((w) => w !== null),
		other: (doc.other ?? []).filter((o): o is { label: string; url: string } =>
			Boolean(o.label && o.url),
		),
	};
};

const hasContent = (d: Donations) =>
	d.amounts.length > 0 ||
	Boolean(d.custom.oneTime || d.custom.monthly) ||
	d.wallets.length > 0 ||
	d.other.length > 0;

/** Obvious placeholders (no real links or addresses) so the section can be reviewed before accounts exist. */
const SAMPLE: Doc = {
	heading: "Support the film",
	blurb:
		"Sample copy: Free at Sea is independent. Your support helps us finish the film and bring it to audiences.",
	note: "Sample fine print. Replace in Studio → Donations.",
	currency: "USD",
	amounts: [25, 50, 100, 250].map((value) => ({
		value,
		oneTime: "#donate",
		monthly: "#donate",
		suggested: value === 50,
	})),
	customOneTime: "#donate",
	customMonthly: "#donate",
	wallets: [
		{
			label: "Bitcoin",
			symbol: "BTC",
			chain: "bitcoin",
			network: null,
			address: "SAMPLE-not-a-real-bitcoin-address",
			memo: null,
		},
		{
			label: "Lightning",
			symbol: "sats",
			chain: "lightning",
			network: null,
			address: "sample@example.com",
			memo: null,
		},
		{
			label: "Ethereum",
			symbol: "ETH",
			chain: "ethereum",
			network: null,
			address: "SAMPLE-not-a-real-ethereum-address",
			memo: null,
		},
		{
			label: "USDC",
			symbol: "USDC",
			chain: "ethereum",
			network: "Ethereum (ERC-20)",
			address: "SAMPLE-not-a-real-ethereum-address",
			memo: null,
		},
		{
			label: "Solana",
			symbol: "SOL",
			chain: "solana",
			network: null,
			address: "SAMPLE-not-a-real-solana-address",
			memo: null,
		},
	],
	other: [{ label: "Sample: PayPal", url: "https://example.com" }],
};

/** Donation options from Studio → Donations; `null` until something is filled in. */
export const getDonations = buildOnce(async (): Promise<Donations | null> => {
	const doc = await sanity.fetch(DONATIONS_QUERY);
	const real = doc ? resolve(doc) : null;
	if (real && hasContent(real)) return real;
	return null;
});

export const sampleDonations = (): Donations => ({ ...resolve(SAMPLE), sample: true });

export type Frequency = "oneTime" | "monthly";

/** Initial UI state every donation layout starts from (the client script takes over from here). */
export const donationView = ({ amounts, custom, wallets, other }: Donations) => {
	const hasOneTime = amounts.some((a) => a.oneTime) || Boolean(custom.oneTime);
	const hasMonthly = amounts.some((a) => a.monthly) || Boolean(custom.monthly);
	const start: Frequency = hasOneTime ? "oneTime" : "monthly";
	const chosen =
		amounts.find((a) => a.suggested && a[start]) ?? amounts.find((a) => a[start]) ?? null;
	return {
		hasOneTime,
		hasMonthly,
		hasCard: hasOneTime || hasMonthly,
		hasCustom: Boolean(custom.oneTime || custom.monthly),
		start,
		chosen,
		/** Ways to give that have content, in display order. */
		tabs: [
			(hasOneTime || hasMonthly) && { id: "card", label: "Card" },
			wallets.length > 0 && { id: "crypto", label: "Crypto" },
			other.length > 0 && { id: "other", label: "Other" },
		].filter((tab) => tab !== false),
		cta: {
			href: chosen?.[start] ?? custom[start] ?? "#donate",
			label: chosen ? `Donate ${chosen.label}` : "Donate",
		},
	};
};
