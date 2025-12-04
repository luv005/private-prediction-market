import { useAccount, useReadContract } from 'wagmi'
import { sapphireTestnet } from '../lib/wagmi'
import { CONTRACTS, DARK_MATCHER_ABI } from '../lib/contracts'
import { formatUSDC } from '../lib/encryption'

interface MyPositionProps {
  marketId?: `0x${string}`
  marketQuestion?: string
}

export function MyPosition({ marketId, marketQuestion }: MyPositionProps) {
  const { address } = useAccount()

  // Get balance - always fetch
  const { data: balance } = useReadContract({
    address: CONTRACTS.DARK_MATCHER,
    abi: DARK_MATCHER_ABI,
    functionName: 'getBalance',
    args: address ? [address] : undefined,
    chainId: sapphireTestnet.id,
  })

  // Get position using address parameter (works with static calls)
  const { data: position, isLoading } = useReadContract({
    address: CONTRACTS.DARK_MATCHER,
    abi: DARK_MATCHER_ABI,
    functionName: 'getPosition',
    args: address && marketId ? [address, marketId] : undefined,
    chainId: sapphireTestnet.id,
  })

  // Get market info
  const { data: marketData } = useReadContract({
    address: CONTRACTS.DARK_MATCHER,
    abi: DARK_MATCHER_ABI,
    functionName: 'getMarket',
    args: marketId ? [marketId] : undefined,
    chainId: sapphireTestnet.id,
  })

  const [available, locked] = balance || [0n, 0n]
  const [yesShares, noShares, totalCost] = position || [0n, 0n, 0n]
  const [question, , resolved, outcome] = marketData || ['', 0n, false, false]

  const hasPosition = yesShares > 0n || noShares > 0n
  const hasLockedFunds = locked > 0n

  return (
    <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
      <h2 className="text-xl font-bold mb-4">My Account</h2>

      {/* Balance Summary - Always show */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-dark-700 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase">Available</div>
          <div className="text-lg font-bold text-white">${formatUSDC(available)}</div>
        </div>
        <div className="bg-dark-700 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase">Locked</div>
          <div className="text-lg font-bold text-yellow-400">${formatUSDC(locked)}</div>
        </div>
      </div>

      {/* Position Details - Only if market selected */}
      {!marketId ? (
        <div className="text-center py-4 text-gray-500 text-sm">
          Select a market to view your position
        </div>
      ) : isLoading ? (
        <div className="text-gray-400 text-sm">Loading position...</div>
      ) : resolved ? (
        // Settled market position
        <div className="space-y-3">
          <div className="text-xs text-gray-500 mb-3 p-2 bg-dark-700 rounded">
            {question || marketQuestion || 'Selected Market'}
          </div>

          <div className={`${outcome ? 'bg-accent-green/10 border-accent-green/30' : 'bg-accent-red/10 border-accent-red/30'} border rounded-lg p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`font-bold ${outcome ? 'text-accent-green' : 'text-accent-red'}`}>
                {outcome ? 'YES Won' : 'NO Won'}
              </span>
              <span className="text-xs text-gray-500">• Market Settled</span>
            </div>

            {hasPosition ? (
              <div className="text-sm text-gray-400">
                {yesShares > 0n && (
                  <div className="flex justify-between">
                    <span>Your YES shares:</span>
                    <span className={outcome ? 'text-accent-green font-medium' : 'text-gray-500 line-through'}>
                      {formatUSDC(yesShares)} {outcome ? '(Won!)' : '(Lost)'}
                    </span>
                  </div>
                )}
                {noShares > 0n && (
                  <div className="flex justify-between">
                    <span>Your NO shares:</span>
                    <span className={!outcome ? 'text-accent-red font-medium' : 'text-gray-500 line-through'}>
                      {formatUSDC(noShares)} {!outcome ? '(Won!)' : '(Lost)'}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500">You had no position in this market</div>
            )}
          </div>
        </div>
      ) : hasPosition ? (
        <div className="space-y-3">
          {/* Market Context */}
          <div className="text-xs text-gray-500 mb-3 p-2 bg-dark-700 rounded">
            {question || marketQuestion || 'Selected Market'}
          </div>

          {yesShares > 0n && (
            <div className="bg-accent-green/10 border border-accent-green/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-accent-green"></div>
                  <span className="font-bold text-accent-green text-lg">YES</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-white text-xl">{formatUSDC(yesShares)}</div>
                  <div className="text-xs text-gray-400">shares</div>
                </div>
              </div>
              <div className="text-sm text-gray-400 mt-2 pt-2 border-t border-accent-green/20">
                Payout if YES wins: <span className="text-accent-green font-medium">${formatUSDC(yesShares)}</span>
              </div>
            </div>
          )}

          {noShares > 0n && (
            <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-accent-red"></div>
                  <span className="font-bold text-accent-red text-lg">NO</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-white text-xl">{formatUSDC(noShares)}</div>
                  <div className="text-xs text-gray-400">shares</div>
                </div>
              </div>
              <div className="text-sm text-gray-400 mt-2 pt-2 border-t border-accent-red/20">
                Payout if NO wins: <span className="text-accent-red font-medium">${formatUSDC(noShares)}</span>
              </div>
            </div>
          )}

          {totalCost > 0n && (
            <div className="text-sm text-gray-500 text-center mt-2">
              Total invested: ${formatUSDC(totalCost)} USDC
            </div>
          )}
        </div>
      ) : hasLockedFunds ? (
        <div className="space-y-3">
          {/* Has locked funds but no matched position yet */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium text-yellow-400">Pending Orders</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">${formatUSDC(locked)}</div>
            <div className="text-sm text-gray-400">
              Locked in open orders waiting to be matched
            </div>
          </div>
          <div className="text-xs text-gray-500 text-center">
            Orders will be matched when a counterparty places a compatible order
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-dark-700 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div className="text-gray-400 text-sm mb-1">No position in this market</div>
          <div className="text-xs text-gray-600">Place a bet above to open a position</div>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="mt-4 pt-4 border-t border-dark-600">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Position data is private - only you can see this</span>
        </div>
      </div>
    </div>
  )
}
