// src/components/identity/selfie-capture.tsx
"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface SelfieCaptureProps {
  onCapture: (file: File) => void;
}

export function SelfieCapture({ onCapture }: SelfieCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // When streaming becomes true and the video element mounts, attach the stream
  useEffect(() => {
    if (streaming && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(() => {});
      };
    }
  }, [streaming]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      setStreaming(true); // This triggers re-render, useEffect attaches the stream
    } catch (err) {
      console.error("[selfie] Camera error:", err);
      // Fallback to file input if camera not available
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.capture = "user";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          onCapture(file);
          setPreview(URL.createObjectURL(file));
        }
      };
      input.click();
    }
  }, [onCapture]);

  function takePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
      onCapture(file);
      setPreview(canvas.toDataURL("image/jpeg"));
      // Stop camera
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setStreaming(false);
    }, "image/jpeg", 0.8);
  }

  function retake() {
    setPreview(null);
    startCamera();
  }

  return (
    <div className="space-y-2">
      <Label>Selfie de verificación</Label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {preview ? (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Selfie de verificación" className="w-full rounded-lg border" />
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={retake}>
            Tomar otra
          </Button>
        </div>
      ) : streaming ? (
        <div>
          <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg border" />
          <canvas ref={canvasRef} className="hidden" />
          <Button
            type="button"
            className="mt-2 w-full bg-mutuo-primary"
            onClick={takePhoto}
          >
            Capturar selfie
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full h-32 border-dashed"
          onClick={startCamera}
        >
          Activar cámara para selfie
        </Button>
      )}
    </div>
  );
}
