import { Check, Circle } from 'lucide-react'

const PHASES = [
  { phase: 'Phase 1', title: 'Earn vault, wallet and activity', detail: 'USDC vault with receipt tokens on testnet.', live: true },
  { phase: 'Phase 2', title: 'Lending and borrowing', detail: 'Collateral, borrow limits, health factors, liquidations.', live: false },
  { phase: 'Phase 3', title: 'Swaps and liquidity', detail: 'DEX swaps, pools and external yield strategies.', live: false },
  { phase: 'Phase 4', title: 'Security and mainnet', detail: 'Independent audits and a controlled launch.', live: false },
]

export function RoadmapCard() {
  return (
    <section className="glass-card rounded-3xl p-5">
      <h2 className="display mb-3 text-base font-semibold">Roadmap</h2>
      <ol className="space-y-3">
        {PHASES.map((p) => (
          <li key={p.phase} className="flex gap-3">
            <div
              className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full"
              style={{
                background: p.live ? 'rgba(26,128,71,0.14)' : 'rgba(18,45,69,0.07)',
                color: p.live ? 'var(--success)' : 'var(--subtle)',
              }}
            >
              {p.live ? <Check className="size-3.5" /> : <Circle className="size-2.5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                {p.title}
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
                  style={{
                    background: p.live ? 'rgba(26,128,71,0.12)' : 'rgba(18,45,69,0.07)',
                    color: p.live ? 'var(--success)' : 'var(--subtle)',
                  }}
                >
                  {p.live ? 'Live on testnet' : 'Planned'}
                </span>
              </div>
              <p className="text-xs text-pretty" style={{ color: 'var(--muted)' }}>
                {p.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
