# Display modules

One folder per device. The rest of Tapframe does not import Fraimic (or TRMNL) by name. It loads whatever is registered here, qualifies it, and if the contract is met, Settings and Send pick it up.

## Add a module

1. Create `src/displays/<name>/`.
2. Export an `adapter` from `index.ts` that implements `DisplayAdapter` (`@/lib/display/types`).
3. Register it in `src/displays/index.ts`:

```ts
import { adapter as fraimic } from "./fraimic";
import { adapter as trmnl } from "./trmnl";

const candidates: unknown[] = [fraimic, trmnl];
```

4. Rebuild. Incomplete modules are skipped.

Fraimic (`src/displays/fraimic/`) is the reference. Device-only work (Spectra `.bin` packing, HTTP, tokens) stays in that folder.

## What the app gives you

```ts
type DisplayAdapter = {
  manifest: DisplayManifest;
  send: (context: SendContext) => Promise<SendResult>;
};
```

`send` receives:

| Field | Meaning |
| --- | --- |
| `image` | PNG buffer of the menu, already sized |
| `width`, `height` | The size the user picked from your `sizes` |
| `settings` | Values for the fields you declared (`host`, `token`, …) |

Return `{ ok: true, message? }` or `{ ok: false, error }`. Convert the PNG if the device needs another format. Do not read tap files or call the renderer.

## Manifest

```ts
{
  id: "fraimic",
  name: "Fraimic",
  description: "Local color e-ink frame on your network.",
  sizes: [
    { id: "standard", width: 1600, height: 1200, label: "Standard · 1600 × 1200" },
  ],
  layout: { maxPerRow: 4, rows: 1 },
  fields: [
    { key: "host", label: "Frame address", type: "text", placeholder: "fraimic.local" },
  ],
}
```

| Field | Rules |
| --- | --- |
| `id`, `name` | Non-empty. `id` is what `display.yaml` stores. |
| `sizes` | At least one. Width and height are integers ≥ 200. |
| `layout.maxPerRow`, `layout.rows` | Integers 1–12. Capacity is the product. The admin will not add more beers than that. |
| `fields` | Extra Settings inputs. `type` is `text` or `password`. May be `[]`. |

Switching Display in Settings rebuilds size, board, and fields from the new manifest.

## Shared vs device code

| Lives in | What |
| --- | --- |
| `src/lib/display/` | Contract, settings file, qualify check, registry |
| `src/displays/<name>/` | That device only |

Do not import `@/lib/tap-store` or `@/lib/render` from a display folder. The PNG is the interface.
