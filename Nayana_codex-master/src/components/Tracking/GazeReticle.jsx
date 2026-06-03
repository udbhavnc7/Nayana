import PropTypes from 'prop-types';

export default function GazeReticle({ position = null, trail = [], dwellingOn = null, dwellProgress = 0, isLocked = false, isVisible = true }) {
  if (!position || !isVisible) return null;

  const circumference = 113; // r=18
  const strokeDashoffset = circumference - (circumference * dwellProgress) / 100;

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {/* Gaze trail trails */}
      {trail.map((point, index) => (
        <span
          key={point.id}
          className="absolute block rounded-full bg-medical/30 animate-trailFade"
          style={{
            left: point.x - 3,
            top: point.y - 3,
            width: Math.max(3, 8 - index),
            height: Math.max(3, 8 - index),
            boxShadow: '0 0 12px var(--medical-cyan)',
          }}
        />
      ))}

      {/* Main Reticle */}
      <div 
        className="absolute"
        style={{
          left: position.x - 24,
          top: position.y - 24,
          width: 48,
          height: 48,
          transform: isLocked ? 'scale(0.85)' : 'scale(1)',
          transition: 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Dynamic Dwell Progress Circle */}
        <svg width={48} height={48} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={24} cy={24} r={20} fill="none" stroke="rgba(126, 96, 79, 0.15)" strokeWidth={2} />
          {dwellingOn && (
            <circle
              cx={24} cy={24} r={20} fill="none"
              stroke={isLocked ? 'var(--stable-green)' : 'var(--medical-cyan)'} 
              strokeWidth={3}
              strokeDasharray={125}
              strokeDashoffset={125 - (125 * dwellProgress) / 100}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.05s linear, stroke 0.2s' }}
            />
          )}
        </svg>

        {/* Outer Locking Corners */}
        <div className={`absolute inset-0 transition-opacity duration-300 ${isLocked ? 'opacity-100' : 'opacity-60'}`}>
          <div className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 ${isLocked ? 'border-stable-green' : 'border-medical'} transition-colors shadow-[0_0_10px_rgba(126,96,79,0.3)]`} />
          <div className={`absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 ${isLocked ? 'border-stable-green' : 'border-medical'} transition-colors shadow-[0_0_10px_rgba(126,96,79,0.3)]`} />
          <div className={`absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 ${isLocked ? 'border-stable-green' : 'border-medical'} transition-colors shadow-[0_0_10px_rgba(126,96,79,0.3)]`} />
          <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 ${isLocked ? 'border-stable-green' : 'border-medical'} transition-colors shadow-[0_0_10px_rgba(126,96,79,0.3)]`} />
        </div>

        {/* Lock Animation (Pulsing ring when locked) */}
        {isLocked && (
          <div className="absolute inset-[-4px] rounded-full border border-stable-green animate-ping opacity-75" />
        )}
      </div>

      {/* Center Dot */}
      <div
        className="absolute rounded-full"
        style={{
          left: position.x - 4,
          top: position.y - 4,
          width: 8,
          height: 8,
          background: isLocked ? 'var(--stable-green)' : '#2E251B',
          boxShadow: isLocked ? '0 0 16px var(--stable-green)' : '0 0 12px rgba(46,37,27,0.4)',
          transition: 'background 0.2s, box-shadow 0.2s',
          borderRadius: '50%',
        }}
      />
    </div>
  );
}

GazeReticle.propTypes = {
  position: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
  trail: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number.isRequired, x: PropTypes.number.isRequired, y: PropTypes.number.isRequired })),
  dwellingOn: PropTypes.string,
  dwellProgress: PropTypes.number,
  isLocked: PropTypes.bool,
  isVisible: PropTypes.bool,
};
