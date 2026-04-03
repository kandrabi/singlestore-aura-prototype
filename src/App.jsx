import { useState, useRef, useEffect } from 'react'
import Editor, { DiffEditor } from '@monaco-editor/react'
import './index.css'

// Database logo paths (stored in public/images/logos/)
const LOGO_MONGODB = "/images/logos/mongodb.svg"
const LOGO_S3 = "/images/logos/s3.svg"
const LOGO_MYSQL_TEXT = "/images/logos/mysql-text.svg"
const LOGO_MYSQL_DOLPHIN = "/images/logos/mysql-dolphin.svg"
const LOGO_SQLSERVER = "/images/logos/sqlserver.png"
const LOGO_SNOWFLAKE = "/images/logos/snowflake.png"
const LOGO_DATABRICKS = "/images/logos/databricks.svg"
const LOGO_ORACLE = "/images/logos/oracle.png"
const LOGO_POSTGRESQL = "/images/logos/postgresql.png"

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
      { id: 'lakehouse', label: 'Lakehouse' },
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
  const onCompleteRef = useRef(onComplete)
  
  // Keep the ref updated with latest callback
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])
  
  useEffect(() => {
    if (!text) {
      onCompleteRef.current?.()
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
        onCompleteRef.current?.()
      }
    }, speed)
    
    return () => clearInterval(timer)
  }, [text, speed])
  
  return <>{displayedText}<span className="typing-cursor" /></>
}

