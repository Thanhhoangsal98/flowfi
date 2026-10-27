import { useState } from 'react'
import { Info, Lock, ShieldCheck } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import { useAccount } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import type { VaultState } from '@/hooks/useVault'
import { useNow } from '@/hooks/useNow'
import { Amount } from '@/onchain-money'
import { fmtDate, fmtUsdc } from '@/lib/utils'
import { AmountSheet, type SheetMode } from '@/components/AmountSheet'

interface Props {
  vault: VaultState
  onDone: () => void
}

const DAY = 86_400
const YEAR = 31_536_000

export function VaultCard({ vault, onDone }: Props) {
  const { isConnected } = useAccount()
  const [mode, setMode] = useState<SheetMode | null>(null)

  const now = useNow()
  const elapsed = vault.inception ? now - vault.inception : 0
  const returnSinceStart = vault.sharePrice !== undefined ? vault.sharePrice - 1 : undefined
  const apy =
    returnSinceStart !== undefined && returnSinceStart > 0 && elapsed >= DAY
      ? returnSinceStart * (YEAR / elapsed) * 100
      : undefined

  const utilisation =
    vault.totalAssets !== undefined && vault.depositCap && vault.depositCap > 0n
      ? Math.min(100, Number((vault.totalAssets * 10000n) / vault.depositCap) / 100)
      : 0

  const vesting = vault.lockedYield && vault.lockedYield > 0n ? vault.lockedYield : undefined
  const hasPosition = vault.position !== undefined && vault.position > 0n

  return (
    <section className="glass-card overflow-hidden rounded-3xl">
      <div className="h-1" style={{ background: 'linear-gradient(90deg,#5fbeff,#af8ff4,#f05c6b,#ffcd83,#7ef1b3)' }} />
      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <TokenUSDC variant="branded" size={36} />
            <div>
              <h2 className="display text-xl font-semibold">USDC Earn Vault</h2>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Receipt token fvUSDC. Instant withdrawals, no lock-up.
              </p>
            </div>
          </div>
          {vault.paused && (
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ background: 'rgba(154,106,18,0.12)', color: 'var(--warn)' }}
            >
              Deposits paused
            </span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Total deposited" value={fmtUsdc(vault.totalAssets)} unit="USDC" />
          <Metric
            label="Est. APY"
            value={apy !== undefined ? `${apy.toFixed(2)}%` : '--'}
            hint={apy === undefined ? 'Needs 24h of realized yield' : 'Annualized from realized return'}
          />
          <Metric
            label="Share price"
            value={vault.sharePrice !== undefined ? vault.sharePrice.toFixed(6) : '...'}
            unit="USDC"
          />
          <Metric label="Fees" value="0%" hint="Deposit, withdrawal, performance" />
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs" style={{ color: 'var(--muted)' }}>
            <span>Capacity used</span>
            <span className="tabular-nums">
              {fmtUsdc(vault.totalAssets, 0)} / {fmtUsdc(vault.depositCap, 0)} USDC
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(18,45,69,0.08)' }}>
            <div className="h-full rounded-full" style={{ width: `${utilisation}%`, background: 'var(--accent)' }} />
          </div>
        </div>

        {vesting !== undefined && vault.streamEnd !== undefined && (
          <div className="glass-inner mt-4 flex items-start gap-2 rounded-2xl p-3 text-xs text-pretty" style={{ color: 'var(--ink-2)' }}>
            <Info className="mt-0.5 size-3.5 shrink-0" />
            {fmtUsdc(vesting, 4)} USDC of added yield is vesting gradually until {fmtDate(vault.streamEnd)}, then reflected in the
            share price.
          </div>
        )}

        {isConnected && (
          <div className="glass-inner mt-5 rounded-2xl p-4">
            <div className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
              Your position
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="display text-3xl font-bold tabular-nums">{fmtUsdc(vault.position)}</span>
                <span className="text-sm" style={{ color: 'var(--subtle)' }}>
                  USDC
                </span>
              </div>
              <div className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                {vault.shares !== undefined && vault.shareDecimals !== undefined
                  ? `${Amount.fromRaw(vault.shares, vault.shareDecimals).toFixed(4)} fvUSDC`
                  : '...'}
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          {isConnected ? (
            <>
              <button
                onClick={() => setMode('deposit')}
                disabled={!vault.enabled}
                className="min-h-12 rounded-2xl text-sm font-semibold text-white transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40"
                style={{ background: 'var(--accent)' }}
              >
                Deposit
              </button>
              <button
                onClick={() => setMode('withdraw')}
                disabled={!hasPosition}
                className="glass-pill min-h-12 rounded-2xl text-sm font-semibold transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40"
              >
                Withdraw
              </button>
            </>
          ) : (
            <ConnectKitButton.Custom>
              {({ show }) => (
                <button
                  onClick={show}
                  className="col-span-2 min-h-12 rounded-2xl text-sm font-semibold text-white"
                  style={{ background: 'var(--accent)' }}
                >
                  Connect wallet to deposit
                </button>
              )}
            </ConnectKitButton.Custom>
          )}
        </div>

        <ul className="mt-5 space-y-2 text-xs text-pretty" style={{ color: 'var(--muted)' }}>
          <li className="flex gap-2">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            Yield is added by the vault operator and streamed to depositors. It is not guaranteed and can be zero.
          </li>
          <li className="flex gap-2">
            <Lock className="mt-0.5 size-3.5 shrink-0" />
            Testnet contract, unaudited by a third party. Use test funds only.
          </li>
        </ul>
      </div>

      <AmountSheet mode={mode} vault={vault} onClose={() => setMode(null)} onDone={onDone} />
    </section>
  )
}

function Metric({ label, value, unit, hint }: { label: string; value: string; unit?: string; hint?: string }) {
  return (
    <div className="glass-inner rounded-2xl p-3" title={hint}>
      <div className="text-xs" style={{ color: 'var(--muted)' }}>
        {label}
      </div>
      <div className="display mt-1 text-base font-semibold tabular-nums">
        {value}
        {unit && (
          <span className="ml-1 text-xs font-medium" style={{ color: 'var(--subtle)' }}>
            {unit}
          </span>
        )}
      </div>
      {hint && (
        <div className="mt-0.5 text-[11px] leading-tight" style={{ color: 'var(--subtle)' }}>
          {hint}
        </div>
      )}
    </div>
  )
}
