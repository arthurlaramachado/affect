'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Dot,
} from 'recharts'
import type { MoodHistoryEntry } from '@/lib/services/doctor.service'

interface MoodChartProps {
  moodHistory: MoodHistoryEntry[]
}

interface ChartDataPoint {
  date: string
  moodScore: number
  riskFlag: boolean
  fullDate: string
}

function formatChartData(moodHistory: MoodHistoryEntry[]): ChartDataPoint[] {
  return [...moodHistory]
    .reverse()
    .map((entry) => ({
      date: new Date(entry.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      moodScore: entry.moodScore,
      riskFlag: entry.riskFlag,
      fullDate: new Date(entry.date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    }))
}

interface CustomDotProps {
  cx?: number
  cy?: number
  payload?: ChartDataPoint
}

function CustomDot({ cx, cy, payload }: CustomDotProps) {
  if (cx === undefined || cy === undefined || !payload) {
    return null
  }

  if (payload.riskFlag) {
    return (
      <Dot
        cx={cx}
        cy={cy}
        r={6}
        fill="#ef4444"
        stroke="#dc2626"
        strokeWidth={2}
      />
    )
  }

  return (
    <Dot
      cx={cx}
      cy={cy}
      r={4}
      fill="#3b82f6"
      stroke="#2563eb"
      strokeWidth={1}
    />
  )
}

interface TooltipPayload {
  payload: ChartDataPoint
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900">{data.fullDate}</p>
        <p className="text-sm text-gray-600">
          Mood Score: <span className="font-semibold">{data.moodScore}/10</span>
        </p>
        {data.riskFlag && (
          <p className="text-sm text-red-600 font-medium mt-1">Risk Flag</p>
        )}
      </div>
    )
  }
  return null
}

export function MoodChart({ moodHistory }: MoodChartProps) {
  const chartData = formatChartData(moodHistory)

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
            tickLine={{ stroke: '#9ca3af' }}
          />
          <YAxis
            domain={[0, 10]}
            ticks={[0, 2, 4, 6, 8, 10]}
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
            tickLine={{ stroke: '#9ca3af' }}
            label={{
              value: 'Mood Score',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: '#6b7280', fontSize: 12 },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={3}
            stroke="#f87171"
            strokeDasharray="5 5"
            label={{
              value: 'Alert threshold',
              position: 'right',
              fill: '#f87171',
              fontSize: 10,
            }}
          />
          <ReferenceLine
            y={5}
            stroke="#fbbf24"
            strokeDasharray="5 5"
            label={{
              value: 'Drift threshold',
              position: 'right',
              fill: '#fbbf24',
              fontSize: 10,
            }}
          />
          <Line
            type="monotone"
            dataKey="moodScore"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
