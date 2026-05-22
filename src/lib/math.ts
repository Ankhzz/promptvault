export function toBigIntSafe(value: string | number | undefined | null): bigint | null {
  if (value == null) return null
  const str = String(value).trim()
  if (str === '' || isNaN(Number(str))) return null
  const parts = str.split('.')
  const whole = parts[0]
  if (parts.length === 1) return BigInt(whole + '0'.repeat(18))
  let frac = parts[1].slice(0, 18)
  frac = frac.padEnd(18, '0')
  return BigInt(whole + frac)
}