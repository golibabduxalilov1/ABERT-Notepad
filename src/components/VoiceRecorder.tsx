import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Check, Radio } from 'lucide-react';

interface VoiceRecorderProps {
  onRecordComplete: (audioUrl: string, durationSec: number, transcript: string) => void;
  onCancel?: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onRecordComplete, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recordingMode, setRecordingMode] = useState<'hold' | 'toggle'>('toggle');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Setup Web Speech API if supported in browser
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ru-RU';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript) {
          setTranscript(currentTranscript);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Stop media tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setTranscript('');

      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // ignore double start
        }
      }

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Не удалось получить доступ к микрофону. Проверьте разрешения.');
      console.error('Microphone error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    }
  };

  const togglePlayback = () => {
    if (!audioUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSave = () => {
    if (audioUrl) {
      onRecordComplete(audioUrl, recordingTime || 1, transcript);
    }
  };

  const handleReset = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setRecordingTime(0);
    setTranscript('');
    setIsPlaying(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 shadow-lg text-slate-100 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className={`w-4 h-4 ${isRecording ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`} />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            {isRecording ? 'Идет запись...' : audioUrl ? 'Голосовое готово' : 'Голосовая заметка'}
          </span>
        </div>
        <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setRecordingMode('toggle')}
            className={`px-2 py-1 rounded-md text-[11px] transition ${
              recordingMode === 'toggle' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Нажатие
          </button>
          <button
            type="button"
            onClick={() => setRecordingMode('hold')}
            className={`px-2 py-1 rounded-md text-[11px] transition ${
              recordingMode === 'hold' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Зажал-Отпустил
          </button>
        </div>
      </div>

      {!audioUrl ? (
        <div className="flex flex-col items-center justify-center py-4 bg-slate-950/60 rounded-lg border border-slate-800">
          {recordingMode === 'hold' ? (
            <button
              type="button"
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition shadow-lg ${
                isRecording
                  ? 'bg-red-600 ring-4 ring-red-500/30 scale-110 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-105'
              }`}
            >
              <Mic className="w-7 h-7" />
            </button>
          ) : (
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition shadow-lg ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-500 ring-4 ring-red-500/30 animate-pulse text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-105'
              }`}
            >
              {isRecording ? <Square className="w-6 h-6 fill-white" /> : <Mic className="w-7 h-7" />}
            </button>
          )}

          <p className="text-xs text-slate-400 mt-3 font-medium">
            {recordingMode === 'hold'
              ? 'Зажмите и удерживайте для записи...'
              : isRecording
              ? 'Нажмите еще раз, чтобы остановить'
              : 'Нажмите кнопку для начала записи'}
          </p>

          {isRecording && (
            <div className="flex items-center gap-2 mt-2 text-red-400 font-mono text-sm font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              {formatTime(recordingTime)}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlayback}
                className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow transition"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <div>
                <p className="text-xs font-semibold text-slate-200">Длительность: {formatTime(recordingTime)}</p>
                <p className="text-[11px] text-slate-400">Нажмите для прослушивания</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                title="Перезаписать"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow transition"
              >
                <Check className="w-4 h-4" /> Прикрепить
              </button>
            </div>
          </div>

          {transcript && (
            <div className="text-xs bg-slate-900 p-2.5 rounded border border-slate-800 text-slate-300 italic">
              <span className="font-semibold text-emerald-400 not-italic">Надиктованный текст: </span>
              "{transcript}"
            </div>
          )}
        </div>
      )}

      {onCancel && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Отмена
          </button>
        </div>
      )}
    </div>
  );
};
