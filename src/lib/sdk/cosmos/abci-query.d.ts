/**
 * CometBFT abci_query client for the x/dkg module.
 *
 * story nodes expose x/dkg's gRPC query service but don't run a full
 * gRPC-gateway REST API. CometBFT RPC (port 26657 by default) lets us invoke
 * any registered gRPC query method by sending a protobuf-encoded request as
 * the `data` field and decoding the protobuf response.
 */
import { type DKGNetwork, type DKGParams, type DKGRegistration, type DKGPartialDecryptionSubmissionsByRound } from "./dkg-proto.js";
/**
 * Send an abci_query to CometBFT and return the raw response value.
 *
 * @param rpcUrl  CometBFT RPC base URL, e.g. "http://node:26657"
 * @param path    Full gRPC method path, e.g. "/story.dkg.v1.types.Query/GetLatestActiveDKGNetwork"
 * @param data    Protobuf-encoded request bytes (empty for empty messages)
 */
export declare function abciQuery(rpcUrl: string, path: string, data: Uint8Array): Promise<Uint8Array>;
export declare function queryLatestActiveDKGNetwork(rpcUrl: string): Promise<DKGNetwork>;
/**
 * Query x/dkg module parameters. All `*Period` fields are durations in BLOCKS
 * (not seconds). One full DKG epoch =
 *   registrationPeriod + dealingPeriod + finalizationPeriod + activePeriod.
 */
export declare function queryDKGParams(rpcUrl: string): Promise<DKGParams>;
export declare function queryVerifiedRegistrations(rpcUrl: string, round: number, codeCommitmentHex?: string): Promise<DKGRegistration[]>;
/**
 * Query all stored partial decryption submissions for a (uuid, requester) pair.
 *
 * The keeper returns NotFound when there are no submissions yet; this is
 * surfaced as an empty array so pollers can simply retry.
 */
export declare function queryCDRPartials(rpcUrl: string, uuid: number, requesterPubKeyHex: string): Promise<DKGPartialDecryptionSubmissionsByRound[]>;
//# sourceMappingURL=abci-query.d.ts.map