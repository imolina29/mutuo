// src/components/identity/selfie-capture.tsx
"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface SelfieCaptureProps {
  onCapture: (file: File) => void;
}

export function SelfieCapture({ onCapture }: SelfieCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreaming(true);
      }
    } catch {
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
    const canvas = canvasRef.current;
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(videoRef.current, 0, 0, 640, 480);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
      onCapture(file);
      setPreview(canvas.toDataURL("image/jpeg"));
      // Stop camera
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach((t) => t.stop());
      setStreaming(false);
    }, "image/jpeg", 0.8);
  }

  return (
    <div className="space-y-2">
      <Label>Selfie de verificación</Label>
      {preview ? (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Selfie de verificación" className="w-full rounded-lg border" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => {
              setPreview(null);
              startCamera();
            }}
          >
            Tomar otra
          </Button>
        </div>
      ) : streaming ? (
        <div>
          <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg border" />
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
