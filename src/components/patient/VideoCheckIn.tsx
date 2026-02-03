'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const MAX_RECORDING_TIME = 60

  // Ensure video element gets the stream when recording starts
  useEffect(() => {
    if (recordingState === 'recording' && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [recordingState])

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const startCamera = useCallback(async () => {
    try {
      // Use flexible constraints for better iOS compatibility
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
        },
        audio: true,
      })

      streamRef.current = stream
      // Also try to set immediately in case the video element exists
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

  const isIOS = useCallback((): boolean => {
    if (typeof navigator === 'undefined') return false
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  }, [])

  const getSupportedMimeType = useCallback((): string | undefined => {
    // iOS Safari has very limited MediaRecorder support
    // It's better to let Safari choose its own format
    if (isIOS()) {
      // On iOS, try mp4 first, but if not supported, return undefined to let browser decide
      try {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/mp4')) {
          return 'video/mp4'
        }
      } catch {
        // isTypeSupported might throw on some browsers
      }
      return undefined
    }

    // For other browsers, try in order of preference
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ]

    for (const mimeType of mimeTypes) {
      try {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          return mimeType
        }
      } catch {
        // isTypeSupported might throw on some browsers
        continue
      }
    }

    // Let browser choose default
    return undefined
  }, [isIOS])

  const startRecording = useCallback(async () => {
    setError(null)
    setRecordedBlob(null)
    chunksRef.current = []
    setRecordingTime(0)

    // Check if MediaRecorder is supported
    if (typeof MediaRecorder === 'undefined') {
      setError('Video recording is not supported on this browser. Please try using Chrome, Firefox, or Safari 14.3+.')
      return
    }

    await startCamera()

    if (!streamRef.current) {
      return
    }

    // Try to create MediaRecorder with preferred mimeType, fallback to no options
    let mediaRecorder: MediaRecorder
    const mimeType = getSupportedMimeType()

    try {
      if (mimeType) {
        mediaRecorder = new MediaRecorder(streamRef.current, { mimeType })
      } else {
        // Let browser choose default format
        mediaRecorder = new MediaRecorder(streamRef.current)
      }
    } catch (err) {
      // If creation with mimeType fails, try without any options
      try {
        mediaRecorder = new MediaRecorder(streamRef.current)
      } catch (fallbackErr) {
        setError('Unable to start video recording. Please try a different browser.')
        stopCamera()
        return
      }
    }

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data)
      }
    }

    mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event)
      setError('An error occurred during recording. Please try again.')
      setRecordingState('error')
      stopCamera()
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    mediaRecorder.onstop = () => {
      // Use the actual mimeType from the recorder
      // On iOS Safari, mimeType might be empty - fallback to mp4 for iOS, webm for others
      let actualMimeType = mediaRecorder.mimeType
      if (!actualMimeType) {
        actualMimeType = /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'video/mp4' : 'video/webm'
      }

      const blob = new Blob(chunksRef.current, { type: actualMimeType })

      // Try to create preview URL - this can fail on some iOS versions
      try {
        const url = URL.createObjectURL(blob)
        setPreviewUrl(url)
        setRecordedBlob(blob)
        setRecordingState('recorded')
      } catch (err) {
        console.error('Failed to create preview URL:', err)
        // Still save the blob even if preview fails - we can submit without preview
        setRecordedBlob(blob)
        setRecordingState('recorded')
        setError('Preview unavailable, but you can still submit the video.')
      }

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
  }, [startCamera, stopCamera, getSupportedMimeType])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const retakeVideo = useCallback(() => {
    // Clean up previous preview URL to avoid memory leaks
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setRecordedBlob(null)
    setRecordingState('idle')
    setError(null)
    setAnalysisResult(null)
  }, [previewUrl])

  const submitVideo = useCallback(async () => {
    if (!recordedBlob) {
      return
    }

    setRecordingState('uploading')
    setError(null)

    try {
      // Debug: log blob info
      console.log('Blob type:', recordedBlob.type)
      console.log('Blob size:', recordedBlob.size)

      // Determine file extension - handle empty or unusual MIME types
      let extension = 'webm'
      let mimeType = recordedBlob.type || 'video/webm'

      if (mimeType.includes('mp4') || mimeType.includes('quicktime')) {
        extension = 'mp4'
        mimeType = 'video/mp4'
      } else if (mimeType.includes('webm')) {
        extension = 'webm'
        mimeType = 'video/webm'
      } else if (!mimeType || mimeType === 'video/x-matroska' || mimeType === '') {
        // iOS Safari sometimes returns empty or unusual types
        // Default to mp4 for iOS, webm for others
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
        extension = isIOSDevice ? 'mp4' : 'webm'
        mimeType = isIOSDevice ? 'video/mp4' : 'video/webm'
      }

      // Create a new blob with explicit MIME type if needed
      const videoBlob = recordedBlob.type ? recordedBlob : new Blob([recordedBlob], { type: mimeType })

      // Step 1: Create FormData
      let formData: FormData
      try {
        formData = new FormData()
        formData.append('video', videoBlob, `checkin.${extension}`)
        console.log('FormData created successfully')
      } catch (formDataError) {
        console.error('FormData creation failed:', formDataError)
        throw new Error(`Failed to prepare video for upload: ${formDataError instanceof Error ? formDataError.message : 'Unknown error'}`)
      }

      setRecordingState('processing')

      // Step 2: Send request
      // Use absolute URL for better iOS Safari compatibility
      const apiUrl = new URL('/api/analyze', window.location.origin).toString()
      console.log('Sending to:', apiUrl)

      let response: Response
      try {
        response = await fetch(apiUrl, {
          method: 'POST',
          body: formData,
        })
        console.log('Fetch completed, status:', response.status)
      } catch (fetchError) {
        console.error('Fetch failed:', fetchError)
        throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`)
      }

      // Step 3: Parse response
      let result
      try {
        result = await response.json()
        console.log('Response parsed successfully')
      } catch (parseError) {
        console.error('Response parsing failed:', parseError)
        throw new Error(`Failed to parse server response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
      }

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
              {previewUrl ? (
                <video
                  src={previewUrl}
                  controls
                  playsInline
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <div className="text-center">
                    <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-gray-400">Preview unavailable</p>
                  </div>
                </div>
              )}
            </div>
            <p className="text-sm text-center text-gray-500">
              {previewUrl
                ? 'Review your recording. When ready, submit for analysis.'
                : 'Preview is not available on this device, but you can still submit.'}
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

        {recordingState === 'complete' && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
                <svg
                  className="w-10 h-10 text-green-600"
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
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Check-in Complete!</h3>
              <p className="text-gray-600 text-lg">Thank you for sharing how you're feeling today.</p>
              <p className="text-gray-500 text-sm mt-4">
                Your check-in has been recorded. Keep up the great work! 💪
              </p>
            </div>

            <Button onClick={goToDashboard} className="w-full" size="lg">
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
