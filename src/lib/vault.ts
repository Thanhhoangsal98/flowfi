import { parseAbi, type Address } from 'viem'
import { arcTestnet } from 'viem/chains'
import { getUsdc, requireChain } from '@/onchain-facts'

export const CHAIN_ID = arcTestnet.id
export const CHAIN = requireChain(CHAIN_ID)

const usdcFact = getUsdc(CHAIN_ID)
if (!usdcFact) throw new Error('USDC is not registered for Arc Testnet')
export const USDC_ADDRESS = usdcFact.address as Address

export const VAULT_ADDRESS = import.meta.env.VITE_FLOW_VAULT_ADDRESS as Address | undefined
export const VAULT_DEPLOY_BLOCK = BigInt((import.meta.env.VITE_FLOW_VAULT_DEPLOY_BLOCK as string | undefined) ?? '0')

export const vaultAbi = parseAbi([
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function convertToAssets(uint256) view returns (uint256)',
  'function previewDeposit(uint256) view returns (uint256)',
  'function maxDeposit(address) view returns (uint256)',
  'function maxWithdraw(address) view returns (uint256)',
  'function depositCap() view returns (uint256)',
  'function paused() view returns (bool)',
  'function lockedYield() view returns (uint256)',
  'function streamEnd() view returns (uint256)',
  'function yieldPeriod() view returns (uint256)',
  'function inceptionTimestamp() view returns (uint256)',
  'function owner() view returns (address)',
  'function deposit(uint256 assets, address receiver) returns (uint256)',
  'function withdraw(uint256 assets, address receiver, address owner) returns (uint256)',
  'function redeem(uint256 shares, address receiver, address owner) returns (uint256)',
  'event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)',
  'event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)',
  'event YieldAdded(address indexed owner, uint256 assets, uint256 totalAssetsAfter, uint256 totalSupplyAfter, uint256 streamEnd)',
])

export const usdcAbi = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
])
