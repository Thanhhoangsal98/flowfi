import { useQuery } from '@tanstack/react-query'
import { usePublicClient } from 'wagmi'
import { parseAbiItem, type Address } from 'viem'
import { CHAIN_ID, VAULT_ADDRESS, VAULT_DEPLOY_BLOCK } from '@/lib/vault'

const depositEvent = parseAbiItem(
  'event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)',
)
const withdrawEvent = parseAbiItem(
  'event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)',
)
const yieldEvent = parseAbiItem(
  'event YieldAdded(address indexed owner, uint256 assets, uint256 totalAssetsAfter, uint256 totalSupplyAfter, uint256 streamEnd)',
)

export interface ActivityItem {
  kind: 'deposit' | 'withdraw'
  assets: bigint
  shares: bigint
  hash: `0x${string}`
  blockNumber: bigint
  logIndex: number
  timestamp?: number
}

export interface YieldItem {
  assets: bigint
  hash: `0x${string}`
  blockNumber: bigint
  logIndex: number
  streamEnd: number
  timestamp?: number
}

const RECENT_WINDOW = 500_000n // fallback lookback if a full-range query is rejected
const LIST_LIMIT = 15

export function useActivity(account: Address | undefined, refreshKey: number) {
  const client = usePublicClient({ chainId: CHAIN_ID })

  return useQuery({
    queryKey: ['flowfi-activity', account, refreshKey],
    enabled: Boolean(client && VAULT_ADDRESS && account),
    refetchInterval: 30_000,
    queryFn: async () => {
      if (!client || !VAULT_ADDRESS || !account) throw new Error('not ready')
      const head = await client.getBlockNumber()
      const base = { address: VAULT_ADDRESS, toBlock: head } as const

      const fetchAll = async (fromBlock: bigint) => {
        const [dep, wd, yl] = await Promise.all([
          client.getLogs({ ...base, fromBlock, event: depositEvent, args: { owner: account } }),
          client.getLogs({ ...base, fromBlock, event: withdrawEvent, args: { owner: account } }),
          client.getLogs({ ...base, fromBlock, event: yieldEvent }),
        ])
        return { dep, wd, yl }
      }

      // Start from the deployment block, never from genesis. If the range is rejected, scan recent blocks only.
      const start = VAULT_DEPLOY_BLOCK > 0n ? VAULT_DEPLOY_BLOCK : head > RECENT_WINDOW ? head - RECENT_WINDOW : 0n
      let partial = false
      let logs
      try {
        logs = await fetchAll(start)
      } catch {
        partial = true
        logs = await fetchAll(head > RECENT_WINDOW ? head - RECENT_WINDOW : 0n)
      }

      const items: ActivityItem[] = [
        ...logs.dep.map((l) => ({
          kind: 'deposit' as const,
          assets: l.args.assets ?? 0n,
          shares: l.args.shares ?? 0n,
          hash: l.transactionHash,
          blockNumber: l.blockNumber,
          logIndex: l.logIndex,
        })),
        ...logs.wd.map((l) => ({
          kind: 'withdraw' as const,
          assets: l.args.assets ?? 0n,
          shares: l.args.shares ?? 0n,
          hash: l.transactionHash,
          blockNumber: l.blockNumber,
          logIndex: l.logIndex,
        })),
      ].sort((a, b) => (a.blockNumber === b.blockNumber ? b.logIndex - a.logIndex : Number(b.blockNumber - a.blockNumber)))

      const yields: YieldItem[] = logs.yl
        .map((l) => ({
          assets: l.args.assets ?? 0n,
          hash: l.transactionHash,
          blockNumber: l.blockNumber,
          logIndex: l.logIndex,
          streamEnd: Number(l.args.streamEnd ?? 0n),
        }))
        .reverse()

      const totalDeposited = items.filter((i) => i.kind === 'deposit').reduce((s, i) => s + i.assets, 0n)
      const totalWithdrawn = items.filter((i) => i.kind === 'withdraw').reduce((s, i) => s + i.assets, 0n)

      const recent = items.slice(0, LIST_LIMIT)
      const recentYields = yields.slice(0, 5)
      const blocks = [...new Set([...recent, ...recentYields].map((i) => i.blockNumber))]
      const stamps = new Map<bigint, number>()
      await Promise.all(
        blocks.map(async (blockNumber) => {
          try {
            const block = await client.getBlock({ blockNumber })
            stamps.set(blockNumber, Number(block.timestamp))
          } catch {
            /* timestamp stays undefined */
          }
        }),
      )

      return {
        partial,
        totalDeposited,
        totalWithdrawn,
        items: recent.map((i) => ({ ...i, timestamp: stamps.get(i.blockNumber) })),
        yields: recentYields.map((y) => ({ ...y, timestamp: stamps.get(y.blockNumber) })),
      }
    },
  })
}
