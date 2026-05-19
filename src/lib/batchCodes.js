// Batch code formula: {batch}26{letter}
// Letters cycle a-e. Batches 1-18 use offset 1; batches 19+ use offset 19 (deliberate reset).
const LETTERS = 'abcde'

export function getBatchCode(n) {
  const idx = n <= 18 ? (n - 1) % 5 : (n - 19) % 5
  return `${n}26${LETTERS[idx]}`
}

export function validateBatchCode(batch, code) {
  const n = parseInt(batch)
  if (!n || n < 1) return false
  return getBatchCode(n) === String(code).trim().toLowerCase()
}
