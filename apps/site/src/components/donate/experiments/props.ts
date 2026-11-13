import type { Donations } from "@/lib/donations";

/** Props every donation layout takes. The showcase wraps each in an `Experiment`. */
export interface DonateVariantProps {
	donations: Donations;
}
