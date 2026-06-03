import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Phase 27 / 45-48: Gaze Tracking with 5-point Calibration & Hardware Sentinel
 */
export function useGazeTracking({
  onQuadrantSelect,
  onPhraseSelect,
  onSOSTrigger,
  onHardwareHealth,
  dwellTimeOverride,
}) {
  const [trackingMode, setTrackingMode] = useState('mouse'); // 'mouse' | 'eye'
  const [gazePosition, setGazePosition] = useState({ x: 0, y: 0 });
  const [headPosition, setHeadPosition] = useState({ x: 0, y: 0, z: 0 });
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [gazeAccuracy, setGazeAccuracy] = useState(100);
  const [signalQuality, setSignalQuality] = useState(100);
  const [fps, setFps] = useState(0);

  const [dwellingOn, setDwellingOn] = useState(null);
  const [dwellProgress, setDwellProgress] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [gazeTrail, setGazeTrail] = useState([]);

  // 5-point calibration: maps iris-space → screen-space via learned affine params
  const [calibrationParams, setCalibrationParams] = useState(null);

  const elementsRef = useRef({});
  const smoothedGazeRef = useRef({ x: 0, y: 0 });
  const dwellTimerRef = useRef(null);
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(Date.now());
  const rawGazeHistoryRef = useRef([]);
  const onHardwareHealthRef = useRef(onHardwareHealth);
  const lastOcclusionAlertRef = useRef(0); // throttle hardware-health events

  useEffect(() => { onHardwareHealthRef.current = onHardwareHealth; }, [onHardwareHealth]);

  const JITTER_THRESHOLD = 12;
  const VELOCITY_CLAMP = 40;
  const ALPHA_MIN = 0.04;
  const ALPHA_MAX = 0.75;
  const ALPHA_MOUSE = 0.85;

  // ------------------------------------------------------------------
  // FPS & Signal Quality
  // ------------------------------------------------------------------
  const updateFidelity = useCallback((confidence) => {
    frameCountRef.current++;
    const now = Date.now();
    if (now - lastFpsUpdateRef.current >= 1000) {
      setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsUpdateRef.current)));
      frameCountRef.current = 0;
      lastFpsUpdateRef.current = now;
    }
    setSignalQuality(prev => prev * 0.9 + confidence * 100 * 0.1);
  }, []);

  // ------------------------------------------------------------------
  // 5-point Calibration: build affine mapping from iris → screen coords
  // Call this after collecting 5 (irisX, irisY) → (screenX, screenY) pairs
  // ------------------------------------------------------------------
  const buildCalibration = useCallback((samples) => {
    // samples: [{ ix, iy, sx, sy }, ...] (at least 4)
    if (!samples || samples.length < 4) return;

    // Least-squares affine: sx = a*ix + b*iy + c,  sy = d*ix + e*iy + f
    const n = samples.length;
    let sumIx = 0, sumIy = 0, sumSx = 0, sumSy = 0;
    let sumIxIx = 0, sumIxIy = 0, sumIyIy = 0;
    let sumIxSx = 0, sumIySx = 0, sumIxSy = 0, sumIySy = 0;

    samples.forEach(({ ix, iy, sx, sy }) => {
      sumIx += ix; sumIy += iy; sumSx += sx; sumSy += sy;
      sumIxIx += ix * ix; sumIxIy += ix * iy; sumIyIy += iy * iy;
      sumIxSx += ix * sx; sumIySx += iy * sx;
      sumIxSy += ix * sy; sumIySy += iy * sy;
    });

    // Build 3×3 system (Ax = b) and solve with Cramer's rule for each output
    const det = (
      n * (sumIxIx * sumIyIy - sumIxIy * sumIxIy)
      - sumIx * (sumIx * sumIyIy - sumIxIy * sumIy)
      + sumIy * (sumIx * sumIxIy - sumIxIx * sumIy)
    );

    if (Math.abs(det) < 1e-10) return; // degenerate

    const solve = (bx, by, bz) => {
      const d0 = bx * (sumIxIx * sumIyIy - sumIxIy * sumIxIy) - sumIx * (by * sumIyIy - sumIxIy * bz) + sumIy * (by * sumIxIy - sumIxIx * bz);
      const d1 = n * (by * sumIyIy - sumIxIy * bz) - bx * (sumIx * sumIyIy - sumIxIy * sumIy) + sumIy * (sumIx * bz - by * sumIy);
      const d2 = n * (sumIxIx * bz - by * sumIxIy) - sumIx * (sumIx * bz - by * sumIy) + bx * (sumIx * sumIxIy - sumIxIx * sumIy);
      return [d0 / det, d1 / det, d2 / det];
    };

    const [a, b, c] = solve(sumSx, sumIxSx, sumIySx);
    const [d, e, f] = solve(sumSy, sumIxSy, sumIySy);

    setCalibrationParams({ a, b, c, d, e, f });
    setIsCalibrated(true);
  }, []);

  // Apply calibration mapping (iris → screen)
  const applyCalibration = useCallback((ix, iy) => {
    if (!calibrationParams) {
      // Raw fallback: iris coords are already normalised [0,1], scale to screen
      return { x: ix * window.innerWidth, y: iy * window.innerHeight };
    }
    const { a, b, c, d, e, f } = calibrationParams;
    return { x: a * ix + b * iy + c, y: d * ix + e * iy + f };
  }, [calibrationParams]);

  // ------------------------------------------------------------------
  // Element Registration
  // ------------------------------------------------------------------
  const registerElement = useCallback((id, type, bounds) => {
    elementsRef.current[id] = { id, type, bounds: bounds || null };
  }, []);

  // ------------------------------------------------------------------
  // Main Gaze Update Handler (receives data from GazeEngine or mouse)
  // ------------------------------------------------------------------
  const handleIrisUpdate = useCallback((data) => {
    // --- Hardware-health events (OCCLUDED / LOW_LIGHT) ---
    if (data?.type === 'HARDWARE_HEALTH') {
      const now = Date.now();
      if (now - lastOcclusionAlertRef.current > 5000) { // throttle to 1 alert / 5 s
        lastOcclusionAlertRef.current = now;
        onHardwareHealthRef.current?.(data);
      }
      if (data.status === 'OCCLUDED') {
        setFaceDetected(false);
        setGazeTrail([]);
        updateFidelity(0);
      }
      return;
    }

    if (!data || !data.gaze) {
      setFaceDetected(false);
      setGazeTrail([]);
      updateFidelity(0);
      return;
    }

    setFaceDetected(true);
    setHeadPosition(data.head || { x: 0, y: 0, z: 0 });
    setGazeAccuracy(data.accuracy || 100);
    updateFidelity(data.confidence || 0.95);

    // Raw iris coords (normalised [0,1] when from eye engine; pixels when from mouse)
    const isEyeMode = trackingMode === 'eye';
    let rawX, rawY;

    if (isEyeMode && typeof data.irisX === 'number') {
      const mapped = applyCalibration(data.irisX, data.irisY);
      rawX = mapped.x;
      rawY = mapped.y;
    } else {
      rawX = data.gaze.x;
      rawY = data.gaze.y;
    }

    // --- Phase 45: Ultra-Precision Weighted Moving Average (12-frame window) ---
    rawGazeHistoryRef.current = [{ x: rawX, y: rawY }, ...rawGazeHistoryRef.current.slice(0, 11)];

    let weightSum = 0;
    const wma = rawGazeHistoryRef.current.reduce((acc, p, i) => {
      const weight = rawGazeHistoryRef.current.length - i;
      weightSum += weight;
      return { x: acc.x + p.x * weight, y: acc.y + p.y * weight };
    }, { x: 0, y: 0 });

    let filteredX = wma.x / weightSum;
    let filteredY = wma.y / weightSum;

    const prev = smoothedGazeRef.current;

    // --- Phase 46: Velocity Clamping ---
    const deltaX = filteredX - prev.x;
    const deltaY = filteredY - prev.y;
    const rawDist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (rawDist > VELOCITY_CLAMP) {
      const scale = VELOCITY_CLAMP / rawDist;
      filteredX = prev.x + deltaX * scale;
      filteredY = prev.y + deltaY * scale;
    }

    const dist = Math.sqrt(Math.pow(filteredX - prev.x, 2) + Math.pow(filteredY - prev.y, 2));
    let nextX = prev.x;
    let nextY = prev.y;

    if (dist > JITTER_THRESHOLD) {
      const baseAlpha = dwellingOn ? 0.03 : (ALPHA_MIN + Math.pow(dist / 400, 2));
      const adaptiveAlpha = trackingMode === 'mouse'
        ? ALPHA_MOUSE
        : Math.min(ALPHA_MAX, baseAlpha * (data.confidence || 0.95));

      nextX = prev.x * (1 - adaptiveAlpha) + filteredX * adaptiveAlpha;
      nextY = prev.y * (1 - adaptiveAlpha) + filteredY * adaptiveAlpha;
    }

    smoothedGazeRef.current = { x: nextX, y: nextY };
    setGazePosition({ x: nextX, y: nextY });

    if (nextX !== 0 && nextY !== 0) {
      setGazeTrail(prev => [{ x: nextX, y: nextY, id: performance.now() + Math.random() }, ...prev.slice(0, 15)]);
    }

    // --- Dwell Detection ---
    const hovered = Object.values(elementsRef.current).find((el) => {
      const domEl = document.getElementById(el.id);
      if (!domEl) return false;
      const rect = domEl.getBoundingClientRect();
      return nextX >= rect.left && nextX <= rect.right && nextY >= rect.top && nextY <= rect.bottom;
    });

    if (hovered?.id !== dwellingOn) {
      setDwellingOn(hovered?.id || null);
      setDwellProgress(0);
      if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);

      if (hovered) {
        const startTime = Date.now();
        const duration = dwellTimeOverride || 1800;
        dwellTimerRef.current = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(100, (elapsed / duration) * 100);
          setDwellProgress(progress);

          if (elapsed >= duration) {
            clearInterval(dwellTimerRef.current);
            if (hovered.type === 'quadrant') onQuadrantSelect(hovered.id.replace('quadrant-', ''));
            if (hovered.type === 'phrase') {
              const parts = hovered.id.split('-');
              onPhraseSelect(parts[1], parts[2]);
            }
            if (hovered.id === 'sos-anchor-btn') onSOSTrigger();

            const domEl = document.getElementById(hovered.id);
            if (domEl) domEl.click();

            setDwellProgress(0);
            setDwellingOn(null);
          }
        }, 50);
      }
    }
  }, [
    dwellingOn, dwellTimeOverride, trackingMode,
    applyCalibration, updateFidelity,
    onPhraseSelect, onQuadrantSelect, onSOSTrigger,
  ]);

  // ------------------------------------------------------------------
  // Eye Tracking Controls
  // ------------------------------------------------------------------
  const startEyeTracking = useCallback(() => {
    setTrackingMode('eye');
    setIsCalibrated(false);
    setCalibrationParams(null);
    rawGazeHistoryRef.current = [];
    smoothedGazeRef.current = { x: 0, y: 0 };
  }, []);

  const stopEyeTracking = useCallback(() => {
    setTrackingMode('mouse');
    setIsCalibrated(false);
    setCalibrationParams(null);
    smoothedGazeRef.current = { x: 0, y: 0 };
    setGazeTrail([]);
  }, []);

  // ------------------------------------------------------------------
  // Phase 45: Mouse Simulation Bridge
  // ------------------------------------------------------------------
  useEffect(() => {
    if (trackingMode !== 'mouse') return;

    const handleMouseMove = (e) => {
      handleIrisUpdate({
        gaze: { x: e.clientX, y: e.clientY },
        head: { x: 0, y: 0, z: 0 },
        accuracy: 100,
        confidence: 1.0,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [trackingMode, handleIrisUpdate]);

  return {
    trackingMode,
    gazePosition,
    headPosition,
    dwellingOn,
    dwellProgress,
    gazeAccuracy,
    signalQuality,
    fps,
    gazeTrail,
    faceDetected,
    isCalibrated,
    isLocked,
    calibrationParams,
    setIsCalibrated,
    buildCalibration,
    handleIrisUpdate,
    registerElement,
    startEyeTracking,
    stopEyeTracking,
    setTrackingMode,
  };
}
