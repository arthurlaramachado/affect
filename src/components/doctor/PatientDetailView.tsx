'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { MoodChart } from './MoodChart'
import type { PatientDetail } from '@/lib/services/doctor.service'
import type { RiskLevel } from '@/types/database'

interface PatientDetailViewProps {
  patientDetail: PatientDetail
}

function getRiskBadgeStyles(riskLevel: RiskLevel | 'unknown'): string {
  switch (riskLevel) {
    case 'alert':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'drift':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'stable':
      return 'bg-green-100 text-green-800 border-green-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getRiskLabel(riskLevel: RiskLevel | 'unknown'): string {
  switch (riskLevel) {
    case 'alert':
      return 'Alert'
    case 'drift':
      return 'Drift'
    case 'stable':
      return 'Stable'
    default:
      return 'Unknown'
  }
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function PatientDetailView({ patientDetail }: PatientDetailViewProps) {
  const { patient, moodHistory, riskLevel, currentMoodScore } = patientDetail

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{patient.name}</h1>
          <p className="text-gray-600">{patient.email}</p>
          <p className="text-sm text-gray-500 mt-1">
            Patient since {formatDate(patient.createdAt)}
          </p>
        </div>
        <div className="text-right">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getRiskBadgeStyles(riskLevel)}`}
          >
            {getRiskLabel(riskLevel)}
          </span>
          {currentMoodScore !== null && (
            <p className="mt-2 text-2xl font-semibold">
              Mood: {currentMoodScore}/10
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current Mood Score</CardDescription>
            <CardTitle className="text-3xl">
              {currentMoodScore !== null ? `${currentMoodScore}/10` : '-'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Check-ins</CardDescription>
            <CardTitle className="text-3xl">{moodHistory.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Risk Flags</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {moodHistory.filter((h) => h.riskFlag).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mood History</CardTitle>
          <CardDescription>
            Last 30 days of mood tracking data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {moodHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No mood data available yet.</p>
              <p className="text-sm mt-2">
                Data will appear once the patient starts checking in.
              </p>
            </div>
          ) : (
            <MoodChart moodHistory={moodHistory} />
          )}
        </CardContent>
      </Card>

      {moodHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Clinical Summaries</CardTitle>
            <CardDescription>
              AI-generated insights from patient check-ins
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {moodHistory.slice(0, 5).map((entry) => (
                <div
                  key={entry.id}
                  className={`p-4 rounded-lg border ${
                    entry.riskFlag
                      ? 'bg-red-50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {new Date(entry.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        Mood: {entry.moodScore}/10
                      </span>
                      {entry.riskFlag && (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800">
                          Risk Flag
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{entry.clinicalSummary}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
