import type { User, DailyLog } from '@/lib/db/schema'
import type { RiskLevel } from '@/types/database'

export class DoctorServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'DoctorServiceError'
  }
}

interface UserRepository {
  findById(id: string): Promise<User | null>
  findPatientsByDoctorId(doctorId: string): Promise<User[]>
  updateDoctorId(userId: string, doctorId: string): Promise<User>
}

interface DailyLogRepository {
  getLatestByUserId(userId: string): Promise<DailyLog | null>
  findByUserId(userId: string, limit?: number): Promise<DailyLog[]>
}

export interface PatientSummary {
  id: string
  name: string
  email: string
  lastCheckIn: Date | null
  moodScore: number | null
  riskLevel: RiskLevel | 'unknown'
}

export interface MoodHistoryEntry {
  id: string
  moodScore: number
  riskFlag: boolean
  date: Date
  clinicalSummary: string
}

export interface PatientDetail {
  patient: {
    id: string
    name: string
    email: string
    createdAt: Date
  }
  moodHistory: MoodHistoryEntry[]
  riskLevel: RiskLevel | 'unknown'
  currentMoodScore: number | null
}

function calculateRiskLevel(moodScore: number | null, riskFlag: boolean): RiskLevel | 'unknown' {
  if (moodScore === null) {
    return 'unknown'
  }
  if (riskFlag || moodScore < 3) {
    return 'alert'
  }
  if (moodScore < 5) {
    return 'drift'
  }
  return 'stable'
}

export class DoctorService {
  constructor(
    private userRepository: UserRepository,
    private dailyLogRepository: DailyLogRepository
  ) {}

  async getPatients(doctorId: string): Promise<PatientSummary[]> {
    const patients = await this.userRepository.findPatientsByDoctorId(doctorId)

    const patientSummaries = await Promise.all(
      patients.map(async (patient) => {
        const latestLog = await this.dailyLogRepository.getLatestByUserId(patient.id)

        return {
          id: patient.id,
          name: patient.name,
          email: patient.email,
          lastCheckIn: latestLog?.createdAt ?? null,
          moodScore: latestLog?.moodScore ?? null,
          riskLevel: calculateRiskLevel(
            latestLog?.moodScore ?? null,
            latestLog?.riskFlag ?? false
          ),
        }
      })
    )

    return patientSummaries
  }

  async getPatientDetail(doctorId: string, patientId: string): Promise<PatientDetail> {
    const patient = await this.userRepository.findById(patientId)

    if (!patient) {
      throw new DoctorServiceError('Patient not found', 'NOT_FOUND')
    }

    if (patient.doctorId !== doctorId) {
      throw new DoctorServiceError('Unauthorized', 'UNAUTHORIZED')
    }

    const logs = await this.dailyLogRepository.findByUserId(patientId, 30)

    const moodHistory: MoodHistoryEntry[] = logs.map((log) => ({
      id: log.id,
      moodScore: log.moodScore,
      riskFlag: log.riskFlag,
      date: log.createdAt,
      clinicalSummary: log.analysisJson.clinical_summary,
    }))

    const latestLog = logs[0] ?? null

    return {
      patient: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        createdAt: patient.createdAt,
      },
      moodHistory,
      riskLevel: calculateRiskLevel(
        latestLog?.moodScore ?? null,
        latestLog?.riskFlag ?? false
      ),
      currentMoodScore: latestLog?.moodScore ?? null,
    }
  }

  async linkPatientToDoctor(patientId: string, doctorId: string): Promise<User> {
    return this.userRepository.updateDoctorId(patientId, doctorId)
  }
}
