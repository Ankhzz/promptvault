export declare const cdrAbi: readonly [{
    readonly type: "function";
    readonly name: "allocate";
    readonly inputs: readonly [{
        readonly name: "updatable";
        readonly type: "bool";
        readonly internalType: "bool";
    }, {
        readonly name: "writeConditionAddr";
        readonly type: "address";
        readonly internalType: "address";
    }, {
        readonly name: "readConditionAddr";
        readonly type: "address";
        readonly internalType: "address";
    }, {
        readonly name: "writeconditionData";
        readonly type: "bytes";
        readonly internalType: "bytes";
    }, {
        readonly name: "readconditionData";
        readonly type: "bytes";
        readonly internalType: "bytes";
    }];
    readonly outputs: readonly [{
        readonly name: "newVaultUuid";
        readonly type: "uint32";
        readonly internalType: "uint32";
    }];
    readonly stateMutability: "payable";
}, {
    readonly type: "function";
    readonly name: "allocateFee";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "baseFee";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "read";
    readonly inputs: readonly [{
        readonly name: "uuid";
        readonly type: "uint32";
        readonly internalType: "uint32";
    }, {
        readonly name: "accessAuxData";
        readonly type: "bytes";
        readonly internalType: "bytes";
    }, {
        readonly name: "requesterPubKey";
        readonly type: "bytes";
        readonly internalType: "bytes";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "payable";
}, {
    readonly type: "function";
    readonly name: "readFee";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "setAllocateFee";
    readonly inputs: readonly [{
        readonly name: "newAllocateFee";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "setBaseFee";
    readonly inputs: readonly [{
        readonly name: "newBaseFee";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "setReadFee";
    readonly inputs: readonly [{
        readonly name: "newReadFee";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "setWriteFee";
    readonly inputs: readonly [{
        readonly name: "newWriteFee";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "submitEncryptedPartialDecryption";
    readonly inputs: readonly [{
        readonly name: "round";
        readonly type: "uint32";
        readonly internalType: "uint32";
    }, {
        readonly name: "pid";
        readonly type: "uint32";
        readonly internalType: "uint32";
    }, {
        readonly name: "encryptedPartial";
        readonly type: "bytes";
        readonly internalType: "bytes";
    }, {
        readonly name: "ephemeralPubKey";
        readonly type: "bytes";
        readonly internalType: "bytes";
    }, {
        readonly name: "pubShare";
        readonly type: "bytes";
        readonly internalType: "bytes";
    }, {
        readonly name: "requesterPubKey";
        readonly type: "bytes";
        readonly internalType: "bytes";
    }, {
        readonly name: "ciphertext";
        readonly type: "bytes";
        readonly internalType: "bytes";
    }, {
        readonly name: "uuid";
        readonly type: "uint32";
        readonly internalType: "uint32";
    }, {
        readonly name: "signature";
        readonly type: "bytes";
        readonly internalType: "bytes";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "payable";
}, {
    readonly type: "function";
    readonly name: "uuid";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "uuid";
        readonly type: "uint32";
        readonly internalType: "uint32";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "vaults";
    readonly inputs: readonly [{
        readonly name: "uuid";
        readonly type: "uint32";
        readonly internalType: "uint32";
    }];
    readonly outputs: readonly [{
        readonly name: "vault";
        readonly type: "tuple";
        readonly internalType: "struct ICDR.Vault";
        readonly components: readonly [{
            readonly name: "updatable";
            readonly type: "bool";
            readonly internalType: "bool";
        }, {
            readonly name: "writeConditionAddr";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "readConditionAddr";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "writeConditionData";
            readonly type: "bytes";
            readonly internalType: "bytes";
        }, {
            readonly name: "readConditionData";
            readonly type: "bytes";
            readonly internalType: "bytes";
        }, {
            readonly name: "encryptedData";
            readonly type: "bytes";
            readonly internalType: "bytes";
        }];
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "write";
    readonly inputs: readonly [{
        readonly name: "uuid";
        readonly type: "uint32";
        readonly internalType: "uint32";
    }, {
        readonly name: "accessAuxData";
        readonly type: "bytes";
        readonly internalType: "bytes";
    }, {
        readonly name: "encryptedData";
        readonly type: "bytes";
        readonly internalType: "bytes";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "payable";
}, {
    readonly type: "function";
    readonly name: "writeFee";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "maxEncryptedDataSize";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "event";
    readonly name: "EncryptedPartialDecryptionSubmitted";
    readonly inputs: readonly [{
        readonly name: "validator";
        readonly type: "address";
        readonly indexed: true;
        readonly internalType: "address";
    }, {
        readonly name: "round";
        readonly type: "uint32";
        readonly indexed: false;
        readonly internalType: "uint32";
    }, {
        readonly name: "pid";
        readonly type: "uint32";
        readonly indexed: false;
        readonly internalType: "uint32";
    }, {
        readonly name: "encryptedPartial";
        readonly type: "bytes";
        readonly indexed: false;
        readonly internalType: "bytes";
    }, {
        readonly name: "ephemeralPubKey";
        readonly type: "bytes";
        readonly indexed: false;
        readonly internalType: "bytes";
    }, {
        readonly name: "pubShare";
        readonly type: "bytes";
        readonly indexed: false;
        readonly internalType: "bytes";
    }, {
        readonly name: "requesterPubKey";
        readonly type: "bytes";
        readonly indexed: false;
        readonly internalType: "bytes";
    }, {
        readonly name: "ciphertext";
        readonly type: "bytes";
        readonly indexed: false;
        readonly internalType: "bytes";
    }, {
        readonly name: "uuid";
        readonly type: "uint32";
        readonly indexed: false;
        readonly internalType: "uint32";
    }, {
        readonly name: "signature";
        readonly type: "bytes";
        readonly indexed: false;
        readonly internalType: "bytes";
    }, {
        readonly name: "fee";
        readonly type: "uint256";
        readonly indexed: false;
        readonly internalType: "uint256";
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "VaultAllocated";
    readonly inputs: readonly [{
        readonly name: "uuid";
        readonly type: "uint32";
        readonly indexed: false;
        readonly internalType: "uint32";
    }, {
        readonly name: "updatable";
        readonly type: "bool";
        readonly indexed: false;
        readonly internalType: "bool";
    }, {
        readonly name: "writeConditionAddr";
        readonly type: "address";
        readonly indexed: false;
        readonly internalType: "address";
    }, {
        readonly name: "readConditionAddr";
        readonly type: "address";
        readonly indexed: false;
        readonly internalType: "address";
    }, {
        readonly name: "writeConditionData";
        readonly type: "bytes";
        readonly indexed: false;
        readonly internalType: "bytes";
    }, {
        readonly name: "readConditionData";
        readonly type: "bytes";
        readonly indexed: false;
        readonly internalType: "bytes";
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "VaultRead";
    readonly inputs: readonly [{
        readonly name: "uuid";
        readonly type: "uint32";
        readonly indexed: false;
        readonly internalType: "uint32";
    }, {
        readonly name: "requester";
        readonly type: "address";
        readonly indexed: true;
        readonly internalType: "address";
    }, {
        readonly name: "ciphertext";
        readonly type: "bytes";
        readonly indexed: false;
        readonly internalType: "bytes";
    }, {
        readonly name: "requesterPubKey";
        readonly type: "bytes";
        readonly indexed: false;
        readonly internalType: "bytes";
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "VaultWritten";
    readonly inputs: readonly [{
        readonly name: "uuid";
        readonly type: "uint32";
        readonly indexed: false;
        readonly internalType: "uint32";
    }, {
        readonly name: "encryptedData";
        readonly type: "bytes";
        readonly indexed: false;
        readonly internalType: "bytes";
    }];
    readonly anonymous: false;
}];
//# sourceMappingURL=cdr.d.ts.map