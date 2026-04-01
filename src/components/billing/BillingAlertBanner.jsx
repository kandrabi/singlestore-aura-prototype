import { AlertTriangle, Sparkles } from 'lucide-react'

export default function BillingAlertBanner({
  monthlyCredit = 800,
  exhaustedDate = 'March 20',
  usedCredits = 1000,
  onDemandCredits = 200,
  estimatedTotal = '1.5K',
  additionalOnDemand = 700,
  onPreventOverages,
}) {
  return (
    <div className="flex items-center justify-between rounded border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded border border-amber-500 bg-amber-100">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium text-amber-700">
            Your {monthlyCredit} CR monthly credit was exhausted on {exhaustedDate} — on-demand charges are now accruing
          </p>
          <p className="text-xs text-amber-600">
            You've used {usedCredits.toLocaleString()} CR so far ({onDemandCredits} CR on-demand). Estimated month total: {estimatedTotal} CR (+{additionalOnDemand} CR on-demand).
          </p>
        </div>
      </div>
      <button
        onClick={onPreventOverages}
        className="flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        <Sparkles className="h-4 w-4 text-purple-600" />
        Prevent Overages
      </button>
    </div>
  )
}
