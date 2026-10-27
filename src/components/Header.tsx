import { ConnectKitButton } from 'connectkit'
import { useAccount, useSwitchChain } from 'wagmi'
import { CHAIN, CHAIN_ID } from '@/lib/vault'
import { shortAddr } from '@/lib/utils'

function Mark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect width="28" height="28" rx="9" fill="#122d45" />
      <path d="M7 17c3.5 0 3.5-6 7-6s3.5 6 7 6" stroke="#acc6e9" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M7 21c3.5 0 3.5-3 7-3s3.5 3 7 3" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
    </svg>
  )
}

export function Header() {
  const { isConnected, chainId } = useAccount()
  const { switchChain, isPending } = useSwitchChain()
  const wrongChain = isConnected && chainId !== CHAIN_ID

  return (
    <header className="flex items-center justify-between gap-3 py-5">
      <div className="flex items-center gap-2.5">
        <Mark />
        <div className="leading-tight">
          <div className="display text-lg font-bold">FlowFi</div>
          <div className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--subtle)' }}>
            Smart money hub
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {wrongChain ? (
          <button
            onClick={() => switchChain({ chainId: CHAIN_ID })}
            disabled={isPending}
            className="glass-pill min-h-11 rounded-full px-4 text-xs font-semibold disabled:opacity-50"
            style={{ color: 'var(--danger)' }}
          >
            {isPending ? 'Switching...' : `Switch to ${CHAIN.name}`}
          </button>
        ) : (
          <span
            className="glass-pill hidden items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold sm:flex"
            style={{ color: 'var(--ink-2)' }}
          >
            <span className="size-1.5 rounded-full" style={{ background: 'var(--success)' }} />
            {CHAIN.name}
          </span>
        )}
        <ConnectKitButton.Custom>
          {({ isConnected: connected, show, address }) => (
            <button
              onClick={show}
              className="min-h-11 rounded-full px-5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'var(--accent)' }}
            >
              {connected && address ? <span className="mono text-xs">{shortAddr(address)}</span> : 'Connect wallet'}
            </button>
          )}
        </ConnectKitButton.Custom>
      </div>
    </header>
  )
}
