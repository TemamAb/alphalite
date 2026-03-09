// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Interfaces
interface ILendingPool {
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

interface IUniswapV3SwapRouter {
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

    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut);
}

interface IChainlinkOracle {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

/**
 * @title FlashLoanExecutor
 * @dev This contract executes flash loan arbitrage strategies.
 * It borrows from a lending pool (e.g., AAVE), performs swaps on a DEX (e.g., Uniswap V3),
 * and repays the loan, keeping the profit.
 */
contract FlashLoanExecutor is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant SENTINEL_ROLE = keccak256("SENTINEL_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    ILendingPool public lendingPool;
    IUniswapV3SwapRouter public swapRouter;

    mapping(address => address) public priceFeeds;
    bool public circuitBreakerTriggered;

    event FlashLoanRequested(address indexed token, uint256 amount);
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    event ProfitGenerated(address indexed token, uint256 profit);
    event CircuitBreakerTriggered(string reason);
    event Withdrawn(address indexed token, uint256 amount, address indexed to);
    event OracleUpdated(address indexed token, address indexed oracle);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address admin,
        address operator,
        address _lendingPool,
        address _swapRouter
    ) public initializer {
        __UUPSUpgradeable_init();
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, operator);
        _grantRole(SENTINEL_ROLE, admin); // Admin is also sentinel initially
        _grantRole(UPGRADER_ROLE, admin);

        lendingPool = ILendingPool(_lendingPool);
        swapRouter = IUniswapV3SwapRouter(_swapRouter);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}

    function requestFlashLoan(
        address token,
        uint256 amount,
        bytes memory params
    ) external onlyRole(OPERATOR_ROLE) whenNotPaused nonReentrant {
        address[] memory assets = new address[](1);
        assets[0] = token;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;
        uint256[] memory modes = new uint256[](1);
        modes[0] = 0; // No debt

        lendingPool.flashLoan(
            address(this),
            assets,
            amounts,
            modes,
            address(this),
            params,
            0
        );
        emit FlashLoanRequested(token, amount);
    }

    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external returns (bool) {
        require(
            msg.sender == address(lendingPool),
            "Caller is not lending pool"
        );

        // Decode params to get target token and fee for the two-hop swap
        (address targetToken, uint24 fee) = abi.decode(
            params,
            (address, uint24)
        );

        address tokenIn = assets[0];
        uint256 amountIn = amounts[0];

        // 1. First swap: tokenIn -> targetToken
        IERC20(tokenIn).safeApprove(address(swapRouter), amountIn);
        uint256 amountIntermediate = swapRouter.exactInputSingle(
            IUniswapV3SwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: targetToken,
                fee: fee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        emit TradeExecuted(tokenIn, targetToken, amountIn, amountIntermediate);

        // 2. Second swap: targetToken -> tokenIn
        IERC20(targetToken).safeApprove(address(swapRouter), amountIntermediate);
        uint256 amountOut = swapRouter.exactInputSingle(
            IUniswapV3SwapRouter.ExactInputSingleParams({
                tokenIn: targetToken,
                tokenOut: tokenIn,
                fee: fee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIntermediate,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        emit TradeExecuted(targetToken, tokenIn, amountIntermediate, amountOut);

        // 3. Profit check and loan repayment
        uint256 amountToRepay = amountIn + premiums[0];
        require(amountOut >= amountToRepay, "Unprofitable trade");

        uint256 profit = amountOut - amountToRepay;
        emit ProfitGenerated(tokenIn, profit);

        // Repay the loan
        IERC20(tokenIn).safeApprove(address(lendingPool), amountToRepay);

        return true;
    }

    function triggerCircuitBreaker(string calldata reason)
        external
        onlyRole(SENTINEL_ROLE)
    {
        _pause();
        circuitBreakerTriggered = true;
        emit CircuitBreakerTriggered(reason);
    }

    function resetCircuitBreaker() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
        circuitBreakerTriggered = false;
    }

    function setPriceFeed(address token, address oracle)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        priceFeeds[token] = oracle;
        emit OracleUpdated(token, oracle);
    }

    function withdraw(address token, uint256 amount, address to)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (token == address(0)) {
            payable(to).transfer(amount);
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
        emit Withdrawn(token, amount, to);
    }

    function rescueFunds(address token, address to)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        uint256 balance = (token == address(0))
            ? address(this).balance
            : IERC20(token).balanceOf(address(this));
        withdraw(token, balance, to);
    }

    // Receive ETH
    receive() external payable {}
}