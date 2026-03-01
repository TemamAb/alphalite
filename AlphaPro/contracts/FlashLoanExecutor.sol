// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

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

contract FlashLoanExecutor is 
    Initializable, 
    UUPSUpgradeable, 
    AccessControlUpgradeable, 
    ReentrancyGuardUpgradeable 
{
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    IPool public LENDING_POOL;
    address public TREASURY_WALLET;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _lendingPool, address _treasury) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        _grantRole(EXECUTOR_ROLE, msg.sender);

        LENDING_POOL = IPool(_lendingPool);
        TREASURY_WALLET = _treasury;
    }

    function requestFlashLoan(address token, uint256 amount, bytes calldata params) external onlyRole(EXECUTOR_ROLE) nonReentrant {
        address[] memory assets = new address;
        assets[0] = token;
        uint256[] memory amounts = new uint256;
        amounts[0] = amount;
        uint256[] memory modes = new uint256;
        modes[0] = 0; 

        LENDING_POOL.flashLoan(address(this), assets, amounts, modes, address(this), params, 0);
    }

    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external returns (bool) {
        require(msg.sender == address(LENDING_POOL), "Caller must be Lending Pool");
        require(initiator == address(this), "Initiator must be this contract");

        // Arbitrage Logic Placeholder
        uint256 amountOwing = amounts[0] + premiums[0];
        IERC20(assets[0]).approve(address(LENDING_POOL), amountOwing);
        return true;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
