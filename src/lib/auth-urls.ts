const appOrigin = (process.env.NEXT_PUBLIC_APP_URL || 'https://caserivo.netlify.app').replace(/\/$/, '');

export function authCallbackUrl(query: string) {
  return `${appOrigin}/auth/callback${query}`;
}
