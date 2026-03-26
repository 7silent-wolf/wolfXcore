export const COUNTRIES = {
  KE: {
    name: 'Kenya',
    currency: 'KES',
    currencySymbol: 'KSh',
    currencyName: 'Kenyan Shilling',
    flag: '🇰🇪',
    phonePrefix: '+254',
    phonePlaceholder: '0713046497',
    phoneLength: 12,
    paymentMethods: ['mpesa', 'card'],
    mobileMoneyProviders: [
      { id: 'mpesa', name: 'M-Pesa', provider: 'mpesa' },
    ],
    paystackCurrency: 'KES',
    locale: 'en-KE',
  },
  NG: {
    name: 'Nigeria',
    currency: 'NGN',
    currencySymbol: '₦',
    currencyName: 'Nigerian Naira',
    flag: '🇳🇬',
    phonePrefix: '+234',
    phonePlaceholder: '08012345678',
    phoneLength: 13,
    paymentMethods: ['card', 'bank_transfer', 'ussd'],
    mobileMoneyProviders: [],
    ussdBanks: [
      { code: '737', name: 'GTBank' },
      { code: '919', name: 'UBA' },
      { code: '822', name: 'Sterling Bank' },
    ],
    paystackCurrency: 'NGN',
    locale: 'en-NG',
  },
  GH: {
    name: 'Ghana',
    currency: 'GHS',
    currencySymbol: 'GH₵',
    currencyName: 'Ghanaian Cedi',
    flag: '🇬🇭',
    phonePrefix: '+233',
    phonePlaceholder: '0241234567',
    phoneLength: 12,
    paymentMethods: ['mobile_money', 'card'],
    mobileMoneyProviders: [
      { id: 'mtn', name: 'MTN Mobile Money', provider: 'mtn' },
      { id: 'vod', name: 'Vodafone Cash', provider: 'vod' },
      { id: 'tgo', name: 'AirtelTigo Money', provider: 'tgo' },
    ],
    paystackCurrency: 'GHS',
    locale: 'en-GH',
  },
  ZA: {
    name: 'South Africa',
    currency: 'ZAR',
    currencySymbol: 'R',
    currencyName: 'South African Rand',
    flag: '🇿🇦',
    phonePrefix: '+27',
    phonePlaceholder: '0821234567',
    phoneLength: 11,
    paymentMethods: ['card'],
    mobileMoneyProviders: [],
    paystackCurrency: 'KES',
    locale: 'en-ZA',
  },
  CI: {
    name: "Cote d'Ivoire",
    currency: 'XOF',
    currencySymbol: 'CFA',
    currencyName: 'CFA Franc',
    flag: '🇨🇮',
    phonePrefix: '+225',
    phonePlaceholder: '0701234567',
    phoneLength: 12,
    paymentMethods: ['mobile_money', 'card'],
    mobileMoneyProviders: [
      { id: 'mtn', name: 'MTN Mobile Money', provider: 'mtn' },
      { id: 'wave', name: 'Wave', provider: 'wave' },
    ],
    paystackCurrency: 'XOF',
    locale: 'fr-CI',
  },
  UG: {
    name: 'Uganda',
    currency: 'UGX',
    currencySymbol: 'USh',
    currencyName: 'Ugandan Shilling',
    flag: '🇺🇬',
    phonePrefix: '+256',
    phonePlaceholder: '0771234567',
    phoneLength: 12,
    paymentMethods: ['card'],
    mobileMoneyProviders: [],
    paystackCurrency: 'KES',
    locale: 'en-UG',
  },
  TZ: {
    name: 'Tanzania',
    currency: 'TZS',
    currencySymbol: 'TSh',
    currencyName: 'Tanzanian Shilling',
    flag: '🇹🇿',
    phonePrefix: '+255',
    phonePlaceholder: '0712345678',
    phoneLength: 12,
    paymentMethods: ['card'],
    mobileMoneyProviders: [],
    paystackCurrency: 'KES',
    locale: 'en-TZ',
  },
  ZW: {
    name: 'Zimbabwe',
    currency: 'USD',
    currencySymbol: '$',
    currencyName: 'US Dollar',
    flag: '🇿🇼',
    phonePrefix: '+263',
    phonePlaceholder: '0771234567',
    phoneLength: 12,
    paymentMethods: ['card'],
    mobileMoneyProviders: [],
    paystackCurrency: 'KES',
    locale: 'en-ZW',
  },
  IN: {
    name: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    currencyName: 'Indian Rupee',
    flag: '🇮🇳',
    phonePrefix: '+91',
    phonePlaceholder: '9876543210',
    phoneLength: 12,
    paymentMethods: ['card'],
    mobileMoneyProviders: [],
    paystackCurrency: 'KES',
    locale: 'en-IN',
  },
  RW: {
    name: 'Rwanda',
    currency: 'RWF',
    currencySymbol: 'RF',
    currencyName: 'Rwandan Franc',
    flag: '🇷🇼',
    phonePrefix: '+250',
    phonePlaceholder: '0781234567',
    phoneLength: 12,
    paymentMethods: ['card'],
    mobileMoneyProviders: [],
    paystackCurrency: 'KES',
    locale: 'en-RW',
  },
  ET: {
    name: 'Ethiopia',
    currency: 'ETB',
    currencySymbol: 'Br',
    currencyName: 'Ethiopian Birr',
    flag: '🇪🇹',
    phonePrefix: '+251',
    phonePlaceholder: '0911234567',
    phoneLength: 12,
    paymentMethods: ['card'],
    mobileMoneyProviders: [],
    paystackCurrency: 'KES',
    locale: 'en-ET',
  },
  OTHER: {
    name: 'Other',
    currency: 'USD',
    currencySymbol: '$',
    currencyName: 'US Dollar',
    flag: '🌍',
    phonePrefix: '',
    phonePlaceholder: '',
    phoneLength: 0,
    paymentMethods: ['card'],
    mobileMoneyProviders: [],
    paystackCurrency: 'KES',
    locale: 'en-US',
  },
};

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
  XOF: 0.21,
};

