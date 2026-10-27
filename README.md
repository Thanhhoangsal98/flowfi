# FlowFi

FlowFi is a smart money hub on Arc Testnet. In this first phase you connect a wallet, see your USDC balance, deposit into a USDC Earn vault, withdraw at any time, and review your activity and the protocol's status.

Built with [Arc Studio](https://studio.arc.io)

## What you can do

- Connect an injected wallet (such as MetaMask) and switch to Arc Testnet.
- See your portfolio value split between wallet USDC and the Earn vault.
- Deposit and withdraw USDC and receive an fvUSDC receipt token.
- Review vault capacity, share price, fees (0%), pause status and yield additions.
- See your deposit and withdrawal history with explorer links.

Lending, swaps, liquidity and mainnet are on the roadmap and not yet available. Yield is added by the vault operator and is never guaranteed. This is a testnet preview and has not had an independent audit.

## Tech stack

React, Vite, TypeScript, Tailwind CSS, wagmi, viem, ConnectKit, Solidity (OpenZeppelin) and Foundry.

## Development

Prerequisites: Bun and Foundry.

```bash
bun install
bun run dev
```

Other commands: `bun run build`, `bun run check` (lint and typecheck), `bun run contracts:build`, `bun run contracts:test`.

### Environment variables

- `VITE_FLOW_VAULT_ADDRESS`: address of the deployed vault contract on Arc Testnet.
- `VITE_FLOW_VAULT_DEPLOY_BLOCK`: block the vault was deployed at, where activity scanning starts.

Restart the dev server after changing `.env`.
