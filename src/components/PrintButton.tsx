'use client'
export default function PrintButton() {
  return (
    <button onClick={() => window.print()}
      className="print:hidden inline-flex items-center rounded-lg px-4 py-2 text-[13px] font-semibold bg-brand-600 text-white hover:bg-brand-700">
      Print / Save as PDF
    </button>
  )
}
