import { createPublicClient, createWalletClient, http, parseAbiItem, formatUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import * as fs from 'fs'

/**
 * DarkBet Relayer
 *
 * Watches for deposits on Base and credits balances on Sapphire.
 * For hackathon demo - in production, use proper message queue + DB.
 */

// Configuration
const CONFIG = {
  // Contract addresses
  LIQUIDITY_POOL: '0x3afcc7D4EF809539BD0EaB0867D8E5FBc7B32e81' as `0x${string}`,
  DARK_MATCHER: '0xCc2a400Ab1BC3fa0968d8fe5a220b15Ec8E5dB97' as `0x${string}`,

  // RPC URLs
  BASE_RPC: process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
  SAPPHIRE_RPC: 'https://testnet.sapphire.oasis.io',

  // Relayer private key (same as deployer for hackathon)
  PRIVATE_KEY: process.env.PRIVATE_KEY as `0x${string}`,

  // State file to track processed transactions (relative to cwd)
  STATE_FILE: './state.json',

  // Polling interval (ms)
  POLL_INTERVAL: 10000, // 10 seconds
}

// Sapphire Testnet chain config
const sapphireTestnet = {
  id: 23295,
  name: 'Oasis Sapphire Testnet',
  nativeCurrency: { decimals: 18, name: 'TEST', symbol: 'TEST' },
  rpcUrls: { default: { http: ['https://testnet.sapphire.oasis.io'] } },
} as const

// ABIs
const LIQUIDITY_POOL_ABI = [
  parseAbiItem('event Deposited(address indexed user, uint256 amount, uint256 newBalance)'),
  parseAbiItem('event Withdrawn(address indexed user, uint256 amount)'),
] as const

const DARK_MATCHER_ABI = [
  parseAbiItem('function creditBalance(address user, uint256 amount)'),
  parseAbiItem('function debitBalance(address user, uint256 amount)'),
  parseAbiItem('function getMyBalance() view returns (uint256 available, uint256 locked)'),
] as const

// State management
interface RelayerState {
  lastProcessedBlock: bigint
  processedTxHashes: string[]
}

function loadState(): RelayerState {
  try {
    if (fs.existsSync(CONFIG.STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG.STATE_FILE, 'utf-8'))
      return {
        lastProcessedBlock: BigInt(data.lastProcessedBlock || 0),
        processedTxHashes: data.processedTxHashes || [],
      }
    }
  } catch (e) {
    console.log('No existing state, starting fresh')
  }
  return { lastProcessedBlock: 0n, processedTxHashes: [] }
}

function saveState(state: RelayerState) {
  const data = {
    lastProcessedBlock: state.lastProcessedBlock.toString(),
    processedTxHashes: state.processedTxHashes.slice(-1000), // Keep last 1000
  }
  fs.writeFileSync(CONFIG.STATE_FILE, JSON.stringify(data, null, 2))
}

async function main() {
  console.log('========================================')
  console.log('DarkBet Relayer Starting...')
  console.log('========================================')

  if (!CONFIG.PRIVATE_KEY) {
    console.error('ERROR: PRIVATE_KEY not set in environment')
    process.exit(1)
  }

  // Setup clients
  const account = privateKeyToAccount(CONFIG.PRIVATE_KEY)
  console.log('Relayer address:', account.address)

  // Base client (read deposits)
  const baseClient = createPublicClient({
    chain: baseSepolia,
    transport: http(CONFIG.BASE_RPC),
  })

  // Sapphire client (write credits)
  const sapphireClient = createWalletClient({
    account,
    chain: sapphireTestnet as any,
    transport: http(CONFIG.SAPPHIRE_RPC),
  })

  const sapphirePublicClient = createPublicClient({
    chain: sapphireTestnet as any,
    transport: http(CONFIG.SAPPHIRE_RPC),
  })

  // Load state
  let state = loadState()
  console.log('Last processed block:', state.lastProcessedBlock.toString())
  console.log('Processed txs:', state.processedTxHashes.length)

  // Get current block if starting fresh
  if (state.lastProcessedBlock === 0n) {
    const currentBlock = await baseClient.getBlockNumber()
    state.lastProcessedBlock = currentBlock - 100n // Start 100 blocks back
    console.log('Starting from block:', state.lastProcessedBlock.toString())
  }

  console.log('\nWatching for deposits on Base Sepolia...')
  console.log('LiquidityPool:', CONFIG.LIQUIDITY_POOL)
  console.log('DarkMatcher:', CONFIG.DARK_MATCHER)
  console.log('Poll interval:', CONFIG.POLL_INTERVAL, 'ms')
  console.log('')

  // Main loop
  while (true) {
    try {
      const currentBlock = await baseClient.getBlockNumber()

      if (currentBlock > state.lastProcessedBlock) {
        console.log(`\nChecking blocks ${state.lastProcessedBlock + 1n} to ${currentBlock}...`)

        // Get deposit events
        const depositLogs = await baseClient.getLogs({
          address: CONFIG.LIQUIDITY_POOL,
          event: parseAbiItem('event Deposited(address indexed user, uint256 amount, uint256 newBalance)'),
          fromBlock: state.lastProcessedBlock + 1n,
          toBlock: currentBlock,
        })

        console.log(`Found ${depositLogs.length} deposit events`)

        for (const log of depositLogs) {
          const txHash = log.transactionHash

          // Skip if already processed
          if (state.processedTxHashes.includes(txHash)) {
            console.log(`  Skipping ${txHash.slice(0, 10)}... (already processed)`)
            continue
          }

          const user = log.args.user!
          const amount = log.args.amount!

          console.log(`\n  Processing deposit:`)
          console.log(`    User: ${user}`)
          console.log(`    Amount: ${formatUnits(amount, 6)} USDC`)
          console.log(`    Tx: ${txHash}`)

          // Credit balance on Sapphire
          try {
            const creditTx = await sapphireClient.writeContract({
              address: CONFIG.DARK_MATCHER,
              abi: DARK_MATCHER_ABI,
              functionName: 'creditBalance',
              args: [user, amount],
            })

            console.log(`    ✅ Credited on Sapphire: ${creditTx}`)

            // Wait for confirmation
            const receipt = await sapphirePublicClient.waitForTransactionReceipt({
              hash: creditTx,
            })

            if (receipt.status === 'success') {
              console.log(`    ✅ Confirmed in block ${receipt.blockNumber}`)
              state.processedTxHashes.push(txHash)
              saveState(state)
            } else {
              console.log(`    ❌ Transaction reverted`)
            }
          } catch (e: any) {
            console.log(`    ❌ Failed to credit: ${e.message?.slice(0, 100)}`)
          }
        }

        // Update state
        state.lastProcessedBlock = currentBlock
        saveState(state)
      }
    } catch (e: any) {
      console.error('Error in main loop:', e.message?.slice(0, 100))
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, CONFIG.POLL_INTERVAL))
  }
}

main().catch(console.error)
