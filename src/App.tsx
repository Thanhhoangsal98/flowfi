import { useCallback, useState } from 'react'
import { useAccount } from 'wagmi'
import { ExternalLink } from 'lucide-react'
import { Header } from '@/components/Header'
import { PortfolioCard } from '@/components/PortfolioCard'
import { VaultCard } from '@/components/VaultCard'
import { ActivityCard } from '@/components/ActivityCard'
import { ProtocolCard } from '@/components/ProtocolCard'
import { RoadmapCard } from '@/components/RoadmapCard'
import { useVault } from '@/hooks/useVault'
import { useActivity } from '@/hooks/useActivity'

export default function App() {
  const { address, isConnected } = useAccount()
  const vault = useVault()
  const [refreshKey, setRefreshKey] = useState(0)
  const activity = useActivity(address, refreshKey)

  const { refetch } = vault
  const onDone = useCallback(() => {
    void refetch()
    setRefreshKey((k) => k + 1)
  }, [refetch])

  const data = activity.data
  const lifetimeEarnings =
    data && vault.position !== undefined ? vault.position + data.totalWithdrawn - data.totalDeposited : undefined

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div
          style={{
            position: 'absolute',
            top: '6%',
            left: '4%',
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(133,177,237,0.22) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '6%',
            right: '6%',
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,205,131,0.20) 0%, transparent 70%)',
            filter: 'blur(58px)',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-24">
        <Header />

        {!vault.enabled && (
          <div className="glass-card mb-4 rounded-3xl p-5 text-sm" style={{ color: 'var(--danger)' }}>
            The vault address is not configured. Set VITE_FLOW_VAULT_ADDRESS and restart the dev server.
          </div>
        )}

        {vault.failed && (
          <div className="glass-card mb-4 rounded-3xl p-5 text-sm" style={{ color: 'var(--danger)' }}>
            Could not read the vault right now. Check your connection; this page retries automatically.
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-5">
          <main className="space-y-4 lg:col-span-3">
            <PortfolioCard vault={vault} lifetimeEarnings={isConnected ? lifetimeEarnings : undefined} />
            <VaultCard vault={vault} onDone={onDone} />
            <p className="px-1 text-xs text-pretty" style={{ color: 'var(--muted)' }}>
              Need test USDC? Use the{' '}
              <a
                href="https://faucet.circle.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 font-semibold"
                style={{ color: 'var(--accent-hover)' }}
              >
                Circle faucet <ExternalLink className="size-3" />
              </a>
              . Gas on Arc is paid in USDC, so one balance covers both.
            </p>
          </main>

          <aside className="space-y-4 lg:col-span-2">
            <ActivityCard items={data?.items} loading={activity.isLoading && isConnected} partial={data?.partial} />
            <ProtocolCard vault={vault} yields={data?.yields} />
            <RoadmapCard />
          </aside>
        </div>
      </div>
    </div>
  )
}
