'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type RecordingState = 'idle' | 'recording' | 'recorded' | 'uploading' | 'processing' | 'complete' | 'error'

interface AnalysisResult {
  moodScore: number
  clinicalSummary: string
  riskFlag: boolean
}

export function VideoCheckIn() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const MAX_RECORDING_TIME = 60

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: true,
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch {
      setError('Unable to access camera. Please ensure you have granted camera permissions.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const startRecording = useCallback(async () => {
    setError(null)
    setRecordedBlob(null)
    chunksRef.current = []
    setRecordingTime(0)

    await startCamera()

    if (!streamRef.current) {
      return
    }

    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp9,opus',
    })

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data)
      }
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      setRecordedBlob(blob)
      setRecordingState('recorded')
      stopCamera()

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    mediaRecorderRef.current = mediaRecorder
    mediaRecorder.start(1000)
    setRecordingState('recording')

    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => {
        if (prev >= MAX_RECORDING_TIME - 1) {
          stopRecording()
          return prev
        }
        return prev + 1
      })
    }, 1000)
  }, [startCamera, stopCamera])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const retakeVideo = useCallback(() => {
    setRecordedBlob(null)
    setRecordingState('idle')
    setError(null)
    setAnalysisResult(null)
  }, [])

  const submitVideo = useCallback(async () => {
    if (!recordedBlob) {
      return
    }

    setRecordingState('uploading')
    setError(null)

    try {
      const formData = new FormData()
      formData.append('video', recordedBlob, 'check-in.webm')

      setRecordingState('processing')

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to analyze video')
      }

      setAnalysisResult({
        moodScore: result.data.moodScore,
        clinicalSummary: result.data.clinicalSummary,
        riskFlag: result.data.riskFlag,
      })
      setRecordingState('complete')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setRecordingState('error')
    }
  }, [recordedBlob])

  const goToDashboard = useCallback(() => {
    router.push('/patient')
    router.refresh()
  }, [router])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Daily Check-In</CardTitle>
        <CardDescription>
          Record a short video about how you're feeling today
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {recordingState === 'idle' && (
          <div className="text-center space-y-4">
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-500">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <p>Press the button below to start recording</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Share how you're feeling today. Your video will be analyzed privately
              and deleted immediately after processing.
            </p>
            <Button onClick={startRecording} size="lg" className="w-full">
              Start Recording
            </Button>
          </div>
        )}

        {recordingState === 'recording' && (
          <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                Recording {formatTime(recordingTime)} / {formatTime(MAX_RECORDING_TIME)}
              </div>
            </div>
            <Button
              onClick={stopRecording}
              variant="destructive"
              size="lg"
              className="w-full"
            >
              Stop Recording
            </Button>
          </div>
        )}

        {recordingState === 'recorded' && recordedBlob && (
          <div className="space-y-4">
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <video
                src={URL.createObjectURL(recordedBlob)}
                controls
                className="w-full h-full"
              />
            </div>
            <p className="text-sm text-center text-gray-500">
              Review your recording. When ready, submit for analysis.
            </p>
            <div className="flex gap-4">
              <Button onClick={retakeVideo} variant="outline" className="flex-1">
                Retake
              </Button>
              <Button onClick={submitVideo} className="flex-1">
                Submit
              </Button>
            </div>
          </div>
        )}

        {(recordingState === 'uploading' || recordingState === 'processing') && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-lg font-medium">
              {recordingState === 'uploading' ? 'Uploading...' : 'Analyzing your check-in...'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This may take a moment. Please don't close this page.
            </p>
          </div>
        )}

        {recordingState === 'complete' && analysisResult && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold">Check-in Complete!</h3>
              <p className="text-gray-600">Thank you for sharing how you're feeling today.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-gray-500">Mood Score</p>
                  <p className="text-3xl font-bold">{analysisResult.moodScore}/10</p>
                </CardContent>
              </Card>
              <Card className={analysisResult.riskFlag ? 'border-red-200 bg-red-50' : ''}>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-gray-500">Risk Status</p>
                  <p className={`text-lg font-semibold ${analysisResult.riskFlag ? 'text-red-600' : 'text-green-600'}`}>
                    {analysisResult.riskFlag ? 'Flagged' : 'Normal'}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{analysisResult.clinicalSummary}</p>
              </CardContent>
            </Card>

            <Button onClick={goToDashboard} className="w-full">
              Return to Dashboard
            </Button>
          </div>
        )}

        {recordingState === 'error' && (
          <div className="space-y-4 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-red-600">Something went wrong</h3>
            <p className="text-gray-600">Please try again.</p>
            <Button onClick={retakeVideo} className="w-full">
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
