import React from 'react'
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from '@react-pdf/renderer'
import type { PatientReportData, MoodHistoryItem } from '../pdf-report.service'
import type { RiskLevel } from '@/types/database'
import type { MoodTrend } from '../insights.service'
import type { AIOverview } from '../ai-overview.service'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#4f46e5',
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 10,
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 4,
  },
  patientInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  infoItem: {
    width: '50%',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 11,
    color: '#1f2937',
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRowAlert: {
    backgroundColor: '#fef2f2',
  },
  tableCell: {
    fontSize: 10,
    color: '#4b5563',
  },
  col1: { width: '20%' },
  col2: { width: '15%' },
  col3: { width: '15%' },
  col4: { width: '50%' },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: '#f9fafb',
    padding: 12,
    marginRight: '2%',
    marginBottom: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  riskBadge: {
    padding: 6,
    borderRadius: 4,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  riskAlert: {
    backgroundColor: '#fee2e2',
  },
  riskDrift: {
    backgroundColor: '#fef3c7',
  },
  riskStable: {
    backgroundColor: '#d1fae5',
  },
  riskUnknown: {
    backgroundColor: '#e5e7eb',
  },
  riskText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  riskTextAlert: {
    color: '#dc2626',
  },
  riskTextDrift: {
    color: '#d97706',
  },
  riskTextStable: {
    color: '#059669',
  },
  riskTextUnknown: {
    color: '#6b7280',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
  },
  confidentialNotice: {
    fontSize: 9,
    color: '#dc2626',
    textAlign: 'center',
    marginTop: 5,
    fontWeight: 'bold',
  },
  emptyMessage: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    padding: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  // Mood History Card styles
  moodCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    padding: 12,
    marginBottom: 10,
  },
  moodCardAlert: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  moodCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 6,
  },
  moodCardDate: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#374151',
  },
  moodCardMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  moodCardScore: {
    fontSize: 10,
    color: '#4b5563',
  },
  moodCardRiskFlag: {
    fontSize: 10,
    color: '#dc2626',
    fontWeight: 'bold',
  },
  moodCardSummary: {
    fontSize: 10,
    color: '#4b5563',
    lineHeight: 1.5,
  },
  // AI Overview styles
  aiOverviewSection: {
    marginBottom: 20,
  },
  aiOverviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 15,
    backgroundColor: '#eef2ff',
    padding: 10,
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#4f46e5',
  },
  aiOverviewParagraph: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.6,
    marginBottom: 12,
  },
  aiOverviewSubtitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4b5563',
    marginTop: 10,
    marginBottom: 6,
  },
  aiOverviewList: {
    marginLeft: 10,
    marginBottom: 10,
  },
  aiOverviewListItem: {
    fontSize: 10,
    color: '#4b5563',
    marginBottom: 4,
    paddingLeft: 8,
  },
  aiOverviewDisclaimer: {
    fontSize: 9,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
  },
  aiConcernItem: {
    fontSize: 10,
    color: '#b91c1c',
    marginBottom: 4,
    paddingLeft: 8,
  },
})

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatShortDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getMoodTrendLabel(trend: MoodTrend): string {
  switch (trend) {
    case 'improving':
      return 'Improving'
    case 'declining':
      return 'Declining'
    case 'stable':
      return 'Stable'
    default:
      return 'Unknown'
  }
}

function getRiskLevelLabel(level: RiskLevel | 'unknown'): string {
  switch (level) {
    case 'alert':
      return 'ALERT - Immediate Attention Required'
    case 'drift':
      return 'DRIFT - Monitor Closely'
    case 'stable':
      return 'STABLE - No Concerns'
    default:
      return 'UNKNOWN - Insufficient Data'
  }
}

interface HeaderProps {
  title: string
  generatedAt: Date
  doctorName: string
}

function Header({ title, generatedAt, doctorName }: HeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>
        Generated on {formatDate(generatedAt)} by {doctorName}
      </Text>
    </View>
  )
}

