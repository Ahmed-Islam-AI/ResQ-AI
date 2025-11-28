'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Activity, Heart, Droplet, Wind, AlertTriangle, CheckCircle, HeartPulse } from 'lucide-react';

type SpeechRecognitionInstance = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================
interface PatientVitals {
  bloodPressure: string | null;
  heartRate: number | null;
  spo2: number | null;
  respiratoryRate: number | null;
  temperature: number | null;
}

interface TranscriptEntry {
  timestamp: string;
  text: string;
  speaker: 'paramedic' | 'system';
}

interface MedicalAlert {
  severity: 'safe' | 'warning' | 'critical';
  message: string;
  timestamp: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function EmergencyDashboard() {
  // Session State
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingHandoff, setIsGeneratingHandoff] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  
  // UI State
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([]);
  const [vitals, setVitals] = useState<PatientVitals>({
    bloodPressure: null,
    heartRate: null,
    spo2: null,
    respiratoryRate: null,
    temperature: null,
  });
  const [currentAlert, setCurrentAlert] = useState<MedicalAlert | null>(null);
  const [handoffSummary, setHandoffSummary] = useState<string | null>(null);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [manualVitalsFeedback, setManualVitalsFeedback] = useState<string | null>(null);
  const [vitalsHistory, setVitalsHistory] = useState<Array<PatientVitals & { timestamp: string }>>([]);
  const [manualVitals, setManualVitals] = useState({
    bloodPressure: '',
    heartRate: '',
    spo2: '',
    respiratoryRate: '',
    temperature: '',
  });
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isRecordingRef = useRef(false);
  const transcriptHandlerRef = useRef<(text: string) => void>(() => {});
  const sessionLabel = sessionId ?? 'initializing...';
  const heartRateValue = vitals.heartRate ?? null;
  const heartbeatDuration = heartRateValue
    ? `${Math.max(0.35, Math.min(2, 60 / Math.max(heartRateValue, 30)))}s`
    : undefined;

  const hasMeaningfulVitals = (readings: PatientVitals) => {
    return Boolean(
      readings.bloodPressure ||
        readings.heartRate ||
        readings.spo2 ||
        readings.respiratoryRate ||
        readings.temperature
    );
  };

  const recordVitalsHistory = (snapshot: PatientVitals) => {
    if (!hasMeaningfulVitals(snapshot)) return;
    const entry = {
      ...snapshot,
      timestamp: new Date().toLocaleTimeString(),
    };
    setVitalsHistory(prev => {
      const next = [...prev, entry];
      return next.slice(-5);
    });
  };