function AnimatedList({ items, isTyping, onComplete }) {
  const onCompleteRef = useRef(onComplete)
  const [hasRendered, setHasRendered] = useState(!isTyping)
  
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])
  
  useEffect(() => {
    if (!isTyping) {
      setHasRendered(true)
      return
    }
    
    // Render all items at once after a brief delay, then complete
    const timer = setTimeout(() => {
      setHasRendered(true)
      setTimeout(() => {
        onCompleteRef.current?.()
      }, 100)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [isTyping, items.length])
  
  return (
    <ul className="message-list">
      {items.map((item, i) => (
        <li 
          key={i} 
          className={hasRendered ? 'fade-in' : 'hidden'}
        >
          {item}
        </li>
      ))}
    </ul>
  )
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
    extra: 'Recommended size: S-224 (currently S-160).',
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
  'Set up speed layer for lakehouse',
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

// Top queries data for CPU spike investigation
const CPU_SPIKE_TOP_QUERIES = [
  {
    database: "billing",
    activity: "InsertSelect_aws_cost_usage__et_al_6185574400be7b72",
    totalCPU: "430.7 min",
    elapsed: "15.3 min",
    memory: "9447.8 GB",
    diskIO: "471.3 GB",
    network: "694.0 GB",
    execs: 1,
    avgCPU: "25840.1 s"
  },
  {
    database: "billing",
    activity: "Delete_aws_cost_usage__et_al_273f12cef502917f",
    totalCPU: "308.9 min",
    elapsed: "8.4 min",
    memory: "65.0 GB",
    diskIO: "0.0 GB",
    network: "0.0 GB",
    execs: 1,
    avgCPU: "18536.6 s"
  },
  {
    database: "growth",
    activity: "Select_AwsCURMetadata__et_al_cdfc007b405dc72d",
    totalCPU: "143.6 min",
    elapsed: "9.8 min",
    memory: "50.9 GB",
    diskIO: "0.0 GB",
    network: "0.0 GB",
    execs: 1,
    avgCPU: "8615.4 s"
  },
  {
    database: "information_schema",
    activity: "Select_MV_NODES__et_al_37f96c1f7458da72",
    totalCPU: "124.6 min",
    elapsed: "28.5 min",
    memory: "4.7 GB",
    diskIO: "0.0 GB",
    network: "0.0 GB",
    execs: 18,
    avgCPU: "415.5 s"
  },
  {
    database: "sif",
    activity: "Select_sharedtierdatabases__et_al_3f4a3c1b4097bc79",
    totalCPU: "92.0 min",
    elapsed: "35.9 min",
    memory: "5584.9 GB",
    diskIO: "970.0 GB",
    network: "42.0 GB",
    execs: 1,
    avgCPU: "5517.0 s"
  }
]

// NEW FLOW: CPU Spike Investigation V2 (independent from existing cpu-spike flow)
// Each step is a SINGLE message containing all content blocks
const CPU_SPIKE_INVESTIGATION_V2_FLOW = [
  // Step 0: Initial message
  {
    type: 'agent',
    content: {
      text: [
        { type: 'bold', content: 'CPU spike detected' },
        { type: 'text', content: "I've started analyzing what happened." },
        { type: 'text', content: 'Between 3:45–5:00 AM PST, CPU usage increased significantly and impacted workload performance.' },
        { type: 'text', content: "Here's what I can help with:" },
        { type: 'list', items: [
          'Identify the queries responsible',
          'Understand system behavior during the spike',
          'Fix the root cause'
        ]},
        { type: 'text', content: 'What would you like to do first?' }
      ],
      actions: ['View affected queries', 'Investigate spike']
    }
  },
  // Step 1: Investigation results - SINGLE message with chart, analysis, table, and actions
  {
    type: 'agent',
    content: {
      text: [
        { type: 'text', content: 'Analyzing cluster activity during the spike window...' },
        { type: 'mixed', content: 'High CPU spike driven by ', bold: '2–3 heavy queries', after: ' between ', bold2: '12:00–12:45 UTC', after2: '.' }
      ],
      ui: { type: 'cpu-chart', state: 'placeholder' },
      analysisText: [
        { type: 'mixed', content: 'CPU usage spiked in parallel across ', bold: 'multiple nodes', after: ', indicating a ', bold2: 'cluster-wide workload issue', after2: ' rather than a single-node hardware constraint.' },
        { type: 'mixed', content: 'The load is highly concentrated — the top ', bold: '2 queries drive ~70% of total CPU', after: ' during this window. Optimizing them will deliver the fastest and most meaningful reduction in pressure.' }
      ],
      queryTable: { type: 'query-table', state: 'placeholder' },
      followUpText: [
        { type: 'mixed', content: '', bold: 'Recommended next step:', after: ' Review and optimize the top 2 queries — this will reduce CPU load by up to ', bold2: '70%', after2: '.' }
      ],
      actions: ['Investigate other events', 'Optimize queries']
    }
  },
  // Step 2: Other events investigation - SINGLE message with memory chart, analysis, and actions
  {
    type: 'agent',
    content: {
      text: [
        { type: 'text', content: 'Analyzing memory, disk, and system resource usage during the spike window...' }
      ],
      ui: { type: 'memory-chart', state: 'placeholder' },
      analysisText: [
        { type: 'mixed', content: '', bold: 'Memory, CPU, and disk usage', after: ' all spiked together during this window, indicating ', bold2: 'resource contention', after2: ' across the cluster.' },
        { type: 'mixed', content: 'This pattern is consistent with a few ', bold: 'heavy queries exhausting shared resources', after: ' — optimizing them will reduce pressure across all signals.' }
      ],
      actions: ['Optimize queries']
    }
  },
  // Step 3: Optimization recommendations - SINGLE message
  {
    type: 'agent',
    content: {
      text: [
        { type: 'text', content: 'Here are the highest-impact queries contributing to the spike, ranked by resource usage.' },
        { type: 'text', content: 'Optimizing these first will reduce cluster pressure most effectively.' }
      ],
      ui: { type: 'optimization-recommendations', state: 'placeholder' },
      optimizationQueries: [
        { 
          name: 'InsertSelect_aws_cost_usage', 
          badges: [
            { label: '430 CPU-min', type: 'critical' },
            { label: '9.4 TB memory', type: 'critical' },
            { label: '694 GB network', type: 'warning' }
          ],
          summary: 'Heavy anti-join on target table causing massive memory + network shuffle.',
          whatHappening: [
            'Full scan + hash build on billing.aws_cost_usage',
            'Cross-shard join causing large data movement'
          ],
          recommendations: [
            {
              title: 'Use incremental load instead of anti-join',
              description: 'Instead of scanning the entire table, process only new records.',
              code: `-- Instead of:
LEFT JOIN billing.aws_cost_usage acu ...
WHERE acu.hash_key IS NULL

-- Use:
WHERE a.ExtractedAt > <last_loaded_timestamp>`
            },
            {
              title: 'Use NOT EXISTS instead of LEFT JOIN',
              description: 'Improves performance by avoiding full join materialization.',
              code: `WHERE NOT EXISTS (
  SELECT 1
  FROM billing.aws_cost_usage acu
  WHERE acu.hash_key = a.HashKey
    AND acu.usage_month >= @usage_month
)`
            },
            {
              title: 'Add composite index',
              description: 'Avoid full table scans on billing.aws_cost_usage. Add index on (hash_key, usage_month) or (usage_month, hash_key).'
            },
            {
              title: 'Partition load by billing_period',
              description: 'Break large INSERT into smaller batches by billing_period to reduce peak memory and improve concurrency.'
            }
          ],
          sql: `INSERT INTO billing.aws_cost_usage (
   assembly_id,
   billing_period,
   hash_key,
   csp_account_id,
   account_name,
   amortized_cost,
   csp_sku_id,
   effective_cost,
   instance_type,
   line_item_type,
   operation,
   product_code,
   product_name,
   region,
   reservation_arn,
   resource_id,
   savings_plan_effective_cost,
   service_code,
   total_commitment_to_date,
   unblended_cost,
   unused_amortized_upfront_fee,
   unused_recurring_fee,
   usage_day,
   usage_end_date,
   usage_month,
   usage_start_date,
   usage_year,
   usage_type,
   used_commitment,
   refreshed_at,
   usage_amount,
   pricing_unit,
   resource_tags,
   sku_hash
)
SELECT
   TO_CHAR(a.ExtractedAt, 'YYYYMMDDTHH24MISSZ') AS assembly_id,
   CONCAT(
       TO_CHAR(a.BillingPeriod, 'YYYYMMDD'),
       '-',
       TO_CHAR(DATE_ADD(a.BillingPeriod, INTERVAL 1 MONTH), 'YYYYMMDD')
   ) AS billing_period,
   a.HashKey AS hash_key,
   a.CspAccountID AS csp_account_id,
   a.CspAccountName AS account_name,
   COALESCE(
       CASE
           WHEN a.LineItemType = 'SavingsPlanCoveredUsage'
               THEN a.SavingsPlanEffectiveCost
           WHEN a.LineItemType = 'SavingsPlanRecurringFee'
               THEN (a.TotalCommitmentToDate - a.UsedCommitment)
           WHEN a.LineItemType IN ('SavingsPlanNegation', 'SavingsPlanUpfrontFee')
               THEN 0
           WHEN a.LineItemType = 'DiscountedUsage'
               THEN a.EffectiveCost
           WHEN a.LineItemType = 'RIFee'
               THEN (a.UnusedAmortizedUpfrontFee + a.UnusedRecurringFee)
           WHEN (a.LineItemType = 'Fee' AND a.ReservationArn != '')
               THEN 0
           ELSE a.UnblendedCost
       END,
       0
   ) AS amortized_cost,
   csd.sku_id AS csp_sku_id,
   a.EffectiveCost AS effective_cost,
   a.InstanceType AS instance_type,
   a.LineItemType AS line_item_type,
   a.Operation AS operation,
   a.ProductCode AS product_code,
   JSON_EXTRACT_STRING(a.Product, 'product_name') AS product_name,
   JSON_EXTRACT_STRING(a.Product, 'region') AS region,
   a.ReservationArn AS reservation_arn,
   a.ResourceID AS resource_id,
   a.SavingsPlanEffectiveCost AS savings_plan_effective_cost,
   a.ProductServicecode AS service_code,
   a.TotalCommitmentToDate AS total_commitment_to_date,
   a.UnblendedCost AS unblended_cost,
   a.UnusedAmortizedUpfrontFee AS unused_amortized_upfront_fee,
   a.UnusedRecurringFee AS unused_recurring_fee,
   a.UsageDay AS usage_day,
   a.UsageEndDate AS usage_end_date,
   a.UsageMonth AS usage_month,
   a.UsageStartDate AS usage_start_date,
   a.UsageYear AS usage_year,
   a.UsageType AS usage_type,
   a.UsedCommitment AS used_commitment,
   CURRENT_TIMESTAMP() AS refreshed_at,
   a.LineItemUsageAmount AS usage_amount,
   a.PricingUnit AS pricing_unit,
   IF(JSON_LENGTH(a.ResourceTags) > 0, a.ResourceTags, NULL) AS resource_tags,
   a.SkuHash AS sku_hash
FROM csp.AwsCostAndUsageV2 AS a
LEFT OUTER JOIN (
   SELECT acu.hash_key
   FROM billing.aws_cost_usage AS acu
   WHERE acu.usage_month >= 202510
   GROUP BY acu.hash_key
) AS acu
   ON a.HashKey = acu.hash_key
LEFT OUTER JOIN billing.csp_sku_details AS csd
   ON a.ProductCode = csd.sku_name
   AND a.LineItemType = csd.sku_type
   AND a.UsageType = csd.sku_subset
   AND csd.csp = 'aws'
WHERE acu.hash_key IS NULL;`,
          cta: 'View query in Editor'
        },
        { 
          name: 'Delete_aws_cost_usage', 
          badges: [
            { label: '309 CPU-min', type: 'critical' },
            { label: '65 GB memory', type: 'warning' }
          ],
          summary: 'Large delete using anti-join pattern causing heavy scans + contention.',
          whatHappening: [
            'Scans metadata + joins against large table',
            'Likely conflicting with INSERT workload'
          ],
          recommendations: [
            'Run DELETE before INSERT (not concurrently)',
            'Introduce tracking table for processed data',
            'Batch deletes (LIMIT-based)',
            'Schedule during off-peak hours'
          ],
          sql: `DELETE FROM billing.aws_cost_usage
WHERE (hash_key, usage_month) IN (
  SELECT c.hash_key, c.usage_month
  FROM billing.aws_cost_usage c
  LEFT JOIN billing.aws_cur_metadata m
    ON c.billing_period = m.billing_period
  WHERE m.billing_period IS NULL
);`,
          cta: 'View query in Editor'
        },
        { 
          name: 'Select_AwsCURMetadata', 
          badges: [
            { label: '144 CPU-min', type: 'warning' },
            { label: '51 GB memory', type: 'warning' }
          ],
          summary: 'Redundant COUNT query duplicating DELETE logic.',
          whatHappening: [
            'Full scan just to count orphaned rows'
          ],
          recommendations: [
            'Remove this query entirely',
            'Use EXISTS or LIMIT 1 for checks',
            'Use ROW_COUNT() after DELETE instead'
          ],
          sql: `SELECT COUNT(*) as orphaned_count
FROM billing.aws_cost_usage c
LEFT JOIN billing.aws_cur_metadata m
  ON c.billing_period = m.billing_period
WHERE m.billing_period IS NULL;`,
          cta: 'View query in Editor'
        },
        { 
          name: 'Select_sharedtierdatabases', 
          badges: [
            { label: '92 CPU-min', type: 'warning' },
            { label: '5.6 TB memory', type: 'critical' },
            { label: '4.7 TB cache miss', type: 'critical' }
          ],
          summary: 'Massive multi-join + CROSS JOIN causing extreme I/O + cache misses.',
          whatHappening: [
            '10+ table joins',
            'Character set mismatch breaking indexes',
            'CROSS JOIN inflating result size ~50x'
          ],
          recommendations: [
            'Fix charset mismatches (critical)',
            'Precompute aggregation into summary table',
            'Remove CROSS JOIN unpivot (move to ETL/app layer)',
            'Add time partitioning on Events.CreatedAt'
          ],
          sql: `SELECT 
  d.DatabaseName, d.Tier, o.OrgName,
  e.EventType, e.EventCount, e.CreatedAt
FROM SharedTierDatabases d
JOIN Organizations o ON d.OrgID = o.OrgID
JOIN Events e ON d.DatabaseID = e.DatabaseID
CROSS JOIN (
  SELECT 'Read' as MetricType UNION ALL
  SELECT 'Write' UNION ALL
  SELECT 'Delete'
) metrics
WHERE e.CreatedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY);`,
          cta: 'View query in Editor'
        },
        { 
          name: 'InsertSelect_mxp_events', 
          badges: [
            { label: '34 CPU-min', type: 'neutral' },
            { label: '107 GB disk spill', type: 'warning' }
          ],
          summary: 'Query spilling to disk due to large intermediate results.',
          whatHappening: [
            'Memory limit exceeded → disk spill'
          ],
          recommendations: [
            'Increase memory per query OR use larger resource pool',
            'Break into smaller batches'
          ],
          sql: `INSERT INTO analytics.mxp_events_processed
SELECT 
  event_id, user_id, event_type,
  properties, timestamp, processed_at
FROM staging.mxp_events_raw
WHERE processed_at IS NULL
ORDER BY timestamp;`,
          cta: 'View query in Editor'
        }
      ]
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

const LAKEHOUSE_PROMPTS = [
  'Set up real-time speed layer for your data',
  'Check status on speed layer Customer Events',
  'Monitor and manage your real-time data system'
]

const BILLING_PROMPTS = [
  'Diagnose credit burn in last 3 months',
  'Why am I exceeding my credits?',
  'Show workspaces driving the most cost',
  'How can I reduce on-demand usage?'
]

// Billing Conversation Flow (used by Aura Agent on billing page or Support Agent)
const BILLING_CHAT_FLOW = [
  // Message 1: Acknowledge + show usage data
  {
    type: 'agent',
    content: {
      text: [
        { type: 'text', content: "Got it — here's your recent usage and what's projected next." }
      ],
      billingChart: {
        title: 'Credit Usage Trend',
        historical: [
          { month: 'Jan', credits: '90K' },
          { month: 'Feb', credits: '100K' },
          { month: 'Mar', credits: '110K' }
        ],
        forecast: [
          { month: 'Apr', credits: '125K' },
          { month: 'May', credits: '140K' },
          { month: 'Jun', credits: '160K' }
        ]
      },
      analysisText: [
        { type: 'mixed', content: 'Your usage is trending upward — roughly a ', bold: '~45% increase', after: ' over the next quarter. This typically happens when workloads enter a higher traffic phase.' },
        { type: 'bold', content: 'This looks like growth, not just higher usage.' },
        { type: 'text', content: 'Do you want to understand what\'s driving this, or how to handle it?' }
      ],
      actions: ["What's driving the increase?", "How should I handle this?"]
    }
  },
  // Message 2a: What's driving the increase (branch 1)
  {
    type: 'agent',
    branch: 'drivers',
    content: {
      text: [
        { type: 'text', content: 'Your production workloads are the main driver — they\'re scaling with increased demand.' },
        { type: 'text', content: 'At this rate, they\'re likely to hit capacity during peak hours.' }
      ],
      actions: ['Show recommended actions']
    }
  },
  // Message 2b: How should I handle this (branch 2) - goes straight to recommendations
  // Message 3: Recommendations
  {
    type: 'agent',
    branch: 'recommendations',
    content: {
      text: [
        { type: 'text', content: 'Here are my recommendations to handle your growing usage:' }
      ],
      billingRecommendations: [
        {
          title: 'Scale for Peak Demand',
          actionParts: [
            { text: 'Scale from ' },
            { text: 'S-224', bold: true },
            { text: ' → ' },
            { text: 'S-256', bold: true },
            { text: ' during peak demand windows' }
          ],
          cta: 'Scale compute'
        },
        {
          title: 'Configure Auto-Scaling',
          description: 'Stay ahead of spikes by scaling proactively',
          cta: 'Set up'
        },
        {
          title: 'Expand Capacity',
          description: 'Additional capacity will be needed at current growth rate',
          ctas: ['Upgrade Plan', 'Talk to Sales']
        }
      ]
    }
  }
]

const AGENT_CONFIG = {
  'Aura Agent': {
    title: 'Aura Agent',
    description: 'I can help you monitor workspaces, analyze performance, and manage your SingleStore environment.',
    prompts: AURA_PROMPTS,
    placeholder: 'Ask Aura anything...'
  },
  'Data Migration Agent': {
    title: 'Data Migration Agent',
    description: 'I can help you migrate data from PostgreSQL, MySQL, Oracle, MongoDB, and more to SingleStore.',
    prompts: MIGRATION_PROMPTS,
    placeholder: 'Ask about data migration...'
  },
  'Query Tuning Agent': {
    title: 'Query Tuning Agent',
    description: 'I can help you optimize queries, analyze execution plans, and improve database performance.',
    prompts: QUERY_TUNING_PROMPTS,
    placeholder: 'Ask about query optimization...'
  },
  'Lakehouse Agent': {
    title: 'Lakehouse Agent',
    description: 'I can help you set up real-time speed layers for your lakehouse, connect to Snowflake, Databricks, and S3.',
    prompts: LAKEHOUSE_PROMPTS,
    placeholder: 'Ask about lakehouse speed layers...'
  },
  'Support Agent': {
    title: 'Support Agent — Billing & Usage',
    description: 'I can help you monitor credit usage, prevent overages, and optimize compute costs across your workspaces.',
    prompts: BILLING_PROMPTS,
    placeholder: 'Ask about billing, usage, or cost optimization...'
  },
  'Observability Agent': {
    title: 'Observability Assistant',
    description: 'I can help you monitor metrics, analyze logs, and track system health across your infrastructure.',
    prompts: AURA_PROMPTS,
    placeholder: 'Ask about monitoring and observability...'
  },
  'Incident Agent': {
    title: 'Incident Response Assistant',
    description: 'I can help you investigate incidents, identify root causes, and coordinate response actions.',
    prompts: AURA_PROMPTS,
    placeholder: 'Describe the incident...'
  }
}

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

const LAKEHOUSE_CHAT_FLOW = [
  // Scene 1: Initial greeting & source selection
  {
    type: 'agent',
    content: {
      text: [
        { type: 'text', content: "Great — let's set up a real-time speed layer for your lakehouse." }
      ],
      sourceSelector: {
        label: 'Step 1: Select source system',
        options: [
          { id: 'snowflake', label: 'Snowflake', icon: 'snowflake' },
          { id: 'databricks', label: 'Databricks', icon: 'databricks' },
          { id: 's3', label: 'S3 / Data Lake', icon: 's3' }
        ]
      }
    }
  },
  // Scene 2: Connection type selection (after Snowflake selected)
  {
    type: 'agent',
    content: {
      text: [
        { type: 'text', content: 'How would you like to connect?' }
      ],
      connectionTypeSelector: {
        options: [
          { id: 'existing', label: 'Use existing connection' },
          { id: 'new', label: 'Create new connection' }
        ]
      }
    }
  },
  // Scene 3: Snowflake connections list
  {
    type: 'agent',
    content: {
      text: [
        { type: 'text', content: 'Select a Snowflake connection:' }
      ],
      savedConnectionSelector: {
        options: [
          { id: 'snowflake-acme', label: 'Snowflake Acme' },
          { id: 'snowflake-kixo', label: 'Snowflake Kixo' }
        ]
      }
    }
  },
  // Scene 4: Connecting and discovering catalogs progress
  {
    type: 'agent',
    content: {
      progress: true,
      text: 'Connecting to Snowflake...',
      steps: [
        '✓ Connecting to Snowflake...',
        '→ Discovering available Iceberg catalogs...'
      ],
      completedState: {
        text: 'Connected successfully.',
        subtext: ''
      }
    }
  },
  // Scene 5: Iceberg catalogs list (split into Available and External)
  {
    type: 'agent',
    content: {
      text: [
        { type: 'text', content: 'I discovered the following Iceberg catalogs from your connection:' }
      ],
      catalogSelector: {
        availableCatalogs: [
          { id: 'horizon-catalog', label: 'Horizon Catalog' },
          { id: 'polaris-catalog', label: 'Polaris Catalog' }
        ],
        externalCatalogs: [
          { id: 'glue-catalog', label: 'Glue Catalog' }
        ]
      }
    }
  },
  // Scene 6: Discovery progress (after catalog selection)
  {
    type: 'agent',
    content: {
      progress: true,
      text: 'Analyzing datasets...',
      steps: [
        '✓ Connecting to Horizon Catalog',
        '✓ Analyzing datasets...',
        '→ Discovering tables...'
      ],
      completedState: {
        text: 'Discovered 50 tables',
        subtext: ''
      }
    }
  },
  // Scene 5: Discovery result with table preview and proceed options
  {
    type: 'agent',
    content: {
      text: [
        { type: 'text', content: 'Discovered 50 tables.' }
      ],
      tablePreview: {
        title: 'Preview:',
        tables: [
          { name: 'customer' },
          { name: 'orders' },
          { name: 'transactions' }
        ]
      },
      followUp: 'How would you like to proceed?',
      actions: ['Set up speed layer for all tables', 'Select specific tables', 'Explore data']
    }
  },
  // Scene 6: Workspace selection
  {
    type: 'agent',
    content: {
      text: [
        { type: 'text', content: 'Which workspace should this be set up in?' }
      ],
      workspaceSelector: {
        options: [
          { 
            id: 'existing', 
            label: 'Existing workspace', 
            subOptions: [
              { id: 'prod-analytics', name: 'prod-analytics', group: 'Group 1', env: 'Prod', project: 'Acme', projectType: 'Standard', cloudRegion: 'AWS • US East', status: 'active' },
              { id: 'workspace-2', name: 'Workspace-2', group: 'Group 1', env: 'Prod', project: 'Acme', projectType: 'Standard', cloudRegion: 'AWS • US East', status: 'active' },
              { id: 'workspace-1a', name: 'Workspace-1', group: 'Group 1', env: 'Non-Prod', project: 'Acme', projectType: 'Shared', cloudRegion: 'AWS • US East', status: 'paused' },
              { id: 'workspace-1b', name: 'Workspace-1', group: 'Group 1', env: 'Non-Prod', project: 'Kixo', projectType: 'Standard', cloudRegion: 'AWS • US East', status: 'paused' },
              { id: 'workspace-2b', name: 'Workspace-2', group: 'Group 1', env: 'Prod', project: 'Kixo', projectType: 'Enterprise', cloudRegion: 'GCP • US East', status: 'active' },
              { id: 'workspace-2c', name: 'Workspace-2', group: 'Group 1', env: 'Prod', project: 'Acme', projectType: 'Standard', cloudRegion: 'AWS • US East', status: 'active' }
            ]
          },
          { id: 'new', label: 'Create new workspace' }
        ]
      }
    }
  },
  // Scene 7: Execution progress
  {
    type: 'agent',
    content: {
      progress: true,
      text: 'Setting up speed layer...',
      steps: [
        '✓ Optimizing data layout...',
        '✓ Creating speed layer...',
        '→ Enabling real-time sync...'
      ]
    }
  },
  // Scene 8: Success with summary
  {
    type: 'agent',
    content: {
      success: true,
      title: 'Speed layer successfully created! ✅',
      text: 'You can now query your data or monitor performance.',
      speedLayerStats: {
        stats: [
          { label: 'Tables enabled:', value: '50', success: true },
          { label: 'Latency reduced:', value: '~85%', success: true },
          { label: 'Real-time sync:', value: 'Active', success: true }
        ]
      },
      actions: ['Open in SQL Editor', 'View status']
    }
  },
  // Scene 9: Status display with issue warning
  {
    type: 'agent',
    content: {
      text: [
        { type: 'text', content: "Here's the current status:" }
      ],
      speedLayerStatus: {
        stats: [
          { label: 'Tables active:', value: '50' },
          { label: 'Avg latency:', value: '120ms' },
          { label: 'Status:', value: '1 table degraded ⚠️', warning: true }
        ]
      },
      followUp: 'Would you like to debug this issue?',
      actions: ['Debug', 'Ignore for now']
    }
  },
  // Scene 10: Handoff to Observability Agent
  {
    type: 'agent',
    content: {
      progress: true,
      text: 'Switching to Observability Agent...',
      steps: [
        '→ Handing off to Observability Agent...'
      ],
      autoAdvance: true
    }
  },
  // Scene 11: Observability Agent findings
  {
    type: 'agent',
    agentName: 'Observability Agent',
    content: {
      text: [
        { type: 'bold', content: 'Issue detected: pipeline imbalance' }
      ],
      debugResult: {
        title: 'Suggested fix:',
        items: [
          'Rebalance ingestion pipeline',
          'Optimize partitioning'
        ]
      },
      actions: ['Resolve automatically']
    }
  },
  // Scene 12: Resolution success
  {
    type: 'agent',
    agentName: 'Observability Agent',
    content: {
      success: true,
      title: 'Issue resolved! ✅',
      text: 'All tables are now healthy.',
      speedLayerStats: {
        stats: [
          { label: 'Tables healthy:', value: '50 / 50', success: true },
          { label: 'Sync status:', value: 'Real-time', success: true },
          { label: 'Avg latency:', value: '95ms' }
        ]
      }
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
        badge: 'S-160 → S-224',
        impact: ['Reduce latency by 35–50%', 'Eliminate query queueing during peak', 'Increase concurrency capacity by ~40%'],
        cost: '+46,000 CR / month'
      },
      why: [
        'Current workload exceeds S-160 capacity during peak hours',
        'S-224 provides headroom without over-provisioning',
        'S-288 is unnecessary for current load'
      ],
      actions: ['Suggest alternate options', 'Apply resize']
    }
  },
  {
    type: 'agent',
    content: {
      text: [{ type: 'text', content: 'These 5 queries account for 78% of your current CPU load. Optimizing even 2–3 of them could meaningfully reduce pressure on the workspace.' }],
      queries: [
        { 
          name: 'analytics.user_funnel_daily', 
          cpu: '38% CPU share', 
          cpuType: 'critical', 
          time: 'avg 4.2s', 
          frequency: '96 runs/day', 
          desc1: 'Full table scan across 90-day window, no partition pruning', 
          desc2: 'Runs every 15 min via scheduled job',
          sql: `SELECT user_id, event_type, COUNT(*) as event_count
FROM analytics.events
WHERE event_date >= DATE_SUB(NOW(), INTERVAL 90 DAY)
GROUP BY user_id, event_type
ORDER BY event_count DESC;`,
          recommendations: [
            'Add partition pruning on event_date column',
            'Create composite index on (user_id, event_type, event_date)',
            'Consider pre-aggregating data into a summary table'
          ]
        },
        { 
          name: 'analytics.user_funnel_weekly', 
          cpu: '21% CPU share', 
          cpuType: 'critical', 
          time: 'avg 3.8s', 
          frequency: '12 runs/week', 
          desc1: 'Missing index on transaction_date column', 
          desc2: 'Runs every hour via scheduled job',
          sql: `SELECT DATE(transaction_date) as day, SUM(amount) as total
FROM analytics.transactions
WHERE transaction_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(transaction_date);`,
          recommendations: [
            'Add index on transaction_date column',
            'Use columnstore index for aggregation queries',
            'Move to off-peak hours (2-4 AM)'
          ]
        },
        { 
          name: 'analytics.user_funnel_monthly', 
          cpu: '12% CPU share', 
          cpuType: 'warning', 
          time: 'avg 3.5s', 
          frequency: '240 runs/month', 
          desc1: 'Cross-join causing cartesian product', 
          desc2: 'Runs daily via batch processing',
          sql: `SELECT a.user_id, b.product_id, COUNT(*)
FROM analytics.users a, analytics.products b
WHERE a.region = b.region
GROUP BY a.user_id, b.product_id;`,
          recommendations: [
            'Rewrite implicit join as explicit INNER JOIN',
            'Add WHERE clause to filter early',
            'Consider using EXISTS instead of JOIN'
          ]
        },
        { 
          name: 'analytics.user_funnel_quarterly', 
          cpu: '4% CPU share', 
          cpuType: 'warning', 
          time: 'avg 3.0s', 
          frequency: '16 runs/quarter', 
          desc1: 'Summary statistics with partitioning', 
          desc2: 'Runs at the end of each quarter',
          sql: `SELECT quarter, region, AVG(revenue) as avg_revenue
FROM analytics.quarterly_stats
GROUP BY quarter, region;`,
          recommendations: [
            'Query is already well-optimized',
            'Consider caching results for dashboard use',
            'No immediate action required'
          ]
        },
        { 
          name: 'analytics.user_funnel_yearly', 
          cpu: '3% CPU share', 
          cpuType: 'warning', 
          time: 'avg 2.5s', 
          frequency: '~11k runs/year', 
          desc1: 'Snapshot analysis with historical data', 
          desc2: 'Runs annually with data archiving',
          sql: `SELECT YEAR(created_at) as year, COUNT(*) as total_users
FROM analytics.users
GROUP BY YEAR(created_at);`,
          recommendations: [
            'Query performance is acceptable',
            'Consider adding result caching',
            'No optimization needed at this time'
          ]
        }
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
      text: [{ type: 'mixed', content: "You're about to resize prod-analytics from ", bold: 'S-160 → S-224', after: '. This will increase compute capacity and may take a few minutes to complete.' }],
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
        { type: 'mixed', content: 'Workspace ', link: 'prod-analytics', after: ' is now running at S-224.' },
        { type: 'text', content: 'This will reduce memory usage to ~51% and CPU usage to ~28%.' }
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
  const [auraPanelFlow, setAuraPanelFlow] = useState('none') // 'none', 'default', 'cpu-spike', 'migration', 'cpu-spike-v2', 'lakehouse'
  const [auraPanelFlowIndex, setAuraPanelFlowIndex] = useState(0)
  const [migrationFlowIndex, setMigrationFlowIndex] = useState(0)
  const [cpuSpikeV2FlowIndex, setCpuSpikeV2FlowIndex] = useState(0)
  const [billingFlowIndex, setBillingFlowIndex] = useState(0)
  const [lakehouseFlowIndex, setLakehouseFlowIndex] = useState(0)
  const [billingFlowBranch, setBillingFlowBranch] = useState(null) // 'drivers' or 'recommendations'
  const [billingFlowStarted, setBillingFlowStarted] = useState(false) // Guard against double execution
  const [isAuraTyping, setIsAuraTyping] = useState(false)
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)
  // Query Tuning Agent state
  const [queryTuningResult, setQueryTuningResult] = useState(null)
  const [queryTuningContext, setQueryTuningContext] = useState(null)
  const applyQueryRef = useRef(null) // Callback to apply query to editor
  // Editor tab management - for opening queries from Aura
  const [pendingEditorQuery, setPendingEditorQuery] = useState(null)
  // Workspaces state - shared across components
  const [workspacesData, setWorkspacesData] = useState(WORKSPACES_DATA_INITIAL)
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

  // Update workspace data (e.g., after resize)
  const updateWorkspace = (workspaceName, updates) => {
    setWorkspacesData(prev => prev.map(ws => 
      ws.name === workspaceName 
        ? { ...ws, ...updates, justUpdated: true, loading: false }
        : ws
    ))
    // Clear the justUpdated flag after animation
    setTimeout(() => {
      setWorkspacesData(prev => prev.map(ws => 
        ws.name === workspaceName 
          ? { ...ws, justUpdated: false }
          : ws
      ))
    }, 2000)
  }

  // Set workspace loading state (e.g., during resize)
  const setWorkspaceLoading = (workspaceName, isLoading) => {
    setWorkspacesData(prev => prev.map(ws => 
      ws.name === workspaceName 
        ? { ...ws, loading: isLoading }
        : ws
    ))
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

  // Expose startCpuSpikeV2Flow for manual testing (call window.startCpuSpikeV2Flow() in browser console)
  useEffect(() => {
    window.startCpuSpikeV2Flow = startCpuSpikeV2Flow
    return () => { delete window.startCpuSpikeV2Flow }
  }, [])

  // Get default agent based on page context (Priority 4)
  const getDefaultAgentForPage = (pageView) => {
    switch (pageView) {
      case 'load-data':
        return 'Data Migration Agent'
      case 'editor':
        return 'Query Tuning Agent'
      case 'lakehouse':
        return 'Lakehouse Agent'
      case 'billing':
        return 'Aura Agent'
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
    const { agent, context, onApplyQuery, flow } = options
    
    // DEBUG LOGS - Remove after fixing
    console.log('[OPEN_PANEL] called with options:', options)
    console.log('[OPEN_PANEL] hasActiveConversation():', hasActiveConversation())
    console.log('[OPEN_PANEL] currentAgent:', auraPanelAgentName)
    console.log('[OPEN_PANEL] currentView:', view)
    
    // Priority 0: If specific flow is requested (e.g., billing-credit-burn)
    if (flow === 'billing-credit-burn') {
      setAuraPanelAgentName('Aura Agent')
      setAuraPanelOpen(true)
      handleBillingCreditBurnFlow('Diagnose credit burn in last 3 months')
      return
    }
    
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
    
    // Priority 2: If a specific agent is explicitly requested (e.g., Support Agent)
    if (agent) {
      console.log('[OPEN_PANEL] Explicit agent requested:', agent)
      setAuraPanelAgentName(agent)
      setAuraPanelOpen(true)
      return
    }
    
    // Priority 3: If there's an active conversation (user has sent a message), keep current agent
    if (hasActiveConversation()) {
      console.log('[OPEN_PANEL] Active conversation exists, keeping current agent')
      setAuraPanelOpen(true)
      return
    }
    
    // Priority 4: No active conversation, use page context routing
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
    
    // CPU Spike V2 flow: Move conversation between main area and side panel
    const hasCpuSpikeV2Conversation = auraPanelFlow === 'cpu-spike-v2' && auraPanelMessages.length > 0
    
    if (hasCpuSpikeV2Conversation) {
      if (view === 'portal' && newView === 'portal') {
        // Clicking Home/Logo while already on portal → reset conversation and show default home
        setAuraPanelFlow('none')
        setAuraPanelMessages([])
        setCpuSpikeV2FlowIndex(0)
        setAuraPanelOpen(false)
      } else if (view === 'portal' && newView !== 'portal') {
        // Navigating AWAY from Home → move conversation to side panel
        setAuraPanelOpen(true)
      } else if (view !== 'portal' && newView === 'portal') {
        // Navigating BACK to Home → move conversation to main area (close side panel)
        setAuraPanelOpen(false)
      }
    }
    
    // Lakehouse flow: Reset conversation when navigating to Home
    const hasLakehouseConversation = auraPanelFlow === 'lakehouse' && auraPanelMessages.length > 0
    
    if (hasLakehouseConversation) {
      if (view === 'portal' && newView === 'portal') {
        // Clicking Home/Logo while already on portal → reset conversation and show default home
        setAuraPanelFlow('none')
        setAuraPanelMessages([])
        setLakehouseFlowIndex(0)
        setAuraPanelOpen(false)
      } else if (view === 'portal' && newView !== 'portal') {
        // Navigating AWAY from Home → move conversation to side panel
        setAuraPanelOpen(true)
      } else if (view !== 'portal' && newView === 'portal') {
        // Navigating BACK to Home → reset conversation and show default home
        setAuraPanelFlow('none')
        setAuraPanelMessages([])
        setLakehouseFlowIndex(0)
        setAuraPanelOpen(false)
      }
    }
    
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
    // Skip if cpu-spike-v2 flow is active (it uses Aura Agent)
    const shouldSwitchAgent = auraPanelOpen && !hasActiveConversation() && auraPanelFlow !== 'cpu-spike-v2'
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
    setCpuSpikeV2FlowIndex(0)
    setBillingFlowIndex(0)
    setBillingFlowBranch(null)
    setBillingFlowStarted(false)
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
    setCpuSpikeV2FlowIndex(0)
    setBillingFlowIndex(0)
    setBillingFlowBranch(null)
    setBillingFlowStarted(false)
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

  const addNextLakehouseMessage = (index) => {
    if (index >= LAKEHOUSE_CHAT_FLOW.length) return
    setIsAuraTyping(true)
    setTimeout(() => {
      setIsAuraTyping(false)
      const message = LAKEHOUSE_CHAT_FLOW[index]
      
      // Mark previous progress messages as completed (without completedState)
      setAuraPanelMessages(prev => {
        const updated = prev.map(msg => 
          (msg.content?.progress && !msg.content?.completedState) 
            ? { ...msg, content: { ...msg.content, completed: true } } 
            : msg
        )
        return [...updated, { ...message, id: Date.now(), timestamp: new Date() }]
      })
      setLakehouseFlowIndex(index + 1)
      
      // Auto-advance progress messages after a delay
      if (message.content?.progress) {
        const hasSteps = message.content?.steps?.length > 0
        const stepsCount = message.content?.steps?.length || 0
        const stepsDelay = hasSteps ? (800 + (stepsCount * 700) + 400 + 500) : 2500
        
        setTimeout(() => {
          if (message.content?.completedState) {
            setAuraPanelMessages(prev => 
              prev.map(msg => 
                msg.content?.progress && msg.content?.completedState && !msg.content?.completed
                  ? { ...msg, content: { ...msg.content, completed: true } }
                  : msg
              )
            )
            setTimeout(() => addNextLakehouseMessage(index + 1), 2000)
          } else {
            addNextLakehouseMessage(index + 1)
          }
        }, stepsDelay)
      }
      
      // Auto-advance autoAdvance messages
      if (message.content?.autoAdvance && !message.content?.progress) {
        setTimeout(() => addNextLakehouseMessage(index + 1), 2500)
      }
    }, 1000)
  }

  // Billing flow message handler (Aura Agent on billing page or Support Agent)
  const addNextBillingMessage = (messageIndex, branch = null) => {
    let message
    
    if (messageIndex === 0) {
      // First message - usage data
      message = BILLING_CHAT_FLOW[0]
    } else if (branch === 'drivers') {
      // "What's driving the increase?" branch
      message = BILLING_CHAT_FLOW.find(m => m.branch === 'drivers')
    } else if (branch === 'recommendations') {
      // Recommendations (from either branch)
      message = BILLING_CHAT_FLOW.find(m => m.branch === 'recommendations')
    }
    
    if (!message) return
    
    setIsAuraTyping(true)
    setTimeout(() => {
      setIsAuraTyping(false)
      setAuraPanelMessages(prev => [...prev, { ...message, id: Date.now(), timestamp: new Date() }])
      setBillingFlowIndex(messageIndex + 1)
      if (branch) setBillingFlowBranch(branch)
    }, 1000)
  }

  // Check if text triggers billing flow
  const isBillingFlowTrigger = (text) => {
    const lowerText = text.toLowerCase()
    return (
      lowerText.includes('credit burn') ||
      lowerText.includes('last 3 months') ||
      lowerText.includes('usage trend') ||
      lowerText.includes('diagnose credit')
    )
  }

  // SINGLE entry point for billing credit burn flow
  const handleBillingCreditBurnFlow = (userMessage = null) => {
    // Guard against double execution
    if (billingFlowStarted) {
      console.log('[BILLING_FLOW] Already started, skipping')
      return
    }
    
    console.log('[BILLING_FLOW] Starting billing credit burn flow')
    setBillingFlowStarted(true)
    
    // Add user message if provided
    if (userMessage) {
      setAuraPanelMessages(prev => [...prev, { 
        type: 'user', 
        id: Date.now(), 
        text: userMessage, 
        timestamp: new Date() 
      }])
    }
    
    setAuraPanelInput('')
    setAuraPanelFlow('billing')
    setBillingFlowIndex(0)
    setBillingFlowBranch(null)
    
    // Add first billing message
    setTimeout(() => addNextBillingMessage(0), 500)
  }

  const handleAuraPanelSend = (text) => {
    if (!text.trim()) return
    
    // Check for billing flow trigger FIRST and return immediately
    // Triggers when using Aura Agent on billing page OR Support Agent anywhere
    if ((view === 'billing' && auraPanelAgentName === 'Aura Agent' && isBillingFlowTrigger(text)) ||
        (auraPanelAgentName === 'Support Agent' && isBillingFlowTrigger(text))) {
      handleBillingCreditBurnFlow(text)
      return // IMPORTANT: Stop here, don't continue
    }
    
    // For all other flows, add user message normally
    setAuraPanelMessages(prev => [...prev, { type: 'user', id: Date.now(), text, timestamp: new Date() }])
    setAuraPanelInput('')
    
    // Check for lakehouse flow trigger
    if (text.toLowerCase().includes('speed layer') || text.toLowerCase().includes('lakehouse')) {
      setAuraPanelFlow('lakehouse')
      setLakehouseFlowIndex(1)
      setAuraPanelAgentName('Lakehouse Agent')
      setTimeout(() => addNextLakehouseMessage(0), 500)
      return
    }
    
    // Route to correct flow based on active agent
    if (auraPanelAgentName === 'Data Migration Agent') {
      const nextIndex = auraPanelMessages.length === 0 ? 0 : migrationFlowIndex
      setTimeout(() => addNextMigrationMessage(nextIndex), 500)
    } else if (auraPanelAgentName === 'Lakehouse Agent' || auraPanelFlow === 'lakehouse') {
      const nextIndex = auraPanelMessages.length === 0 ? 0 : lakehouseFlowIndex
      setTimeout(() => addNextLakehouseMessage(nextIndex), 500)
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
            actions: ['Analyze workspace capacity', 'Load data from PostgreSQL', 'Set up speed layer for lakehouse', 'Diagnose high CPU usage']
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

  // Add next message for CPU spike investigation V2 flow in side panel
  const addNextCpuSpikeV2Message = (index) => {
    if (index >= CPU_SPIKE_INVESTIGATION_V2_FLOW.length) return
    const message = CPU_SPIKE_INVESTIGATION_V2_FLOW[index]
    setIsAuraTyping(true)
    setTimeout(() => {
      setAuraPanelMessages(prev => [...prev, { ...message, id: Date.now(), timestamp: new Date() }])
      setCpuSpikeV2FlowIndex(index + 1)
      setIsAuraTyping(false)
    }, 500)
  }

  // Start CPU Spike Investigation V2 flow
  // This flow renders in the MAIN conversation area on Home page (not side panel)
  const startCpuSpikeV2Flow = () => {
    // Navigate to Home page
    setView('portal')
    
    // Close side panel - conversation renders in main area on Home
    setAuraPanelOpen(false)
    
    // Clear previous conversation and set up flow
    setAuraPanelMessages([])
    setAuraPanelFlow('cpu-spike-v2')
    setCpuSpikeV2FlowIndex(1)
    setAuraPanelAgentName('Aura Agent')
    
    // Add first message
    setIsAuraTyping(true)
    setTimeout(() => {
      setIsAuraTyping(false)
      const message = CPU_SPIKE_INVESTIGATION_V2_FLOW[0]
      setAuraPanelMessages([{ ...message, id: Date.now(), timestamp: new Date() }])
    }, 500)
  }

  const handleAuraAction = (action) => {
    // Handle structured actions with type
    if (typeof action === 'object' && action.type === 'open-query-in-editor') {
      const { title, query } = action.payload || {}
      // Set pending query for EditorView to pick up
      setPendingEditorQuery({ title: title || 'Optimized Query', query: query || '' })
      // Navigate to editor - this will automatically move chat to side panel
      handleNavigate('editor')
      return
    }
    
    const actionText = typeof action === 'string' ? action : action.text
    setAuraPanelMessages(prev => [...prev, { type: 'user', id: Date.now(), text: actionText, timestamp: new Date() }])
    
    // Route to correct flow based on active flow type
    if (auraPanelAgentName === 'Data Migration Agent' || auraPanelFlow === 'migration') {
      setTimeout(() => addNextMigrationMessage(migrationFlowIndex), 500)
    } else if (auraPanelAgentName === 'Lakehouse Agent' || auraPanelFlow === 'lakehouse') {
      setTimeout(() => addNextLakehouseMessage(lakehouseFlowIndex), 500)
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
    } else if (auraPanelFlow === 'cpu-spike-v2') {
      // Handle CPU spike investigation V2 flow actions
      // Each action adds a SINGLE combined message (not multiple separate messages)
      if (actionText === 'View affected queries' || actionText === 'Investigate spike') {
        // Add Step 1: Investigation results (single message with chart, table, actions)
        setIsAuraTyping(true)
        setTimeout(() => {
          const message = CPU_SPIKE_INVESTIGATION_V2_FLOW[1]
          setAuraPanelMessages(prev => [...prev, { ...message, id: Date.now(), timestamp: new Date() }])
          setCpuSpikeV2FlowIndex(2)
          setIsAuraTyping(false)
        }, 500)
      } else if (actionText === 'Investigate other events') {
        // Add Step 2: Other events (single message with memory chart, analysis, actions)
        setIsAuraTyping(true)
        setTimeout(() => {
          const message = CPU_SPIKE_INVESTIGATION_V2_FLOW[2]
          setAuraPanelMessages(prev => [...prev, { ...message, id: Date.now(), timestamp: new Date() }])
          setCpuSpikeV2FlowIndex(3)
          setIsAuraTyping(false)
        }, 500)
      } else if (actionText === 'Optimize queries') {
        // Add Step 3: Optimization recommendations (single message)
        setIsAuraTyping(true)
        setTimeout(() => {
          const message = CPU_SPIKE_INVESTIGATION_V2_FLOW[3]
          setAuraPanelMessages(prev => [...prev, { ...message, id: Date.now(), timestamp: new Date() }])
          setCpuSpikeV2FlowIndex(4)
          setIsAuraTyping(false)
        }, 500)
      } else {
        // Fallback for unhandled actions
        handleTriggerAction(actionText)
      }
    } else if (auraPanelFlow === 'billing' || auraPanelAgentName === 'Support Agent' || (view === 'billing' && auraPanelAgentName === 'Aura Agent')) {
      // Handle billing flow actions (Aura Agent on billing page or Support Agent)
      if (actionText === "What's driving the increase?") {
        // Show drivers analysis, then will show recommendations
        setTimeout(() => addNextBillingMessage(1, 'drivers'), 500)
      } else if (actionText === "How should I handle this?" || actionText === 'Show recommended actions') {
        // Go straight to recommendations
        setTimeout(() => addNextBillingMessage(2, 'recommendations'), 500)
      } else if (actionText === 'Scale for Peak Demand' || actionText === 'Set Auto-Scaling' || 
                 actionText === 'Upgrade Plan' || actionText === 'Talk to Sales') {
        // Handle CTA clicks - show confirmation
        setIsAuraTyping(true)
        setTimeout(() => {
          setIsAuraTyping(false)
          const response = {
            type: 'agent',
            id: Date.now(),
            timestamp: new Date(),
            content: {
              text: [
                { type: 'text', content: `I've initiated the "${actionText}" action for you.` },
                { type: 'text', content: 'A team member will follow up with next steps shortly.' }
              ]
            }
          }
          setAuraPanelMessages(prev => [...prev, response])
        }, 1000)
      } else {
        // Fallback for unhandled billing actions
        handleTriggerAction(actionText)
      }
    } else if (auraPanelFlow === 'default') {
      // Handle workspace capacity flow actions
      if (['View recommended actions', 'Suggest alternate options', 'Show affected queries'].includes(actionText)) {
        setTimeout(() => addNextPanelMessage(auraPanelFlowIndex), 500)
      } else if (actionText === 'Apply resize' || actionText === 'Resize anyway') {
        setTimeout(() => addNextPanelMessage(3), 500)
      } else if (actionText === 'Confirm') {
        // Set workspace to loading state immediately
        setWorkspaceLoading('prod-analytics', true)
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
          // Update workspace data after successful resize (also clears loading state)
          updateWorkspace('prod-analytics', {
            size: 'S-224',
            sizeDetail: '1792 vCPUs • 14 TB',
            vCPU: 28,
            memory: 51,
            cache: 33
          })
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
    } else if (actionText === 'Set up speed layer for lakehouse') {
      // Start lakehouse flow
      setAuraPanelFlow('lakehouse')
      setLakehouseFlowIndex(1)
      setAuraPanelAgentName('Lakehouse Agent')
      setIsAuraTyping(true)
      setTimeout(() => {
        setIsAuraTyping(false)
        setAuraPanelMessages(prev => [...prev, { ...LAKEHOUSE_CHAT_FLOW[0], id: Date.now(), timestamp: new Date() }])
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
            actions: ['Analyze workspace capacity', 'Load data from PostgreSQL', 'Set up speed layer for lakehouse', 'Diagnose high CPU usage']
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
    // AI-driven investigation notification → Start CPU Spike V2 flow
    if (notification.id === 5 || notification.type === 'ai-investigation') {
      startCpuSpikeV2Flow()
      return
    }
    
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
        // Set workspace to loading state immediately
        setWorkspaceLoading('prod-analytics', true)
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
          // Update workspace data after successful resize (also clears loading state)
          updateWorkspace('prod-analytics', {
            size: 'S-224',
            sizeDetail: '1792 vCPUs • 14 TB',
            vCPU: 28,
            memory: 51,
            cache: 33
          })
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
            // CPU Spike V2 flow props
            auraPanelFlow={auraPanelFlow}
            auraPanelMessages={auraPanelMessages}
            isAuraTyping={isAuraTyping}
            onAction={handleAuraAction}
            chatEndRef={auraChatEndRef}
            // Input props for conversation mode
            auraPanelInput={auraPanelInput}
            setAuraPanelInput={setAuraPanelInput}
            onSend={handleAuraPanelSend}
            agentName={auraPanelAgentName}
            onAgentChange={handleAgentChange}
            onNavigate={setView}
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
            onNavigate={setView}
          />
        )
      case 'workspaces':
        return <WorkspacesView workspacesData={workspacesData} />
      case 'editor':
        return <EditorView onOpenAura={handleOpenAuraPanel} pendingEditorQuery={pendingEditorQuery} onClearPendingQuery={() => setPendingEditorQuery(null)} />
      case 'billing':
        return <BillingPage onOpenAura={handleOpenAuraPanel} />
      case 'lakehouse':
        return <LakehouseView onOpenAura={handleOpenAuraPanel} />
      default:
        return null
    }
  }

  return (
    <>
      <Header 
        onLogoClick={() => handleNavigate('portal')} 
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
            pageContext={view}
            onApplyQuery={handleApplyQueryToEditor}
            onNavigate={setView}
          />
        )}
      </div>
    </>
  )
}

function Sidebar({ onNavigate, currentView, isExpanded, onToggleExpand }) {
  const [expandedItems, setExpandedItems] = useState(['ingestion'])
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [userMenuOpen])

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
    if (item.id === 'lakehouse' && currentView === 'lakehouse') return true
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
    } else if (child.id === 'lakehouse') {
      onNavigate('lakehouse')
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
                      className={`unified-child-item ${(child.id === 'load-data' && currentView === 'load-data') || (child.id === 'lakehouse' && currentView === 'lakehouse') ? 'active' : ''}`}
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
        <div className="unified-user-container" ref={userMenuRef}>
          <div 
            className="unified-user" 
            title={!isExpanded ? "Kabeer Andrabi" : undefined}
            onClick={() => isExpanded && setUserMenuOpen(!userMenuOpen)}
          >
            <div className="unified-user-avatar">KA</div>
            <div className="unified-user-info">
              <span className="unified-user-name">Kabeer Andrabi</span>
              <span className="unified-user-org">S2DB DPS - CLAUDE AI EVALU...</span>
            </div>
            {isExpanded && (
              <button className="unified-user-menu">
                <IconFA name={userMenuOpen ? 'chevron-up' : 'chevron-down'} size={12} />
              </button>
            )}
          </div>
          
          {userMenuOpen && isExpanded && (
            <div className="user-dropdown-menu">
              <div className="user-dropdown-section">
                <span className="user-dropdown-label">Current Organization</span>
                <button className="user-dropdown-org-select">
                  <span>S2DB DPS - Claude AI evaluation</span>
                  <IconFA name="chevron-down" size={12} />
                </button>
              </div>
              
              <div className="user-dropdown-divider" />
              
              <button className="user-dropdown-item" onClick={() => { setUserMenuOpen(false); onNavigate('billing'); }}>
                Billing & Usage
              </button>
              <button className="user-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                Users & Permissions
              </button>
              <button className="user-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                Install Self-Managed
              </button>
              <button className="user-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                Organization Details
              </button>
              
              <div className="user-dropdown-divider" />
              
              <button className="user-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                User Settings
              </button>
              <button className="user-dropdown-item user-dropdown-logout" onClick={() => setUserMenuOpen(false)}>
                <IconFA name="arrow-right-from-bracket" size={14} />
                <span>Log Out</span>
              </button>
            </div>
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

function DataSourceLogo({ name, size = 24 }) {
  switch (name) {
    case 'file-arrow-up':
      return (
        <div className="data-source-logo-icon">
          <IconFA name="file-arrow-up" size={18} />
        </div>
      )
    case 'mongodb':
      return <img src={LOGO_MONGODB} alt="MongoDB" className="data-source-logo-img data-source-logo-mongodb" />
    case 's3':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.686 3.62949C15.135 2.41824 17.5754 1.19215 20.033 0C20.0544 4.0304 20.033 8.07778 20.033 12.1167C17.6396 12.6427 15.2763 13.3046 12.8829 13.8285L13.2126 14.0407L12.7117 13.9834C12.656 12.857 12.7117 11.7285 12.6817 10.6021C12.6817 8.27294 12.686 5.95015 12.686 3.62949V3.62949Z" fill="#8C3223"/>
          <path d="M20.033 0C22.4834 1.21619 24.9353 2.43026 27.3886 3.64221V10.5936C27.3757 11.6712 27.3886 12.7509 27.3886 13.8285L27.2302 13.871C24.839 13.2749 22.4499 12.6618 20.0459 12.1167C20.0309 8.07778 20.0544 4.0304 20.033 0V0Z" fill="#E15343"/>
          <path d="M0 9.90842C1.08749 9.38235 2.16 8.82234 3.25606 8.30899C3.24749 18.7414 3.24749 29.1738 3.25606 39.6061C2.16 39.1076 1.09606 38.5455 0.00856294 38.0194C0.00285431 28.6533 0 19.283 0 9.90842Z" fill="#8C3223"/>
          <path d="M3.25606 8.30899C6.39223 9.10447 9.54982 9.81085 12.6881 10.6063C12.7095 11.7327 12.6624 12.8612 12.7181 13.9876L13.219 14.0449C15.4925 14.4098 17.7424 14.8934 20.018 15.2349C20.0437 16.1449 20.0394 17.0528 20.018 17.9629C17.5819 18.2429 15.135 18.5377 12.6924 18.8793C12.6924 22.2924 12.7053 25.7076 12.6924 29.1207C15.1286 29.4962 17.5819 29.7571 20.0266 30.0626C20.0758 30.9599 20.0437 31.8593 20.0416 32.7587C17.5883 33.1681 15.1436 33.6242 12.701 34.0866V37.33C9.54554 38.1085 6.39223 38.8192 3.24963 39.604C3.26105 29.1731 3.26319 18.7414 3.25606 8.30899V8.30899Z" fill="#E15343"/>
          <path d="M27.3843 10.5936C30.5311 9.81934 33.6845 9.07266 36.8356 8.31961C36.8242 18.4522 36.8242 28.5848 36.8356 38.7173C36.8356 39.0058 36.8056 39.2943 36.78 39.5828C33.6459 38.8467 30.5183 38.0979 27.3864 37.3364C27.3736 36.2546 27.3864 35.1706 27.3864 34.0866C24.9395 33.6242 22.4884 33.1681 20.0308 32.7545C20.0308 31.8551 20.0651 30.9556 20.0159 30.0583C17.5711 29.7592 15.1179 29.492 12.6817 29.1165C12.7052 25.7034 12.6817 22.2881 12.6817 18.875C15.135 18.5377 17.5818 18.2429 20.0287 17.9523C20.0394 17.0423 20.0437 16.1344 20.0287 15.2243C22.0859 14.9337 24.1196 14.4776 26.1769 14.1637C26.5388 14.1052 26.8933 14.0085 27.2344 13.8752L27.3928 13.8328C27.3778 12.7488 27.3714 11.667 27.3843 10.5936V10.5936Z" fill="#8C3223"/>
          <path d="M36.8378 8.31961C37.9081 8.86478 39.0042 9.38024 40.081 9.93389C40.071 19.2943 40.071 28.6548 40.081 38.0152C38.9807 38.5646 37.8675 39.0928 36.7757 39.6634V39.5849C36.8014 39.2965 36.8228 39.008 36.8314 38.7195C36.8328 28.5855 36.8349 18.4522 36.8378 8.31961V8.31961Z" fill="#E15343"/>
          <path d="M12.8893 13.8285C15.2848 13.3046 17.6461 12.6427 20.0394 12.1167C22.4434 12.6618 24.8325 13.2749 27.2237 13.871C26.8826 14.0042 26.5281 14.101 26.1662 14.1594C24.1111 14.4776 22.0774 14.9337 20.018 15.2201C17.7402 14.8807 15.4903 14.3949 13.219 14.0301C13.1098 13.9685 12.9985 13.9007 12.8893 13.8285Z" fill="#5E1F19"/>
          <path d="M20.0565 17.9565C22.497 18.2577 24.9417 18.5462 27.38 18.8793V29.1186C24.9353 29.4707 22.482 29.7762 20.0287 30.0477C20.0629 26.0152 20.0094 21.9848 20.0565 17.9565Z" fill="#E15343"/>
          <path d="M12.6924 34.0824C15.1329 33.6199 17.5797 33.1639 20.033 32.7545C22.4884 33.1681 24.9396 33.6242 27.3886 34.0866C24.9374 34.6848 22.4927 35.3233 20.0309 35.8833C17.5776 35.3042 15.135 34.6933 12.6924 34.0824V34.0824Z" fill="#F2B0A9"/>
          <path d="M12.686 37.3343C12.6967 36.2524 12.686 35.1727 12.686 34.0909C15.1286 34.6997 17.5733 35.3127 20.0223 35.8918C20.048 39.9222 20.033 43.9653 20.0223 48C17.5626 46.81 15.1222 45.5817 12.671 44.3705C12.681 42.0216 12.686 39.6761 12.686 37.3343Z" fill="#8C3223"/>
          <path d="M20.0287 35.8855C22.4905 35.3254 24.9352 34.6869 27.3864 34.0887C27.3757 35.1706 27.3714 36.2546 27.3864 37.3385C27.3971 39.6719 27.3864 42.0053 27.3864 44.3536C24.9345 45.5655 22.4841 46.7796 20.0351 47.9958C20.0394 43.9569 20.0544 39.9201 20.0287 35.8855Z" fill="#E15343"/>
        </svg>
      )
    case 'mysql':
      return (
        <div className="data-source-logo-mysql">
          <img src={LOGO_MYSQL_TEXT} alt="" className="mysql-text" />
          <img src={LOGO_MYSQL_DOLPHIN} alt="" className="mysql-dolphin" />
        </div>
      )
    case 'oracle':
      return <img src={LOGO_ORACLE} alt="Oracle" className="data-source-logo-img" />
    case 'postgresql':
      return <img src={LOGO_POSTGRESQL} alt="PostgreSQL" className="data-source-logo-img" />
    case 'sqlserver':
      return <img src={LOGO_SQLSERVER} alt="SQL Server" className="data-source-logo-img" />
    case 'snowflake':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" clipRule="evenodd" d="M16.03 24.8773C16.1315 24.5586 16.1738 24.2306 16.1662 23.9064C16.1544 23.6718 16.1239 23.4372 16.057 23.2027C15.8557 22.4739 15.3785 21.8233 14.6635 21.4132L4.49464 15.5687C3.05915 14.7464 1.22906 15.2352 0.404944 16.6618C-0.426794 18.0867 0.0639464 19.9062 1.49936 20.7306L7.18176 24.0019L1.49936 27.2635C0.0639464 28.0896 -0.425092 29.9092 0.404944 31.3399C1.22906 32.7627 3.05915 33.2494 4.49464 32.4271L14.6635 26.5789C15.3497 26.186 15.8155 25.5696 16.03 24.8773ZM18.7896 30.3538C18.2053 30.3041 17.5978 30.4262 17.0516 30.7428L6.87506 36.5835C5.44345 37.4076 4.9545 39.2367 5.78064 40.6637C6.61068 42.0868 8.43906 42.577 9.86864 41.7492L15.5702 38.4758V45.0167C15.5702 46.6648 16.9096 48 18.5675 48C20.2174 48 21.5611 46.6648 21.5611 45.0167V33.3236C21.5611 31.7538 20.3384 30.4641 18.7896 30.3538ZM29.2115 17.6459C29.7941 17.6935 30.3999 17.5696 30.946 17.2568L41.1206 11.4106C42.5542 10.5862 43.0408 8.76464 42.2167 7.33426C41.3909 5.90929 39.5607 5.42093 38.1288 6.24498L32.4314 9.52211V2.97913C32.4314 1.33524 31.0916 0 29.4341 0C27.7761 0 26.4402 1.33524 26.4402 2.97913V14.6722C26.4402 16.2403 27.6594 17.5317 29.2115 17.6459ZM6.87506 11.4106L17.0516 17.2568C17.5978 17.5696 18.2053 17.6935 18.7896 17.6459C20.3384 17.5317 21.5611 16.2403 21.5611 14.6722V2.97913C21.5611 1.33524 20.2174 0 18.5675 0C16.9096 0 15.5702 1.33524 15.5702 2.97913V9.52211L9.86864 6.24498C8.43906 5.42093 6.61068 5.90929 5.78064 7.33426C4.9545 8.76464 5.44345 10.5862 6.87506 11.4106ZM25.9994 23.977C25.9994 23.8073 25.8961 23.5707 25.7754 23.4449L24.5507 22.2317C24.4302 22.1116 24.1924 22.0123 24.0216 22.0123H23.9737C23.8032 22.0123 23.5659 22.1116 23.447 22.2317L22.2222 23.4449C22.0996 23.5707 22.0057 23.8073 22.0057 23.977V24.0247C22.0057 24.1927 22.0996 24.4272 22.2222 24.5493L23.447 25.7662C23.5676 25.8863 23.8032 25.9856 23.9737 25.9856H24.0216C24.1924 25.9856 24.4302 25.8863 24.5507 25.7662L25.7754 24.5493C25.8961 24.4272 25.9994 24.1927 25.9994 24.0247V23.977ZM29.3803 25.1443L25.1506 29.3487C25.0297 29.4725 24.7961 29.5736 24.6197 29.5736H24.313H23.6882H23.3759C23.2051 29.5736 22.9677 29.4725 22.845 29.3487L18.6174 25.1443C18.4965 25.026 18.3987 24.7876 18.3987 24.62V24.3089V23.687V23.38C18.3987 23.2082 18.4965 22.9698 18.6174 22.8498L22.845 18.6455C22.9677 18.5217 23.2051 18.4244 23.3759 18.4244H23.6882H24.313H24.6197C24.7923 18.4244 25.0297 18.5217 25.1506 18.6455L29.3803 22.8498C29.501 22.9698 29.5987 23.2082 29.5987 23.38V23.687V24.3089V24.62C29.5987 24.7876 29.501 25.026 29.3803 25.1443ZM41.1206 36.5835L30.946 30.7428C30.3999 30.4262 29.7941 30.3041 29.2115 30.3538C27.6594 30.4641 26.4402 31.7538 26.4402 33.3236V45.0167C26.4402 46.6648 27.7761 48 29.4341 48C31.0916 48 32.4314 46.6648 32.4314 45.0167V38.4758L38.1288 41.7492C39.5604 42.577 41.3909 42.0868 42.2167 40.6637C43.0408 39.2367 42.5542 37.4076 41.1206 36.5835ZM46.5001 20.7306L40.8177 24.0019L46.5001 27.2635C47.9356 28.0896 48.4262 29.9092 47.5963 31.3399C46.7684 32.7627 44.9365 33.2494 43.5066 32.4271L33.33 26.5789C32.6514 26.186 32.1801 25.5696 31.9712 24.8773C31.8717 24.5586 31.8256 24.2306 31.837 23.9064C31.8429 23.6718 31.8772 23.4372 31.9424 23.2027C32.1458 22.4739 32.623 21.8236 33.33 21.4132L43.5066 15.5687C44.9365 14.7464 46.7684 15.2352 47.5963 16.6618C48.4262 18.0867 47.9356 19.9062 46.5001 20.7306Z" fill="#29B5E8"/>
        </svg>
      )
    case 'databricks':
      return (
        <svg width={size} height={size} viewBox="0 0 46 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 13.7702V12.4292L5.30454 9.44924C10.9112 6.36995 16.5212 3.28735 22.1346 0.201435C22.3216 0.0704546 22.5459 0 22.7761 0C23.0062 0 23.2306 0.0704546 23.4175 0.201435C28.6712 3.1218 33.9418 6.01898 39.2294 8.89299C39.9218 9.27045 40.2476 9.66776 40.0032 10.4922L38.6592 11.2273L22.7761 2.496L3.58386 13.055C3.81803 13.2139 3.97075 13.343 4.15402 13.4424C10.1815 16.7534 16.2022 20.0645 22.216 23.3756C22.3844 23.4866 22.5831 23.5459 22.7863 23.5459C22.9895 23.5459 23.1881 23.4866 23.3564 23.3756L39.8912 14.2768C41.1334 13.5914 42.3958 12.9556 43.5973 12.2206C43.8272 12.025 44.122 11.9172 44.4271 11.9172C44.7322 11.9172 45.0269 12.025 45.2569 12.2206L45.5522 12.4093V21.0115L39.1479 24.5576C33.9757 27.4085 28.7933 30.2394 23.6415 33.1201C23.3827 33.29 23.0778 33.3808 22.7659 33.3808C22.4539 33.3808 22.1491 33.29 21.8903 33.1201C15.6388 29.6501 9.37377 26.2032 3.09516 22.7796L2.525 22.4816C2.48246 22.678 2.45521 22.8772 2.44353 23.0776C2.44353 24.1901 2.44353 25.3126 2.44353 26.4251C2.42312 26.5981 2.45945 26.7731 2.54725 26.9247C2.63505 27.0764 2.76984 27.1971 2.93229 27.2694C9.38059 30.7924 15.8289 34.3286 22.2772 37.8781C22.4297 37.9715 22.6062 38.0211 22.7863 38.0211C22.9664 38.0211 23.1428 37.9715 23.2953 37.8781L43.1188 26.9515C43.3231 26.8617 43.5175 26.7519 43.6991 26.6237C43.8279 26.5085 43.9803 26.4211 44.1461 26.3672C44.312 26.3133 44.4876 26.2942 44.6615 26.311C44.8355 26.3279 45.0038 26.3804 45.1556 26.4651C45.3073 26.5498 45.4389 26.6648 45.542 26.8025V35.4842L22.7557 48L0.0305123 35.4842V33.9743C0.20597 33.8827 0.372892 33.7764 0.529397 33.6565C0.670391 33.5363 0.851258 33.4701 1.03847 33.4701C1.22569 33.4701 1.40656 33.5363 1.54755 33.6565L10.9451 38.8316C14.6818 40.8878 18.4286 42.944 22.1448 45.0101C22.3272 45.1288 22.5415 45.1922 22.7608 45.1922C22.9801 45.1922 23.1944 45.1288 23.3768 45.0101C29.9201 41.3944 36.4906 37.7787 43.0882 34.1631V29.6335C42.8438 29.7428 42.6504 29.8222 42.4773 29.9216L23.9673 40.0932C22.8066 40.7289 22.8066 40.7388 21.6459 40.0932C14.6546 36.2457 7.66327 32.3982 0.671954 28.5508L0.0203208 28.1832V19.4818L0.44799 19.2235C0.610921 19.0953 0.813932 19.0254 1.02325 19.0254C1.23257 19.0254 1.43551 19.0953 1.59845 19.2235C3.23767 20.1473 4.89731 21.0413 6.54672 21.9551C11.78 24.8159 17.0031 27.6866 22.216 30.5672C22.3844 30.6782 22.5831 30.7376 22.7863 30.7376C22.9895 30.7376 23.1881 30.6782 23.3564 30.5672C29.7572 27.031 36.1716 23.5114 42.5995 20.0082C42.7753 19.9319 42.9221 19.8035 43.019 19.6413C43.1158 19.479 43.1579 19.2912 43.1391 19.1043C43.1391 17.8329 43.1391 16.5515 43.1391 15.131L42.121 15.6774L23.4073 25.988C23.2455 26.0867 23.0585 26.139 22.8677 26.139C22.6769 26.139 22.4899 26.0867 22.3281 25.988C15.011 21.9419 7.68022 17.9057 0.335946 13.8794L0 13.7702Z" fill="#E8372A"/>
        </svg>
      )
    default:
      return <IconFA name="database" size={20} />
  }
}

const INITIAL_NOTIFICATIONS = [
  {
    id: 5,
    type: 'ai-investigation',
    icon: 'sparkles',
    title: 'CPU anomaly detected',
    message: 'Unusual workload patterns identified on this cluster. Aura has analyzed potential causes and can guide you through the investigation.',
    time: 'Today at 03:45 AM',
    action: 'Investigate Spike',
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

const WORKSPACES_DATA_INITIAL = [
  {
    id: 0,
    name: 'prod-analytics',
    group: 'Group 1',
    environment: 'Prod',
    project: 'Acme',
    edition: 'Standard',
    cloudRegion: 'AWS • US East',
    size: 'S-160',
    sizeDetail: '1280 vCPUs • 10 TB',
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
    size: 'S-320',
    sizeDetail: '2560 vCPUs • 20 TB',
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
    size: 'S-288',
    sizeDetail: '2304 vCPUs • 18 TB',
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
    size: 'S-384',
    sizeDetail: '3072 vCPUs • 24 TB',
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
    size: 'S-352',
    sizeDetail: '2816 vCPUs • 22 TB',
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
    size: 'S-256',
    sizeDetail: '2048 vCPUs • 16 TB',
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

// ============================================
// BILLING PAGE COMPONENT
// ============================================

// Capacity ceiling for contracted usage
const BILLING_CAPACITY_LIMIT = 4500

const BILLING_CHART_DATA = [
  // Past data (Days 1-21) - Gradual rise pattern with smooth variation
  // Week 1: Steady start, slight rise
  { day: 1, label: 'Mar 1', contracted: 2800, onDemand: 0, forecastContracted: 0, forecastOnDemand: 0 },
  { day: 2, label: 'Mar 2', contracted: 2900, onDemand: 0, forecastContracted: 0, forecastOnDemand: 0 },
  { day: 3, label: 'Mar 3', contracted: 3000, onDemand: 0, forecastContracted: 0, forecastOnDemand: 0 },
  { day: 4, label: 'Mar 4', contracted: 3050, onDemand: 0, forecastContracted: 0, forecastOnDemand: 0 },
  { day: 5, label: 'Mar 5', contracted: 3100, onDemand: 0, forecastContracted: 0, forecastOnDemand: 0 },
  { day: 6, label: 'Mar 6', contracted: 3000, onDemand: 0, forecastContracted: 0, forecastOnDemand: 0 },
  { day: 7, label: 'Mar 7', contracted: 2850, onDemand: 0, forecastContracted: 0, forecastOnDemand: 0 },
  // Week 2: Slight dip then recovery
  { day: 8, label: 'Mar 8', contracted: 3000, onDemand: 0, forecastContracted: 0, forecastOnDemand: 0 },
  { day: 9, label: 'Mar 9', contracted: 3150, onDemand: 0, forecastContracted: 0, forecastOnDemand: 0 },
  { day: 10, label: 'Mar 10', contracted: 3250, onDemand: 0, forecastContracted: 0, forecastOnDemand: 0 },
  { day: 11, label: 'Mar 11', contracted: 3350, onDemand: 0, forecastContracted: 0, forecastOnDemand: 0 },
  { day: 12, label: 'Mar 12', contracted: 3400, onDemand: 0, forecastContracted: 0, forecastOnDemand: 0 },
  { day: 13, label: 'Mar 13', contracted: 3350, onDemand: 0, forecastContracted: 0, forecastOnDemand: 0 },
  { day: 14, label: 'Mar 14', contracted: 3200, onDemand: 0, forecastContracted: 0, forecastOnDemand: 0 },
  // Week 3: Steady growth toward capacity
  { day: 15, label: 'Mar 15', contracted: 3400, onDemand: 0, forecastContracted: 0, forecastOnDemand: 0 },
  { day: 16, label: 'Mar 16', contracted: 3600, onDemand: 0, forecastContracted: 0, forecastOnDemand: 0 },
  { day: 17, label: 'Mar 17', contracted: 3850, onDemand: 0, forecastContracted: 0, forecastOnDemand: 0 },
  { day: 18, label: 'Mar 18', contracted: 4100, onDemand: 0, forecastContracted: 0, forecastOnDemand: 0 },
  { day: 19, label: 'Mar 19', contracted: 4350, onDemand: 0, forecastContracted: 0, forecastOnDemand: 0 },
  // Hitting capacity - On-demand kicks in
  { day: 20, label: 'Mar 20', contracted: 4500, onDemand: 350, forecastContracted: 0, forecastOnDemand: 0 },
  { day: 21, label: 'Mar 21', contracted: 4500, onDemand: 650, forecastContracted: 0, forecastOnDemand: 0, isToday: true },
  // Forecast (Days 22-31) - Rise, stabilize, rise pattern
  { day: 22, label: 'Mar 22', contracted: 0, onDemand: 0, forecastContracted: 4500, forecastOnDemand: 800 },
  { day: 23, label: 'Mar 23', contracted: 0, onDemand: 0, forecastContracted: 4500, forecastOnDemand: 950 },
  { day: 24, label: 'Mar 24', contracted: 0, onDemand: 0, forecastContracted: 4500, forecastOnDemand: 1050 },
  { day: 25, label: 'Mar 25', contracted: 0, onDemand: 0, forecastContracted: 4500, forecastOnDemand: 1100 },
  { day: 26, label: 'Mar 26', contracted: 0, onDemand: 0, forecastContracted: 4500, forecastOnDemand: 1050 },
  { day: 27, label: 'Mar 27', contracted: 0, onDemand: 0, forecastContracted: 4500, forecastOnDemand: 1100 },
  { day: 28, label: 'Mar 28', contracted: 0, onDemand: 0, forecastContracted: 4500, forecastOnDemand: 1250 },
  { day: 29, label: 'Mar 29', contracted: 0, onDemand: 0, forecastContracted: 4500, forecastOnDemand: 1400 },
  { day: 30, label: 'Mar 30', contracted: 0, onDemand: 0, forecastContracted: 4500, forecastOnDemand: 1550 },
  { day: 31, label: 'Mar 31', contracted: 0, onDemand: 0, forecastContracted: 4500, forecastOnDemand: 1700 },
]

const BILLING_RESOURCES_DATA = [
  { 
    id: 1,
    name: 'Production Analytics',
    subtitle: 'Analytics',
    type: 'Deployment',
    edition: 'Standard',
    cloud: 'AWS',
    region: 'US West 2 (Oregon)',
    size: 'S-224',
    status: 'Active',
    creditUsage: '70,000 CR'
  },
  { 
    id: 2,
    name: 'Develop Analytics',
    subtitle: 'Analytics',
    type: 'Deployment',
    edition: 'Standard',
    cloud: 'AWS',
    region: 'US West 2 (Oregon)',
    size: 'S-160',
    status: 'Active',
    creditUsage: '30,000 CR'
  },
  { 
    id: 3,
    name: 'Staging Analytics',
    subtitle: 'Analytics',
    type: 'Deployment',
    edition: 'Standard',
    cloud: 'AWS',
    region: 'US West 2 (Oregon)',
    size: 'S-80',
    status: 'Suspended',
    creditUsage: '10,000 CR'
  },
]

function BillingPage({ onOpenAura }) {
  const [activeTab, setActiveTab] = useState('usage')
  const [viewMode, setViewMode] = useState('month')
  const [chartType, setChartType] = useState('chart')
  const [searchQuery, setSearchQuery] = useState('')

  const maxChartValue = 7500
  const barWidth = 24
  const chartHeight = 200
  const todayIndex = 21 // Day 21 (Mar 21) is "today"
  const [hoveredBar, setHoveredBar] = useState(null)

  return (
    <div className="billing-page">
      <div className="billing-container">
        {/* Header Section */}
        <div className="billing-header">
          <div className="billing-title-row">
            <IconFA name="browser" size={20} />
            <h1 className="billing-title">Usage & Billing</h1>
          </div>
          
          {/* Tabs */}
          <div className="billing-tabs">
            <button 
              className={`billing-tab ${activeTab === 'usage' ? 'active' : ''}`}
              onClick={() => setActiveTab('usage')}
            >
              Usage Estimate
            </button>
            <button 
              className={`billing-tab ${activeTab === 'billing' ? 'active' : ''}`}
              onClick={() => setActiveTab('billing')}
            >
              Billing info
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="billing-filters">
          <div className="billing-filters-left">
            <button className="billing-filter-btn">
              <span className="filter-label">Time period:</span>
              <span className="filter-value">Last 6 months</span>
              <IconFA name="chevron-down" size={12} />
            </button>
            <div className="billing-filter-divider" />
            <button className="billing-filter-btn">
              <IconFA name="folder" size={14} />
              <span className="filter-value">All</span>
              <IconFA name="chevron-down" size={12} />
            </button>
            <div className="billing-filter-divider" />
            <button className="billing-filter-btn">
              <span className="filter-label">Name:</span>
              <span className="filter-value">All</span>
              <IconFA name="chevron-down" size={12} />
            </button>
            <button className="billing-filter-btn">
              <span className="filter-label">Type:</span>
              <span className="filter-value">All</span>
              <IconFA name="chevron-down" size={12} />
            </button>
            <button className="billing-filter-btn">
              <span className="filter-label">Cloud:</span>
              <span className="filter-value">All</span>
              <IconFA name="chevron-down" size={12} />
            </button>
            <button className="billing-filter-btn">
              <span className="filter-label">Region:</span>
              <span className="filter-value">All</span>
              <IconFA name="chevron-down" size={12} />
            </button>
          </div>
          <button className="billing-download-btn">
            <IconFA name="download" size={14} />
            <span>Download Report</span>
          </button>
        </div>

        {/* Alert Banner */}
        <div className="billing-toast">
          <div className="billing-toast-border"></div>
          <div className="billing-toast-content">
            <div className="billing-toast-left">
              <div className="billing-toast-icon">
                <IconFA name="circle-info" size={16} />
              </div>
              <div className="billing-toast-text">
                <div className="billing-toast-title">
                  ~55% growth projected next quarter based on recent usage
                </div>
                <div className="billing-toast-subtitle">
                  Your compute usage has increased steadily over the last 3 months. Plan ahead to maintain performance as demand continues to rise.
                </div>
              </div>
            </div>
            <button 
              className="billing-toast-btn"
              onClick={() => onOpenAura && onOpenAura({ flow: 'billing-credit-burn' })}
            >
              <IconFA name="sparkles" size={14} />
              <span>View insights</span>
            </button>
          </div>
        </div>

        {/* Usage Cards */}
        <div className="billing-cards">
          {/* Compute Card */}
          <div className="billing-card billing-card-compute">
            <div className="billing-card-header">
              <div className="billing-card-title">
                <IconFA name="microchip" size={16} />
                <span>Compute</span>
                <IconFA name="circle-info" size={12} />
              </div>
              <span className="billing-card-badge billing-card-badge-warning">
                Credit remaining: 50K CR
              </span>
            </div>
            <div className="billing-card-usage">
              <span className="billing-card-used">110K CR used</span>
              <div className="billing-card-estimated">
                <span>of 160K CR estimated</span>
                <IconFA name="circle-info" size={10} />
              </div>
            </div>
            <div className="billing-progress-bar">
              <div className="billing-progress-contracted" style={{ width: '52%' }}></div>
              <div className="billing-progress-ondemand" style={{ width: '13%', left: '52%' }}></div>
              <div className="billing-progress-forecast" style={{ width: '35%', left: '65%' }}></div>
            </div>
          </div>

          {/* Storage Card */}
          <div className="billing-card">
            <div className="billing-card-header">
              <div className="billing-card-title">
                <IconFA name="database" size={16} />
                <span>Storage</span>
                <IconFA name="circle-info" size={12} />
              </div>
            </div>
            <div className="billing-card-usage">
              <span className="billing-card-used">8.4 TB used</span>
              <div className="billing-card-estimated">
                <span>of 12 TB estimated</span>
                <IconFA name="circle-info" size={10} />
              </div>
            </div>
            <div className="billing-progress-bar">
              <div className="billing-progress-contracted" style={{ width: '6%' }}></div>
              <div className="billing-progress-forecast" style={{ width: '94%', left: '6%' }}></div>
            </div>
          </div>

          {/* Transfer Card */}
          <div className="billing-card billing-card-disabled">
            <div className="billing-card-header">
              <div className="billing-card-title">
                <IconFA name="server" size={16} />
                <span>Transfer</span>
                <IconFA name="circle-info" size={12} />
              </div>
            </div>
            <div className="billing-card-usage">
              <span className="billing-card-used">0 GB used</span>
              <span className="billing-card-estimated-simple">of 0 GB estimated</span>
            </div>
          </div>
        </div>

        {/* Monthly Chart Section */}
        <div className="billing-chart-section">
          <div className="billing-chart-header">
            <h2 className="billing-chart-title">Monthly Compute Credits Usage</h2>
            <div className="billing-chart-controls">
              <div className="billing-chart-view-toggle">
                <span className="billing-chart-label">Info view</span>
                <div className="billing-toggle-group">
                  <button 
                    className={`billing-toggle-btn ${chartType === 'chart' ? 'active' : ''}`}
                    onClick={() => setChartType('chart')}
                  >
                    <IconFA name="chart-column" size={14} />
                  </button>
                  <button 
                    className={`billing-toggle-btn ${chartType === 'table' ? 'active' : ''}`}
                    onClick={() => setChartType('table')}
                  >
                    <IconFA name="table" size={14} />
                  </button>
                </div>
              </div>
              <div className="billing-chart-divider" />
              <div className="billing-toggle-group">
                <button 
                  className={`billing-toggle-btn billing-toggle-text ${viewMode === 'month' ? 'active' : ''}`}
                  onClick={() => setViewMode('month')}
                >
                  Month
                </button>
                <button 
                  className={`billing-toggle-btn billing-toggle-text ${viewMode === 'day' ? 'active' : ''}`}
                  onClick={() => setViewMode('day')}
                >
                  Day
                </button>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="billing-chart-legend">
            <div className="billing-legend-item">
              <span className="billing-legend-dot billing-legend-contracted"></span>
              <span>Contracted</span>
            </div>
            <div className="billing-legend-item">
              <span className="billing-legend-dot billing-legend-ondemand"></span>
              <span>On-demand</span>
            </div>
            <div className="billing-legend-item">
              <span className="billing-legend-dot billing-legend-forecast-contracted"></span>
              <span>Contracted forecasted</span>
            </div>
            <div className="billing-legend-item">
              <span className="billing-legend-dot billing-legend-forecast-ondemand"></span>
              <span>On-demand forecasted</span>
            </div>
            <div className="billing-legend-item">
              <span className="billing-legend-line"></span>
              <span>Today</span>
            </div>
          </div>

          {/* Chart */}
          <div className="billing-chart-container">
            <div className="billing-chart-y-axis">
              <span>7.5K</span>
              <span>6K</span>
              <span>4.5K</span>
              <span>3K</span>
              <span>1.5K</span>
              <span>0</span>
            </div>
            <div className="billing-chart-y-label">Credits</div>
            <div className="billing-chart-area">
              {/* Grid lines */}
              <div className="billing-chart-grid">
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="billing-chart-gridline"></div>
                ))}
              </div>

              {/* Capacity ceiling line */}
              <div 
                className="billing-capacity-line"
                style={{ bottom: `${(BILLING_CAPACITY_LIMIT / maxChartValue) * 100}%` }}
              >
                <span className="billing-capacity-label">Capacity</span>
              </div>
              
              {/* Today marker */}
              <div className="billing-chart-today" style={{ left: `${(todayIndex / BILLING_CHART_DATA.length) * 100}%` }}>
                <span className="billing-today-label">Today</span>
                <div className="billing-today-line"></div>
              </div>

              {/* Forecast background */}
              <div className="billing-chart-forecast-bg" style={{ left: `${(todayIndex / BILLING_CHART_DATA.length) * 100}%` }}></div>

              {/* Bars */}
              <div className="billing-chart-bars">
                {BILLING_CHART_DATA.map((data, index) => {
                  const contractedHeight = (data.contracted / maxChartValue) * chartHeight
                  const onDemandHeight = (data.onDemand / maxChartValue) * chartHeight
                  const forecastContractedHeight = (data.forecastContracted / maxChartValue) * chartHeight
                  const forecastOnDemandHeight = (data.forecastOnDemand / maxChartValue) * chartHeight
                  const totalContracted = data.contracted + data.forecastContracted
                  const totalOnDemand = data.onDemand + data.forecastOnDemand
                  const total = totalContracted + totalOnDemand
                  const showLabel = data.day === 1 || data.day % 5 === 0 || data.day === 31
                  
                  return (
                    <div 
                      key={data.day} 
                      className={`billing-chart-bar-group ${data.isToday ? 'today' : ''}`}
                      onMouseEnter={() => setHoveredBar(index)}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      <div className="billing-chart-bar-stack" style={{ height: chartHeight }}>
                        {/* Contracted (solid blue) */}
                        {data.contracted > 0 && (
                          <div 
                            className="billing-bar billing-bar-contracted"
                            style={{ height: contractedHeight }}
                          ></div>
                        )}
                        {/* On-demand (solid orange) */}
                        {data.onDemand > 0 && (
                          <div 
                            className="billing-bar billing-bar-ondemand"
                            style={{ height: onDemandHeight, bottom: contractedHeight }}
                          ></div>
                        )}
                        {/* Forecast contracted (striped blue) */}
                        {data.forecastContracted > 0 && (
                          <div 
                            className="billing-bar billing-bar-forecast-contracted"
                            style={{ height: forecastContractedHeight }}
                          ></div>
                        )}
                        {/* Forecast on-demand (striped orange) */}
                        {data.forecastOnDemand > 0 && (
                          <div 
                            className="billing-bar billing-bar-forecast-ondemand"
                            style={{ height: forecastOnDemandHeight, bottom: forecastContractedHeight }}
                          ></div>
                        )}
                      </div>
                      {showLabel && <span className="billing-chart-bar-label">{data.day}</span>}
                      {/* Tooltip */}
                      {hoveredBar === index && (
                        <div className="billing-chart-tooltip">
                          <div className="billing-tooltip-date">{data.label}, 2026</div>
                          <div className="billing-tooltip-row">
                            <span className="billing-tooltip-dot contracted"></span>
                            <span>Contracted:</span>
                            <span className="billing-tooltip-value">{totalContracted.toLocaleString()} CR</span>
                          </div>
                          <div className="billing-tooltip-row">
                            <span className="billing-tooltip-dot ondemand"></span>
                            <span>On-demand:</span>
                            <span className="billing-tooltip-value">{totalOnDemand.toLocaleString()} CR</span>
                          </div>
                          <div className="billing-tooltip-total">
                            <span>Total:</span>
                            <span>{total.toLocaleString()} CR</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="billing-chart-x-label">March 2026</div>
          </div>
        </div>

        {/* Resources List */}
        <div className="billing-resources-section">
          <div className="billing-resources-header">
            <div className="billing-resources-title-row">
              <h2 className="billing-resources-title">Resources List</h2>
              <div className="billing-resources-actions">
                <div className="billing-search">
                  <IconFA name="search" size={14} />
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button className="billing-simulate-btn">
                  <IconFA name="play" size={12} />
                  <span>Simulate changes</span>
                </button>
              </div>
            </div>
            <div className="billing-resources-subtitle">
              Active resources: 2 | Suspended resources: 1
            </div>
          </div>

          {/* Table */}
          <div className="billing-table-container">
            <table className="billing-table">
              <thead>
                <tr>
                  <th className="billing-th-checkbox">
                    <input type="checkbox" />
                  </th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Edition</th>
                  <th>Cloud</th>
                  <th>Region</th>
                  <th>Size</th>
                  <th>Status</th>
                  <th className="billing-th-right">Credit usage</th>
                </tr>
              </thead>
              <tbody>
                {BILLING_RESOURCES_DATA.map(resource => (
                  <tr key={resource.id}>
                    <td className="billing-td-checkbox">
                      <input type="checkbox" />
                    </td>
                    <td>
                      <div className="billing-resource-name">
                        <span className="billing-resource-primary">{resource.name}</span>
                        <span className="billing-resource-secondary">{resource.subtitle}</span>
                      </div>
                    </td>
                    <td>{resource.type}</td>
                    <td>{resource.edition}</td>
                    <td>{resource.cloud}</td>
                    <td>{resource.region}</td>
                    <td>{resource.size}</td>
                    <td>
                      <span className={`billing-status ${resource.status === 'Active' ? 'billing-status-active' : 'billing-status-suspended'}`}>
                        {resource.status === 'Active' && <span className="billing-status-dot"></span>}
                        {resource.status === 'Suspended' && <IconFA name="pause" size={10} />}
                        {resource.status}
                      </span>
                    </td>
                    <td className="billing-td-right">{resource.creditUsage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// Lakehouse speed layers data
const LAKEHOUSE_SPEED_LAYERS = [
  {
    id: 1,
    name: 'Customer Events',
    source: 'Snowflake',
    dataset: 'analytics.customer_events',
    syncType: 'Streaming',
    lastUpdated: '2 min ago',
    status: 'Active',
    performanceGain: '12x faster'
  },
  {
    id: 2,
    name: 'Product Catalog',
    source: 'Amazon S3',
    dataset: 's3://data-lake/products/',
    syncType: 'Incremental',
    lastUpdated: '5 min ago',
    status: 'Active',
    performanceGain: '8x faster'
  },
  {
    id: 3,
    name: 'User Activity',
    source: 'Databricks',
    dataset: 'delta.user_activity_log',
    syncType: 'Batch',
    lastUpdated: '15 min ago',
    status: 'Syncing',
    performanceGain: '15x faster'
  }
]

const LAKEHOUSE_SOURCES = [
  {
    id: 'snowflake',
    name: 'Snowflake',
    logo: 'snowflake',
    connected: true,
    description: 'Accelerate data directly from your Snowflake warehouse',
    action: 'Use existing connection'
  },
  {
    id: 'databricks',
    name: 'Databricks',
    logo: 'databricks',
    connected: false,
    description: 'Use Delta Lake data for real-time analytics',
    action: 'Connect source'
  },
  {
    id: 's3',
    name: 'Amazon S3',
    logo: 's3',
    connected: false,
    description: 'Query and accelerate data from your data lake',
    action: 'Connect source'
  }
]

function LakehouseView({ onOpenAura }) {
  return (
    <div className="lakehouse-view">
      <div className="lakehouse-main">
        <div className="lakehouse-header">
          <div className="lakehouse-icon">
            <IconFA name="database" size={20} />
          </div>
          <h1>Lakehouse</h1>
          <button className="lakehouse-new-btn" onClick={() => onOpenAura && onOpenAura({ agent: 'Lakehouse Agent' })}>
            <IconFA name="plus" size={12} />
            <span>New Speed Layer</span>
          </button>
        </div>

        <div className="ai-migration-banner">
          <div className="ai-migration-content">
            <div className="ai-migration-label">
              <IconFA name="sparkles" size={12} />
              <span>NEW: AI-POWERED</span>
            </div>
            <h2 className="ai-migration-title">Intelligent Lakehouse Agent</h2>
            <p className="ai-migration-description">
              <strong>Accelerate your data with Lakehouse.</strong> Keep your data where it is. Create a speed layer for real-time analytics and applications.
            </p>
            <button className="ai-migration-btn" onClick={() => onOpenAura && onOpenAura({ agent: 'Lakehouse Agent' })}>
              <IconFA name="sparkles" size={14} />
              <span>Create Speed Layer with AI</span>
            </button>
          </div>
          <div className="ai-migration-image">
            <img src="/images/lakehouse-banner.png" alt="Lakehouse Speed Layer" />
          </div>
        </div>

        <div className="lakehouse-sources-section">
          <h3 className="lakehouse-section-title">Select Source</h3>
          <div className="lakehouse-sources-grid">
            {LAKEHOUSE_SOURCES.map((source) => (
              <div key={source.id} className="lakehouse-source-card">
                <div className="lakehouse-source-header">
                  <div className="lakehouse-source-logo">
                    {source.id === 'snowflake' && <SnowflakeLogo />}
                    {source.id === 'databricks' && <DatabricksLogo />}
                    {source.id === 's3' && <S3Logo />}
                  </div>
                  <div className="lakehouse-source-info">
                    <span className="lakehouse-source-name">{source.name}</span>
                    <span className={`lakehouse-source-status ${source.connected ? 'connected' : 'not-connected'}`}>
                      {source.connected ? 'Connected' : 'Not connected'}
                    </span>
                  </div>
                </div>
                <p className="lakehouse-source-description">{source.description}</p>
                <div className="lakehouse-source-action">
                  <span className={source.connected ? 'connected' : ''}>{source.action} →</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lakehouse-layers-section">
          <h3 className="lakehouse-section-title">Your Speed Layers</h3>
          <div className="workspaces-table-container">
            <table className="workspaces-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Source</th>
                  <th>Dataset / Table</th>
                  <th>Sync Type</th>
                  <th>Last Updated</th>
                  <th>Status</th>
                  <th>Performance Gain</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {LAKEHOUSE_SPEED_LAYERS.map((layer) => (
                  <tr key={layer.id}>
                    <td>
                      <div className="workspace-name-cell">
                        <div className="workspace-icon">
                          <SpeedLayerIcon />
                        </div>
                        <div className="workspace-name-info">
                          <span className="workspace-name">{layer.name}</span>
                        </div>
                      </div>
                    </td>
                    <td>{layer.source}</td>
                    <td><code className="lakehouse-dataset-code">{layer.dataset}</code></td>
                    <td>
                      <span className="lakehouse-sync-badge">{layer.syncType}</span>
                    </td>
                    <td>{layer.lastUpdated}</td>
                    <td>
                      <span className={`lakehouse-status-badge ${layer.status === 'Active' ? 'active' : 'syncing'}`}>
                        {layer.status}
                      </span>
                    </td>
                    <td className="lakehouse-cell-performance">
                      <IconFA name="bolt" size={14} />
                      <span>{layer.performanceGain}</span>
                    </td>
                    <td>
                      <div className="workspace-actions">
                        <button className="workspace-action-btn tertiary" title="View">
                          <IconFA name="eye" size={14} />
                        </button>
                        <button className="workspace-action-btn tertiary" title="Edit">
                          <IconFA name="pen-to-square" size={14} />
                        </button>
                        <button className="workspace-action-btn tertiary" title="Delete">
                          <IconFA name="trash" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}

function SpeedLayerIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#F3E8FF"/>
      <path d="M20 10L28 14.5V23.5L20 28L12 23.5V14.5L20 10Z" stroke="#9810FA" strokeWidth="1.5" fill="none"/>
      <path d="M20 10V28" stroke="#9810FA" strokeWidth="1.5"/>
      <path d="M12 14.5L20 19L28 14.5" stroke="#9810FA" strokeWidth="1.5"/>
      <circle cx="20" cy="19" r="3" fill="#9810FA"/>
    </svg>
  )
}

function SnowflakeLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M16.03 24.8773C16.1315 24.5586 16.1738 24.2306 16.1662 23.9064C16.1544 23.6718 16.1239 23.4372 16.057 23.2027C15.8557 22.4739 15.3785 21.8233 14.6635 21.4132L4.49464 15.5687C3.05915 14.7464 1.22906 15.2352 0.404944 16.6618C-0.426794 18.0867 0.0639464 19.9062 1.49936 20.7306L7.18176 24.0019L1.49936 27.2635C0.0639464 28.0896 -0.425092 29.9092 0.404944 31.3399C1.22906 32.7627 3.05915 33.2494 4.49464 32.4271L14.6635 26.5789C15.3497 26.186 15.8155 25.5696 16.03 24.8773ZM18.7896 30.3538C18.2053 30.3041 17.5978 30.4262 17.0516 30.7428L6.87506 36.5835C5.44345 37.4076 4.9545 39.2367 5.78064 40.6637C6.61068 42.0868 8.43906 42.577 9.86864 41.7492L15.5702 38.4758V45.0167C15.5702 46.6648 16.9096 48 18.5675 48C20.2174 48 21.5611 46.6648 21.5611 45.0167V33.3236C21.5611 31.7538 20.3384 30.4641 18.7896 30.3538ZM29.2115 17.6459C29.7941 17.6935 30.3999 17.5696 30.946 17.2568L41.1206 11.4106C42.5542 10.5862 43.0408 8.76464 42.2167 7.33426C41.3909 5.90929 39.5607 5.42093 38.1288 6.24498L32.4314 9.52211V2.97913C32.4314 1.33524 31.0916 0 29.4341 0C27.7761 0 26.4402 1.33524 26.4402 2.97913V14.6722C26.4402 16.2403 27.6594 17.5317 29.2115 17.6459ZM6.87506 11.4106L17.0516 17.2568C17.5978 17.5696 18.2053 17.6935 18.7896 17.6459C20.3384 17.5317 21.5611 16.2403 21.5611 14.6722V2.97913C21.5611 1.33524 20.2174 0 18.5675 0C16.9096 0 15.5702 1.33524 15.5702 2.97913V9.52211L9.86864 6.24498C8.43906 5.42093 6.61068 5.90929 5.78064 7.33426C4.9545 8.76464 5.44345 10.5862 6.87506 11.4106ZM25.9994 23.977C25.9994 23.8073 25.8961 23.5707 25.7754 23.4449L24.5507 22.2317C24.4302 22.1116 24.1924 22.0123 24.0216 22.0123H23.9737C23.8032 22.0123 23.5659 22.1116 23.447 22.2317L22.2222 23.4449C22.0996 23.5707 22.0057 23.8073 22.0057 23.977V24.0247C22.0057 24.1927 22.0996 24.4272 22.2222 24.5493L23.447 25.7662C23.5676 25.8863 23.8032 25.9856 23.9737 25.9856H24.0216C24.1924 25.9856 24.4302 25.8863 24.5507 25.7662L25.7754 24.5493C25.8961 24.4272 25.9994 24.1927 25.9994 24.0247V23.977ZM29.3803 25.1443L25.1506 29.3487C25.0297 29.4725 24.7961 29.5736 24.6197 29.5736H24.313H23.6882H23.3759C23.2051 29.5736 22.9677 29.4725 22.845 29.3487L18.6174 25.1443C18.4965 25.026 18.3987 24.7876 18.3987 24.62V24.3089V23.687V23.38C18.3987 23.2082 18.4965 22.9698 18.6174 22.8498L22.845 18.6455C22.9677 18.5217 23.2051 18.4244 23.3759 18.4244H23.6882H24.313H24.6197C24.7923 18.4244 25.0297 18.5217 25.1506 18.6455L29.3803 22.8498C29.501 22.9698 29.5987 23.2082 29.5987 23.38V23.687V24.3089V24.62C29.5987 24.7876 29.501 25.026 29.3803 25.1443ZM41.1206 36.5835L30.946 30.7428C30.3999 30.4262 29.7941 30.3041 29.2115 30.3538C27.6594 30.4641 26.4402 31.7538 26.4402 33.3236V45.0167C26.4402 46.6648 27.7761 48 29.4341 48C31.0916 48 32.4314 46.6648 32.4314 45.0167V38.4758L38.1288 41.7492C39.5604 42.577 41.3909 42.0868 42.2167 40.6637C43.0408 39.2367 42.5542 37.4076 41.1206 36.5835ZM46.5001 20.7306L40.8177 24.0019L46.5001 27.2635C47.9356 28.0896 48.4262 29.9092 47.5963 31.3399C46.7684 32.7627 44.9365 33.2494 43.5066 32.4271L33.33 26.5789C32.6514 26.186 32.1801 25.5696 31.9712 24.8773C31.8717 24.5586 31.8256 24.2306 31.837 23.9064C31.8429 23.6718 31.8772 23.4372 31.9424 23.2027C32.1458 22.4739 32.623 21.8236 33.33 21.4132L43.5066 15.5687C44.9365 14.7464 46.7684 15.2352 47.5963 16.6618C48.4262 18.0867 47.9356 19.9062 46.5001 20.7306Z" fill="#29B5E8"/>
    </svg>
  )
}

function DatabricksLogo() {
  return (
    <svg width="46" height="48" viewBox="0 0 46 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 13.7702V12.4292L5.30454 9.44924C10.9112 6.36995 16.5212 3.28735 22.1346 0.201435C22.3216 0.0704546 22.5459 0 22.7761 0C23.0062 0 23.2306 0.0704546 23.4175 0.201435C28.6712 3.1218 33.9418 6.01898 39.2294 8.89299C39.9218 9.27045 40.2476 9.66776 40.0032 10.4922L38.6592 11.2273L22.7761 2.496L3.58386 13.055C3.81803 13.2139 3.97075 13.343 4.15402 13.4424C10.1815 16.7534 16.2022 20.0645 22.216 23.3756C22.3844 23.4866 22.5831 23.5459 22.7863 23.5459C22.9895 23.5459 23.1881 23.4866 23.3564 23.3756L39.8912 14.2768C41.1334 13.5914 42.3958 12.9556 43.5973 12.2206C43.8272 12.025 44.122 11.9172 44.4271 11.9172C44.7322 11.9172 45.0269 12.025 45.2569 12.2206L45.5522 12.4093V21.0115L39.1479 24.5576C33.9757 27.4085 28.7933 30.2394 23.6415 33.1201C23.3827 33.29 23.0778 33.3808 22.7659 33.3808C22.4539 33.3808 22.1491 33.29 21.8903 33.1201C15.6388 29.6501 9.37377 26.2032 3.09516 22.7796L2.525 22.4816C2.48246 22.678 2.45521 22.8772 2.44353 23.0776C2.44353 24.1901 2.44353 25.3126 2.44353 26.4251C2.42312 26.5981 2.45945 26.7731 2.54725 26.9247C2.63505 27.0764 2.76984 27.1971 2.93229 27.2694C9.38059 30.7924 15.8289 34.3286 22.2772 37.8781C22.4297 37.9715 22.6062 38.0211 22.7863 38.0211C22.9664 38.0211 23.1428 37.9715 23.2953 37.8781L43.1188 26.9515C43.3231 26.8617 43.5175 26.7519 43.6991 26.6237C43.8279 26.5085 43.9803 26.4211 44.1461 26.3672C44.312 26.3133 44.4876 26.2942 44.6615 26.311C44.8355 26.3279 45.0038 26.3804 45.1556 26.4651C45.3073 26.5498 45.4389 26.6648 45.542 26.8025V35.4842L22.7557 48L0.0305123 35.4842V33.9743C0.20597 33.8827 0.372892 33.7764 0.529397 33.6565C0.670391 33.5363 0.851258 33.4701 1.03847 33.4701C1.22569 33.4701 1.40656 33.5363 1.54755 33.6565L10.9451 38.8316C14.6818 40.8878 18.4286 42.944 22.1448 45.0101C22.3272 45.1288 22.5415 45.1922 22.7608 45.1922C22.9801 45.1922 23.1944 45.1288 23.3768 45.0101C29.9201 41.3944 36.4906 37.7787 43.0882 34.1631V29.6335C42.8438 29.7428 42.6504 29.8222 42.4773 29.9216L23.9673 40.0932C22.8066 40.7289 22.8066 40.7388 21.6459 40.0932C14.6546 36.2457 7.66327 32.3982 0.671954 28.5508L0.0203208 28.1832V19.4818L0.44799 19.2235C0.610921 19.0953 0.813932 19.0254 1.02325 19.0254C1.23257 19.0254 1.43551 19.0953 1.59845 19.2235C3.23767 20.1473 4.89731 21.0413 6.54672 21.9551C11.78 24.8159 17.0031 27.6866 22.216 30.5672C22.3844 30.6782 22.5831 30.7376 22.7863 30.7376C22.9895 30.7376 23.1881 30.6782 23.3564 30.5672C29.7572 27.031 36.1716 23.5114 42.5995 20.0082C42.7753 19.9319 42.9221 19.8035 43.019 19.6413C43.1158 19.479 43.1579 19.2912 43.1391 19.1043C43.1391 17.8329 43.1391 16.5515 43.1391 15.131L42.121 15.6774L23.4073 25.988C23.2455 26.0867 23.0585 26.139 22.8677 26.139C22.6769 26.139 22.4899 26.0867 22.3281 25.988C15.011 21.9419 7.68022 17.9057 0.335946 13.8794L0 13.7702Z" fill="#E8372A"/>
    </svg>
  )
}

function S3Logo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.686 3.62949C15.135 2.41824 17.5754 1.19215 20.033 0C20.0544 4.0304 20.033 8.07778 20.033 12.1167C17.6396 12.6427 15.2763 13.3046 12.8829 13.8285L13.2126 14.0407L12.7117 13.9834C12.656 12.857 12.7117 11.7285 12.6817 10.6021C12.6817 8.27294 12.686 5.95015 12.686 3.62949V3.62949Z" fill="#8C3223"/>
      <path d="M20.033 0C22.4834 1.21619 24.9353 2.43026 27.3886 3.64221V10.5936C27.3757 11.6712 27.3886 12.7509 27.3886 13.8285L27.2302 13.871C24.839 13.2749 22.4499 12.6618 20.0459 12.1167C20.0309 8.07778 20.0544 4.0304 20.033 0V0Z" fill="#E15343"/>
      <path d="M0 9.90842C1.08749 9.38235 2.16 8.82234 3.25606 8.30899C3.24749 18.7414 3.24749 29.1738 3.25606 39.6061C2.16 39.1076 1.09606 38.5455 0.00856294 38.0194C0.00285431 28.6533 0 19.283 0 9.90842Z" fill="#8C3223"/>
      <path d="M3.25606 8.30899C6.39223 9.10447 9.54982 9.81085 12.6881 10.6063C12.7095 11.7327 12.6624 12.8612 12.7181 13.9876L13.219 14.0449C15.4925 14.4098 17.7424 14.8934 20.018 15.2349C20.0437 16.1449 20.0394 17.0528 20.018 17.9629C17.5819 18.2429 15.135 18.5377 12.6924 18.8793C12.6924 22.2924 12.7053 25.7076 12.6924 29.1207C15.1286 29.4962 17.5819 29.7571 20.0266 30.0626C20.0758 30.9599 20.0437 31.8593 20.0416 32.7587C17.5883 33.1681 15.1436 33.6242 12.701 34.0866V37.33C9.54554 38.1085 6.39223 38.8192 3.24963 39.604C3.26105 29.1731 3.26319 18.7414 3.25606 8.30899V8.30899Z" fill="#E15343"/>
      <path d="M27.3843 10.5936C30.5311 9.81934 33.6845 9.07266 36.8356 8.31961C36.8242 18.4522 36.8242 28.5848 36.8356 38.7173C36.8356 39.0058 36.8056 39.2943 36.78 39.5828C33.6459 38.8467 30.5183 38.0979 27.3864 37.3364C27.3736 36.2546 27.3864 35.1706 27.3864 34.0866C24.9395 33.6242 22.4884 33.1681 20.0308 32.7545C20.0308 31.8551 20.0651 30.9556 20.0159 30.0583C17.5711 29.7592 15.1179 29.492 12.6817 29.1165C12.7052 25.7034 12.6817 22.2881 12.6817 18.875C15.135 18.5377 17.5818 18.2429 20.0287 17.9523C20.0394 17.0423 20.0437 16.1344 20.0287 15.2243C22.0859 14.9337 24.1196 14.4776 26.1769 14.1637C26.5388 14.1052 26.8933 14.0085 27.2344 13.8752L27.3928 13.8328C27.3778 12.7488 27.3714 11.667 27.3843 10.5936V10.5936Z" fill="#8C3223"/>
      <path d="M36.8378 8.31961C37.9081 8.86478 39.0042 9.38024 40.081 9.93389C40.071 19.2943 40.071 28.6548 40.081 38.0152C38.9807 38.5646 37.8675 39.0928 36.7757 39.6634V39.5849C36.8014 39.2965 36.8228 39.008 36.8314 38.7195C36.8328 28.5855 36.8349 18.4522 36.8378 8.31961V8.31961Z" fill="#E15343"/>
      <path d="M12.8893 13.8285C15.2848 13.3046 17.6461 12.6427 20.0394 12.1167C22.4434 12.6618 24.8325 13.2749 27.2237 13.871C26.8826 14.0042 26.5281 14.101 26.1662 14.1594C24.1111 14.4776 22.0774 14.9337 20.018 15.2201C17.7402 14.8807 15.4903 14.3949 13.219 14.0301C13.1098 13.9685 12.9985 13.9007 12.8893 13.8285Z" fill="#5E1F19"/>
      <path d="M20.0565 17.9565C22.497 18.2577 24.9417 18.5462 27.38 18.8793V29.1186C24.9353 29.4707 22.482 29.7762 20.0287 30.0477C20.0629 26.0152 20.0094 21.9848 20.0565 17.9565Z" fill="#E15343"/>
      <path d="M12.6924 34.0824C15.1329 33.6199 17.5797 33.1639 20.033 32.7545C22.4884 33.1681 24.9396 33.6242 27.3886 34.0866C24.9374 34.6848 22.4927 35.3233 20.0309 35.8833C17.5776 35.3042 15.135 34.6933 12.6924 34.0824V34.0824Z" fill="#F2B0A9"/>
      <path d="M12.686 37.3343C12.6967 36.2524 12.686 35.1727 12.686 34.0909C15.1286 34.6997 17.5733 35.3127 20.0223 35.8918C20.048 39.9222 20.033 43.9653 20.0223 48C17.5626 46.81 15.1222 45.5817 12.671 44.3705C12.681 42.0216 12.686 39.6761 12.686 37.3343Z" fill="#8C3223"/>
      <path d="M20.0287 35.8855C22.4905 35.3254 24.9352 34.6869 27.3864 34.0887C27.3757 35.1706 27.3714 36.2546 27.3864 37.3385C27.3971 39.6719 27.3864 42.0053 27.3864 44.3536C24.9345 45.5655 22.4841 46.7796 20.0351 47.9958C20.0394 43.9569 20.0544 39.9201 20.0287 35.8855Z" fill="#E15343"/>
    </svg>
  )
}

function WorkspacesView({ workspacesData }) {
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
            {workspacesData.map((workspace) => (
              <tr key={workspace.id} className={workspace.justUpdated ? 'workspace-updated' : ''}>
                <td>
                  <div className="workspace-name-cell">
                    <div className={`workspace-icon ${workspace.loading ? 'workspace-icon-loading' : ''}`}>
                      {workspace.loading ? (
                        <>
                          <CloudIconCustom size={40} />
                          <div className="workspace-spinner-overlay">
                            <PurpleSpinner size={16} />
                          </div>
                        </>
                      ) : workspace.status === 'active' ? (
                        <WorkspaceIconActive />
                      ) : (
                        <WorkspaceIconSuspended />
                      )}
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
                  ) : workspace.loading ? (
                    <div className="workspace-metric workspace-metric-loading">
                      <span>-</span>
                    </div>
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
                  ) : workspace.loading ? (
                    <div className="workspace-metric workspace-metric-loading">
                      <span>-</span>
                    </div>
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
                  ) : workspace.loading ? (
                    <div className="workspace-metric workspace-metric-loading">
                      <span>-</span>
                    </div>
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

function PortalView({ 
  activeTab, 
  setActiveTab, 
  inputValue, 
  setInputValue, 
  onAlertClick,
  // CPU Spike V2 flow props (renders conversation in main area)
  auraPanelFlow,
  auraPanelMessages,
  isAuraTyping,
  onAction,
  chatEndRef,
  // Input props for conversation mode
  auraPanelInput,
  setAuraPanelInput,
  onSend,
  agentName,
  onAgentChange,
  onNavigate
}) {
  const selectedAgent = AURA_AGENTS.find(a => a.name === agentName) || AURA_AGENTS[0]

  const handleAgentSelect = (agent) => {
    if (agent.name !== selectedAgent.name && onAgentChange) {
      onAgentChange(agent.name)
    }
  }

  // Check if we should show a conversation flow in the main area
  const showFullscreenConversation = ['cpu-spike-v2', 'lakehouse', 'migration'].includes(auraPanelFlow) && auraPanelMessages && auraPanelMessages.length > 0

  // If a conversation flow is active, render conversation in main area
  if (showFullscreenConversation) {
    const flowAgentName = auraPanelFlow === 'lakehouse' ? 'Lakehouse Agent' 
      : auraPanelFlow === 'migration' ? 'Data Migration Agent' 
      : 'Aura Agent'
    return (
      <div className="portal-view portal-view-conversation">
        <div className="portal-conversation-area">
          <div className="portal-chat-messages">
            {auraPanelMessages.map((message, index) => (
              <Message
                key={message.id}
                message={message}
                onAction={onAction}
                expandedQueries={true}
                setExpandedQueries={() => {}}
                expandedOptions={true}
                setExpandedOptions={() => {}}
                isTyping={index === auraPanelMessages.length - 1 && message.type === 'agent' && !message.typingComplete}
                onTypingComplete={() => {
                  message.typingComplete = true
                }}
                agentName={message.agentName || flowAgentName}
                compact={true}
                onNavigate={onNavigate}
              />
            ))}
            {isAuraTyping && (
              <div className="message">
                <div className="message-header">
                  <span className="message-sender">{flowAgentName}</span>
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
        </div>

        {/* Input area - using shared AgentInput component */}
        <div className="chat-input-bottom">
          <AgentInput
            variant="homepage"
            inputValue={auraPanelInput}
            setInputValue={setAuraPanelInput}
            onSend={onSend}
            selectedAgent={selectedAgent}
            onAgentSelect={handleAgentSelect}
            placeholder="Ask Aura anything..."
          />
        </div>
      </div>
    )
  }

  // Default portal view
  return (
    <div className="portal-view">
      <div className="portal-header">
        <h1>Ask Aura Agent</h1>
        <p>Get help with database setup, SQL, Python, or debugging? We've got you.</p>
      </div>

      <div className="chat-input-container">
        <AgentInput
          variant="homepage"
          inputValue={inputValue}
          setInputValue={setInputValue}
          onSend={onSend}
          selectedAgent={selectedAgent}
          onAgentSelect={handleAgentSelect}
          placeholder="Ask anything to get started"
        />
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

function ChatView({ messages, inputValue, setInputValue, isTyping, onAction, expandedQueries, setExpandedQueries, expandedOptions, setExpandedOptions, chatEndRef, activeChatFlow, onNavigate }) {
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
            onNavigate={onNavigate}
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

function Message({ message, onAction, expandedQueries, setExpandedQueries, expandedOptions, setExpandedOptions, isTyping, onTypingComplete, agentName = 'Aura Agent', compact = false, onAdvanceSilently, onNavigate }) {
  // Only treat text as items if it's an array (not a string)
  const textItems = message.type === 'agent' && Array.isArray(message.content?.text) ? message.content.text : []
  const analysisTextItems = message.type === 'agent' && Array.isArray(message.content?.analysisText) ? message.content.analysisText : []
  
  // Staged rendering: intro text → chart → analysis text → query table
  const hasChart = message.content?.ui?.state === 'placeholder'
  const hasAnalysisText = analysisTextItems.length > 0
  const hasQueryTable = message.content?.queryTable
  const isMultiStageMessage = hasChart && hasAnalysisText
  
  // Initialize paragraphsCompleted to true if there are no text items (e.g., progress-only messages, or text is a string)
  const [currentParagraph, setCurrentParagraph] = useState(0)
  const [paragraphsCompleted, setParagraphsCompleted] = useState(textItems.length === 0)
  const [showConnections, setShowConnections] = useState(false)
  const [expandedQueryIndex, setExpandedQueryIndex] = useState(null)
  const [expandedOptQueryIndex, setExpandedOptQueryIndex] = useState(null)
  
  // Staged rendering state for multi-stage messages (e.g., investigation results)
  const [showChart, setShowChart] = useState(!isTyping || !isMultiStageMessage)
  const [currentAnalysisParagraph, setCurrentAnalysisParagraph] = useState(0)
  const [analysisTypingActive, setAnalysisTypingActive] = useState(false)
  const [analysisCompleted, setAnalysisCompleted] = useState(!isTyping || !isMultiStageMessage)
  const [showQueryTable, setShowQueryTable] = useState(!isTyping || !isMultiStageMessage)
  
  // Optimization cards staggered animation state
  const hasOptimizationCards = message.content?.ui?.type === 'optimization-recommendations' && message.content?.optimizationQueries
  const optimizationCardCount = message.content?.optimizationQueries?.length || 0
  const [showOptimizationCards, setShowOptimizationCards] = useState(!isTyping)
  const [visibleOptCardCount, setVisibleOptCardCount] = useState(!isTyping ? optimizationCardCount : 0)

  useEffect(() => {
    if (!isTyping || textItems.length === 0) {
      setCurrentParagraph(textItems.length)
      setParagraphsCompleted(true)
      if (!isMultiStageMessage) {
        setShowChart(true)
        setAnalysisCompleted(true)
        setShowQueryTable(true)
      }
    }
  }, [isTyping, textItems.length, isMultiStageMessage])

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

  // Stage 2: Show chart after intro text completes (for multi-stage messages)
  useEffect(() => {
    if (isMultiStageMessage && paragraphsCompleted && !showChart) {
      const timer = setTimeout(() => {
        setShowChart(true)
        // Start analysis text typing after chart appears
        setTimeout(() => {
          setAnalysisTypingActive(true)
        }, 300)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [isMultiStageMessage, paragraphsCompleted, showChart])
  
  // Staggered animation for optimization cards (after typing completes)
  useEffect(() => {
    if (hasOptimizationCards && paragraphsCompleted && !showOptimizationCards) {
      // Wait 300ms after typing completes, then start showing cards
      const startTimer = setTimeout(() => {
        setShowOptimizationCards(true)
        
        // Stagger each card with 80ms delay
        let count = 0
        const showNextCard = () => {
          count++
          setVisibleOptCardCount(count)
          if (count < optimizationCardCount) {
            setTimeout(showNextCard, 80)
          } else {
            // All cards shown, trigger typing complete
            setTimeout(() => {
              onTypingComplete?.()
            }, 100)
          }
        }
        showNextCard()
      }, 300)
      return () => clearTimeout(startTimer)
    }
  }, [hasOptimizationCards, paragraphsCompleted, showOptimizationCards, optimizationCardCount, onTypingComplete])

  const handleParagraphComplete = () => {
    if (currentParagraph < textItems.length - 1) {
      setCurrentParagraph(prev => prev + 1)
    } else {
      setParagraphsCompleted(true)
      // For multi-stage messages or optimization cards, don't call onTypingComplete yet
      if (!isMultiStageMessage && !hasOptimizationCards) {
        onTypingComplete?.()
      }
    }
  }
  
  // Handle analysis paragraph completion (for multi-stage messages)
  const handleAnalysisParagraphComplete = () => {
    if (currentAnalysisParagraph < analysisTextItems.length - 1) {
      setCurrentAnalysisParagraph(prev => prev + 1)
    } else {
      setAnalysisCompleted(true)
      // Show query table after analysis completes
      setTimeout(() => {
        setShowQueryTable(true)
        // Now the entire message is complete
        setTimeout(() => {
          onTypingComplete?.()
        }, 200)
      }, 200)
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
      if (textItem.type === 'list' && textItem.items) {
        return textItem.items[0] || ''
      }
      return ''
    }

    // Handle list type separately - show all items with staggered fade-in
    if (t.type === 'list' && t.items) {
      return (
        <AnimatedList 
          key={index} 
          items={t.items} 
          isTyping={isCurrentlyTyping}
          onComplete={handleParagraphComplete}
        />
      )
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
            <h4>Why S-224?</h4>
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
                {content.queries.map((query, i) => {
                  const isExpanded = expandedQueryIndex === i
                  return (
                    <div 
                      key={i} 
                      className={`query-card ${isExpanded ? 'expanded' : ''}`}
                      onClick={() => setExpandedQueryIndex(isExpanded ? null : i)}
                    >
                      <div className="query-card-header">
                        <div className="query-card-left">
                          <span className="query-name">{query.name}</span>
                          <div className="query-badges">
                            <span className={`badge ${query.cpuType}`}>{query.cpu}</span>
                            <span className="badge warning">{query.time}</span>
                            <span className="badge neutral">{query.frequency}</span>
                          </div>
                          <div className="query-description">
                            <span>{query.desc1}</span>
                          </div>
                        </div>
                        <div className="query-card-chevron">
                          <IconFA name={isExpanded ? 'chevron-down' : 'chevron-right'} size={12} />
                        </div>
                      </div>
                      <div className={`query-card-details ${isExpanded ? 'show' : ''}`}>
                        <div className="query-card-details-inner">
                          {query.sql && (
                            <div className="query-sql-block">
                              <pre><code>{query.sql}</code></pre>
                            </div>
                          )}
                          {query.recommendations && (
                            <div className="query-recommendations">
                              <span className="recommendations-label">Optimization recommendations:</span>
                              <ul>
                                {query.recommendations.map((rec, j) => (
                                  <li key={j}>{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <button className="query-apply-btn" onClick={(e) => { e.stopPropagation(); }}>
                            <IconFA name="bolt" size={12} />
                            <span>Apply optimization</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
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
                    <div className="option-icon">
                      <IconFA name={option.icon} />
                    </div>
                    <div className="option-card-content">
                      <div className="option-card-header">
                        <span className="option-title">{option.title}</span>
                        <span className={`badge ${option.impactType}`}>{option.impact}</span>
                      </div>
                      <p className="option-description">{option.description}</p>
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
                  <>
                    {d.content}
                    {d.link && <span className="text-link" onClick={() => onNavigate && onNavigate('workspaces')}>{d.link}</span>}
                    {d.bold && <strong>{d.bold}</strong>}
                    {d.after}
                  </>
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

        {/* UI Placeholder blocks for V2 flows */}
        {content.ui && content.ui.state === 'placeholder' && (
          <div className="ui-placeholder fade-in">
            {content.ui.type === 'cpu-chart' && showChart && (
              <div className="placeholder-chart cpu-chart-image">
                <div className="placeholder-header">
                  <IconFA name="chart-line" size={14} />
                  <span>CPU Usage — Cluster Activity</span>
                </div>
                <div className="chart-image-container">
                  <img 
                    src="/charts/cpu-spike.png" 
                    alt="CPU usage during spike window"
                    className="chart-image"
                  />
                </div>
              </div>
            )}
            {content.ui.type === 'query-table' && (
              <>
                <h3 className="analysis-section-header">Top Queries by CPU Usage</h3>
                <div className="query-table-container query-table-flat">
                  <div className="query-table-wrapper">
                    <table className="query-table">
                      <thead>
                        <tr>
                          <th>Database</th>
                          <th>Activity</th>
                          <th>Total CPU</th>
                          <th>Elapsed</th>
                          <th>Memory</th>
                          <th>Disk I/O</th>
                          <th>Network</th>
                          <th>Execs</th>
                          <th>Avg CPU/Exec</th>
                        </tr>
                      </thead>
                      <tbody>
                        {CPU_SPIKE_TOP_QUERIES.map((query, i) => (
                          <tr key={i}>
                            <td>{query.database}</td>
                            <td className="activity-cell" title={query.activity}>{query.activity}</td>
                            <td>{query.totalCPU}</td>
                            <td>{query.elapsed}</td>
                            <td>{query.memory}</td>
                            <td>{query.diskIO}</td>
                            <td>{query.network}</td>
                            <td>{query.execs}</td>
                            <td>{query.avgCPU}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
            {content.ui.type === 'memory-chart' && showChart && (
              <div className="placeholder-chart cpu-chart-image">
                <div className="placeholder-header">
                  <IconFA name="chart-line" size={14} />
                  <span>Memory & Resource Usage</span>
                </div>
                <div className="chart-image-container">
                  <img 
                    src="/charts/memory-spike.png" 
                    alt="Memory usage during spike window"
                    className="chart-image"
                  />
                </div>
              </div>
            )}
            {content.ui.type === 'optimization-recommendations' && showOptimizationCards && (
              <div className="optimization-recommendations">
                <div className="optimization-header">
                  <IconFA name="lightbulb" size={14} />
                  <span>Optimization Recommendations</span>
                </div>
                {content.optimizationQueries && (
                  <div className="query-list">
                    {content.optimizationQueries.map((query, i) => {
                      const isExpanded = expandedOptQueryIndex === i
                      const isVisible = i < visibleOptCardCount
                      return (
                        <div 
                          key={i} 
                          className={`query-card optimization-card ${isExpanded ? 'expanded' : ''} ${isVisible ? 'visible' : ''}`}
                          onClick={() => setExpandedOptQueryIndex(isExpanded ? null : i)}
                        >
                          <div className="query-card-header">
                            <div className="query-card-left">
                              <span className="query-name">{query.name}</span>
                              <div className="query-badges">
                                {query.badges.map((badge, j) => (
                                  <span key={j} className={`badge ${badge.type}`}>{badge.label}</span>
                                ))}
                              </div>
                              <div className="query-description">
                                <span>{query.summary}</span>
                              </div>
                            </div>
                            <div className="query-card-chevron">
                              <IconFA name={isExpanded ? 'chevron-down' : 'chevron-right'} size={12} />
                            </div>
                          </div>
                          <div className={`query-card-details ${isExpanded ? 'show' : ''}`}>
                            <div className="query-card-details-inner">
                              {query.whatHappening && (
                                <div className="query-what-happening">
                                  <span className="section-label">What's happening:</span>
                                  <ul>
                                    {query.whatHappening.map((item, j) => (
                                      <li key={j}>{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {query.recommendations && (
                                <div className="query-recommendations">
                                  <span className="section-label">Recommendations:</span>
                                  <div className="recommendations-list">
                                    {query.recommendations.map((rec, j) => (
                                      <div key={j} className="recommendation-item">
                                        {typeof rec === 'string' ? (
                                          <p className="recommendation-text"><span className="recommendation-number">{j + 1}.</span> {rec}</p>
                                        ) : (
                                          <>
                                            <h4 className="recommendation-title"><span className="recommendation-number">{j + 1}.</span> {rec.title}</h4>
                                            <p className="recommendation-description">{rec.description}</p>
                                            {rec.code && (
                                              <pre className="recommendation-code"><code>{rec.code}</code></pre>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <button 
                                className="query-apply-btn" 
                                onClick={(e) => { 
                                  e.stopPropagation()
                                  onAction({
                                    type: 'open-query-in-editor',
                                    payload: {
                                      title: query.name,
                                      query: query.sql || ''
                                    }
                                  })
                                }}
                              >
                                <IconFA name="arrow-up-right-from-square" size={12} />
                                <span>{query.cta || 'View query in Editor'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Additional analysis text for combined messages (V2 flow) - staged typing */}
        {/* Skip for billing messages (those with billingChart) - they use their own renderer */}
        {content.analysisText && Array.isArray(content.analysisText) && showChart && !content.billingChart && (
          <div className="analysis-text-section fade-in">
            {content.analysisText.map((t, i) => {
              const isCurrentlyTypingAnalysis = analysisTypingActive && i === currentAnalysisParagraph && !analysisCompleted
              const shouldShowAnalysis = !isTyping || analysisCompleted || (analysisTypingActive && i <= currentAnalysisParagraph)
              
              if (!shouldShowAnalysis) return null
              
              // Get plain text for typing animation
              const getAnalysisPlainText = (item) => {
                if (item.type === 'text') return item.content
                if (item.type === 'bold') return item.content
                if (item.type === 'mixed') {
                  return `${item.content || ''}${item.bold || ''}${item.after || ''}${item.bold2 || ''}${item.after2 || ''}${item.bold3 || ''}`
                }
                return ''
              }
              
              if (isCurrentlyTypingAnalysis) {
                return (
                  <p key={i} className="message-text">
                    <TypedText onComplete={handleAnalysisParagraphComplete}>
                      {getAnalysisPlainText(t)}
                    </TypedText>
                  </p>
                )
              }
              
              return (
                <p key={i} className="message-text">
                  {t.type === 'bold' && <strong>{t.content}</strong>}
                  {t.type === 'text' && t.content}
                  {t.type === 'mixed' && (
                    <>
                      {t.content}<strong>{t.bold}</strong>{t.after}{t.bold2 && <strong>{t.bold2}</strong>}{t.after2}{t.bold3 && <strong>{t.bold3}</strong>}
                    </>
                  )}
                </p>
              )
            })}
          </div>
        )}

        {/* Query table for combined messages (V2 flow) - staged rendering */}
        {content.queryTable && showQueryTable && (
          <div className="fade-in">
            <h3 className="analysis-section-header">Top Queries by CPU Usage</h3>
            <div className="query-table-container query-table-flat">
              <div className="query-table-wrapper">
                <table className="query-table">
                  <thead>
                    <tr>
                      <th>Database</th>
                      <th>Activity</th>
                      <th>Total CPU</th>
                      <th>Elapsed</th>
                      <th>Memory</th>
                      <th>Disk I/O</th>
                      <th>Network</th>
                      <th>Execs</th>
                      <th>Avg CPU/Exec</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CPU_SPIKE_TOP_QUERIES.map((query, i) => (
                      <tr key={i}>
                        <td>{query.database}</td>
                        <td className="activity-cell" title={query.activity}>{query.activity}</td>
                        <td>{query.totalCPU}</td>
                        <td>{query.elapsed}</td>
                        <td>{query.memory}</td>
                        <td>{query.diskIO}</td>
                        <td>{query.network}</td>
                        <td>{query.execs}</td>
                        <td>{query.avgCPU}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Follow-up text for combined messages (V2 flow) - appears after query table */}
        {content.followUpText && Array.isArray(content.followUpText) && showQueryTable && (
          <div className="followup-text-section fade-in">
            {content.followUpText.map((t, i) => (
              <p key={i} className="message-text">
                {t.type === 'bold' && <strong>{t.content}</strong>}
                {t.type === 'text' && t.content}
                {t.type === 'mixed' && (
                  <>
                    {t.content}<strong>{t.bold}</strong>{t.after}{t.bold2 && <strong>{t.bold2}</strong>}{t.after2}{t.bold3 && <strong>{t.bold3}</strong>}
                  </>
                )}
              </p>
            ))}
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

        {content.sourceSelector && (!isTyping || paragraphsCompleted) && (
          <div className="aura-source-selector fade-in">
            <div className="aura-selector-label">{content.sourceSelector.label}</div>
            <div className="aura-source-options">
              {content.sourceSelector.options.map((opt) => (
                <button
                  key={opt.id}
                  className="aura-source-btn"
                  onClick={() => onAction(opt.label)}
                >
                  <DataSourceLogo name={opt.icon} />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {content.connectionTypeSelector && (!isTyping || paragraphsCompleted) && (
          <div className="aura-connection-type-selector fade-in">
            <div className="aura-connection-type-options">
              {content.connectionTypeSelector.options.map((opt) => (
                <button
                  key={opt.id}
                  className="aura-connection-type-btn"
                  onClick={() => onAction(opt.label)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {content.savedConnectionSelector && (!isTyping || paragraphsCompleted) && (
          <div className="aura-saved-connection-selector fade-in">
            <div className="aura-saved-connection-options">
              {content.savedConnectionSelector.options.map((opt) => (
                <button
                  key={opt.id}
                  className="aura-saved-connection-btn"
                  onClick={() => onAction(opt.label)}
                >
                  <DataSourceLogo name="snowflake" size={20} />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {content.catalogSelector && (!isTyping || paragraphsCompleted) && (
          <div className="aura-catalog-selector-grouped fade-in">
            {content.catalogSelector.availableCatalogs && content.catalogSelector.availableCatalogs.length > 0 && (
              <div className="aura-catalog-group">
                <div className="aura-catalog-group-label">Available catalogs</div>
                <div className="aura-catalog-group-options">
                  {content.catalogSelector.availableCatalogs.map((opt) => (
                    <button
                      key={opt.id}
                      className="aura-catalog-option-btn"
                      onClick={() => onAction(opt.label)}
                    >
                      <IconFA name="database" size={16} />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {content.catalogSelector.externalCatalogs && content.catalogSelector.externalCatalogs.length > 0 && (
              <div className="aura-catalog-group">
                <div className="aura-catalog-group-label">External / federated</div>
                <div className="aura-catalog-group-options">
                  {content.catalogSelector.externalCatalogs.map((opt) => (
                    <button
                      key={opt.id}
                      className="aura-catalog-option-btn external"
                      onClick={() => onAction(opt.label)}
                    >
                      <IconFA name="database" size={16} />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {content.catalogChecklist && (!isTyping || paragraphsCompleted) && (
          <div className="aura-catalog-checklist fade-in">
            <div className="aura-catalog-checklist-items">
              {content.catalogChecklist.catalogs.map((catalog) => (
                <label key={catalog.id} className="aura-catalog-checklist-item">
                  <input
                    type="checkbox"
                    defaultChecked={catalog.checked}
                  />
                  <span>{catalog.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {content.workspaceSelector && (!isTyping || paragraphsCompleted) && (
          <div className="aura-workspace-selector fade-in">
            <div className="aura-workspace-options">
              {content.workspaceSelector.options.map((opt) => (
                <div key={opt.id} className="aura-workspace-option">
                  {opt.subOptions ? (
                    <span className="aura-workspace-label">{opt.label}</span>
                  ) : (
                    <button
                      className="aura-workspace-btn"
                      onClick={() => onAction(opt.label)}
                    >
                      {opt.label}
                    </button>
                  )}
                  {opt.subOptions && (
                    <div className="aura-workspace-suboptions">
                      <div className="aura-workspace-suboptions-header">
                        <span className="aura-ws-col-radio"></span>
                        <span className="aura-ws-col-name">Name</span>
                        <span className="aura-ws-col-project">Project</span>
                        <span className="aura-ws-col-cloud">Cloud & Region</span>
                      </div>
                      {opt.subOptions.map((sub) => (
                        <div
                          key={sub.id}
                          className="aura-workspace-suboption"
                          onClick={() => onAction(sub.name)}
                        >
                          <div className="aura-ws-col-radio">
                            <input
                              type="radio"
                              name="workspace-selection"
                              className="aura-ws-radio"
                              readOnly
                            />
                          </div>
                          <div className="aura-ws-col-name">
                            <div className="aura-ws-icon">
                              {sub.status === 'active' ? <WorkspaceIconActive /> : <WorkspaceIconSuspended />}
                            </div>
                            <div className="aura-ws-name-info">
                              <span className="aura-ws-name">{sub.name}</span>
                              <div className="aura-ws-meta">
                                <span className="aura-ws-group">{sub.group}</span>
                                <span className={`aura-ws-env-badge ${sub.env === 'Prod' ? 'prod' : 'non-prod'}`}>{sub.env}</span>
                              </div>
                            </div>
                          </div>
                          <div className="aura-ws-col-project">
                            <span className="aura-ws-project-name">{sub.project}</span>
                            <span className={`aura-ws-project-type ${sub.projectType.toLowerCase()}`}>{sub.projectType}</span>
                          </div>
                          <div className="aura-ws-col-cloud">{sub.cloudRegion}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {content.tablePreview && (!isTyping || paragraphsCompleted) && (
          <div className="aura-table-preview fade-in">
            <div className="aura-table-preview-title">{content.tablePreview.title}</div>
            <div className="aura-table-preview-list">
              {content.tablePreview.tables.map((table, i) => (
                <div key={i} className="aura-table-preview-item">
                  <span className="aura-table-preview-name">{table.name}</span>
                  {table.rows && <span className="aura-table-preview-rows">{table.rows}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {content.speedLayerStats && (!isTyping || paragraphsCompleted) && (
          <div className="aura-speed-layer-stats fade-in">
            {content.speedLayerStats.stats.map((stat, i) => (
              <div key={i} className="aura-speed-stat">
                <span className="aura-speed-stat-label">{stat.label}</span>
                <span className={`aura-speed-stat-value ${stat.success ? 'success' : ''}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        )}

        {content.speedLayerStatus && (!isTyping || paragraphsCompleted) && (
          <div className="aura-speed-layer-status fade-in">
            {content.speedLayerStatus.stats.map((stat, i) => (
              <div key={i} className="aura-speed-status-stat">
                <span className="aura-speed-status-label">{stat.label}</span>
                <span className={`aura-speed-status-value ${stat.warning ? 'warning' : ''}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        )}

        {content.debugResult && (!isTyping || paragraphsCompleted) && (
          <div className="aura-debug-result fade-in">
            <div className="aura-debug-title">{content.debugResult.title}</div>
            <ul className="aura-debug-items">
              {content.debugResult.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
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

        {/* Support Agent Billing: Credit Usage Chart */}
        {content.billingChart && (!isTyping || paragraphsCompleted) && (
          <div className="aura-billing-chart fade-in">
            <div className="aura-billing-chart-header">
              <IconFA name="chart-line" />
              <span>{content.billingChart.title}</span>
              <span className="aura-billing-trend-badge">
                <IconFA name="arrow-trend-up" />
                <span>+45%</span>
              </span>
            </div>
            <div className="aura-billing-chart-content">
              <div className="aura-billing-section aura-billing-historical">
                <div className="aura-billing-section-title">
                  <span className="aura-billing-dot aura-billing-dot-historical"></span>
                  Last 3 months
                </div>
                {content.billingChart.historical.map((item, i) => {
                  const creditNum = parseInt(item.credits.replace('K', '')) * 1000
                  const barWidth = Math.min((creditNum / 160000) * 100, 100)
                  return (
                    <div key={i} className="aura-billing-row">
                      <span className="aura-billing-month">{item.month}</span>
                      <div className="aura-billing-bar-container">
                        <div className="aura-billing-bar aura-billing-bar-historical" style={{ width: `${barWidth}%` }}></div>
                      </div>
                      <span className="aura-billing-value">{item.credits} CR</span>
                    </div>
                  )
                })}
              </div>
              <div className="aura-billing-divider"></div>
              <div className="aura-billing-section aura-billing-forecast">
                <div className="aura-billing-section-title">
                  <span className="aura-billing-dot aura-billing-dot-forecast"></span>
                  Forecast
                </div>
                {content.billingChart.forecast.map((item, i) => {
                  const creditNum = parseInt(item.credits.replace('K', '')) * 1000
                  const barWidth = Math.min((creditNum / 160000) * 100, 100)
                  return (
                    <div key={i} className="aura-billing-row aura-billing-row-forecast">
                      <span className="aura-billing-month">{item.month}</span>
                      <div className="aura-billing-bar-container">
                        <div className="aura-billing-bar aura-billing-bar-forecast" style={{ width: `${barWidth}%` }}></div>
                      </div>
                      <span className="aura-billing-value">{item.credits} CR</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Support Agent Billing: Analysis Text - only render when billingChart is present to avoid duplication with V2 flow renderer */}
        {content.billingChart && content.analysisText && (!isTyping || paragraphsCompleted) && (
          <div className="aura-billing-analysis fade-in">
            {content.analysisText.map((item, i) => (
              <p key={i} className="message-text">
                {item.type === 'text' && item.content}
                {item.type === 'bold' && <strong>{item.content}</strong>}
                {item.type === 'mixed' && (
                  <>
                    {item.content}<strong>{item.bold}</strong>{item.after}
                    {item.bold2 && <strong>{item.bold2}</strong>}{item.after2}
                    {item.bold3 && <strong>{item.bold3}</strong>}
                  </>
                )}
              </p>
            ))}
          </div>
        )}

        {/* Support Agent Billing: Recommendation Checklist */}
        {content.billingRecommendations && (!isTyping || paragraphsCompleted) && (
          <BillingChecklist 
            recommendations={content.billingRecommendations} 
            onAction={onAction}
          />
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

        {content.actions && !content.progress && (message.showContent !== false) && paragraphsCompleted && (!isMultiStageMessage || (analysisCompleted && showQueryTable)) && !(content.connections && showConnections) && (
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
    'headphones': '\uf025',
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
    'chevron-up': '\uf077',
    'chevron-right': '\uf054',
    'check': '\uf00c',
    'check-double': '\uf560',
    'spinner': '\uf110',
    'circle-info': '\uf05a',
    'lightbulb': '\uf0eb',
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
    'arrow-right-from-bracket': '\uf08b',
    'expand': '\uf065',
    'compress': '\uf066',
    'bolt': '\uf0e7',
    'play': '\uf04b',
    'table': '\uf0ce',
    'check-circle': '\uf058',
    'browser': '\uf37e',
    'microchip': '\uf2db',
    'server': '\uf233',
    'download': '\uf019',
    'chart-column': '\ue0e3',
    'pause': '\uf04c',
    'credit-card': '\uf09d',
    'arrow-trend-up': '\ue098',
    'arrow-right': '\uf061',
    'headphones': '\uf025',
    'eye': '\uf06e',
    'pen-to-square': '\uf044',
    'trash': '\uf1f8',
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
  { id: 'lakehouse', name: 'Lakehouse Agent', icon: 'layer-group' },
  { id: 'query-tuning', name: 'Query Tuning Agent', icon: 'chart-line' },
  { id: 'support', name: 'Support Agent', icon: 'headphones' },
  { id: 'observability', name: 'Observability Agent', icon: 'chart-line' },
  { id: 'incident', name: 'Incident Agent', icon: 'warning' },
]

function BillingChecklist({ recommendations, onAction }) {
  const [activeIndex, setActiveIndex] = useState(null)

  const handleCardClick = (index) => {
    setActiveIndex(activeIndex === index ? null : index)
  }

  return (
    <div className="billing-recs fade-in">
      {recommendations.map((rec, i) => (
        <div 
          key={i} 
          className={`billing-rec ${activeIndex === i ? 'active' : ''}`}
          onClick={() => handleCardClick(i)}
        >
          <div className="billing-rec-content">
            <span className="billing-rec-title">{rec.title}</span>
            {rec.actionParts && (
              <p className="billing-rec-action">
                {rec.actionParts.map((part, j) => 
                  part.bold ? <strong key={j}>{part.text}</strong> : <span key={j}>{part.text}</span>
                )}
              </p>
            )}
            {rec.description && <p className="billing-rec-desc">{rec.description}</p>}
          </div>
          <div className="billing-rec-buttons" onClick={(e) => e.stopPropagation()}>
            {rec.cta && (
              <button className="billing-rec-btn" onClick={() => onAction(rec.cta)}>
                {rec.cta}
              </button>
            )}
            {rec.ctas && rec.ctas.map((cta, j) => (
              <button 
                key={j} 
                className="billing-rec-btn"
                onClick={() => onAction(cta)}
              >
                {cta}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

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

// ============================================
// SHARED AGENT INPUT COMPONENT
// Used in both Homepage and Side Panel
// ============================================
function AgentInput({ 
  variant = 'panel',
  inputValue, 
  setInputValue, 
  onSend, 
  selectedAgent,
  onAgentSelect,
  placeholder = 'Ask anything...',
  disabled = false
}) {
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

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
      if (inputValue?.trim() && onSend) {
        onSend(inputValue)
      }
    }
  }

  const handleAgentClick = (agent) => {
    if (onAgentSelect) {
      onAgentSelect(agent)
    }
    setAgentDropdownOpen(false)
  }

  const isHomepage = variant === 'homepage'
  const containerClass = isHomepage ? 'agent-input agent-input-homepage' : 'agent-input agent-input-panel'

  return (
    <div className={containerClass}>
      <textarea
        placeholder={placeholder}
        value={inputValue || ''}
        onChange={(e) => setInputValue && setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={2}
        disabled={disabled}
      />
      <div className="agent-input-controls">
        <div className="agent-input-actions">
          <button className="icon-btn" type="button">
            <PlusIcon />
          </button>
          {isHomepage && (
            <button className="icon-btn" type="button">
              <MicIcon />
            </button>
          )}
          <div className="agent-dropdown-wrapper" ref={dropdownRef}>
            <button 
              className="agent-selector-btn"
              onClick={() => setAgentDropdownOpen(!agentDropdownOpen)}
              type="button"
            >
              <IconFA name={selectedAgent?.icon || 'sparkles'} size={14} />
              <span>{selectedAgent?.name || 'Aura Agent'}</span>
              <ChevronDownIcon className="chevron" />
            </button>
            {agentDropdownOpen && (
              <div className="agent-dropdown">
                {AURA_AGENTS.map((agent) => (
                  <button
                    key={agent.id}
                    className={`agent-dropdown-option ${selectedAgent?.id === agent.id ? 'selected' : ''}`}
                    onClick={() => handleAgentClick(agent)}
                    type="button"
                  >
                    <IconFA name={agent.icon} size={14} />
                    <span>{agent.name}</span>
                    {selectedAgent?.id === agent.id && <IconFA name="check" size={12} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <button 
          className="send-btn" 
          disabled={!inputValue?.trim() || disabled} 
          onClick={() => onSend && onSend(inputValue)}
          type="button"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  )
}

function AuraSidePanel({ isOpen, isFullscreen, sidebarExpanded, width, onClose, onToggleFullscreen, onWidthChange, messages, inputValue, setInputValue, onSend, onAction, onAdvanceSilently, isTyping, chatEndRef, agentName = 'Aura Agent', onAgentChange, onNewChat, queryTuningResult, queryTuningContext, onApplyQuery, pageContext, onNavigate }) {
  const [isResizing, setIsResizing] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState(() => 
    AURA_AGENTS.find(a => a.name === agentName) || AURA_AGENTS[0]
  )
  const [showConnections, setShowConnections] = useState(false)
  const [typedMessageIds, setTypedMessageIds] = useState(new Set())
  const [expandedQueryIndex, setExpandedQueryIndex] = useState(null)
  const panelRef = useRef(null)
  
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

  const handleAgentSelect = (agent) => {
    // If selecting a different agent, start a new conversation
    if (agent.name !== selectedAgent.name && onAgentChange) {
      onAgentChange(agent.name)
    }
    setSelectedAgent(agent)
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

        {allDone && content.sourceSelector && (
          <div className="aura-source-selector aura-fade-in">
            <div className="aura-selector-label">{content.sourceSelector.label}</div>
            <div className="aura-source-options">
              {content.sourceSelector.options.map((opt) => (
                <button
                  key={opt.id}
                  className="aura-source-btn"
                  onClick={() => handleAction(opt.label)}
                >
                  <DataSourceLogo name={opt.icon} />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {allDone && content.connectionTypeSelector && (
          <div className="aura-connection-type-selector aura-fade-in">
            <div className="aura-connection-type-options">
              {content.connectionTypeSelector.options.map((opt) => (
                <button
                  key={opt.id}
                  className="aura-connection-type-btn"
                  onClick={() => handleAction(opt.label)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {allDone && content.savedConnectionSelector && (
          <div className="aura-saved-connection-selector aura-fade-in">
            <div className="aura-saved-connection-options">
              {content.savedConnectionSelector.options.map((opt) => (
                <button
                  key={opt.id}
                  className="aura-saved-connection-btn"
                  onClick={() => handleAction(opt.label)}
                >
                  <DataSourceLogo name="snowflake" size={20} />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {allDone && content.catalogSelector && (
          <div className="aura-catalog-selector-grouped aura-fade-in">
            {content.catalogSelector.availableCatalogs && content.catalogSelector.availableCatalogs.length > 0 && (
              <div className="aura-catalog-group">
                <div className="aura-catalog-group-label">Available catalogs</div>
                <div className="aura-catalog-group-options">
                  {content.catalogSelector.availableCatalogs.map((opt) => (
                    <button
                      key={opt.id}
                      className="aura-catalog-option-btn"
                      onClick={() => handleAction(opt.label)}
                    >
                      <IconFA name="database" size={16} />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {content.catalogSelector.externalCatalogs && content.catalogSelector.externalCatalogs.length > 0 && (
              <div className="aura-catalog-group">
                <div className="aura-catalog-group-label">External / federated</div>
                <div className="aura-catalog-group-options">
                  {content.catalogSelector.externalCatalogs.map((opt) => (
                    <button
                      key={opt.id}
                      className="aura-catalog-option-btn external"
                      onClick={() => handleAction(opt.label)}
                    >
                      <IconFA name="database" size={16} />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {allDone && content.catalogChecklist && (
          <div className="aura-catalog-checklist aura-fade-in">
            <div className="aura-catalog-checklist-items">
              {content.catalogChecklist.catalogs.map((catalog) => (
                <label key={catalog.id} className="aura-catalog-checklist-item">
                  <input
                    type="checkbox"
                    defaultChecked={catalog.checked}
                  />
                  <span>{catalog.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {allDone && content.workspaceSelector && (
          <div className="aura-workspace-selector aura-fade-in">
            <div className="aura-workspace-options">
              {content.workspaceSelector.options.map((opt) => (
                <div key={opt.id} className="aura-workspace-option">
                  {opt.subOptions ? (
                    <span className="aura-workspace-label">{opt.label}</span>
                  ) : (
                    <button
                      className="aura-workspace-btn"
                      onClick={() => handleAction(opt.label)}
                    >
                      {opt.label}
                    </button>
                  )}
                  {opt.subOptions && (
                    <div className="aura-workspace-suboptions">
                      <div className="aura-workspace-suboptions-header">
                        <span className="aura-ws-col-radio"></span>
                        <span className="aura-ws-col-name">Name</span>
                        <span className="aura-ws-col-project">Project</span>
                        <span className="aura-ws-col-cloud">Cloud & Region</span>
                      </div>
                      {opt.subOptions.map((sub) => (
                        <div
                          key={sub.id}
                          className="aura-workspace-suboption"
                          onClick={() => handleAction(sub.name)}
                        >
                          <div className="aura-ws-col-radio">
                            <input
                              type="radio"
                              name="workspace-selection-panel"
                              className="aura-ws-radio"
                              readOnly
                            />
                          </div>
                          <div className="aura-ws-col-name">
                            <div className="aura-ws-icon">
                              {sub.status === 'active' ? <WorkspaceIconActive /> : <WorkspaceIconSuspended />}
                            </div>
                            <div className="aura-ws-name-info">
                              <span className="aura-ws-name">{sub.name}</span>
                              <div className="aura-ws-meta">
                                <span className="aura-ws-group">{sub.group}</span>
                                <span className={`aura-ws-env-badge ${sub.env === 'Prod' ? 'prod' : 'non-prod'}`}>{sub.env}</span>
                              </div>
                            </div>
                          </div>
                          <div className="aura-ws-col-project">
                            <span className="aura-ws-project-name">{sub.project}</span>
                            <span className={`aura-ws-project-type ${sub.projectType.toLowerCase()}`}>{sub.projectType}</span>
                          </div>
                          <div className="aura-ws-col-cloud">{sub.cloudRegion}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {allDone && content.tablePreview && (
          <div className="aura-table-preview aura-fade-in">
            <div className="aura-table-preview-title">{content.tablePreview.title}</div>
            <div className="aura-table-preview-list">
              {content.tablePreview.tables.map((table, i) => (
                <div key={i} className="aura-table-preview-item">
                  <span className="aura-table-preview-name">{table.name}</span>
                  {table.rows && <span className="aura-table-preview-rows">{table.rows}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {allDone && content.speedLayerStats && (
          <div className="aura-speed-layer-stats aura-fade-in">
            {content.speedLayerStats.stats.map((stat, i) => (
              <div key={i} className="aura-speed-stat">
                <span className="aura-speed-stat-label">{stat.label}</span>
                <span className={`aura-speed-stat-value ${stat.success ? 'success' : ''}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        )}

        {allDone && content.speedLayerStatus && (
          <div className="aura-speed-layer-status aura-fade-in">
            {content.speedLayerStatus.stats.map((stat, i) => (
              <div key={i} className="aura-speed-status-stat">
                <span className="aura-speed-status-label">{stat.label}</span>
                <span className={`aura-speed-status-value ${stat.warning ? 'warning' : ''}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        )}

        {allDone && content.debugResult && (
          <div className="aura-debug-result aura-fade-in">
            <div className="aura-debug-title">{content.debugResult.title}</div>
            <ul className="aura-debug-items">
              {content.debugResult.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
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
            <h4>Why S-224?</h4>
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
              {content.queries.map((query, i) => {
                const isExpanded = expandedQueryIndex === i
                return (
                  <div 
                    key={i} 
                    className={`query-card ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => setExpandedQueryIndex(isExpanded ? null : i)}
                  >
                    <div className="query-card-header">
                      <div className="query-card-left">
                        <span className="query-name">{query.name}</span>
                        <div className="query-badges">
                          <span className={`badge ${query.cpuType}`}>{query.cpu}</span>
                          <span className="badge warning">{query.time}</span>
                          <span className="badge neutral">{query.frequency}</span>
                        </div>
                        <div className="query-description">
                          <span>{query.desc1}</span>
                        </div>
                      </div>
                      <div className="query-card-chevron">
                        <IconFA name={isExpanded ? 'chevron-down' : 'chevron-right'} size={12} />
                      </div>
                    </div>
                    <div className={`query-card-details ${isExpanded ? 'show' : ''}`}>
                      <div className="query-card-details-inner">
                        {query.sql && (
                          <div className="query-sql-block">
                            <pre><code>{query.sql}</code></pre>
                          </div>
                        )}
                        {query.recommendations && (
                          <div className="query-recommendations">
                            <span className="recommendations-label">Optimization recommendations:</span>
                            <ul>
                              {query.recommendations.map((rec, j) => (
                                <li key={j}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <button className="query-apply-btn" onClick={(e) => { e.stopPropagation(); }}>
                          <IconFA name="bolt" size={12} />
                          <span>Apply optimization</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
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
                  <div className="option-icon">
                    <IconFA name={option.icon} />
                  </div>
                  <div className="option-card-content">
                    <div className="option-card-header">
                      <span className="option-title">{option.title}</span>
                      <span className={`badge ${option.impactType}`}>{option.impact}</span>
                    </div>
                    <p className="option-description">{option.description}</p>
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
            <h3>{(AGENT_CONFIG[agentName] || AGENT_CONFIG['Aura Agent']).title}</h3>
            <p>{pageContext === 'billing' && agentName === 'Aura Agent'
              ? 'I can help you monitor credit usage, prevent overages, and optimize compute costs across your workspaces.'
              : (AGENT_CONFIG[agentName] || AGENT_CONFIG['Aura Agent']).description}</p>
            <div className="aura-suggested-prompts">
              {(pageContext === 'billing' && agentName === 'Aura Agent' 
                ? BILLING_PROMPTS 
                : (AGENT_CONFIG[agentName] || AGENT_CONFIG['Aura Agent']).prompts
              ).map((prompt, i) => (
                <button 
                  key={i} 
                  className="aura-prompt-chip"
                  onClick={() => {
                    // Directly send the prompt instead of just setting input
                    onSend(prompt)
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
                agentName={message.agentName || agentName}
                compact={true}
                onAdvanceSilently={onAdvanceSilently}
                onNavigate={onNavigate}
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
        <AgentInput
          variant="panel"
          inputValue={inputValue}
          setInputValue={setInputValue}
          onSend={onSend}
          selectedAgent={selectedAgent}
          onAgentSelect={handleAgentSelect}
          placeholder={pageContext === 'billing' && agentName === 'Aura Agent' 
            ? 'Ask about billing, usage, or cost optimization...' 
            : (AGENT_CONFIG[agentName] || AGENT_CONFIG['Aura Agent']).placeholder}
        />
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

function EditorView({ onOpenAura, pendingEditorQuery, onClearPendingQuery }) {
  // Tab management state
  const [editorTabs, setEditorTabs] = useState([
    { id: 'tab-1', name: 'untitled query-1.sql', query: SAMPLE_QUERY }
  ])
  const [activeEditorTab, setActiveEditorTab] = useState('tab-1')
  
  // Get the current tab's query
  const currentTab = editorTabs.find(t => t.id === activeEditorTab) || editorTabs[0]
  const query = currentTab?.query || ''
  
  // Update query for current tab
  const setQuery = (newQuery) => {
    setEditorTabs(prev => prev.map(tab => 
      tab.id === activeEditorTab ? { ...tab, query: newQuery } : tab
    ))
  }
  
  // Editor state
  const [selectedQuery, setSelectedQuery] = useState('')
  const [selectionPosition, setSelectionPosition] = useState(null)
  const [queryHistory, setQueryHistory] = useState(SAMPLE_QUERY_HISTORY)
  const [isRunning, setIsRunning] = useState(false)
  const [activeResultTab, setActiveResultTab] = useState('logs')
  
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
  const processedQueryRef = useRef(null) // Track processed query to prevent duplicates
  
  // Handle pending editor query from Aura panel
  useEffect(() => {
    if (!pendingEditorQuery) return
    
    // Prevent duplicate processing by checking if we've already processed this exact query
    const queryKey = `${pendingEditorQuery.title}-${pendingEditorQuery.query}`
    if (processedQueryRef.current === queryKey) return
    processedQueryRef.current = queryKey
    
    const newTabId = `tab-${Date.now()}`
    const newTab = {
      id: newTabId,
      name: `${pendingEditorQuery.title}.sql`,
      query: pendingEditorQuery.query
    }
    setEditorTabs(prev => [...prev, newTab])
    setActiveEditorTab(newTabId)
    onClearPendingQuery?.()
    
    // Reset the processed query ref after a short delay to allow for future queries
    setTimeout(() => {
      processedQueryRef.current = null
    }, 100)
  }, [pendingEditorQuery, onClearPendingQuery])

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
              {editorTabs.map(tab => (
                <button 
                  key={tab.id}
                  className={`editor-tab ${activeEditorTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveEditorTab(tab.id)}
                >
                  <IconFA name="database" size={14} />
                  <span>{tab.name}</span>
                  {editorTabs.length > 1 && (
                    <span 
                      className="editor-tab-close" 
                      onClick={(e) => {
                        e.stopPropagation()
                        const remaining = editorTabs.filter(t => t.id !== tab.id)
                        setEditorTabs(remaining)
                        if (activeEditorTab === tab.id && remaining.length > 0) {
                          setActiveEditorTab(remaining[0].id)
                        }
                      }}
                    >×</span>
                  )}
                </button>
              ))}
              <button 
                className="editor-tab-add"
                onClick={() => {
                  const newId = `tab-${Date.now()}`
                  const tabNum = editorTabs.length + 1
                  setEditorTabs(prev => [...prev, { id: newId, name: `untitled query-${tabNum}.sql`, query: '' }])
                  setActiveEditorTab(newId)
                }}
              >+</button>
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
                className={`results-tab ${activeResultTab === 'logs' ? 'active' : ''}`}
                onClick={() => setActiveResultTab('logs')}
              >
                <span>Message Logs</span>
              </button>
              {queryHistory.slice(0, 3).map((item, index) => (
                <button 
                  key={item.id}
                  className={`results-tab ${activeResultTab === `result-${index}` ? 'active' : ''}`}
                  onClick={() => setActiveResultTab(`result-${index}`)}
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
              {activeResultTab === 'logs' ? (
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
