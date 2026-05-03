export interface ParsedError {
  title: string
  description: string
  variant: 'default' | 'accent' | 'destructive' | 'warning'
}

const PATTERNS: Array<{ test: (msg: string) => boolean; result: ParsedError }> = [
  {
    test: (msg) => /user rejected/i.test(msg) || /denied by user/i.test(msg) || /action_rejected/i.test(msg) || /4001/.test(msg),
    result: {
      title: 'Transaction rejected',
      description: 'You rejected the signature request in your wallet',
      variant: 'warning',
    },
  },
  {
    test: (msg) => /insufficient funds/i.test(msg) || /insufficient balance/i.test(msg) || /not enough.*gas/i.test(msg),
    result: {
      title: 'Insufficient funds',
      description: 'Not enough IP tokens to cover gas for this transaction',
      variant: 'destructive',
    },
  },
  {
    test: (msg) => /nonce/i.test(msg) && /too low/i.test(msg),
    result: {
      title: 'Nonce conflict',
      description: 'Another pending transaction is blocking this one. Wait or clear pending txs in your wallet',
      variant: 'warning',
    },
  },
  {
    test: (msg) => /timeout/i.test(msg) || /timed out/i.test(msg),
    result: {
      title: 'Request timed out',
      description: 'The request took too long. Check your connection and try again',
      variant: 'warning',
    },
  },
  {
    test: (msg) => /revert/i.test(msg) || /execution reverted/i.test(msg),
    result: {
      title: 'Transaction reverted',
      description: 'The contract rejected this transaction. The vault state may have changed',
      variant: 'destructive',
    },
  },
  {
    test: (msg) => /already exists/i.test(msg) || /duplicate/i.test(msg) || /unique constraint/i.test(msg),
    result: {
      title: 'Record already exists',
      description: 'This vault or record already exists in the database',
      variant: 'warning',
    },
  },
  {
    test: (msg) => /network/i.test(msg) || /fetch/i.test(msg) || /failed to fetch/i.test(msg) || /ECONNREFUSED/i.test(msg),
    result: {
      title: 'Network error',
      description: 'Could not reach the blockchain or CDR network. Check your connection',
      variant: 'destructive',
    },
  },
  {
    test: (msg) => /wasm/i.test(msg) || /initialize/i.test(msg),
    result: {
      title: 'WASM initialization failed',
      description: 'The CDR encryption module failed to load. Refresh the page and try again',
      variant: 'destructive',
    },
  },
  {
    test: (msg) => /access denied/i.test(msg) || /unauthorized/i.test(msg) || /not vault owner/i.test(msg),
    result: {
      title: 'Access denied',
      description: 'You do not have permission to access this vault. A valid license token is required',
      variant: 'destructive',
    },
  },
  {
    test: (msg) => /no local key backup/i.test(msg) || /no encrypted data key/i.test(msg),
    result: {
      title: 'No local backup',
      description: 'This vault has no encrypted data key stored. Use CDR threshold unlock instead',
      variant: 'warning',
    },
  },
]

export function parseTxError(err: unknown): ParsedError {
  const msg = err instanceof Error ? err.message : String(err)

  for (const { test, result } of PATTERNS) {
    if (test(msg)) return result
  }

  return {
    title: 'Transaction failed',
    description: msg.length > 120 ? msg.slice(0, 120) + '...' : msg,
    variant: 'destructive',
  }
}
