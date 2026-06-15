import { getRequestContext } from '@cloudflare/next-on-pages'

function getEnv(key: string): string {
        try {
                    return (getRequestContext().env as Record<string, string>)[key] ?? ''
        } catch {
                    return (process.env as Record<string, string | undefined>)[key] ?? ''
        }
}

export async function exchangeCode(code: string): Promise<string> {
        const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                                    grant_type: 'authorization_code',
                                    code,
                                    redirect_uri: `${getEnv('NEXT_PUBLIC_SITE_URL')}/api/auth/linkedin/callback`,
                                    client_id: getEnv('LINKEDIN_CLIENT_ID'),
                                    client_secret: getEnv('LINKEDIN_CLIENT_SECRET'),
                    }),
        })
        const data = await res.json()
        if (!res.ok || !data.access_token) {
                    throw new Error(`LinkedIn token exchange failed: ${data.error_description || data.error || res.status}`)
        }
        return data.access_token
}

export async function getUserInfo(token: string) {
        const res = await fetch('https://api.linkedin.com/v2/userinfo', {
                    headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
                    throw new Error(`LinkedIn userinfo failed: ${res.status}`)
        }
        const data = await res.json()
        return { id: data.sub, name: data.name, email: data.email, picture: data.picture }
}
