# Experiments — design review scaffolding

`ExperimentsPanel.astro` is one floating panel that switches every experiment group on a page.
A group is an `ExperimentGroup` (`types.ts`): a key, a label, and variants with notes. Each
variant on the page is an element with `data-experiment="<key>" data-variant="<id>"`, usually
via `Experiment.astro`; the panel shows one per group, fires `<key>:activate` /
`<key>:deactivate` on them, and keeps the choice in the URL as `#<key>=<id>&…`.

The panel should render only when `EXPERIMENTS` is set (staging, via `wrangler.jsonc`) or in dev:

```astro
---
import { EXPERIMENTS } from "astro:env/server";
import ExperimentsPanel from "@/components/experiments/ExperimentsPanel.astro";
import HeroShowcase, { heroExperiment } from "@/components/hero/experiments/HeroShowcase.astro";
---

<HeroShowcase />
{(EXPERIMENTS || import.meta.env.DEV) && <ExperimentsPanel groups={[heroExperiment]} />}
```

This folder is only the scaffolding. Each group lives in an `experiments/` folder next to the
component it varies (e.g. `hero/experiments/`), with the winner one level up once resolved. To add
a group, export an `ExperimentGroup` from a showcase in that folder, render its variants with the
attributes above, and pass the group to the panel on the page.
