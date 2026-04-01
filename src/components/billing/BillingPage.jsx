import { useState } from 'react'
import { Monitor, ChevronDown, Download, Folder } from 'lucide-react'
import BillingAlertBanner from './BillingAlertBanner'
import ComputeUsageCard from './ComputeUsageCard'
import StorageUsageCard from './StorageUsageCard'
import UsageChart from './UsageChart'
import WorkspaceTable from './WorkspaceTable'

const FILTER_OPTIONS = {
  timePeriod: ['Last 6 months', 'Last 3 months', 'Last month', 'This year'],
  name: ['All', 'Production', 'Development', 'Staging'],
  type: ['All', 'Deployment', 'Workspace'],
  cloud: ['All', 'AWS', 'GCP', 'Azure'],
  region: ['All', 'US West', 'US East', 'EU West'],
}

function FilterButton({ label, value, icon: Icon }) {
  return (
    <button className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
      {Icon && <Icon className="h-4 w-4 text-gray-500" />}
      <span>{label}:</span>
      <span className="font-medium">{value}</span>
      <ChevronDown className="h-4 w-4 text-gray-400" />
    </button>
  )
}

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState('usage')
  const [chartViewMode, setChartViewMode] = useState('month')
  const [chartType, setChartType] = useState('chart')
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="min-h-full bg-white">
      {/* Main Container */}
      <div className="mx-auto max-w-[1360px] px-4 py-6">
        <div className="flex flex-col gap-6">
          {/* Section 1: Header + Filters */}
          <section className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-gray-700" />
                <h1 className="text-lg font-semibold text-gray-900">Usage & Billing</h1>
              </div>

              {/* Tabs */}
              <div className="flex gap-6 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('usage')}
                  className={`border-b-2 pb-2 text-sm font-medium ${
                    activeTab === 'usage'
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Usage Estimate
                </button>
                <button
                  onClick={() => setActiveTab('billing')}
                  className={`border-b-2 pb-2 text-sm font-medium ${
                    activeTab === 'billing'
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Billing info
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <FilterButton label="Time period" value="Last 6 months" />
                <div className="h-6 w-px bg-gray-300" />
                <button className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                  <Folder className="h-4 w-4 text-gray-500" />
                  <span>All</span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
                <div className="h-6 w-px bg-gray-300" />
                <FilterButton label="Name" value="All" />
                <FilterButton label="Type" value="All" />
                <FilterButton label="Cloud" value="All" />
                <FilterButton label="Region" value="All" />
              </div>
              <button className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Download className="h-4 w-4" />
                Download Report
              </button>
            </div>
          </section>

          {/* Section 2: Alert Banner */}
          <section>
            <BillingAlertBanner
              monthlyCredit={800}
              exhaustedDate="March 20"
              usedCredits={1000}
              onDemandCredits={200}
              estimatedTotal="1.5K"
              additionalOnDemand={700}
              onPreventOverages={() => console.log('Prevent overages clicked')}
            />
          </section>

          {/* Section 3: Usage Cards Row */}
          <section className="grid grid-cols-3 gap-4">
            <ComputeUsageCard
              creditsUsed={1000}
              creditsRemaining={0}
              estimatedTotal={1550}
              isSelected={true}
            />
            <StorageUsageCard
              used={1}
              estimated={16}
              unit="GB"
              title="Storage"
            />
            <StorageUsageCard
              used={0}
              estimated={0}
              unit="GB"
              title="Transfer"
              isDisabled={true}
            />
          </section>

          {/* Section 4: Chart */}
          <section>
            <UsageChart
              title="Monthly Compute Credits Usage"
              viewMode={chartViewMode}
              onViewModeChange={setChartViewMode}
              chartType={chartType}
              onChartTypeChange={setChartType}
            />
          </section>

          {/* Section 5: Table */}
          <section>
            <WorkspaceTable
              activeCount={2}
              suspendedCount={1}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSimulateChanges={() => console.log('Simulate changes clicked')}
            />
          </section>
        </div>
      </div>
    </div>
  )
}
