// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TimeLockReadCondition {
    function checkReadCondition(
        address,
        bytes calldata conditionData,
        bytes calldata
    ) external view returns (bool) {
        uint256 unlockTime = abi.decode(conditionData, (uint256));
        return block.timestamp >= unlockTime;
    }

    function checkWriteCondition(
        address,
        bytes calldata,
        bytes calldata
    ) external pure returns (bool) {
        return true; // Write access is unrestricted for timelocked vaults
    }
}
