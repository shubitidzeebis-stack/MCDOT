// Strip CR/LF — used on any user-controlled string that ends up in an email
// header (Subject, Reply-To, etc.) to prevent header injection.
export function stripCrLf(s: string): string {
  return s.replace(/[\r\n]+/g, " ").trim();
}
