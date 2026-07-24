/**
 * VPT Bridge Client — Communicates with the Python VPT Bridge Server.
 *
 * Sends screenshots to the bridge and receives VPT action predictions.
 * The bridge server runs as a separate Python process (FastAPI + PyTorch).
 *
 * Bridge API:
 *   GET  /api/vpt/health  — Check if bridge is running and model is loaded
 *   POST /api/vpt/act     — Predict action from base64 image
 *   POST /api/vpt/reset   — Reset agent hidden state
 */

import { getLogger } from '../utils/logger';

const logger = getLogger();

export interface VPTActionResponse {
  buttons: string[];
  camera: { pitch: number; yaw: number };
  is_null: boolean;
  raw_buttons?: Record<string, number>;
  raw_camera?: number[];
}

export interface VPTHealthResponse {
  status: string;
  model_loaded: boolean;
  device: string;
}

export class VPTClient {
  private bridgeUrl: string;
  private connected: boolean = false;
  private modelLoaded: boolean = false;

  constructor(bridgeUrl: string = 'http://127.0.0.1:8765') {
    this.bridgeUrl = bridgeUrl.replace(/\/$/, '');
  }

  /** Check if the VPT bridge is reachable and model is loaded */
  async checkHealth(): Promise<VPTHealthResponse | null> {
    try {
      const response = await fetch(`${this.bridgeUrl}/api/vpt/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return null;

      const health = (await response.json()) as VPTHealthResponse;
      this.connected = true;
      this.modelLoaded = health.model_loaded;
      return health;
    } catch {
      this.connected = false;
      this.modelLoaded = false;
      return null;
    }
  }

  /**
   * Predict action from a base64-encoded image.
   *
   * @param imageBase64 - Base64-encoded PNG/JPEG image (without data URI prefix)
   * @param stochastic - Whether to sample from distribution (true) or take argmax (false)
   * @returns VPT action or null if bridge is unavailable
   */
  async predictAction(imageBase64: string, stochastic: boolean = true): Promise<VPTActionResponse | null> {
    try {
      const response = await fetch(`${this.bridgeUrl}/api/vpt/act`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageBase64,
          stochastic,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn(`VPT bridge error: ${response.status} — ${errorText}`);
        return null;
      }

      const action = (await response.json()) as VPTActionResponse;
      return action;
    } catch (err) {
      logger.warn(`VPT bridge request failed: ${err}`);
      this.connected = false;
      return null;
    }
  }

  /** Reset the VPT agent's hidden state (call at episode boundaries) */
  async reset(): Promise<void> {
    try {
      await fetch(`${this.bridgeUrl}/api/vpt/reset`, {
        method: 'POST',
        signal: AbortSignal.timeout(3000),
      });
      logger.debug('VPT agent state reset');
    } catch (err) {
      logger.warn(`VPT reset failed: ${err}`);
    }
  }

  /** Whether the bridge is currently connected */
  isConnected(): boolean {
    return this.connected;
  }

  /** Whether the VPT model is loaded and ready */
  isModelLoaded(): boolean {
    return this.modelLoaded;
  }
}