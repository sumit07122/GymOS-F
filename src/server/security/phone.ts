/** Normalises Indian mobile numbers to E.164 (+91XXXXXXXXXX). Returns null when invalid. */
export function normalizeIndianPhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "");
  let national: string;
  if (/^\+91\d{10}$/.test(digits)) national = digits.slice(3);
  else if (/^91\d{10}$/.test(digits)) national = digits.slice(2);
  else if (/^0\d{10}$/.test(digits)) national = digits.slice(1);
  else if (/^\d{10}$/.test(digits)) national = digits;
  else return null;
  return /^[6-9]\d{9}$/.test(national) ? `+91${national}` : null;
}

export const maskPhone = (e164: string) => `${e164.slice(0, 3)}******${e164.slice(-4)}`;
