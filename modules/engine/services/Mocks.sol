// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000 * 10**18);
    }
    
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}

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
        // Simulate callback to receiver
        // In real Aave, this transfers funds first. We mock that here.
        MockToken(assets[0]).mint(receiverAddress, amounts[0]);
        
        // Calculate premium (fee) - simplified 0.09%
        uint256[] memory premiums = new uint256[](1);
        premiums[0] = (amounts[0] * 9) / 10000;

        // Call executeOperation on receiver
        (bool success, ) = receiverAddress.call(
            abi.encodeWithSignature(
                "executeOperation(address[],uint256[],uint256[],address,bytes)",
                assets, amounts, premiums, msg.sender, params
            )
        );
        require(success, "FlashLoan callback failed");

        // Simulate taking back funds + premium
        MockToken(assets[0]).transferFrom(receiverAddress, address(this), amounts[0] + premiums[0]);
    }
}

contract MockSwapRouter {
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

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut) {
        // Simulate swap: Burn input, Mint output
        MockToken(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
        
        // Mock return amount (1:1 + profit for testing)
        // We assume the test sets up a scenario where output > input + fee
        amountOut = params.amountIn + (params.amountIn / 100); // 1% profit simulation
        MockToken(params.tokenOut).mint(params.recipient, amountOut);
        
        return amountOut;
    }
}

contract MockOracle {
    int256 public price;
    uint256 public updatedAt;

    constructor(int256 _price) {
        price = _price;
        updatedAt = block.timestamp;
    }

    function setPrice(int256 _price) external {
        price = _price;
        updatedAt = block.timestamp;
    }

    function setUpdatedAt(uint256 _updatedAt) external {
        updatedAt = _updatedAt;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (0, price, 0, updatedAt, 0);
    }
}