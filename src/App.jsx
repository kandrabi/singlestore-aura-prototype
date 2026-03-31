import { useState, useRef, useEffect } from 'react'
import Editor, { DiffEditor } from '@monaco-editor/react'
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

// ============================================
// QUERY TUNING AGENT - Mock Intelligence
// ============================================
// Analyzes SQL queries and provides optimization suggestions

function createQueryTuningAgent(input) {
  const { query, executionTime = null } = input
  const queryUpper = query.toUpperCase()
  
  // Pattern detection for common issues
  const issues = []
  
  // Issue 1: SELECT * usage
  if (queryUpper.includes('SELECT *')) {
    issues.push({
      type: 'select-star',
      issue: 'Using SELECT * retrieves all columns',
      whyItMatters: 'Fetching unnecessary columns increases I/O, memory usage, and network transfer. This is especially impactful for tables with many columns or large data types.',
      recommendedFix: {
        explanation: 'Specify only the columns you need. This reduces data transfer and allows the optimizer to use covering indexes.',
        transform: (q) => {
          // Simple mock: replace SELECT * with specific columns
          return q.replace(/SELECT \*/gi, 'SELECT id, customer_id, created_at, status')
        }
      },
      impact: 'Can reduce query execution time by 30-50% and memory usage significantly'
    })
  }
  
  // Issue 2: Subquery in WHERE clause (can often be rewritten as JOIN)
  if (queryUpper.includes('WHERE') && queryUpper.includes('IN (') && queryUpper.includes('SELECT')) {
    issues.push({
      type: 'subquery-to-join',
      issue: 'Subquery in WHERE clause can be inefficient',
      whyItMatters: 'Subqueries in WHERE clauses are executed for each row, leading to poor performance on large datasets. JOINs allow the optimizer to choose more efficient execution plans.',
      recommendedFix: {
        explanation: 'Rewrite the subquery as a JOIN. This allows the database to use hash joins or merge joins, which are typically faster.',
        transform: (q) => {
          // Mock transformation for the sample query
          if (q.includes('customer_id IN')) {
            return `SELECT o.id, o.customer_id, o.created_at, o.status
FROM orders o
INNER JOIN customers c ON o.customer_id = c.id
WHERE c.email LIKE '%gmail.com'
  AND c.status = 'active'
  AND o.created_at > '2024-01-01'
ORDER BY o.created_at DESC;`
          }
          return q
        }
      },
      impact: 'JOINs can be 2-10x faster than correlated subqueries on large tables'
    })
  }
  
  // Issue 3: Missing LIMIT clause
  if (!queryUpper.includes('LIMIT') && queryUpper.includes('SELECT')) {
    issues.push({
      type: 'missing-limit',
      issue: 'Query has no LIMIT clause',
      whyItMatters: 'Without a LIMIT, the query may return millions of rows, causing memory issues and slow response times.',
      recommendedFix: {
        explanation: 'Add a LIMIT clause to restrict the result set, especially for exploratory queries or paginated results.',
        transform: (q) => {
          const trimmed = q.trim()
          if (trimmed.endsWith(';')) {
            return trimmed.slice(0, -1) + '\nLIMIT 100;'
          }
          return trimmed + '\nLIMIT 100'
        }
      },
      impact: 'Prevents unbounded result sets and improves response time'
    })
  }
  
  // Issue 4: LIKE with leading wildcard
  if (queryUpper.includes("LIKE '%") || queryUpper.includes("LIKE \"%")) {
    issues.push({
      type: 'leading-wildcard',
      issue: 'LIKE pattern starts with wildcard (%)',
      whyItMatters: 'Leading wildcards prevent index usage, forcing a full table scan. This significantly degrades performance on large tables.',
      recommendedFix: {
        explanation: 'If possible, restructure the query to avoid leading wildcards. Consider using full-text search or storing reversed strings for suffix searches.',
        transform: (q) => q // Can't automatically fix this one
      },
      impact: 'Index usage can improve query speed by 100x or more'
    })
  }
  
  // If no issues found, return a positive result
  if (issues.length === 0) {
    return {
      status: 'optimized',
      message: 'This query looks well-optimized! No obvious performance issues detected.',
      suggestions: [
        'Consider adding appropriate indexes if not already present',
        'Review execution plan for any unexpected full table scans',
        'Monitor query performance in production'
      ]
    }
  }
  
  // Pick the most impactful issue (subquery > select-star > others)
  const priorityOrder = ['subquery-to-join', 'select-star', 'leading-wildcard', 'missing-limit']
  const sortedIssues = issues.sort((a, b) => 
    priorityOrder.indexOf(a.type) - priorityOrder.indexOf(b.type)
  )
  
  const primaryIssue = sortedIssues[0]
  const suggestedQuery = primaryIssue.recommendedFix.transform(query)
  
  return {
    status: 'issues-found',
    issue: primaryIssue.issue,
    whyItMatters: primaryIssue.whyItMatters,
    recommendedFix: {
      explanation: primaryIssue.recommendedFix.explanation,
      suggestedQuery: suggestedQuery
    },
    impact: primaryIssue.impact,
    additionalIssues: sortedIssues.slice(1).map(i => ({
      issue: i.issue,
      impact: i.impact
    })),
    executionTime: executionTime
  }
}

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

const AURA_PROMPTS = [
  'Show workspaces at risk',
  'Check cluster health status',
  'Analyze query performance',
  'Review resource utilization'
]

const QUERY_TUNING_PROMPTS = [
  'Optimize this slow query',
  'Analyze query execution plan',
  'Suggest index improvements',
  'Review query performance metrics'
]

