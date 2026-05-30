// USDC has 6 decimal places.
// $1.00 = 1_000_000 base units
// $100.00 = 100_000_000 base units

export const USDC_DECIMALS = 6
export const USDC_MULTIPLIER = BigInt(10 ** USDC_DECIMALS) // 1_000_000n

// Human-readable dollars → bigint base units.
// Input: 100.50 → Output: 100_500_000n
export function toUSDCBaseUnits(dollars: number): bigint {
  return BigInt(Math.round(dollars * Number(USDC_MULTIPLIER)))
}

// Decimal string (as returned by Circle) → bigint base units.
// Input: "100.50" → Output: 100_500_000n
export function decimalStringToBaseUnits(amount: string): bigint {
  const [whole, frac = ""] = amount.split(".")
  const fracPadded = (frac + "0".repeat(USDC_DECIMALS)).slice(0, USDC_DECIMALS)
  return BigInt(whole || "0") * USDC_MULTIPLIER + BigInt(fracPadded || "0")
}

// bigint base units → plain decimal string.
// Input: 100_500_000n → Output: "100.50"
export function fromUSDCBaseUnits(baseUnits: bigint): string {
  const dollars = Number(baseUnits) / Number(USDC_MULTIPLIER)
  return dollars.toFixed(2)
}

// Format with thousands separators for display.
// Input: 1234567.89 → Output: "1,234,567.89"
export function formatUSDC(dollars: number | string): string {
  const num = typeof dollars === "string" ? parseFloat(dollars) : dollars
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

// Convert bigint base units directly to a decimal string for the
// Circle SDK, which expects amounts as decimal strings (e.g. "100.5").
export function baseUnitsToDecimalString(baseUnits: bigint): string {
  const whole = baseUnits / USDC_MULTIPLIER
  const frac = baseUnits % USDC_MULTIPLIER
  const fracStr = frac.toString().padStart(USDC_DECIMALS, "0").replace(/0+$/, "")
  return fracStr ? `${whole}.${fracStr}` : `${whole}`
}
