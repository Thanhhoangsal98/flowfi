import { ArrowDownLeft, ArrowUpRight, ExternalLink } from 'lucide-react'
import { useAccount } from 'wagmi'
import type { ActivityItem } from '@/hooks/useActivity'
import { buildAddressExplorerUrl, buildTxExplorerUrl } from '@/onchain-facts'
import { CHAIN_ID } from '@/lib/vault'
import { fmtDate, fmtUsdc } from '@/lib/utils'

interface Props {
  items?: ActivityItem[]
  loading: boolean
  partial?: boolean
}

export function ActivityCard({ items, loading, partial }: Props) {
  const { address, isConnected } = useAccount()

  return (
    <section className="glass-card rounded-3xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="display text-base font-semibold">Activity</h2>
        {address && (
          <a
            href={buildAddressExplorerUrl(CHAIN_ID, address)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: 'var(--accent-hover)' }}
          >
            All wallet history <ExternalLink className="size-3" />
          </a>
        )}
      </div>

      {!isConnected ? (
        <Empty text="Connect your wallet to see your FlowFi transactions." />
      ) : loading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl" style={{ background: 'rgba(18,45,69,0.06)' }} />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <Empty text="No vault activity yet. Your deposits and withdrawals will appear here." />
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => {
            const isDeposit = item.kind === 'deposit'
            return (
              <li key={`${item.hash}-${item.logIndex}`}>
                <a
                  href={buildTxExplorerUrl(CHAIN_ID, item.hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-inner flex min-h-14 items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-white/70"
                >
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full"
                    style={{ background: isDeposit ? 'rgba(26,128,71,0.12)' : 'rgba(18,45,69,0.08)' }}
                  >
                    {isDeposit ? (
                      <ArrowDownLeft className="size-4" style={{ color: 'var(--success)' }} />
                    ) : (
                      <ArrowUpRight className="size-4" style={{ color: 'var(--ink)' }} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{isDeposit ? 'Deposited' : 'Withdrew'}</div>
                    <div className="text-xs" style={{ color: 'var(--subtle)' }}>
                      {item.timestamp ? fmtDate(item.timestamp) : `Block ${item.blockNumber.toString()}`}
                    </div>
                  </div>
                  <div className="display text-sm font-semibold tabular-nums">
                    {isDeposit ? '+' : '-'}
                    {fmtUsdc(item.assets)} <span style={{ color: 'var(--subtle)' }}>USDC</span>
                  </div>
                </a>
              </li>
            )
          })}
        </ul>
      )}
      {partial && (
        <p className="mt-3 text-xs text-pretty" style={{ color: 'var(--warn)' }}>
          Showing recent activity only. Older entries are on the explorer.
        </p>
      )}
    </section>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="glass-inner rounded-2xl p-4 text-sm text-pretty" style={{ color: 'var(--muted)' }}>
      {text}
    </div>
  )
}
