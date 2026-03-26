export const FX_RATES_TO_KES = {
  KES: 1,
  NGN: 0.084,
  GHS: 8.57,
  ZAR: 7.14,
  UGX: 0.035,
  TZS: 0.05,
  USD: 129.0,
  INR: 1.54,
  RWF: 0.094,
  ETB: 1.02,
  ZWG: 3.60,
};

export const MIN_DEPOSIT_KES = 50;

export function convertFromKES(amountKES, toCurrency) {
  if (toCurrency === 'KES') return amountKES;
  const rate = FX_RATES_TO_KES[toCurrency];
  if (!rate) return amountKES;
  return Math.round((amountKES / rate) * 100) / 100;
}

export function convertToKES(amount, fromCurrency) {
  if (fromCurrency === 'KES') return amount;
  const rate = FX_RATES_TO_KES[fromCurrency];
  if (!rate) return amount;
  return Math.round(amount * rate * 100) / 100;
}
