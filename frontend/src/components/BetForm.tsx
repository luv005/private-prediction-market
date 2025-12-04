import { useState } from 'react'
import { useAccount, useWriteContract, useReadContract, useChainId, useWaitForTransactionReceipt } from 'wagmi'
import { sapphireTestnet } from '../lib/wagmi'
import { CONTRACTS, DARK_MATCHER_ABI } from '../lib/contracts'
import { encryptOrder, parseUSDC, parsePrice, formatUSDC } from '../lib/encryption'

interface BetFormProps {
  marketId?: `0x${string}`
}

export function BetForm({ marketId }: BetFormProps) {
  const [side, setSide] = useState<'yes' | 'no'>('yes')
  const [price, setPrice] = useState('50') // percentage
  const [amount, setAmount] = useState('')
  const [useEncryption, setUseEncryption] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { address } = useAccount()
  const chainId = useChainId()
  const { writeContract, data: hash, isPending, reset } = useWriteContract()

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({ hash })

  // Get balance on Sapphire
  const { data: balance } = useReadContract({
    address: CONTRACTS.DARK_MATCHER,
    abi: DARK_MATCHER_ABI,
    functionName: 'getBalance',
    args: address ? [address] : undefined,
    chainId: sapphireTestnet.id,
  })

  // Get encryption public key
  const { data: encryptionPubKey } = useReadContract({
    address: CONTRACTS.DARK_MATCHER,
    abi: DARK_MATCHER_ABI,
    functionName: 'getEncryptionPublicKey',
    chainId: sapphireTestnet.id,
  })

  // Get position
  const { data: position } = useReadContract({
    address: CONTRACTS.DARK_MATCHER,
    abi: DARK_MATCHER_ABI,
    functionName: 'getMyPosition',
    args: marketId ? [marketId] : undefined,
    chainId: sapphireTestnet.id,
    account: address, // Required for msg.sender to work on Sapphire
  })

  const handleSubmit = () => {
    if (!marketId || !amount || !encryptionPubKey) return

    setError(null)
    const amountBigInt = parseUSDC(amount)
    const priceBigInt = parsePrice(price)

    if (useEncryption) {
      // Encrypt order before submission
      const { encrypted, nonce } = encryptOrder(
        marketId,
        side === 'yes',
        priceBigInt,
        amountBigInt,
        encryptionPubKey
      )

      writeContract({
        address: CONTRACTS.DARK_MATCHER,
        abi: DARK_MATCHER_ABI,
        functionName: 'submitDarkIntent',
        args: [encrypted, nonce],
      }, {
        onSuccess: () => setAmount(''),
        onError: (err) => setError(err.message),
      })
    } else {
      // Direct submission (for testing)
      writeContract({
        address: CONTRACTS.DARK_MATCHER,
        abi: DARK_MATCHER_ABI,
        functionName: 'submitOrder',
        args: [marketId, side === 'yes', priceBigInt, amountBigInt],
      }, {
        onSuccess: () => setAmount(''),
        onError: (err) => setError(err.message),
      })
    }
  }

  const getExplorerUrl = (txHash: string) => {
    return `https://explorer.oasis.io/testnet/sapphire/tx/${txHash}`
  }

  if (chainId !== sapphireTestnet.id) {
    return (
      <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
        <h2 className="text-xl font-bold mb-4">Place Bet</h2>
        <p className="text-gray-400">Switch to Sapphire Testnet to place bets</p>
      </div>
    )
  }

  if (!marketId) {
    return (
      <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
        <h2 className="text-xl font-bold mb-4">Place Bet</h2>
        <p className="text-gray-400">Select a market to place a bet</p>
      </div>
    )
  }

  const [available, locked] = balance || [0n, 0n]
  const [yesShares, noShares, totalCost] = position || [0n, 0n, 0n]

  // Calculate potential profit
  const amountNum = parseFloat(amount) || 0
  const priceNum = parseFloat(price) || 50
  const potentialProfit = amountNum * (100 / priceNum - 1)

  return (
    <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
      <h2 className="text-xl font-bold mb-4">Place Bet</h2>

      {/* Balance */}
      <div className="mb-4 p-3 bg-dark-700 rounded-lg">
        <div className="text-sm text-gray-400">Available Balance</div>
        <div className="text-lg font-bold">${formatUSDC(available)} USDC</div>
        {locked > 0n && (
          <div className="text-sm text-gray-500">Locked: ${formatUSDC(locked)}</div>
        )}
      </div>

      {/* Position */}
      {(yesShares > 0n || noShares > 0n) && (
        <div className="mb-4 p-3 bg-dark-700 rounded-lg">
          <div className="text-sm text-gray-400">Your Position</div>
          <div className="flex gap-4 mt-1">
            <span className="text-accent-green">YES: {formatUSDC(yesShares)} shares</span>
            <span className="text-accent-red">NO: {formatUSDC(noShares)} shares</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Side Selection */}
        <div className="flex gap-2">
          <button
            onClick={() => setSide('yes')}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
              side === 'yes'
                ? 'bg-accent-green text-white'
                : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
            }`}
          >
            YES
          </button>
          <button
            onClick={() => setSide('no')}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
              side === 'no'
                ? 'bg-accent-red text-white'
                : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
            }`}
          >
            NO
          </button>
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Price (your max cost per share)
          </label>
          <div className="relative">
            <input
              type="range"
              min="1"
              max="99"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full"
            />
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-500">1%</span>
              <span className="text-accent-blue font-bold">{price}%</span>
              <span className="text-gray-500">99%</span>
            </div>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Amount (USDC)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100"
            className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-lg focus:outline-none focus:border-accent-blue"
          />
        </div>

        {/* Potential Profit */}
        {amountNum > 0 && (
          <div className="p-3 bg-dark-700 rounded-lg">
            <div className="text-sm text-gray-400">If {side.toUpperCase()} wins:</div>
            <div className="text-lg font-bold text-accent-green">
              +${potentialProfit.toFixed(2)} profit
            </div>
          </div>
        )}

        {/* Encryption Toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useEncryption}
            onChange={(e) => setUseEncryption(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm text-gray-400">
            Encrypt order (hide from mempool)
          </span>
        </label>

        {/* Transaction Notifications */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-400 text-sm">
            {error.slice(0, 100)}
            <button onClick={() => { setError(null); reset(); }} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        )}

        {hash && !isSuccess && !isError && (
          <a
            href={getExplorerUrl(hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-blue-500/20 border border-blue-500 rounded-lg p-3 text-blue-400 text-sm hover:bg-blue-500/30 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span>{isConfirming ? 'Confirming transaction...' : 'Transaction sent!'}</span>
              <span className="underline">View on Explorer</span>
            </div>
            <div className="text-xs mt-1 text-blue-300 truncate">{hash}</div>
          </a>
        )}

        {isSuccess && (
          <a
            href={getExplorerUrl(hash!)}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-green-500/20 border border-green-500 rounded-lg p-3 text-green-400 text-sm hover:bg-green-500/30 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span>Order submitted successfully!</span>
              <span className="underline">View on Explorer</span>
            </div>
          </a>
        )}

        {isError && (
          <a
            href={getExplorerUrl(hash!)}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-400 text-sm hover:bg-red-500/30 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span>Transaction failed</span>
              <span className="underline">View on Explorer</span>
            </div>
          </a>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!amount || isPending || isConfirming}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            side === 'yes'
              ? 'bg-accent-green hover:bg-green-600'
              : 'bg-accent-red hover:bg-red-600'
          } disabled:bg-gray-600 disabled:cursor-not-allowed`}
        >
          {isPending
            ? 'Confirm in wallet...'
            : isConfirming
            ? 'Confirming...'
            : useEncryption
            ? `Submit Dark ${side.toUpperCase()} Order`
            : `Submit ${side.toUpperCase()} Order`}
        </button>
      </div>

      {useEncryption && (
        <p className="mt-4 text-sm text-gray-500">
          Your order will be encrypted before submission. Only the TEE can decrypt and match it.
        </p>
      )}
    </div>
  )
}
