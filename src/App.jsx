import { useState, useRef, useEffect } from 'react'
import './index.css'

// Logo assets from Figma
const LOGO_MONGODB = "https://www.figma.com/api/mcp/asset/9ce333e3-b5f6-4278-ba24-5c403554f35d"
const LOGO_S3 = "https://www.figma.com/api/mcp/asset/7610cc08-9d69-4fe5-a6ba-90da4bd7836b"
const LOGO_MYSQL_DOLPHIN = "https://www.figma.com/api/mcp/asset/29dce6e5-9a1a-4af2-9edd-8871e9217580"
const LOGO_MYSQL_TEXT = "https://www.figma.com/api/mcp/asset/b7da8007-fe74-4bb1-a77c-38b0fefe6f75"
const LOGO_SQLSERVER = "https://www.figma.com/api/mcp/asset/ddb55646-8d64-4a9c-a334-64167f237c05"
const LOGO_SNOWFLAKE = "https://www.figma.com/api/mcp/asset/4aac9dc1-f99f-42d1-a7b5-5dffafbf6cea"
const LOGO_ORACLE = "https://www.figma.com/api/mcp/asset/1144347e-9982-48c9-b455-dbfea7f15964"
const LOGO_POSTGRESQL = "https://www.figma.com/api/mcp/asset/51e4e913-42a2-4851-b7ca-e39d1a88c815"

const DATA_SOURCES = [
  { id: 'load-file', name: 'Load file', description: 'Load your local files into SingleStore', icon: 'file-arrow-up' },
  { id: 'mongodb', name: 'MongoDB', description: 'Load your MongoDB data into SingleStore using CDC Pipelines', icon: 'mongodb' },
  { id: 's3', name: 'Amazon S3', description: 'Load your S3 data into SingleStore', icon: 's3' },
  { id: 'mysql', name: 'MySQL', description: 'Load your MySQL data into SingleStore using Flow', icon: 'mysql' },
  { id: 'oracle', name: 'Oracle', description: 'Load your Oracle data into SingleStore using Flow', icon: 'oracle' },
  { id: 'postgresql', name: 'PostgreSQL', description: 'Load your PostgreSQL data into SingleStore using Flow', icon: 'postgresql' },
  { id: 'sqlserver', name: 'SQL Server', description: 'Load your SQL Server data into SingleStore using Flow', icon: 'sqlserver' },
  { id: 'snowflake', name: 'Snowflake', description: 'Load your Snowflake data into SingleStore using Flow', icon: 'snowflake' },
]

const SIDEBAR_NAV_ITEMS = [
  { id: 'home', icon: 'home', label: 'Home' },
  { id: 'workspaces', icon: 'cloud', label: 'Workspaces' },
  { id: 'databases', icon: 'database', label: 'Databases' },
  { 
    id: 'ingestion', 
    icon: 'arrow-down-to-bracket', 
    label: 'Ingestion',
    expanded: true,
    children: [
      { id: 'load-data', label: 'Load Data', active: true },
      { id: 'pipelines', label: 'Pipelines' },
      { id: 'flow', label: 'Flow', badge: 'Preview' },
    ]
  },
  { id: 'editor', icon: 'rectangle-terminal', label: 'Editor' },
  { id: 'ai', icon: 'sparkles', label: 'AI' },
  { id: 'container-services', icon: 'layer-group', label: 'Container Services' },
  { id: 'monitoring', icon: 'chart-line', label: 'Monitoring' },
  { id: 'configuration', icon: 'cog', label: 'Configuration' },
]

function TypedText({ children, speed = 12, onComplete }) {
  const [displayedText, setDisplayedText] = useState('')
  const text = typeof children === 'string' ? children : ''
  
  useEffect(() => {
    if (!text) {
      onComplete?.()
      return
    }
    
    let index = 0
    setDisplayedText('')
    
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1))
        index++
      } else {
        clearInterval(timer)
        onComplete?.()
      }
    }, speed)
    
    return () => clearInterval(timer)
  }, [text, speed])
  
  return <>{displayedText}<span className="typing-cursor" /></>
}

