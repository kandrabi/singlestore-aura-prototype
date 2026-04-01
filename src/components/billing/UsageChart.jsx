import { BarChart2, Table2 } from 'lucide-react'

const MOCK_DATA = [
  { month: "Aug'25", contracted: 30, onDemand: 0 },
  { month: "Sep'25", contracted: 55, onDemand: 8 },
  { month: "Oct'25", contracted: 48, onDemand: 5 },
  { month: "Nov'25", contracted: 62, onDemand: 10 },
  { month: "Dic'25", contracted: 28, onDemand: 0 },
  { month: "Jan'26", contracted: 25, onDemand: 0, forecasted: true },
  { month: "Feb'26", contracted: 0, onDemand: 0, forecastedContracted: 18, forecastedOnDemand: 12 },
  { month: "Mar'26", contracted: 0, onDemand: 0, forecastedContracted: 12, forecastedOnDemand: 8 },
  { month: "Apr'26", contracted: 0, onDemand: 0, forecastedContracted: 12, forecastedOnDemand: 8 },
]

const LEGEND_ITEMS = [
  { label: 'Contracted', color: 'bg-indigo-500' },
  { label: 'On-demand', color: 'bg-orange-500' },
  { label: 'Contracted forecasted', color: 'bg-indigo-200', dashed: true },
  { label: 'On-demand forecasted', color: 'bg-orange-200', dashed: true },
]

export default function UsageChart({
  title = 'Monthly Compute Credits Usage',
  data = MOCK_DATA,
  viewMode = 'month',
  onViewModeChange,
  chartType = 'chart',
  onChartTypeChange,
}) {
  const maxValue = 75
  const todayIndex = 5

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center gap-4">
          {/* Info view toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Info view</span>
            <div className="flex overflow-hidden rounded-md border border-gray-300">
              <button
                onClick={() => onChartTypeChange?.('chart')}
                className={`flex items-center justify-center px-3 py-1.5 ${
                  chartType === 'chart'
                    ? 'bg-gray-100 text-gray-900'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                <BarChart2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => onChartTypeChange?.('table')}
                className={`flex items-center justify-center px-3 py-1.5 ${
                  chartType === 'table'
                    ? 'bg-gray-100 text-gray-900'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Table2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Month/Day toggle */}
          <div className="flex overflow-hidden rounded-md border border-gray-300">
            <button
              onClick={() => onViewModeChange?.('month')}
              className={`px-4 py-1.5 text-sm ${
                viewMode === 'month'
                  ? 'bg-gray-100 font-medium text-gray-900'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => onViewModeChange?.('day')}
              className={`px-4 py-1.5 text-sm ${
                viewMode === 'day'
                  ? 'bg-gray-100 font-medium text-gray-900'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              Day
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 flex items-center gap-6">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-sm ${item.color} ${
                item.dashed ? 'border border-dashed border-gray-400' : ''
              }`}
            />
            <span className="text-xs text-gray-600">{item.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div className="h-px w-2 bg-gray-900" />
          <span className="text-xs text-gray-600">Today</span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex gap-4">
        {/* Y-axis labels */}
        <div className="flex w-10 flex-col justify-between py-2 text-right text-xs text-gray-500">
          <span>75</span>
          <span>60</span>
          <span>45</span>
          <span>30</span>
          <span>15</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <div className="relative flex flex-1 flex-col">
          {/* Y-axis label */}
          <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-gray-500">
            Credits
          </div>

          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-px w-full bg-gray-100" />
            ))}
          </div>

          {/* Bars */}
          <div className="relative flex h-64 items-end justify-around gap-2 pb-8">
            {/* Today line */}
            <div
              className="absolute top-0 h-full border-l border-gray-900"
              style={{ left: `${((todayIndex + 0.5) / data.length) * 100}%` }}
            >
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-medium text-green-600">
                Today
              </span>
            </div>

            {/* Forecasted background */}
            <div
              className="absolute right-0 top-0 h-full bg-green-50"
              style={{ width: `${((data.length - todayIndex) / data.length) * 100}%` }}
            />

            {data.map((item) => {
              const hasForecasted = item.forecastedContracted || item.forecastedOnDemand
              const contractedHeight = (item.contracted / maxValue) * 100
              const onDemandHeight = (item.onDemand / maxValue) * 100
              const forecastedContractedHeight = ((item.forecastedContracted || 0) / maxValue) * 100
              const forecastedOnDemandHeight = ((item.forecastedOnDemand || 0) / maxValue) * 100

              return (
                <div
                  key={item.month}
                  className="relative z-10 flex flex-col items-center gap-1"
                >
                  <div className="flex h-52 w-6 flex-col-reverse items-center">
                    {/* Actual bars */}
                    {!hasForecasted && (
                      <>
                        <div
                          className="w-full rounded-t bg-indigo-500"
                          style={{ height: `${contractedHeight}%` }}
                        />
                        {item.onDemand > 0 && (
                          <div
                            className="w-full bg-orange-500"
                            style={{ height: `${onDemandHeight}%` }}
                          />
                        )}
                      </>
                    )}
                    {/* Forecasted bars */}
                    {hasForecasted && (
                      <>
                        <div
                          className="w-full rounded-t border border-dashed border-indigo-400 bg-indigo-100"
                          style={{ height: `${forecastedContractedHeight}%` }}
                        />
                        {forecastedOnDemandHeight > 0 && (
                          <div
                            className="w-full border border-dashed border-orange-400 bg-orange-100"
                            style={{ height: `${forecastedOnDemandHeight}%` }}
                          />
                        )}
                      </>
                    )}
                    {/* Partial forecast at today */}
                    {item.forecasted && (
                      <div
                        className="absolute bottom-0 w-full border border-dashed border-indigo-400 bg-indigo-100"
                        style={{ height: `${(15 / maxValue) * 100}%` }}
                      />
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{item.month}</span>
                </div>
              )
            })}
          </div>

          {/* X-axis label */}
          <div className="mt-2 text-center text-xs text-gray-500">July month</div>
        </div>
      </div>
    </div>
  )
}
