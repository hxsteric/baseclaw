// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title BaseClawSubscriptions
 * @notice Manages tiered subscriptions for OpenClaw Launcher on Base.
 *         Users pay USDC to subscribe. Subscriptions last 30 days.
 * @dev    Deployed behind a UUPS proxy so the logic can be upgraded.
 */
contract BaseClawSubscriptions is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    // ──────────────────────────────────────────────
    //  Types
    // ──────────────────────────────────────────────

    struct Subscription {
        uint8 tier;
        uint256 subscribedAt;
        uint256 expiresAt;
    }

    // ──────────────────────────────────────────────
    //  Constants
    // ──────────────────────────────────────────────

    uint8 public constant TIER_FREE = 0;
    uint8 public constant TIER_STARTER = 1;
    uint8 public constant TIER_PRO = 2;
    uint8 public constant TIER_BUSINESS = 3;
    uint8 public constant MAX_TIER = 3;

    uint256 public constant SUBSCRIPTION_DURATION = 30 days;

    // ──────────────────────────────────────────────
    //  State
    // ──────────────────────────────────────────────

    IERC20 public usdc;
    address public revenueWallet;

    /// @notice price in USDC (6 decimals) for each tier
    mapping(uint8 => uint256) public tierPrices;

    /// @notice active subscription for each user
    mapping(address => Subscription) public subscriptions;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event Subscribed(
        address indexed user,
        uint8 tier,
        uint256 amount,
        uint256 expiresAt
    );

    event TierPriceUpdated(uint8 tier, uint256 newPrice);

    event RevenueWalletUpdated(address indexed newWallet);

    // ──────────────────────────────────────────────
    //  Errors
    // ──────────────────────────────────────────────

    error InvalidTier(uint8 tier);
    error ZeroAddress();
    error FreeTierNoPayment();

    // ──────────────────────────────────────────────
    //  Initializer (replaces constructor for proxy)
    // ──────────────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract (called once via proxy).
     * @param _owner         The initial owner / admin.
     * @param _revenueWallet Wallet that receives subscription payments.
     * @param _usdc          USDC token address on Base.
     */
    function initialize(
        address _owner,
        address _revenueWallet,
        address _usdc
    ) external initializer {
        if (_owner == address(0)) revert ZeroAddress();
        if (_revenueWallet == address(0)) revert ZeroAddress();
        if (_usdc == address(0)) revert ZeroAddress();

        __Ownable_init(_owner);
        __Pausable_init();
        __UUPSUpgradeable_init();

        usdc = IERC20(_usdc);
        revenueWallet = _revenueWallet;

        // Default tier prices (USDC has 6 decimals)
        tierPrices[TIER_FREE] = 0;
        tierPrices[TIER_STARTER] = 10_000_000;   // 10 USDC
        tierPrices[TIER_PRO] = 30_000_000;        // 30 USDC
        tierPrices[TIER_BUSINESS] = 80_000_000;   // 80 USDC
    }

    // ──────────────────────────────────────────────
    //  Core
    // ──────────────────────────────────────────────

    /**
     * @notice Subscribe (or renew) to the given tier.
     *         The caller must have approved this contract to spend
     *         the tier price in USDC beforehand.
     * @param tier The subscription tier (0-3).
     */
    function subscribe(uint8 tier) external whenNotPaused {
        if (tier > MAX_TIER) revert InvalidTier(tier);

        uint256 price = tierPrices[tier];

        if (tier == TIER_FREE) {
            // Free tier: no payment required, just record it
        } else {
            // Transfer USDC from subscriber to revenue wallet
            usdc.safeTransferFrom(msg.sender, revenueWallet, price);
        }

        uint256 expiresAt = block.timestamp + SUBSCRIPTION_DURATION;

        subscriptions[msg.sender] = Subscription({
            tier: tier,
            subscribedAt: block.timestamp,
            expiresAt: expiresAt
        });

        emit Subscribed(msg.sender, tier, price, expiresAt);
    }

    // ──────────────────────────────────────────────
    //  Views
    // ──────────────────────────────────────────────

    /**
     * @notice Returns true if the user has a non-expired subscription
     *         to any paid tier (Starter, Pro, or Business).
     */
    function isActive(address user) external view returns (bool) {
        Subscription memory sub = subscriptions[user];
        return sub.tier > TIER_FREE && block.timestamp <= sub.expiresAt;
    }

    /**
     * @notice Returns the user's current tier.
     *         Returns 0 (Free) if the subscription has expired.
     */
    function getTier(address user) external view returns (uint8) {
        Subscription memory sub = subscriptions[user];
        if (sub.tier == TIER_FREE) return TIER_FREE;
        if (block.timestamp > sub.expiresAt) return TIER_FREE;
        return sub.tier;
    }

    // ──────────────────────────────────────────────
    //  Admin
    // ──────────────────────────────────────────────

    /**
     * @notice Update the price for a tier.
     * @param tier  The tier to update (0-3).
     * @param price New price in USDC (6 decimals).
     */
    function setTierPrice(uint8 tier, uint256 price) external onlyOwner {
        if (tier > MAX_TIER) revert InvalidTier(tier);
        tierPrices[tier] = price;
        emit TierPriceUpdated(tier, price);
    }

    /**
     * @notice Update the wallet that receives subscription revenue.
     * @param _revenueWallet New revenue wallet address.
     */
    function setRevenueWallet(address _revenueWallet) external onlyOwner {
        if (_revenueWallet == address(0)) revert ZeroAddress();
        revenueWallet = _revenueWallet;
        emit RevenueWalletUpdated(_revenueWallet);
    }

    /**
     * @notice Pause all subscriptions.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause subscriptions.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ──────────────────────────────────────────────
    //  UUPS
    // ──────────────────────────────────────────────

    /**
     * @dev Only the owner can authorize an upgrade.
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}
