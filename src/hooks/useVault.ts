import { useCallback } from 'react'
import { useAccount, useReadContracts } from 'wagmi'
import { CHAIN_ID, USDC_ADDRESS, VAULT_ADDRESS, usdcAbi, vaultAbi } from '@/lib/vault'

const PROBE_SHARES = 10n ** 18n // large probe so the share price keeps 12 digits of precision
const PROBE_DIVISOR = 1e12 // 1e18 shares of a 12-decimal token = 1e6 tokens, priced in 6-decimal USDC units

export function useVault() {
  const { address } = useAccount()
  const enabled = Boolean(VAULT_ADDRESS)
  const vault = { address: VAULT_ADDRESS as `0x${string}`, abi: vaultAbi, chainId: CHAIN_ID } as const
  const usdcToken = { address: USDC_ADDRESS, abi: usdcAbi, chainId: CHAIN_ID } as const

  const globals = useReadContracts({
    allowFailure: false,
    query: { enabled, refetchInterval: 15_000 },
    contracts: [
      { ...vault, functionName: 'totalAssets' },
      { ...vault, functionName: 'totalSupply' },
      { ...vault, functionName: 'depositCap' },
      { ...vault, functionName: 'paused' },
      { ...vault, functionName: 'lockedYield' },
      { ...vault, functionName: 'streamEnd' },
      { ...vault, functionName: 'yieldPeriod' },
      { ...vault, functionName: 'inceptionTimestamp' },
      { ...vault, functionName: 'decimals' },
      { ...vault, functionName: 'convertToAssets', args: [PROBE_SHARES] },
      { ...vault, functionName: 'owner' },
    ],
  })

  const mine = useReadContracts({
    allowFailure: false,
    query: { enabled: enabled && Boolean(address), refetchInterval: 15_000 },
    contracts: [
      { ...vault, functionName: 'balanceOf', args: [address as `0x${string}`] },
      { ...vault, functionName: 'maxWithdraw', args: [address as `0x${string}`] },
      { ...vault, functionName: 'maxDeposit', args: [address as `0x${string}`] },
      { ...usdcToken, functionName: 'balanceOf', args: [address as `0x${string}`] },
      { ...usdcToken, functionName: 'allowance', args: [address as `0x${string}`, VAULT_ADDRESS as `0x${string}`] },
    ],
  })

  const g = globals.data
  const m = mine.data
  const sharePrice = g ? Number(g[9]) / PROBE_DIVISOR : undefined

  const { refetch: refetchGlobals } = globals
  const { refetch: refetchMine } = mine
  const refetch = useCallback(async () => {
    await Promise.all([refetchGlobals(), refetchMine()])
  }, [refetchGlobals, refetchMine])

  return {
    enabled,
    loading: globals.isLoading,
    failed: globals.isError,
    refetch,
    totalAssets: g?.[0],
    totalSupply: g?.[1],
    depositCap: g?.[2],
    paused: g?.[3],
    lockedYield: g?.[4],
    streamEnd: g ? Number(g[5]) : undefined,
    yieldPeriod: g ? Number(g[6]) : undefined,
    inception: g ? Number(g[7]) : undefined,
    shareDecimals: g?.[8],
    owner: g?.[10],
    sharePrice,
    shares: m?.[0],
    position: m?.[1],
    maxDeposit: m?.[2],
    walletUsdc: m?.[3],
    allowance: m?.[4],
  }
}

export type VaultState = ReturnType<typeof useVault>
