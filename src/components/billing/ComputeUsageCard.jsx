import { Cpu, Info } from 'lucide-react'

export default function ComputeUsageCard({
  creditsUsed = 1000,
  creditsRemaining = 0,
  estimatedTotal = 1550,
  isSelected = true,
}) {
  const maxCredits = Math.max(creditsUsed, estimatedTotal, 1)
  const usedPercentage = (creditsUsed / maxCredits) * 100

  return (
    <div className={`bg-white rounded-lg shadow-sm ${isSelected ? 'border-2 border-purple-700' : 'border border-gray-200'}`}>
      <div className="p-4 flex flex-col gap-3">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-gray-700" />
            <span className="text-sm font-medium">Compute</span>
            <Info className="h-3.5 w-3.5 text-gray-400" />
          </div>
          <span className="text-xs px-2 py-1 rounded-md bg-yellow-100 text-yellow-800">
            Credit remaining: {creditsRemaining} CR
          </span>
        </div>

        {/* USAGE */}
        <div className="flex justify-between items-end">
          <div className="text-lg font-semibold">{creditsUsed.toLocaleString()} CR used</div>
          <div className="text-xs text-gray-500">of {estimatedTotal.toLocaleString()} CR estimated</div>
        </div>

        {/* PROGRESS */}
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500" style={{ width: `${usedPercentage}%` }} />
        </div>

      </div>
    </div>
  )
}
