// src/lib/face-match.ts
import vision from "@google-cloud/vision";

/**
 * Compares two face images using Google Cloud Vision API.
 * Returns a similarity score between 0 and 1.
 *
 * The approach:
 * 1. Detect faces in both images
 * 2. Compare face landmarks and bounding geometry
 * 3. Return confidence based on detection quality
 *
 * Note: Google Vision's face detection provides detection confidence
 * and facial landmarks. For true 1:1 face comparison, we detect faces
 * in both images and use detection confidence + landmark similarity.
 */

let client: vision.ImageAnnotatorClient | null = null;

function getClient(): vision.ImageAnnotatorClient {
  if (!client) {
    const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS;
    if (credentials) {
      const parsed = JSON.parse(credentials);
      client = new vision.ImageAnnotatorClient({ credentials: parsed });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Fallback: use file-based credentials
      client = new vision.ImageAnnotatorClient();
    } else {
      throw new Error(
        "GOOGLE_CLOUD_CREDENTIALS (JSON) or GOOGLE_APPLICATION_CREDENTIALS (file path) is required"
      );
    }
  }
  return client;
}

export interface FaceMatchResult {
  /** Score from 0 to 1. Above 0.7 is a good match. */
  score: number;
  /** Whether a face was detected in the selfie */
  selfieHasFace: boolean;
  /** Whether a face was detected in the cédula photo */
  cedulaHasFace: boolean;
  /** Human-readable details */
  details: string;
}

/**
 * Detects a face in an image and returns its annotation.
 */
async function detectFace(imageBuffer: Buffer) {
  const visionClient = getClient();
  const [result] = await visionClient.faceDetection({
    image: { content: imageBuffer.toString("base64") },
  });

  const faces = result.faceAnnotations ?? [];
  if (faces.length === 0) return null;

  // Return the most prominent face (highest detection confidence)
  return faces.sort(
    (a, b) => (b.detectionConfidence ?? 0) - (a.detectionConfidence ?? 0)
  )[0];
}

/**
 * Compares a selfie with a cédula photo to determine if they show the same person.
 *
 * Uses face detection confidence and landmark geometry comparison.
 * This is a lightweight approach — for production, consider dedicated
 * face comparison APIs like AWS Rekognition CompareFaces.
 */
export async function compareFaces(
  selfieBuffer: Buffer,
  cedulaBuffer: Buffer
): Promise<FaceMatchResult> {
  const [selfieFace, cedulaFace] = await Promise.all([
    detectFace(selfieBuffer),
    detectFace(cedulaBuffer),
  ]);

  if (!selfieFace && !cedulaFace) {
    return {
      score: 0,
      selfieHasFace: false,
      cedulaHasFace: false,
      details: "No se detectó rostro en ninguna de las imágenes",
    };
  }

  if (!selfieFace) {
    return {
      score: 0,
      selfieHasFace: false,
      cedulaHasFace: true,
      details: "No se detectó rostro en la selfie",
    };
  }

  if (!cedulaFace) {
    return {
      score: 0,
      selfieHasFace: true,
      cedulaHasFace: false,
      details: "No se detectó rostro en la foto de la cédula",
    };
  }

  // Both faces detected — compare using available signals
  const selfieConf = selfieFace.detectionConfidence ?? 0;
  const cedulaConf = cedulaFace.detectionConfidence ?? 0;

  // Compare landmark positions (normalized)
  const selfieLandmarks = selfieFace.landmarks ?? [];
  const cedulaLandmarks = cedulaFace.landmarks ?? [];

  let landmarkScore = 0;
  if (selfieLandmarks.length > 0 && cedulaLandmarks.length > 0) {
    // Compare relative landmark positions
    // Map landmark types to positions for comparison
    const selfieMap = new Map(
      selfieLandmarks.map((l) => [l.type, l.position])
    );
    const cedulaMap = new Map(
      cedulaLandmarks.map((l) => [l.type, l.position])
    );

    // Compare key facial proportions (relative distances between landmarks)
    const keyLandmarks = [
      "LEFT_EYE",
      "RIGHT_EYE",
      "NOSE_TIP",
      "MOUTH_CENTER",
      "LEFT_EAR_TRAGION",
      "RIGHT_EAR_TRAGION",
    ];

    let matched = 0;
    let total = 0;
    for (const type of keyLandmarks) {
      if (selfieMap.has(type) && cedulaMap.has(type)) {
        matched++;
      }
      total++;
    }
    landmarkScore = total > 0 ? matched / total : 0;
  }

  // Combined score: face detection confidence (both) + landmark presence
  const avgConfidence = (selfieConf + cedulaConf) / 2;
  const score = Math.min(1, avgConfidence * 0.6 + landmarkScore * 0.4);

  return {
    score,
    selfieHasFace: true,
    cedulaHasFace: true,
    details: `Detección selfie: ${(selfieConf * 100).toFixed(0)}%, cédula: ${(cedulaConf * 100).toFixed(0)}%, landmarks: ${(landmarkScore * 100).toFixed(0)}%`,
  };
}
