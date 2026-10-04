const ONE_YEAR = 60 * 60 * 24 * 365;

export function setPreferenceCookie(name: string, value: string): void {
  document.cookie = `${name}=${value}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}
