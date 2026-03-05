// IUniswapV3FlashCallback.sol - Uniswap V3 Flash Loan Callback Interface

pragma solidity ^0.8.0;

/**
 * @title IUniswapV3FlashCallback
 * @notice Interface for the Uniswap V3 flash loan callback
 */
interface IUniswapV3FlashCallback {
    /**
     * @notice Called to `msg.sender` after initiating a flash loan.
     * @param fee0 The fee required to be paid for borrowing token0
     * @param fee1 The fee required to be paid for borrowing token1
     * @param data Any data passed through by the caller via the IUniswapV3PoolActions#flash call
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external;
}

/**
 * @title IUniswapV3Pool
 * @notice Interface for interacting with Uniswap V3 pools
 */
interface IUniswapV3Pool {
    /**
     * @notice Flash loan tokens from the pool
     * @param recipient The address to receive the flash loaned tokens
     * @param token0 The address of the first token to flash loan
     * @param token1 The address of the second token to flash loan
     * @param amount0 The amount of token0 to flash loan
     * @param amount1 The amount of token1 to flash loan
     * @param data Arbitrary data to pass to the callback
     */
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;

    /**
     * @notice Returns the current pool token0 address
     */
    function token0() external view returns (address);

    /**
     * @notice Returns the current pool token1 address
     */
    function token1() external view returns (address);

    /**
     * @notice Returns the pool's fee (in hundredths of a bip)
     */
    function fee() external view returns (uint24);
}
