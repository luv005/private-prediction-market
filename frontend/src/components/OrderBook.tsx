import { useReadContract, useAccount } from 'wagmi'
import { sapphireTestnet } from '../lib/wagmi'
import { CONTRACTS, DARK_MATCHER_ABI } from '../lib/contracts'
import { formatUSDC } from '../lib/encryption'

interface OrderBookProps {
  marketId?: `0x${string}`
}

export function OrderBook({ marketId }: OrderBookProps) {
  const { address } = useAccount()

  // Get anonymous order book depth
  const { data: orderBookData } = useReadContract({
    address: CONTRACTS.DARK_MATCHER,
    abi: DARK_MATCHER_ABI,
    functionName: 'getOrderBookDepth',
    args: marketId ? [marketId] : undefined,
    chainId: sapphireTestnet.id,
  })

  // Get user's own orders (requires signed call on Sapphire, may not work)
  const { data: myOrdersData } = useReadContract({
    address: CONTRACTS.DARK_MATCHER,
    abi: DARK_MATCHER_ABI,
    functionName: 'getMyOrders',
    args: marketId ? [marketId] : undefined,
    chainId: sapphireTestnet.id,
    account: address,
  })

  if (!marketId) {
    return (
      <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
        <h2 className="text-xl font-bold mb-4">Order Book</h2>
        <p className="text-gray-400 text-sm">Select a market to view order book</p>
      </div>
    )
  }

  const [yesPrices, yesAmounts, noPrices, noAmounts] = orderBookData || [[], [], [], []]
  const [orderIds, isYesOrders, orderPrices, orderAmounts] = myOrdersData || [[], [], [], []]

  // Combine and sort YES orders (highest price first)
  const yesOrders = yesPrices?.map((price: bigint, i: number) => ({
    price: Number(price) / 100,
    amount: yesAmounts[i],
  })).sort((a: { price: number }, b: { price: number }) => b.price - a.price) || []

  // Combine and sort NO orders (highest price first)
  const noOrders = noPrices?.map((price: bigint, i: number) => ({
    price: Number(price) / 100,
    amount: noAmounts[i],
  })).sort((a: { price: number }, b: { price: number }) => b.price - a.price) || []

  // User's open orders
  const myOrders = orderIds?.map((id: string, i: number) => ({
    id,
    isYes: isYesOrders[i],
    price: Number(orderPrices[i]) / 100,
    amount: orderAmounts[i],
  })) || []

  const maxYesAmount = yesOrders.length > 0
    ? Math.max(...yesOrders.map((o: { amount: bigint }) => Number(o.amount)))
    : 1

  const maxNoAmount = noOrders.length > 0
    ? Math.max(...noOrders.map((o: { amount: bigint }) => Number(o.amount)))
    : 1

  return (
    <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
      <h2 className="text-xl font-bold mb-4">Order Book</h2>
      <p className="text-xs text-gray-500 mb-4">Anonymous depth - no user info visible</p>

      <div className="grid grid-cols-2 gap-4">
        {/* YES Orders */}
        <div>
          <div className="text-sm font-medium text-accent-green mb-2">YES Bids</div>
          {yesOrders.length === 0 ? (
            <p className="text-gray-500 text-sm">No orders</p>
          ) : (
            <div className="space-y-1">
              {yesOrders.slice(0, 5).map((order: { price: number; amount: bigint }, i: number) => (
                <div key={i} className="relative">
                  <div
                    className="absolute inset-0 bg-accent-green/20 rounded"
                    style={{ width: `${(Number(order.amount) / maxYesAmount) * 100}%` }}
                  />
                  <div className="relative flex justify-between px-2 py-1 text-sm">
                    <span className="text-accent-green">{order.price.toFixed(1)}%</span>
                    <span className="text-gray-400">${formatUSDC(order.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* NO Orders */}
        <div>
          <div className="text-sm font-medium text-accent-red mb-2">NO Bids</div>
          {noOrders.length === 0 ? (
            <p className="text-gray-500 text-sm">No orders</p>
          ) : (
            <div className="space-y-1">
              {noOrders.slice(0, 5).map((order: { price: number; amount: bigint }, i: number) => (
                <div key={i} className="relative">
                  <div
                    className="absolute inset-0 bg-accent-red/20 rounded right-0"
                    style={{ width: `${(Number(order.amount) / maxNoAmount) * 100}%`, marginLeft: 'auto' }}
                  />
                  <div className="relative flex justify-between px-2 py-1 text-sm">
                    <span className="text-accent-red">{order.price.toFixed(1)}%</span>
                    <span className="text-gray-400">${formatUSDC(order.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User's Open Orders */}
      {myOrders.length > 0 && (
        <div className="mt-6 pt-4 border-t border-dark-600">
          <h3 className="text-sm font-medium mb-2">Your Open Orders</h3>
          <div className="space-y-2">
            {myOrders.map((order: { id: string; isYes: boolean; price: number; amount: bigint }) => (
              <div
                key={order.id}
                className="flex justify-between items-center bg-dark-700 rounded-lg px-3 py-2 text-sm"
              >
                <span className={order.isYes ? 'text-accent-green' : 'text-accent-red'}>
                  {order.isYes ? 'YES' : 'NO'} @ {order.price.toFixed(1)}%
                </span>
                <span className="text-gray-400">${formatUSDC(order.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
