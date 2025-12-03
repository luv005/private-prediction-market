import { useState } from 'react'
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { baseSepolia, sapphireTestnet } from '../lib/wagmi'

export function ConnectButton() {
  const [showWalletModal, setShowWalletModal] = useState(false)
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const handleConnect = (connector: typeof connectors[0]) => {
    connect({ connector })
    setShowWalletModal(false)
  }

  if (!isConnected) {
    return (
      <>
        <button
          onClick={() => setShowWalletModal(true)}
          className="bg-accent-blue hover:bg-blue-600 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Connect Wallet
        </button>

        {/* Wallet Selection Modal */}
        {showWalletModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowWalletModal(false)}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Connect Wallet</h2>
                <button
                  onClick={() => setShowWalletModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Wallet List */}
              <div className="p-2">
                {connectors.map((connector) => {
                  const isRecent = connector.name === 'MetaMask' // You can track this in localStorage
                  const isDetected = connector.type === 'injected'

                  return (
                    <button
                      key={connector.uid}
                      onClick={() => handleConnect(connector)}
                      disabled={isPending}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {/* Wallet Icon */}
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden">
                        {connector.icon ? (
                          <img src={connector.icon} alt={connector.name} className="w-8 h-8" />
                        ) : (
                          <WalletIcon name={connector.name} />
                        )}
                      </div>

                      {/* Wallet Name */}
                      <span className="flex-1 text-left font-medium text-gray-900">
                        {connector.name}
                      </span>

                      {/* Status Badge */}
                      {isRecent && (
                        <span className="px-2 py-1 text-xs font-medium text-pink-500 bg-pink-50 rounded-full">
                          Recent
                        </span>
                      )}
                      {!isRecent && isDetected && (
                        <span className="text-sm text-gray-400">
                          Detected
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-500">
                  By connecting, you agree to the Terms of Service
                </p>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

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

// Fallback wallet icons
function WalletIcon({ name }: { name: string }) {
  const colors: Record<string, string> = {
    'MetaMask': 'bg-orange-100',
    'Coinbase Wallet': 'bg-blue-100',
    'WalletConnect': 'bg-blue-100',
    'Injected': 'bg-gray-100',
  }

  const icons: Record<string, string> = {
    'MetaMask': '🦊',
    'Coinbase Wallet': '💰',
    'WalletConnect': '🔗',
    'Rabby Wallet': '🐰',
    'Phantom': '👻',
  }

  return (
    <div className={`w-12 h-12 rounded-xl ${colors[name] || 'bg-purple-100'} flex items-center justify-center text-2xl`}>
      {icons[name] || '💳'}
    </div>
  )
}
