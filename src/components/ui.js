// Classes Tailwind partagées entre les formulaires — évite de dupliquer le
// même style dans chaque modale.
export const inputCls =
  'w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-ink focus:outline-none'

export const labelCls = 'label mb-1.5 block'

export const btnPrimaryCls =
  'w-full rounded-full bg-ink py-3 text-sm font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-40'

export const btnSecondaryCls =
  'w-full rounded-full border border-line py-3 text-sm font-medium text-ink transition-colors hover:bg-subtle'

export const btnDangerCls =
  'w-full rounded-full border border-rust/40 py-3 text-sm font-medium text-rust transition-colors hover:bg-rust/5'

export const cardCls = 'rounded-2xl bg-card p-4'
