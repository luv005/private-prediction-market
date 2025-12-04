import { useState } from 'react'
import { useAccount, useWriteContract, useReadContract, useChainId, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { baseSepolia } from '../lib/wagmi'
import { CONTRACTS, LIQUIDITY_POOL_ABI, ERC20_ABI } from '../lib/contracts'

export function DepositForm() {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { address } = useAccount()
  const chainId = useChainId()
  const { writeContract, data: hash, isPending, reset } = useWriteContract()

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  // Read USDC balance
  const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: baseSepolia.id,
  })

  // Read allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.LIQUIDITY_POOL] : undefined,
    chainId: baseSepolia.id,
  })

  // Read pool balance
  const { data: poolBalance, refetch: refetchPool } = useReadContract({
    address: CONTRACTS.LIQUIDITY_POOL,
    abi: LIQUIDITY_POOL_ABI,
    functionName: 'balances',
    args: address ? [address] : undefined,
    chainId: baseSepolia.id,
  })

  // Refetch after success
  if (isSuccess) {
    setTimeout(() => {
      refetchBalance()
      refetchAllowance()
      refetchPool()
      reset()
    }, 1000)
  }

  const handleApprove = () => {
    if (!amount) return
    setError(null)
    writeContract({
      address: CONTRACTS.USDC,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACTS.LIQUIDITY_POOL, parseUnits(amount, 6)],
    }, {
      onError: (err) => setError(err.message),
    })
  }

  const handleDeposit = () => {
    if (!amount) return
    setError(null)
    writeContract({
      address: CONTRACTS.LIQUIDITY_POOL,
      abi: LIQUIDITY_POOL_ABI,
      functionName: 'deposit',
      args: [parseUnits(amount, 6)],
    }, {
      onSuccess: () => setAmount(''),
      onError: (err) => setError(err.message),
    })
  }

  const needsApproval = amount && allowance !== undefined
    ? parseUnits(amount, 6) > allowance
    : false

  if (chainId !== baseSepolia.id) {
    return (
      <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
        <h2 className="text-xl font-bold mb-4">Deposit USDC</h2>
        <p className="text-gray-400">Switch to Base Sepolia to deposit</p>
      </div>
    )
  }

  return (
    <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
      <h2 className="text-xl font-bold mb-4">Deposit USDC</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            USDC Balance: {usdcBalance ? (Number(usdcBalance) / 1e6).toFixed(2) : '0.00'}
          </label>
          <label className="block text-sm text-gray-400 mb-2">
            Pool Balance: {poolBalance ? (Number(poolBalance) / 1e6).toFixed(2) : '0.00'}
          </label>
        </div>

        <div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (USDC)"
            className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-lg focus:outline-none focus:border-accent-blue"
          />
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-400 text-sm">
            {error.slice(0, 100)}
          </div>
        )}

        {isSuccess && (
          <div className="bg-green-500/20 border border-green-500 rounded-lg p-3 text-green-400 text-sm">
            Transaction confirmed!
          </div>
        )}

        {needsApproval ? (
          <button
            onClick={handleApprove}
            disabled={isPending || isConfirming || !amount}
            className="w-full bg-accent-purple hover:bg-purple-600 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-medium transition-colors"
          >
            {isPending ? 'Confirm in wallet...' : isConfirming ? 'Confirming...' : 'Approve USDC'}
          </button>
        ) : (
          <button
            onClick={handleDeposit}
            disabled={isPending || isConfirming || !amount}
            className="w-full bg-accent-blue hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-medium transition-colors"
          >
            {isPending ? 'Confirm in wallet...' : isConfirming ? 'Confirming...' : 'Deposit to Pool'}
          </button>
        )}
      </div>

      <p className="mt-4 text-sm text-gray-500">
        Deposits are held on Base L2. Your balance will be synced to Sapphire for betting.
      </p>
    </div>
  )
}
