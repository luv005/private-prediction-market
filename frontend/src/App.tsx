import { useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from './components/ConnectButton'
import { DepositForm } from './components/DepositForm'
import { MarketList } from './components/MarketList'
import { BetForm } from './components/BetForm'

function App() {
  const { isConnected } = useAccount()
  const [selectedMarketId, setSelectedMarketId] = useState<`0x${string}`>()

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="border-b border-dark-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-accent-blue to-accent-purple rounded-lg flex items-center justify-center font-bold text-xl">
              D
            </div>
            <div>
              <h1 className="text-xl font-bold">DarkBet</h1>
              <p className="text-xs text-gray-500">Private Prediction Market</p>
            </div>
          </div>
          <ConnectButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {!isConnected ? (
          <div className="text-center py-20">
            <h2 className="text-3xl font-bold mb-4">Welcome to DarkBet</h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">
              The first prediction market with a private order book. Your bets are encrypted
              and matched inside a Trusted Execution Environment (TEE). No front-running.
              No copy-trading. Just fair markets.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <FeatureCard
                title="Private Orders"
                description="Your bet amounts and prices are encrypted. Only the TEE can see them."
                icon="🔒"
              />
              <FeatureCard
                title="No Front-Running"
                description="Bots can't see your orders in the mempool. Fair execution guaranteed."
                icon="🛡️"
              />
              <FeatureCard
                title="Instant Matching"
                description="Orders are matched inside the TEE in real-time. Results posted on-chain."
                icon="⚡"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Deposit */}
            <div className="space-y-6">
              <DepositForm />
              <HowItWorks />
            </div>

            {/* Middle Column - Markets */}
            <div>
              <MarketList
                onSelectMarket={setSelectedMarketId}
                selectedMarketId={selectedMarketId}
              />
            </div>

            {/* Right Column - Bet Form */}
            <div>
              <BetForm marketId={selectedMarketId} />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          <p>Built with Oasis Sapphire TEE + Base L2</p>
          <p className="mt-1">
            <a href="https://docs.oasis.io/build/sapphire/" className="text-accent-blue hover:underline">
              Learn about Sapphire
            </a>
            {' | '}
            <a href="https://github.com" className="text-accent-blue hover:underline">
              GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-xl p-6 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="font-bold mb-2">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  )
}

function HowItWorks() {
  return (
    <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
      <h3 className="font-bold mb-4">How It Works</h3>
      <ol className="space-y-3 text-sm text-gray-400">
        <li className="flex gap-3">
          <span className="bg-accent-blue w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">1</span>
          <span>Deposit USDC on Base (cheap gas)</span>
        </li>
        <li className="flex gap-3">
          <span className="bg-accent-blue w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">2</span>
          <span>Switch to Sapphire to view markets</span>
        </li>
        <li className="flex gap-3">
          <span className="bg-accent-blue w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">3</span>
          <span>Submit encrypted "Dark Intent" bets</span>
        </li>
        <li className="flex gap-3">
          <span className="bg-accent-blue w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">4</span>
          <span>TEE matches orders privately</span>
        </li>
        <li className="flex gap-3">
          <span className="bg-accent-blue w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">5</span>
          <span>Withdraw winnings on Base</span>
        </li>
      </ol>
    </div>
  )
}

export default App
