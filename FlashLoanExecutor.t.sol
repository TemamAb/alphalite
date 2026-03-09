// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../FlashLoanExecutor.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// Interfaces needed for Mocks
interface IFlashLoanSimpleReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

// Mock Token
contract MockToken is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}

// Mock Pool
contract MockPool {
    function flashLoan(
        address receiverAddress,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata modes,
        address onBehalfOf,
        bytes calldata params,
        uint16 referralCode
    ) external {
        // Transfer loan to receiver
        MockToken(assets[0]).mint(receiverAddress, amounts[0]);
        
        // Callback
        IFlashLoanSimpleReceiver(receiverAddress).executeOperation(
            assets[0],
            amounts[0],
            amounts[0] * 9 / 10000, // 0.09% fee
            address(this),
            params
        );
        
        // Repayment check (mock transferFrom)
        uint256 amountToRepay = amounts[0] + (amounts[0] * 9 / 10000);
        IERC20(assets[0]).transferFrom(receiverAddress, address(this), amountToRepay);
    }
}

// Mock Router
contract MockSwapRouter {
    function exactInputSingle(ISwapRouter.ExactInputSingleParams calldata params) external payable returns (uint256 amountOut) {
        // Mock swap: 101% return (profitable)
        amountOut = params.amountIn * 101 / 100;
        MockToken(params.tokenOut).mint(params.recipient, amountOut);
        // Burn input
        IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
    }
}

contract FlashLoanExecutorTest is Test {
    FlashLoanExecutor executor;
    MockToken token;
    MockPool pool;
    MockSwapRouter router;
    
    address owner = address(0x1);
    address operator = address(0x2);
    address sentinel = address(0x3);
    address attacker = address(0x4);

    bytes32 constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 constant SENTINEL_ROLE = keccak256("SENTINEL_ROLE");

    event FlashLoanRequested(address indexed token, uint256 amount);
    event CircuitBreakerTriggered(string reason);
    event Withdrawn(address indexed token, uint256 amount, address indexed to);

    function setUp() public {
        vm.startPrank(owner);

        // Deploy Mocks
        token = new MockToken("Mock USDC", "USDC");
        pool = new MockPool();
        router = new MockSwapRouter();

        // Deploy Implementation
        FlashLoanExecutor implementation = new FlashLoanExecutor();
        
        // Deploy Proxy
        bytes memory initData = abi.encodeWithSelector(
            FlashLoanExecutor.initialize.selector,
            owner,
            operator,
            address(pool),
            address(router)
        );

        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        executor = FlashLoanExecutor(payable(address(proxy)));

        // Grant Sentinel Role
        executor.grantRole(SENTINEL_ROLE, sentinel);

        vm.stopPrank();
    }

    // 1. Initialization & Roles
    function testInitialization() public {
        assertTrue(executor.hasRole(0x00, owner)); // Admin
        assertTrue(executor.hasRole(OPERATOR_ROLE, operator));
        assertTrue(executor.hasRole(SENTINEL_ROLE, sentinel));
    }

    // 2. Access Control
    function testRevert_FlashLoan_Unauthorized() public {
        vm.prank(attacker);
        vm.expectRevert(); // Should revert with AccessControl error
        executor.requestFlashLoan(address(token), 1000, "");
    }

    // 3. Flash Loan Execution
    function testFlashLoanExecution() public {
        uint256 loanAmount = 1000 ether;
        // Params: token address + fee (3000)
        bytes memory params = abi.encode(address(token), uint24(3000));

        vm.prank(operator);
        
        // Expect event
        vm.expectEmit(true, true, true, true);
        emit FlashLoanRequested(address(token), loanAmount);
        
        executor.requestFlashLoan(address(token), loanAmount, params);
        
        // Check profit
        // Profit = 1010 - 1000.9 = 9.1
        assertGt(token.balanceOf(address(executor)), 0);
    }

    // 4. Circuit Breaker
    function testCircuitBreaker() public {
        vm.prank(sentinel);
        vm.expectEmit(true, true, true, true);
        emit CircuitBreakerTriggered("Emergency Stop");
        executor.triggerCircuitBreaker("Emergency Stop");
        assertTrue(executor.paused());

        vm.prank(operator);
        vm.expectRevert(); // EnforcedPause
        executor.requestFlashLoan(address(token), 1000, "");

        vm.prank(owner);
        executor.resetCircuitBreaker();
        assertFalse(executor.paused());
    }

    function testRevert_CircuitBreaker_Unauthorized() public {
        vm.prank(operator);
        vm.expectRevert();
        executor.triggerCircuitBreaker("Hacking");
    }

    // 5. Fund Management
    function testWithdraw() public {
        token.mint(address(executor), 100 ether);
        
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit Withdrawn(address(token), 100 ether, owner);
        executor.withdraw(address(token), 100 ether, owner);
        
        assertEq(token.balanceOf(owner), 100 ether);
    }
}