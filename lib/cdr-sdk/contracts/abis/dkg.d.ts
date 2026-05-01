export declare const dkgAbi: readonly [{
    readonly type: "function";
    readonly name: "authenticateEnclaveReport";
    readonly inputs: readonly [{
        readonly name: "enclaveReport";
        readonly type: "bytes";
        readonly internalType: "bytes";
    }, {
        readonly name: "enclaveInstanceData";
        readonly type: "tuple";
        readonly internalType: "struct IDKG.EnclaveInstanceData";
        readonly components: readonly [{
            readonly name: "round";
            readonly type: "uint32";
            readonly internalType: "uint32";
        }, {
            readonly name: "validatorAddr";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "enclaveType";
            readonly type: "bytes32";
            readonly internalType: "bytes32";
        }, {
            readonly name: "enclaveCommKey";
            readonly type: "bytes";
            readonly internalType: "bytes";
        }, {
            readonly name: "dkgPubKey";
            readonly type: "bytes";
            readonly internalType: "bytes";
        }];
    }, {
        readonly name: "validationContext";
        readonly type: "bytes";
        readonly internalType: "bytes";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "payable";
}, {
    readonly type: "function";
    readonly name: "cancelUpgrade";
    readonly inputs: readonly [{
        readonly name: "upgradeVersion";
        readonly type: "string";
        readonly internalType: "string";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "enclaveTypeData";
    readonly inputs: readonly [{
        readonly name: "enclaveType";
        readonly type: "bytes32";
        readonly internalType: "bytes32";
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "tuple";
        readonly internalType: "struct IDKG.EnclaveTypeData";
        readonly components: readonly [{
            readonly name: "codeCommitment";
            readonly type: "bytes32";
            readonly internalType: "bytes32";
        }, {
            readonly name: "validationHookAddr";
            readonly type: "address";
            readonly internalType: "address";
        }];
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "fee";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "finalize";
    readonly inputs: readonly [{
        readonly name: "round";
        readonly type: "uint32";
        readonly internalType: "uint32";
    }, {
        readonly name: "validatorAddr";
        readonly type: "address";
        readonly internalType: "address";
    }, {
        readonly name: "enclaveType";
        readonly type: "bytes32";
        readonly internalType: "bytes32";
    }, {
        readonly name: "participantsRoot";
        readonly type: "bytes32";
        readonly internalType: "bytes32";
    }, {
        readonly name: "globalPubKey";
        readonly type: "bytes";
        readonly internalType: "bytes";
    }, {
        readonly name: "publicCoeffs";
        readonly type: "bytes[]";
        readonly internalType: "bytes[]";
    }, {
        readonly name: "pubKeyShare";
        readonly type: "bytes";
        readonly internalType: "bytes";
    }, {
        readonly name: "signature";
        readonly type: "bytes";
        readonly internalType: "bytes";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "payable";
}, {
    readonly type: "function";
    readonly name: "isEnclaveTypeWhitelisted";
    readonly inputs: readonly [{
        readonly name: "enclaveType";
        readonly type: "bytes32";
        readonly internalType: "bytes32";
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "bool";
        readonly internalType: "bool";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "minReqFinalizedParticipants";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "minReqRegisteredParticipants";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "operationalThreshold";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "register";
    readonly inputs: readonly [{
        readonly name: "enclaveReport";
        readonly type: "bytes";
        readonly internalType: "bytes";
    }, {
        readonly name: "enclaveInstanceData";
        readonly type: "tuple";
        readonly internalType: "struct IDKG.EnclaveInstanceData";
        readonly components: readonly [{
            readonly name: "round";
            readonly type: "uint32";
            readonly internalType: "uint32";
        }, {
            readonly name: "validatorAddr";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "enclaveType";
            readonly type: "bytes32";
            readonly internalType: "bytes32";
        }, {
            readonly name: "enclaveCommKey";
            readonly type: "bytes";
            readonly internalType: "bytes";
        }, {
            readonly name: "dkgPubKey";
            readonly type: "bytes";
            readonly internalType: "bytes";
        }];
    }, {
        readonly name: "startBlockHeight";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }, {
        readonly name: "startBlockHash";
        readonly type: "bytes32";
        readonly internalType: "bytes32";
    }, {
        readonly name: "validationContext";
        readonly type: "bytes";
        readonly internalType: "bytes";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "payable";
}, {
    readonly type: "function";
    readonly name: "scheduleUpgrade";
    readonly inputs: readonly [{
        readonly name: "activationHeight";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }, {
        readonly name: "upgradeVersion";
        readonly type: "string";
        readonly internalType: "string";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "setFee";
    readonly inputs: readonly [{
        readonly name: "newFee";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "setMinReqFinalizedParticipants";
    readonly inputs: readonly [{
        readonly name: "newMinReqFinalizedParticipants";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "setMinReqRegisteredParticipants";
    readonly inputs: readonly [{
        readonly name: "newMinReqRegisteredParticipants";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "setOperationalThreshold";
    readonly inputs: readonly [{
        readonly name: "newOperationalThreshold";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "whitelistEnclaveType";
    readonly inputs: readonly [{
        readonly name: "enclaveType";
        readonly type: "bytes32";
        readonly internalType: "bytes32";
    }, {
        readonly name: "enclaveTypeData";
        readonly type: "tuple";
        readonly internalType: "struct IDKG.EnclaveTypeData";
        readonly components: readonly [{
            readonly name: "codeCommitment";
            readonly type: "bytes32";
            readonly internalType: "bytes32";
        }, {
            readonly name: "validationHookAddr";
            readonly type: "address";
            readonly internalType: "address";
        }];
    }, {
        readonly name: "isWhitelisted";
        readonly type: "bool";
        readonly internalType: "bool";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "event";
    readonly name: "EnclaveTypeWhitelisted";
    readonly inputs: readonly [{
        readonly name: "enclaveType";
        readonly type: "bytes32";
        readonly indexed: false;
        readonly internalType: "bytes32";
    }, {
        readonly name: "codeCommitment";
        readonly type: "bytes32";
        readonly indexed: false;
        readonly internalType: "bytes32";
    }, {
        readonly name: "validationHookAddr";
        readonly type: "address";
        readonly indexed: false;
        readonly internalType: "address";
    }, {
        readonly name: "isWhitelisted";
        readonly type: "bool";
        readonly indexed: false;
        readonly internalType: "bool";
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "FeeSet";
    readonly inputs: readonly [{
        readonly name: "newFee";
        readonly type: "uint256";
        readonly indexed: false;
        readonly internalType: "uint256";
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "Finalized";
    readonly inputs: readonly [{
        readonly name: "round";
        readonly type: "uint32";
        readonly indexed: false;
        readonly internalType: "uint32";
    }, {
        readonly name: "validatorAddr";
        readonly type: "address";
        readonly indexed: true;
        readonly internalType: "address";
    }, {
        readonly name: "enclaveType";
        readonly type: "bytes32";
        readonly indexed: false;
        readonly internalType: "bytes32";
    }, {
        readonly name: "codeCommitment";
        readonly type: "bytes32";
        readonly indexed: false;
        readonly internalType: "bytes32";
    }, {
        readonly name: "participantsRoot";
        readonly type: "bytes32";
        readonly indexed: false;
        readonly internalType: "bytes32";
    }, {
        readonly name: "globalPubKey";
        readonly type: "bytes";
        readonly indexed: false;
        readonly internalType: "bytes";
    }, {
        readonly name: "publicCoeffs";
        readonly type: "bytes[]";
        readonly indexed: false;
        readonly internalType: "bytes[]";
    }, {
        readonly name: "pubKeyShare";
        readonly type: "bytes";
        readonly indexed: false;
        readonly internalType: "bytes";
    }, {
        readonly name: "signature";
        readonly type: "bytes";
        readonly indexed: false;
        readonly internalType: "bytes";
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "MinReqFinalizedParticipantsSet";
    readonly inputs: readonly [{
        readonly name: "newMinReqFinalizedParticipants";
        readonly type: "uint256";
        readonly indexed: false;
        readonly internalType: "uint256";
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "MinReqRegisteredParticipantsSet";
    readonly inputs: readonly [{
        readonly name: "newMinReqRegisteredParticipants";
        readonly type: "uint256";
        readonly indexed: false;
        readonly internalType: "uint256";
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "OperationalThresholdSet";
    readonly inputs: readonly [{
        readonly name: "newOperationalThreshold";
        readonly type: "uint256";
        readonly indexed: false;
        readonly internalType: "uint256";
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "Registered";
    readonly inputs: readonly [{
        readonly name: "enclaveReport";
        readonly type: "bytes";
        readonly indexed: false;
        readonly internalType: "bytes";
    }, {
        readonly name: "round";
        readonly type: "uint32";
        readonly indexed: false;
        readonly internalType: "uint32";
    }, {
        readonly name: "validatorAddr";
        readonly type: "address";
        readonly indexed: true;
        readonly internalType: "address";
    }, {
        readonly name: "enclaveType";
        readonly type: "bytes32";
        readonly indexed: false;
        readonly internalType: "bytes32";
    }, {
        readonly name: "enclaveCommKey";
        readonly type: "bytes";
        readonly indexed: false;
        readonly internalType: "bytes";
    }, {
        readonly name: "dkgPubKey";
        readonly type: "bytes";
        readonly indexed: false;
        readonly internalType: "bytes";
    }, {
        readonly name: "codeCommitment";
        readonly type: "bytes32";
        readonly indexed: false;
        readonly internalType: "bytes32";
    }, {
        readonly name: "startBlockHeight";
        readonly type: "uint256";
        readonly indexed: false;
        readonly internalType: "uint256";
    }, {
        readonly name: "startBlockHash";
        readonly type: "bytes32";
        readonly indexed: false;
        readonly internalType: "bytes32";
    }, {
        readonly name: "validationContext";
        readonly type: "bytes";
        readonly indexed: false;
        readonly internalType: "bytes";
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "UpgradeCancelled";
    readonly inputs: readonly [{
        readonly name: "upgradeVersion";
        readonly type: "string";
        readonly indexed: false;
        readonly internalType: "string";
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "UpgradeScheduled";
    readonly inputs: readonly [{
        readonly name: "activationHeight";
        readonly type: "uint256";
        readonly indexed: false;
        readonly internalType: "uint256";
    }, {
        readonly name: "upgradeVersion";
        readonly type: "string";
        readonly indexed: false;
        readonly internalType: "string";
    }];
    readonly anonymous: false;
}];
//# sourceMappingURL=dkg.d.ts.map