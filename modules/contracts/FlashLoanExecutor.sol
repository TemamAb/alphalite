// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title FlashLoanExecutor
 * @dev Enterprise-grade Flash Loan Executor with UUPS upgradeability,
 *      Role-Based Access Control, and Circuit Breakers.
 *      Implements Protocol 7 (Sentinel Mandate) enforcement on-chain.
 */

// --- Interfaces ---

interface IChainlinkOracle {
    function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}

interface IPool {
    function flashLoan(
        address receiverAddress,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata modes,
        address onBehalfOf,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

contract FlashLoanExecutor is 
    Initializable, 
    UUPSUpgradeable, 
    AccessControlUpgradeable, 
    PausableUpgradeable, 
    ReentrancyGuardUpgradeable 
{
    using SafeERC20 for IERC20;

    // --- Roles ---
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant SENTINEL_ROLE = keccak256("SENTINEL_ROLE");

    // --- Configuration ---
    IPool public lendingPool;
    ISwapRouter public swapRouter;
    
    // --- Circuit Breaker State ---
    uint256 public maxLossThreshold; // Max allowed loss in basis points (if any logic allows loss)
    bool public circuitBreakerTriggered;
    uint256 public constant ORACLE_TIMEOUT = 1 hours;
    
    // Token -> Oracle Address
    mapping(address => address) public priceFeeds;

    // --- Events ---
    event FlashLoanRequested(address indexed token, uint256 amount);
    event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event ProfitGenerated(address indexed token, uint256 profit);
    event CircuitBreakerTriggered(string reason);
    event Withdrawn(address indexed token, uint256 amount, address indexed to);
    event OracleUpdated(address indexed token, address indexed oracle);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialization function for UUPS proxy
     */
    function initialize(
        address _admin, 
        address _operator,
        address _lendingPool,
        address _swapRouter
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __PausableUpgradeable_init();
        __ReentrancyGuardUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _operator);
        _grantRole(SENTINEL_ROLE, _admin); // Admin acts as default Sentinel
        
        lendingPool = IPool(_lendingPool);
        swapRouter = ISwapRouter(_swapRouter);
        
        circuitBreakerTriggered = false;
    }

    /**
     * @dev Required by UUPS module to authorize upgrades
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}

    // --- Core Logic ---

    /**
     * @dev Initiates a flash loan. Only callable by operators.
     * @param token The asset to borrow
     * @param amount The amount to borrow
     * @param params Encoded parameters for the execution logic
     */
    function requestFlashLoan(
        address token,
        uint256 amount,
        bytes calldata params
    ) external onlyRole(OPERATOR_ROLE) whenNotPaused nonReentrant {
        require(!circuitBreakerTriggered, "Circuit breaker active");
        _checkOracleStaleness(token); // Enforce oracle health check

        address[] memory assets = new address[](1);
        assets[0] = token;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;

        uint256[] memory modes = new uint256[](1);
        modes[0] = 0; // 0 = no debt, must repay in same block

        emit FlashLoanRequested(token, amount);

        lendingPool.flashLoan(
            address(this),
            assets,
            amounts,
            modes,
            address(this),
            params,
            0
        );
    }

    /**
     * @dev Callback function called by Aave V3 Pool after transferring assets
     */
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external returns (bool) {
        require(msg.sender == address(lendingPool), "Caller must be lending pool");
        require(initiator == address(this), "Initiator must be this contract");

        // Decode params to determine strategy
        // For simplicity in this verification, we assume a simple swap strategy
        // In production, this would decode a struct with specific execution steps
        (address targetToken, uint24 fee) = abi.decode(params, (address, uint24));

        address asset = assets[0];
        uint256 amount = amounts[0];
        uint256 premium = premiums[0];
        uint256 amountToRepay = amount + premium;

        // 1. Execute Arbitrage Strategy
        uint256 acquiredAmount = _executeSwap(asset, targetToken, amount, fee);
        
        // 2. Swap back to original asset (if needed)
        uint256 finalAmount = _executeSwap(targetToken, asset, acquiredAmount, fee);

        // 3. Verify Profitability
        if (finalAmount < amountToRepay) {
            // REVERT if unprofitable - this ensures the flash loan fails and we only lose gas
            revert("Unprofitable trade");
        }

        uint256 profit = finalAmount - amountToRepay;
        emit ProfitGenerated(asset, profit);

        // 4. Approve repayment
        IERC20(asset).safeApprove(address(lendingPool), amountToRepay);

        return true;
    }

    /**
     * @dev Internal swap execution using Uniswap V3
     */
    function _executeSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee
    ) internal returns (uint256 amountOut) {
        IERC20(tokenIn).safeApprove(address(swapRouter), amountIn);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: 0, // Slippage protection handled by simulation in Engine
            sqrtPriceLimitX96: 0
        });

        amountOut = swapRouter.exactInputSingle(params);
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut);
    }

    // --- Oracle & Security ---

    /**
     * @dev Checks for stale prices from Chainlink to prevent trading on bad data
     */
    function _checkOracleStaleness(address token) internal view {
        address feed = priceFeeds[token];
        if (feed != address(0)) {
            (,, uint256 startedAt,,) = IChainlinkOracle(feed).latestRoundData();
            require(block.timestamp - startedAt < ORACLE_TIMEOUT, "Oracle price stale");
        }
    }

    /**
     * @dev Emergency function to trigger circuit breaker
     */
    function triggerCircuitBreaker(string memory reason) external onlyRole(SENTINEL_ROLE) {
        circuitBreakerTriggered = true;
        _pause();
        emit CircuitBreakerTriggered(reason);
    }

    /**
     * @dev Reset circuit breaker
     */
    function resetCircuitBreaker() external onlyRole(DEFAULT_ADMIN_ROLE) {
        circuitBreakerTriggered = false;
        _unpause();
    }

    // --- Admin Functions ---

    /**
     * @dev Withdraw assets (profit) from the contract
     */
    function withdraw(address token, uint256 amount, address to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (token == address(0)) {
            (bool success, ) = to.call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
        emit Withdrawn(token, amount, to);
    }

    /**
     * @dev Set oracle feed for a token
     */
    function setPriceFeed(address token, address feed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        priceFeeds[token] = feed;
        emit OracleUpdated(token, feed);
    }

    /**
     * @dev Rescue stuck funds (emergency only)
     */
    function rescueFunds(address token, address to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 balance = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransfer(to, balance);
        emit Withdrawn(token, balance, to);
    }

    // --- Receive ETH ---
    receive() external payable {}
}