function formatTime(date) {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

const ALERTS = [
  {
    id: 1,
    icon: 'database',
    title: 'Workspace prod-analytics is at 80% capacity',
    severity: 'high',
    description: 'Memory utilization has been above 80% for the last 10 minutes.',
    extra: 'Recommended size: S4 (currently S2).',
    action: 'Review size recommendation'
  },
  {
    id: 2,
    icon: 'floppy-disk',
    title: 'Memory usage has exceeded 85% on "prod-cluster-2"',
    severity: 'mid',
    description: 'Memory consumption has remained above 85% for the last 10 minutes',
    extra: 'Application performance may be impacted.',
    action: 'View options',
    status: 'Email alert sent'
  },
  {
    id: 3,
    icon: 'cloud',
    title: 'Workspace eu-west-reporting experienced availability issues',
    severity: 'mid',
    description: 'Availability alert fired in the last 30 minutes',
    extra: 'Connections may have failed.',
    action: 'View root cause'
  }
]

const SUGGESTED_PROMPTS = [
  'How do I connect to my database?',
  'Migrate my data from Postgress',
  'Show workspaces at risk on CPU / memory / disk.',
  'Where am I spending the most compute and credits?'
]

const CPU_SPIKE_CHAT_FLOW = [
  {
    type: 'agent',
    content: {
      text: [
        { type: 'bold', content: 'CPU Spike detected' },
        { type: 'mixed', content: 'A CPU spike was detected on your cluster ', bold: '"1b5e7b2d-5fdc-459a-b413-940377dc8c06"', after: ' earlier today.' },
        { type: 'mixed', content: 'At around ', bold: '06:50 UTC', after: ', CPU usage increased from ', bold2: '~65% to 130+ cores (~2× baseline)', after2: ' and remained elevated for ', bold3: '~5 minutes.' },
        { type: 'text', content: 'This spike impacted query latency and workload stability during that window.' }
      ],
      actions: ['Show affected queries', 'Investigate spike']
    }
  },
  {
    type: 'agent',
    content: {
      text: [
        { type: 'bold', content: 'CPU Spike — monitoring workspace leaf nodes (2026-03-03 06:40–07:20 UTC)' }
      ],
      chart: {
        type: 'cpu-spike',
        title: 'CPU Spike — monitoring workspace leaf nodes (2026-03-03 06:40–07:20 UTC)',
        data: [
          { time: '06:40', value: 65 },
          { time: '06:45', value: 68 },
          { time: '06:50', value: 132 },
          { time: '06:55', value: 128 },
          { time: '07:00', value: 85 },
          { time: '07:05', value: 62 },
          { time: '07:10', value: 58 },
          { time: '07:15', value: 55 }
        ]
      },
      table: {
        headers: ['Database', 'Activity Name', 'Total CPU (s)', 'Total Elapsed (s)'],
        rows: [
          ['monitoring_v2', 'insert_label_index_dc98ea213d73b25', '21982.4', '29045.6'],
          ['monitoring', 'Select_act_samples_new_5a38a5e9774b8b2', '5397.8', '8560.9'],
          ['monitoring', 'InsertSelect_latest_metrics_at_at_8e5dd2a59705c21c', '4042.3', '6810.5'],
          ['_prom', 'insert_metrics_4372b1ea90d1946', '2813', '4356.1'],
          ['monitoring', 'insert_act_samples_new_b5a63986a53f47', '749.3', '1105.8']
        ]
      },
      analysis: {
        summary: 'The CPU spike on cluster 1b5e7b2d-5fdc-459a peaked at 06:50 UTC, jumping from ~65 to 132 cores (~2× increase) for ~5 minutes before stabilizing around 55–65 cores.',
        contributors: {
          title: 'Main contributors:',
          items: [
            'Primary driver: insert_label_index (monitoring_v2) — 21,982 CPU seconds across 82,785 executions, indicating sustained high-frequency insert activity.',
            'Major outlier: Select_act_samples_new — 5,398 CPU seconds from a single execution, likely a heavy scan or aggregation that triggered the spike.',
            'Secondary contributor: InsertSelect_latest_metrics — 4,042 CPU seconds across 39 batch operations.'
          ]
        },
        rootCause: {
          title: 'Root cause:',
          text: 'A long-running Select_act_samples_new query overlapped with already elevated insert load from insert_label_index, saturating monitoring leaf nodes around 06:50 UTC.'
        }
      },
      actions: ['Get more details on Select_act_samples_new', 'View optimization recommendations']
    }
  },
  {
    type: 'agent',
    content: {
      thinking: {
        title: 'Thoughts',
        items: [
          'Outside the spike window, Select_act_samples_new is normally inexpensive. Query history shows only one execution in the last 7 days, indicating this was a one-off event.',
          'Next, I examined the node-level execution and leaf-level samples to understand how the query distributed across leaves during the spike.',
          'I now have the full picture and will display the per-node CPU contribution chart.'
        ]
      },
      chart: {
        type: 'per-node',
        title: 'Select_act_samples_new — CPU & Memory per Leaf Node/Partition',
        data: [
          { node: 'node-149 / part-5', cpu: 1374, elapsed: 1936, memory: 6.9 },
          { node: 'node-148 / part-4', cpu: 1042, elapsed: 1548, memory: 4.8 },
          { node: 'node-147 / part-3', cpu: 731, elapsed: 1052, memory: 3.2 },
          { node: 'node-146 / part-2', cpu: 720, elapsed: 968, memory: 2.8 },
          { node: 'node-150 / part-7', cpu: 608, elapsed: 824, memory: 2.1 }
        ]
      },
      analysis: {
        summary: 'The chart shows per-node resource usage for Select_act_samples_new across 5 leaf partitions.',
        items: [
          'node-149 / part-5 handled the most load (1,374s CPU, 6.93 GB memory).',
          'node-148 / part-4 was second (1,042s CPU, 4.83 GB memory).',
          'The remaining nodes used ~608–731s CPU each.'
        ],
        conclusion: 'The query executed once but fanned out across all partitions, totaling ~4,474s CPU. With a CPU/elapsed ratio ~0.7, it was largely CPU-bound.',
        insight: 'The uneven load (node-149 using ~2.3× more CPU than node-150) suggests partition skew, likely due to a larger or more complex data slice in part-5.'
      },
      actions: ['Show optimization recommendations', 'Set up alert for similar spikes']
    }
  }
]

const MIGRATION_PROMPTS = [
  'Migrate my PostgreSQL database to SingleStore',
  'Help me set up CDC from MongoDB',
  'What data sources can I connect?',
  'Estimate migration time for my Oracle DB'
]

const CHAT_FLOW = [
  {
    type: 'agent',
    content: {
      text: [
        { type: 'bold', content: 'Workspace "prod-analytics" is approaching capacity.' },
        { type: 'mixed', content: 'Memory utilization has been ', bold: 'above 80%', after: ' for the last 10 minutes, and query ', bold2: 'latency has increased by ~28%.' },
        { type: 'text', content: 'This usually indicates the workspace is under-provisioned for current workload.' }
      ],
      stats: [
        { label: 'CPU peak', value: '92%', change: '10%' },
        { label: 'Query queueing', value: '4x' },
        { label: 'Queries driving load', value: '3' }
      ],
      actions: ['Show affected queries', 'View recommended actions']
    }
  },
  {
    type: 'agent',
    content: {
      text: [{ type: 'text', content: 'Based on current usage, I recommend resizing this workspace.' }],
      recommendation: {
        label: 'RECOMMENDED',
        title: 'Resize workspace',
        badge: 'S2 → S4',
        impact: ['Reduce latency by 35–50%', 'Eliminate query queueing during peak'],
        cost: '4,380 CR/ month'
      },
      why: [
        'Current workload exceeds S2 capacity consistently',
        'S4 provides enough headroom without over-provisioning',
        'S8 would increase cost without meaningful performance gains'
      ],
      actions: ['Suggest alternate options', 'Apply resize']
    }
  },
  {
    type: 'agent',
    content: {
      text: [{ type: 'text', content: 'These 5 queries account for 78% of your current CPU load. Optimizing even 2–3 of them could meaningfully reduce pressure on the workspace.' }],
      queries: [
        { name: 'analytics.user_funnel_daily', cpu: '38% CPU share', cpuType: 'critical', time: 'avg 4.2s', frequency: '96 runs/day', desc1: 'Full table scan across 90-day window, no partition pruning', desc2: 'Runs every 15 min via scheduled job' },
        { name: 'analytics.user_funnel_weekly', cpu: '21% CPU share', cpuType: 'critical', time: 'avg 3.8s', frequency: '12 runs/week', desc1: 'Incremental updates with partition pruning', desc2: 'Runs every hour via scheduled job' },
        { name: 'analytics.user_funnel_monthly', cpu: '12% CPU share', cpuType: 'warning', time: 'avg 3.5s', frequency: '240 runs/month', desc1: 'Aggregated data with optimized queries', desc2: 'Runs daily via batch processing' },
        { name: 'analytics.user_funnel_quarterly', cpu: '4% CPU share', cpuType: 'warning', time: 'avg 3.0s', frequency: '16 runs/quarter', desc1: 'Summary statistics with partitioning', desc2: 'Runs at the end of each quarter' },
        { name: 'analytics.user_funnel_yearly', cpu: '3% CPU share', cpuType: 'warning', time: 'avg 2.5s', frequency: '~11k runs/year', desc1: 'Snapshot analysis with historical data', desc2: 'Runs annually with data archiving' }
      ],
      options: [
        { icon: 'list-timeline', title: 'Optimize queries', description: 'Add partition pruning to query #1, index transaction_date for #2, rewrite cross-join in #3.', impact: 'High Impact', impactType: 'positive' },
        { icon: 'clock', title: 'Adjust schedules', description: 'Move the 15-min funnel job to off-peak hours, or throttle concurrency during business hours.', impact: 'Mid Impact', impactType: 'warning' },
        { icon: 'grid-2', title: 'Batch small writes', description: 'Group the 14k heartbeat inserts into batches of 100–500. Reduces WAL pressure significantly.', impact: 'Low - Mid Impact', impactType: 'neutral' }
      ],
      footer: "If optimizing queries isn't feasible right now, resizing to S-4 remains the fastest fix with immediate effect.",
      actions: ['Resize anyway']
    }
  },
  {
    type: 'agent',
    content: {
      text: [{ type: 'mixed', content: "You're about to resize prod-analytics from ", bold: 'S2 → S4', after: '. This will increase compute capacity and may take a few minutes to complete.' }],
      actions: ['Cancel', 'Confirm']
    }
  },
  {
    type: 'agent',
    status: 'In Progress',
    content: {
      progress: true,
      text: 'Resizing workspace…',
      time: '~ 4mins'
    }
  },
  {
    type: 'agent',
    content: {
      success: true,
      title: 'Resize complete',
      details: [
        { type: 'text', content: 'Workspace prod-analytics is now running at S4.' },
        { type: 'mixed', content: 'Latency improved by ', bold: '~18%', after: ' in the last few minutes.' }
      ]
    }
  }
]

const USER_MESSAGES = [
  'View recommended actions',
  'Suggest alternate options',
  'Resize anyway',
  'Confirm'
]

function App() {
  const [view, setView] = useState('portal')
  const [activeTab, setActiveTab] = useState('alerts')
  const [inputValue, setInputValue] = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [currentFlowIndex, setCurrentFlowIndex] = useState(0)
  const [userMsgIndex, setUserMsgIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const [activeChatFlow, setActiveChatFlow] = useState('default')
  const [expandedQueries, setExpandedQueries] = useState(true)
  const [expandedOptions, setExpandedOptions] = useState(true)
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [auraPanelOpen, setAuraPanelOpen] = useState(false)
  const [auraPanelWidth, setAuraPanelWidth] = useState(35)
  const [auraPanelFullscreen, setAuraPanelFullscreen] = useState(false)
  const [auraPanelMessages, setAuraPanelMessages] = useState([])
  const [auraPanelInput, setAuraPanelInput] = useState('')
  const chatEndRef = useRef(null)
  const auraChatEndRef = useRef(null)

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages, isTyping])

  useEffect(() => {
    if (auraChatEndRef.current) {
      auraChatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [auraPanelMessages])

  const handleOpenAuraPanel = () => {
    setAuraPanelOpen(true)
  }

  const handleCloseAuraPanel = () => {
    setAuraPanelOpen(false)
    setAuraPanelFullscreen(false)
  }

  const handleAuraPanelSend = (text) => {
    if (!text.trim()) return
    setAuraPanelMessages(prev => [...prev, { type: 'user', id: Date.now(), text, timestamp: new Date() }])
    setAuraPanelInput('')
  }

  const handleAlertClick = (alert) => {
    if (alert.id === 1) {
      setView('chat')
      setChatMessages([])
      setCurrentFlowIndex(0)
      setUserMsgIndex(0)
      setActiveChatFlow('default')
      setTimeout(() => addNextMessage(0), 500)
    }
  }

  const handleNotificationClick = (notification) => {
    if (notification.id === 1) {
      setView('chat')
      setChatMessages([])
      setCurrentFlowIndex(0)
      setUserMsgIndex(0)
      setActiveChatFlow('cpu-spike')
      setTimeout(() => addNextCpuSpikeMessage(0), 500)
    }
  }

  const addNextCpuSpikeMessage = (index) => {
    if (index >= CPU_SPIKE_CHAT_FLOW.length) return
    const message = CPU_SPIKE_CHAT_FLOW[index]
    
    if (message.content.thinking) {
      setIsTyping(true)
      setTimeout(() => {
        const messageId = Date.now()
        setChatMessages(prev => [...prev, { 
          ...message, 
          id: messageId, 
          timestamp: new Date(),
          thinkingExpanded: true,
          showContent: false 
        }])
        setIsTyping(false)
        
        setTimeout(() => {
          setChatMessages(prev => prev.map(m => 
            m.id === messageId ? { ...m, thinkingExpanded: false } : m
          ))
          
          setTimeout(() => {
            setChatMessages(prev => prev.map(m => 
              m.id === messageId ? { ...m, showContent: true } : m
            ))
            setCurrentFlowIndex(index + 1)
          }, 500)
        }, 4000)
      }, 1500)
    } else {
      setIsTyping(true)
      setTimeout(() => {
        setChatMessages(prev => [...prev, { ...message, id: Date.now(), timestamp: new Date() }])
        setIsTyping(false)
        setCurrentFlowIndex(index + 1)
      }, 1500)
    }
  }

  const addNextMessage = (index) => {
    if (index >= CHAT_FLOW.length) return
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      setChatMessages(prev => [...prev, { ...CHAT_FLOW[index], id: Date.now(), timestamp: new Date() }])
      setCurrentFlowIndex(index + 1)
    }, 1200)
  }

  const handleAction = (action) => {
    const actionText = typeof action === 'string' ? action : action.text
    
    if (activeChatFlow === 'cpu-spike') {
      if (['Investigate spike', 'Show affected queries'].includes(actionText)) {
        setChatMessages(prev => [...prev, { type: 'user', id: Date.now(), text: actionText, timestamp: new Date() }])
        setUserMsgIndex(prev => prev + 1)
        setTimeout(() => addNextCpuSpikeMessage(currentFlowIndex), 500)
      } else if (actionText === 'Get more details on Select_act_samples_new') {
        setChatMessages(prev => [...prev, { type: 'user', id: Date.now(), text: "Get more details on Select_act_samples_new", timestamp: new Date() }])
        setUserMsgIndex(prev => prev + 1)
        setTimeout(() => addNextCpuSpikeMessage(currentFlowIndex), 500)
      }
    } else {
      if (['View recommended actions', 'Suggest alternate options', 'Show affected queries'].includes(actionText)) {
        setChatMessages(prev => [...prev, { type: 'user', id: Date.now(), text: actionText, timestamp: new Date() }])
        setUserMsgIndex(prev => prev + 1)
        setTimeout(() => addNextMessage(currentFlowIndex), 500)
      } else if (actionText === 'Apply resize' || actionText === 'Resize anyway') {
        setChatMessages(prev => [...prev, { type: 'user', id: Date.now(), text: 'Resize anyway', timestamp: new Date() }])
        setUserMsgIndex(prev => prev + 1)
        setTimeout(() => addNextMessage(3), 500)
      } else if (actionText === 'Confirm') {
        setChatMessages(prev => [...prev, { type: 'user', id: Date.now(), text: 'Confirm', timestamp: new Date() }])
        setUserMsgIndex(prev => prev + 1)
        setTimeout(() => addNextMessage(4), 500)
        setTimeout(() => addNextMessage(5), 5000)
      }
    }
  }

  const renderContent = () => {
    switch (view) {
      case 'load-data':
        return <LoadDataView onOpenAura={handleOpenAuraPanel} />
      case 'portal':
        return (
          <PortalView
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            inputValue={inputValue}
            setInputValue={setInputValue}
            onAlertClick={handleAlertClick}
          />
        )
      case 'chat':
        return (
          <ChatView
            messages={chatMessages}
            inputValue={inputValue}
            setInputValue={setInputValue}
            isTyping={isTyping}
            onAction={handleAction}
            expandedQueries={expandedQueries}
            setExpandedQueries={setExpandedQueries}
            expandedOptions={expandedOptions}
            setExpandedOptions={setExpandedOptions}
            chatEndRef={chatEndRef}
            activeChatFlow={activeChatFlow}
          />
        )
      default:
        return null
    }
  }

  return (
    <>
      <Header onLogoClick={() => setView('portal')} onAskAura={handleOpenAuraPanel} onNotificationClick={handleNotificationClick} />
      <div className="app-container">
        <Sidebar 
          onNavigate={setView} 
          currentView={view}
          isExpanded={sidebarExpanded}
          onToggleExpand={() => setSidebarExpanded(!sidebarExpanded)}
        />
        <div className={`main-content ${auraPanelOpen && !auraPanelFullscreen ? 'with-aura-panel' : ''}`} style={auraPanelOpen && !auraPanelFullscreen ? { width: `${100 - auraPanelWidth}%` } : {}}>
          <div className="content-area">
            {renderContent()}
          </div>
        </div>
        {auraPanelOpen && (
          <AuraSidePanel
            isOpen={auraPanelOpen}
            isFullscreen={auraPanelFullscreen}
            width={auraPanelWidth}
            onClose={handleCloseAuraPanel}
            onToggleFullscreen={() => setAuraPanelFullscreen(!auraPanelFullscreen)}
            onWidthChange={setAuraPanelWidth}
            messages={auraPanelMessages}
            inputValue={auraPanelInput}
            setInputValue={setAuraPanelInput}
            onSend={handleAuraPanelSend}
            chatEndRef={auraChatEndRef}
          />
        )}
      </div>
    </>
  )
}

