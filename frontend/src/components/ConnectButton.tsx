import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { baseSepolia, sapphireTestnet } from '../lib/wagmi'

export function ConnectButton() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  if (!isConnected) {
    return (
      <button
        onClick={() => connect({ connector: connectors[0] })}
        className="bg-accent-blue hover:bg-blue-600 px-4 py-2 rounded-lg font-medium transition-colors"
      >
        Connect Wallet
      </button>
    )
  }

  const currentChain = chainId === sapphireTestnet.id ? 'Sapphire' : chainId === baseSepolia.id ? 'Base' : 'Unknown'

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <select
          value={chainId}
          onChange={(e) => switchChain({ chainId: Number(e.target.value) })}
          className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm"
        >
          <option value={baseSepolia.id}>Base Sepolia</option>
          <option value={sapphireTestnet.id}>Sapphire Testnet</option>
        </select>
      </div>
      <div className="bg-dark-700 px-3 py-2 rounded-lg text-sm">
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </div>
      <button
        onClick={() => disconnect()}
        className="text-gray-400 hover:text-white text-sm"
      >
        Disconnect
      </button>
    </div>
  )
}
