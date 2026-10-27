import { ExternalLink } from 'lucide-react'
import type { VaultState } from '@/hooks/useVault'
import type { YieldItem } from '@/hooks/useActivity'
import { buildAddressExplorerUrl, buildTxExplorerUrl } from '@/onchain-facts'
import { CHAIN_ID, VAULT_ADDRESS } from '@/lib/vault'
import { fmtDate, fmtUsdc, shortAddr } from '@/lib/utils'

interface Props {
  vault: VaultState
  yields?: YieldItem[]
}

export function ProtocolCard({ vault, yields }: Props) {
  const full =
    vault.totalAssets !== undefined && vault.depositCap !== undefined && vault.totalAssets >= vault.depositCap

  return (
    <section className="glass-card rounded-3xl p-5">
      <h2 className="display mb-3 text-base font-semibold">Protocol status</h2>

      <div className="space-y-2 text-sm">
        <StatusRow
          label="Deposits"
          value={vault.paused === undefined ? '...' : vault.paused ? 'Paused' : full ? 'At capacity' : 'Open'}
          tone={vault.paused || full ? 'warn' : 'good'}
        />
        <StatusRow label="Withdrawals" value="Always open" tone="good" />
        <StatusRow label="Deposit cap" value={`${fmtUsdc(vault.depositCap, 0)} USDC`} />
        <StatusRow label="Fees" value="0% (deposit, withdrawal, performance)" />
        <StatusRow label="Price oracle" value="Not used in this phase" />
        {vault.owner && <StatusRow label="Operator" value={shortAddr(vault.owner)} mono />}
        {vault.yieldPeriod !== undefined && (
          <StatusRow label="Yield streaming" value={`${(vault.yieldPeriod / 86400).toFixed(0)} days`} />
        )}
      </div>

      <div className="mt-4">
        <div className="mb-2 text-xs font-semibold" style={{ color: 'var(--muted)' }}>
          Recent yield additions
        </div>
        {!yields || yields.length === 0 ? (
          <div className="glass-inner rounded-2xl p-3 text-xs text-pretty" style={{ color: 'var(--muted)' }}>
            {yields
              ? 'No yield has been added yet. Share price stays at 1.00 until the operator adds yield.'
              : 'Connect your wallet to load yield history.'}
          </div>
        ) : (
          <ul className="space-y-1.5">
            {yields.map((y) => (
              <li key={`${y.hash}-${y.logIndex}`}>
                <a
                  href={buildTxExplorerUrl(CHAIN_ID, y.hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-inner flex items-center justify-between rounded-xl px-3 py-2 text-xs"
                >
                  <span style={{ color: 'var(--muted)' }}>{y.timestamp ? fmtDate(y.timestamp) : `Block ${y.blockNumber}`}</span>
                  <span className="font-semibold tabular-nums">+{fmtUsdc(y.assets, 4)} USDC</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {VAULT_ADDRESS && (
        <a
          href={buildAddressExplorerUrl(CHAIN_ID, VAULT_ADDRESS)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-11 items-center gap-1 text-xs font-semibold"
          style={{ color: 'var(--accent-hover)' }}
        >
          View vault contract <ExternalLink className="size-3" />
        </a>
      )}

      <p className="mt-2 text-[11px] leading-relaxed text-pretty" style={{ color: 'var(--subtle)' }}>
        FlowFi is a testnet preview. Returns depend on yield the operator adds and are never guaranteed. The vault contract has
        been reviewed with automated tools but has not had an independent audit.
      </p>
    </section>
  )
}

function StatusRow({
  label,
  value,
  tone,
  mono,
}: {
  label: string
  value: string
  tone?: 'good' | 'warn'
  mono?: boolean
}) {
  const color = tone === 'good' ? 'var(--success)' : tone === 'warn' ? 'var(--warn)' : 'var(--ink)'
  return (
    <div className="flex items-center justify-between gap-3">
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span className={`text-right font-semibold ${mono ? 'mono text-xs' : ''}`} style={{ color }}>
        {value}
      </span>
    </div>
  )
}
