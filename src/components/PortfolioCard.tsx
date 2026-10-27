import { Wallet, Vault, TrendingUp } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import { useAccount } from 'wagmi'
import type { VaultState } from '@/hooks/useVault'
import { fmtUsdc } from '@/lib/utils'

interface Props {
  vault: VaultState
  lifetimeEarnings?: bigint
}

export function PortfolioCard({ vault, lifetimeEarnings }: Props) {
  const { isConnected } = useAccount()
  const loaded = vault.walletUsdc !== undefined && vault.position !== undefined
  const total = loaded ? vault.walletUsdc! + vault.position! : undefined
  const walletPct = loaded && total! > 0n ? Number((vault.walletUsdc! * 10000n) / total!) / 100 : 0

  return (
    <section className="glass-card rounded-3xl p-6">
      <div className="mb-3 flex items-center gap-1.5">
        <div className="flex size-5 items-center justify-center rounded-md" style={{ background: 'rgba(18,45,69,0.08)' }}>
          <Wallet className="size-3" style={{ color: 'var(--ink)' }} />
        </div>
        <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
          Portfolio value
        </span>
      </div>

      {!isConnected ? (
        <>
          <div className="display text-4xl font-bold tabular-nums" style={{ color: 'var(--subtle)' }}>
            --
          </div>
          <p className="mt-2 text-sm text-pretty" style={{ color: 'var(--muted)' }}>
            Connect a wallet to see your USDC balance, vault position and activity on Arc Testnet.
          </p>
        </>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className="display text-5xl font-bold tabular-nums">{fmtUsdc(total)}</span>
            <span className="flex items-center gap-1.5 text-lg font-medium" style={{ color: 'var(--subtle)' }}>
              <TokenUSDC variant="branded" size={20} /> USDC
            </span>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full" style={{ background: 'rgba(18,45,69,0.08)' }}>
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${100 - walletPct}%`, background: 'var(--accent)' }}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat icon={<Wallet className="size-3.5" />} label="In wallet" value={fmtUsdc(vault.walletUsdc)} />
            <Stat icon={<Vault className="size-3.5" />} label="In Earn vault" value={fmtUsdc(vault.position)} />
            <Stat
              icon={<TrendingUp className="size-3.5" />}
              label="Lifetime earnings"
              value={lifetimeEarnings === undefined ? '...' : fmtUsdc(lifetimeEarnings, 4)}
              tone={lifetimeEarnings && lifetimeEarnings > 0n ? 'good' : undefined}
              className="col-span-2 sm:col-span-1"
            />
          </div>
        </>
      )}
    </section>
  )
}

function Stat({
  icon,
  label,
  value,
  tone,
  className = '',
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone?: 'good'
  className?: string
}) {
  return (
    <div className={`glass-inner rounded-2xl p-3 ${className}`}>
      <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
        {icon}
        {label}
      </div>
      <div
        className="display mt-1 text-lg font-semibold tabular-nums"
        style={{ color: tone === 'good' ? 'var(--success)' : 'var(--ink)' }}
      >
        {value}
      </div>
    </div>
  )
}