interface PatientInfoSectionProps {
  patient: {
    id: string
    name: string
    email: string
    createdAt: Date
  }
}

function PatientInfoSection({ patient }: PatientInfoSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Patient Information</Text>
      <View style={styles.patientInfo}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Name</Text>
          <Text style={styles.infoValue}>{patient.name}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{patient.email}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Patient ID</Text>
          <Text style={styles.infoValue}>{patient.id}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Patient Since</Text>
          <Text style={styles.infoValue}>{formatDate(patient.createdAt)}</Text>
        </View>
      </View>
    </View>
  )
}

interface RiskAssessmentSectionProps {
  riskLevel: RiskLevel | 'unknown'
  currentMoodScore: number | null
}

function RiskAssessmentSection({ riskLevel, currentMoodScore }: RiskAssessmentSectionProps) {
  const badgeStyle = [
    styles.riskBadge,
    riskLevel === 'alert'
      ? styles.riskAlert
      : riskLevel === 'drift'
        ? styles.riskDrift
        : riskLevel === 'stable'
          ? styles.riskStable
          : styles.riskUnknown,
  ]

  const textStyle = [
    styles.riskText,
    riskLevel === 'alert'
      ? styles.riskTextAlert
      : riskLevel === 'drift'
        ? styles.riskTextDrift
        : riskLevel === 'stable'
          ? styles.riskTextStable
          : styles.riskTextUnknown,
  ]

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Risk Assessment</Text>
      <View style={badgeStyle}>
        <Text style={textStyle}>{getRiskLevelLabel(riskLevel)}</Text>
      </View>
      {currentMoodScore !== null && (
        <Text style={{ fontSize: 11, color: '#4b5563' }}>
          Current Mood Score: {currentMoodScore}/10
        </Text>
      )}
    </View>
  )
}

interface ClinicalSummarySectionProps {
  insights: {
    moodTrend: MoodTrend
    averageMood: number
    complianceRate: number
    moodRange: {
      min: number
      max: number
      average: number
      stddev: number
    }
  }
}

function ClinicalSummarySection({ insights }: ClinicalSummarySectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Clinical Summary</Text>
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Mood Trend</Text>
          <Text style={styles.summaryValue}>{getMoodTrendLabel(insights.moodTrend)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Average Mood</Text>
          <Text style={styles.summaryValue}>{insights.averageMood.toFixed(1)}/10</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Compliance Rate</Text>
          <Text style={styles.summaryValue}>{insights.complianceRate.toFixed(0)}%</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Mood Range</Text>
          <Text style={styles.summaryValue}>
            {insights.moodRange.min} - {insights.moodRange.max}
          </Text>
        </View>
      </View>
      <View style={{ marginTop: 10 }}>
        <Text style={{ fontSize: 10, color: '#6b7280' }}>
          Standard Deviation: {insights.moodRange.stddev.toFixed(2)} | Mood variability
          indicator
        </Text>
      </View>
    </View>
  )
}

interface MoodHistoryCardsProps {
  moodHistory: MoodHistoryItem[]
}

export function MoodHistoryCards({ moodHistory }: MoodHistoryCardsProps) {
  const displayHistory = moodHistory.slice(0, 20)

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        Mood History (Last {Math.min(moodHistory.length, 20)} Entries)
      </Text>
      {moodHistory.length === 0 ? (
        <Text style={styles.emptyMessage}>
          No mood history available. Patient has not completed any check-ins yet.
        </Text>
      ) : (
        <View>
          {displayHistory.map((item, index) => (
            <View
              key={index}
              style={item.riskFlag ? [styles.moodCard, styles.moodCardAlert] : styles.moodCard}
            >
              <View style={styles.moodCardHeader}>
                <Text style={styles.moodCardDate}>{formatShortDate(item.date)}</Text>
                <View style={styles.moodCardMeta}>
                  <Text style={styles.moodCardScore}>Mood: {item.moodScore}/10</Text>
                  {item.riskFlag && (
                    <Text style={styles.moodCardRiskFlag}>RISK FLAG</Text>
                  )}
                </View>
              </View>
              <Text style={styles.moodCardSummary}>{item.clinicalSummary}</Text>
            </View>
          ))}
        </View>
      )}
      {moodHistory.length > 20 && (
        <Text style={{ fontSize: 9, color: '#6b7280', marginTop: 8 }}>
          Showing 20 of {moodHistory.length} entries. Full history available in
          application.
        </Text>
      )}
    </View>
  )
}

