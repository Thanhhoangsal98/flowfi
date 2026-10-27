/**
 * wagmi configuration
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { arcTestnet } from 'viem/chains'
import { injected } from 'wagmi/connectors'
import { requireChain } from './onchain-facts'
import { registerChain } from './tracing'

const arcRpc = requireChain(arcTestnet.id).rpcUrls[0]

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(arcTestnet.id, arcRpc)

export const config = createConfig({
  chains: [arcTestnet, mainnet], // mainnet needed for ENS resolution
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http(arcRpc),
    [mainnet.id]: http(), // ENS resolution uses mainnet
  },
})
