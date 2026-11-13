import { defineArrayMember, defineField, defineType } from "sanity";

const CHAINS = [
	{ title: "Bitcoin", value: "bitcoin" },
	{ title: "Lightning", value: "lightning" },
	{ title: "Ethereum / EVM", value: "ethereum" },
	{ title: "Solana", value: "solana" },
	{ title: "Litecoin", value: "litecoin" },
	{ title: "Dogecoin", value: "dogecoin" },
	{ title: "Monero", value: "monero" },
	{ title: "Other", value: "other" },
];

/** Singleton, id `donations`. Card giving goes through Stripe Payment Links; crypto straight to wallets. */
export const donations = defineType({
	name: "donations",
	title: "Donations",
	type: "document",
	groups: [
		{ name: "copy", title: "Copy", default: true },
		{ name: "card", title: "Card (Stripe)" },
		{ name: "crypto", title: "Crypto" },
		{ name: "other", title: "Other" },
	],
	fields: [
		defineField({
			name: "heading",
			type: "string",
			group: "copy",
			initialValue: "Support the film",
		}),
		defineField({
			name: "blurb",
			type: "text",
			rows: 3,
			group: "copy",
			description: "Why give, in a sentence or two",
		}),
		defineField({
			name: "note",
			title: "Fine print",
			type: "string",
			group: "copy",
			description: "One line, e.g. tax status or where the money goes",
		}),
		defineField({
			name: "currency",
			type: "string",
			group: "card",
			description: "ISO code the amounts are in",
			initialValue: "USD",
			validation: (rule) => rule.length(3).uppercase(),
		}),
		defineField({
			name: "amounts",
			title: "Preset amounts",
			type: "array",
			group: "card",
			description:
				"Each amount links to a Stripe Payment Link. Leave a frequency's link empty to hide that amount for it",
			of: [
				defineArrayMember({
					type: "object",
					name: "amount",
					fields: [
						defineField({
							name: "value",
							type: "number",
							validation: (rule) => rule.required().positive(),
						}),
						defineField({ name: "oneTime", title: "One-time link", type: "url" }),
						defineField({ name: "monthly", title: "Monthly link", type: "url" }),
						defineField({ name: "suggested", type: "boolean", description: "Selected by default" }),
					],
					preview: {
						select: { value: "value", oneTime: "oneTime", monthly: "monthly" },
						prepare: ({ value, oneTime, monthly }) => ({
							title: String(value),
							subtitle: [oneTime && "one-time", monthly && "monthly"].filter(Boolean).join(" · "),
						}),
					},
				}),
			],
		}),
		defineField({
			name: "customOneTime",
			title: "Other amount, one-time link",
			type: "url",
			group: "card",
			description: "A Stripe Payment Link set to “customer chooses what to pay”",
		}),
		defineField({
			name: "customMonthly",
			title: "Other amount, monthly link",
			type: "url",
			group: "card",
		}),
		defineField({
			name: "wallets",
			type: "array",
			group: "crypto",
			of: [
				defineArrayMember({
					type: "object",
					name: "wallet",
					fields: [
						defineField({
							name: "label",
							type: "string",
							description: "e.g. “Bitcoin”, “USDC”",
							validation: (rule) => rule.required(),
						}),
						defineField({ name: "symbol", type: "string", description: "e.g. BTC" }),
						defineField({
							name: "chain",
							type: "string",
							options: { list: CHAINS },
							description: "Sets the wallet link (e.g. bitcoin:) and the network warning",
							validation: (rule) => rule.required(),
						}),
						defineField({
							name: "network",
							type: "string",
							description:
								"Shown in the warning, e.g. “Ethereum (ERC-20)”, “Base”. Defaults to the chain",
						}),
						defineField({
							name: "address",
							type: "string",
							description: "Address, or a Lightning address / LNURL",
							validation: (rule) => rule.required(),
						}),
						defineField({
							name: "memo",
							title: "Memo / tag",
							type: "string",
							description: "Only if the chain needs one",
						}),
					],
					preview: { select: { title: "label", subtitle: "address" } },
				}),
			],
		}),
		defineField({
			name: "other",
			title: "Other ways to give",
			type: "array",
			group: "other",
			of: [
				defineArrayMember({
					type: "object",
					name: "method",
					fields: [
						defineField({
							name: "label",
							type: "string",
							description: "e.g. PayPal",
							validation: (rule) => rule.required(),
						}),
						defineField({
							name: "url",
							type: "url",
							validation: (rule) => rule.required().uri({ scheme: ["https", "mailto"] }),
						}),
					],
				}),
			],
		}),
	],
	preview: { prepare: () => ({ title: "Donations" }) },
});