interface AIOverviewSectionProps {
  aiOverview: AIOverview
}

export function AIOverviewSection({ aiOverview }: AIOverviewSectionProps) {
  return (
    <View style={styles.aiOverviewSection}>
      <Text style={styles.aiOverviewTitle}>AI-Generated Clinical Overview</Text>

      <Text style={styles.aiOverviewSubtitle}>Longitudinal Analysis</Text>
      <Text style={styles.aiOverviewParagraph}>{aiOverview.longitudinalAnalysis}</Text>

      {aiOverview.keyPatterns.length > 0 && (
        <>
          <Text style={styles.aiOverviewSubtitle}>Key Patterns</Text>
          <View style={styles.aiOverviewList}>
            {aiOverview.keyPatterns.map((pattern, index) => (
              <Text key={index} style={styles.aiOverviewListItem}>
                - {pattern}
              </Text>
            ))}
          </View>
        </>
      )}

      {aiOverview.clinicalConcerns.length > 0 && (
        <>
          <Text style={styles.aiOverviewSubtitle}>Clinical Concerns</Text>
          <View style={styles.aiOverviewList}>
            {aiOverview.clinicalConcerns.map((concern, index) => (
              <Text key={index} style={styles.aiConcernItem}>
                - {concern}
              </Text>
            ))}
          </View>
        </>
      )}

      {aiOverview.recommendations.length > 0 && (
        <>
          <Text style={styles.aiOverviewSubtitle}>Recommendations</Text>
          <View style={styles.aiOverviewList}>
            {aiOverview.recommendations.map((rec, index) => (
              <Text key={index} style={styles.aiOverviewListItem}>
                - {rec}
              </Text>
            ))}
          </View>
        </>
      )}

      <Text style={styles.aiOverviewSubtitle}>Overall Assessment</Text>
      <Text style={styles.aiOverviewParagraph}>{aiOverview.overallAssessment}</Text>

      <Text style={styles.aiOverviewDisclaimer}>
        This analysis was generated by AI and should be reviewed by a licensed clinician.
      </Text>
    </View>
  )
}

function Footer() {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>
        Affect - Mental Health Monitoring Platform | Generated automatically by AI
        analysis
      </Text>
      <Text style={styles.confidentialNotice}>
        CONFIDENTIAL: This document contains protected health information (PHI). Handle
        according to HIPAA guidelines.
      </Text>
    </View>
  )
}

interface PatientReportDocumentProps {
  data: PatientReportData
}

export function PatientReportDocument({ data }: PatientReportDocumentProps) {
  const currentMoodScore =
    data.moodHistory.length > 0 ? data.moodHistory[0].moodScore : null

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Header
          title="Patient Mental Health Report"
          generatedAt={data.generatedAt}
          doctorName={data.doctorName}
        />
        <PatientInfoSection patient={data.patient} />
        <RiskAssessmentSection
          riskLevel={data.riskLevel}
          currentMoodScore={currentMoodScore}
        />
        <ClinicalSummarySection insights={data.insights} />
        <MoodHistoryCards moodHistory={data.moodHistory} />
        <Footer />
      </Page>
      {data.aiOverview && (
        <Page size="A4" style={styles.page}>
          <Header
            title="Patient Mental Health Report"
            generatedAt={data.generatedAt}
            doctorName={data.doctorName}
          />
          <AIOverviewSection aiOverview={data.aiOverview} />
          <Footer />
        </Page>
      )}
    </Document>
  )
}
