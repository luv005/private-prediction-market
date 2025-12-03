import { http, createConfig } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { injected, metaMask, coinbaseWallet } from 'wagmi/connectors'
import { defineChain } from 'viem'

// Custom Sapphire Testnet chain
export const sapphireTestnet = defineChain({
  id: 23295,
  name: 'Oasis Sapphire Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'TEST',
    symbol: 'TEST',
  },
  rpcUrls: {
    default: { http: ['https://testnet.sapphire.oasis.io'] },
  },
  blockExplorers: {
    default: { name: 'Oasis Explorer', url: 'https://explorer.oasis.io/testnet/sapphire' },
  },
  testnet: true,
})

export const config = createConfig({
  chains: [baseSepolia, sapphireTestnet],
  connectors: [
    injected(),
    metaMask(),
    coinbaseWallet({ appName: 'DarkBet' }),
  ],
  transports: {
    [baseSepolia.id]: http(),
    [sapphireTestnet.id]: http(),
  },
})

export { baseSepolia }
