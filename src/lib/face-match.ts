// src/lib/face-match.ts
// Face matching module — currently disabled (requires Google Cloud Vision billing).
// Will be re-enabled when Google Cloud billing is activated or an alternative is implemented.

/* eslint-disable @typescript-eslint/no-unused-vars */

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
 * Compares a selfie with a cédula photo to determine if they show the same person.
 *
 * Currently disabled — throws an error indicating the service is unavailable.
 * To re-enable: install @google-cloud/vision and uncomment the implementation,
 * or integrate an alternative face-matching service.
 */
export async function compareFaces(
  selfieBuffer: Buffer,
  cedulaBuffer: Buffer
): Promise<FaceMatchResult> {
  throw new Error(
    "Face matching is currently disabled. Google Cloud Vision billing is required."
  );
}
