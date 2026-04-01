import { HardDrive, Info } from 'lucide-react'

export default function StorageUsageCard({
  used = 1,
  estimated = 16,
  unit = 'GB',
  title = 'Storage',
  isDisabled = false,
}) {
  const maxValue = Math.max(used, estimated, 1)
  const usedPercentage = (used / maxValue) * 100

  if (isDisabled) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm">
        <div className="flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-gray-400" />
              <span className="text-base font-medium text-gray-400">{title}</span>
              <Info className="h-3.5 w-3.5 text-gray-400" />
            </div>
          </div>

          {/* Usage Section */}
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-semibold text-gray-400">
                {used} {unit} used
              </span>
              <span className="text-xs text-gray-400">
                of {estimated} {unit} estimated
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-gray-900" />
            <span className="text-base font-medium text-gray-500">{title}</span>
            <Info className="h-3.5 w-3.5 text-gray-400" />
          </div>
        </div>

        {/* Usage Section */}
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-semibold text-gray-900">
              {used} {unit} used
            </span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">
                of{' '}
                <span className="font-medium">{estimated} {unit}</span>{' '}
                estimated
              </span>
              <Info className="h-3 w-3 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          {/* Solid orange (used) */}
          <div
            className="h-full rounded-full bg-orange-500"
            style={{ width: `${usedPercentage}%` }}
          />
        </div>
      </div>
    </div>
  )
}
