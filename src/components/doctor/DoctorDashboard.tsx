'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { NewFollowUpDialog } from './NewFollowUpDialog'
import { LogoutButton } from '@/components/LogoutButton'
import type { PatientSummary } from '@/lib/services/doctor.service'
import type { RiskLevel } from '@/types/database'

interface DoctorDashboardProps {
  patients: PatientSummary[]
  doctorName: string
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

function formatDate(date: Date | null): string {
  if (!date) {
    return 'Never'
  }
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function DoctorDashboard({ patients, doctorName }: DoctorDashboardProps) {
  const [isFollowUpDialogOpen, setIsFollowUpDialogOpen] = useState(false)

  const alertCount = patients.filter((p) => p.riskLevel === 'alert').length
  const driftCount = patients.filter((p) => p.riskLevel === 'drift').length
  const stableCount = patients.filter((p) => p.riskLevel === 'stable').length

  const sortedPatients = [...patients].sort((a, b) => {
    const riskOrder: Record<RiskLevel | 'unknown', number> = {
      alert: 0,
      drift: 1,
      stable: 2,
      unknown: 3,
    }
    return riskOrder[a.riskLevel] - riskOrder[b.riskLevel]
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Doctor Dashboard</h1>
          <p className="text-gray-600">Welcome back, Dr. {doctorName}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsFollowUpDialogOpen(true)}>
            New Follow-Up
          </Button>
          <LogoutButton variant="outline" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Patients</CardDescription>
            <CardTitle className="text-3xl">{patients.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardDescription>Alert</CardDescription>
            <CardTitle className="text-3xl text-red-600">{alertCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-yellow-200">
          <CardHeader className="pb-2">
            <CardDescription>Drift</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{driftCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardDescription>Stable</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stableCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patient Roster</CardTitle>
          <CardDescription>
            View and manage your patients. Sorted by risk level.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {patients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No patients yet.</p>
              <p className="text-sm mt-2">
                Create a follow-up request to connect with a patient.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Last Check-in</TableHead>
                  <TableHead>Mood Score</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPatients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium">{patient.name}</TableCell>
                    <TableCell>{patient.email}</TableCell>
                    <TableCell>{formatDate(patient.lastCheckIn)}</TableCell>
                    <TableCell>
                      {patient.moodScore !== null ? (
                        <span className="font-semibold">{patient.moodScore}/10</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRiskBadgeStyles(patient.riskLevel)}`}
                      >
                        {getRiskLabel(patient.riskLevel)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/doctor/patients/${patient.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NewFollowUpDialog
        open={isFollowUpDialogOpen}
        onOpenChange={setIsFollowUpDialogOpen}
      />
    </div>
  )
}
