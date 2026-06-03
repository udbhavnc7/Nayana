import React from 'react';
import PropTypes from 'prop-types';
import { Activity, ChevronLeft } from 'lucide-react';
import PhraseChips from '../Communication/PhraseChips';

/**
 * Phase 34: Phrase Grid Detail View
 * Restores the immersive phrase selection dashboard.
 */
export default function PhraseGrid({
  quadrant,
  config,
  phrases,
  dwellingOn,
  dwellProgress,
  isLocked,
  onPhraseSelect,
  onBack,
  translations,
  densityMode = 'normal',
  lastSelectedPhrase,
  favorites = [],
  onToggleFavorite
}) {
  const Icon = config.icon || Activity;
  const isBackDwelling = dwellingOn === 'btn-back';

  return (
    <div className="flex h-full flex-col animate-fade-in">
      {/* Detail Header */}
      <div className="flex items-center justify-between mb-8 px-4">
        <div className="flex items-center gap-6">
          <button
            id="btn-back"
            onClick={onBack}
            className={`p-4 rounded-3xl transition-all duration-300 relative group bg-[#3C2210] hover:bg-[#5C3B24] text-white shadow-md ${isBackDwelling ? 'scale-110' : ''}`}
          >
            <ChevronLeft size={32} className="text-white" />
            {isBackDwelling && (
               <div className="absolute inset-0 rounded-3xl border-2 border-[#3C2210]/40 animate-pulse" />
            )}
            {/* Dwell bar for Back button */}
            {isBackDwelling && (
              <div className="absolute -bottom-2 left-2 right-2 h-1.5 bg-[#3C2210]/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-none" 
                  style={{ width: `${dwellProgress}%` }} 
                />
              </div>
            )}
          </button>
          
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-[#3C2210]/5 border border-[#3C2210]/15" style={{ color: config.color }}>
               <Icon size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-bold uppercase tracking-tight" style={{ color: config.color }}>
                {translations[quadrant] || quadrant}
              </h2>
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] mt-1 italic" style={{ color: 'rgba(10,10,10,0.5)' }}>
                {densityMode} Communication Mode
              </p>
            </div>
          </div>
        </div>

        {lastSelectedPhrase && (
          <div className="px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3 animate-slide-in-right">
             <div className="h-2 w-2 rounded-full bg-stable-green animate-pulse" />
             <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
               Last: {translations[lastSelectedPhrase] || lastSelectedPhrase}
             </span>
          </div>
        )}
      </div>

      {/* Phrase Selection Core */}
      <div className="flex-1 overflow-y-auto px-2 pb-8 scrollbar-hide">
        <PhraseChips
          quadrant={quadrant}
          phrases={phrases}
          translations={translations}
          onPhraseSelect={onPhraseSelect}
          dwellingOn={dwellingOn}
          dwellProgress={dwellProgress}
          isLocked={isLocked}
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
        />
      </div>
      
      {/* Footer Context */}
      <div className="mt-auto py-4 flex justify-center opacity-20">
         <div className="h-1 w-12 rounded-full bg-white/40" />
      </div>
    </div>
  );
}

PhraseGrid.propTypes = {
  quadrant: PropTypes.string.isRequired,
  config: PropTypes.object.isRequired,
  phrases: PropTypes.array.isRequired,
  dwellingOn: PropTypes.string,
  dwellProgress: PropTypes.number,
  isLocked: PropTypes.bool,
  onPhraseSelect: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  translations: PropTypes.object.isRequired,
  densityMode: PropTypes.string,
  lastSelectedPhrase: PropTypes.string,
};
