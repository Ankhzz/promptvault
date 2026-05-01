/**
 * Hand-written protobuf codecs for the x/dkg query messages the SDK consumes.
 *
 * Schemas mirror story/client/proto/story/dkg/v1/types/{query,types}.proto.
 * Only fields the SDK reads are decoded; unknown fields are skipped.
 */
export interface DKGNetwork {
    round: number;
    startBlockHeight: bigint;
    startBlockHash: Uint8Array;
    activeValSet: string[];
    total: number;
    threshold: number;
    stage: number;
    isResharing: boolean;
    globalPublicKey: Uint8Array;
    publicCoeffs: Uint8Array[];
    isUpgrade: boolean;
}
export interface DKGRegistration {
    round: number;
    validatorAddr: string;
    index: number;
    dkgPubKey: Uint8Array;
    commPubKey: Uint8Array;
    pubKeyShare: Uint8Array;
    enclaveReport: Uint8Array;
    status: number;
    codeCommitment: Uint8Array;
    enclaveType: Uint8Array;
}
/**
 * As stored by the x/dkg keeper. Note: the keeper does NOT persist the
 * TEE signature or requester_pub_key — those are verified on ingress
 * (see story/client/x/dkg/keeper/dkg_handler.go:PartialDecryptionSubmitted)
 * and dropped before storage.
 */
export interface DKGPartialDecryptionSubmission {
    validator: string;
    round: number;
    pid: number;
    encryptedPartial: Uint8Array;
    ephemeralPubKey: Uint8Array;
    pubShare: Uint8Array;
    label: Uint8Array;
    ciphertext: Uint8Array;
}
export interface DKGPartialDecryptionSubmissionsByRound {
    round: number;
    submissions: DKGPartialDecryptionSubmission[];
    ciphertext: Uint8Array;
    threshold: number;
    thresholdMet: boolean;
}
/**
 * x/dkg module parameters. All `*Period` fields are durations in BLOCKS.
 * One full DKG epoch = registrationPeriod + dealingPeriod + finalizationPeriod + activePeriod.
 */
export interface DKGParams {
    registrationPeriod: bigint;
    dealingPeriod: bigint;
    finalizationPeriod: bigint;
    activePeriod: bigint;
}
export declare function decodeDKGNetwork(bytes: Uint8Array): DKGNetwork;
export declare function decodeDKGRegistration(bytes: Uint8Array): DKGRegistration;
export declare function decodePartialDecryptionSubmission(bytes: Uint8Array): DKGPartialDecryptionSubmission;
export declare function decodePartialsByRound(bytes: Uint8Array): DKGPartialDecryptionSubmissionsByRound;
/** QueryGetLatestActiveDKGNetworkResponse { DKGNetwork network = 1; } */
export declare function decodeLatestActiveResponse(bytes: Uint8Array): DKGNetwork;
/** QueryGetAllVerifiedDKGRegistrationsResponse { repeated DKGRegistration registrations = 1; } */
export declare function decodeVerifiedRegistrationsResponse(bytes: Uint8Array): DKGRegistration[];
/** QueryParamsResponse { Params params = 1; } */
export declare function decodeParamsResponse(bytes: Uint8Array): DKGParams;
export declare function decodeDKGParams(bytes: Uint8Array): DKGParams;
/** QueryGetCDRPartialsResponse { repeated DKGPartialDecryptionSubmissionsByRound submissions = 1; } */
export declare function decodeCDRPartialsResponse(bytes: Uint8Array): DKGPartialDecryptionSubmissionsByRound[];
/** QueryGetLatestActiveDKGNetworkRequest (empty) */
export declare function encodeLatestActiveRequest(): Uint8Array;
/** QueryParamsRequest (empty) */
export declare function encodeParamsRequest(): Uint8Array;
/** QueryGetAllVerifiedDKGRegistrationsRequest { uint32 round = 1; string code_commitment_hex = 2; } */
export declare function encodeVerifiedRegistrationsRequest(round: number, codeCommitmentHex: string): Uint8Array;
/** QueryGetCDRPartialsRequest { uint32 uuid = 1; string requester_pub_key_hex = 2; } */
export declare function encodeCDRPartialsRequest(uuid: number, requesterPubKeyHex: string): Uint8Array;
export declare function encodeDKGNetwork(n: DKGNetwork): Uint8Array;
export declare function encodeDKGRegistration(reg: DKGRegistration): Uint8Array;
export declare function encodePartialDecryptionSubmission(s: DKGPartialDecryptionSubmission): Uint8Array;
export declare function encodePartialsByRound(p: DKGPartialDecryptionSubmissionsByRound): Uint8Array;
export declare function encodeLatestActiveResponse(n: DKGNetwork): Uint8Array;
export declare function encodeDKGParams(p: DKGParams): Uint8Array;
export declare function encodeParamsResponse(p: DKGParams): Uint8Array;
export declare function encodeVerifiedRegistrationsResponse(regs: DKGRegistration[]): Uint8Array;
export declare function encodeCDRPartialsResponse(rounds: DKGPartialDecryptionSubmissionsByRound[]): Uint8Array;
//# sourceMappingURL=dkg-proto.d.ts.map