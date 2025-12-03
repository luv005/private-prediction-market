import { encodeAbiParameters, keccak256, toHex } from 'viem'

/**
 * Encrypt an order for submission to DarkMatcher
 *
 * This is a simplified encryption for hackathon demo.
 * In production, use proper X25519 + ChaCha20-Poly1305 via @oasisprotocol/sapphire-paratime
 */
export function encryptOrder(
  marketId: `0x${string}`,
  isYes: boolean,
  price: bigint,
  amount: bigint,
  contractPublicKey: `0x${string}`
): { encrypted: `0x${string}`; nonce: `0x${string}` } {
  // Generate random nonce
  const nonceBytes = crypto.getRandomValues(new Uint8Array(32))
  const nonce = toHex(nonceBytes) as `0x${string}`

  // Encode order data
  const orderData = encodeAbiParameters(
    [
      { type: 'bytes32' },
      { type: 'bool' },
      { type: 'uint256' },
      { type: 'uint256' },
    ],
    [marketId, isYes, price, amount]
  )

  // Derive encryption key (simplified - matches contract's _decrypt)
  // In production: use proper X25519 key exchange
  const key = keccak256(
    encodeAbiParameters(
      [{ type: 'bytes32' }, { type: 'bytes32' }],
      [contractPublicKey, nonce]
    )
  )

  // XOR encryption (simplified - matches contract)
  const orderBytes = hexToBytes(orderData)
  const keyBytes = hexToBytes(key)
  const encrypted = new Uint8Array(orderBytes.length)

  for (let i = 0; i < orderBytes.length; i++) {
    encrypted[i] = orderBytes[i] ^ keyBytes[i % keyBytes.length]
  }

  return {
    encrypted: toHex(encrypted) as `0x${string}`,
    nonce,
  }
}

function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = new Uint8Array(cleanHex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16)
  }
  return bytes
}

/**
 * Format USDC amount (6 decimals)
 */
export function formatUSDC(amount: bigint): string {
  const whole = amount / 1000000n
  const decimal = amount % 1000000n
  if (decimal === 0n) {
    return whole.toString()
  }
  return `${whole}.${decimal.toString().padStart(6, '0').replace(/0+$/, '')}`
}

/**
 * Parse USDC amount to bigint
 */
export function parseUSDC(amount: string): bigint {
  const [whole, decimal = ''] = amount.split('.')
  const paddedDecimal = decimal.padEnd(6, '0').slice(0, 6)
  return BigInt(whole) * 1000000n + BigInt(paddedDecimal)
}

/**
 * Format price from basis points to percentage
 */
export function formatPrice(basisPoints: bigint): string {
  return (Number(basisPoints) / 100).toFixed(1)
}

/**
 * Parse percentage to basis points
 */
export function parsePrice(percent: string): bigint {
  return BigInt(Math.round(parseFloat(percent) * 100))
}
