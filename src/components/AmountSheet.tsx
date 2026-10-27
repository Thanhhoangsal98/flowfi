import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, ExternalLink, Loader2, X } from 'lucide-react'
import { useAccount, useReadContract } from 'wagmi'
import type { VaultState } from '@/hooks/useVault'
import { useVaultActions, type TxPhase } from '@/hooks/useVaultActions'
import { Amount } from '@/onchain-money'
import { buildTxExplorerUrl } from '@/onchain-facts'
import { CHAIN, CHAIN_ID, VAULT_ADDRESS, vaultAbi } from '@/lib/vault'
import { USDC_DECIMALS, fmtUsdc } from '@/lib/utils'

export type SheetMode = 'deposit' | 'withdraw'

interface Props {
  mode: SheetMode | null
  vault: VaultState
  onClose: () => void
  onDone: () => void
}

const GAS_BUFFER = 50_000n // 0.05 USDC kept back on Max so the wallet can still pay gas (gas is paid in USDC on Arc)
const spectral = 'linear-gradient(90deg, #5fbeff, #af8ff4, #f05c6b, #ffcd83, #7ef1b3)'

export function AmountSheet({ mode, vault, onClose, onDone }: Props) {
  return (
    <AnimatePresence>
      {mode && <Sheet key={mode} mode={mode} vault={vault} onClose={onClose} onDone={onDone} />}
    </AnimatePresence>
  )
}

