# DarkBet - Private Prediction Market

A prediction market with an **invisible order book**. Orders are encrypted end-to-end and matched inside a Trusted Execution Environment (TEE) on Oasis Sapphire.

## The Problem

On Polymarket or Kalshi, the order book is public:
- **Whale Problem**: If a whale bets $1M, the market moves against them (slippage)
- **Copy-Cat Problem**: Bots instantly copy-trade famous addresses, destroying alpha
- **Result**: Smart money stays on the sidelines

## The Solution

A **Dark Prediction Market** where:
- Orders are encrypted before submission
- A TEE (Trusted Execution Environment) decrypts and matches orders privately
- Only net results are posted on-chain
- No one can front-run or copy-trade

## Architecture

```
┌─────────────────┐         ┌──────────────────────┐
│    Base L2      │         │   Oasis Sapphire     │
│                 │         │       (TEE)          │
│  LiquidityPool  │◄───────►│    DarkMatcher       │
│  - Deposits     │ Relayer │  - Encrypted Orders  │
│  - Withdrawals  │         │  - Private Matching  │
│  - Settlements  │         │  - Position Tracking │
└─────────────────┘         └──────────────────────┘
```

## Tech Stack

- **Oasis Sapphire**: Confidential EVM with TEE-encrypted state
- **Base Sepolia**: L2 for deposits/settlements (cheap gas)
- **Hardhat**: Smart contract development
- **React + wagmi**: Frontend

## Quick Start

### 1. Install Dependencies

```bash
npm install
cd frontend && npm install && cd ..
```

### 2. Configure Environment

```bash
cp .env.example .env
# Add your PRIVATE_KEY
```

### 3. Deploy Contracts

```bash
# Get testnet tokens:
# - Base Sepolia ETH: https://www.alchemy.com/faucets/base-sepolia
# - Sapphire TEST: https://faucet.testnet.oasis.io/

# Deploy to Base Sepolia
npm run deploy:base

# Deploy to Sapphire Testnet
npm run deploy:sapphire

# Update frontend/src/lib/contracts.ts with deployed addresses
```

### 4. Run Frontend

```bash
cd frontend
npm run dev
```

## Contracts

### LiquidityPool (Base L2)
- `deposit(amount)` - Deposit USDC
- `withdraw(amount)` - Withdraw USDC
- `balances(user)` - Check balance

### DarkMatcher (Sapphire)
- `createMarket(question, expiresAt)` - Create market (admin)
- `submitDarkIntent(encrypted, nonce)` - Submit encrypted order
- `submitOrder(...)` - Submit order (unencrypted, for testing)
- `getMyPosition(marketId)` - View your position
- `getMyBalance()` - View your balance
- `resolveMarket(marketId, outcome)` - Resolve market (admin)

## How It Works

### 1. Deposit (Base)
User deposits USDC to LiquidityPool. Balance is tracked on-chain.

### 2. Dark Intent (Sapphire)
Frontend encrypts order with DarkMatcher's public key:
```
Order = { marketId, isYes, price, amount }
Encrypted = Encrypt(Order, TEE_PublicKey)
```

### 3. Matching (Inside TEE)
DarkMatcher decrypts order, matches against private order book:
- YES buyer at 60% matches NO buyer at 45% (60+45=105 >= 100)
- Positions updated privately

### 4. Settlement
After market resolution, winnings are calculated and sent back to Base.

## Privacy Features

- **Encrypted Orders**: Order details (side, price, amount) are encrypted
- **Private Order Book**: Full order book stored in TEE memory
- **Minimal Events**: On-chain events only show order ID and volume (no details)
- **Position Privacy**: Only you can view your position

## Testing

```bash
npx hardhat test
```

## Security Notes

This is a hackathon demo. For production:
- Use proper X25519 + ChaCha20-Poly1305 encryption
- Implement cross-chain messaging (Hyperlane/Celer)
- Add oracle integration for resolution
- Audit all contracts

## License

MIT
