// Deterministic fixture: activity section and "last change" line must agree.
// Run: npx tsx scripts/daily-activity-check.ts   (or node --experimental-strip-types)
import { lastChange, summarize, canonicalOwner } from '../src/lib/dailyReportSummary'
import assert from 'node:assert/strict'

const reported = '2026-11-11'
// Real shape seen 2026-11-12: bulk touch on 11-09, 4 completions on 11-12 (after the reported day).
const stamps = ['2026-11-09', '2026-11-09', '2026-11-12']
const lc = lastChange(stamps, reported)
const nothingHappened = !stamps.includes(reported)
const s = summarize({ score: 1, nothingHappened, todayYmd: '2026-11-12', reportedYmd: reported, overdue: 50 })
assert.equal(s.alarm, true)
assert.equal(lc.daysBeforeReported, 2)
assert.equal(lc.laterChanges, true)
assert.ok(!lc.text.includes('0 day'), 'must not say 0 days ago when the reported day was empty')
// activity on the reported day -> last change is that day and no alarm
const lc2 = lastChange(['2026-11-11'], reported)
assert.equal(lc2.daysBeforeReported, 0)
assert.equal(summarize({ score: 2, nothingHappened: false, todayYmd: '2026-11-12', reportedYmd: reported }).alarm, false)
assert.equal(lastChange([], reported).text, 'never')
const known = ['Olivier', 'Olivier Attia', 'Nicky', 'Nicolette Jones']
assert.equal(canonicalOwner('Olivier', known), 'Olivier Attia')
assert.equal(canonicalOwner('Nicky', known), 'Nicky')
console.log('daily-activity-check: all assertions passed')
