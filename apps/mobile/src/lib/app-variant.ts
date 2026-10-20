export function authRedirect(scheme: string | string[] | undefined): string {
  const first = Array.isArray(scheme) ? scheme[0] : scheme;
  return `${first ?? 'babble'}://auth/callback`;
}
