import { Amount, usdcDecimalsFor } from '@/onchain-money'
import { CHAIN_ID } from '@/lib/vault'

export const shortAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

export const USDC_DECIMALS = usdcDecimalsFor(CHAIN_ID)

export const usdc = (raw: bigint) => Amount.fromRaw(raw, USDC_DECIMALS)

/** Currency-style display with thousands separators, e.g. 1,234.56 */
export function fmtUsdc(raw: bigint | undefined, digits = 2): string {
  if (raw === undefined) return '...'
  const fixed = usdc(raw).toFixed(digits)
  const [whole, frac] = fixed.split('.')
  const sign = whole.startsWith('-') ? '-' : ''
  const body = whole.replace('-', '').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return frac ? `${sign}${body}.${frac}` : `${sign}${body}`
}

export function fmtDate(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function parseOnchainError(error: unknown): string | null {
  const e = error as { code?: number; shortMessage?: string; message?: string } | undefined
  const msg = (e?.shortMessage ?? e?.message ?? '').toLowerCase()
  if (e?.code === 4001 || msg.includes('user rejected') || msg.includes('user denied')) return null
  if (msg.includes('insufficient funds') || msg.includes('exceeds balance')) {
    return 'Insufficient balance. Add funds and try again.'
  }
  if (msg.includes('depositcapexceeded')) return 'This deposit would exceed the vault cap.'
  if (msg.includes('enforcedpause')) return 'Deposits are paused. Withdrawals still work.'
  if (msg.includes('reverted')) return 'Transaction failed onchain. Please try again.'
  if (msg.includes('network') || msg.includes('timeout')) return 'Network issue. Check your connection and retry.'
  return 'Something went wrong. Please try again.'
}
