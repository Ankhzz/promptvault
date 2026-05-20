// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract Marketplace {
    address public immutable musdc;
    address public immutable owner;

    event PurchaseSuccessful(
        uint256 indexed vaultUuid,
        address indexed buyer,
        address indexed creator,
        uint256 price
    );

    constructor(address _musdc) {
        musdc = _musdc;
        owner = msg.sender;
    }

    function purchase(
        uint256 vaultUuid,
        uint256 price,
        address creator
    ) external returns (bool) {
        require(price > 0, "Price must be > 0");
        require(creator != address(0), "Invalid creator");
        require(
            IERC20(musdc).transferFrom(msg.sender, creator, price),
            "Transfer failed"
        );

        emit PurchaseSuccessful(vaultUuid, msg.sender, creator, price);
        return true;
    }
}
