const isProduction = process.env.NODE_ENV === 'production'

export function sanitizeKey(hex: string): string {
  if (!hex || hex.length < 14) return '[redacted]'
  return `${hex.slice(0, 8)}...${hex.slice(-4)}`
}

export function sanitizeAddress(addr: string): string {
  if (!addr || addr.length < 10) return '[redacted]'
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

type LogLevel = 'info' | 'warn' | 'error'

export function cryptoLog(level: LogLevel, msg: string, data?: Record<string, unknown>) {
  if (isProduction) return

  const sanitizedData = data
    ? Object.fromEntries(
        Object.entries(data).map(([key, value]) => {
          if (typeof value === 'string') {
            if (key.toLowerCase().includes('key') || key.toLowerCase().includes('datakey')) {
              return [key, sanitizeKey(value)]
            }
            if (key.toLowerCase().includes('pubkey') || key.toLowerCase().includes('publickey')) {
              return [key, sanitizeKey(value)]
            }
            if (key.toLowerCase().includes('secret') || key.toLowerCase().includes('private')) {
              return [key, '[redacted]']
            }
          }
          if (value instanceof Uint8Array) {
            const hex = Array.from(value).map(b => b.toString(16).padStart(2, '0')).join('')
            return [key, sanitizeKey(hex)]
          }
          return [key, value]
        }),
      )
    : undefined

  const prefix = `[PromptVault:${level}]`
  if (level === 'error') {
    console.error(prefix, msg, sanitizedData)
  } else if (level === 'warn') {
    console.warn(prefix, msg, sanitizedData)
  } else {
    console.log(prefix, msg, sanitizedData)
  }
}
