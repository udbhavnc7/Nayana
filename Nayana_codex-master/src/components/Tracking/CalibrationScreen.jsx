import { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { CheckCircle, Eye, SkipForward } from 'lucide-react';

// 5 calibration point positions (% of screen)
const CALIB_POINTS = [
  { x: 0.1,  y: 0.1  }, // top-left
  { x: 0.9,  y: 0.1  }, // top-right
  { x: 0.5,  y: 0.5  }, // centre
  { x: 0.1,  y: 0.9  }, // bottom-left
  { x: 0.9,  y: 0.9  }, // bottom-right
];

const DWELL_MS = 1500; // ms to gaze at each point before capturing

/**
 * CalibrationScreen — interactive 5-point eye calibration.
 *
 * Props
 * -----
 * open           – whether to render
 * onSkip         – user skips → switch to mouse mode
 * onComplete     – called with array of { ix, iy, sx, sy } samples after all 5 points
 * getIrisNow     – () => { ix: number, iy: number } | null  — pulls current raw iris position
 */
export default function CalibrationScreen({ open, onSkip, onComplete, getIrisNow }) {
  const [step, setStep] = useState(0);         // 0-4 = active point, 5 = done
  const [progress, setProgress] = useState(0); // 0-100
  const [samples, setSamples] = useState([]);
  const [collected, setCollected] = useState(false);

  const dwellIntervalRef = useRef(null);
  const startTimeRef = useRef(null);

  // Reset when opened
  useEffect(() => {
    if (open) {
      setStep(0);
      setProgress(0);
      setSamples([]);
      setCollected(false);
    } else {
      if (dwellIntervalRef.current) clearInterval(dwellIntervalRef.current);
    }
  }, [open]);

  const advanceToPoint = useCallback((nextStep, currentSamples) => {
    if (dwellIntervalRef.current) clearInterval(dwellIntervalRef.current);

    if (nextStep >= CALIB_POINTS.length) {
      setStep(CALIB_POINTS.length); // done
      setCollected(true);
      onComplete(currentSamples);
      return;
    }

    setStep(nextStep);
    setProgress(0);
    startTimeRef.current = Date.now();

    dwellIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, (elapsed / DWELL_MS) * 100);
      setProgress(pct);

      if (elapsed >= DWELL_MS) {
        clearInterval(dwellIntervalRef.current);
        // Capture iris position at this moment
        const iris = getIrisNow?.();
        const pt = CALIB_POINTS[nextStep];
        const sx = pt.x * window.innerWidth;
        const sy = pt.y * window.innerHeight;

        const newSamples = [
          ...currentSamples,
          {
            ix: iris?.ix ?? pt.x,  // fallback to screen-normalised if no iris
            iy: iris?.iy ?? pt.y,
            sx,
            sy,
          },
        ];
        setSamples(newSamples);
        advanceToPoint(nextStep + 1, newSamples);
      }
    }, 40);
  }, [getIrisNow, onComplete]);

  // Start calibration when dialog opens and resets
  useEffect(() => {
    if (!open || collected) return;
    advanceToPoint(0, []);
    return () => { if (dwellIntervalRef.current) clearInterval(dwellIntervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const isDone = step >= CALIB_POINTS.length;
  const activePt = !isDone ? CALIB_POINTS[step] : null;

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden select-none">
      {/* Semi-transparent background */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      {/* Instructions banner */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 px-6 py-3 rounded-2xl bg-base/90 border border-medical/30 shadow-2xl flex items-center gap-3">
        <Eye size={18} className="text-medical shrink-0" />
        <div>
          <p className="text-xs uppercase tracking-widest text-medical/70 font-display">Eye Calibration</p>
          <p className="text-sm text-white/80 mt-0.5">
            {isDone
              ? 'Calibration complete!'
              : `Gaze at the glowing dot — point ${step + 1} of ${CALIB_POINTS.length}`}
          </p>
        </div>
        <button
          onClick={onSkip}
          className="ml-4 flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-medical/40 transition text-xs font-display uppercase tracking-wider"
        >
          <SkipForward size={13} />
          Skip
        </button>
      </div>

      {/* Calibration dots */}
      {CALIB_POINTS.map((pt, idx) => {
        const isActive = idx === step;
        const isDone_ = idx < step;
        const size = isActive ? 36 : 18;
        const opacity = isActive ? 1 : isDone_ ? 0.3 : 0.15;

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: `${pt.x * 100}%`,
              top: `${pt.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              width: size,
              height: size,
              borderRadius: '50%',
              opacity,
              transition: 'width 0.2s, height 0.2s, opacity 0.3s',
            }}
          >
            {/* Outer ring */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: `2px solid ${isActive ? '#00d4ff' : isDone_ ? '#00ff99' : '#ffffff'}`,
                boxShadow: isActive ? '0 0 20px #00d4ff, 0 0 40px rgba(0,212,255,0.4)' : 'none',
              }}
            />
            {/* Progress arc (SVG) */}
            {isActive && (
              <svg
                style={{ position: 'absolute', inset: -4, width: size + 8, height: size + 8, transform: 'rotate(-90deg)' }}
                viewBox={`0 0 ${size + 8} ${size + 8}`}
              >
                <circle
                  cx={(size + 8) / 2}
                  cy={(size + 8) / 2}
                  r={(size + 8) / 2 - 2}
                  fill="none"
                  stroke="#00d4ff"
                  strokeWidth="2"
                  strokeOpacity="0.3"
                />
                <circle
                  cx={(size + 8) / 2}
                  cy={(size + 8) / 2}
                  r={(size + 8) / 2 - 2}
                  fill="none"
                  stroke="#00d4ff"
                  strokeWidth="2"
                  strokeDasharray={`${((size + 8) / 2 - 2) * 2 * Math.PI}`}
                  strokeDashoffset={`${((size + 8) / 2 - 2) * 2 * Math.PI * (1 - progress / 100)}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.04s linear' }}
                />
              </svg>
            )}
            {/* Inner dot */}
            <div
              style={{
                position: 'absolute',
                inset: 6,
                borderRadius: '50%',
                background: isActive ? '#00d4ff' : isDone_ ? '#00ff99' : '#ffffff',
              }}
            />
            {isDone_ && (
              <CheckCircle
                size={12}
                style={{ position: 'absolute', inset: 0, margin: 'auto', color: '#00ff99' }}
              />
            )}
          </div>
        );
      })}

      {/* Done state */}
      {isDone && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="px-10 py-8 rounded-3xl bg-base/95 border border-stable-green/40 shadow-2xl text-center animate-fade-in">
            <CheckCircle size={48} className="text-stable-green mx-auto mb-3" />
            <p className="font-display text-2xl text-white">Calibration Complete</p>
            <p className="text-sm text-white/60 mt-2">Eye tracking is now personalised to your gaze pattern.</p>
          </div>
        </div>
      )}
    </div>
  );
}

CalibrationScreen.propTypes = {
  open: PropTypes.bool.isRequired,
  onSkip: PropTypes.func.isRequired,
  onComplete: PropTypes.func.isRequired,
  getIrisNow: PropTypes.func,
};

CalibrationScreen.defaultProps = {
  getIrisNow: null,
};
