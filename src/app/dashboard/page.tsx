export const runtime = 'edge'

import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import TaskDashboard from '@/components/TaskDashboard'

export default async function DashboardPage() {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    if (!session.user) redirect('/')
    return <TaskDashboard user={session.user} />
}