function Sidebar({ onNavigate, currentView, isExpanded, onToggleExpand }) {
  const [expandedItems, setExpandedItems] = useState(['ingestion'])

  const toggleExpand = (id) => {
    setExpandedItems(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const getActiveState = (item) => {
    if (item.id === 'home' && currentView === 'portal') return true
    if (item.id === 'load-data' && currentView === 'load-data') return true
    return false
  }

  const handleNavClick = (item) => {
    if (item.children && isExpanded) {
      toggleExpand(item.id)
    } else if (item.id === 'home') {
      onNavigate('portal')
    } else if (item.id === 'ingestion' || item.id === 'load-data') {
      onNavigate('load-data')
    }
  }

  const handleChildClick = (child) => {
    if (child.id === 'load-data') {
      onNavigate('load-data')
    }
  }

  if (!isExpanded) {
    return (
      <div className="sidebar">
        <div className="sidebar-top">
          <button className="sidebar-create-btn" title="Create New">
            <PlusIcon />
          </button>
          <div className="sidebar-items">
            {SIDEBAR_NAV_ITEMS.map((item) => (
              <button 
                key={item.id} 
                className={`sidebar-item ${getActiveState(item) ? 'active' : ''}`}
                onClick={() => handleNavClick(item)}
                title={item.label}
              >
                <SidebarIcon name={item.icon} active={getActiveState(item)} />
              </button>
            ))}
          </div>
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-user-collapsed" title="Syed Kabeer Andrabi">
            <span>SA</span>
          </div>
          <button className="sidebar-item" onClick={onToggleExpand} title="Expand">
            <SidebarIcon name="sidebar" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="expanded-sidebar">
      <div className="expanded-sidebar-top">
        <button className="expanded-sidebar-create-btn">
          <PlusIcon />
          <span>Create New</span>
        </button>
        
        <nav className="expanded-sidebar-nav">
          {SIDEBAR_NAV_ITEMS.map((item) => (
            <div key={item.id} className="nav-item-wrapper">
              <button 
                className={`expanded-nav-item ${getActiveState(item) ? 'active' : ''} ${item.children && expandedItems.includes(item.id) ? 'expanded' : ''}`}
                onClick={() => handleNavClick(item)}
              >
                <div className="nav-item-left">
                  <SidebarIcon name={item.icon} />
                  <span>{item.label}</span>
                </div>
                {item.children && (
                  <span className={`nav-chevron ${expandedItems.includes(item.id) ? 'expanded' : ''}`}>
                    <IconFA name="chevron-down" size={10} />
                  </span>
                )}
              </button>
              
              {item.children && expandedItems.includes(item.id) && (
                <div className="nav-children">
                  {item.children.map((child) => (
                    <button 
                      key={child.id} 
                      className={`nav-child-item ${child.id === 'load-data' && currentView === 'load-data' ? 'active' : ''}`}
                      onClick={() => handleChildClick(child)}
                    >
                      <span>{child.label}</span>
                      {child.badge && <span className="nav-badge">{child.badge}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
      
      <div className="expanded-sidebar-bottom">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">SA</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">Syed Kabeer Andrabi</span>
            <span className="sidebar-user-org">S2DB DPS - CLAUDE AI EVALU...</span>
          </div>
          <button className="sidebar-user-menu">
            <IconFA name="chevron-down" size={12} />
          </button>
        </div>
        <button className="sidebar-collapse-btn" onClick={onToggleExpand}>
          <IconFA name="sidebar" size={14} />
          <span>Collapse</span>
        </button>
      </div>
    </div>
  )
}

function LoadDataView({ onOpenAura }) {
  const [searchValue, setSearchValue] = useState('')

  return (
    <div className="load-data-view">
      <div className="load-data-main">
        <div className="load-data-header">
          <div className="load-data-icon">
            <IconFA name="database" size={20} />
          </div>
          <h1>Load Data</h1>
        </div>

        <div className="load-data-search">
          <SearchIcon />
          <input 
            type="text" 
            placeholder="Search for a data source" 
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>

        <div className="ai-migration-banner">
          <div className="ai-migration-content">
            <div className="ai-migration-label">
              <IconFA name="sparkles" size={12} />
              <span>NEW: AI-POWERED</span>
            </div>
            <h2 className="ai-migration-title">Intelligent Database Migration</h2>
            <p className="ai-migration-description">
              Let Data Migration Agent handle your end-to-end migration from Oracle, MySQL, PostgreSQL, and more. Automatic schema translation, optimal configuration, and real-time validation.
            </p>
            <button className="ai-migration-btn" onClick={onOpenAura}>
              <IconFA name="sparkles" size={14} />
              <span>Data Migration with AI</span>
            </button>
          </div>
        </div>

        <div className="interactive-wizard-section">
          <div className="data-sources-grid">
            {DATA_SOURCES.map((source) => (
              <DataSourceCard key={source.id} source={source} />
            ))}
          </div>
        </div>

      </div>

    </div>
  )
}

function DataSourceCard({ source }) {
  return (
    <div className="data-source-card">
      <div className="data-source-icon">
        <DataSourceLogo name={source.icon} />
      </div>
      <div className="data-source-content">
        <div className="data-source-name">
          <span>{source.name}</span>
        </div>
        <p className="data-source-description">{source.description}</p>
      </div>
    </div>
  )
}

function DataSourceLogo({ name }) {
  switch (name) {
    case 'file-arrow-up':
      return (
        <div className="data-source-logo-icon">
          <IconFA name="file-arrow-up" size={18} />
        </div>
      )
    case 'mongodb':
      return (
        <img 
          src={LOGO_MONGODB} 
          alt="MongoDB" 
          className="data-source-logo-img data-source-logo-mongodb"
        />
      )
    case 's3':
      return (
        <img 
          src={LOGO_S3} 
          alt="Amazon S3" 
          className="data-source-logo-img"
        />
      )
    case 'mysql':
      return (
        <div className="data-source-logo-mysql">
          <img src={LOGO_MYSQL_TEXT} alt="" className="mysql-text" />
          <img src={LOGO_MYSQL_DOLPHIN} alt="" className="mysql-dolphin" />
        </div>
      )
    case 'oracle':
      return (
        <img 
          src={LOGO_ORACLE} 
          alt="Oracle" 
          className="data-source-logo-img data-source-logo-oracle"
        />
      )
    case 'postgresql':
      return (
        <img 
          src={LOGO_POSTGRESQL} 
          alt="PostgreSQL" 
          className="data-source-logo-img"
        />
      )
    case 'sqlserver':
      return (
        <img 
          src={LOGO_SQLSERVER} 
          alt="SQL Server" 
          className="data-source-logo-img"
        />
      )
    case 'snowflake':
      return (
        <img 
          src={LOGO_SNOWFLAKE} 
          alt="Snowflake" 
          className="data-source-logo-img"
        />
      )
    default:
      return <IconFA name="database" size={20} />
  }
}

const NOTIFICATIONS = [
  {
    id: 1,
    type: 'alert',
    icon: 'chart-line',
    title: 'CPU spike detected',
    message: 'Cluster 1b5e7b2d-5fdc-459a-b413-940377dc8c06 experienced high CPU usage',
    time: 'Today at 04:12 AM',
    action: 'Click here to investigate',
    unread: true
  },
  {
    id: 2,
    type: 'warning',
    icon: 'database',
    title: 'Storage threshold reached',
    message: 'Workspace "prod-analytics" is at 85% storage capacity',
    time: 'Today at 06:30 AM',
    action: 'Review storage options',
    unread: true
  },
  {
    id: 3,
    type: 'info',
    icon: 'arrow-down-to-bracket',
    title: 'Pipeline completed',
    message: 'Data ingestion from PostgreSQL finished successfully',
    time: 'Yesterday at 11:45 PM',
    action: 'View details',
    unread: false
  },
  {
    id: 4,
    type: 'success',
    icon: 'check',
    title: 'Backup completed',
    message: 'Scheduled backup for "analytics-db" completed',
    time: 'Yesterday at 02:00 AM',
    action: null,
    unread: false
  }
]

function Header({ onLogoClick, onAskAura, onNotificationClick }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationsRef = useRef(null)
  const unreadCount = NOTIFICATIONS.filter(n => n.unread).length

  const handleNotificationClick = (notification) => {
    setNotificationsOpen(false)
    if (onNotificationClick) {
      onNotificationClick(notification)
    }
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo" onClick={onLogoClick} style={{ cursor: 'pointer' }}>
          <SingleStoreLogo />
        </div>
      </div>
      <div className="search-bar">
        <div className="search-bar-content">
          <SearchIcon />
          <span>Search</span>
        </div>
        <div className="search-shortcut">
          <CommandIcon />
          <span>+</span>
          <span>k</span>
        </div>
      </div>
      <div className="header-right">
        <div className="notifications-wrapper" ref={notificationsRef}>
          <button 
            className={`header-btn notifications-btn ${notificationsOpen ? 'active' : ''}`}
            onClick={() => setNotificationsOpen(!notificationsOpen)}
          >
            <BellIcon />
            {unreadCount > 0 && <span className="notifications-badge">{unreadCount}</span>}
          </button>
          {notificationsOpen && (
            <div className="notifications-dropdown">
              <div className="notifications-header">
                <span className="notifications-title">Notifications</span>
                <button className="notifications-mark-read">Mark all as read</button>
              </div>
              <div className="notifications-list">
                {NOTIFICATIONS.map(notification => (
                  <div 
                    key={notification.id} 
                    className={`notification-item ${notification.unread ? 'unread' : ''} ${notification.type}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="notification-icon">
                      <IconFA name={notification.icon} size={14} />
                    </div>
                    <div className="notification-content">
                      <div className="notification-header">
                        <span className="notification-item-title">{notification.title}</span>
                        {notification.unread && <span className="notification-dot" />}
                      </div>
                      <p className="notification-message">{notification.message}</p>
                      <div className="notification-footer">
                        <span className="notification-time">{notification.time}</span>
                        {notification.action && (
                          <button className="notification-action">{notification.action}</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="notifications-footer">
                <button className="notifications-view-all">View all notifications</button>
              </div>
            </div>
          )}
        </div>
        <div className="header-divider" />
        <button className="header-btn ask-aura" onClick={onAskAura}>
          <SparklesIcon />
          <span>Ask Aura</span>
        </button>
        <button className="header-btn">
          <InfoCircleIcon />
        </button>
      </div>
    </header>
  )
}

function PortalView({ activeTab, setActiveTab, inputValue, setInputValue, onAlertClick }) {
  return (
    <div className="portal-view">
      <div className="portal-header">
        <h1>Ask Aura Agent</h1>
        <p>Get help with database setup, SQL, Python, or debugging? We've got you.</p>
      </div>

      <div className="chat-input-container">
        <textarea
          className="chat-textarea"
          placeholder="Ask anything to get started"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          rows={2}
        />
        <div className="chat-input-controls">
          <div className="chat-input-actions">
            <button className="icon-btn">
              <PlusIcon />
            </button>
            <button className="icon-btn">
              <MicIcon />
            </button>
            <button className="agent-selector">
              <AgentIcon />
              <span>Agent</span>
              <ChevronDownIcon className="chevron" />
            </button>
          </div>
          <button className="send-btn" disabled={!inputValue.trim()}>
            <SendIcon />
          </button>
        </div>
      </div>

      <div className="suggested-prompts">
        {SUGGESTED_PROMPTS.map((prompt, i) => (
          <button key={i} className="prompt-chip" onClick={() => setInputValue(prompt)}>
            {prompt}
          </button>
        ))}
      </div>

      <div className="tabs-container">
        <div className="tabs">
          <button className={`tab ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}>
            <IconFA name="warning" />
            <span>Alerts</span>
          </button>
          <button className={`tab ${activeTab === 'automations' ? 'active' : ''}`} onClick={() => setActiveTab('automations')}>
            <IconFA name="arrow-progress" />
            <span>Automations</span>
            <span className="tab-badge">3 new</span>
          </button>
          <button className={`tab ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>
            <IconFA name="list-check" />
            <span>Ongoing tasks</span>
            <span className="tab-badge">2</span>
          </button>
        </div>
      </div>

      <div className="alert-list">
        {ALERTS.map((alert, i) => (
          <div key={alert.id}>
            <div className="alert-item" onClick={() => onAlertClick(alert)}>
              <div className="alert-content-wrapper">
                <div className="alert-icon">
                  <IconFA name={alert.icon} />
                </div>
                <div className="alert-content">
                  <div className="alert-title-row">
                    <span className="alert-title">{alert.title}</span>
                    <span className={`badge ${alert.severity === 'high' ? 'critical' : 'warning'}`}>
                      {alert.severity === 'high' ? 'High' : 'Mid'}
                    </span>
                    {alert.status && <span className="badge info">{alert.status}</span>}
                  </div>
                  <div className="alert-description">
                    <span>{alert.description}</span>
                    <span className="dot" />
                    <span>{alert.extra}</span>
                  </div>
                </div>
              </div>
              <span className="alert-action">{alert.action}</span>
            </div>
            {i < ALERTS.length - 1 && <div className="alert-divider" />}
          </div>
        ))}
      </div>
    </div>
  )
}

function ChatView({ messages, inputValue, setInputValue, isTyping, onAction, expandedQueries, setExpandedQueries, expandedOptions, setExpandedOptions, chatEndRef, activeChatFlow }) {
  const agentName = activeChatFlow === 'cpu-spike' ? 'Observability Agent' : 'Aura Agent'
  
  return (
    <div className="chat-view">
      <div className="chat-messages">
        {messages.map((message, index) => (
          <Message
            key={message.id}
            message={message}
            onAction={onAction}
            expandedQueries={expandedQueries}
            setExpandedQueries={setExpandedQueries}
            expandedOptions={expandedOptions}
            setExpandedOptions={setExpandedOptions}
            isTyping={index === messages.length - 1 && message.type === 'agent' && !message.typingComplete}
            onTypingComplete={() => {
              message.typingComplete = true
            }}
            agentName={agentName}
          />
        ))}
        {isTyping && (
          <div className="message">
            <div className="message-header">
              <span className="message-sender">{agentName}</span>
              <span className="dot" />
              <span className="message-time">{formatTime(new Date())}</span>
            </div>
            <div className="typing-indicator">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="chat-input-bottom">
        <div className="chat-input-bottom-container">
          <div className="chat-input-text">
            <input
              type="text"
              placeholder="Ask anything to get started"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </div>
          <div className="chat-input-controls">
            <div className="chat-input-actions">
              <button className="icon-btn">
                <PlusIcon />
              </button>
              <button className="icon-btn">
                <MicIcon />
              </button>
              <button className="agent-selector">
                <AgentIcon />
                <span>{agentName}</span>
                <ChevronDownIcon className="chevron" />
              </button>
            </div>
            <button className="send-btn" disabled={!inputValue.trim()}>
              <SendIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Message({ message, onAction, expandedQueries, setExpandedQueries, expandedOptions, setExpandedOptions, isTyping, onTypingComplete, agentName = 'Aura Agent' }) {
  const [currentParagraph, setCurrentParagraph] = useState(0)
  const [paragraphsCompleted, setParagraphsCompleted] = useState(false)
  const textItems = message.type === 'agent' && message.content?.text ? message.content.text : []

  useEffect(() => {
    if (!isTyping) {
      setCurrentParagraph(textItems.length)
      setParagraphsCompleted(true)
    }
  }, [isTyping, textItems.length])

  const handleParagraphComplete = () => {
    if (currentParagraph < textItems.length - 1) {
      setCurrentParagraph(prev => prev + 1)
    } else {
      setParagraphsCompleted(true)
      onTypingComplete?.()
    }
  }

  if (message.type === 'user') {
    return (
      <div className="message user">
        <div className="user-bubble">
          <p className="message-text">{message.text}</p>
        </div>
      </div>
    )
  }

  const { content, status, timestamp } = message
  const isLast = content.success
  const timeDisplay = status || (timestamp ? formatTime(timestamp) : 'Just now')

  const renderTextContent = (t, index) => {
    const isCurrentlyTyping = isTyping && index === currentParagraph && !paragraphsCompleted
    const shouldShow = !isTyping || index <= currentParagraph

    if (!shouldShow) return null

    const getPlainText = (textItem) => {
      if (textItem.type === 'bold') return textItem.content
      if (textItem.type === 'text') return textItem.content
      if (textItem.type === 'mixed') {
        return `${textItem.content}${textItem.bold}${textItem.after || ''}${textItem.bold2 || ''}${textItem.after2 || ''}${textItem.bold3 || ''}`
      }
      return ''
    }

    if (isCurrentlyTyping) {
      return (
        <p key={index} className="message-text">
          <TypedText onComplete={handleParagraphComplete}>
            {getPlainText(t)}
          </TypedText>
        </p>
      )
    }

    return (
      <p key={index} className="message-text">
        {t.type === 'bold' && <strong>{t.content}</strong>}
        {t.type === 'text' && t.content}
        {t.type === 'mixed' && (
          <>
            {t.content}<strong>{t.bold}</strong>{t.after}{t.bold2 && <strong>{t.bold2}</strong>}{t.after2}{t.bold3 && <strong>{t.bold3}</strong>}
          </>
        )}
      </p>
    )
  }

  return (
    <div className="message">
      <div className="message-header">
        <span className="message-sender">{agentName}</span>
        <span className="dot" />
        <span className="message-time">{timeDisplay}</span>
      </div>
      <div className="message-content">
        {content.text && content.text.map((t, i) => renderTextContent(t, i))}

        {content.stats && (!isTyping || paragraphsCompleted) && (
          <div className="stats-grid fade-in">
            {content.stats.map((stat, i) => (
              <div key={i} className="stat-card">
                <div className="stat-card-content">
                  <span className="stat-label">{stat.label}</span>
                  <div className="stat-value-row">
                    <span className="stat-value">{stat.value}</span>
                    {stat.change && (
                      <div className="stat-change">
                        <ArrowUpIcon />
                        <span>{stat.change}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {content.recommendation && (!isTyping || paragraphsCompleted) && (
          <div className="recommendation-card fade-in">
            <div className="recommendation-card-content">
              <span className="recommendation-label">{content.recommendation.label}</span>
              <span className="recommendation-title">{content.recommendation.title}</span>
              <span className="size-badge">{content.recommendation.badge}</span>
              <div className="impact-section">
                <h4>Expected impact:</h4>
                <ul>
                  {content.recommendation.impact.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="impact-section">
                <h4>Estimated cost change:</h4>
                <ul>
                  <li>{content.recommendation.cost}</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {content.why && (!isTyping || paragraphsCompleted) && (
          <div className="why-section fade-in">
            <h4>Why S4?</h4>
            <ul>
              {content.why.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {content.queries && (!isTyping || paragraphsCompleted) && (
          <div className="fade-in">
            <div className="expandable-header" onClick={() => setExpandedQueries(!expandedQueries)}>
              {expandedQueries ? <ChevronDownIcon /> : <ChevronRightIcon />}
              <span>Top 5 queries</span>
            </div>
            {expandedQueries && (
              <div className="query-list">
                {content.queries.map((query, i) => (
                  <div key={i} className="query-item">
                    <div className="query-item-content">
                      <div className="query-title-row">
                        <span className="query-name">{query.name}</span>
                        <span className={`badge ${query.cpuType}`}>{query.cpu}</span>
                        <span className="badge warning">{query.time}</span>
                        <span className="badge neutral">{query.frequency}</span>
                      </div>
                      <div className="query-description">
                        <span>{query.desc1}</span>
                        <span className="dot" />
                        <span>{query.desc2}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {content.options && (!isTyping || paragraphsCompleted) && (
          <div className="fade-in">
            <div className="expandable-header" onClick={() => setExpandedOptions(!expandedOptions)}>
              {expandedOptions ? <ChevronDownIcon /> : <ChevronRightIcon />}
              <span>Ways to reduce load without resizing</span>
            </div>
            {expandedOptions && (
              <div className="options-grid">
                {content.options.map((option, i) => (
                  <div key={i} className="option-card">
                    <div className="option-card-content">
                      <div className="option-icon">
                        <IconFA name={option.icon} />
                      </div>
                      <span className="option-title">{option.title}</span>
                      <p className="option-description">{option.description}</p>
                      <span className={`badge ${option.impactType}`}>{option.impact}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {content.footer && (!isTyping || paragraphsCompleted) && <p className="message-text fade-in">{content.footer}</p>}

        {content.progress && (!isTyping || paragraphsCompleted) && (
          <div className="progress-card fade-in">
            <div className="progress-content">
              <div className="progress-icon">
                <SpinnerIcon />
              </div>
              <span className="progress-text">{content.text}</span>
              <span className="progress-time">{content.time}</span>
            </div>
            <span className="progress-link">View steps</span>
          </div>
        )}

        {content.success && (!isTyping || paragraphsCompleted) && (
          <div className="fade-in">
            <div className="success-header">
              <CheckIcon />
              <span>{content.title}</span>
            </div>
            {content.details.map((d, i) => (
              <p key={i} className="message-text">
                {d.type === 'text' && d.content}
                {d.type === 'mixed' && (
                  <>{d.content}<strong>{d.bold}</strong>{d.after}</>
                )}
              </p>
            ))}
          </div>
        )}

        {content.thinking && (
          <div className={`thinking-card fade-in ${message.thinkingExpanded ? 'expanded' : 'collapsed'}`}>
            <div className="thinking-header">
              <span>Thoughts</span>
              <IconFA name="chevron-down" size={12} />
            </div>
            <div className="thinking-collapsed-info">
              <IconFA name="clock" size={8} />
              <span>Just now</span>
              <IconFA name="database" size={8} />
              <span>Executed in 138ms</span>
            </div>
            {message.thinkingExpanded && (
              <ul className="thinking-list">
                {content.thinking.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {content.chart && (message.showContent !== false) && (
          <div className="cpu-chart-container fade-in">
            <div className="cpu-chart">
              {content.chart.type === 'cpu-spike' && (
                <div className="cpu-line-chart">
                  <div className="cpu-line-y-axis">
                    <span>150</span>
                    <span>100</span>
                    <span>50</span>
                    <span>0</span>
                  </div>
                  <div className="cpu-line-graph-area">
                    <svg className="cpu-line-svg" viewBox="0 0 700 180" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {[0, 1, 2, 3].map(i => (
                        <line key={i} className="cpu-grid-line" x1="0" y1={i * 60} x2="700" y2={i * 60} />
                      ))}
                      <path
                        className="cpu-line-fill"
                        d={`M ${content.chart.data.map((d, i) => 
                          `${(i / (content.chart.data.length - 1)) * 700},${180 - (Math.min(d.value, 150) / 150) * 180}`
                        ).join(' L ')} L 700,180 L 0,180 Z`}
                        fill="url(#lineGradient)"
                      />
                      <path
                        className="cpu-line-path"
                        d={`M ${content.chart.data.map((d, i) => 
                          `${(i / (content.chart.data.length - 1)) * 700},${180 - (Math.min(d.value, 150) / 150) * 180}`
                        ).join(' L ')}`}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                      />
                    </svg>
                    <div className="cpu-line-x-axis">
                      {content.chart.data.map((d, i) => (
                        <span key={i}>{d.time}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {content.chart.type === 'per-node' && (
                <div className="per-node-chart">
                  <div className="per-node-chart-body">
                    <div className="per-node-y-axis-wrapper">
                      <div className="per-node-y-label">Value</div>
                      <div className="per-node-y-axis">
                        <span>2000</span>
                        <span>1500</span>
                        <span>1000</span>
                        <span>500</span>
                        <span>0</span>
                      </div>
                    </div>
                    <div className="per-node-graph">
                      <div className="per-node-grid">
                        {[0, 1, 2, 3, 4].map(i => <div key={i} className="per-node-grid-line" />)}
                      </div>
                      <div className="per-node-bars">
                        {content.chart.data.map((d, i) => (
                          <div key={i} className="per-node-bar-group">
                            <div className="per-node-bar-set">
                              <div className="per-node-bar cpu" style={{ height: `${(d.cpu / 2000) * 100}%` }} />
                              <div className="per-node-bar elapsed" style={{ height: `${(d.elapsed / 2000) * 100}%` }} />
                              <div className="per-node-bar memory" style={{ height: `${(d.memory * 10 / 2000) * 100}%` }} />
                            </div>
                            <span className="per-node-label">{d.node}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="per-node-legend">
                      <div className="legend-item"><span className="legend-color cpu"></span>Peak CPU (s)</div>
                      <div className="legend-item"><span className="legend-color elapsed"></span>Peak Elapsed (s)</div>
                      <div className="legend-item"><span className="legend-color memory"></span>Peak Memory (GB)</div>
                    </div>
                  </div>
                  <div className="per-node-x-label">Node / Partition</div>
                </div>
              )}
            </div>
          </div>
        )}

        {content.table && (message.showContent !== false) && (
          <div className="cpu-table-container fade-in">
            <table className="cpu-table">
              <thead>
                <tr>
                  {content.table.headers.map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {content.table.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {content.analysis && (message.showContent !== false) && (
          <div className="analysis-section fade-in">
            {content.analysis.summary && <p className="message-text">{content.analysis.summary}</p>}
            {content.analysis.contributors && (
              <>
                <p className="message-text"><strong>{content.analysis.contributors.title}</strong></p>
                <ul className="analysis-list">
                  {content.analysis.contributors.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </>
            )}
            {content.analysis.rootCause && (
              <>
                <p className="message-text"><strong>{content.analysis.rootCause.title}</strong></p>
                <p className="message-text">{content.analysis.rootCause.text}</p>
              </>
            )}
            {content.analysis.items && (
              <ul className="analysis-list">
                {content.analysis.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}
            {content.analysis.conclusion && <p className="message-text">{content.analysis.conclusion}</p>}
            {content.analysis.insight && <p className="message-text">{content.analysis.insight}</p>}
          </div>
        )}

        {content.actions && !content.progress && (message.showContent !== false) && paragraphsCompleted && (
          <div className="action-buttons fade-in">
            {content.actions.map((action, i) => {
              const isPrimary = typeof action === 'object' && action.primary
              const text = typeof action === 'string' ? action : action.text
              return (
                <button key={i} className={`action-btn ${isPrimary ? 'primary' : ''}`} onClick={() => onAction(action)}>
                  {text}
                </button>
              )
            })}
          </div>
        )}

        {!content.progress && (message.showContent !== false) && paragraphsCompleted && (
          <div className={`toolbar-row fade-in ${isLast ? '' : ''}`}>
            <div className="toolbar">
              <button className="toolbar-btn"><IconFA name="copy" size={12} /></button>
              <button className="toolbar-btn"><IconFA name="refresh" size={12} /></button>
              <button className="toolbar-btn"><IconFA name="bug" size={12} /></button>
            </div>
            {isLast && (
              <div className="toolbar-right">
                <span className="helpful-text">Was this helpful?</span>
                <div className="toolbar">
                  <button className="toolbar-btn"><IconFA name="thumbs-up" /></button>
                  <button className="toolbar-btn"><IconFA name="thumbs-down" /></button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SidebarIcon({ name, active }) {
  const color = active ? '#820ddf' : '#4c4c4c'
  const iconMap = {
    'home': '\uf015',
    'cloud': '\uf0c2',
    'database': '\uf1c0',
    'briefcase': '\uf0b1',
    'arrow-down-to-bracket': '\ue094',
    'rectangle-terminal': '\ue236',
    'sparkles': '\uf890',
    'layer-group': '\uf5fd',
    'chart-line': '\uf201',
    'cog': '\uf013',
    'gear': '\uf013',
    'laptop-code': '\uf5fc',
    'sidebar': '\ue24e',
    'cookie-bite': '\uf564',
  }
  
  const unicode = iconMap[name]
  
  if (!unicode) {
    return <span>{name}</span>
  }
  
  return (
    <span 
      className="fa-icon fa-regular" 
      style={{ fontSize: 14, color }}
      aria-hidden="true"
    >
      {unicode}
    </span>
  )
}

function IconFA({ name, weight = 'regular', size = 16 }) {
  const iconMap = {
    'warning': '\uf071',
    'triangle-exclamation': '\uf071',
    'arrow-progress': '\ue5df',
    'file-arrow-up': '\uf574',
    'list-check': '\uf0ae',
    'database': '\uf1c0',
    'floppy-disk': '\uf0c7',
    'cloud': '\uf0c2',
    'list-timeline': '\ue1d1',
    'clock': '\uf017',
    'grid-2': '\ue196',
    'copy': '\uf0c5',
    'refresh': '\uf021',
    'arrows-rotate': '\uf021',
    'bug': '\uf188',
    'thumbs-up': '\uf164',
    'thumbs-down': '\uf165',
    'home': '\uf015',
    'arrow-down-to-bracket': '\ue094',
    'rectangle-terminal': '\ue236',
    'sparkles': '\uf890',
    'layer-group': '\uf5fd',
    'chart-line': '\uf201',
    'cog': '\uf013',
    'gear': '\uf013',
    'laptop-code': '\uf5fc',
    'sidebar': '\ue24e',
    'cookie-bite': '\uf564',
    'plus': '\u002b',
    'microphone': '\uf130',
    'paper-plane': '\uf1d8',
    'chevron-down': '\uf078',
    'chevron-right': '\uf054',
    'check': '\uf00c',
    'spinner': '\uf110',
    'circle-info': '\uf05a',
    'user-plus': '\uf234',
    'bell': '\uf0f3',
    'magnifying-glass': '\uf002',
    'command': '\ue142',
    'arrow-up': '\uf062',
    'briefcase': '\uf0b1',
    'circle-question': '\uf059',
    'terminal': '\uf120',
    'xmark': '\uf00d',
    'ellipsis-vertical': '\uf142',
    'arrow-up-right-from-square': '\uf08e',
    'expand': '\uf065',
    'compress': '\uf066',
    'bolt': '\uf0e7',
  }
  
  const weightClass = weight === 'solid' ? 'fa-solid' : weight === 'light' ? 'fa-light' : 'fa-regular'
  const unicode = iconMap[name]
  
  if (!unicode) {
    return <span style={{ fontSize: '12px' }}>{name}</span>
  }
  
  return (
    <span 
      className={`fa-icon ${weightClass}`} 
      style={{ fontSize: size }}
      aria-hidden="true"
    >
      {unicode}
    </span>
  )
}

function SingleStoreLogo() {
  return (
    <svg width="118" height="24" viewBox="0 0 118 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip0_61_3814)">
        <path d="M16.4876 0.908939C16.8279 1.08842 17.1559 1.29026 17.4694 1.51313L14.2297 7.12374C14.425 7.20744 14.6151 7.30259 14.7991 7.40869L14.8184 7.42028L18.2055 1.55418C17.6799 1.25049 17.1329 0.985598 16.5687 0.761635L16.4876 0.908939Z" fill="black"/>
        <path d="M19.5549 3.61596C19.79 3.95127 20.0011 4.30278 20.1866 4.66786L15.908 8.26015C16.0201 8.37252 16.1263 8.48924 16.2268 8.6103L21.4138 4.25492C21.0521 3.82245 20.6604 3.41592 20.2417 3.03833L19.5549 3.61596Z" fill="black"/>
        <path d="M22.8786 6.46207L21.0057 7.14353C21.0731 7.54276 21.1125 7.94622 21.1236 8.35094L16.9947 9.85394C17.0464 9.97081 17.0913 10.0887 17.1367 10.2084L23.5017 7.8902C23.3248 7.40128 23.1167 6.92425 22.8786 6.46207Z" fill="black"/>
        <path d="M20.8961 10.5929C20.8056 10.9798 20.6885 11.36 20.5455 11.7308H17.4419C17.4467 11.8273 17.4492 11.9239 17.4492 12.0205H24.2237C24.2241 11.5431 24.1964 11.0661 24.1407 10.5919L20.8961 10.5929Z" fill="black"/>
        <path d="M23.4877 16.1504C23.6376 15.7428 23.7652 15.3273 23.8697 14.9058L19.693 13.3859C19.481 13.7069 19.2478 14.0134 18.9951 14.3035L17.1869 13.6452C17.1666 13.708 17.1444 13.7708 17.1217 13.8331L23.4877 16.1504Z" fill="black"/>
        <path d="M17.921 15.3424C17.6367 15.5738 17.3381 15.7872 17.027 15.9813L16.263 15.3404C16.2403 15.3684 16.2176 15.396 16.1944 15.423L21.3844 19.7779C21.6339 19.4807 21.8705 19.1695 22.0943 18.8443L17.921 15.3424Z" fill="black"/>
        <path d="M19.0473 21.9088L15.9529 16.5479C15.664 16.6764 15.3683 16.7892 15.0672 16.8859L14.8706 16.5479L14.7774 16.6019L18.1649 22.469C18.4676 22.2951 18.7617 22.1084 19.0473 21.9088Z" fill="black"/>
        <path d="M13.9651 17.1612C13.665 17.2138 13.3624 17.2505 13.0585 17.2713L14.2259 23.8923C14.5269 23.8395 14.8254 23.7751 15.1213 23.6991L13.9651 17.1612Z" fill="black"/>
        <path d="M11.9912 17.2964C11.7281 17.2887 11.4659 17.2614 11.2068 17.2148L10.0303 23.8875C10.2879 23.9335 10.5474 23.971 10.8089 24L11.9912 17.2964Z" fill="black"/>
        <path d="M7.81448 23.0896C7.47261 22.9099 7.14314 22.7076 6.82826 22.484L10.0694 16.8714C9.87427 16.7879 9.68428 16.6928 9.50051 16.5865L9.48071 16.5749L6.09367 22.4424C6.61933 22.7461 7.16636 23.0111 7.73044 23.2355L7.81448 23.0896Z" fill="black"/>
        <path d="M4.74476 20.3831C4.50944 20.0476 4.29818 19.696 4.11256 19.3307L8.39405 15.7384C8.282 15.626 8.17559 15.5095 8.07481 15.3887L2.88486 19.7436C3.2462 20.1763 3.63774 20.5829 4.05653 20.9602L4.74476 20.3831Z" fill="black"/>
        <path d="M1.41906 17.5365L3.292 16.855C3.22418 16.4558 3.18464 16.0523 3.17368 15.6476L7.30255 14.1446C7.25136 14.028 7.20419 13.9099 7.16104 13.7901L0.795555 16.1083C0.972457 16.5973 1.18072 17.0743 1.41906 17.5365Z" fill="black"/>
        <path d="M3.40308 13.4047C3.49355 13.0178 3.61071 12.6376 3.75371 12.2668H6.85725C6.85242 12.1702 6.85001 12.0736 6.85049 11.9771H0.0754457C0.0749597 12.4543 0.102859 12.9312 0.158998 13.4052L3.40308 13.4047Z" fill="black"/>
        <path d="M0.811464 7.84819C0.661791 8.25587 0.534265 8.67135 0.429439 9.09279L4.60661 10.6132C4.81885 10.2923 5.05198 9.98577 5.30449 9.69553L7.11223 10.3514C7.133 10.2886 7.15473 10.2258 7.17792 10.1635L0.811464 7.84819Z" fill="black"/>
        <path d="M6.37815 8.65618C6.66255 8.42459 6.9613 8.21118 7.2726 8.01722L8.03569 8.65812C8.05838 8.63059 8.08108 8.60258 8.10427 8.57553L2.91625 4.22063C2.6664 4.51749 2.42958 4.82868 2.20581 5.1542L6.37815 8.65618Z" fill="black"/>
        <path d="M5.24993 2.08979L8.34429 7.45071C8.63321 7.32168 8.92908 7.20881 9.23053 7.11263L9.4271 7.45071C9.45752 7.43235 9.48892 7.41448 9.51982 7.39661L6.13231 1.53148C5.83158 1.70438 5.53745 1.89048 5.24993 2.08979Z" fill="black"/>
        <path d="M10.3341 6.83975C10.6351 6.78689 10.9387 6.74997 11.2435 6.72915L10.0757 0.106238C9.77469 0.158721 9.47638 0.223116 9.1808 0.299424L10.3341 6.83975Z" fill="black"/>
        <path d="M12.3085 6.70211C12.5714 6.70988 12.8334 6.73716 13.0923 6.78373L14.2688 0.11253C14.0112 0.0661656 13.7517 0.028656 13.4903 0L12.3085 6.70211Z" fill="black"/>
        <path d="M29.5525 14.4464V14.3632H31.2405V14.4464C31.2405 15.7336 31.9757 16.7192 34.2157 16.7192H34.3829C36.1045 16.7192 37.0405 15.984 37.0405 14.8808V14.7976C37.0405 13.7616 36.4389 13.3104 35.3861 13.0592L32.7117 12.4072C31.0901 12.0064 29.9877 11.12 29.9877 9.36561V9.19841C29.9877 7.26001 31.5253 5.97281 34.1661 5.97281H34.3333C36.9237 5.97281 38.4117 7.37681 38.4117 9.29841V9.38161H36.7573V9.29841C36.7573 8.31201 35.9717 7.36001 34.3341 7.36001H34.1669C32.4957 7.36001 31.6101 8.12881 31.6101 9.21521V9.29841C31.6101 10.184 32.1285 10.7024 33.2813 10.9864L35.9725 11.6384C37.6101 12.0392 38.6637 12.8752 38.6637 14.6632V14.8304C38.6637 16.836 37.1093 18.1064 34.3685 18.1064H34.2013C30.8085 18.1064 29.5549 16.6024 29.5549 14.4464H29.5525Z" fill="black"/>
        <path d="M39.9637 6.10641H41.5349V7.84481H39.9637V6.10641ZM39.9637 9.4488H41.5349V17.9728H39.9637V9.4488Z" fill="black"/>
        <path d="M43.0373 9.44961H44.5413V10.82C45.2933 9.70001 45.9453 9.34961 47.1485 9.34961H47.3157C49.0709 9.34961 50.0733 10.2688 50.0733 12.4248V17.9736H48.5021V12.6416C48.5021 11.1712 47.9509 10.5856 46.8805 10.5856H46.7133C45.3765 10.5856 44.6077 11.6048 44.6077 13.076V17.9728H43.0365V9.44881L43.0373 9.44961Z" fill="black"/>
        <path d="M51.3421 18.6088H52.9133V18.692C52.9133 19.4776 53.6485 19.8288 55.0357 19.8288H55.1029C56.3733 19.8288 57.1757 19.444 57.1757 18.2912V16.3528C56.5237 17.3392 55.9221 17.7064 54.7189 17.7064H54.5517C52.4461 17.7064 51.1757 16.0848 51.1757 13.612V13.4448C51.1757 10.9712 52.4461 9.35042 54.5349 9.35042H54.7021C55.9557 9.35042 56.5741 9.70162 57.2261 10.8048V9.45122H58.7301V18.2928C58.7301 20.2312 57.3429 21 55.0365 21H54.9693C52.1949 21 51.3421 19.964 51.3421 18.6936V18.6088ZM54.9693 16.4856H55.1365C56.5573 16.4856 57.2757 15.5496 57.2757 13.6112V13.444C57.2757 11.5056 56.5573 10.5696 55.1365 10.5696H54.9693C53.5989 10.5696 52.8301 11.5224 52.8301 13.444V13.6112C52.8301 15.5328 53.5989 16.4856 54.9693 16.4856Z" fill="black"/>
        <path d="M60.2325 6.10641H61.8037V17.9728H60.2325V6.10641Z" fill="black"/>
        <path d="M63.1053 13.7944V13.6272C63.1053 10.8864 64.4589 9.34881 66.8989 9.34881H67.0661C69.3725 9.34881 70.6261 10.6856 70.6261 13.4768C70.6261 13.744 70.6093 13.9448 70.5925 14.0784H64.7093C64.7597 15.9672 65.5285 16.9032 66.8989 16.9032H67.0661C68.5533 16.9032 68.8709 15.9504 68.8709 15.4656V15.3824H70.4589V15.4656C70.4589 16.5184 69.7405 18.0728 67.1165 18.0728H66.9493C64.4253 18.0728 63.1053 16.5352 63.1053 13.7944ZM69.0221 12.9088V12.8752C69.0221 11.204 68.2869 10.5016 67.0501 10.5016H66.8829C65.6965 10.5016 64.8437 11.2704 64.7269 12.908H69.0221V12.9088Z" fill="black"/>
        <path d="M71.7285 14.4464V14.3632H73.4165V14.4464C73.4165 15.7336 74.1517 16.7192 76.3917 16.7192H76.5589C78.2805 16.7192 79.2165 15.984 79.2165 14.8808V14.7976C79.2165 13.7616 78.6149 13.3104 77.5621 13.0592L74.8877 12.4072C73.2661 12.0064 72.1637 11.12 72.1637 9.36561V9.19841C72.1637 7.26001 73.7013 5.97281 76.3421 5.97281H76.5093C79.0997 5.97281 80.5877 7.37681 80.5877 9.29841V9.38161H78.9333V9.29841C78.9333 8.31201 78.1477 7.36001 76.5101 7.36001H76.3429C74.6717 7.36001 73.7853 8.12881 73.7853 9.21521V9.29841C73.7853 10.184 74.3037 10.7024 75.4565 10.9864L78.1477 11.6384C79.7853 12.0392 80.8389 12.8752 80.8389 14.6632V14.8304C80.8389 16.836 79.2845 18.1064 76.5437 18.1064H76.3765C72.9837 18.1064 71.7301 16.6024 71.7301 14.4464H71.7285Z" fill="black"/>
        <path d="M83.1765 16.2512V10.736H81.6389V9.4488H82.8589C83.1093 9.4488 83.2437 9.29841 83.2437 9.0472V7.2256H84.7477V9.4488H86.8701V10.736H84.7477V15.9672C84.7477 16.5184 84.9653 16.6856 85.4661 16.6856H86.8701V17.9728H84.9149C83.6781 17.9728 83.1765 17.4048 83.1765 16.2512Z" fill="black"/>
        <path d="M87.6709 13.7944V13.6272C87.6709 10.8864 88.9741 9.34881 91.5149 9.34881H91.6821C94.2229 9.34881 95.5261 10.8864 95.5261 13.6272V13.7944C95.5261 16.5352 94.2221 18.0728 91.6821 18.0728H91.5149C88.9741 18.0728 87.6709 16.5352 87.6709 13.7944ZM91.5149 16.8528H91.6821C93.0861 16.8528 93.8717 15.9336 93.8717 13.7944V13.6272C93.8717 11.488 93.0861 10.5688 91.6821 10.5688H91.5149C90.1109 10.5688 89.3253 11.488 89.3253 13.6272V13.7944C89.3253 15.9336 90.1109 16.8528 91.5149 16.8528Z" fill="black"/>
        <path d="M96.8285 9.44961H98.3325V11.0208C99.0181 9.83441 99.3357 9.44961 100.372 9.44961H101.441V10.9032H100.071C99.0685 10.9032 98.3997 11.7392 98.3997 13.0088V17.9728H96.8285V9.44881V9.44961Z" fill="black"/>
        <path d="M101.823 13.7944V13.6272C101.823 10.8864 103.176 9.34881 105.616 9.34881H105.784C108.09 9.34881 109.344 10.6856 109.344 13.4768C109.344 13.744 109.327 13.9448 109.31 14.0784H103.427C103.477 15.9672 104.246 16.9032 105.616 16.9032H105.784C107.271 16.9032 107.588 15.9504 107.588 15.4656V15.3824H109.176V15.4656C109.176 16.5184 108.458 18.0728 105.834 18.0728H105.667C103.143 18.0728 101.823 16.5352 101.823 13.7944ZM107.74 12.9088V12.8752C107.74 11.204 107.004 10.5016 105.768 10.5016H105.6C104.414 10.5016 103.561 11.2704 103.444 12.908H107.74V12.9088Z" fill="black"/>
        <path d="M112.582 17.978V15.049H111.576V14.655H114.082V15.049H113.076V17.978H112.582Z" fill="black"/>
        <path d="M114.471 17.978V14.655H115.155L116.075 17.3229L116.958 14.655H117.666V17.978H117.167V15.3481L116.284 17.978H115.843L114.969 15.3481V17.978H114.471Z" fill="black"/>
      </g>
      <defs>
        <clipPath id="clip0_61_3814">
          <rect width="117.75" height="24" fill="white"/>
        </clipPath>
      </defs>
    </svg>
  )
}

function SearchIcon() {
  return <IconFA name="magnifying-glass" size={12} />
}

function CommandIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 4.5C3 3.67 3.67 3 4.5 3C5.33 3 6 3.67 6 4.5V7.5C6 8.33 5.33 9 4.5 9C3.67 9 3 8.33 3 7.5V4.5Z" stroke="currentColor" strokeWidth="1"/>
      <path d="M6 4.5C6 3.67 6.67 3 7.5 3C8.33 3 9 3.67 9 4.5C9 5.33 8.33 6 7.5 6H4.5C3.67 6 3 5.33 3 4.5" stroke="currentColor" strokeWidth="1"/>
      <path d="M6 7.5C6 8.33 6.67 9 7.5 9C8.33 9 9 8.33 9 7.5V4.5" stroke="currentColor" strokeWidth="1"/>
      <path d="M4.5 6H7.5C8.33 6 9 6.67 9 7.5" stroke="currentColor" strokeWidth="1"/>
    </svg>
  )
}

function UserPlusIcon() {
  return <IconFA name="user-plus" size={16} />
}

function BellIcon() {
  return <IconFA name="bell" size={16} />
}

function SparklesIcon() {
  return <IconFA name="sparkles" size={16} />
}

function InfoCircleIcon() {
  return <IconFA name="circle-info" size={16} />
}

function PlusIcon() {
  return <IconFA name="plus" size={16} />
}

function MicIcon() {
  return <IconFA name="microphone" size={16} />
}

function AgentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 2C4.36819 2 4.66667 2.29848 4.66667 2.66667L4.66667 8.78047C5.44346 9.05503 6 9.79585 6 10.6667C6 11.5375 5.44346 12.2783 4.66667 12.5529V13.3333C4.66667 13.7015 4.36819 14 4 14C3.63181 14 3.33333 13.7015 3.33333 13.3333V12.5529C2.55654 12.2783 2 11.5375 2 10.6667C2 9.79585 2.55654 9.05503 3.33333 8.78047L3.33333 2.66667C3.33333 2.29848 3.63181 2 4 2ZM4 11.3333C4.36819 11.3333 4.66667 11.0349 4.66667 10.6667C4.66667 10.2985 4.36819 10 4 10C3.63181 10 3.33333 10.2985 3.33333 10.6667C3.33333 11.0349 3.63181 11.3333 4 11.3333Z" fill="#666666"/>
      <path d="M8 2C8.36819 2 8.66667 2.29848 8.66667 2.66667L8.66667 3.44714C9.44346 3.72169 10 4.46252 10 5.33333C10 6.20415 9.44346 6.94497 8.66667 7.21953L8.66667 13.3333C8.66667 13.7015 8.36819 14 8 14C7.63181 14 7.33333 13.7015 7.33333 13.3333L7.33333 7.21953C6.55654 6.94497 6 6.20415 6 5.33333C6 4.46252 6.55654 3.72169 7.33333 3.44714L7.33333 2.66667C7.33333 2.29848 7.63181 2 8 2ZM8.66667 5.33333C8.66667 4.96514 8.36819 4.66667 8 4.66667C7.63181 4.66667 7.33333 4.96514 7.33333 5.33333C7.33333 5.70152 7.63181 6 8 6C8.36819 6 8.66667 5.70152 8.66667 5.33333Z" fill="#666666"/>
      <path d="M11.3333 2.66667L11.3333 8.78047C10.5565 9.05503 10 9.79585 10 10.6667C10 11.5375 10.5565 12.2783 11.3333 12.5529V13.3333C11.3333 13.7015 11.6318 14 12 14C12.3682 14 12.6667 13.7015 12.6667 13.3333V12.5529C13.4435 12.2783 14 11.5375 14 10.6667C14 9.79585 13.4435 9.05503 12.6667 8.78047L12.6667 2.66667C12.6667 2.29848 12.3682 2 12 2C11.6318 2 11.3333 2.29848 11.3333 2.66667ZM12 11.3333C11.6318 11.3333 11.3333 11.0349 11.3333 10.6667C11.3333 10.2985 11.6318 10 12 10C12.3682 10 12.6667 10.2985 12.6667 10.6667C12.6667 11.0349 12.3682 11.3333 12 11.3333Z" fill="#666666"/>
    </svg>
  )
}

function ChevronDownIcon({ className }) {
  return <span className={className}><IconFA name="chevron-down" size={14} /></span>
}

function ChevronRightIcon() {
  return <IconFA name="chevron-right" size={14} />
}

function SendIcon() {
  return <IconFA name="paper-plane" size={14} />
}

function ArrowUpIcon() {
  return <IconFA name="arrow-up" size={9} />
}

function SpinnerIcon() {
  return <IconFA name="spinner" size={18} weight="solid" />
}

function CheckIcon() {
  return <IconFA name="check" size={14} weight="solid" />
}

const AURA_AGENTS = [
  { id: 'aura', name: 'Aura Agent', icon: 'sparkles' },
  { id: 'data-migration', name: 'Data Migration Agent', icon: 'database' },
  { id: 'query-tuning', name: 'Query Tuning Agent', icon: 'chart-line' },
  { id: 'support', name: 'Support Agent', icon: 'circle-question' },
  { id: 'observability', name: 'Observability Agent', icon: 'chart-line' },
  { id: 'incident', name: 'Incident Agent', icon: 'warning' },
]

function AuraSidePanel({ isOpen, isFullscreen, width, onClose, onToggleFullscreen, onWidthChange, messages, inputValue, setInputValue, onSend, chatEndRef }) {
  const [isResizing, setIsResizing] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState(AURA_AGENTS[0])
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false)
  const panelRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return
      const windowWidth = window.innerWidth
      const newWidth = ((windowWidth - e.clientX) / windowWidth) * 100
      if (newWidth >= 25 && newWidth <= 70) {
        onWidthChange(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, onWidthChange])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setAgentDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend(inputValue)
    }
  }

  const handleAgentSelect = (agent) => {
    setSelectedAgent(agent)
    setAgentDropdownOpen(false)
  }

  if (!isOpen) return null

  return (
    <div 
      ref={panelRef}
      className={`aura-side-panel ${isFullscreen ? 'fullscreen' : ''}`}
      style={!isFullscreen ? { width: `${width}%` } : {}}
    >
      <div 
        className="aura-panel-resize-handle"
        onMouseDown={() => setIsResizing(true)}
      />
      <div className="aura-panel-header">
        <div className="aura-panel-title">
          <IconFA name="sparkles" size={16} />
          <span>Ask Aura</span>
        </div>
        <div className="aura-panel-actions">
          <button className="aura-panel-btn" onClick={onToggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            <IconFA name={isFullscreen ? 'compress' : 'expand'} size={14} />
          </button>
          <button className="aura-panel-btn" onClick={onClose} title="Close">
            <IconFA name="xmark" size={14} />
          </button>
        </div>
      </div>

      <div className="aura-panel-content">
        {messages.length === 0 ? (
          <div className="aura-panel-empty">
            <div className="aura-empty-icon">
              <IconFA name="sparkles" size={32} />
            </div>
            <h3>AI-Powered Migration Assistant</h3>
            <p>I can help you migrate data from PostgreSQL, MySQL, Oracle, MongoDB, and more to SingleStore.</p>
            <div className="aura-suggested-prompts">
              {MIGRATION_PROMPTS.map((prompt, i) => (
                <button 
                  key={i} 
                  className="aura-prompt-chip"
                  onClick={() => {
                    setInputValue(prompt)
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="aura-panel-messages">
            {messages.map((message) => (
              <div key={message.id} className={`aura-message ${message.type}`}>
                {message.type === 'user' ? (
                  <div className="aura-user-bubble">
                    <p>{message.text}</p>
                  </div>
                ) : (
                  <>
                    <div className="aura-message-header">
                      <span className="aura-message-sender">Aura</span>
                      <span className="dot" />
                      <span className="aura-message-time">{formatTime(message.timestamp)}</span>
                    </div>
                    <p className="aura-message-text">{message.text}</p>
                  </>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      <div className="aura-panel-input">
        <div className="aura-input-container">
          <textarea
            placeholder="Ask about data migration..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
          />
          <div className="aura-input-controls">
            <div className="aura-input-actions">
              <button className="icon-btn">
                <PlusIcon />
              </button>
              <div className="aura-agent-dropdown-wrapper" ref={dropdownRef}>
                <button 
                  className="aura-agent-selector"
                  onClick={() => setAgentDropdownOpen(!agentDropdownOpen)}
                >
                  <IconFA name={selectedAgent.icon} size={14} />
                  <span>{selectedAgent.name}</span>
                  <ChevronDownIcon className="chevron" />
                </button>
                {agentDropdownOpen && (
                  <div className="aura-agent-dropdown">
                    {AURA_AGENTS.map((agent) => (
                      <button
                        key={agent.id}
                        className={`aura-agent-option ${selectedAgent.id === agent.id ? 'selected' : ''}`}
                        onClick={() => handleAgentSelect(agent)}
                      >
                        <IconFA name={agent.icon} size={14} />
                        <span>{agent.name}</span>
                        {selectedAgent.id === agent.id && <IconFA name="check" size={12} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button className="send-btn" disabled={!inputValue.trim()} onClick={() => onSend(inputValue)}>
              <SendIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
