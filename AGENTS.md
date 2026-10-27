# [App Name]

> Built with Arc Studio - money-powered apps in minutes

This is the **project memory** - what Arc Studio remembers about building this app. It helps future agents (or humans) understand and extend the project.

---

## What This App Does

[Brief description of what the app does and its primary use case]

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28 + Foundry. Sources in `contracts/`, unit tests in `contracts/test/*.t.sol`. Build with `bun run contracts:build` (`forge build`), test with `bun run contracts:test` (`forge test`).
- Wallet: injected (MetaMask, etc.)
- Chain: Arc Testnet (Chain ID: 5042002, imported from `viem/chains`)
- Token: USDC (6 decimals) (Address: 0x3600000000000000000000000000000000000000, Chain: Arc Testnet)
- Toasts: Sonner

## Key Files

- `src/App.tsx` - Main application logic
- `src/components/` - UI components
- `src/config.ts` - wagmi config (chains, connectors, transports)

## To Run

```bash
bun install
bun run dev
```

## FlowFi notes

- FlowVault (ERC-4626, fvUSDC, owner-funded yield streamed over 7 days, 100,000 USDC cap, 0% fees) deployed on Arc Testnet at 0xa6a10d5b0ab7123fad22ff2cdff5bd7474cd78c8 (deploy block 69308721). Constructor: USDC, platform deployer as owner, cap, yieldPeriod.
- Address and deploy block live in `.env` as VITE_FLOW_VAULT_ADDRESS and VITE_FLOW_VAULT_DEPLOY_BLOCK. Restart Vite after changing them.
- Owner is the shared platform wallet, so `addYield`, `pause` and `setDepositCap` cannot be called from a user wallet. Redeploy via self-deploy to own the vault.
- Phase 1 only (wallet, vault, activity, protocol status). Lending, swaps, liquidity are roadmap placeholders, not implemented.