export const DEFAULT_COUNTRY = 'KE';
export const BASE_CURRENCY = 'KES';
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

export function formatCurrency(amount, currencyCode = 'KES', options = {}) {
  const country = Object.values(COUNTRIES).find(c => c.currency === currencyCode) || COUNTRIES.KE;
  const formatted = amount.toLocaleString(country.locale, {
    minimumFractionDigits: currencyCode === 'UGX' || currencyCode === 'TZS' || currencyCode === 'RWF' ? 0 : 2,
    maximumFractionDigits: currencyCode === 'UGX' || currencyCode === 'TZS' || currencyCode === 'RWF' ? 0 : 2,
    ...options,
  });
  return `${country.currencySymbol} ${formatted}`;
}

export function formatCurrencyShort(amount, currencyCode = 'KES') {
  const country = Object.values(COUNTRIES).find(c => c.currency === currencyCode) || COUNTRIES.KE;
  const rounded = currencyCode === 'UGX' || currencyCode === 'TZS' || currencyCode === 'RWF'
    ? Math.round(amount)
    : Math.round(amount * 100) / 100;
  return `${currencyCode} ${rounded.toLocaleString()}`;
}

export function getCountryByCode(code) {
  return COUNTRIES[code] || COUNTRIES.OTHER;
}

export function getMinDeposit(currencyCode) {
  return convertFromKES(MIN_DEPOSIT_KES, currencyCode);
}

export function getPaymentMethods(countryCode) {
  const country = COUNTRIES[countryCode] || COUNTRIES.OTHER;
  return country.paymentMethods;
}

export function supportsMpesa(countryCode) {
  return countryCode === 'KE';
}

export function supportsMobileMoney(countryCode) {
  const country = COUNTRIES[countryCode];
  if (!country) return false;
  return country.mobileMoneyProviders && country.mobileMoneyProviders.length > 0;
}

export function getMobileMoneyProviders(countryCode) {
  const country = COUNTRIES[countryCode];
  if (!country) return [];
  return country.mobileMoneyProviders || [];
}

export function getMobileMoneyLabel(countryCode) {
  if (countryCode === 'KE') return 'M-Pesa';
  if (countryCode === 'GH') return 'Mobile Money';
  if (countryCode === 'CI') return 'Mobile Money';
  return 'Mobile Money';
}

export function supportsUSSD(countryCode) {
  const country = COUNTRIES[countryCode];
  if (!country) return false;
  return country.paymentMethods.includes('ussd');
}

export function supportsBankTransfer(countryCode) {
  const country = COUNTRIES[countryCode];
  if (!country) return false;
  return country.paymentMethods.includes('bank_transfer');
}

export function getUSSDbanks(countryCode) {
  const country = COUNTRIES[countryCode];
  if (!country) return [];
  return country.ussdBanks || [];
}

export function getCountryList() {
  return Object.entries(COUNTRIES)
    .filter(([code]) => code !== 'OTHER')
    .map(([code, data]) => ({
      code,
      ...data,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
