export const runtime = 'edge'
import { getCurrentUser } from '@/lib/currentUser'
import AppShell from '@/components/AppShell'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { MONTHLY_TEMPLATES, MONTHLY_TEMPLATE_SLUGS } from '@/lib/templates'
import Link from 'next/link'
const MONTHS_BACK = 6
function monthLabel(y:number,m:number){return new Date(y,m-1,1).toLocaleString('en-US',{month:'short',year:'numeric'})}
function monthKey(y:number,m:number){return y+'-'+String(m).padStart(2,'0')}
function generateMonths(n:number){
  const now=new Date(),months=[]
  for(let i=0;i<n;i++){
    let m=now.getMonth()+1-i,y=now.getFullYear()
    while(m<=0){m+=12;y--}
    months.push({year:y,month:m,key:monthKey(y,m),label:monthLabel(y,m)})
  }
  return months.reverse()
}
export default async function MonthlyReportsPage(){
  const user=await getCurrentUser()
  const supa=supabaseAdmin()
  const months=generateMonths(MONTHS_BACK)
  const now=new Date()
  const curKey=monthKey(now.getFullYear(),now.getMonth()+1)
  const {data:mp}=await supa.from('projects').select('id,company_name,client_email,start_date,status,template_slug').in('template_slug',MONTHLY_TEMPLATE_SLUGS).order('start_date',{ascending:false})
  const {data:ap}=await supa.from('projects').select('client_email,company_name')
  const mProjects=mp??[]
  const {data:tc}=await supa.from('tasks').select('project_id,status').in('project_id',mProjects.map(r=>r.id))
  const tByP=new Map()
  for(const t of tc??[]){
    const c2=tByP.get(t.project_id)??{total:0,done:0}
    c2.total++;if(t.status==='completed')c2.done++
    tByP.set(t.project_id,c2)
  }
  const cMap=new Map()
  for(const p of ap??[])if(p.client_email&&!cMap.has(p.client_email))cMap.set(p.client_email,p.company_name??p.client_email)
  const clients=Array.from(cMap.entries()).sort((a,b)=>a[1].localeCompare(b[1]))
  const idxByT=new Map()
  for(const tmpl of MONTHLY_TEMPLATES){
    const idx=new Map()
    for(const p of mProjects.filter(r=>r.template_slug===tmpl.slug))
      if(p.client_email&&p.start_date)idx.set(p.client_email+'|'+p.start_date.slice(0,7),p)
    idxByT.set(tmpl.slug,idx)
  }
  return(
    <AppShell userName={user.name} userRole={user.role} pageTitle="Monthly Projects" pageSubtitle="Auto-created on the 1st of every month for all clients">
      <div className="flex items-center justify-between mb-8">
        <p className="text-sm text-slate-500">Showing last {MONTHS_BACK} months &middot; {clients.length} clients</p>
        <form method="POST" action="/api/cron/monthly-reports">
          <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg">⚡ Generate {monthLabel(now.getFullYear(),now.getMonth()+1)}</button>
        </form>
      </div>
      {clients.length===0?(
        <p className="text-slate-400 text-center py-16">No clients yet. Create a project first.</p>
      ):(
        <div className="space-y-10">
          {MONTHLY_TEMPLATES.map(tmpl=>{
            const idx=idxByT.get(tmpl.slug)??new Map()
            return(
              <div key={tmpl.slug}>
                <h2 className="text-base font-semibold text-slate-700 mb-3">{tmpl.icon} {tmpl.label}</h2>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead><tr className="border-b border-slate-100">
                      <th className="text-left px-5 py-3 font-semibold text-slate-600 w-48 min-w-[180px]">Client</th>
                      {months.map(m=>(<th key={m.key} className={(m.key===curKey?'text-indigo-600 ':'text-slate-500 ')+'text-center px-3 py-3 font-semibold whitespace-nowrap'}>{m.label}{m.key===curKey&&<span className="ml-1 text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">now</span>}</th>))}
                    </tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {clients.map(([email,company])=>(
                        <tr key={email} className="hover:bg-slate-50">
                          <td className="px-5 py-3"><div className="font-medium text-slate-800 truncate max-w-[170px]">{company}</div><div className="text-xs text-slate-400 truncate">{email}</div></td>
                          {months.map(m=>{
                            const proj=idx.get(email+'|'+m.key)
                            const cts=proj?(tByP.get(proj.id)??{total:0,done:0}):null
                            const pct=cts&&cts.total>0?Math.round(cts.done/cts.total*100):0
                            if(!proj)return(<td key={m.key} className="px-3 py-3 text-center"><span className="text-slate-200 text-xs">&mdash;</span></td>)
                            const sc=pct===100?'bg-green-100 text-green-700 border-green-200':pct>0?'bg-amber-100 text-amber-700 border-amber-200':'bg-slate-100 text-slate-500 border-slate-200'
                            return(<td key={m.key} className="px-3 py-3 text-center"><Link href={'/projects/'+proj.id} className={'inline-flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg border '+sc+' hover:opacity-80 min-w-[60px]'}><span className="font-semibold text-xs">{pct}%</span><span className="text-[10px] opacity-70">{cts?.done}/{cts?.total}</span></Link></td>)
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div className="flex items-center gap-4 mt-6 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 border border-green-200 inline-block" /> 100% done</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-200 inline-block" /> In progress</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-100 border border-slate-200 inline-block" /> Not started</span>
      </div>
    </AppShell>
  )
                                                 }