const MIGRATION_CHAT_FLOW = [
  // Scene 1: Initial greeting & frictionless input
  {
    type: 'agent',
    content: {
      text: [
        { type: 'text', content: 'I can help you migrate your PostgreSQL database to SingleStore.' },
        { type: 'text', content: "Let's start by connecting to your source database." }
      ],
      actions: ['Use existing connection', 'Add new connection']
    }
  },
  // Scene 1b: Show filtered PostgreSQL connections
  {
    type: 'agent',
    content: {
      text: [
        { type: 'text', content: 'Select a PostgreSQL connection:' }
      ],
      connectionSelect: {
        name: 'PostgreSQL Production',
        db: 'ecommerce_core',
        tables: '50 tables',
        url: 'mcp.internal.acmecorp.com/postgres-prod-cluster'
      },
      actions: ['Connect']
    }
  },
  // Scene 2: Connecting progress (will update in place)
  {
    type: 'agent',
    content: {
      progress: true,
      text: 'Connecting to MCP server...',
      url: 'https://mcp.internal.acmecorp.com/postgres-prod-cluster',
      // After completion, update to this state
      completedState: {
        text: 'Secure connection to PostgreSQL established.',
        subtext: '→ Introspecting database...'
      }
    }
  },
  {
    type: 'agent',
    content: {
      text: [
        { type: 'text', content: 'Introspection complete. Here is the profile of your source database:' }
      ],
      dbProfile: {
        title: 'Database Profile',
        stats: [
          { label: 'Total Data Size:', value: '500 GB' },
          { label: 'Table Count:', value: '50 tables' },
          { label: 'Source Database:', value: 'ecommerce_core' }
        ]
      },
      migrationConsiderations: {
        intro: 'As we map this to SingleStore, I want to highlight a few known PostgreSQL migration considerations:',
        warnings: [
          { 
            type: 'Data Issue', 
            text: 'PostgreSQL UUID types will map to VARCHAR(36). If you join heavily on these columns, we should ensure they are indexed appropriately in SingleStore.' 
          },
          { 
            type: 'System Constraint', 
            text: 'You have 3 tables exceeding 50GB. Standard ingestion will be too slow for these, so I will automatically route them to our heavy-duty XL Ingest pipeline.' 
          }
        ]
      },
      followUp: 'Would you like me to generate the schema transformation plan with these best practices applied?',
      actions: ['Yes, generate the plan', 'Skip (use defaults)']
    }
  },
  // Scene 3: Analyzing query patterns (progress)
  {
    type: 'agent',
    content: {
      progress: true,
      text: 'Analyzing query patterns...',
      steps: [
        '✓ Parsing 5 analytical queries',
        '✓ Identifying join patterns and filter columns',
        '✓ Calculating optimal shard keys'
      ]
    }
  },
  // Scene 3b: Schema translation complete with review widget
  {
    type: 'agent',
    content: {
      text: [
        { type: 'text', content: 'Schema translation complete. Here is your transformation summary:' }
      ],
      transformationSummary: {
        title: 'Transformation Summary',
        stats: [
          { label: 'Analyzed:', value: '50 tables' },
          { label: 'Transformations applied:', value: '120 (mapped types, stripped FKs, selected shard keys)' },
          { label: 'Confidence Level:', value: '95%', highlight: true }
        ]
      },
      actionRequired: {
        text: '4 tables heavily utilize JSON columns. I have suggested specialized Multi-Value Indexes for them, but they require your manual review before we can proceed.'
      },
      interactiveManualReview: {
        items: [
          { 
            name: 'products', 
            reason: 'Heavy JSON usage detected',
            originalDDL: `CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  metadata JSONB,
  attributes JSONB
);`,
            generatedDDL: `CREATE TABLE products (
  id BIGINT AUTO_INCREMENT,
  name VARCHAR(255),
  metadata JSON,
  attributes JSON,
  PRIMARY KEY (id),
  -- Multi-Value Index for JSON queries
  INDEX mv_idx_metadata (metadata)
);`
          },
          { 
            name: 'reviews', 
            reason: 'Complex JSON schema with nested arrays',
            originalDDL: `CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  product_id INT,
  ratings JSONB,
  comments JSONB
);`,
            generatedDDL: `CREATE TABLE reviews (
  id BIGINT AUTO_INCREMENT,
  product_id BIGINT,
  ratings JSON,
  comments JSON,
  PRIMARY KEY (id),
  SHARD KEY (product_id)
);`
          },
          { 
            name: 'cart_items', 
            reason: 'JSON column with high cardinality keys',
            originalDDL: `CREATE TABLE cart_items (
  id SERIAL PRIMARY KEY,
  user_id INT,
  items JSONB
);`,
            generatedDDL: `CREATE TABLE cart_items (
  id BIGINT AUTO_INCREMENT,
  user_id BIGINT,
  items JSON,
  PRIMARY KEY (id),
  SHARD KEY (user_id)
);`
          },
          { 
            name: 'audit_logs', 
            reason: 'Flexible schema with variable JSON keys',
            originalDDL: `CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  event_data JSONB,
  created_at TIMESTAMP
);`,
            generatedDDL: `CREATE TABLE audit_logs (
  id BIGINT AUTO_INCREMENT,
  event_data JSON,
  created_at DATETIME,
  PRIMARY KEY (id)
);`
          }
        ]
      }
    }
  },
  // Scene 2b: All tables reviewed confirmation
  {
    type: 'agent',
    content: {
      text: [
        { type: 'success', content: 'All 4 flagged tables have been reviewed and resolved.' },
        { type: 'text', content: 'All generated DDL has been validated against the SingleStore parser.' },
        { type: 'bold', content: 'Your schema is 100% ready. Shall we move on to provisioning the Flow instance for data ingestion?' }
      ],
      actions: ['Yes', 'Review DDL again']
    }
  },
  // Scene 3: Pipeline orchestration with interactive table selection
  {
    type: 'agent',
    content: {
      text: [
        { type: 'text', content: 'Great. Since I already have your source connection context via the MCP server, I am automatically selecting the tables for ingestion based on your migration plan.' },
        { type: 'mixed', content: 'I will configure ', bold: 'standard Flow Ingest', after: ' for the small tables, and ', bold2: 'XL Ingest', after2: ' for the 3 large tables.' },
        { type: 'text', content: 'Please review the selected tables below. You can deselect any tables you do not wish to include in the pipeline.' }
      ],
      interactiveTableSelection: {
        tables: [
          { name: 'customers', rows: '2.3M', size: '1.2 GB', selected: true },
          { name: 'orders', rows: '12.5M', size: '8.4 GB', selected: true },
          { name: 'order_items', rows: '45.8M', size: '28.3 GB', selected: true, xlIngest: true },
          { name: 'products', rows: '500K', size: '245 MB', selected: true },
          { name: 'categories', rows: '1.2K', size: '128 KB', selected: true },
          { name: 'users', rows: '890K', size: '412 MB', selected: true },
          { name: 'sessions', rows: '5.2M', size: '2.1 GB', selected: true },
          { name: 'inventory_logs', rows: '78.2M', size: '52.1 GB', selected: true, xlIngest: true },
          { name: 'transactions', rows: '95.1M', size: '61.8 GB', selected: true, xlIngest: true },
          { name: 'reviews', rows: '3.4M', size: '1.8 GB', selected: true },
          { name: 'wishlists', rows: '1.1M', size: '320 MB', selected: true },
          { name: 'cart_items', rows: '2.8M', size: '890 MB', selected: true },
          { name: 'shipping_addresses', rows: '1.5M', size: '680 MB', selected: true },
          { name: 'payment_methods', rows: '920K', size: '210 MB', selected: true },
          { name: 'coupons', rows: '45K', size: '12 MB', selected: true },
          { name: 'promotions', rows: '8.2K', size: '4.5 MB', selected: true },
          { name: 'legacy_system_logs', rows: '156M', size: '42 GB', selected: true },
          { name: 'temp_events', rows: '89M', size: '18 GB', selected: true }
        ],
        totalTables: 50
      }
    }
  },
  // Scene 3b: Table selection confirmed, Flow instance provisioning
  {
    type: 'agent',
    content: {
      text: [
        { type: 'text', content: 'Schema is confirmed.' },
        { type: 'text', content: 'Great. Now we need to provision the underlying Flow instance to handle the data movement.' },
        { type: 'mixed', content: 'Based on your ', bold: '500GB initial load', after: ' and the requirement for real-time CDC, I recommend provisioning an ', bold2: 'F2 Flow Instance', after2: '.' }
      ],
      whyCard: {
        title: 'Why F2?',
        items: [
          { prefix: 'An ', bold: 'F1 instance', suffix: ' would bottleneck your initial snapshot' },
          { prefix: 'An ', bold: 'F4 instance', suffix: ' would be over-provisioned for this data volume' },
          { prefix: '', bold: 'F2', suffix: ' provides optimal throughput for 500GB with real-time CDC' }
        ]
      },
      flowInstanceSelector: {
        label: 'Select Flow Instance Size:',
        options: [
          { id: 'f2', label: 'F2 (Recommended)', recommended: true },
          { id: 'f1', label: 'F1' },
          { id: 'f4', label: 'F4' }
        ]
      },
      footerText: 'Please confirm your destination workspace and instance size:'
    }
  },
  // Scene 3c: Provisioning F2 Flow instance (progress)
  {
    type: 'agent',
    content: {
      progress: true,
      text: 'Provisioning F2 Flow instance...',
      completedState: {
        text: 'Provisioning F2 Flow instance...',
        subtext: 'Complete'
      }
    }
  },
  // Scene 3d: Infrastructure ready with CDC selector
  {
    type: 'agent',
    content: {
      text: [
        { type: 'success', content: 'Infrastructure ready.' }
      ],
      provisionedResourcesGreen: {
        title: 'Provisioned Resources',
        stats: [
          { label: 'Destination:', value: 'Workspace-Group-Prod' },
          { label: 'Compute:', value: 'Flow Instance (Size: F2)' },
          { label: 'Strategy:', value: 'Standard + XL Ingest' }
        ]
      },
      cdcSelector: {
        label: 'Select CDC schedule:',
        question: 'Would you like to configure your Change Data Capture (CDC) schedule as real-time, periodic, or daily?',
        options: ['Real-time', 'Periodic', 'Daily']
      }
    }
  },
  // Scene 4: Guardrails & execution confirmation
  {
    type: 'agent',
    content: {
      text: [
        { type: 'text', content: 'Your Flow pipeline is fully configured for real-time CDC.' }
      ],
      warningCard: {
        icon: '⚠️',
        title: 'Explain Before Execute',
        text: 'AI can make mistakes. Please validate your schemas and migration results in a non-production environment before applying them to production.'
      },
      followUp: 'Would you like to execute the migration now?',
      actions: ['Execute migration', 'Review configuration']
    }
  },
  // Scene 5: Migration execution
  {
    type: 'agent',
    content: {
      progress: true,
      text: 'Executing migration pipeline...',
      steps: [
        '✓ Creating tables in SingleStore',
        '✓ Configuring Flow Ingest pipelines',
        '✓ Starting XL Ingest for large tables',
        '→ Loading data from source...'
      ]
    }
  },
  // Scene 5: Verification & cross-agent handoff
  {
    type: 'agent',
    content: {
      success: true,
      title: 'Migration complete! 🎉',
      text: 'I verified that the source and destination row counts match.',
      migrationStats: {
        stats: [
          { label: 'Tables migrated:', value: '50 / 50' },
          { label: 'Total rows:', value: '142,845,721' },
          { label: 'Source count:', value: '142,845,721' },
          { label: 'Destination count:', value: '142,845,721 ✓', success: true },
          { label: 'Data volume:', value: '~140 GB' },
          { label: 'Duration:', value: '14m 28s', divider: true }
        ]
      },
      followUp: 'I notice that some of your complex analytical queries might run slower than expected on the new schema. Would you like me to hand this off to the Query Tuning Agent to analyze your post-migration query performance?',
      actions: ['Yes, tune my queries', 'No thanks']
    }
  }
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
      resizeProgress: {
        text: 'Resizing workspace…',
        workspace: 'prod-analyst',
        group: 'Group 1',
        env: 'Prod',
        duration: 5
      }
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
  const [auraPanelAgentName, setAuraPanelAgentName] = useState('Aura Agent')
  const [auraPanelFlow, setAuraPanelFlow] = useState('none') // 'none', 'default', 'cpu-spike', 'migration'
  const [auraPanelFlowIndex, setAuraPanelFlowIndex] = useState(0)
  const [migrationFlowIndex, setMigrationFlowIndex] = useState(0)
  const [isAuraTyping, setIsAuraTyping] = useState(false)
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)
  // Query Tuning Agent state
  const [queryTuningResult, setQueryTuningResult] = useState(null)
  const [queryTuningContext, setQueryTuningContext] = useState(null)
  const applyQueryRef = useRef(null) // Callback to apply query to editor
  const chatEndRef = useRef(null)
  const auraChatEndRef = useRef(null)

  // Mark a single notification as read
  const markNotificationAsRead = (notificationId) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, unread: false } : n
    ))
  }

  // Mark all notifications as read
  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })))
  }

  // Auto-collapse sidebar on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarExpanded(false)
      }
    }
    
    // Check on mount
    handleResize()
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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

  // Get default agent based on page context (Priority 3)
  const getDefaultAgentForPage = (pageView) => {
    switch (pageView) {
      case 'load-data':
        return 'Data Migration Agent'
      case 'editor':
        return 'Query Tuning Agent'
      default:
        return 'Aura Agent'
    }
  }

  // Check if there's an active conversation (user has sent at least one message)
  // Seeded agent messages (from notifications, intro content) don't count as active
  const hasActiveConversation = () => {
    return auraPanelMessages.some(msg => msg.type === 'user')
  }

  const handleOpenAuraPanel = (options = {}) => {
    const { agent, context, onApplyQuery } = options
    
    // DEBUG LOGS - Remove after fixing
    console.log('[OPEN_PANEL] called with options:', options)
    console.log('[OPEN_PANEL] hasActiveConversation():', hasActiveConversation())
    console.log('[OPEN_PANEL] currentAgent:', auraPanelAgentName)
    console.log('[OPEN_PANEL] currentView:', view)
    
    // Priority 1: If specific agent is requested with context (e.g., Query Tuning)
    if (agent === 'Query Tuning Agent' && context?.query) {
      // Store the apply callback
      applyQueryRef.current = onApplyQuery
      
      // Set agent and context
      setAuraPanelAgentName('Query Tuning Agent')
      setQueryTuningContext(context)
      
      // Clear previous conversation for fresh analysis
      setAuraPanelMessages([])
      setAuraPanelFlow('query-tuning')
      
      // Simulate "thinking" state
      setIsAuraTyping(true)
      setQueryTuningResult(null)
      setAuraPanelOpen(true)
      
      // Run the Query Tuning Agent after a brief delay (simulating LLM call)
      setTimeout(() => {
        const result = createQueryTuningAgent({
          query: context.query,
          executionTime: context.executionMetadata?.duration || null
        })
        setQueryTuningResult(result)
        setIsAuraTyping(false)
      }, 1500)
      
      return
    }
    
    // Priority 2: If there's an active conversation (user has sent a message), keep current agent
    if (hasActiveConversation()) {
      console.log('[OPEN_PANEL] Active conversation exists, keeping current agent')
      setAuraPanelOpen(true)
      return
    }
    
    // Priority 3: No active conversation, use page context routing
    const nextAgent = getDefaultAgentForPage(view)
    console.log('[OPEN_PANEL] No active conversation, setting agent to:', nextAgent)
    setAuraPanelAgentName(nextAgent)
    setAuraPanelOpen(true)
  }
  
  // Handle applying optimized query to editor
  const handleApplyQueryToEditor = (newQuery) => {
    if (applyQueryRef.current) {
      applyQueryRef.current(newQuery)
    }
    // Clear the query tuning result after applying
    setQueryTuningResult(null)
    setQueryTuningContext(null)
  }

  const handleNavigate = (newView) => {
    // DEBUG LOGS - Remove after fixing
    console.log('[NAVIGATE] newView:', newView)
    console.log('[NAVIGATE] currentView:', view)
    console.log('[NAVIGATE] auraPanelOpen:', auraPanelOpen)
    console.log('[NAVIGATE] hasActiveConversation():', hasActiveConversation())
    console.log('[NAVIGATE] auraPanelMessages.length:', auraPanelMessages.length)
    console.log('[NAVIGATE] currentAgent:', auraPanelAgentName)
    console.log('[NAVIGATE] nextDefaultAgent:', getDefaultAgentForPage(newView))
    
    // Priority 1: If navigating away from chat view, transfer conversation to side panel
    // The conversation continues with the SAME agent - do NOT change agent
    const isTransferringChat = view === 'chat' && newView !== 'chat' && newView !== 'portal' && chatMessages.length > 0
    
    if (isTransferringChat) {
      // Transfer chat messages to side panel - keep the same agent (Aura Agent for all home-initiated chats)
      setAuraPanelMessages(chatMessages)
      setAuraPanelAgentName('Aura Agent')
      // Also transfer the active flow and flow index
      setAuraPanelFlow(activeChatFlow)
      setAuraPanelFlowIndex(currentFlowIndex)
      setAuraPanelOpen(true)
    }
    
    // Context-aware agent switching: If panel is open but no active conversation, update agent for new page
    const shouldSwitchAgent = auraPanelOpen && !hasActiveConversation()
    console.log('[NAVIGATE] shouldSwitchAgent:', shouldSwitchAgent)
    
    if (shouldSwitchAgent) {
      const nextAgent = getDefaultAgentForPage(newView)
      console.log('[NAVIGATE] Switching agent to:', nextAgent)
      setAuraPanelAgentName(nextAgent)
    }
    
    setView(newView)
  }

  const handleCloseAuraPanel = () => {
    setAuraPanelOpen(false)
    setAuraPanelFullscreen(false)
  }

  // Handle manual agent switch - starts a NEW conversation (clears previous context)
  const handleAgentChange = (newAgentName) => {
    // Clear previous conversation when switching agents
    setAuraPanelMessages([])
    setAuraPanelInput('')
    setMigrationFlowIndex(0)
    setAuraPanelFlow('none')
    setAuraPanelFlowIndex(0)
    setIsAuraTyping(false)
    // Set the new agent
    setAuraPanelAgentName(newAgentName)
  }

  // Start a new chat - reset conversation but keep current agent
  const handleNewChat = () => {
    setAuraPanelMessages([])
    setAuraPanelInput('')
    setMigrationFlowIndex(0)
    setAuraPanelFlow('none')
    setAuraPanelFlowIndex(0)
    setIsAuraTyping(false)
  }

  const addNextMigrationMessage = (index) => {
    if (index >= MIGRATION_CHAT_FLOW.length) return
    setIsAuraTyping(true)
    setTimeout(() => {
      setIsAuraTyping(false)
      const message = MIGRATION_CHAT_FLOW[index]
      
      // Mark previous progress messages as completed (without completedState)
      setAuraPanelMessages(prev => {
        const updated = prev.map(msg => 
          (msg.content?.progress && !msg.content?.completedState) 
            ? { ...msg, content: { ...msg.content, completed: true } } 
            : msg
        )
        return [...updated, { ...message, id: Date.now(), timestamp: new Date() }]
      })
      setMigrationFlowIndex(index + 1)
      
      // Auto-advance progress messages after a delay
      if (message.content?.progress) {
        // Calculate delay based on whether there are steps
        const hasSteps = message.content?.steps?.length > 0
        const stepsCount = message.content?.steps?.length || 0
        // For steps: 800ms initial + 700ms per step + 400ms completion + buffer
        const stepsDelay = hasSteps ? (800 + (stepsCount * 700) + 400 + 500) : 2500
        
        setTimeout(() => {
          // If this message has a completedState, update it in place first
          if (message.content?.completedState) {
            setAuraPanelMessages(prev => 
              prev.map(msg => 
                msg.content?.progress && msg.content?.completedState && !msg.content?.completed
                  ? { ...msg, content: { ...msg.content, completed: true } }
                  : msg
              )
            )
            // Then advance to next message after another delay
            setTimeout(() => addNextMigrationMessage(index + 1), 2000)
          } else {
            addNextMigrationMessage(index + 1)
          }
        }, stepsDelay)
      }
      
      // Auto-advance autoAdvance messages (but not if progress already handles it)
      if (message.content?.autoAdvance && !message.content?.progress) {
        setTimeout(() => addNextMigrationMessage(index + 1), 2500)
      }
    }, 1000)
  }

  const handleAuraPanelSend = (text) => {
    if (!text.trim()) return
    setAuraPanelMessages(prev => [...prev, { type: 'user', id: Date.now(), text, timestamp: new Date() }])
    setAuraPanelInput('')
    
    // Route to correct flow based on active agent
    if (auraPanelAgentName === 'Data Migration Agent') {
      const nextIndex = auraPanelMessages.length === 0 ? 0 : migrationFlowIndex
      setTimeout(() => addNextMigrationMessage(nextIndex), 500)
    } else {
      // Generic AI response for other agents when no active flow
      setIsAuraTyping(true)
      setTimeout(() => {
        setIsAuraTyping(false)
        const response = {
          type: 'agent',
          id: Date.now(),
          timestamp: new Date(),
          content: {
            text: [
              { type: 'text', content: "I understand you're asking about: \"" + text.substring(0, 50) + (text.length > 50 ? '...' : '') + "\"" },
              { type: 'text', content: "I can help you with any of these tasks:" }
            ],
            actions: ['Analyze workspace capacity', 'Load data from PostgreSQL', 'Diagnose high CPU usage']
          }
        }
        setAuraPanelMessages(prev => [...prev, response])
      }, 1000)
    }
  }

  // Add next message for default (workspace capacity) flow in side panel
  const addNextPanelMessage = (index) => {
    if (index >= CHAT_FLOW.length) return
    const message = CHAT_FLOW[index]
    setIsAuraTyping(true)
    setTimeout(() => {
      setAuraPanelMessages(prev => [...prev, { ...message, id: Date.now(), timestamp: new Date() }])
      setAuraPanelFlowIndex(index + 1)
      setIsAuraTyping(false)
    }, 500)
  }

  // Add next message for CPU spike flow in side panel
  const addNextPanelCpuSpikeMessage = (index) => {
    if (index >= CPU_SPIKE_CHAT_FLOW.length) return
    const message = CPU_SPIKE_CHAT_FLOW[index]
    setIsAuraTyping(true)
    setTimeout(() => {
      setAuraPanelMessages(prev => [...prev, { ...message, id: Date.now(), timestamp: new Date() }])
      setAuraPanelFlowIndex(index + 1)
      setIsAuraTyping(false)
    }, 500)
  }

  const handleAuraAction = (action) => {
    const actionText = typeof action === 'string' ? action : action.text
    setAuraPanelMessages(prev => [...prev, { type: 'user', id: Date.now(), text: actionText, timestamp: new Date() }])
    
    // Route to correct flow based on active flow type
    if (auraPanelAgentName === 'Data Migration Agent' || auraPanelFlow === 'migration') {
      setTimeout(() => addNextMigrationMessage(migrationFlowIndex), 500)
    } else if (auraPanelFlow === 'cpu-spike') {
      // Handle CPU spike flow actions
      if (['Investigate spike', 'Show affected queries'].includes(actionText)) {
        setTimeout(() => addNextPanelCpuSpikeMessage(auraPanelFlowIndex), 500)
      } else if (actionText === 'Get more details on Select_act_samples_new') {
        setTimeout(() => addNextPanelCpuSpikeMessage(auraPanelFlowIndex), 500)
      } else {
        // Fallback for unhandled actions
        handleTriggerAction(actionText)
      }
    } else if (auraPanelFlow === 'default') {
      // Handle workspace capacity flow actions
      if (['View recommended actions', 'Suggest alternate options', 'Show affected queries'].includes(actionText)) {
        setTimeout(() => addNextPanelMessage(auraPanelFlowIndex), 500)
      } else if (actionText === 'Apply resize' || actionText === 'Resize anyway') {
        setTimeout(() => addNextPanelMessage(3), 500)
      } else if (actionText === 'Confirm') {
        // Add progress message
        const progressMessageId = Date.now() + 1
        setTimeout(() => {
          setIsAuraTyping(false)
          setAuraPanelMessages(prev => [...prev, { ...CHAT_FLOW[4], id: progressMessageId, timestamp: new Date(), typingComplete: true }])
        }, 500)
        // After 5 seconds, remove progress message and add success message
        setTimeout(() => {
          setAuraPanelMessages(prev => {
            const filtered = prev.filter(m => m.id !== progressMessageId)
            return [...filtered, { ...CHAT_FLOW[5], id: Date.now(), timestamp: new Date(), typingComplete: true }]
          })
          setAuraPanelFlowIndex(6)
        }, 5500)
      } else {
        // Fallback for unhandled actions
        handleTriggerAction(actionText)
      }
    } else {
      // No active flow - check for trigger actions or provide generic response
      handleTriggerAction(actionText)
    }
  }

  // Handle specific trigger actions that start new flows
  const handleTriggerAction = (actionText) => {
    if (actionText === 'Analyze workspace capacity') {
      // Start workspace capacity flow (Use Case 1)
      setAuraPanelFlow('default')
      setAuraPanelFlowIndex(1)
      setAuraPanelAgentName('Aura Agent')
      setIsAuraTyping(true)
      setTimeout(() => {
        setIsAuraTyping(false)
        setAuraPanelMessages(prev => [...prev, { ...CHAT_FLOW[0], id: Date.now(), timestamp: new Date() }])
      }, 500)
    } else if (actionText === 'Load data from PostgreSQL') {
      // Start data migration flow (Use Case 3)
      setAuraPanelFlow('migration')
      setMigrationFlowIndex(1)
      setAuraPanelAgentName('Data Migration Agent')
      setIsAuraTyping(true)
      setTimeout(() => {
        setIsAuraTyping(false)
        setAuraPanelMessages(prev => [...prev, { ...MIGRATION_CHAT_FLOW[0], id: Date.now(), timestamp: new Date() }])
      }, 500)
    } else if (actionText === 'Diagnose high CPU usage') {
      // Start CPU spike flow (Use Case 2)
      setAuraPanelFlow('cpu-spike')
      setAuraPanelFlowIndex(1)
      setAuraPanelAgentName('Aura Agent')
      setIsAuraTyping(true)
      setTimeout(() => {
        setIsAuraTyping(false)
        setAuraPanelMessages(prev => [...prev, { ...CPU_SPIKE_CHAT_FLOW[0], id: Date.now(), timestamp: new Date() }])
      }, 500)
    } else {
      // Generic fallback response
      setIsAuraTyping(true)
      setTimeout(() => {
        setIsAuraTyping(false)
        const response = {
          type: 'agent',
          id: Date.now(),
          timestamp: new Date(),
          content: {
            text: [
              { type: 'text', content: `I'd be happy to help you with "${actionText}".` },
              { type: 'text', content: 'Select one of the options below to get started:' }
            ],
            actions: ['Analyze workspace capacity', 'Load data from PostgreSQL', 'Diagnose high CPU usage']
          }
        }
        setAuraPanelMessages(prev => [...prev, response])
      }, 800)
    }
  }

  const advanceMigrationFlowSilently = () => {
    // Only advance migration flow if Data Migration Agent is active
    if (auraPanelAgentName === 'Data Migration Agent') {
      setTimeout(() => addNextMigrationMessage(migrationFlowIndex), 500)
    }
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
      // CPU/infrastructure notifications → Aura Agent ONLY (Priority 2)
      // If on home/portal page, open full screen chat
      // Otherwise, open as side panel
      if (view === 'portal' || view === 'chat') {
        setView('chat')
        setChatMessages([])
        setCurrentFlowIndex(0)
        setUserMsgIndex(0)
        setActiveChatFlow('cpu-spike')
        setTimeout(() => addNextCpuSpikeMessage(0), 500)
      } else {
        // Open as side panel on other pages - still use Aura Agent
        setAuraPanelOpen(true)
        setAuraPanelMessages([])
        setAuraPanelAgentName('Aura Agent')
        setMigrationFlowIndex(0)
        // Start the CPU spike flow in the side panel
        setTimeout(() => {
          const message = CPU_SPIKE_CHAT_FLOW[0]
          setAuraPanelMessages([{ ...message, id: Date.now(), timestamp: new Date() }])
        }, 500)
      }
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
        // Add progress message (mark as typingComplete since there's no text to type)
        const progressMessageId = Date.now() + 1
        setTimeout(() => {
          setIsTyping(false)
          setChatMessages(prev => [...prev, { ...CHAT_FLOW[4], id: progressMessageId, timestamp: new Date(), typingComplete: true }])
        }, 500)
        // After 5 seconds, remove progress message and add success message
        setTimeout(() => {
          setChatMessages(prev => {
            // Remove the progress message and add the success message
            const filtered = prev.filter(m => m.id !== progressMessageId)
            return [...filtered, { ...CHAT_FLOW[5], id: Date.now(), timestamp: new Date(), typingComplete: true }]
          })
          setCurrentFlowIndex(6)
        }, 5500)
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
      case 'workspaces':
        return <WorkspacesView />
      case 'editor':
        return <EditorView onOpenAura={handleOpenAuraPanel} />
      default:
        return null
    }
  }

  return (
    <>
      <Header 
        onLogoClick={() => setView('portal')} 
        onAskAura={handleOpenAuraPanel} 
        onNotificationClick={handleNotificationClick}
        notifications={notifications}
        onMarkAsRead={markNotificationAsRead}
        onMarkAllAsRead={markAllNotificationsAsRead}
      />
      <div className="app-container">
        <Sidebar 
          onNavigate={handleNavigate} 
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
            sidebarExpanded={sidebarExpanded}
            width={auraPanelWidth}
            onClose={handleCloseAuraPanel}
            onToggleFullscreen={() => setAuraPanelFullscreen(!auraPanelFullscreen)}
            onWidthChange={setAuraPanelWidth}
            messages={auraPanelMessages}
            inputValue={auraPanelInput}
            setInputValue={setAuraPanelInput}
            onSend={handleAuraPanelSend}
            onAction={handleAuraAction}
            onAdvanceSilently={advanceMigrationFlowSilently}
            isTyping={isAuraTyping}
            chatEndRef={auraChatEndRef}
            agentName={auraPanelAgentName}
            onAgentChange={handleAgentChange}
            onNewChat={handleNewChat}
            queryTuningResult={queryTuningResult}
            queryTuningContext={queryTuningContext}
            onApplyQuery={handleApplyQueryToEditor}
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
    if (item.id === 'home' && (currentView === 'portal' || currentView === 'chat')) return true
    if (item.id === 'workspaces' && currentView === 'workspaces') return true
    if (item.id === 'load-data' && currentView === 'load-data') return true
    if (item.id === 'editor' && currentView === 'editor') return true
    return false
  }

  const handleNavClick = (item) => {
    if (item.children && isExpanded) {
      toggleExpand(item.id)
    } else if (item.id === 'home') {
      onNavigate('portal')
    } else if (item.id === 'workspaces') {
      onNavigate('workspaces')
    } else if (item.id === 'ingestion' || item.id === 'load-data') {
      onNavigate('load-data')
    } else if (item.id === 'editor') {
      onNavigate('editor')
    }
  }

  const handleChildClick = (child) => {
    if (child.id === 'load-data') {
      onNavigate('load-data')
    }
  }

  return (
    <div className={`unified-sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="unified-sidebar-top">
        <button 
          className="unified-create-btn" 
          title={!isExpanded ? "Create New" : undefined}
        >
          <PlusIcon />
          <span className="unified-label">Create New</span>
        </button>
        
        <nav className="unified-sidebar-nav">
          {SIDEBAR_NAV_ITEMS.map((item) => (
            <div key={item.id} className="unified-nav-wrapper">
              <button 
                className={`unified-nav-item ${getActiveState(item) ? 'active' : ''}`}
                onClick={() => handleNavClick(item)}
                title={!isExpanded ? item.label : undefined}
              >
                <div className="unified-nav-icon">
                  <SidebarIcon name={item.icon} active={getActiveState(item)} />
                </div>
                <span className="unified-label">{item.label}</span>
                {item.children && isExpanded && (
                  <span className={`nav-chevron ${expandedItems.includes(item.id) ? 'expanded' : ''}`}>
                    <IconFA name="chevron-down" size={10} />
                  </span>
                )}
              </button>
              
              {item.children && isExpanded && expandedItems.includes(item.id) && (
                <div className="unified-nav-children">
                  {item.children.map((child) => (
                    <button 
                      key={child.id} 
                      className={`unified-child-item ${child.id === 'load-data' && currentView === 'load-data' ? 'active' : ''}`}
                      onClick={() => handleChildClick(child)}
                    >
                      <span className="unified-label">{child.label}</span>
                      {child.badge && <span className="nav-badge">{child.badge}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
      
      <div className="unified-sidebar-bottom">
        <div className="unified-user" title={!isExpanded ? "Syed Kabeer Andrabi" : undefined}>
          <div className="unified-user-avatar">SA</div>
          <div className="unified-user-info">
            <span className="unified-user-name">Syed Kabeer Andrabi</span>
            <span className="unified-user-org">S2DB DPS - CLAUDE AI EVALU...</span>
          </div>
          {isExpanded && (
            <button className="unified-user-menu">
              <IconFA name="chevron-down" size={12} />
            </button>
          )}
        </div>
        <button 
          className="unified-toggle-btn" 
          onClick={onToggleExpand}
          title={!isExpanded ? "Expand" : undefined}
        >
          <SidebarIcon name="sidebar" />
          <span className="unified-label">{isExpanded ? 'Collapse' : ''}</span>
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
          <div className="ai-migration-image">
            <img src="/images/data-migration-banner.png" alt="Data Migration Illustration" />
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

const INITIAL_NOTIFICATIONS = [
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

function Header({ onLogoClick, onAskAura, onNotificationClick, notifications = [], onMarkAsRead, onMarkAllAsRead }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationsRef = useRef(null)
  const unreadCount = notifications.filter(n => n.unread).length

  const handleNotificationClick = (notification) => {
    // Mark as read when clicked
    if (notification.unread && onMarkAsRead) {
      onMarkAsRead(notification.id)
    }
    setNotificationsOpen(false)
    if (onNotificationClick) {
      onNotificationClick(notification)
    }
  }

  const handleMarkAllAsRead = () => {
    if (onMarkAllAsRead) {
      onMarkAllAsRead()
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
                <button className="notifications-mark-read" onClick={handleMarkAllAsRead}>Mark all as read</button>
              </div>
              <div className="notifications-list">
                {notifications.map(notification => (
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

const WORKSPACES_DATA = [
  {
    id: 0,
    name: 'prod-analytics',
    group: 'Group 1',
    environment: 'Prod',
    project: 'Acme',
    edition: 'Standard',
    cloudRegion: 'AWS • US East',
    size: 'S-2',
    sizeDetail: '2x 4x',
    vCPU: 45.2,
    memory: 88,
    cache: 52.3,
    attachedDBs: { rw: 4, ro: 2 },
    status: 'active'
  },
  {
    id: 1,
    name: 'Workspace-2',
    group: 'Group 1',
    environment: 'Prod',
    project: 'Acme',
    edition: 'Standard',
    cloudRegion: 'AWS • US East',
    size: 'S-2',
    sizeDetail: '2x 4x',
    vCPU: 33.54,
    memory: 33.54,
    cache: 33.54,
    attachedDBs: { rw: 4, ro: 2 },
    status: 'active'
  },
  {
    id: 2,
    name: 'Workspace-1',
    group: 'Group 1',
    environment: 'Non-Prod',
    project: 'Acme',
    edition: 'Shared',
    cloudRegion: 'AWS • US East',
    size: 'S-2',
    sizeDetail: '2x 4x',
    vCPU: null,
    memory: null,
    cache: null,
    attachedDBs: { rw: 4, ro: 2 },
    status: 'suspended'
  },
  {
    id: 3,
    name: 'Workspace-1',
    group: 'Group 1',
    environment: 'Non-Prod',
    project: 'Kixo',
    edition: 'Standard',
    cloudRegion: 'AWS • US East',
    size: 'S-2',
    sizeDetail: '2x 4x',
    vCPU: null,
    memory: null,
    cache: null,
    attachedDBs: { rw: 4, ro: 2 },
    status: 'suspended'
  },
  {
    id: 4,
    name: 'Workspace-2',
    group: 'Group 1',
    environment: 'Prod',
    project: 'Kixo',
    edition: 'Enterprise',
    cloudRegion: 'GCP • US East',
    size: 'S-2',
    sizeDetail: '2x 4x',
    vCPU: 33.54,
    memory: 33.54,
    cache: 33.54,
    attachedDBs: { rw: 4, ro: 2 },
    status: 'active'
  },
  {
    id: 5,
    name: 'Workspace-2',
    group: 'Group 1',
    environment: 'Prod',
    project: 'Acme',
    edition: 'Standard',
    cloudRegion: 'AWS • US East',
    size: 'S-2',
    sizeDetail: '2x 4x',
    vCPU: 33.54,
    memory: 33.54,
    cache: 33.54,
    attachedDBs: { rw: 4, ro: 2 },
    status: 'active'
  }
]

function WorkspaceIconActive() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M31.15 15.7991C30.95 12.9509 28.55 10.6429 25.6 10.6429C25.2 10.6429 24.8 10.692 24.45 10.7902C22.85 8.82589 20.4 7.5 17.6 7.5C13.35 7.5 9.8 10.4464 8.95 14.375C5.95 15.6027 4 18.4509 4 21.6429C4 26.0134 7.55 29.5 12 29.5H28.8C32.75 29.5 36 26.3571 36 22.4286C36 19.433 34 16.7812 31.15 15.7991ZM28.8 27.1429H12C8.9 27.1429 6.4 24.6875 6.4 21.6429C6.4 18.8929 8.45 16.5848 11.2 16.2411V16.1429C11.2 12.7054 14.05 9.85714 17.6 9.85714C20.25 9.85714 22.55 11.4777 23.5 13.7857C24.05 13.2946 24.8 13 25.6 13C27.35 13 28.8 14.4241 28.8 16.1429C28.8 16.7321 28.6 17.2723 28.35 17.7634C28.5 17.7634 28.65 17.7143 28.8 17.7143C31.45 17.7143 33.6 19.8259 33.6 22.4286C33.6 25.0312 31.45 27.1429 28.8 27.1429Z" fill="#4C4A57"/>
      <path d="M30 16C34.6632 16 38.5 19.8368 38.5 24.5C38.5 29.1968 34.6619 33 30 33C25.3045 33 21.5 29.1955 21.5 24.5C21.5 19.8381 25.3032 16 30 16ZM33.9023 21.7246L29.0635 26.5635L28.7119 26.9141L28.3584 26.5654L26.0684 24.3076L26.0645 24.3037L26.0557 24.3125L25.3252 25.0098C25.3237 25.014 25.3223 25.022 25.3223 25.0322C25.3223 25.0426 25.3246 25.0506 25.3262 25.0547L28.6709 28.3994C28.675 28.401 28.6829 28.4033 28.6934 28.4033C28.7037 28.4033 28.7117 28.401 28.7158 28.3994L34.6416 22.4727C34.6431 22.4683 34.6455 22.4606 34.6455 22.4512C34.6455 22.4413 34.6431 22.4339 34.6416 22.4297L33.9121 21.7324L33.9023 21.7227V21.7246Z" fill="#00873F" stroke="white"/>
    </svg>
  )
}

function WorkspaceIconSuspended() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M31.15 15.6763C30.95 12.6987 28.55 10.2857 25.6 10.2857C25.2 10.2857 24.8 10.3371 24.45 10.4397C22.85 8.38616 20.4 7 17.6 7C13.35 7 9.8 10.0804 8.95 14.1875C5.95 15.471 4 18.4487 4 21.7857C4 26.3549 7.55 30 12 30H28.8C32.75 30 36 26.7143 36 22.6071C36 19.4754 34 16.7031 31.15 15.6763ZM28.8 27.5357H12C8.9 27.5357 6.4 24.9688 6.4 21.7857C6.4 18.9107 8.45 16.4978 11.2 16.1384V16.0357C11.2 12.442 14.05 9.46429 17.6 9.46429C20.25 9.46429 22.55 11.1585 23.5 13.5714C24.05 13.058 24.8 12.75 25.6 12.75C27.35 12.75 28.8 14.2388 28.8 16.0357C28.8 16.6518 28.6 17.2165 28.35 17.7299C28.5 17.7299 28.65 17.6786 28.8 17.6786C31.45 17.6786 33.6 19.8862 33.6 22.6071C33.6 25.3281 31.45 27.5357 28.8 27.5357Z" fill="#4C4A57"/>
      <path d="M30 15.5C34.6955 15.5 38.5 19.3045 38.5 24C38.5 28.6955 34.6955 32.5 30 32.5C25.3045 32.5 21.5 28.6955 21.5 24C21.5 19.3045 25.3045 15.5 30 15.5ZM27.4131 21.4102C27.408 21.4155 27.405 21.4218 27.4033 21.4258V26.5811C27.4034 26.5874 27.4048 26.5906 27.4053 26.5918C27.4058 26.593 27.4061 26.5936 27.4062 26.5938C27.4064 26.5939 27.407 26.5942 27.4082 26.5947C27.4094 26.5952 27.4126 26.5966 27.4189 26.5967H28.9619C28.9658 26.595 28.9714 26.5918 28.9766 26.5869C28.9808 26.5829 28.9825 26.5788 28.9834 26.5771V21.4365C28.9826 21.4352 28.9816 21.4333 28.9805 21.4316C28.9774 21.4273 28.9733 21.4225 28.9688 21.418C28.9642 21.4134 28.9594 21.4093 28.9551 21.4062C28.9536 21.4052 28.9524 21.4041 28.9512 21.4033H27.4229C27.4212 21.4042 27.4173 21.4058 27.4131 21.4102ZM31.0264 21.4102C31.0213 21.4155 31.0183 21.4218 31.0166 21.4258V26.5811C31.0166 26.5871 31.0171 26.5904 31.0176 26.5918L31.0186 26.5938C31.0187 26.5939 31.0195 26.5943 31.0205 26.5947C31.0214 26.5951 31.025 26.5967 31.0322 26.5967H32.5742C32.5782 26.595 32.5845 26.592 32.5898 26.5869C32.5942 26.5827 32.5958 26.5788 32.5967 26.5771V21.4365C32.5959 21.4352 32.595 21.4334 32.5938 21.4316C32.5906 21.4273 32.5867 21.4226 32.582 21.418C32.5774 21.4133 32.5727 21.4094 32.5684 21.4062C32.5666 21.405 32.5648 21.4041 32.5635 21.4033H31.0352C31.0334 21.4043 31.0301 21.4063 31.0264 21.4102Z" fill="#777582" stroke="white"/>
    </svg>
  )
}

function WorkspacesView() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="workspaces-view">
      <div className="workspaces-header">
        <h1>Workspaces</h1>
        <div className="workspaces-header-actions">
          <button className="workspaces-btn-secondary">Manage Projects</button>
          <button className="workspaces-btn-primary">
            <PlusIcon />
            <span>Create Workspace</span>
          </button>
        </div>
      </div>

      <div className="workspaces-filters">
        <div className="workspaces-search">
          <IconFA name="search" size={14} />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="workspaces-filter-btn">
          <IconFA name="folder" size={14} />
          <span className="filter-value">All</span>
          <IconFA name="chevron-down" size={10} />
        </button>
        <div className="workspaces-filter-divider" />
        <button className="workspaces-filter-btn">
          <span className="filter-label">Status:</span>
          <span className="filter-value">All</span>
          <IconFA name="chevron-down" size={10} />
        </button>
        <button className="workspaces-filter-btn">
          <span className="filter-label">Cloud:</span>
          <span className="filter-value">All</span>
          <IconFA name="chevron-down" size={10} />
        </button>
        <button className="workspaces-filter-btn">
          <span className="filter-label">Region:</span>
          <span className="filter-value">All</span>
          <IconFA name="chevron-down" size={10} />
        </button>
      </div>

      <div className="workspaces-table-container">
        <table className="workspaces-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Project</th>
              <th>Cloud & Region</th>
              <th>Size</th>
              <th>vCPU</th>
              <th>Memory</th>
              <th>Cache</th>
              <th>Attached DBs</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {WORKSPACES_DATA.map((workspace) => (
              <tr key={workspace.id}>
                <td>
                  <div className="workspace-name-cell">
                    <div className="workspace-icon">
                      {workspace.status === 'active' ? <WorkspaceIconActive /> : <WorkspaceIconSuspended />}
                    </div>
                    <div className="workspace-name-info">
                      <span className="workspace-name">{workspace.name}</span>
                      <div className="workspace-meta">
                        <span className="workspace-group">{workspace.group}</span>
                        <span className={`workspace-env-badge ${workspace.environment === 'Prod' ? 'prod' : 'non-prod'}`}>
                          {workspace.environment}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="workspace-project">
                    <span className="project-name">{workspace.project}</span>
                    <span className={`workspace-edition ${workspace.edition.toLowerCase()}`}>
                      {workspace.edition}
                    </span>
                  </div>
                </td>
                <td className="workspace-cloud-region">{workspace.cloudRegion}</td>
                <td>{workspace.size}</td>
                <td>
                  {workspace.status === 'suspended' ? (
                    <span className="workspace-suspended">Suspended</span>
                  ) : (
                    <div className="workspace-metric">
                      <span>{workspace.vCPU}%</span>
                      <div className="metric-bar">
                        <div className="metric-bar-fill" style={{ width: `${workspace.vCPU}%` }} />
                      </div>
                    </div>
                  )}
                </td>
                <td>
                  {workspace.status === 'suspended' ? (
                    <span className="workspace-suspended">Suspended</span>
                  ) : (
                    <div className="workspace-metric">
                      <span>{workspace.memory}%</span>
                      <div className="metric-bar">
                        <div className="metric-bar-fill" style={{ width: `${workspace.memory}%` }} />
                      </div>
                    </div>
                  )}
                </td>
                <td>
                  {workspace.status === 'suspended' ? (
                    <span className="workspace-suspended">Suspended</span>
                  ) : (
                    <div className="workspace-metric">
                      <span>{workspace.cache}%</span>
                      <div className="metric-bar">
                        <div className="metric-bar-fill" style={{ width: `${workspace.cache}%` }} />
                      </div>
                    </div>
                  )}
                </td>
                <td>
                  <div className="workspace-dbs">
                    <span className="db-rw">{workspace.attachedDBs.rw} RW</span>
                    <span className="db-ro">{workspace.attachedDBs.ro} RO</span>
                  </div>
                </td>
                <td>
                  <button className="workspace-action-btn secondary">
                    {workspace.status === 'suspended' ? 'Resume' : 'Connect'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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
  // All home page conversations use Aura Agent (CPU spike, workspace capacity, etc.)
  const agentName = 'Aura Agent'
  
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

function AnimatedResizeProgress({ resizeProgress }) {
  const [progress, setProgress] = useState(0)
  const [timeLeft, setTimeLeft] = useState(resizeProgress.duration)
  const duration = resizeProgress.duration * 1000
  
  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const newProgress = Math.min((elapsed / duration) * 100, 100)
      const newTimeLeft = Math.max(Math.ceil((duration - elapsed) / 1000), 0)
      
      setProgress(newProgress)
      setTimeLeft(newTimeLeft)
      
      if (elapsed >= duration) {
        clearInterval(interval)
      }
    }, 50)
    
    return () => clearInterval(interval)
  }, [duration])
  
  return (
    <div className="resize-progress-card fade-in">
      <div className="resize-progress-header">
            <div className="resize-progress-title">
              <AiLogoMinimal size={18} />
              <span>{resizeProgress.text}</span>
            </div>
        <button className="resize-progress-cancel">Cancel</button>
      </div>
      <div className="resize-progress-divider" />
      <div className="resize-progress-content">
        <div className="resize-workspace-icon">
          <CloudIconCustom size={40} />
          <div className="resize-spinner-overlay">
            <PurpleSpinner size={16} />
          </div>
        </div>
        <div className="resize-workspace-info">
          <span className="resize-workspace-name">{resizeProgress.workspace}</span>
          <div className="resize-workspace-meta">
            <span className="resize-workspace-group">{resizeProgress.group}</span>
            <span className="resize-workspace-env">{resizeProgress.env}</span>
          </div>
        </div>
        <div className="resize-progress-bar-section">
          <div className="resize-progress-bar">
            <div className="resize-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="resize-progress-stats">
            <span className="resize-progress-percent">{Math.round(progress)}%</span>
            <span className="resize-progress-dot" />
            <span className="resize-progress-time">~ {timeLeft}s</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Message({ message, onAction, expandedQueries, setExpandedQueries, expandedOptions, setExpandedOptions, isTyping, onTypingComplete, agentName = 'Aura Agent', compact = false, onAdvanceSilently }) {
  // Only treat text as items if it's an array (not a string)
  const textItems = message.type === 'agent' && Array.isArray(message.content?.text) ? message.content.text : []
  // Initialize paragraphsCompleted to true if there are no text items (e.g., progress-only messages, or text is a string)
  const [currentParagraph, setCurrentParagraph] = useState(0)
  const [paragraphsCompleted, setParagraphsCompleted] = useState(textItems.length === 0)
  const [showConnections, setShowConnections] = useState(false)

  useEffect(() => {
    if (!isTyping || textItems.length === 0) {
      setCurrentParagraph(textItems.length)
      setParagraphsCompleted(true)
    }
  }, [isTyping, textItems.length])

  // For messages without text array, call onTypingComplete after appropriate delay
  useEffect(() => {
    if (isTyping && textItems.length === 0) {
      let delay = 500 // default short delay for non-progress messages
      
      if (message.content?.progress) {
        // Calculate delay based on steps for progress messages
        const steps = message.content?.steps || []
        delay = steps.length > 0 
          ? 800 + (steps.length * 700) + 400 + 500  // initial + steps + completion + buffer
          : 2500 + 500  // default delay + buffer
      }
      
      const timer = setTimeout(() => {
        onTypingComplete?.()
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [isTyping, textItems.length, message.content?.progress, message.content?.steps, onTypingComplete])

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
        {content.text && Array.isArray(content.text) && content.text.map((t, i) => renderTextContent(t, i))}

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

        {content.progress && (
          <AnimatedProgressCard content={content} />
        )}

        {content.resizeProgress && (!isTyping || paragraphsCompleted) && (
          <AnimatedResizeProgress resizeProgress={content.resizeProgress} />
        )}

        {content.success && (!isTyping || paragraphsCompleted) && (
          <div className="fade-in">
            <div className="success-header">
              <CheckIcon />
              <span>{content.title}</span>
            </div>
            {content.text && typeof content.text === 'string' && (
              <p className="message-text">{content.text}</p>
            )}
            {content.details && content.details.map((d, i) => (
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

        {/* Migration-specific content types */}
        {content.footerText && (!isTyping || paragraphsCompleted) && (
          <p className="message-text fade-in"><strong>{content.footerText}</strong></p>
        )}

        {content.whyCard && (!isTyping || paragraphsCompleted) && (
          <div className="aura-why-card fade-in">
            <div className="aura-why-card-title">{content.whyCard.title}</div>
            <ul className="aura-why-card-list">
              {content.whyCard.items.map((item, i) => (
                <li key={i}>{item.prefix}<strong>{item.bold}</strong>{item.suffix}</li>
              ))}
            </ul>
          </div>
        )}

        {content.flowInstanceSelector && (!isTyping || paragraphsCompleted) && (
          <div className="aura-flow-instance-selector fade-in">
            <div className="aura-flow-instance-label">{content.flowInstanceSelector.label}</div>
            <div className="aura-flow-instance-options">
              {content.flowInstanceSelector.options.map((opt) => (
                <button
                  key={opt.id}
                  className={`aura-flow-instance-btn ${opt.recommended ? 'recommended' : ''}`}
                  onClick={() => onAction(opt.label)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {content.provisionedResourcesGreen && (!isTyping || paragraphsCompleted) && (
          <div className="aura-provisioned-resources-green fade-in">
            <div className="aura-provisioned-resources-green-title">{content.provisionedResourcesGreen.title}</div>
            <div className="aura-provisioned-resources-green-stats">
              {content.provisionedResourcesGreen.stats.map((stat, i) => (
                <div key={i} className="aura-provisioned-stat-row">
                  <span className="aura-provisioned-stat-label">{stat.label}</span>
                  <span className="aura-provisioned-stat-value">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {content.cdcSelector && (!isTyping || paragraphsCompleted) && (
          <div className="fade-in">
            <p className="message-text"><strong>{content.cdcSelector.question}</strong></p>
            <div className="aura-cdc-selector">
              <div className="aura-cdc-selector-label">{content.cdcSelector.label}</div>
              <div className="aura-cdc-selector-options">
                {content.cdcSelector.options.map((opt) => (
                  <button
                    key={opt}
                    className="aura-cdc-selector-btn"
                    onClick={() => onAction(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {content.steps && !content.progress && (!isTyping || paragraphsCompleted) && (
          <div className="aura-steps-list fade-in">
            {content.steps.map((step, i) => (
              <div key={i} className="aura-step-item">{step}</div>
            ))}
          </div>
        )}

        {content.connectionSelect && (!isTyping || paragraphsCompleted) && (
          <div className="aura-connection-select fade-in">
            <div className="aura-connection-card selected">
              <div className="aura-connection-icon">
                <IconFA name="database" size={16} />
              </div>
              <div className="aura-connection-info">
                <span className="aura-connection-name">{content.connectionSelect.name}</span>
                <span className="aura-connection-db">{content.connectionSelect.db} · {content.connectionSelect.tables}</span>
                <span className="aura-connection-url">{content.connectionSelect.url}</span>
              </div>
            </div>
          </div>
        )}

        {content.connections && showConnections && (!isTyping || paragraphsCompleted) && (
          <div className="aura-connections-list fade-in">
            {content.connections.map((conn, i) => (
              <div 
                key={i} 
                className="aura-connection-card aura-connection-card-clickable"
                onClick={() => onAction(`Connect to ${conn.name}`)}
              >
                <div className="aura-connection-icon">
                  <IconFA name="database" size={16} />
                </div>
                <div className="aura-connection-info">
                  <span className="aura-connection-name">{conn.name}</span>
                  <span className="aura-connection-db">{conn.db} • {conn.tables}</span>
                  <span className="aura-connection-url">{conn.url}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {content.dbProfile && (!isTyping || paragraphsCompleted) && (
          <div className="aura-info-card aura-db-profile fade-in">
            <div className="aura-info-card-header">{content.dbProfile.title}</div>
            <div className="aura-info-card-stats">
              {content.dbProfile.stats.map((stat, i) => (
                <div key={i} className="aura-info-stat">
                  <span className="aura-info-stat-label">{stat.label}</span>
                  <span className="aura-info-stat-value">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {content.migrationConsiderations && (!isTyping || paragraphsCompleted) && (
          <div className="aura-migration-considerations fade-in">
            <p className="message-text">{content.migrationConsiderations.intro}</p>
            <div className="aura-considerations-list">
              {content.migrationConsiderations.warnings.map((warning, i) => (
                <div key={i} className="aura-consideration-item">
                  <span className="aura-consideration-icon">⚠️</span>
                  <div className="aura-consideration-content">
                    <span className="aura-consideration-type">{warning.type}:</span>
                    <span className="aura-consideration-text">{warning.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {content.transformationSummary && (!isTyping || paragraphsCompleted) && (
          <div className="aura-info-card aura-transformation-summary fade-in">
            <div className="aura-info-card-header">{content.transformationSummary.title}</div>
            <div className="aura-info-card-stats">
              {content.transformationSummary.stats.map((stat, i) => (
                <div key={i} className="aura-info-stat">
                  <span className="aura-info-stat-label">{stat.label}</span>
                  <span className={`aura-info-stat-value ${stat.highlight ? 'highlight' : ''}`}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {content.actionRequired && (!isTyping || paragraphsCompleted) && (
          <div className="aura-action-required fade-in">
            <span className="aura-action-required-icon">⚠️</span>
            <div className="aura-action-required-content">
              <span className="aura-action-required-label">Action Required:</span>
              <span className="aura-action-required-text">{content.actionRequired.text}</span>
            </div>
          </div>
        )}

        {content.interactiveManualReview && (!isTyping || paragraphsCompleted) && (
          <div className="fade-in">
            <InteractiveManualReview
              items={content.interactiveManualReview.items}
              onAllApproved={onAdvanceSilently}
            />
          </div>
        )}

        {content.manualReview && (!isTyping || paragraphsCompleted) && (
          <div className="aura-manual-review fade-in">
            <div className="aura-manual-review-header">
              <div className="aura-manual-review-title">
                <IconFA name="circle-info" size={14} />
                <span>Manual Review Required</span>
              </div>
              <span className="aura-manual-review-count">{content.manualReview.count}</span>
            </div>
            <div className="aura-manual-review-list">
              {content.manualReview.items.map((item, i) => (
                <div key={i} className="aura-manual-review-item">
                  <IconFA name="chevron-right" size={12} />
                  <div className="aura-review-check">
                    <IconFA name="check" size={10} />
                  </div>
                  <div className="aura-review-item-info">
                    <span className="aura-review-item-name">{item.name}</span>
                    <span className="aura-review-item-reason">{item.reason}</span>
                  </div>
                  <span className="aura-review-item-status">{item.status}</span>
                </div>
              ))}
            </div>
            {content.manualReview.allApproved && (
              <div className="aura-manual-review-footer">
                <IconFA name="check" size={14} />
                <span>All tables reviewed and approved</span>
              </div>
            )}
          </div>
        )}

        {content.migrationPlan && (!isTyping || paragraphsCompleted) && (
          <div className="aura-migration-plan fade-in">
            <div className="aura-migration-plan-header">{content.migrationPlan.title}</div>
            <div className="aura-migration-plan-items">
              {content.migrationPlan.items.map((item, i) => (
                <div key={i} className="aura-migration-plan-item">{item}</div>
              ))}
            </div>
          </div>
        )}

        {content.codePreview && (!isTyping || paragraphsCompleted) && (
          <div className="aura-code-preview fade-in">
            <div className="aura-code-preview-header">
              <span>{content.codePreview.title}</span>
              <span className="aura-code-preview-lang">{content.codePreview.language}</span>
            </div>
            <pre className="aura-code-preview-code">
              <code>{content.codePreview.code}</code>
            </pre>
          </div>
        )}

        {content.provisionedResources && (!isTyping || paragraphsCompleted) && (
          <div className="aura-info-card fade-in">
            <div className="aura-info-card-header">{content.provisionedResources.title}</div>
            <div className="aura-info-card-stats">
              {content.provisionedResources.stats.map((stat, i) => (
                <div key={i} className="aura-info-stat">
                  <span className="aura-info-stat-label">{stat.label}</span>
                  <span className="aura-info-stat-value">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {content.warnings && (!isTyping || paragraphsCompleted) && (
          <div className="aura-warnings fade-in">
            {content.warnings.map((warning, i) => (
              <div key={i} className="aura-warning-item">
                <span className="aura-warning-icon">{warning.icon}</span>
                <span className="aura-warning-text">{warning.text}</span>
              </div>
            ))}
          </div>
        )}

        {content.interactiveTableSelection && (!isTyping || paragraphsCompleted) && (
          <div className="fade-in">
            <InteractiveTableSelector 
              tables={content.interactiveTableSelection.tables}
              totalTables={content.interactiveTableSelection.totalTables}
              onConfirm={onAction}
            />
          </div>
        )}

        {content.warningCard && (!isTyping || paragraphsCompleted) && (
          <div className="aura-warning-card fade-in">
            <span className="aura-warning-card-icon">{content.warningCard.icon}</span>
            <div className="aura-warning-card-content">
              <span className="aura-warning-card-title">{content.warningCard.title}</span>
              <span className="aura-warning-card-text">{content.warningCard.text}</span>
            </div>
          </div>
        )}

        {content.migrationStats && (!isTyping || paragraphsCompleted) && (
          <div className="aura-migration-stats fade-in">
            {content.migrationStats.stats.map((stat, i) => (
              <div key={i} className={`aura-migration-stat ${stat.divider ? 'divider' : ''}`}>
                <span className="aura-migration-stat-label">{stat.label}</span>
                <span className={`aura-migration-stat-value ${stat.success ? 'success' : ''}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        )}

        {content.followUp && (!isTyping || paragraphsCompleted) && (
          <p className="message-text fade-in">{content.followUp}</p>
        )}

        {content.actions && !content.progress && (message.showContent !== false) && paragraphsCompleted && !(content.connections && showConnections) && (
          <div className="action-buttons fade-in">
            {content.actions.map((action, i) => {
              const isPrimary = typeof action === 'object' && action.primary
              const text = typeof action === 'string' ? action : action.text
              const handleClick = () => {
                if (text === 'Use existing connection') {
                  setShowConnections(true)
                }
                onAction(action)
              }
              return (
                <button key={i} className={`action-btn ${isPrimary ? 'primary' : ''}`} onClick={handleClick}>
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
    'folder': '\uf07b',
    'folders': '\uf660',
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
    'check-double': '\uf560',
    'spinner': '\uf110',
    'circle-info': '\uf05a',
    'user-plus': '\uf234',
    'bell': '\uf0f3',
    'magnifying-glass': '\uf002',
    'search': '\uf002',
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
    'play': '\uf04b',
    'table': '\uf0ce',
    'check-circle': '\uf058',
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

function NewChatIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.02344 3.77344L5.16797 7.62891L5.00391 8.99609L6.37109 8.83203L10.2266 4.97656L9.02344 3.77344ZM11.6211 5.44141L11.1562 5.90625L7 10.0625L4.83984 10.3359L3.5 10.5L3.66406 9.16016L3.9375 7L8.09375 2.84375L8.55859 2.37891L9.02344 1.91406L10.0078 0.929688L10.9375 0L11.8398 0.929688L13.0703 2.16016L14 3.0625L13.0703 3.99219L12.0859 4.97656L11.6211 5.44141ZM11.1562 4.07422L12.1406 3.0625L10.9375 1.85938L9.92578 2.84375L11.1562 4.07422ZM0.65625 1.75H5.46875H6.125V3.0625H5.46875H1.3125V12.6875H10.9375V8.53125V7.875H12.25V8.53125V13.3438V14H11.5938H0.65625H0V13.3438V2.40625V1.75H0.65625Z" fill="currentColor"/>
    </svg>
  )
}

function ArrowUpIcon() {
  return <IconFA name="arrow-up" size={9} />
}

function SpinnerIcon({ size = 18 }) {
  return <IconFA name="spinner" size={size} weight="solid" />
}

function AiLogoMinimal({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="ai-logo-spin">
      <path d="M0.262476 9.55256C0.226633 9.67599 0.19454 9.80025 0.16605 9.92519L0 9.96965L1.4061e-08 9.62316L0.262476 9.55256Z" fill="url(#paint0_linear_61_4090)"/>
      <path d="M12.8388 8.72297C12.8058 8.82086 12.7715 8.91862 12.7339 9.01519L12.4691 8.88738L12.8388 8.72297Z" fill="url(#paint1_linear_61_4090)"/>
      <path d="M13.0529 7.92606C13.0208 8.08495 12.9824 8.24273 12.9385 8.39937L12.3073 8.80926L11.9549 8.63896L13.0529 7.92606Z" fill="url(#paint2_linear_61_4090)"/>
      <path d="M13.1768 6.93041C13.169 7.09321 13.1557 7.2558 13.1359 7.41778L11.8405 8.58405L11.515 8.42682L13.1768 6.93041Z" fill="url(#paint3_linear_61_4090)"/>
      <path d="M0.879279 8.12185C0.811782 8.23904 0.748787 8.35819 0.689041 8.47847L5.75838e-08 8.55071L7.12336e-08 8.21436L0.879279 8.12185Z" fill="url(#paint4_linear_61_4090)"/>
      <path d="M6.54621 0.0213755C6.66948 0.0205195 6.79276 0.0228802 6.9159 0.0288935L9.72338 6.33388L8.07694 0.189713C8.20174 0.218424 8.32596 0.250414 8.44925 0.286467L10.065 6.3159L9.47268 0.681652C9.5929 0.740021 9.71174 0.802186 9.82896 0.868294L10.4324 6.60943L10.7024 1.45829C10.8114 1.54544 10.9184 1.63648 11.023 1.73156L10.7445 7.05037L11.7183 2.46832C11.8119 2.5838 11.901 2.70157 11.9856 2.82167L11.0776 7.09385L12.4351 3.55712C12.5065 3.69359 12.5733 3.83179 12.6345 3.97192L11.1923 7.72896L12.9149 4.74529C12.9601 4.89881 12.9995 5.05362 13.0333 5.20945L11.4578 7.93881L13.1408 5.85992C13.1593 6.02142 13.1718 6.18339 13.1784 6.34564L11.4993 8.4193L10.2411 7.81198L9.01996 5.2843C8.96797 5.26375 8.91545 5.24464 8.86306 5.22546L6.54621 0.0213755Z" fill="url(#paint5_linear_61_4090)"/>
      <path d="M1.79844 6.88759C1.6999 6.99185 1.60604 7.09903 1.51569 7.20793L1.153e-07 7.1285L1.28897e-07 6.79346L1.79844 6.88759Z" fill="url(#paint6_linear_61_4090)"/>
      <path d="M2.95915 5.91222C2.83354 5.99531 2.71038 6.08339 2.58946 6.176L0.0722383 5.64059C0.0885773 5.53029 0.107506 5.42029 0.12944 5.31078L2.95915 5.91222Z" fill="url(#paint7_linear_61_4090)"/>
      <path d="M4.2578 5.24834C4.10741 5.30513 3.95869 5.36747 3.81195 5.43564L0.473634 4.15431C0.515088 4.05093 0.559113 3.94832 0.606016 3.84673L4.2578 5.24834Z" fill="url(#paint8_linear_61_4090)"/>
      <path d="M8.55679 5.12086C8.39706 5.07117 8.23573 5.02805 8.07335 4.99077L4.97626 0.221419C5.09175 0.192347 5.20776 0.166033 5.32438 0.143298L8.55679 5.12086Z" fill="url(#paint9_linear_61_4090)"/>
      <path d="M5.51298 4.91102C5.34725 4.93833 5.1824 4.97202 5.01875 5.01202L1.20582 2.81055C1.2704 2.71928 1.3374 2.62917 1.40717 2.54056L5.51298 4.91102Z" fill="url(#paint10_linear_61_4090)"/>
      <path d="M7.68437 4.91396C7.51523 4.88568 7.3453 4.86331 7.17478 4.84826L3.51319 0.781674C3.616 0.727365 3.72007 0.676213 3.82503 0.627718L7.68437 4.91396Z" fill="url(#paint11_linear_61_4090)"/>
      <path d="M6.69755 4.82341C6.52545 4.82065 6.35329 4.82521 6.18143 4.83583L2.25017 1.65245C2.33612 1.57709 2.42348 1.50425 2.51232 1.4341L6.69755 4.82341Z" fill="url(#paint12_linear_61_4090)"/>
      <path d="M8.68361 0.335695C8.4084 0.244429 8.1284 0.171695 7.84551 0.117673L7.81413 0L8.59372 6.5714e-08L8.68361 0.335695Z" fill="url(#paint13_linear_61_4090)"/>
      <path d="M17.9732 6.31969C17.9846 6.59712 17.9787 6.87509 17.9553 7.1519L14.1783 8.83365L17.8595 7.84715C17.8049 8.13033 17.7311 8.41048 17.6392 8.6859L14.3051 9.57924L17.4208 9.25171C17.3 9.52614 17.1596 9.79401 16.9995 10.0532L14.0564 10.3627L16.6968 10.501C16.5112 10.7526 16.3053 10.9938 16.0794 11.2227L13.5929 11.0926L15.7342 11.5476C15.4805 11.7706 15.214 11.9707 14.9369 12.1481L13.4631 11.835L14.6836 12.3034C14.3806 12.4785 14.0662 12.6266 13.7445 12.7495L12.6779 12.3403L13.5249 12.829C13.1821 12.9462 12.8319 13.0349 12.4776 13.0941L12.2586 12.9679L12.4253 13.1026C11.274 13.2852 10.0837 13.1625 8.98498 12.7339L10.1882 10.2411L12.7159 9.01996C13.1119 8.01791 13.2524 6.93824 13.1385 5.88071L16.2055 2.09295C16.3824 2.28216 16.5461 2.47915 16.6965 2.68294L13.652 6.44292L17.1145 3.32524C17.2448 3.55343 17.3605 3.78765 17.4614 4.02671L13.8517 7.27677L17.7215 4.7638C17.7958 5.02217 17.854 5.28418 17.8961 5.54828L13.9508 8.11061L17.9732 6.31969Z" fill="url(#paint14_linear_61_4090)"/>
      <path d="M10.1029 1.01558C9.84344 0.851974 9.57526 0.707952 9.30008 0.583789L9.23896 1.20104e-07L9.99631 1.83944e-07L10.1029 1.01558Z" fill="url(#paint15_linear_61_4090)"/>
      <path d="M11.3116 1.99652C11.2901 1.97441 11.2691 1.95172 11.2472 1.92984C11.0385 1.72107 10.8192 1.52946 10.5912 1.35487L10.6621 2.4007e-07L11.328 2.96195e-07C11.3574 -0.000262099 11.3868 0.000852735 11.4162 0.000980912L11.3116 1.99652Z" fill="url(#paint16_linear_61_4090)"/>
      <path d="M12.2478 3.21345C12.0745 2.92346 11.8769 2.64417 11.6552 2.37798L12.151 0.0447815C12.4003 0.0736603 12.6484 0.116298 12.8937 0.173568L12.2478 3.21345Z" fill="url(#paint17_linear_61_4090)"/>
      <path d="M12.8587 4.5631C12.7477 4.21866 12.6078 3.88164 12.4387 3.55569L13.6504 0.399108C13.8854 0.484748 14.1164 0.584284 14.3424 0.69754L12.8587 4.5631Z" fill="url(#paint18_linear_61_4090)"/>
      <path d="M13.1352 5.85129C13.0929 5.47426 13.0182 5.10032 12.911 4.73372L15.0164 1.08684C15.2254 1.22493 15.4281 1.37643 15.6237 1.54086L13.1352 5.85129Z" fill="url(#paint19_linear_61_4090)"/>
      <path d="M17.7376 8.44749C17.7734 8.32406 17.8055 8.19979 17.834 8.07486L18.0001 8.03041V8.37689L17.7376 8.44749Z" fill="url(#paint20_linear_61_4090)"/>
      <path d="M5.16129 9.27708C5.19425 9.17918 5.22854 9.08144 5.26622 8.98486L5.53066 9.11267L5.16129 9.27708Z" fill="url(#paint21_linear_61_4090)"/>
      <path d="M4.94719 10.074C4.9793 9.91513 5.01738 9.75729 5.06127 9.60068L5.69278 9.19079L6.04515 9.36109L4.94719 10.074Z" fill="url(#paint22_linear_61_4090)"/>
      <path d="M4.82331 11.0696C4.8311 10.9068 4.84438 10.7442 4.86417 10.5823L6.15955 9.416L6.48511 9.57323L4.82331 11.0696Z" fill="url(#paint23_linear_61_4090)"/>
      <path d="M17.1208 9.8782C17.1883 9.76101 17.2513 9.64186 17.311 9.52158L18.0001 9.44934V9.78569L17.1208 9.8782Z" fill="url(#paint24_linear_61_4090)"/>
      <path d="M11.4539 17.9787C11.3306 17.9795 11.2073 17.9772 11.0842 17.9712L8.27668 11.6662L9.92313 17.8103C9.79819 17.7816 9.6739 17.7494 9.55049 17.7133L7.93511 11.6841L8.52739 17.3181C8.40721 17.2597 8.28829 17.1978 8.17111 17.1318L7.56771 11.3906L7.29771 16.5418C7.18865 16.4546 7.08167 16.3636 6.97705 16.2685L7.25555 10.9497L6.2818 15.5317C6.18821 15.4163 6.09905 15.2985 6.01442 15.1784L6.92246 10.9062L5.56498 14.4429C5.49356 14.3065 5.42679 14.1683 5.36559 14.0281L6.80773 10.2711L5.08513 13.2548C5.03993 13.1012 5.00061 12.9464 4.96681 12.7906L6.54232 10.0612L4.85927 12.1398C4.84082 11.9784 4.82822 11.8165 4.82168 11.6544L6.5008 9.58074L7.75892 10.1881L8.98011 12.7157C9.0321 12.7363 9.08461 12.7554 9.137 12.7746L11.4539 17.9787Z" fill="url(#paint25_linear_61_4090)"/>
      <path d="M16.2016 11.1125C16.3002 11.0082 16.394 10.901 16.4844 10.7921L18.0001 10.8716V11.2066L16.2016 11.1125Z" fill="url(#paint26_linear_61_4090)"/>
      <path d="M15.0409 12.0878C15.1665 12.0047 15.2897 11.9167 15.4106 11.8241L17.9278 12.3595C17.9115 12.4698 17.8926 12.5798 17.8706 12.6893L15.0409 12.0878Z" fill="url(#paint27_linear_61_4090)"/>
      <path d="M13.7423 12.7517C13.8927 12.6949 14.0414 12.6326 14.1881 12.5644L17.5264 13.8457C17.485 13.9492 17.4406 14.0517 17.3937 14.1533L13.7423 12.7517Z" fill="url(#paint28_linear_61_4090)"/>
      <path d="M9.44328 12.8789C9.60301 12.9286 9.76433 12.9717 9.92672 13.009L13.0238 17.7786C12.9083 17.8077 12.7923 17.834 12.6757 17.8568L9.44328 12.8789Z" fill="url(#paint29_linear_61_4090)"/>
      <path d="M12.4871 13.089C12.6528 13.0617 12.8177 13.028 12.9813 12.988L16.7942 15.1895C16.7297 15.2808 16.6627 15.3709 16.5929 15.4595L12.4871 13.089Z" fill="url(#paint30_linear_61_4090)"/>
      <path d="M10.3157 13.0861C10.4848 13.1144 10.6548 13.1367 10.8253 13.1518L14.4869 17.2184C14.3841 17.2727 14.28 17.3238 14.175 17.3723L10.3157 13.0861Z" fill="url(#paint31_linear_61_4090)"/>
      <path d="M11.3022 13.1763C11.4744 13.1791 11.6467 13.1748 11.8186 13.1642L15.7499 16.3476C15.6639 16.423 15.5766 16.4958 15.4878 16.5659L11.3022 13.1763Z" fill="url(#paint32_linear_61_4090)"/>
      <path d="M9.31645 17.6643C9.59166 17.7556 9.87166 17.8283 10.1545 17.8823L10.1859 18H9.40634L9.31645 17.6643Z" fill="url(#paint33_linear_61_4090)"/>
      <path d="M0.0268234 11.6803C0.0154176 11.4029 0.021365 11.1249 0.0448013 10.8481L3.82178 9.16635L0.140574 10.1528C0.19519 9.86967 0.268927 9.58951 0.360884 9.3141L3.69397 8.42109L0.579233 8.74861C0.700118 8.47404 0.840728 8.20612 1.00089 7.9468L3.9437 7.63726L1.30325 7.49899C1.48886 7.24741 1.69479 7.00621 1.92071 6.77727L4.4072 6.90736L2.26588 6.45236C2.51955 6.22942 2.78607 6.02927 3.06311 5.8519L4.53697 6.16504L3.31644 5.69664C3.61957 5.52142 3.93408 5.37343 4.25586 5.25046L5.32276 5.6597L4.47552 5.17103C4.81816 5.05389 5.16821 4.96505 5.52248 4.90594L5.74148 5.03211L5.57478 4.89744C6.72602 4.71481 7.91635 4.83747 9.01508 5.26615L7.81187 7.75885L5.28419 8.98004C4.88812 9.98209 4.74767 11.0618 4.86155 12.1193L1.79453 15.9071C1.61764 15.7178 1.45367 15.5209 1.30325 15.3171L4.34869 11.5564L0.885509 14.6748C0.755216 14.4466 0.639532 14.2123 0.5387 13.9733L4.14832 10.7232L0.278513 13.2362C0.204211 12.9778 0.146084 12.7158 0.103964 12.4517L4.04928 9.88939L0.0268234 11.6803Z" fill="url(#paint34_linear_61_4090)"/>
      <path d="M7.89718 16.9844C8.15665 17.1481 8.42476 17.2924 8.69997 17.4165L8.7611 18H8.00374L7.89718 16.9844Z" fill="url(#paint35_linear_61_4090)"/>
      <path d="M6.68842 16.0035C6.70993 16.0256 6.73093 16.0483 6.75281 16.0702C6.96163 16.279 7.18075 16.4708 7.40884 16.6455L7.33791 18H6.67208C6.64267 18.0003 6.61323 17.9995 6.58382 17.9993L6.68842 16.0035Z" fill="url(#paint36_linear_61_4090)"/>
      <path d="M5.75227 14.7865C5.92551 15.0765 6.12314 15.3558 6.34488 15.622L5.84869 17.9555C5.59949 17.9267 5.3516 17.8837 5.10637 17.8264L5.75227 14.7865Z" fill="url(#paint37_linear_61_4090)"/>
      <path d="M5.14135 13.4369C5.25233 13.7813 5.39227 14.1184 5.56138 14.4443L4.34967 17.6009C4.11466 17.5152 3.88363 17.4157 3.65769 17.3025L5.14135 13.4369Z" fill="url(#paint38_linear_61_4090)"/>
      <path d="M4.86482 12.1487C4.90712 12.5257 4.98182 12.8997 5.08905 13.2663L2.98368 16.9132C2.77464 16.7751 2.57194 16.6236 2.37636 16.4591L4.86482 12.1487Z" fill="url(#paint39_linear_61_4090)"/>
      <defs>
        <linearGradient id="paint0_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint1_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint2_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint3_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint4_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint5_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint6_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint7_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint8_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint9_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint10_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint11_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint12_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint13_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint14_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint15_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint16_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint17_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint18_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint19_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint20_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint21_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint22_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint23_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint24_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint25_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint26_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint27_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint28_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint29_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint30_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint31_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint32_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint33_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint34_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint35_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint36_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint37_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint38_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
        <linearGradient id="paint39_linear_61_4090" x1="18.0746" y1="15.7093" x2="1.84094" y2="1.81866" gradientUnits="userSpaceOnUse">
          <stop offset="0.168269" stopColor="#F6645F"/>
          <stop offset="0.793269" stopColor="#B969FC"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

function CloudIconCustom({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M31.15 15.6763C30.95 12.6987 28.55 10.2857 25.6 10.2857C25.2 10.2857 24.8 10.3371 24.45 10.4397C22.85 8.38616 20.4 7 17.6 7C13.35 7 9.8 10.0804 8.95 14.1875C5.95 15.471 4 18.4487 4 21.7857C4 26.3549 7.55 30 12 30H28.8C32.75 30 36 26.7143 36 22.6071C36 19.4754 34 16.7031 31.15 15.6763ZM28.8 27.5357H12C8.9 27.5357 6.4 24.9688 6.4 21.7857C6.4 18.9107 8.45 16.4978 11.2 16.1384V16.0357C11.2 12.442 14.05 9.46429 17.6 9.46429C20.25 9.46429 22.55 11.1585 23.5 13.5714C24.05 13.058 24.8 12.75 25.6 12.75C27.35 12.75 28.8 14.2388 28.8 16.0357C28.8 16.6518 28.6 17.2165 28.35 17.7299C28.5 17.7299 28.65 17.6786 28.8 17.6786C31.45 17.6786 33.6 19.8862 33.6 22.6071C33.6 25.3281 31.45 27.5357 28.8 27.5357Z" fill="#4C4A57"/>
    </svg>
  )
}

function PurpleSpinner({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="purple-spinner">
      <path d="M8.65625 2.75V4.5C8.65625 4.67405 8.58711 4.84097 8.46404 4.96404C8.34097 5.08711 8.17405 5.15625 8 5.15625C7.82595 5.15625 7.65903 5.08711 7.53596 4.96404C7.41289 4.84097 7.34375 4.67405 7.34375 4.5V2.75C7.34375 2.57595 7.41289 2.40903 7.53596 2.28596C7.65903 2.16289 7.82595 2.09375 8 2.09375C8.17405 2.09375 8.34097 2.16289 8.46404 2.28596C8.58711 2.40903 8.65625 2.57595 8.65625 2.75ZM10.4746 6.18164C10.5609 6.18164 10.6463 6.16463 10.7259 6.13158C10.8056 6.09854 10.878 6.05024 10.9389 5.98914L12.1765 4.75164C12.2998 4.62833 12.369 4.46112 12.369 4.28674C12.369 4.11236 12.2998 3.94515 12.1765 3.82185C12.0532 3.69854 11.886 3.62931 11.7116 3.62931C11.5373 3.62931 11.3701 3.69854 11.2468 3.82185L10.0109 5.06109C9.91903 5.15278 9.85636 5.26977 9.83106 5.39709C9.80575 5.52441 9.81863 5.65641 9.86827 5.77634C9.9179 5.89628 10.002 5.99881 10.11 6.07095C10.2179 6.14309 10.3448 6.18164 10.4746 6.18164ZM13.25 7.34375H11.5C11.326 7.34375 11.159 7.41289 11.036 7.53596C10.9129 7.65903 10.8438 7.82595 10.8438 8C10.8438 8.17405 10.9129 8.34097 11.036 8.46404C11.159 8.58711 11.326 8.65625 11.5 8.65625H13.25C13.424 8.65625 13.591 8.58711 13.714 8.46404C13.8371 8.34097 13.9062 8.17405 13.9062 8C13.9062 7.82595 13.8371 7.65903 13.714 7.53596C13.591 7.41289 13.424 7.34375 13.25 7.34375ZM10.9389 10.0109C10.8779 9.94981 10.8054 9.9014 10.7256 9.86836C10.6459 9.83532 10.5604 9.81831 10.4741 9.81831C10.3877 9.81831 10.3022 9.83532 10.2225 9.86836C10.1427 9.9014 10.0703 9.94981 10.0092 10.0109C9.94815 10.0719 9.89975 10.1444 9.86671 10.2241C9.83367 10.3039 9.81665 10.3894 9.81665 10.4757C9.81665 10.562 9.83367 10.6475 9.86671 10.7273C9.89975 10.807 9.94815 10.8795 10.0092 10.9405L11.2468 12.1781C11.3701 12.3014 11.5373 12.3707 11.7116 12.3707C11.886 12.3707 12.0532 12.3014 12.1765 12.1781C12.2998 12.0548 12.369 11.8876 12.369 11.7133C12.369 11.5389 12.2998 11.3717 12.1765 11.2484L10.9389 10.0109ZM8 10.8438C7.82595 10.8438 7.65903 10.9129 7.53596 11.036C7.41289 11.159 7.34375 11.326 7.34375 11.5V13.25C7.34375 13.424 7.41289 13.591 7.53596 13.714C7.65903 13.8371 7.82595 13.9062 8 13.9062C8.17405 13.9062 8.34097 13.8371 8.46404 13.714C8.58711 13.591 8.65625 13.424 8.65625 13.25V11.5C8.65625 11.326 8.58711 11.159 8.46404 11.036C8.34097 10.9129 8.17405 10.8438 8 10.8438ZM5.06109 10.0109L3.82359 11.2484C3.70028 11.3717 3.63105 11.5389 3.63105 11.7133C3.63105 11.8876 3.70028 12.0548 3.82359 12.1781C3.9469 12.3014 4.1141 12.3707 4.28848 12.3707C4.46286 12.3707 4.63007 12.3014 4.75337 12.1781L5.99087 10.9405C6.11418 10.8173 6.18341 10.6501 6.18341 10.4757C6.18341 10.3014 6.11418 10.1341 5.99087 10.0109C5.86757 9.88756 5.70036 9.81833 5.52598 9.81833C5.3516 9.81833 5.1844 9.88756 5.06109 10.0109ZM5.15625 8C5.15625 7.82595 5.08711 7.65903 4.96404 7.53596C4.84097 7.41289 4.67405 7.34375 4.5 7.34375H2.75C2.57595 7.34375 2.40903 7.41289 2.28596 7.53596C2.16289 7.65903 2.09375 7.82595 2.09375 8C2.09375 8.17405 2.16289 8.34097 2.28596 8.46404C2.40903 8.58711 2.57595 8.65625 2.75 8.65625H4.5C4.67405 8.65625 4.84097 8.58711 4.96404 8.46404C5.08711 8.34097 5.15625 8.17405 5.15625 8ZM4.75163 3.82359C4.69056 3.76249 4.61805 3.71404 4.53828 3.68099C4.45851 3.64795 4.37301 3.63094 4.28669 3.63094C4.20037 3.63094 4.11487 3.64795 4.0351 3.68099C3.95533 3.71404 3.88283 3.76249 3.82175 3.82359C3.76066 3.88467 3.71221 3.95717 3.67917 4.03694C3.64612 4.11671 3.62911 4.20221 3.62911 4.28853C3.62911 4.37485 3.64612 4.46035 3.67917 4.54012C3.71221 4.61989 3.76066 4.6924 3.82175 4.75347L5.06109 5.98914C5.1844 6.11244 5.3516 6.18167 5.52598 6.18167C5.70036 6.18167 5.86757 6.11244 5.99087 5.98914C6.11418 5.86583 6.18341 5.69862 6.18341 5.52424C6.18341 5.34987 6.11418 5.18266 5.99087 5.05935L4.75163 3.82359Z" fill="#820DDF"/>
    </svg>
  )
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

function InteractiveManualReview({ items: initialItems, onAllApproved }) {
  const [items, setItems] = useState(initialItems.map(item => ({ ...item, approved: false, expanded: false })))
  const hasAdvancedRef = useRef(false)
  
  const approvedCount = items.filter(item => item.approved).length
  const allApproved = approvedCount === items.length
  
  const toggleExpand = (name) => {
    setItems(prev => prev.map(item => 
      item.name === name ? { ...item, expanded: !item.expanded } : item
    ))
  }
  
  const approveItem = (name) => {
    setItems(prev => {
      const updated = prev.map(item =>
        item.name === name ? { ...item, approved: true, expanded: false } : item
      )
      const newApprovedCount = updated.filter(item => item.approved).length
      if (newApprovedCount === updated.length && !hasAdvancedRef.current) {
        hasAdvancedRef.current = true
        setTimeout(() => onAllApproved(), 500)
      }
      return updated
    })
  }

  const approveAll = () => {
    setItems(prev => prev.map(item => ({ ...item, approved: true, expanded: false })))
    if (!hasAdvancedRef.current) {
      hasAdvancedRef.current = true
      setTimeout(() => onAllApproved(), 500)
    }
  }
  
  return (
    <div className="aura-manual-review-interactive">
      <div className="aura-manual-review-header">
        <div className="aura-manual-review-title">
          <IconFA name="circle-info" size={14} />
          <span>Manual Review Required</span>
        </div>
        <span className="aura-manual-review-count">{approvedCount} / {items.length} approved</span>
      </div>
      <div className="aura-manual-review-list">
        {items.map((item, i) => (
          <div key={i} className={`aura-manual-review-item-interactive ${item.expanded ? 'expanded' : ''}`}>
            <div className="aura-review-item-header" onClick={() => !item.approved && toggleExpand(item.name)}>
              <IconFA name={item.expanded ? 'chevron-down' : 'chevron-right'} size={12} />
              {item.approved ? (
                <div className="aura-review-check">
                  <IconFA name="check" size={10} />
                </div>
              ) : (
                <div className="aura-review-pending">
                  <IconFA name="clock" size={12} />
                </div>
              )}
              <div className="aura-review-item-info">
                <span className="aura-review-item-name">{item.name}</span>
                <span className="aura-review-item-reason">{item.reason}</span>
              </div>
              <span className={`aura-review-item-status ${item.approved ? 'approved' : 'pending'}`}>
                {item.approved ? 'Approved' : 'Pending'}
              </span>
            </div>
            {item.expanded && !item.approved && (
              <div className="aura-review-item-content">
                <div className="aura-ddl-comparison">
                  <div className="aura-ddl-panel">
                    <div className="aura-ddl-header">Original PostgreSQL</div>
                    <pre className="aura-ddl-code"><code>{item.originalDDL}</code></pre>
                  </div>
                  <div className="aura-ddl-panel generated">
                    <div className="aura-ddl-header">Generated SingleStore</div>
                    <pre className="aura-ddl-code"><code>{item.generatedDDL}</code></pre>
                  </div>
                </div>
                <div className="aura-review-actions">
                  <button className="aura-approve-btn" onClick={() => approveItem(item.name)}>
                    <IconFA name="check" size={12} />
                    Approve
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {!allApproved && (
        <div className="aura-manual-review-actions">
          <button className="aura-approve-all-btn" onClick={approveAll}>
            <IconFA name="check-double" size={12} />
            Approve All
          </button>
        </div>
      )}
      {allApproved && (
        <div className="aura-manual-review-footer">
          <IconFA name="check" size={14} />
          <span>All tables reviewed and approved</span>
        </div>
      )}
    </div>
  )
}

function InteractiveTableSelector({ tables: initialTables, totalTables, onConfirm }) {
  const [tables, setTables] = useState(initialTables.map(t => ({ ...t })))
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTables = tables.filter(table =>
    table.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  const selectedCount = tables.filter(t => t.selected).length
  const remainingCount = totalTables - initialTables.length + selectedCount
  
  const toggleTable = (tableName) => {
    setTables(prev => prev.map(t => 
      t.name === tableName ? { ...t, selected: !t.selected } : t
    ))
  }
  
  const handleConfirm = () => {
    onConfirm(`Confirm Selection (${remainingCount} Tables)`)
  }
  
  return (
    <div className="aura-interactive-table-selector">
      <div className="aura-table-search">
        <SearchIcon />
        <input 
          type="text"
          placeholder="Search tables..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="aura-table-list-interactive">
        {filteredTables.map((table, i) => (
          <div 
            key={i} 
            className={`aura-table-item-interactive ${table.selected ? 'selected' : ''}`}
            onClick={() => toggleTable(table.name)}
          >
            <div className={`aura-table-checkbox ${table.selected ? 'checked' : ''}`}>
              {table.selected && <IconFA name="check" size={10} />}
            </div>
            <div className="aura-table-item-info">
              <span className="aura-table-item-name">
                {table.name}
                {table.xlIngest && <span className="aura-xl-badge">XL Ingest</span>}
              </span>
              <span className="aura-table-item-size">{table.rows} rows • {table.size}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="aura-table-selector-footer">
        <span className="aura-table-count">{remainingCount} of {totalTables} tables selected</span>
        <button className="aura-confirm-btn" onClick={handleConfirm}>
          Confirm Selection ({remainingCount} Tables)
        </button>
      </div>
    </div>
  )
}

function TypewriterLine({ text, speed = 18, onComplete, isActive, isTyped }) {
  const [displayedText, setDisplayedText] = useState(isTyped ? text : '')
  const [showCursor, setShowCursor] = useState(false)
  const completedRef = useRef(false)
  
  useEffect(() => {
    if (isTyped) {
      setDisplayedText(text || '')
      setShowCursor(false)
      return
    }
    
    if (!isActive || !text) {
      return
    }
    
    let index = 0
    setDisplayedText('')
    setShowCursor(true)
    completedRef.current = false
    
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1))
        index++
      } else {
        clearInterval(timer)
        setShowCursor(false)
        if (!completedRef.current) {
          completedRef.current = true
          setTimeout(() => onComplete?.(), 150)
        }
      }
    }, speed)
    
    return () => clearInterval(timer)
  }, [text, speed, isActive, isTyped])
  
  if (!isActive && !isTyped && !displayedText) {
    return null
  }
  
  return <>{displayedText}{showCursor && <span className="typing-cursor" />}</>
}

function useSequentialTyping(totalLines, isTyped, onAllComplete) {
  const [currentLine, setCurrentLine] = useState(isTyped ? totalLines : 0)
  const [allDone, setAllDone] = useState(isTyped)
  const completedRef = useRef(false)
  
  useEffect(() => {
    if (isTyped) {
      setCurrentLine(totalLines)
      setAllDone(true)
      completedRef.current = true
    } else {
      setCurrentLine(0)
      setAllDone(false)
      completedRef.current = false
    }
  }, [isTyped, totalLines])
  
  const advanceLine = () => {
    setCurrentLine(prev => {
      const next = prev + 1
      if (next >= totalLines && !completedRef.current) {
        completedRef.current = true
        setTimeout(() => {
          setAllDone(true)
          onAllComplete?.()
        }, 200)
      }
      return next
    })
  }
  
  return { currentLine, allDone, advanceLine }
}

function AgentMessageContent({ message, isTyped, renderMigrationMessage, onTypingComplete }) {
  const textLines = message.content?.text || []
  const totalLines = textLines.length
  const typingState = useSequentialTyping(totalLines, isTyped, onTypingComplete)

  return renderMigrationMessage(message, isTyped, typingState)
}

function AnimatedProgressCard({ content }) {
  // Only skip animation if content.completed is already true in the data
  const [isCompleted, setIsCompleted] = useState(content.completed === true)
  const [currentStepIndex, setCurrentStepIndex] = useState(content.completed ? (content.steps?.length || 0) : -1)
  const [hasAnimated, setHasAnimated] = useState(false)
  const steps = content.steps || []
  const hasSteps = steps.length > 0
  
  // Sync with external completed state changes
  useEffect(() => {
    if (content.completed && !isCompleted) {
      setIsCompleted(true)
      setCurrentStepIndex(steps.length)
    }
  }, [content.completed, isCompleted, steps.length])
  
  // Run animation on mount (only once)
  useEffect(() => {
    if (hasAnimated || content.completed) return
    setHasAnimated(true)
    
    if (hasSteps) {
      // Start showing steps after a short delay
      const initialDelay = setTimeout(() => {
        setCurrentStepIndex(0)
      }, 800)
      
      return () => clearTimeout(initialDelay)
    } else {
      // No steps - just complete after delay (for simple progress like MCP connection)
      const timer = setTimeout(() => {
        setIsCompleted(true)
      }, 2500)
      
      return () => clearTimeout(timer)
    }
  }, [hasAnimated, content.completed, hasSteps])
  
  // Progress through steps
  useEffect(() => {
    if (content.completed || !hasSteps || currentStepIndex < 0) return
    
    if (currentStepIndex < steps.length) {
      const stepTimer = setTimeout(() => {
        setCurrentStepIndex(prev => prev + 1)
      }, 700) // 700ms per step
      
      return () => clearTimeout(stepTimer)
    } else if (currentStepIndex >= steps.length) {
      // All steps done, mark as completed
      const completeTimer = setTimeout(() => {
        setIsCompleted(true)
      }, 400)
      
      return () => clearTimeout(completeTimer)
    }
  }, [currentStepIndex, steps.length, hasSteps, content.completed])
  
  const allStepsDone = currentStepIndex >= steps.length
  
  return (
    <div className={`aura-progress-card aura-fade-in ${isCompleted ? 'completed' : ''}`}>
      <div className="aura-progress-content">
        <div className="aura-progress-icon">
          {isCompleted ? (
            <span className="aura-progress-check">✓</span>
          ) : (
            <SpinnerIcon />
          )}
        </div>
        <span className={`aura-progress-text ${isCompleted ? 'success' : ''}`}>
          {isCompleted && content.completedState ? content.completedState.text : content.text}
        </span>
      </div>
      {isCompleted && content.completedState?.subtext && (
        <span className="aura-progress-subtext">{content.completedState.subtext}</span>
      )}
      {!isCompleted && content.url && <span className="aura-progress-url">{content.url}</span>}
      {hasSteps && (
        <div className="aura-progress-steps">
          {steps.map((step, i) => {
            const isStepVisible = i <= currentStepIndex
            const isStepComplete = i < currentStepIndex || allStepsDone
            const isStepActive = i === currentStepIndex && !allStepsDone
            
            if (!isStepVisible) return null
            
            // Remove the checkmark from the step text if present, we'll add our own indicator
            const stepText = step.replace(/^✓\s*/, '')
            
            return (
              <div 
                key={i} 
                className={`aura-progress-step-animated ${isStepComplete ? 'completed' : ''} ${isStepActive ? 'active' : ''}`}
              >
                <span className="aura-step-indicator">
                  {isStepComplete ? '✓' : <SpinnerIcon size={12} />}
                </span>
                <span className="aura-step-text">{stepText}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AuraSidePanel({ isOpen, isFullscreen, sidebarExpanded, width, onClose, onToggleFullscreen, onWidthChange, messages, inputValue, setInputValue, onSend, onAction, onAdvanceSilently, isTyping, chatEndRef, agentName = 'Aura Agent', onAgentChange, onNewChat, queryTuningResult, queryTuningContext, onApplyQuery }) {
  const [isResizing, setIsResizing] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState(AURA_AGENTS[0])
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false)
  const [showConnections, setShowConnections] = useState(false)
  const [typedMessageIds, setTypedMessageIds] = useState(new Set())
  const panelRef = useRef(null)
  const dropdownRef = useRef(null)
  
  const sidebarWidth = sidebarExpanded ? 220 : 48
  
  const markAsTyped = (messageId) => {
    setTypedMessageIds(prev => new Set([...prev, messageId]))
  }

  // Sync selectedAgent with agentName prop
  useEffect(() => {
    console.log('[AURA_PANEL] agentName prop changed to:', agentName)
    const agent = AURA_AGENTS.find(a => a.name === agentName) || AURA_AGENTS[0]
    console.log('[AURA_PANEL] Setting selectedAgent to:', agent.name)
    setSelectedAgent(agent)
  }, [agentName])

  const handleAction = (action) => {
    if (action === 'Use existing connection') {
      setShowConnections(true)
    }
    onAction(action)
  }

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
    // If selecting a different agent, start a new conversation
    if (agent.name !== selectedAgent.name && onAgentChange) {
      onAgentChange(agent.name)
    }
    setSelectedAgent(agent)
    setAgentDropdownOpen(false)
  }

  if (!isOpen) return null

  const renderMigrationMessage = (message, isTyped, typingState) => {
    const { content } = message
    const { currentLine, allDone, advanceLine } = typingState
    
    const getTextContent = (t) => {
      if (t.type === 'bold') return t.content
      if (t.type === 'text') return t.content
      if (t.type === 'success') return t.content
      if (t.type === 'mixed') return `${t.content || ''}${t.bold || ''}${t.after || ''}${t.bold2 || ''}${t.after2 || ''}`
      return ''
    }

    const renderTextLine = (t, lineIndex) => {
      const isLineTyped = isTyped || lineIndex < currentLine
      const isLineActive = !isTyped && lineIndex === currentLine
      const text = getTextContent(t)
      
      if (!isLineTyped && !isLineActive) return null
      
      return (
        <TypewriterLine
          key={lineIndex}
          text={text}
          isTyped={isLineTyped}
          isActive={isLineActive}
          onComplete={advanceLine}
          speed={18}
        />
      )
    }

    const textLines = content.text && Array.isArray(content.text) ? content.text : []

    return (
      <div className="aura-message-content">
        {textLines.map((t, i) => {
          const isLineTyped = isTyped || i < currentLine
          const isLineActive = !isTyped && i === currentLine
          
          if (!isLineTyped && !isLineActive) return null
          
          return (
            <p key={i} className={`aura-message-text ${t.type === 'success' ? 'aura-text-success' : ''}`}>
              {t.type === 'success' && <span className="success-check">✓</span>}
              {t.type === 'success' && ' '}
              {t.type === 'bold' ? (
                <strong>
                  <TypewriterLine
                    text={t.content}
                    isTyped={isLineTyped}
                    isActive={isLineActive}
                    onComplete={advanceLine}
                    speed={18}
                  />
                </strong>
              ) : (
                <TypewriterLine
                  text={getTextContent(t)}
                  isTyped={isLineTyped}
                  isActive={isLineActive}
                  onComplete={advanceLine}
                  speed={18}
                />
              )}
            </p>
          )
        })}

        {allDone && content.footerText && (
          <p className="aura-message-text aura-footer-text"><strong>{content.footerText}</strong></p>
        )}

        {allDone && content.whyCard && (
          <div className="aura-why-card aura-fade-in">
            <div className="aura-why-card-title">{content.whyCard.title}</div>
            <ul className="aura-why-card-list">
              {content.whyCard.items.map((item, i) => (
                <li key={i}>{item.prefix}<strong>{item.bold}</strong>{item.suffix}</li>
              ))}
            </ul>
          </div>
        )}

        {allDone && content.flowInstanceSelector && (
          <div className="aura-flow-instance-selector aura-fade-in">
            <div className="aura-flow-instance-label">{content.flowInstanceSelector.label}</div>
            <div className="aura-flow-instance-options">
              {content.flowInstanceSelector.options.map((opt) => (
                <button
                  key={opt.id}
                  className={`aura-flow-instance-btn ${opt.recommended ? 'recommended' : ''}`}
                  onClick={() => handleAction(opt.label)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {allDone && content.provisionedResourcesGreen && (
          <div className="aura-provisioned-resources-green aura-fade-in">
            <div className="aura-provisioned-resources-green-title">{content.provisionedResourcesGreen.title}</div>
            <div className="aura-provisioned-resources-green-stats">
              {content.provisionedResourcesGreen.stats.map((stat, i) => (
                <div key={i} className="aura-provisioned-stat-row">
                  <span className="aura-provisioned-stat-label">{stat.label}</span>
                  <span className="aura-provisioned-stat-value">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {allDone && content.cdcSelector && (
          <div className="aura-fade-in">
            <p className="aura-message-text aura-cdc-question"><strong>{content.cdcSelector.question}</strong></p>
            <div className="aura-cdc-selector">
              <div className="aura-cdc-selector-label">{content.cdcSelector.label}</div>
              <div className="aura-cdc-selector-options">
                {content.cdcSelector.options.map((opt) => (
                  <button
                    key={opt}
                    className="aura-cdc-selector-btn"
                    onClick={() => handleAction(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {allDone && content.steps && !content.progress && (
          <div className="aura-steps-list aura-fade-in">
            {content.steps.map((step, i) => (
              <div key={i} className="aura-step-item">{step}</div>
            ))}
          </div>
        )}

        {content.progress && (
          <AnimatedProgressCard content={content} />
        )}

        {allDone && content.connections && showConnections && (
          <div className="aura-connections-list aura-fade-in">
            {content.connections.map((conn, i) => (
              <div 
                key={i} 
                className="aura-connection-card aura-connection-card-clickable"
                onClick={() => handleAction(`Connect to ${conn.name}`)}
              >
                <div className="aura-connection-icon">
                  <IconFA name="database" size={16} />
                </div>
                <div className="aura-connection-info">
                  <span className="aura-connection-name">{conn.name}</span>
                  <span className="aura-connection-db">{conn.db} • {conn.tables}</span>
                  <span className="aura-connection-url">{conn.url}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {allDone && content.connectionSelect && (
          <div className="aura-connection-select aura-fade-in">
            <div className="aura-connection-card selected">
              <div className="aura-connection-icon">
                <IconFA name="database" size={16} />
              </div>
              <div className="aura-connection-info">
                <span className="aura-connection-name">{content.connectionSelect.name}</span>
                <span className="aura-connection-db">{content.connectionSelect.db} · {content.connectionSelect.tables}</span>
                <span className="aura-connection-url">{content.connectionSelect.url}</span>
              </div>
            </div>
          </div>
        )}

        {allDone && content.dbProfile && (
          <div className="aura-info-card aura-db-profile aura-fade-in">
            <div className="aura-info-card-header">{content.dbProfile.title}</div>
            <div className="aura-info-card-stats">
              {content.dbProfile.stats.map((stat, i) => (
                <div key={i} className="aura-info-stat">
                  <span className="aura-info-stat-label">{stat.label}</span>
                  <span className="aura-info-stat-value">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {allDone && content.migrationConsiderations && (
          <div className="aura-migration-considerations aura-fade-in">
            <p className="aura-message-text">{content.migrationConsiderations.intro}</p>
            <div className="aura-considerations-list">
              {content.migrationConsiderations.warnings.map((warning, i) => (
                <div key={i} className="aura-consideration-item">
                  <span className="aura-consideration-icon">⚠️</span>
                  <div className="aura-consideration-content">
                    <span className="aura-consideration-type">{warning.type}:</span>
                    <span className="aura-consideration-text">{warning.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {allDone && content.transformationSummary && (
          <div className="aura-info-card aura-transformation-summary aura-fade-in">
            <div className="aura-info-card-header">{content.transformationSummary.title}</div>
            <div className="aura-info-card-stats">
              {content.transformationSummary.stats.map((stat, i) => (
                <div key={i} className="aura-info-stat">
                  <span className="aura-info-stat-label">{stat.label}</span>
                  <span className={`aura-info-stat-value ${stat.highlight ? 'highlight' : ''}`}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {allDone && content.actionRequired && (
          <div className="aura-action-required aura-fade-in">
            <span className="aura-action-required-icon">⚠️</span>
            <div className="aura-action-required-content">
              <span className="aura-action-required-label">Action Required:</span>
              <span className="aura-action-required-text">{content.actionRequired.text}</span>
            </div>
          </div>
        )}

        {allDone && content.manualReview && (
          <div className="aura-manual-review aura-fade-in">
            <div className="aura-manual-review-header">
              <div className="aura-manual-review-title">
                <IconFA name="circle-info" size={14} />
                <span>Manual Review Required</span>
              </div>
              <span className="aura-manual-review-count">{content.manualReview.count}</span>
            </div>
            <div className="aura-manual-review-list">
              {content.manualReview.items.map((item, i) => (
                <div key={i} className="aura-manual-review-item">
                  <IconFA name="chevron-right" size={12} />
                  <div className="aura-review-check">
                    <IconFA name="check" size={10} />
                  </div>
                  <div className="aura-review-item-info">
                    <span className="aura-review-item-name">{item.name}</span>
                    <span className="aura-review-item-reason">{item.reason}</span>
                  </div>
                  <span className="aura-review-item-status">{item.status}</span>
                </div>
              ))}
            </div>
            {content.manualReview.allApproved && (
              <div className="aura-manual-review-footer">
                <IconFA name="check" size={14} />
                <span>All tables reviewed and approved</span>
              </div>
            )}
          </div>
        )}

        {allDone && content.interactiveManualReview && (
          <div className="aura-fade-in">
            <InteractiveManualReview
              items={content.interactiveManualReview.items}
              onAllApproved={onAdvanceSilently}
            />
          </div>
        )}

        {allDone && content.migrationPlan && (
          <div className="aura-migration-plan aura-fade-in">
            <div className="aura-migration-plan-header">{content.migrationPlan.title}</div>
            <div className="aura-migration-plan-items">
              {content.migrationPlan.items.map((item, i) => (
                <div key={i} className="aura-migration-plan-item">{item}</div>
              ))}
            </div>
          </div>
        )}

        {allDone && content.codePreview && (
          <div className="aura-code-preview aura-fade-in">
            <div className="aura-code-preview-header">
              <span>{content.codePreview.title}</span>
              <span className="aura-code-preview-lang">{content.codePreview.language}</span>
            </div>
            <pre className="aura-code-preview-code">
              <code>{content.codePreview.code}</code>
            </pre>
          </div>
        )}

        {allDone && content.provisionedResources && (
          <div className="aura-info-card aura-fade-in">
            <div className="aura-info-card-header">{content.provisionedResources.title}</div>
            <div className="aura-info-card-stats">
              {content.provisionedResources.stats.map((stat, i) => (
                <div key={i} className="aura-info-stat">
                  <span className="aura-info-stat-label">{stat.label}</span>
                  <span className="aura-info-stat-value">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {allDone && content.warnings && (
          <div className="aura-warnings aura-fade-in">
            {content.warnings.map((warning, i) => (
              <div key={i} className="aura-warning-item">
                <span className="aura-warning-icon">{warning.icon}</span>
                <span className="aura-warning-text">{warning.text}</span>
              </div>
            ))}
          </div>
        )}

        {allDone && content.reviewItems && (
          <div className="aura-review-widget aura-fade-in">
            <div className="aura-review-header">
              <IconFA name="warning" size={14} />
              <span>Manual Review Required</span>
              <span className="aura-review-count">4 / 4 pending</span>
            </div>
            <div className="aura-review-list">
              {content.reviewItems.map((item, i) => (
                <div key={i} className="aura-review-item">
                  <IconFA name="database" size={14} />
                  <div className="aura-review-item-info">
                    <span className="aura-review-item-name">{item.name}</span>
                    <span className="aura-review-item-reason">{item.reason}</span>
                  </div>
                  <span className="aura-review-item-status">Pending</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {allDone && content.tableSelection && (
          <div className="aura-table-selection aura-fade-in">
            <div className="aura-table-selection-header">
              <IconFA name="database" size={14} />
              <span>{content.tableSelection.title}</span>
            </div>
            <div className="aura-table-list">
              {content.tableSelection.tables.map((table, i) => (
                <div key={i} className="aura-table-item">
                  <IconFA name="check" size={12} />
                  <div className="aura-table-item-info">
                    <span className="aura-table-item-name">
                      {table.name}
                      {table.xlIngest && <span className="aura-xl-badge">XL Ingest</span>}
                    </span>
                    <span className="aura-table-item-size">{table.rows} • {table.size}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="aura-table-selection-footer">{content.tableSelection.totalSelected}</div>
          </div>
        )}

        {allDone && content.interactiveTableSelection && (
          <div className="aura-fade-in">
            <InteractiveTableSelector 
              tables={content.interactiveTableSelection.tables}
              totalTables={content.interactiveTableSelection.totalTables}
              onConfirm={handleAction}
            />
          </div>
        )}

        {allDone && content.infoBox && (
          <div className="aura-info-box aura-fade-in">
            <div className="aura-info-box-title">{content.infoBox.title}</div>
            <ul className="aura-info-box-list">
              {content.infoBox.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {allDone && content.warningCard && (
          <div className="aura-warning-card aura-fade-in">
            <span className="aura-warning-card-icon">{content.warningCard.icon}</span>
            <div className="aura-warning-card-content">
              <span className="aura-warning-card-title">{content.warningCard.title}</span>
              <span className="aura-warning-card-text">{content.warningCard.text}</span>
            </div>
          </div>
        )}

        {allDone && content.success && (
          <div className="aura-success-header aura-fade-in">
            <IconFA name="check" size={18} weight="solid" />
            <span>{content.title}</span>
          </div>
        )}

        {allDone && content.migrationStats && (
          <div className="aura-migration-stats aura-fade-in">
            {content.migrationStats.stats.map((stat, i) => (
              <div key={i} className={`aura-migration-stat ${stat.divider ? 'divider' : ''}`}>
                <span className="aura-migration-stat-label">{stat.label}</span>
                <span className={`aura-migration-stat-value ${stat.success ? 'success' : ''}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        )}

        {allDone && content.followUp && (
          <p className="aura-message-text aura-followup aura-fade-in">{content.followUp}</p>
        )}

        {allDone && content.actions && !content.progress && !(content.connections && showConnections) && (
          <div className="aura-action-buttons aura-fade-in">
            {content.actions.map((action, i) => (
              <button key={i} className="aura-action-btn" onClick={() => handleAction(action)}>
                {action}
              </button>
            ))}
          </div>
        )}

        {/* CPU Spike / Aura Agent flow elements */}
        {allDone && content.stats && (
          <div className="stats-grid aura-fade-in">
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

        {allDone && content.recommendation && (
          <div className="recommendation-card aura-fade-in">
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

        {allDone && content.why && (
          <div className="why-section aura-fade-in">
            <h4>Why S4?</h4>
            <ul>
              {content.why.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {allDone && content.queries && (
          <div className="aura-fade-in">
            <div className="expandable-header">
              <ChevronDownIcon />
              <span>Top 5 queries</span>
            </div>
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
          </div>
        )}

        {allDone && content.options && (
          <div className="aura-fade-in">
            <div className="expandable-header">
              <ChevronDownIcon />
              <span>Ways to reduce load without resizing</span>
            </div>
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
          </div>
        )}

        {allDone && content.footer && (
          <p className="aura-message-text aura-fade-in">{content.footer}</p>
        )}
      </div>
    )
  }

  return (
    <div
      ref={panelRef}
      className={`aura-side-panel ${isFullscreen ? 'fullscreen' : ''}`}
      style={isFullscreen ? { left: `${sidebarWidth}px` } : { width: `${width}%` }}
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
          <button className="aura-panel-btn" onClick={onNewChat} title="New chat">
            <NewChatIcon size={14} />
          </button>
          <button className="aura-panel-btn" onClick={onToggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            <IconFA name={isFullscreen ? 'compress' : 'expand'} size={14} />
          </button>
          <button className="aura-panel-btn" onClick={onClose} title="Close">
            <IconFA name="xmark" size={14} />
          </button>
        </div>
      </div>

      <div className="aura-panel-content">
        {/* Query Tuning Agent Results */}
        {agentName === 'Query Tuning Agent' && (queryTuningResult || isTyping) ? (
          <div className="query-tuning-content">
            {isTyping && !queryTuningResult ? (
              <div className="query-tuning-analyzing">
                <div className="analyzing-icon">
                  <IconFA name="sparkles" size={24} />
                </div>
                <h3>Analyzing your query...</h3>
                <p>Looking for optimization opportunities</p>
                <div className="analyzing-progress">
                  <div className="analyzing-bar" />
                </div>
              </div>
            ) : queryTuningResult?.status === 'optimized' ? (
              <div className="query-tuning-result">
                <div className="qt-title">Optimize query</div>
                <div className="qt-success-card">
                  <div className="qt-success-icon">
                    <IconFA name="check" size={16} />
                  </div>
                  <div className="qt-success-content">
                    <h4>Query looks good!</h4>
                    <p>{queryTuningResult.message}</p>
                  </div>
                </div>
                <div className="qt-suggestions">
                  <h4>Recommendations</h4>
                  <ul>
                    {queryTuningResult.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : queryTuningResult?.status === 'issues-found' ? (
              <div className="query-tuning-result">
                <div className="qt-title">Optimize query</div>
                
                {/* Issue Block */}
                <div className="qt-issue-card">
                  <div className="qt-issue-header">
                    <span className="qt-issue-icon">⚠️</span>
                    <span className="qt-issue-label">Issue</span>
                  </div>
                  <p className="qt-issue-text">{queryTuningResult.issue}</p>
                </div>
                
                {/* Why it matters - Collapsible */}
                <details className="qt-why-section">
                  <summary className="qt-why-header">
                    <span className="qt-why-icon">▾</span>
                    <span>Why it matters</span>
                  </summary>
                  <p className="qt-why-text">{queryTuningResult.whyItMatters}</p>
                </details>
                
                {/* Recommended Fix */}
                <div className="qt-fix-section">
                  <div className="qt-fix-header">
                    <span className="qt-fix-icon">✓</span>
                    <span className="qt-fix-label">Recommended Fix</span>
                  </div>
                  <div className="qt-code-block">
                    <div className="qt-code-header">
                      <button 
                        className="qt-copy-btn"
                        onClick={() => navigator.clipboard.writeText(queryTuningResult.recommendedFix.suggestedQuery)}
                        title="Copy to clipboard"
                      >
                        <IconFA name="copy" size={12} />
                      </button>
                    </div>
                    <pre className="qt-code">{queryTuningResult.recommendedFix.suggestedQuery}</pre>
                  </div>
                </div>
                
                {/* Learn more link */}
                <a href="#" className="qt-learn-more">
                  Learn more: JOIN optimization docs →
                </a>
                
                {/* Warning banner */}
                <div className="qt-warning-banner">
                  <span className="qt-warning-icon">⚠️</span>
                  <span>Validate in staging before production</span>
                </div>
                
                {/* Actions */}
                <div className="qt-actions">
                  <button className="qt-reject-btn" onClick={onNewChat}>
                    <IconFA name="xmark" size={12} />
                    <span>Reject</span>
                  </button>
                  <button 
                    className="qt-apply-btn"
                    onClick={() => onApplyQuery && onApplyQuery(queryTuningResult.recommendedFix.suggestedQuery)}
                  >
                    <IconFA name="play" size={12} />
                    <span>Apply to editor</span>
                  </button>
                </div>
                
                {/* Feedback */}
                <div className="qt-feedback">
                  <span>Was this helpful?</span>
                  <button className="qt-feedback-btn" title="Yes">👍</button>
                  <button className="qt-feedback-btn" title="No">👎</button>
                </div>
              </div>
            ) : null}
          </div>
        ) : messages.length === 0 && !isTyping ? (
          <div className="aura-panel-empty">
            <div className="aura-empty-icon">
              <IconFA name={selectedAgent.icon} size={32} />
            </div>
            <h3>{agentName === 'Data Migration Agent' ? 'AI-Powered Migration Assistant' : 
                 agentName === 'Query Tuning Agent' ? 'Query Optimization Assistant' : 
                 'Aura AI Assistant'}</h3>
            <p>{agentName === 'Data Migration Agent' ? 'I can help you migrate data from PostgreSQL, MySQL, Oracle, MongoDB, and more to SingleStore.' :
                agentName === 'Query Tuning Agent' ? 'I can help you optimize queries, analyze execution plans, and improve database performance.' :
                'I can help you monitor workspaces, analyze performance, and manage your SingleStore environment.'}</p>
            <div className="aura-suggested-prompts">
              {(agentName === 'Data Migration Agent' ? MIGRATION_PROMPTS : 
                agentName === 'Query Tuning Agent' ? QUERY_TUNING_PROMPTS : 
                AURA_PROMPTS).map((prompt, i) => (
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
            {messages.map((message, index) => (
              <Message
                key={message.id}
                message={message}
                onAction={handleAction}
                expandedQueries={true}
                setExpandedQueries={() => {}}
                expandedOptions={true}
                setExpandedOptions={() => {}}
                isTyping={index === messages.length - 1 && message.type === 'agent' && !message.typingComplete}
                onTypingComplete={() => {
                  message.typingComplete = true
                  markAsTyped(message.id)
                }}
                agentName={agentName}
                compact={true}
                onAdvanceSilently={onAdvanceSilently}
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
        )}
      </div>

      <div className="aura-panel-input">
        <div className="aura-input-container">
          <textarea
            placeholder={agentName === 'Data Migration Agent' ? 'Ask about data migration...' :
                         agentName === 'Query Tuning Agent' ? 'Ask about query optimization...' :
                         'Ask Aura anything...'}
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

// ============================================
// EDITOR VIEW - SQL Development Experience
// ============================================
// This component supports the Query Tuning Agent flow.
// Key integration points marked with [AI_HOOK] comments.

const SAMPLE_QUERY = `SELECT *
FROM orders
WHERE customer_id IN (
    SELECT id
    FROM customers
    WHERE email LIKE '%gmail.com'
    AND status = 'active'
)
AND created_at > '2024-01-01'
ORDER BY created_at DESC;`

const SAMPLE_QUERY_HISTORY = [
  { id: 1, query: "SELECT * FROM orders WHERE customer_id IN (...)", duration: 640, status: 'success', time: '0 min ago' },
  { id: 2, query: "SHOW TABLES", duration: 300, status: 'success', time: '1 min ago' },
  { id: 3, query: "SELECT 1", duration: 120, status: 'success', time: '2 min ago' },
]

function EditorView({ onOpenAura }) {
  // Editor state
  const [query, setQuery] = useState(SAMPLE_QUERY)
  const [selectedQuery, setSelectedQuery] = useState('')
  const [selectionPosition, setSelectionPosition] = useState(null)
  const [queryHistory, setQueryHistory] = useState(SAMPLE_QUERY_HISTORY)
  const [isRunning, setIsRunning] = useState(false)
  const [activeTab, setActiveTab] = useState('logs')
  
  // Diff view state
  const [showDiff, setShowDiff] = useState(false)
  const [originalQuery, setOriginalQuery] = useState('')  // Selected text for diff preview
  const [optimizedQuery, setOptimizedQuery] = useState('') // Optimized text for diff preview
  const [fullUpdatedQuery, setFullUpdatedQuery] = useState('') // Full query with replacement applied
  
  const monacoRef = useRef(null)
  const editorInstanceRef = useRef(null)
  const selectionRangeRef = useRef(null)
  const lockedSelectionRef = useRef(null) // Preserved selection for optimization session
  const diffEditorRef = useRef(null)

  // [AI_HOOK] Get the currently selected query text
  const getSelectedQuery = () => selectedQuery
  
  // [AI_HOOK] Get the full query text
  const getFullQuery = () => query

  // Handle Monaco Editor mount
  const handleEditorDidMount = (editor, monaco) => {
    editorInstanceRef.current = editor
    monacoRef.current = monaco
    
    // Define custom light theme with purple SQL keywords
    monaco.editor.defineTheme('singlestore-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword.sql', foreground: '820DDF', fontStyle: '' },
        { token: 'keyword', foreground: '820DDF' },
        { token: 'string.sql', foreground: '191919' },
        { token: 'string', foreground: '191919' },
        { token: 'number', foreground: '191919' },
        { token: 'identifier', foreground: '191919' },
        { token: 'comment', foreground: '777582', fontStyle: 'italic' },
        { token: 'operator', foreground: '191919' },
      ],
      colors: {
        'editor.background': '#FAFAFA',
        'editor.foreground': '#191919',
        'editor.lineHighlightBackground': '#FAFAFA',
        'editorLineNumber.foreground': '#777582',
        'editorLineNumber.activeForeground': '#777582',
        'editor.selectionBackground': '#E6E6FF',
        'editorCursor.foreground': '#191919',
        'editorWhitespace.foreground': '#E6E6E6',
      }
    })
    
    // Apply the custom theme
    monaco.editor.setTheme('singlestore-light')
    
    // Listen for selection changes
    editor.onDidChangeCursorSelection((e) => {
      const selection = editor.getSelection()
      const selectedText = editor.getModel().getValueInRange(selection)
      
      if (selectedText && selectedText.trim()) {
        setSelectedQuery(selectedText)
        // Store the selection range for later use when applying optimizations
        selectionRangeRef.current = selection
        
        // Get position for floating button
        const position = editor.getScrolledVisiblePosition(selection.getStartPosition())
        if (position) {
          setSelectionPosition({
            top: position.top + 30,
            left: position.left + 60
          })
        }
      } else {
        setSelectedQuery('')
        setSelectionPosition(null)
        selectionRangeRef.current = null
      }
    })
  }

  // [AI_HOOK] Handle "Optimize with AI" button click
  // Opens the global Aura panel with Query Tuning Agent context
  // Show diff view when user clicks "Apply to editor" in the Aura panel
  const applyOptimizedQuery = (newQuery) => {
    const editor = editorInstanceRef.current
    const selection = lockedSelectionRef.current
    
    // CRITICAL: We need both the editor AND a locked selection to do partial replacement
    if (!editor || !selection) {
      console.warn('[Query Tuning] Missing editor or selection, cannot apply partial replacement')
      // Fallback: show diff of full query replacement (entire query vs entire new query)
      setOriginalQuery(query)
      setOptimizedQuery(newQuery)
      setFullUpdatedQuery(newQuery)
      setShowDiff(true)
      setSelectedQuery('')
      setSelectionPosition(null)
      return
    }
    
    // Get the FULL original query for diff preview (shows full context)
    const fullOriginalQuery = editor.getValue()
    
    // Pre-compute the full updated query by replacing ONLY the selection
    // This is done NOW while the main editor is still mounted
    const model = editor.getModel()
    const startOffset = model.getOffsetAt({
      lineNumber: selection.startLineNumber,
      column: selection.startColumn
    })
    const endOffset = model.getOffsetAt({
      lineNumber: selection.endLineNumber,
      column: selection.endColumn
    })
    
    // Build full query: before selection + optimized text + after selection
    const computedFullQuery = fullOriginalQuery.substring(0, startOffset) + newQuery + fullOriginalQuery.substring(endOffset)
    
    // Store for diff preview - show FULL queries so user sees changes in context
    setOriginalQuery(fullOriginalQuery)
    setOptimizedQuery(computedFullQuery)
    
    // Store the pre-computed full query for when user accepts
    setFullUpdatedQuery(computedFullQuery)
    
    // Show diff view
    setShowDiff(true)
    
    // Clear floating button
    setSelectedQuery('')
    setSelectionPosition(null)
  }
  
  // Handle accepting the optimized query from diff view
  const handleAcceptOptimization = (andRun = false) => {
    if (!fullUpdatedQuery) {
      console.warn('[Query Tuning] No full updated query available')
      return
    }
    
    // Apply the pre-computed full query (with only the selection replaced)
    // This was computed in applyOptimizedQuery while the main editor was still mounted
    setQuery(fullUpdatedQuery)
    
    // Close diff view and clear all state
    setShowDiff(false)
    setOriginalQuery('')
    setOptimizedQuery('')
    setFullUpdatedQuery('')
    selectionRangeRef.current = null
    lockedSelectionRef.current = null
    
    // Run the query if requested
    if (andRun) {
      setTimeout(() => handleRunQuery(), 100)
    }
  }
  
  // Handle rejecting the optimization
  const handleRejectOptimization = () => {
    // Close diff view without changes, clear all state
    setShowDiff(false)
    setOriginalQuery('')
    setOptimizedQuery('')
    setFullUpdatedQuery('')
    lockedSelectionRef.current = null
  }
  
  // Handle diff editor mount
  const handleDiffEditorDidMount = (editor, monaco) => {
    diffEditorRef.current = editor
    
    // Apply custom theme to diff editor
    monaco.editor.defineTheme('singlestore-diff', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword.sql', foreground: '820DDF' },
        { token: 'keyword', foreground: '820DDF' },
        { token: 'string.sql', foreground: '191919' },
        { token: 'string', foreground: '191919' },
        { token: 'number', foreground: '191919' },
        { token: 'comment', foreground: '777582', fontStyle: 'italic' },
      ],
      colors: {
        'editor.background': '#FAFAFA',
        'editor.foreground': '#191919',
        'editorLineNumber.foreground': '#777582',
        'diffEditor.insertedTextBackground': '#D1FAE533',
        'diffEditor.removedTextBackground': '#FEE2E233',
        'diffEditor.insertedLineBackground': '#D1FAE540',
        'diffEditor.removedLineBackground': '#FEE2E240',
      }
    })
    monaco.editor.setTheme('singlestore-diff')
  }

  const handleOptimizeWithAI = () => {
    const queryToOptimize = selectedQuery || query
    
    // Lock the current selection range for the optimization session
    // This prevents it from being cleared when editor loses focus
    if (selectionRangeRef.current) {
      lockedSelectionRef.current = {
        startLineNumber: selectionRangeRef.current.startLineNumber,
        startColumn: selectionRangeRef.current.startColumn,
        endLineNumber: selectionRangeRef.current.endLineNumber,
        endColumn: selectionRangeRef.current.endColumn
      }
      console.log('[AI_HOOK] Locked selection:', lockedSelectionRef.current)
    } else {
      console.log('[AI_HOOK] No selection to lock, will replace entire query')
      lockedSelectionRef.current = null
    }
    
    // Open the global Aura side panel with query context
    // Pass the apply callback so the panel can update the editor
    if (onOpenAura) {
      onOpenAura({
        agent: 'Query Tuning Agent',
        context: {
          query: queryToOptimize,
          executionMetadata: queryHistory[0] || null
        },
        onApplyQuery: applyOptimizedQuery
      })
    }
  }

  // Run query
  const handleRunQuery = () => {
    setIsRunning(true)
    
    // Simulate query execution
    setTimeout(() => {
      const newEntry = {
        id: Date.now(),
        query: query.length > 50 ? query.substring(0, 50) + '...' : query,
        duration: Math.floor(Math.random() * 500) + 100,
        status: 'success',
        time: '0 min ago'
      }
      setQueryHistory(prev => [newEntry, ...prev])
      setIsRunning(false)
    }, 1000)
  }

  return (
    <div className="editor-view">
      {/* Editor Main Area */}
      <div className="editor-main">
        {/* Toolbar - File Tabs */}
        <div className="editor-toolbar">
          <div className="editor-toolbar-left">
            <div className="editor-tabs">
              <button className="editor-tab">
                <IconFA name="folder" size={14} />
                <span>My files</span>
              </button>
              <button className="editor-tab active">
                <IconFA name="database" size={14} />
                <span>untitled query-1.sql</span>
                <span className="editor-tab-close">×</span>
              </button>
              <button className="editor-tab-add">+</button>
            </div>
          </div>
        </div>
        
        {/* Secondary Toolbar - Actions (or Diff Header when in diff mode) */}
        {showDiff ? (
          <div className="editor-toolbar-secondary diff-mode">
            <div className="editor-toolbar-left">
              <div className="diff-header-title">
                <IconFA name="check" size={14} />
                <span>Optimized Query</span>
              </div>
            </div>
            <div className="editor-toolbar-right">
              <button className="diff-reject-btn" onClick={handleRejectOptimization}>
                <IconFA name="xmark" size={12} />
                <span>Reject</span>
              </button>
              <button className="diff-accept-btn" onClick={() => handleAcceptOptimization(true)}>
                <IconFA name="check" size={12} />
                <span>Accept & Run</span>
                <ChevronDownIcon />
              </button>
            </div>
          </div>
        ) : (
          <div className="editor-toolbar-secondary">
            <div className="editor-toolbar-left">
              <button className="editor-selector">
                <IconFA name="folder" size={14} />
                <span>All</span>
                <ChevronDownIcon />
              </button>
              <button className="editor-selector with-badge">
                <div className="editor-ready-badge">
                  <span className="ready-dot" />
                  <span>READY</span>
                </div>
                <span className="db-label">Dev • db_Jess</span>
                <ChevronDownIcon />
              </button>
            </div>
            <div className="editor-toolbar-right">
              <button className="editor-sparkles-btn">
                <IconFA name="sparkles" size={14} />
              </button>
              <button className="editor-action-btn">
                <IconFA name="play" size={14} />
                <span>Visual Explain</span>
                <ChevronDownIcon />
              </button>
              <button 
                className={`editor-run-btn ${isRunning ? 'running' : ''}`}
                onClick={handleRunQuery}
                disabled={isRunning}
              >
                <IconFA name="play" size={14} />
                <span>{isRunning ? 'Running...' : 'Run'}</span>
              </button>
              <button className="editor-icon-btn">
                <IconFA name="database" size={14} />
              </button>
              <button className="editor-icon-btn">
                <IconFA name="ellipsis-vertical" size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Editor Content Area */}
        <div className="editor-content">
          {/* Monaco Diff Editor or Regular Editor */}
          <div className="monaco-editor-container">
            {showDiff ? (
              <DiffEditor
                height="100%"
                language="sql"
                original={originalQuery}
                modified={optimizedQuery}
                onMount={handleDiffEditorDidMount}
                theme="vs"
                options={{
                  fontSize: 14,
                  fontFamily: "'Inconsolata', 'JetBrains Mono', 'SF Mono', 'Monaco', 'Menlo', monospace",
                  lineHeight: 20,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  renderLineHighlight: 'none',
                  lineNumbers: 'on',
                  glyphMargin: false,
                  folding: false,
                  lineDecorationsWidth: 16,
                  lineNumbersMinChars: 2,
                  padding: { top: 16, bottom: 16 },
                  automaticLayout: true,
                  readOnly: true,
                  renderSideBySide: false,
                  renderIndicators: true,
                  renderMarginRevertIcon: false,
                  ignoreTrimWhitespace: false,
                  diffWordWrap: 'off',
                  overviewRulerBorder: false,
                  overviewRulerLanes: 0,
                  scrollbar: {
                    vertical: 'auto',
                    horizontal: 'auto',
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8,
                  },
                }}
              />
            ) : (
              <Editor
                height="100%"
                defaultLanguage="sql"
                value={query}
                onChange={(value) => setQuery(value || '')}
                onMount={handleEditorDidMount}
                theme="vs"
                options={{
                  fontSize: 14,
                  fontFamily: "'Inconsolata', 'JetBrains Mono', 'SF Mono', 'Monaco', 'Menlo', monospace",
                  lineHeight: 20,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  renderLineHighlight: 'none',
                  lineNumbers: 'on',
                  glyphMargin: false,
                  folding: false,
                  lineDecorationsWidth: 16,
                  lineNumbersMinChars: 2,
                  padding: { top: 16, bottom: 16 },
                  automaticLayout: true,
                  wordWrap: 'off',
                  tabSize: 4,
                  insertSpaces: true,
                  cursorBlinking: 'smooth',
                  cursorSmoothCaretAnimation: 'on',
                  smoothScrolling: true,
                  overviewRulerBorder: false,
                  hideCursorInOverviewRuler: true,
                  overviewRulerLanes: 0,
                  scrollbar: {
                    vertical: 'auto',
                    horizontal: 'auto',
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8,
                  },
                }}
              />
            )}
            
            {/* [AI_HOOK] Floating "Optimize with AI" button - hidden during diff mode */}
            {selectedQuery && selectionPosition && !showDiff && (
              <button 
                className="optimize-ai-btn"
                style={{ 
                  top: selectionPosition.top,
                  left: selectionPosition.left
                }}
                onClick={handleOptimizeWithAI}
              >
                <IconFA name="sparkles" size={12} />
                <span>Optimize with AI</span>
              </button>
            )}
          </div>

          {/* Results Panel */}
          <div className="results-panel">
            <div className="results-tabs">
              <button 
                className={`results-tab ${activeTab === 'logs' ? 'active' : ''}`}
                onClick={() => setActiveTab('logs')}
              >
                <span>Message Logs</span>
              </button>
              {queryHistory.slice(0, 3).map((item, index) => (
                <button 
                  key={item.id}
                  className={`results-tab ${activeTab === `result-${index}` ? 'active' : ''}`}
                  onClick={() => setActiveTab(`result-${index}`)}
                >
                  <IconFA name="table" size={12} />
                  <span>{item.query.substring(0, 12)}...</span>
                  <span className="tab-close">×</span>
                </button>
              ))}
              <button className="results-tab-more">
                <IconFA name="ellipsis-vertical" size={12} />
              </button>
            </div>

            <div className="results-content">
              {activeTab === 'logs' ? (
                queryHistory.length > 0 ? (
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th>Start Time</th>
                        <th>Query</th>
                        <th>Duration</th>
                        <th>Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queryHistory.map((item, index) => (
                        <tr key={item.id} className={index % 2 === 1 ? 'alt-row' : ''}>
                          <td className="time-cell">{item.time}</td>
                          <td className="query-cell">
                            <IconFA name="check-circle" size={12} />
                            <span>{item.query}</span>
                          </td>
                          <td className="duration-cell">
                            <div className="duration-info">
                              <span className="duration-value">{item.duration} ms</span>
                              <div className="duration-bar">
                                <div 
                                  className={`duration-bar-fill ${item.duration > 500 ? 'warning' : 'info'}`}
                                  style={{ width: `${Math.min((item.duration / 700) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="message-cell">-</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="results-empty">
                    <div className="results-empty-icon">
                      <TableIcon />
                    </div>
                    <p>Select one or more queries and hit ⌘ + Return to run them.</p>
                    <p className="results-empty-note">Results are limited to 300 rows.</p>
                  </div>
                )
              ) : (
                <div className="results-empty">
                  <div className="results-empty-icon">
                    <TableIcon />
                  </div>
                  <p>Query results will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Table icon for empty state
function TableIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="12" width="32" height="24" rx="2" stroke="#D6D6D6" strokeWidth="2" fill="none"/>
      <line x1="8" y1="20" x2="40" y2="20" stroke="#D6D6D6" strokeWidth="2"/>
      <line x1="20" y1="12" x2="20" y2="36" stroke="#D6D6D6" strokeWidth="2"/>
      <line x1="8" y1="28" x2="40" y2="28" stroke="#D6D6D6" strokeWidth="2"/>
    </svg>
  )
}

export default App
