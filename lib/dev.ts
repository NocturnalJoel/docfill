export const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';
export const DEV_EMAIL = 'demo@paperworkslayer.com';

export function isDevRequest(request: { cookies: { get: (name: string) => { value: string } | undefined } }): boolean {
  return request.cookies.get('dev_bypass')?.value === '1';
}
