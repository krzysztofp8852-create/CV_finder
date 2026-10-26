/** Polska odmiana rzeczownika po liczebniku: 1 plik, 2 pliki, 5 plików, 22 pliki. */
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) return few;
  return many;
}
