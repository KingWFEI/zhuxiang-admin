export const HOUSE_PAYMENT_OPTIONS = [
  { label: '无押金（月付）', value: '无押金月付', depositMonths: 0 },
  { label: '押一付一', value: '押一付一', depositMonths: 1 },
  { label: '押一付三', value: '押一付三', depositMonths: 1 },
  { label: '押一付六', value: '押一付六', depositMonths: 1 },
  { label: '押一付十二', value: '押一付十二', depositMonths: 1 },
  { label: '押二付一', value: '押二付一', depositMonths: 2 },
] as const

const PAYMENT_ALIASES: Record<string, string> = {
  无押金: '无押金月付',
  免押: '无押金月付',
  零押金: '无押金月付',
  月付: '押一付一',
  季付: '押一付三',
  半年付: '押一付六',
  年付: '押一付十二',
  押一付年: '押一付十二',
}

export function normalizeHousePaymentMethod(value?: string | null) {
  const normalized = value?.trim() || '押一付一'
  const canonical = PAYMENT_ALIASES[normalized] || normalized
  return HOUSE_PAYMENT_OPTIONS.some((option) => option.value === canonical)
    ? canonical
    : '押一付一'
}

export function calculateHouseDeposit(price?: number, paymentMethod?: string | null) {
  const monthlyRent = Number.isFinite(price) ? Math.max(0, price || 0) : 0
  const canonical = normalizeHousePaymentMethod(paymentMethod)
  const option = HOUSE_PAYMENT_OPTIONS.find((item) => item.value === canonical)
  return monthlyRent * (option?.depositMonths ?? 1)
}
