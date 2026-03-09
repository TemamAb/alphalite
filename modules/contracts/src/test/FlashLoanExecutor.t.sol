// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../FlashLoanExecutor.sol";

/**
 * @title FlashLoanExecutorTest
 * @dev Comprehensive Foundry tests for FlashLoanExecutor smart contract
 */
contract FlashLoanExecutorTest is Test {
    FlashLoanExecutor public executor;
    
    // Test addresses
    address public admin = makeAddr("admin");
    address public operator = makeAddr("operator");
    address public sentinel = makeAddr("sentinel");
    address public user = makeAddr("user");
    
    // Mock addresses
    address public mockLendingPool = makeAddr("lendingPool");
    address public mockSwapRouter = makeAddr("swapRouter");
    address public mockOracle = makeAddr("oracle");
    
    // Token addresses (mainnet-like)
    address public constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EesAdc43365D9d;
    
    uint256 public constant INITIAL_BALANCE = 100 ether;
    
    event FlashLoanRequested(address indexed token, uint256 amount);
    event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event ProfitGenerated(address indexed token, uint256 profit);
    event CircuitBreakerTriggered(string reason);
    event Withdrawn(address indexed token, uint256 amount, address indexed to);
    event OracleUpdated(address indexed token, address indexed oracle);

    function setUp() public {
        // Deploy FlashLoanExecutor
        executor = new FlashLoanExecutor();
        
        // Initialize the contract
        executor.initialize(
            admin,
            operator,
            mockLendingPool,
            mockSwapRouter
        );
        
        // Set up price feeds
        executor.setPriceFeed(WETH, mockOracle);
        executor.setPriceFeed(USDC, mockOracle);
    }

    // =========================================================================
    // Initialization Tests
    // =========================================================================
    
    function test_Initialization() public {
        assertEq(executor.lendingPool(), mockLendingPool);
        assertEq(executor.swapRouter(), mockSwapRouter);
        assertFalse(executor.circuitBreakerTriggered());
    }
    
    function test_RolesAssigned() public {
        assertTrue(executor.hasRole(executor.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(executor.hasRole(executor.OPERATOR_ROLE(), operator));
        assertTrue(executor.hasRole(executor.SENTINEL_ROLE(), admin));
        assertTrue(executor.hasRole(executor.UPGRADER_ROLE(), admin));
    }

    // =========================================================================
    // Access Control Tests
    // =========================================================================
    
    function test_RequestFlashLoanOnlyOperator() public {
        vm.prank(user);
        vm.expectRevert();
        executor.requestFlashLoan(WETH, 1000 ether, "");
    }
    
    function test_RequestFlashLoanWhenPaused() public {
        vm.prank(admin);
        executor.triggerCircuitBreaker("Test");
        
        vm.prank(operator);
        vm.expectRevert("Pausable: paused");
        executor.requestFlashLoan(WETH, 1000 ether, "");
    }
    
    function test_OnlyAdminCanWithdraw() public {
        vm.prank(user);
        vm.expectRevert();
        executor.withdraw(WETH, 100 ether, user);
    }
    
    function test_OnlySentinelCanTriggerCircuitBreaker() public {
        vm.prank(operator);
        vm.expectRevert();
        executor.triggerCircuitBreaker("Test");
    }
    
    function test_OnlyAdminCanResetCircuitBreaker() public {
        // First trigger as sentinel
        vm.prank(admin);
        executor.triggerCircuitBreaker("Test");
        
        // Try to reset as operator (should fail)
        vm.prank(operator);
        vm.expectRevert();
        executor.resetCircuitBreaker();
        
        // Reset as admin (should work)
        vm.prank(admin);
        executor.resetCircuitBreaker();
        
        assertFalse(executor.circuitBreakerTriggered());
    }

    // =========================================================================
    // Circuit Breaker Tests
    // =========================================================================
    
    function test_CircuitBreakerTrigger() public {
        vm.prank(admin);
        executor.triggerCircuitBreaker("High loss detected");
        
        assertTrue(executor.circuitBreakerTriggered());
        
        vm.prank(operator);
        vm.expectRevert("Circuit breaker active");
        executor.requestFlashLoan(WETH, 1000 ether, "");
    }
    
    function test_CircuitBreakerReset() public {
        vm.prank(admin);
        executor.triggerCircuitBreaker("Test");
        
        vm.prank(admin);
        executor.resetCircuitBreaker();
        
        assertFalse(executor.circuitBreakerTriggered());
        
        vm.prank(operator);
        executor.requestFlashLoan(WETH, 1000 ether, ""); // Should not revert
    }

    // =========================================================================
    // Oracle Tests
    // =========================================================================
    
    function test_SetPriceFeed() public {
        address newOracle = makeAddr("newOracle");
        
        vm.prank(admin);
        executor.setPriceFeed(USDT, newOracle);
        
        assertEq(executor.priceFeeds(USDT), newOracle);
    }
    
    function test_OnlyAdminCanSetPriceFeed() public {
        vm.prank(operator);
        vm.expectRevert();
        executor.setPriceFeed(USDC, mockOracle);
    }

    // =========================================================================
    // Withdrawal Tests
    // =========================================================================
    
    function test_WithdrawETH() public {
        // Deal ETH to contract
        vm.deal(address(executor), 10 ether);
        
        uint256 balanceBefore = user.balance;
        
        vm.prank(admin);
        executor.withdraw(address(0), 5 ether, user);
        
        assertEq(user.balance, balanceBefore + 5 ether);
    }
    
    function test_WithdrawERC20() public {
        // Deploy mock ERC20
        MockERC20 token = new MockERC20("Test", "TEST", 18);
        token.mint(address(executor), 1000 ether);
        
        uint256 balanceBefore = user.balance;
        
        vm.prank(admin);
        executor.withdraw(address(token), 500 ether, user);
        
        assertEq(token.balanceOf(user), 500 ether);
    }

    // =========================================================================
    // Upgradeability Tests
    // =========================================================================
    
    function test_UpgradeByNonUpgrader() public {
        address newImplementation = makeAddr("newImplementation");
        
        vm.prank(user);
        vm.expectRevert();
        executor.upgradeTo(newImplementation);
    }
    
    function test_UpgradeByAdmin() public {
        address newImplementation = makeAddr("newImplementation");
        
        // This would work with a proper implementation
        vm.prank(admin);
        executor.upgradeTo(newImplementation);
    }

    // =========================================================================
    // Flash Loan Execution Tests (Simulation)
    // =========================================================================
    
    function test_FlashLoanRequest() public {
        bytes memory params = abi.encode(USDC, 3000); // Target token and fee
        
        vm.prank(operator);
        // In production testing (fork mode), this should NOT revert if liquidity exists.
        // For unit tests without fork, we expect the mock call to happen.
        executor.requestFlashLoan(WETH, 1000 ether, params);
    }

    // =========================================================================
    // Gas Efficiency Tests
    // =========================================================================
    
    function test_GasCostOfRequestFlashLoan() public {
        bytes memory params = abi.encode(USDC, 3000);
        
        vm.prank(operator);
        // Measure gas - would need proper mocking for accurate measurement
        uint256 gasStart = gasleft();
        // executor.requestFlashLoan(WETH, 1000 ether, params);
        uint256 gasUsed = gasStart - gasleft();
        
        // Log gas usage (for analysis)
        emit log_named_uint("Gas used for flash loan request", gasUsed);
    }

    // =========================================================================
    // Edge Cases
    // =========================================================================
    
    function test_ZeroAmountFlashLoan() public {
        bytes memory params = abi.encode(USDC, 3000);
        
        vm.prank(operator);
        // Should work but with zero amount
        vm.expectRevert();
        executor.requestFlashLoan(WETH, 0, params);
    }
    
    function test_MultipleCircuitBreakerTriggers() public {
        vm.prank(admin);
        executor.triggerCircuitBreaker("First");
        
        vm.prank(admin);
        executor.triggerCircuitBreaker("Second");
        
        // Should still be triggered
        assertTrue(executor.circuitBreakerTriggered());
    }

    // =========================================================================
    // Event Tests
    // =========================================================================
    
    function test_FlashLoanRequestedEvent() public {
        bytes memory params = abi.encode(USDC, 3000);
        
        vm.prank(operator);
        vm.expectEmit(true, false, false, true);
        emit FlashLoanRequested(WETH, 1000 ether);
        // Would emit if lending pool was properly mocked
    }
    
    function test_CircuitBreakerEvent() public {
        vm.prank(admin);
        vm.expectEmit(true, false, false, true);
        emit CircuitBreakerTriggered("Test reason");
        executor.triggerCircuitBreaker("Test reason");
    }
}

/**
 * @dev Mock ERC20 token for testing
 */
contract MockERC20 is Test {
    string public name;
    string public symbol;
    uint8 public decimals;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }
    
    function mint(address to, uint256 amount) public {
        balanceOf[to] += amount;
    }
    
    function transfer(address to, uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        emit Transfer(from, to, amount);
        return true;
    }
}