function Sheet({ mode, vault, onClose, onDone }: Props & { mode: SheetMode }) {
  const { chainId } = useAccount()
  const { tx, deposit, withdraw, reset } = useVaultActions(onDone)
  const [value, setValue] = useState('')
  const isDeposit = mode === 'deposit'

  const busy = tx.phase !== 'idle' && tx.phase !== 'error' && tx.phase !== 'success'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  const raw = useMemo(() => {
    if (!value) return undefined
    try {
      return Amount.parse(value, USDC_DECIMALS).raw
    } catch {
      return undefined
    }
  }, [value])

  const balance = isDeposit ? vault.walletUsdc : vault.position
  const limit = isDeposit ? vault.maxDeposit : vault.position

  let problem: string | null = null
  if (value && raw === undefined) problem = 'Enter a valid amount (up to 6 decimals).'
  else if (raw !== undefined && raw > 0n) {
    if (balance !== undefined && raw > balance) problem = isDeposit ? 'More than your wallet balance.' : 'More than your position.'
    else if (isDeposit && vault.paused) problem = 'Deposits are paused. Withdrawals still work.'
    else if (isDeposit && limit !== undefined && raw > limit) problem = 'Exceeds remaining vault capacity.'
  }
  const valid = raw !== undefined && raw > 0n && !problem

  const { data: previewShares } = useReadContract({
    address: VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: 'previewDeposit',
    args: [raw ?? 0n],
    chainId: CHAIN_ID,
    query: { enabled: isDeposit && valid },
  })

  const setMax = () => {
    if (balance === undefined) return
    const max = isDeposit ? (balance > GAS_BUFFER ? balance - GAS_BUFFER : 0n) : balance
    setValue(Amount.fromRaw(max, USDC_DECIMALS).toString())
  }

  const submit = () => {
    if (!valid || raw === undefined) return
    if (isDeposit) void deposit(raw, vault.allowance ?? 0n)
    else {
      const exitAll = vault.position !== undefined && raw === vault.position && vault.shares !== undefined
      void withdraw(raw, exitAll ? vault.shares : undefined)
    }
  }

  const wrongChain = chainId !== undefined && chainId !== CHAIN_ID
  const needsApproval = isDeposit && raw !== undefined && (vault.allowance ?? 0n) < raw

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => !busy && onClose()}
    >
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" />
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-label={isDeposit ? 'Deposit USDC' : 'Withdraw USDC'}
        className="relative w-full max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl"
        style={{
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
        }}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1" style={{ background: spectral }} />
        <div className="px-5 pb-6 pt-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="display text-lg font-semibold">{isDeposit ? 'Deposit USDC' : 'Withdraw USDC'}</h3>
            <button
              onClick={onClose}
              disabled={busy}
              aria-label="Close"
              className="flex size-11 items-center justify-center rounded-full disabled:opacity-40"
            >
              <X className="size-4" />
            </button>
          </div>

          {tx.phase === 'success' ? (
            <div className="space-y-4">
              <div className="glass-inner rounded-2xl p-5 text-center">
                <CheckCircle2 className="mx-auto size-8" style={{ color: 'var(--success)' }} />
                <div className="display mt-2 text-lg font-semibold">{isDeposit ? 'Deposit confirmed' : 'Withdrawal confirmed'}</div>
                {tx.hash && (
                  <a
                    href={buildTxExplorerUrl(CHAIN_ID, tx.hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold"
                    style={{ color: 'var(--accent-hover)' }}
                  >
                    View on explorer <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
              <button onClick={onClose} className="min-h-12 w-full rounded-2xl text-sm font-semibold text-white" style={{ background: 'var(--accent)' }}>
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="glass-inner rounded-2xl p-4">
                <input
                  inputMode="decimal"
                  autoFocus
                  aria-label="Amount in USDC"
                  value={value}
                  disabled={busy}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9.]/g, '')
                    if (v === '' || /^\d*\.?\d*$/.test(v)) {
                      setValue(v)
                      if (tx.phase === 'error') reset()
                    }
                  }}
                  placeholder="0.00"
                  className="display w-full bg-transparent text-4xl font-bold tabular-nums outline-none placeholder:text-slate-300"
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--subtle)' }}>
                    USDC
                  </span>
                  <button
                    onClick={setMax}
                    disabled={balance === undefined || busy}
                    className="min-h-8 text-xs font-semibold disabled:opacity-40"
                    style={{ color: 'var(--accent-hover)' }}
                  >
                    {isDeposit ? 'Wallet' : 'Position'}: {fmtUsdc(balance)} · Max
                  </button>
                </div>
              </div>

              {problem && (
                <p role="alert" className="mt-2 text-xs" style={{ color: 'var(--danger)' }}>
                  {problem}
                </p>
              )}

              <div className="glass-inner mt-3 space-y-2 rounded-2xl p-4 text-sm">
                {isDeposit ? (
                  <Row
                    label="You receive (est.)"
                    value={
                      previewShares !== undefined && vault.shareDecimals !== undefined
                        ? `${Amount.fromRaw(previewShares, vault.shareDecimals).toFixed(4)} fvUSDC`
                        : '--'
                    }
                  />
                ) : (
                  <Row label="You receive" value={valid && raw !== undefined ? `${fmtUsdc(raw)} USDC` : '--'} />
                )}
                <Row label="Fees" value="0 USDC" />
                <Row label="Timing" value={isDeposit ? 'Earns from confirmation' : 'Instant'} />
                {isDeposit && needsApproval && valid && <Row label="Step 1 of 2" value="Approve USDC spending" />}
                <Row label="Network" value={CHAIN.name} />
              </div>

              {tx.phase === 'error' && tx.error && (
                <p role="alert" className="mt-3 text-sm" style={{ color: 'var(--danger)' }}>
                  {tx.error}
                </p>
              )}

              <button
                onClick={submit}
                disabled={!valid || busy}
                className="mt-4 min-h-12 w-full rounded-2xl text-sm font-semibold text-white transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: 'var(--accent)' }}
              >
                {busy ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> {phaseLabel(tx.phase)}
                  </span>
                ) : wrongChain ? (
                  `Switch to ${CHAIN.name} and continue`
                ) : isDeposit ? (
                  needsApproval && valid ? 'Approve and deposit' : 'Deposit'
                ) : (
                  'Withdraw'
                )}
              </button>
            </>
          )}
        </div>
      </motion.section>
    </motion.div>
  )
}

function phaseLabel(phase: TxPhase): string {
  switch (phase) {
    case 'switching':
      return 'Switching network...'
    case 'approve-wallet':
      return 'Approve in wallet...'
    case 'approve-confirming':
      return 'Confirming approval...'
    case 'wallet':
      return 'Confirm in wallet...'
    case 'confirming':
      return 'Confirming...'
    default:
      return 'Working...'
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  )
}
