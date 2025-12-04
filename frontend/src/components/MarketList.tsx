import { useReadContract, useChainId } from 'wagmi'
import { sapphireTestnet } from '../lib/wagmi'
import { CONTRACTS, DARK_MATCHER_ABI } from '../lib/contracts'

interface Market {
  marketId: `0x${string}`
  question: string
  expiresAt: bigint
  resolved: boolean
  outcome: boolean
  totalVolume: bigint
}

interface MarketListProps {
  onSelectMarket: (marketId: `0x${string}`) => void
  selectedMarketId?: `0x${string}`
}

export function MarketList({ onSelectMarket, selectedMarketId }: MarketListProps) {
  const chainId = useChainId()

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
      <h2 className="text-xl font-bold mb-4">Markets</h2>

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
}: {
  marketId: `0x${string}`
  isSelected: boolean
  onSelect: () => void
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

  // Hide resolved markets
  if (resolved) return null

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-lg border transition-colors ${
        isSelected
          ? 'bg-dark-600 border-accent-blue glow-blue'
          : 'bg-dark-700 border-dark-600 hover:border-gray-500'
      }`}
    >
      <div className="font-medium mb-2">{question}</div>
      <div className="flex justify-between text-sm text-gray-400">
        <span>
          Volume: ${(Number(totalVolume) / 1e6).toLocaleString()}
        </span>
        <span className={resolved ? 'text-accent-green' : isExpired ? 'text-accent-red' : ''}>
          {resolved ? (outcome ? 'YES Won' : 'NO Won') : isExpired ? 'Expired' : `Expires: ${expiresDate.toLocaleDateString()}`}
        </span>
      </div>
    </button>
  )
}
