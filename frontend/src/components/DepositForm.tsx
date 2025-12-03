import { useState } from 'react'
import { useAccount, useWriteContract, useReadContract, useChainId } from 'wagmi'
import { parseUnits } from 'viem'
import { baseSepolia } from '../lib/wagmi'
import { CONTRACTS, LIQUIDITY_POOL_ABI, ERC20_ABI } from '../lib/contracts'

export function DepositForm() {
  const [amount, setAmount] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const { address } = useAccount()
  const chainId = useChainId()
  const { writeContract } = useWriteContract()

  // Read USDC balance
  const { data: usdcBalance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: baseSepolia.id,
  })

  // Read allowance
  const { data: allowance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.LIQUIDITY_POOL] : undefined,
    chainId: baseSepolia.id,
  })

  // Read pool balance
  const { data: poolBalance } = useReadContract({
    address: CONTRACTS.LIQUIDITY_POOL,
    abi: LIQUIDITY_POOL_ABI,
    functionName: 'balances',
    args: address ? [address] : undefined,
    chainId: baseSepolia.id,
  })

  const handleApprove = async () => {
    if (!amount) return
    setIsApproving(true)
    try {
      await writeContract({
        address: CONTRACTS.USDC,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.LIQUIDITY_POOL, parseUnits(amount, 6)],
        chainId: baseSepolia.id,
      })
    } finally {
      setIsApproving(false)
    }
  }

  const handleDeposit = async () => {
    if (!amount) return
    await writeContract({
      address: CONTRACTS.LIQUIDITY_POOL,
      abi: LIQUIDITY_POOL_ABI,
      functionName: 'deposit',
      args: [parseUnits(amount, 6)],
      chainId: baseSepolia.id,
    })
    setAmount('')
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

        {needsApproval ? (
          <button
            onClick={handleApprove}
            disabled={isApproving || !amount}
            className="w-full bg-accent-purple hover:bg-purple-600 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-medium transition-colors"
          >
            {isApproving ? 'Approving...' : 'Approve USDC'}
          </button>
        ) : (
          <button
            onClick={handleDeposit}
            disabled={!amount}
            className="w-full bg-accent-blue hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-medium transition-colors"
          >
            Deposit to Pool
          </button>
        )}
      </div>

      <p className="mt-4 text-sm text-gray-500">
        Deposits are held on Base L2. Your balance will be synced to Sapphire for betting.
      </p>
    </div>
  )
}
