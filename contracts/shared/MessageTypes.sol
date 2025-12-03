// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MessageTypes
 * @notice Shared message type definitions for cross-chain communication
 */
library MessageTypes {
    // Message type identifiers
    uint8 constant DEPOSIT = 1;      // Base -> Sapphire: User deposited funds
    uint8 constant SETTLEMENT = 2;   // Sapphire -> Base: Market resolved, apply deltas
    uint8 constant LOCK_FUNDS = 3;   // Sapphire -> Base: Lock funds for active bet

    /**
     * @notice Encode a deposit message
     * @param user The user who deposited
     * @param amount The amount deposited
     */
    function encodeDeposit(
        address user,
        uint256 amount
    ) internal pure returns (bytes memory) {
        return abi.encode(DEPOSIT, user, amount);
    }

    /**
     * @notice Decode a deposit message
     */
    function decodeDeposit(
        bytes memory message
    ) internal pure returns (address user, uint256 amount) {
        uint8 msgType;
        (msgType, user, amount) = abi.decode(message, (uint8, address, uint256));
        require(msgType == DEPOSIT, "Invalid message type");
    }

    /**
     * @notice Encode a settlement message
     * @param marketId The market being settled
     * @param users Array of users with positions
     * @param deltas Balance changes (positive = winnings, negative = losses)
     */
    function encodeSettlement(
        bytes32 marketId,
        address[] memory users,
        int256[] memory deltas
    ) internal pure returns (bytes memory) {
        return abi.encode(SETTLEMENT, marketId, users, deltas);
    }

    /**
     * @notice Decode a settlement message
     */
    function decodeSettlement(
        bytes memory message
    ) internal pure returns (
        bytes32 marketId,
        address[] memory users,
        int256[] memory deltas
    ) {
        uint8 msgType;
        (msgType, marketId, users, deltas) = abi.decode(
            message,
            (uint8, bytes32, address[], int256[])
        );
        require(msgType == SETTLEMENT, "Invalid message type");
    }

    /**
     * @notice Encode a lock funds message
     * @param user The user whose funds to lock
     * @param amount The amount to lock
     * @param betId The bet identifier
     */
    function encodeLockFunds(
        address user,
        uint256 amount,
        bytes32 betId
    ) internal pure returns (bytes memory) {
        return abi.encode(LOCK_FUNDS, user, amount, betId);
    }

    /**
     * @notice Decode a lock funds message
     */
    function decodeLockFunds(
        bytes memory message
    ) internal pure returns (
        address user,
        uint256 amount,
        bytes32 betId
    ) {
        uint8 msgType;
        (msgType, user, amount, betId) = abi.decode(
            message,
            (uint8, address, uint256, bytes32)
        );
        require(msgType == LOCK_FUNDS, "Invalid message type");
    }
}
