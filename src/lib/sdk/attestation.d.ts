/** Configuration for SGX attestation verification. */
export interface AttestationConfig {
    /** Minimum acceptable security version (SVN) for the enclave. */
    minSecurityVersion?: number;
    /** Expected MRENCLAVE measurement (hex string). If set, attestation must match. */
    expectedMrEnclave?: `0x${string}`;
    /** Expected MRSIGNER measurement (hex string). If set, attestation must match. */
    expectedMrSigner?: `0x${string}`;
}
/** Result of an attestation verification. */
export interface AttestationResult {
    valid: boolean;
    securityVersion?: number;
    mrEnclave?: string;
    mrSigner?: string;
    error?: string;
}
/**
 * Parse fields from an SGX DCAP Quote v3 binary.
 *
 * @param report - Raw SGX quote bytes (from DKG Registered event `enclaveReport`)
 * @returns Parsed fields: mrEnclave, mrSigner, securityVersion
 * @throws {Error} If the report is too short to be a valid SGX quote
 *
 * @example
 * ```ts
 * const fields = parseSgxQuote(enclaveReportBytes);
 * console.log(fields.mrEnclave); // "0x51c08cf3..."
 * ```
 */
export declare function parseSgxQuote(report: Uint8Array): {
    mrEnclave: `0x${string}`;
    mrSigner: `0x${string}`;
    securityVersion: number;
};
/**
 * Verify an SGX attestation report against the given config.
 *
 * Parses the SGX DCAP Quote v3 binary and checks MRENCLAVE, MRSIGNER,
 * and ISV SVN against the provided configuration.
 *
 * Note: This performs client-side field verification only. The cryptographic
 * signature chain (Intel QE → PCK → root CA) is verified on-chain by
 * SGXValidationHook via Automata DCAP contracts. This function provides
 * an additional defense-in-depth check for SDK consumers.
 *
 * @param report - Raw SGX quote bytes (from DKG Registered event `enclaveReport`)
 * @param config - Verification criteria (all optional; omitted fields are not checked)
 * @returns Verification result with parsed fields and pass/fail status
 *
 * @example
 * ```ts
 * const result = await verifyAttestation(enclaveReportBytes, {
 *   expectedMrEnclave: "0x51c08cf3...",
 *   minSecurityVersion: 1,
 * });
 * if (!result.valid) console.error(result.error);
 * ```
 */
export declare function verifyAttestation(report: Uint8Array, config?: AttestationConfig): Promise<AttestationResult>;
//# sourceMappingURL=attestation.d.ts.map