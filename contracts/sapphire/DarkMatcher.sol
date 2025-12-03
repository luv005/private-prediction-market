// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Sapphire} from "@oasisprotocol/sapphire-contracts/contracts/Sapphire.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DarkMatcher
 * @notice Private prediction market order book running on Oasis Sapphire TEE
 * @dev All state is encrypted by the TEE - order book is invisible to observers
 *
 * Key Privacy Features:
 * - Order details are encrypted end-to-end (frontend -> TEE)
 * - Order book is stored in encrypted TEE memory
 * - Only position owner can view their position
 * - Events emit minimal info (no prices, amounts, or sides)
 */
contract DarkMatcher is Ownable {
    // ============ Types ============

    struct Order {
        bytes32 orderId;
        address user;
        bytes32 marketId;
        bool isYes;          // true = YES side, false = NO side
        uint256 price;       // Price in basis points (0-10000 = 0-100%)
        uint256 amount;      // Bet amount in USDC units
        uint256 filled;      // Amount already matched
        uint64 timestamp;
        bool active;
    }

    struct Market {
        bytes32 marketId;
        string question;
        uint64 expiresAt;
        bool resolved;
        bool outcome;        // true = YES won, false = NO won
        uint256 totalVolume;
    }

    struct Position {
        uint256 yesShares;   // Shares betting YES
        uint256 noShares;    // Shares betting NO
        uint256 totalCost;   // Total USDC committed
    }

    // ============ Private State (Encrypted by TEE) ============

    /// @dev Private order books - completely hidden from external observers
    mapping(bytes32 => Order[]) private _yesOrders;
    mapping(bytes32 => Order[]) private _noOrders;

    /// @dev Markets
    mapping(bytes32 => Market) private _markets;
    bytes32[] private _marketIds;

    /// @dev User positions per market (only owner can view)
    mapping(bytes32 => mapping(address => Position)) private _positions;

    /// @dev Users who have positions in each market (for settlement)
    mapping(bytes32 => address[]) private _marketUsers;
    mapping(bytes32 => mapping(address => bool)) private _hasPosition;

    /// @dev User balances (synced from Base via relayer)
    mapping(address => uint256) private _balances;
    mapping(address => uint256) private _lockedBalances;

    /// @dev Contract keypair for E2E encryption with frontend
    bytes32 private _encryptionPrivateKey;
    bytes32 public encryptionPublicKey;

    /// @dev Relayer for cross-chain messages
    address public relayer;

    /// @dev LiquidityPool address on Base
    address public liquidityPool;

    // ============ Events (Minimal - Don't Leak Order Info) ============

    event MarketCreated(bytes32 indexed marketId, string question, uint64 expiresAt);
    event OrderPlaced(bytes32 indexed marketId, bytes32 indexed orderId);
    event TradeExecuted(bytes32 indexed marketId, uint256 volume);
    event OrderCancelled(bytes32 indexed marketId, bytes32 indexed orderId);
    event MarketResolved(bytes32 indexed marketId, bool outcome);
    event BalanceUpdated(address indexed user);

    // ============ Errors ============

    error MarketNotFound();
    error MarketExpired();
    error MarketNotExpired();
    error MarketAlreadyResolved();
    error InsufficientBalance();
    error InvalidPrice();
    error InvalidAmount();
    error OrderNotFound();
    error Unauthorized();
    error DecryptionFailed();

    // ============ Constructor ============

    constructor(address _owner) Ownable(_owner) {
        // Generate X25519 keypair for E2E encryption
        bytes memory entropy = Sapphire.randomBytes(32, abi.encodePacked("darkbet-keypair", block.timestamp));
        _encryptionPrivateKey = bytes32(entropy);

        // Generate public key from private key
        // Note: In production, use proper X25519 derivation
        // For hackathon, we'll use a simplified approach
        encryptionPublicKey = keccak256(abi.encodePacked(_encryptionPrivateKey, "public"));
    }

    // ============ Market Management ============

    /**
     * @notice Create a new prediction market
     * @param question The question being predicted
     * @param expiresAt When the market expires (unix timestamp)
     */
    function createMarket(
        string calldata question,
        uint64 expiresAt
    ) external onlyOwner returns (bytes32 marketId) {
        bytes memory entropy = Sapphire.randomBytes(8, abi.encodePacked(question, block.timestamp));
        marketId = keccak256(abi.encodePacked(question, expiresAt, entropy));

        _markets[marketId] = Market({
            marketId: marketId,
            question: question,
            expiresAt: expiresAt,
            resolved: false,
            outcome: false,
            totalVolume: 0
        });

        _marketIds.push(marketId);
        emit MarketCreated(marketId, question, expiresAt);
    }

    /**
     * @notice Get market info (public data only)
     */
    function getMarket(bytes32 marketId) external view returns (
        string memory question,
        uint64 expiresAt,
        bool resolved,
        bool outcome,
        uint256 totalVolume
    ) {
        Market storage m = _markets[marketId];
        if (m.marketId == bytes32(0)) revert MarketNotFound();
        return (m.question, m.expiresAt, m.resolved, m.outcome, m.totalVolume);
    }

    /**
     * @notice Get all market IDs
     */
    function getMarketIds() external view returns (bytes32[] memory) {
        return _marketIds;
    }

    // ============ Dark Intent Submission ============

    /**
     * @notice Submit an encrypted order (Dark Intent)
     * @dev Order details are encrypted - only TEE can decrypt
     * @param encryptedOrder ABI-encoded and encrypted order data
     * @param nonce Random nonce used for encryption
     *
     * Order format (before encryption):
     * - bytes32 marketId
     * - bool isYes (true = YES, false = NO)
     * - uint256 price (basis points, 0-10000)
     * - uint256 amount (USDC)
     */
    function submitDarkIntent(
        bytes calldata encryptedOrder,
        bytes32 nonce
    ) external {
        // Decrypt order using contract's private key
        // In production: use Sapphire.decrypt with X25519
        // For hackathon: simplified decryption
        bytes memory orderData = _decrypt(encryptedOrder, nonce);

        (
            bytes32 marketId,
            bool isYes,
            uint256 price,
            uint256 amount
        ) = abi.decode(orderData, (bytes32, bool, uint256, uint256));

        // Validate
        Market storage market = _markets[marketId];
        if (market.marketId == bytes32(0)) revert MarketNotFound();
        if (block.timestamp >= market.expiresAt) revert MarketExpired();
        if (market.resolved) revert MarketAlreadyResolved();
        if (price == 0 || price >= 10000) revert InvalidPrice();
        if (amount == 0) revert InvalidAmount();
        if (_balances[msg.sender] < amount) revert InsufficientBalance();

        // Generate unique order ID
        bytes memory entropy = Sapphire.randomBytes(8, abi.encodePacked(msg.sender, block.timestamp));
        bytes32 orderId = keccak256(abi.encodePacked(msg.sender, marketId, entropy));

        // Lock funds
        _balances[msg.sender] -= amount;
        _lockedBalances[msg.sender] += amount;

        // Create order
        Order memory order = Order({
            orderId: orderId,
            user: msg.sender,
            marketId: marketId,
            isYes: isYes,
            price: price,
            amount: amount,
            filled: 0,
            timestamp: uint64(block.timestamp),
            active: true
        });

        // Try to match, then add remainder to book
        _matchAndAdd(order);

        emit OrderPlaced(marketId, orderId);
    }

    /**
     * @notice Submit order without encryption (for testing/demo)
     * @dev In production, always use submitDarkIntent
     */
    function submitOrder(
        bytes32 marketId,
        bool isYes,
        uint256 price,
        uint256 amount
    ) external {
        Market storage market = _markets[marketId];
        if (market.marketId == bytes32(0)) revert MarketNotFound();
        if (block.timestamp >= market.expiresAt) revert MarketExpired();
        if (market.resolved) revert MarketAlreadyResolved();
        if (price == 0 || price >= 10000) revert InvalidPrice();
        if (amount == 0) revert InvalidAmount();
        if (_balances[msg.sender] < amount) revert InsufficientBalance();

        bytes memory entropy = Sapphire.randomBytes(8, abi.encodePacked(msg.sender, block.timestamp));
        bytes32 orderId = keccak256(abi.encodePacked(msg.sender, marketId, entropy));

        _balances[msg.sender] -= amount;
        _lockedBalances[msg.sender] += amount;

        Order memory order = Order({
            orderId: orderId,
            user: msg.sender,
            marketId: marketId,
            isYes: isYes,
            price: price,
            amount: amount,
            filled: 0,
            timestamp: uint64(block.timestamp),
            active: true
        });

        _matchAndAdd(order);
        emit OrderPlaced(marketId, orderId);
    }

    // ============ Order Matching Engine ============

    /**
     * @dev Match incoming order against opposite side, add remainder to book
     */
    function _matchAndAdd(Order memory newOrder) internal {
        bytes32 marketId = newOrder.marketId;
        Order[] storage oppositeBook = newOrder.isYes ? _noOrders[marketId] : _yesOrders[marketId];

        uint256 remaining = newOrder.amount;

        for (uint256 i = 0; i < oppositeBook.length && remaining > 0; i++) {
            Order storage existing = oppositeBook[i];
            if (!existing.active) continue;

            // Price compatibility check:
            // YES buyer at price P matches NO buyer at price Q if P + Q >= 10000
            // This ensures both sides are willing to pay at least $1 total per share
            bool priceMatch;
            if (newOrder.isYes) {
                // New order is YES, existing is NO
                priceMatch = newOrder.price + existing.price >= 10000;
            } else {
                // New order is NO, existing is YES
                priceMatch = existing.price + newOrder.price >= 10000;
            }

            if (!priceMatch) continue;

            // Calculate fill amount
            uint256 existingRemaining = existing.amount - existing.filled;
            uint256 fillAmount = remaining < existingRemaining ? remaining : existingRemaining;

            // Execute trade
            _executeTrade(newOrder, existing, fillAmount);

            remaining -= fillAmount;
            existing.filled += fillAmount;

            if (existing.filled >= existing.amount) {
                existing.active = false;
            }

            // Update market volume
            _markets[marketId].totalVolume += fillAmount;
            emit TradeExecuted(marketId, fillAmount);
        }

        // Add remainder to order book
        if (remaining > 0) {
            newOrder.amount = remaining;
            newOrder.filled = 0;

            if (newOrder.isYes) {
                _yesOrders[marketId].push(newOrder);
            } else {
                _noOrders[marketId].push(newOrder);
            }
        }
    }

    /**
     * @dev Execute a matched trade - update positions
     */
    function _executeTrade(
        Order memory taker,
        Order storage maker,
        uint256 amount
    ) internal {
        bytes32 marketId = taker.marketId;

        // Track users for settlement
        _trackUser(marketId, taker.user);
        _trackUser(marketId, maker.user);

        // Update positions
        Position storage takerPos = _positions[marketId][taker.user];
        Position storage makerPos = _positions[marketId][maker.user];

        if (taker.isYes) {
            // Taker buying YES, maker selling YES (buying NO)
            takerPos.yesShares += amount;
            takerPos.totalCost += (amount * taker.price) / 10000;

            makerPos.noShares += amount;
            makerPos.totalCost += (amount * maker.price) / 10000;
        } else {
            // Taker buying NO, maker selling NO (buying YES)
            takerPos.noShares += amount;
            takerPos.totalCost += (amount * taker.price) / 10000;

            makerPos.yesShares += amount;
            makerPos.totalCost += (amount * maker.price) / 10000;
        }
    }

    function _trackUser(bytes32 marketId, address user) internal {
        if (!_hasPosition[marketId][user]) {
            _hasPosition[marketId][user] = true;
            _marketUsers[marketId].push(user);
        }
    }

    // ============ Position Viewing (Private) ============

    /**
     * @notice Get your position in a market
     * @dev Only callable by position owner - enforced by Sapphire
     */
    function getMyPosition(bytes32 marketId) external view returns (
        uint256 yesShares,
        uint256 noShares,
        uint256 totalCost
    ) {
        Position storage pos = _positions[marketId][msg.sender];
        return (pos.yesShares, pos.noShares, pos.totalCost);
    }

    /**
     * @notice Get your balance
     */
    function getMyBalance() external view returns (
        uint256 available,
        uint256 locked
    ) {
        return (_balances[msg.sender], _lockedBalances[msg.sender]);
    }

    // ============ Market Resolution ============

    /**
     * @notice Resolve a market (admin only for hackathon)
     * @param marketId Market to resolve
     * @param outcome true = YES won, false = NO won
     */
    function resolveMarket(bytes32 marketId, bool outcome) external onlyOwner {
        Market storage market = _markets[marketId];
        if (market.marketId == bytes32(0)) revert MarketNotFound();
        if (market.resolved) revert MarketAlreadyResolved();
        // Allow early resolution for demo, comment out for production:
        // if (block.timestamp < market.expiresAt) revert MarketNotExpired();

        market.resolved = true;
        market.outcome = outcome;

        emit MarketResolved(marketId, outcome);

        // Calculate and store settlement data
        _settleMarket(marketId, outcome);
    }

    /**
     * @dev Calculate settlement deltas for all users
     */
    function _settleMarket(bytes32 marketId, bool outcome) internal {
        address[] storage users = _marketUsers[marketId];

        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            Position storage pos = _positions[marketId][user];

            // Winner gets $1 per winning share
            // In a proper market, shares cost < $1, so winners profit
            uint256 payout;
            if (outcome) {
                // YES won
                payout = pos.yesShares; // Each YES share worth $1
            } else {
                // NO won
                payout = pos.noShares; // Each NO share worth $1
            }

            // Unlock funds and apply payout
            // Note: actual P&L depends on cost basis
            _balances[user] += payout;

            // Reduce locked balance (simplified - in production track per-market)
            if (_lockedBalances[user] > 0) {
                _lockedBalances[user] = 0;
            }

            // Clear position
            delete _positions[marketId][user];
        }

        // Note: In production with cross-chain, would dispatch settlement message here
    }

    /**
     * @notice Get settlement data for cross-chain relay
     * @dev Called by relayer to get data to send to Base
     */
    function getSettlementData(bytes32 marketId) external view onlyRelayer returns (
        address[] memory users,
        int256[] memory deltas
    ) {
        Market storage market = _markets[marketId];
        require(market.resolved, "Market not resolved");

        address[] storage marketUsersList = _marketUsers[marketId];
        users = new address[](marketUsersList.length);
        deltas = new int256[](marketUsersList.length);

        for (uint256 i = 0; i < marketUsersList.length; i++) {
            users[i] = marketUsersList[i];
            // Delta already applied in _settleMarket, return 0 for relayer
            // In production, calculate actual deltas here
            deltas[i] = 0;
        }
    }

    // ============ Balance Management (Cross-Chain) ============

    /**
     * @notice Credit user balance (called by relayer from Base deposit)
     */
    function creditBalance(address user, uint256 amount) external onlyRelayer {
        _balances[user] += amount;
        emit BalanceUpdated(user);
    }

    /**
     * @notice Debit user balance (for withdrawals back to Base)
     */
    function debitBalance(address user, uint256 amount) external onlyRelayer {
        if (_balances[user] < amount) revert InsufficientBalance();
        _balances[user] -= amount;
        emit BalanceUpdated(user);
    }

    // ============ Encryption Helpers ============

    /**
     * @dev Decrypt order data using contract's private key
     * @notice Simplified for hackathon - in production use proper X25519 + ChaCha20
     */
    function _decrypt(
        bytes calldata encrypted,
        bytes32 nonce
    ) internal view returns (bytes memory) {
        // For hackathon demo: XOR-based "decryption"
        // In production: use Sapphire.decrypt with proper key derivation

        bytes32 key = keccak256(abi.encodePacked(_encryptionPrivateKey, nonce));
        bytes memory result = new bytes(encrypted.length);

        for (uint256 i = 0; i < encrypted.length; i++) {
            result[i] = encrypted[i] ^ bytes1(key[i % 32]);
        }

        return result;
    }

    /**
     * @notice Get encryption public key for frontend
     */
    function getEncryptionPublicKey() external view returns (bytes32) {
        return encryptionPublicKey;
    }

    // ============ Admin ============

    function setRelayer(address _relayer) external onlyOwner {
        relayer = _relayer;
    }

    function setLiquidityPool(address _liquidityPool) external onlyOwner {
        liquidityPool = _liquidityPool;
    }

    modifier onlyRelayer() {
        if (msg.sender != relayer && msg.sender != owner()) revert Unauthorized();
        _;
    }
}
