import { Search, Play, CheckCircle, PauseCircle } from 'lucide-react'

const MOCK_WORKSPACES = [
  {
    id: 1,
    name: 'Production Analytics',
    subtitle: 'Analytics',
    type: 'Deloyment',
    edition: 'Standard',
    cloud: 'AWS',
    region: 'US West 2 (Oregon)',
    size: 'S-2',
    status: 'active',
    creditUsage: 500,
  },
  {
    id: 2,
    name: 'Develop Analytics',
    subtitle: 'Analytics',
    type: 'Deloyment',
    edition: 'Standard',
    cloud: 'AWS',
    region: 'US West 2 (Oregon)',
    size: 'S-2',
    status: 'active',
    creditUsage: 500,
  },
  {
    id: 3,
    name: 'Staging Analytics',
    subtitle: 'Analytics',
    type: 'Deloyment',
    edition: 'Standard',
    cloud: 'AWS',
    region: 'US West 2 (Oregon)',
    size: 'S-2',
    status: 'suspended',
    creditUsage: 500,
  },
]

const STATUS_CONFIG = {
  active: {
    label: 'Active',
    icon: CheckCircle,
    className: 'text-green-600',
    bgClassName: 'bg-green-50',
  },
  suspended: {
    label: 'Suspended',
    icon: PauseCircle,
    className: 'text-gray-500',
    bgClassName: 'bg-gray-100',
  },
}

export default function WorkspaceTable({
  workspaces = MOCK_WORKSPACES,
  activeCount = 2,
  suspendedCount = 1,
  onSimulateChanges,
  searchQuery = '',
  onSearchChange,
}) {
  const columns = [
    { key: 'checkbox', label: '', width: 'w-12' },
    { key: 'name', label: 'Name', width: 'w-48' },
    { key: 'type', label: 'Type', width: 'w-32' },
    { key: 'edition', label: 'Edition', width: 'w-32' },
    { key: 'cloud', label: 'Cloud', width: 'w-24' },
    { key: 'region', label: 'Region', width: 'w-40' },
    { key: 'size', label: 'Size', width: 'w-20' },
    { key: 'status', label: 'Status', width: 'w-28' },
    { key: 'creditUsage', label: 'Credit usage', width: 'w-28' },
  ]

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium text-gray-900">Resources List</h3>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-gray-50 px-3 py-1.5">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-40 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
              />
            </div>
            {/* Simulate button */}
            <button
              onClick={onSimulateChanges}
              className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Play className="h-4 w-4" />
              Simulate changes
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500">
          Active resources: {activeCount} | Suspended resources: {suspendedCount}
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 ${col.width}`}
                >
                  {col.key === 'checkbox' ? (
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {workspaces.map((workspace) => {
              const statusConfig = STATUS_CONFIG[workspace.status]
              const StatusIcon = statusConfig.icon

              return (
                <tr
                  key={workspace.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">
                        {workspace.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {workspace.subtitle}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {workspace.type}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {workspace.edition}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {workspace.cloud}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {workspace.region}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {workspace.size}
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className={`inline-flex items-center gap-1.5 rounded px-2 py-1 ${statusConfig.bgClassName}`}
                    >
                      <StatusIcon className={`h-3.5 w-3.5 ${statusConfig.className}`} />
                      <span className={`text-xs font-medium ${statusConfig.className}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700">
                    {workspace.creditUsage} CR
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
