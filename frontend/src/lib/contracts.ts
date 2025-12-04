// Contract addresses - update after deployment
export const CONTRACTS = {
  // Base Sepolia
  LIQUIDITY_POOL: '0x3afcc7D4EF809539BD0EaB0867D8E5FBc7B32e81' as `0x${string}`,
  USDC: '0x3d82B714401782464CE485789513679d74733B29' as `0x${string}`, // MockUSDC

  // Sapphire Testnet
  DARK_MATCHER: '0xCc2a400Ab1BC3fa0968d8fe5a220b15Ec8E5dB97' as `0x${string}`,
}

// ABIs (minimal for frontend interactions)
export const LIQUIDITY_POOL_ABI = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'balances',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'lockedBalances',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

export const DARK_MATCHER_ABI = [
  {
    name: 'createMarket',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'question', type: 'string' },
      { name: 'expiresAt', type: 'uint64' },
    ],
    outputs: [{ name: 'marketId', type: 'bytes32' }],
  },
  {
    name: 'submitOrder',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'marketId', type: 'bytes32' },
      { name: 'isYes', type: 'bool' },
      { name: 'price', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'submitDarkIntent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'encryptedOrder', type: 'bytes' },
      { name: 'nonce', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'getMarket',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'marketId', type: 'bytes32' }],
    outputs: [
      { name: 'question', type: 'string' },
      { name: 'expiresAt', type: 'uint64' },
      { name: 'resolved', type: 'bool' },
      { name: 'outcome', type: 'bool' },
      { name: 'totalVolume', type: 'uint256' },
    ],
  },
  {
    name: 'getMarketIds',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32[]' }],
  },
  {
    name: 'getMyPosition',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'marketId', type: 'bytes32' }],
    outputs: [
      { name: 'yesShares', type: 'uint256' },
      { name: 'noShares', type: 'uint256' },
      { name: 'totalCost', type: 'uint256' },
    ],
  },
  {
    name: 'getPosition',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'marketId', type: 'bytes32' },
    ],
    outputs: [
      { name: 'yesShares', type: 'uint256' },
      { name: 'noShares', type: 'uint256' },
      { name: 'totalCost', type: 'uint256' },
    ],
  },
  {
    name: 'getMyBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'available', type: 'uint256' },
      { name: 'locked', type: 'uint256' },
    ],
  },
  {
    name: 'getBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'available', type: 'uint256' },
      { name: 'locked', type: 'uint256' },
    ],
  },
  {
    name: 'getEncryptionPublicKey',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'getOrderBookDepth',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'marketId', type: 'bytes32' }],
    outputs: [
      { name: 'yesPrices', type: 'uint256[]' },
      { name: 'yesAmounts', type: 'uint256[]' },
      { name: 'noPrices', type: 'uint256[]' },
      { name: 'noAmounts', type: 'uint256[]' },
    ],
  },
  {
    name: 'getMyOrders',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'marketId', type: 'bytes32' }],
    outputs: [
      { name: 'orderIds', type: 'bytes32[]' },
      { name: 'isYesOrders', type: 'bool[]' },
      { name: 'prices', type: 'uint256[]' },
      { name: 'amounts', type: 'uint256[]' },
    ],
  },
  {
    name: 'resolveMarket',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'marketId', type: 'bytes32' },
      { name: 'outcome', type: 'bool' },
    ],
    outputs: [],
  },
] as const

export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const
