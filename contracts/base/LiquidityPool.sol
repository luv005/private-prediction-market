// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LiquidityPool
 * @notice Holds user USDC deposits on Base L2 and handles cross-chain settlements
 * @dev For hackathon MVP: simplified cross-chain messaging (can integrate Hyperlane later)
 */
contract LiquidityPool is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ============ State ============

    IERC20 public immutable usdc;

    /// @notice DarkMatcher contract address on Sapphire (for verification)
    address public darkMatcher;

    /// @notice Relayer address authorized to submit cross-chain messages
    address public relayer;

    /// @notice User available balances (can withdraw)
    mapping(address => uint256) public balances;

    /// @notice User locked balances (in active bets)
    mapping(address => uint256) public lockedBalances;

    /// @notice Processed message nonces to prevent replay
    mapping(bytes32 => bool) public processedMessages;

    // ============ Events ============

    event Deposited(address indexed user, uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed user, uint256 amount);
    event BalanceLocked(address indexed user, uint256 amount, bytes32 betId);
    event BalanceUnlocked(address indexed user, uint256 amount);
    event SettlementApplied(bytes32 indexed marketId, uint256 usersSettled);
    event RelayerUpdated(address indexed oldRelayer, address indexed newRelayer);
    event DarkMatcherUpdated(address indexed darkMatcher);

    // ============ Errors ============

    error InsufficientBalance();
    error InvalidAmount();
    error Unauthorized();
    error MessageAlreadyProcessed();
    error ArrayLengthMismatch();

    // ============ Constructor ============

    constructor(address _usdc, address _owner) Ownable(_owner) {
        usdc = IERC20(_usdc);
    }

    // ============ User Functions ============

    /**
     * @notice Deposit USDC into the pool
     * @param amount Amount of USDC to deposit
     * @dev User must approve this contract first
     */
    function deposit(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();

        // Transfer USDC from user
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // Credit balance
        balances[msg.sender] += amount;

        emit Deposited(msg.sender, amount, balances[msg.sender]);

        // Note: In production, this would dispatch a cross-chain message to Sapphire
        // via Hyperlane. For hackathon, relayer will read this event and relay.
    }

    /**
     * @notice Withdraw available USDC balance
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (balances[msg.sender] < amount) revert InsufficientBalance();

        balances[msg.sender] -= amount;
        usdc.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Get user's total balance (available + locked)
     */
    function getTotalBalance(address user) external view returns (uint256) {
        return balances[user] + lockedBalances[user];
    }

    // ============ Cross-Chain Message Handlers ============

    /**
     * @notice Lock funds for an active bet (called by relayer from Sapphire message)
     * @param user User whose funds to lock
     * @param amount Amount to lock
     * @param betId Unique bet identifier
     * @param nonce Message nonce for replay protection
     */
    function lockFunds(
        address user,
        uint256 amount,
        bytes32 betId,
        bytes32 nonce
    ) external onlyRelayer {
        if (processedMessages[nonce]) revert MessageAlreadyProcessed();
        processedMessages[nonce] = true;

        if (balances[user] < amount) revert InsufficientBalance();

        balances[user] -= amount;
        lockedBalances[user] += amount;

        emit BalanceLocked(user, amount, betId);
    }

    /**
     * @notice Apply settlement after market resolution
     * @param marketId The resolved market
     * @param users Array of users with positions
     * @param deltas Balance changes (positive = win, negative = loss)
     * @param nonce Message nonce for replay protection
     */
    function applySettlement(
        bytes32 marketId,
        address[] calldata users,
        int256[] calldata deltas,
        bytes32 nonce
    ) external onlyRelayer {
        if (processedMessages[nonce]) revert MessageAlreadyProcessed();
        processedMessages[nonce] = true;

        if (users.length != deltas.length) revert ArrayLengthMismatch();

        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            int256 delta = deltas[i];

            // First, unlock all locked funds for this user
            uint256 locked = lockedBalances[user];
            if (locked > 0) {
                lockedBalances[user] = 0;
                balances[user] += locked;
            }

            // Apply delta
            if (delta > 0) {
                // User won - add winnings
                balances[user] += uint256(delta);
            } else if (delta < 0) {
                // User lost - subtract losses (capped at balance)
                uint256 loss = uint256(-delta);
                if (balances[user] >= loss) {
                    balances[user] -= loss;
                } else {
                    balances[user] = 0;
                }
            }
        }

        emit SettlementApplied(marketId, users.length);
    }

    // ============ Admin Functions ============

    /**
     * @notice Set the relayer address
     * @param _relayer New relayer address
     */
    function setRelayer(address _relayer) external onlyOwner {
        address old = relayer;
        relayer = _relayer;
        emit RelayerUpdated(old, _relayer);
    }

    /**
     * @notice Set the DarkMatcher address on Sapphire
     * @param _darkMatcher DarkMatcher contract address
     */
    function setDarkMatcher(address _darkMatcher) external onlyOwner {
        darkMatcher = _darkMatcher;
        emit DarkMatcherUpdated(_darkMatcher);
    }

    /**
     * @notice Emergency withdraw stuck tokens (admin only)
     * @param token Token address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(
        address token,
        uint256 amount
    ) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    // ============ Modifiers ============

    modifier onlyRelayer() {
        if (msg.sender != relayer && msg.sender != owner()) revert Unauthorized();
        _;
    }
}
