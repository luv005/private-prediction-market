import { useState } from 'react'
import { useReadContract, useChainId } from 'wagmi'
import { sapphireTestnet } from '../lib/wagmi'
import { CONTRACTS, DARK_MATCHER_ABI } from '../lib/contracts'

interface MarketListProps {
  onSelectMarket: (marketId: `0x${string}`) => void
  selectedMarketId?: `0x${string}`
}

export function MarketList({ onSelectMarket, selectedMarketId }: MarketListProps) {
  const chainId = useChainId()
  const [showResolved, setShowResolved] = useState(false)

  // Get all market IDs
  const { data: marketIds } = useReadContract({
    address: CONTRACTS.DARK_MATCHER,
    abi: DARK_MATCHER_ABI,
    functionName: 'getMarketIds',
    chainId: sapphireTestnet.id,
  })

  if (chainId !== sapphireTestnet.id) {
    return (
      <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
        <h2 className="text-xl font-bold mb-4">Markets</h2>
        <p className="text-gray-400">Switch to Sapphire Testnet to view markets</p>
      </div>
    )
  }

  return (
    <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Markets</h2>
        <button
          onClick={() => setShowResolved(!showResolved)}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          {showResolved ? 'Hide Settled' : 'Show Settled'}
        </button>
      </div>

      {!marketIds || marketIds.length === 0 ? (
        <p className="text-gray-400">No markets yet</p>
      ) : (
        <div className="space-y-3">
          {marketIds.map((marketId) => (
            <MarketCard
              key={marketId}
              marketId={marketId}
              isSelected={marketId === selectedMarketId}
              onSelect={() => onSelectMarket(marketId)}
              showResolved={showResolved}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function MarketCard({
  marketId,
  isSelected,
  onSelect,
  showResolved,
}: {
  marketId: `0x${string}`
  isSelected: boolean
  onSelect: () => void
  showResolved: boolean
}) {
  const { data: marketData } = useReadContract({
    address: CONTRACTS.DARK_MATCHER,
    abi: DARK_MATCHER_ABI,
    functionName: 'getMarket',
    args: [marketId],
    chainId: sapphireTestnet.id,
  })

  if (!marketData) return null

  const [question, expiresAt, resolved, outcome, totalVolume] = marketData
  const expiresDate = new Date(Number(expiresAt) * 1000)
  const isExpired = Date.now() > Number(expiresAt) * 1000

  // Hide resolved markets unless showResolved is true
  if (resolved && !showResolved) return null

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-lg border transition-colors ${
        isSelected
          ? 'bg-dark-600 border-accent-blue glow-blue'
          : resolved
          ? 'bg-dark-700/50 border-dark-600 hover:border-gray-500 opacity-75'
          : 'bg-dark-700 border-dark-600 hover:border-gray-500'
      }`}
    >
      <div className="font-medium mb-2">{question}</div>
      <div className="flex justify-between text-sm text-gray-400">
        <span>
          Volume: ${(Number(totalVolume) / 1e6).toLocaleString()}
        </span>
        <span className={resolved ? (outcome ? 'text-accent-green' : 'text-accent-red') : isExpired ? 'text-accent-red' : ''}>
          {resolved ? (outcome ? 'YES Won' : 'NO Won') : isExpired ? 'Expired' : `Expires: ${expiresDate.toLocaleDateString()}`}
        </span>
      </div>
    </button>
  )
}
