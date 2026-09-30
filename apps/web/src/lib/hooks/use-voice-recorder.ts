//apps/web/src/lib/hooks/use-voice-recorder.ts
'use client';

import { useRef, useState } from 'react';

export function useVoiceRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);

  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('এই ব্রাউজারে voice recording supported নয়');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    streamRef.current = stream;

    const mimeType =
      MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

    const recorder = new MediaRecorder(stream, {
      mimeType,
    });

    chunksRef.current = [];
    startedAtRef.current = Date.now();

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.start(250);

    mediaRecorderRef.current = recorder;

    setDuration(0);
    setRecording(true);
  };

  const stop = (): Promise<{
    blob: Blob;
    duration: number;
  }> => {
    return new Promise((resolve, reject) => {
      const recorder = mediaRecorderRef.current;

      if (!recorder) {
        reject(new Error('Recording চলছে না'));
        return;
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });

        const seconds = Math.max(
          1,
          Math.round((Date.now() - startedAtRef.current) / 1000),
        );

        streamRef.current?.getTracks().forEach((track) => {
          track.stop();
        });

        mediaRecorderRef.current = null;
        streamRef.current = null;

        setRecording(false);
        setDuration(seconds);

        resolve({
          blob,
          duration: seconds,
        });
      };

      recorder.stop();
    });
  };

  const cancel = () => {
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }

    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    mediaRecorderRef.current = null;
    streamRef.current = null;
    chunksRef.current = [];

    setRecording(false);
    setDuration(0);
  };

  return {
    recording,
    duration,
    start,
    stop,
    cancel,
  };
}