  const handleManualVitalsChange = (field: keyof typeof manualVitals, value: string) => {
    setManualVitals(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const applyManualVitals = () => {
    const updated: PatientVitals = {
      bloodPressure: manualVitals.bloodPressure || vitals.bloodPressure,
      heartRate: manualVitals.heartRate ? parseInt(manualVitals.heartRate, 10) : vitals.heartRate,
      spo2: manualVitals.spo2 ? parseInt(manualVitals.spo2, 10) : vitals.spo2,
      respiratoryRate: manualVitals.respiratoryRate
        ? parseInt(manualVitals.respiratoryRate, 10)
        : vitals.respiratoryRate,
      temperature: manualVitals.temperature ? parseFloat(manualVitals.temperature) : vitals.temperature,
    };

    setVitals(updated);
    recordVitalsHistory(updated);
    updateBackendVitals(updated);
    setManualVitals({
      bloodPressure: '',
      heartRate: '',
      spo2: '',
      respiratoryRate: '',
      temperature: '',
    });
    setManualVitalsFeedback('Manual vitals applied.');
    setTimeout(() => setManualVitalsFeedback(null), 3000);
  };
  
  // Backend URL - Update this to your backend URL
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  useEffect(() => {
    // Generate a stable client-only session id
    const uniqueId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setSessionId(uniqueId);
    
    // Create audio element for alerts
    alertAudioRef.current = new Audio();
    
    // Cleanup on unmount
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    initializeSession(sessionId);
  }, [sessionId]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptEntries]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognitionClass) {
      setIsSpeechSupported(false);
      return;
    }
    
    const recognition: SpeechRecognitionInstance = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          transcriptHandlerRef.current(transcript);
        } else {
          interim += transcript;
        }
      }
      setLiveTranscript(interim);
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setSpeechError(event.error || 'Speech recognition error.');
      if (isRecordingRef.current) {
        setIsRecording(false);
      }
    };
    
    recognition.onend = () => {
      if (isRecordingRef.current) {
        recognition.start();
      }
    };
    
    speechRecognitionRef.current = recognition;
    setIsSpeechSupported(true);
    
    return () => {
      recognition.stop();
      speechRecognitionRef.current = null;
    };
  }, []);

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================
  const initializeSession = async (id: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/session/create?session_id=${id}`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to create session');
      
      addTranscriptEntry('system', 'Session initialized. Ready to begin patient assessment.');
    } catch (error) {
      console.error('Session initialization error:', error);
      addTranscriptEntry('system', 'Error: Could not connect to backend server.');
    }
  };

  // ============================================================================
  // AUDIO RECORDING
  // ============================================================================
  const startRecording = async () => {
    if (!sessionId) {
      addTranscriptEntry('system', 'Session initializing. Please wait a moment.');
      return;
    }
    
    if (speechRecognitionRef.current && isSpeechSupported) {
      try {
        speechRecognitionRef.current.start();
        setIsRecording(true);
        setSpeechError(null);
        addTranscriptEntry('system', 'Listening... speak clearly and naturally.');
        return;
      } catch (error) {
        console.error('Speech recognition start error:', error);
        setSpeechError('Unable to start speech recognition. Falling back to manual mode.');
      }
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      addTranscriptEntry('system', 'Recording started...');
      
    } catch (error) {
      console.error('Microphone access error:', error);
      alert('Could not access microphone. Please grant permission.');
    }
  };

  const stopRecording = () => {
    if (speechRecognitionRef.current && isRecording && isSpeechSupported) {
      speechRecognitionRef.current.stop();
      setIsRecording(false);
      if (!liveTranscript) {
        addTranscriptEntry('system', 'Processing spoken assessment...');
      }
      setLiveTranscript('');
      return;
    }
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // ============================================================================
  // AUDIO PROCESSING & TRANSCRIPTION
  // ============================================================================
  const processAudio = async (audioBlob: Blob) => {
    try {
      const mockTranscript = await simulateTranscription(audioBlob);
      await handleTranscriptText(mockTranscript);
    } catch (error) {
      console.error('Audio processing error:', error);
      addTranscriptEntry('system', 'Error processing audio recording.');
    }
  };

  // Mock transcription for demo purposes
  const simulateTranscription = async (audioBlob: Blob): Promise<string> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock transcripts for demonstration
    const mockTranscripts = [
      "Patient is a 65-year-old male complaining of chest pain. Blood pressure is 150 over 95. Heart rate is 102. SpO2 is 94 percent.",
      "Administering aspirin 325 milligrams. Patient reports allergy to penicillin.",
      "Patient vitals: BP 120/80, pulse 88, oxygen saturation 97%. No respiratory distress noted.",
      "Starting IV access. Patient is conscious and alert. Giving morphine 4 milligrams for pain management.",
      "Patient reports taking warfarin daily. Currently experiencing severe headache after fall.",
    ];
    
    return mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];
  };

  // ============================================================================
  // BACKEND INTEGRATION
  // ============================================================================
  const analyzeMedicalRisk = async (transcript: string) => {
    if (!sessionId) {
      addTranscriptEntry('system', 'Session initializing. Unable to analyze yet.');
      return;
    }
    try {
      const response = await fetch(`${BACKEND_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript,
          session_id: sessionId,
        }),
      });

      if (!response.ok) throw new Error('Analysis failed');

      const data = await response.json();
      
      // Extract vitals from transcript (simple regex parsing)
      extractAndUpdateVitals(transcript);
      
      // Handle medical alerts
      if (data.analysis.status === 'WARNING') {
        const alert: MedicalAlert = {
          severity: 'warning',
          message: data.analysis.reason,
          timestamp: new Date().toISOString(),
        };
        
        setCurrentAlert(alert);
        addTranscriptEntry('system', `⚠️ ALERT: ${data.analysis.reason}`);
        
        // Play audio alert if available
        if (data.audio_alert) {
          playAudioAlert(data.audio_alert);
        }
        
        // Clear alert after 10 seconds
        setTimeout(() => {
          setCurrentAlert(null);
        }, 10000);
        
      } else {
        setCurrentAlert({
          severity: 'safe',
          message: 'No contraindications detected',
          timestamp: new Date().toISOString(),
        });
        
        setTimeout(() => {
          setCurrentAlert(null);
        }, 3000);
      }
      
    } catch (error) {
      console.error('Risk analysis error:', error);
      addTranscriptEntry('system', 'Error: Could not analyze medical risk.');
    }
  };

  // ============================================================================
  // VITALS EXTRACTION
  // ============================================================================
  const extractAndUpdateVitals = (transcript: string) => {
    const updatedTranscript = transcript.toLowerCase();
    let nextVitals: PatientVitals | null = null;
    let changed = false;
    
    setVitals(prev => {
      const newVitals: PatientVitals = { ...prev };
      
      const bpMatch = updatedTranscript.match(/(\d{2,3})\s*(?:over|\/)\s*(\d{2,3})/i);
      if (bpMatch) {
        newVitals.bloodPressure = `${bpMatch[1]}/${bpMatch[2]}`;
        changed = true;
      }
      
      const hrMatch = updatedTranscript.match(/(?:heart rate|pulse|hr)[\s:]*(\d{2,3})/i);
      if (hrMatch) {
        newVitals.heartRate = parseInt(hrMatch[1], 10);
        changed = true;
      }
      
      const spo2Match = updatedTranscript.match(/(?:spo2|oxygen saturation|sat|saturation)[^\d]{0,10}(\d{2,3})/i);
      if (spo2Match) {
        newVitals.spo2 = parseInt(spo2Match[1], 10);
        changed = true;
      }
      
      const rrMatch = updatedTranscript.match(/(?:respiratory rate|resp rate|rr)[^\d]{0,10}(\d{1,2})/i);
      if (rrMatch) {
        newVitals.respiratoryRate = parseInt(rrMatch[1], 10);
        changed = true;
      }
      
      const tempMatch = updatedTranscript.match(/(?:temp|temperature)[^\d]{0,10}(\d{2,3}(?:\.\d)?)/i);
      if (tempMatch) {
        newVitals.temperature = parseFloat(tempMatch[1]);
        changed = true;
      }
      
      nextVitals = newVitals;
      return newVitals;
    });
    
    if (changed && nextVitals) {
      recordVitalsHistory(nextVitals);
      updateBackendVitals(nextVitals);
    }
  };

  const updateBackendVitals = async (updatedVitals: PatientVitals) => {
    if (!sessionId) return;
    try {
      await fetch(`${BACKEND_URL}/session/${sessionId}/update-vitals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blood_pressure: updatedVitals.bloodPressure,
          pulse: updatedVitals.heartRate,
          spo2: updatedVitals.spo2,
          respiratory_rate: updatedVitals.respiratoryRate,
          temperature: updatedVitals.temperature,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Vitals update error:', error);
    }
  };

  // ============================================================================
  // AUDIO ALERT PLAYBACK
  // ============================================================================
  const playAudioAlert = (base64Audio: string) => {
    try {
      if (!alertAudioRef.current) return;
      
      // Convert base64 to blob
      const byteCharacters = atob(base64Audio);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/mpeg' });
      
      // Create object URL and play
      const audioUrl = URL.createObjectURL(blob);
      alertAudioRef.current.src = audioUrl;
      alertAudioRef.current.play();
      
      // Cleanup
      alertAudioRef.current.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
      
    } catch (error) {
      console.error('Audio playback error:', error);
    }
  };

  // ============================================================================
  // TRANSCRIPT MANAGEMENT
  // ============================================================================
  const addTranscriptEntry = (speaker: 'paramedic' | 'system', text: string) => {
    const entry: TranscriptEntry = {
      timestamp: new Date().toLocaleTimeString(),
      text,
      speaker,
    };
    
    setTranscriptEntries(prev => [...prev, entry]);
  };

  const handleTranscriptText = async (text: string) => {
    const cleaned = text.trim();
    if (!cleaned) return;
    
    setIsProcessing(true);
    addTranscriptEntry('paramedic', cleaned);
    
    try {
      await analyzeMedicalRisk(cleaned);
    } catch (error) {
      console.error('Transcript handling error:', error);
      addTranscriptEntry('system', 'Error interpreting transcript segment.');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    transcriptHandlerRef.current = handleTranscriptText;
  }, [handleTranscriptText]);

  const generateHandoff = async () => {
    if (!sessionId) {
      setHandoffError('Session initializing. Please wait.');
      return;
    }

    if (transcriptEntries.length === 0) {
      setHandoffError('Record at least one assessment before generating a handoff.');
      return;
    }

    try {
      setIsGeneratingHandoff(true);
      setHandoffError(null);

      const response = await fetch(`${BACKEND_URL}/handoff/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          transcript_entries: transcriptEntries,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate handoff.');
      }

      const data = await response.json();
      setHandoffSummary(data.summary);
      addTranscriptEntry('system', 'SBAR handoff generated.');
    } catch (error) {
      console.error('Handoff generation error:', error);
      setHandoffError('Unable to generate handoff right now. Please try again.');
    } finally {
      setIsGeneratingHandoff(false);
    }
  };

  const copyHandoffToClipboard = async () => {
    if (!handoffSummary) return;
    try {
      await navigator.clipboard.writeText(handoffSummary);
      setHandoffError('Copied to clipboard.');
      setTimeout(() => setHandoffError(null), 2000);
    } catch (error) {
      console.error('Clipboard error:', error);
      setHandoffError('Unable to copy handoff.');
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100">
      {/* Alert Banner */}
      {currentAlert && (
        <div
          className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-center gap-3 animate-pulse ${
            currentAlert.severity === 'warning'
              ? 'bg-red-600'
              : currentAlert.severity === 'critical'
              ? 'bg-red-700'
              : 'bg-green-600'
          }`}
        >
          {currentAlert.severity === 'safe' ? (
            <CheckCircle className="w-6 h-6" />
          ) : (
            <AlertTriangle className="w-6 h-6" />
          )}
          <span className="text-lg font-bold uppercase tracking-wide">
            {currentAlert.message}
          </span>
        </div>
      )}

      {/* Main Container */}
      <div className={`container mx-auto px-4 py-8 ${currentAlert ? 'mt-16' : ''}`}>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-red-500 mb-2 flex items-center justify-center gap-3">
            <Activity className="w-10 h-10" />
            ResQ-AI Emergency Triage
          </h1>
          <p className="text-gray-400">Real-time Voice-First EMS Assistant</p>
          <p className="text-sm text-gray-500 mt-2">Session ID: {sessionLabel}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Vitals Dashboard */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xl font-semibold text-gray-300 mb-4">Patient Vitals</h2>
            
            {/* Blood Pressure */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-red-500 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-400" />
                  <span className="text-sm text-gray-400">Blood Pressure</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-white">
                {vitals.bloodPressure || '--/--'}
                <span className="text-sm text-gray-400 ml-2">mmHg</span>
              </div>
            </div>

            {/* Heart Rate */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-red-500 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <HeartPulse
                    className={`w-5 h-5 text-pink-400 ${heartRateValue ? 'animate-heartbeat' : ''}`}
                    style={heartRateValue ? { animationDuration: heartbeatDuration } : undefined}
                  />
                  <span className="text-sm text-gray-400">Heart Rate</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-white">
                {vitals.heartRate || '--'}
                <span className="text-sm text-gray-400 ml-2">BPM</span>
              </div>
            </div>

            {/* SpO2 */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Droplet className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-gray-400">Oxygen Saturation</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-white">
                {vitals.spo2 || '--'}
                <span className="text-sm text-gray-400 ml-2">%</span>
              </div>
            </div>

            {/* Respiratory Rate */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-cyan-500 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Wind className="w-5 h-5 text-cyan-400" />
                  <span className="text-sm text-gray-400">Respiratory Rate</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-white">
                {vitals.respiratoryRate || '--'}
                <span className="text-sm text-gray-400 ml-2">/min</span>
              </div>
            </div>

            {/* Temperature */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-amber-500 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Droplet className="w-5 h-5 text-amber-300" />
                  <span className="text-sm text-gray-400">Temperature</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-white">
                {vitals.temperature ?? '--'}
                <span className="text-sm text-gray-400 ml-2">°F</span>
              </div>
            </div>

            {/* Manual Override */}
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-200">Manual Vitals Override</h3>
                <span className="text-xs uppercase tracking-wide text-gray-500">Field Fix</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="bg-gray-800 text-sm text-gray-200 rounded-md px-3 py-2 border border-gray-700 focus:border-red-500 outline-none"
                  placeholder="BP 120/80"
                  value={manualVitals.bloodPressure}
                  onChange={e => handleManualVitalsChange('bloodPressure', e.target.value)}
                />
                <input
                  className="bg-gray-800 text-sm text-gray-200 rounded-md px-3 py-2 border border-gray-700 focus:border-red-500 outline-none"
                  placeholder="HR 90"
                  value={manualVitals.heartRate}
                  onChange={e => handleManualVitalsChange('heartRate', e.target.value)}
                />
                <input
                  className="bg-gray-800 text-sm text-gray-200 rounded-md px-3 py-2 border border-gray-700 focus:border-red-500 outline-none"
                  placeholder="SpO2 97"
                  value={manualVitals.spo2}
                  onChange={e => handleManualVitalsChange('spo2', e.target.value)}
                />
                <input
                  className="bg-gray-800 text-sm text-gray-200 rounded-md px-3 py-2 border border-gray-700 focus:border-red-500 outline-none"
                  placeholder="RR 16"
                  value={manualVitals.respiratoryRate}
                  onChange={e => handleManualVitalsChange('respiratoryRate', e.target.value)}
                />
                <input
                  className="bg-gray-800 text-sm text-gray-200 rounded-md px-3 py-2 border border-gray-700 focus:border-red-500 outline-none col-span-2"
                  placeholder="Temp 98.6"
                  value={manualVitals.temperature}
                  onChange={e => handleManualVitalsChange('temperature', e.target.value)}
                />
              </div>
              <button
                onClick={applyManualVitals}
                className="mt-4 w-full bg-red-600 hover:bg-red-500 text-white text-sm font-semibold py-2 rounded-md transition-colors"
              >
                Apply Manual Vitals
              </button>
              {manualVitalsFeedback && (
                <p className="text-xs text-green-400 mt-2">{manualVitalsFeedback}</p>
              )}
            </div>

            {/* Recent Vitals */}
            {vitalsHistory.length > 0 && (
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-3">Recent Updates</h3>
                <div className="space-y-2 text-sm text-gray-300 max-h-40 overflow-y-auto pr-1">
                  {vitalsHistory.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between border-b border-gray-800 pb-2 last:border-b-0 last:pb-0">
                      <div>
                        <p className="font-semibold">{entry.bloodPressure || '--/--'}</p>
                        <p className="text-xs text-gray-500">
                          HR {entry.heartRate || '--'} • SpO2 {entry.spo2 || '--'} • RR {entry.respiratoryRate || '--'}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">{entry.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Center Column - Recording Interface */}
          <div className="lg:col-span-1 flex flex-col items-center justify-start">
            {/* Microphone Button */}
            <div className="mb-8">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                    : isProcessing
                    ? 'bg-yellow-600 cursor-not-allowed'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {isProcessing ? (
                  <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
                ) : isRecording ? (
                  <MicOff className="w-16 h-16 text-white" />
                ) : (
                  <Mic className="w-16 h-16 text-white" />
                )}
                
                {isRecording && (
                  <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping" />
                )}
              </button>
              
              <p className="text-center mt-4 text-gray-400 font-medium">
                {isProcessing
                  ? 'Processing...'
                  : isRecording
                  ? 'Tap to Stop Recording'
                  : 'Tap to Start Recording'}
              </p>
              {isRecording && (
                <div className="mt-4 bg-gray-900 border border-gray-800 rounded-lg p-4 min-w-[280px]">
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Live Capture</p>
                  <p className="text-sm text-gray-200 min-h-[40px]">
                    {liveTranscript || 'Listening...'}
                  </p>
                </div>
              )}
              {speechError && (
                <p className="text-sm text-red-400 mt-3">{speechError}</p>
              )}
            </div>

            {/* Instructions */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 max-w-md">
              <h3 className="text-lg font-semibold text-red-400 mb-3">Quick Guide</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span>Press microphone to record patient assessment</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span>Speak vitals clearly (BP, HR, SpO2)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span>Mention any medications administered</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span>AI will alert on drug interactions</span>
                </li>
              </ul>
              {!isSpeechSupported && (
                <p className="text-xs text-yellow-300 mt-3">
                  Browser speech recognition unavailable. Using fallback transcription simulator.
                </p>
              )}
            </div>
          </div>

          {/* Right Column - Live Transcript */}
          <div className="lg:col-span-1">
            <div className="mb-4 bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="text-xl font-semibold text-gray-300">Handoff Tools</h2>
                <button
                  onClick={generateHandoff}
                  disabled={isGeneratingHandoff || isProcessing || !sessionId}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                    isGeneratingHandoff || isProcessing
                      ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-500 text-white'
                  }`}
                >
                  {isGeneratingHandoff ? 'Generating…' : 'Generate Handoff'}
                </button>
              </div>
              {handoffError && (
                <p className="text-sm text-red-400 mt-2">{handoffError}</p>
              )}
              {handoffSummary && (
                <div className="mt-4 bg-gray-900 rounded-md border border-gray-700 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-200">SBAR Handoff</span>
                    <button
                      onClick={copyHandoffToClipboard}
                      className="text-xs text-red-300 hover:text-red-200 underline"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{handoffSummary}</p>
                </div>
              )}
            </div>
            <h2 className="text-xl font-semibold text-gray-300 mb-4">Live Transcript</h2>
            <div className="bg-gray-800 rounded-lg border border-gray-700 h-[600px] overflow-y-auto p-4 space-y-3">
              {transcriptEntries.length === 0 ? (
                <p className="text-gray-500 text-center mt-8">
                  No transcript yet. Start recording to begin.
                </p>
              ) : (
                transcriptEntries.map((entry, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg ${
                      entry.speaker === 'system'
                        ? 'bg-blue-900/30 border border-blue-700/50'
                        : 'bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-semibold ${
                          entry.speaker === 'system'
                            ? 'text-blue-400'
                            : 'text-green-400'
                        }`}
                      >
                        {entry.speaker === 'system' ? 'SYSTEM' : 'PARAMEDIC'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {entry.timestamp}
                      </span>
                    </div>
                    <p className="text-sm text-gray-200">{entry.text}</p>
                  </div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}