import { http, createConfig } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

// Custom Sapphire Testnet chain
const sapphireTestnet = {
  id: 23295,
  name: 'Oasis Sapphire Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'TEST',
    symbol: 'TEST',
  },
  rpcUrls: {
    default: { http: ['https://testnet.sapphire.oasis.io'] },
    public: { http: ['https://testnet.sapphire.oasis.io'] },
  },
  blockExplorers: {
    default: { name: 'Oasis Explorer', url: 'https://explorer.oasis.io/testnet/sapphire' },
  },
  testnet: true,
} as const

export const config = createConfig({
  chains: [baseSepolia, sapphireTestnet],
  connectors: [
    injected(),
  ],
  transports: {
    [baseSepolia.id]: http(),
    [sapphireTestnet.id]: http(),
  },
})

export { baseSepolia, sapphireTestnet }
