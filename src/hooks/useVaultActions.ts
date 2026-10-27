import { useCallback, useState } from 'react'
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi'
import { CHAIN_ID, USDC_ADDRESS, VAULT_ADDRESS, usdcAbi, vaultAbi } from '@/lib/vault'
import { parseOnchainError } from '@/lib/utils'

export type TxPhase =
  | 'idle'
  | 'switching'
  | 'approve-wallet'
  | 'approve-confirming'
  | 'wallet'
  | 'confirming'
  | 'success'
  | 'error'

export interface TxState {
  phase: TxPhase
  hash?: `0x${string}`
  error?: string
}

export function useVaultActions(onDone: () => void) {
  const { address, chainId } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const client = usePublicClient({ chainId: CHAIN_ID })
  const [tx, setTx] = useState<TxState>({ phase: 'idle' })

  const reset = useCallback(() => setTx({ phase: 'idle' }), [])

  const fail = useCallback((err: unknown) => {
    const message = parseOnchainError(err)
    setTx(message ? { phase: 'error', error: message } : { phase: 'idle' })
  }, [])

  const confirm = useCallback(
    async (hash: `0x${string}`) => {
      if (!client) throw new Error('network unavailable')
      const receipt = await client.waitForTransactionReceipt({ hash })
      if (receipt.status !== 'success') throw new Error('reverted')
    },
    [client],
  )

  const ensureChain = useCallback(async () => {
    if (chainId !== CHAIN_ID) {
      setTx({ phase: 'switching' })
      await switchChainAsync({ chainId: CHAIN_ID })
    }
  }, [chainId, switchChainAsync])

  const deposit = useCallback(
    async (assets: bigint, allowance: bigint) => {
      if (!address || !VAULT_ADDRESS) return
      try {
        await ensureChain()
        if (allowance < assets) {
          setTx({ phase: 'approve-wallet' })
          const approveHash = await writeContractAsync({
            address: USDC_ADDRESS,
            abi: usdcAbi,
            functionName: 'approve',
            args: [VAULT_ADDRESS, assets],
            chainId: CHAIN_ID,
          })
          setTx({ phase: 'approve-confirming', hash: approveHash })
          await confirm(approveHash)
        }
        setTx({ phase: 'wallet' })
        const hash = await writeContractAsync({
          address: VAULT_ADDRESS,
          abi: vaultAbi,
          functionName: 'deposit',
          args: [assets, address],
          chainId: CHAIN_ID,
        })
        setTx({ phase: 'confirming', hash })
        await confirm(hash)
        setTx({ phase: 'success', hash })
        onDone()
      } catch (err) {
        fail(err)
      }
    },
    [address, confirm, ensureChain, fail, onDone, writeContractAsync],
  )

  /** `redeemAllShares` set => exits the full position with redeem so no dust remains. */
  const withdraw = useCallback(
    async (assets: bigint, redeemAllShares?: bigint) => {
      if (!address || !VAULT_ADDRESS) return
      try {
        await ensureChain()
        setTx({ phase: 'wallet' })
        const hash =
          redeemAllShares !== undefined
            ? await writeContractAsync({
                address: VAULT_ADDRESS,
                abi: vaultAbi,
                functionName: 'redeem',
                args: [redeemAllShares, address, address],
                chainId: CHAIN_ID,
              })
            : await writeContractAsync({
                address: VAULT_ADDRESS,
                abi: vaultAbi,
                functionName: 'withdraw',
                args: [assets, address, address],
                chainId: CHAIN_ID,
              })
        setTx({ phase: 'confirming', hash })
        await confirm(hash)
        setTx({ phase: 'success', hash })
        onDone()
      } catch (err) {
        fail(err)
      }
    },
    [address, confirm, ensureChain, fail, onDone, writeContractAsync],
  )

  return { tx, deposit, withdraw, reset }
}
