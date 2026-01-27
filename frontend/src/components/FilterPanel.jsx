import img1 from '../assets/Round.webp';
import img2 from '../assets/Oval.webp';
import img3 from '../assets/Princess.webp';
import img4 from '../assets/Emerald.webp';
import img6 from '../assets/Marquise.webp';
import img7 from '../assets/Pear.webp';
import img8 from '../assets/Radiant.webp';
import img9 from '../assets/Heart.webp';
import img10 from '../assets/Cushion.webp';
import imgOther from '../assets/OTHER.png.png';
import { useLanguage } from '../contexts/LanguageContext';

const shapeImages = {
  'ROUND': img1,
  'OVAL': img2,
  'PRINCESS': img3,
  'EMERALD': img4,
  'MARQUISE': img6,
  'PEAR': img7,
  'RADIANT': img8,
  'HEART': img9,
  'CUSHION': img10,
  'OTHER': imgOther
};

const FilterRow = ({ label, children, className = "" }) => (
  <div className={`flex flex-col lg:flex-row border-b border-gray-100 last:border-0 py-3 ${className}`}>
    <div className="w-full lg:w-32 font-bold text-gray-700 text-sm py-2 flex-shrink-0">{label}</div>
    <div className="flex-1 flex flex-wrap items-center gap-2">
      {children}
    </div>
  </div>
);

const SelectButton = ({ active, onClick, children, disabled }) => {
  let btnClass = "px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded border transition-all ";
  
  if (disabled) {
    if (active) {
       // Locked Active State (Black but not clickable)
       btnClass += "bg-black text-white border-black cursor-not-allowed opacity-80";
    } else {
       // Disabled Inactive State (Gray)
       btnClass += "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed";
    }
  } else if (active) {
    btnClass += "bg-black text-white border-black";
  } else {
    btnClass += "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50";
  }

  return (
    <button onClick={onClick} disabled={disabled} className={btnClass}>
      {children}
    </button>
  );
};

const FilterPanel = ({ isFullPage = false, filters, handleFilterChange, handleSearch, setFilters, shapes, colors, clarities, finishings = [], cuts = [], polishes = [], symmetries = [], fluorescences = [], certificates = [], locations = [] }) => {
  const { t } = useLanguage();

  // Logic to disable Cut if Shape is selected and NOT Round
  const isCutDisabled = filters.shape.length > 0 && !filters.shape.includes('ROUND');
  
  // Logic to lock "EX" buttons if 3EX is Active
  const is3EXActive = filters.finishing && filters.finishing.includes('3EX');

  // Handle "ALL" button click for filter categories
  const handleSelectAll = (category) => {
    const allOptions = {
      clarity: clarities,
      color: colors,
      fluorescence: fluorescences,
      certificate: certificates,
      location: locations
    };
    
    const options = allOptions[category];
    const currentSelection = filters[category] || [];
    
    if (currentSelection.length === options.length) {
      // All selected, deselect all
      setFilters(prev => ({ ...prev, [category]: [] }));
    } else {
      // Not all selected, select all
      setFilters(prev => ({ ...prev, [category]: [...options] }));
    }
  };

  return (
    <div className="relative w-full h-full bg-white flex flex-col overflow-hidden">
      
      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-24 data-scroll-container">
          {/* SHAPE ROW */}
          <div className="mb-3">
            <div className="font-bold text-gray-700 text-sm mb-3">Shape</div>
            <div className="flex flex-wrap gap-2">
              {shapes.map(shape => (
                <button
                  key={shape}
                  onClick={() => handleFilterChange('shape', shape)}
                  className={`group flex flex-col items-center justify-center p-2 w-20 h-24 rounded border transition-all ${
                    filters.shape.includes(shape)
                      ? 'bg-gray-50 border-black ring-1 ring-black'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="h-12 flex items-center justify-center mb-2">
                    {shapeImages[shape] && (
                      <img 
                        src={shapeImages[shape]} 
                        alt={shape} 
                        className={`${shape === 'OTHER' ? 'w-14 h-14' : 'w-10 h-10'} object-contain ${filters.shape.includes(shape) ? '' : 'opacity-70 group-hover:opacity-100'}`} 
                      />
                    )}
                  </div>
                  <span className={`text-[10px] font-bold uppercase ${filters.shape.includes(shape) ? 'text-black' : 'text-gray-500'}`}>{shape}</span>
                </button>
              ))}
            </div>
          </div>

          {/* CARAT ROW */}
          <FilterRow label="Carat">
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                min="0"
                placeholder="From"
                className="w-24 px-3 py-1.5 text-sm border border-gray-300 rounded focus:border-black focus:ring-1 focus:ring-black outline-none"
                value={filters.carat.min}
                onChange={(e) => setFilters(prev => ({ ...prev, carat: { ...prev.carat, min: Math.max(0, parseFloat(e.target.value)) } }))}
              />
              <span className="text-gray-400">-</span>
              <input 
                type="number" 
                min="0"
                placeholder="To"
                className="w-24 px-3 py-1.5 text-sm border border-gray-300 rounded focus:border-black focus:ring-1 focus:ring-black outline-none"
                value={filters.carat.max}
                onChange={(e) => setFilters(prev => ({ ...prev, carat: { ...prev.carat, max: Math.max(0, parseFloat(e.target.value)) } }))}
              />
            </div>
          </FilterRow>

          <FilterRow label="Clarity">
            <SelectButton 
              active={filters.clarity.length === clarities.length && clarities.length > 0}
              onClick={() => handleSelectAll('clarity')}
            >
              ALL
            </SelectButton>
            {clarities.map(c => (
              <SelectButton 
                key={c} 
                active={filters.clarity.includes(c)} 
                onClick={() => handleFilterChange('clarity', c)}
              >
                {c}
              </SelectButton>
            ))}
          </FilterRow>

          {/* COLOR */}
          <FilterRow label="Color">
            <SelectButton 
              active={filters.color.length === colors.length && colors.length > 0}
              onClick={() => handleSelectAll('color')}
            >
              ALL
            </SelectButton>
            {colors.map(c => (
              <SelectButton 
                key={c} 
                active={filters.color.includes(c)} 
                onClick={() => handleFilterChange('color', c)}
              >
                {c}
              </SelectButton>
            ))}
          </FilterRow>

          {/* FINISHING + CUT + POLISH + SYMMETRY - COMBINED IN ONE LINE */}
          <div className="flex flex-col lg:flex-row border-b border-gray-100 last:border-0 py-3">
             <div className="w-full lg:w-32 font-bold text-gray-700 text-sm py-2 flex-shrink-0">Finishing</div>
             <div className="flex-1 flex flex-wrap items-center gap-8">
              {/* Finishing Buttons (3EX, 3VG+) */}
              <div className="flex items-center gap-2">
                {finishings.map(f => (
                  <SelectButton 
                    key={f} 
                    active={filters.finishing?.includes(f)} 
                    onClick={() => handleFilterChange('finishing', f)}
                  >
                    {f}
                  </SelectButton>
                ))}
              </div>
              
              {/* Cut */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-700 whitespace-nowrap">Cut:</span>
                {cuts.map(c => (
                  <SelectButton 
                    key={c} 
                    active={filters.cut?.includes(c)} 
                    onClick={() => handleFilterChange('cut', c)}
                    disabled={isCutDisabled || (is3EXActive && c === 'EX')}
                  >
                    {c}
                  </SelectButton>
                ))}
              </div>
              
              {/* Polish */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-700 whitespace-nowrap">Polish:</span>
                {polishes.map(p => (
                  <SelectButton 
                    key={p} 
                    active={filters.polish?.includes(p)} 
                    onClick={() => handleFilterChange('polish', p)}
                    disabled={is3EXActive && p === 'EX'}
                  >
                    {p}
                  </SelectButton>
                ))}
              </div>
              
              {/* Symmetry */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-700 whitespace-nowrap">Symmetry:</span>
                {symmetries.map(s => (
                  <SelectButton 
                    key={s} 
                    active={filters.symmetry?.includes(s)} 
                    onClick={() => handleFilterChange('symmetry', s)}
                    disabled={is3EXActive && s === 'EX'}
                  >
                    {s}
                  </SelectButton>
                ))}
              </div>
            </div>
          </div>

          {/* MEASUREMENTS (Length, Width, Diameter) */}
          <FilterRow label="Measurements">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 w-12">Length</span>
                  <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        min="0"
                        placeholder="From"
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={filters.length?.min || ''}
                        onChange={(e) => setFilters(prev => ({ ...prev, length: { ...prev.length, min: e.target.value } }))}
                      />
                      <span className="text-gray-400">-</span>
                      <input 
                        type="number" 
                        min="0"
                        placeholder="To"
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={filters.length?.max || ''}
                        onChange={(e) => setFilters(prev => ({ ...prev, length: { ...prev.length, max: e.target.value } }))}
                      />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 w-12">Width</span>
                  <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        min="0"
                        placeholder="From"
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={filters.width?.min || ''}
                        onChange={(e) => setFilters(prev => ({ ...prev, width: { ...prev.width, min: e.target.value } }))}
                      />
                      <span className="text-gray-400">-</span>
                      <input 
                        type="number" 
                        min="0"
                        placeholder="To"
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={filters.width?.max || ''}
                        onChange={(e) => setFilters(prev => ({ ...prev, width: { ...prev.width, max: e.target.value } }))}
                      />
                  </div>
                </div>
 
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 w-16">Diameter</span>
                  <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        min="0"
                        placeholder="Specific"
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={filters.diameter || ''}
                        onChange={(e) => setFilters(prev => ({ ...prev, diameter: e.target.value }))}
                      />
                      <span className="text-xs text-gray-400">mm</span>
                  </div>
                </div>

              </div>
          </FilterRow>

          {/* FLUORESCENCE */}
          <FilterRow label="Fluorescence">
            <SelectButton 
              active={filters.fluorescence?.length === fluorescences.length && fluorescences.length > 0}
              onClick={() => handleSelectAll('fluorescence')}
            >
              ALL
            </SelectButton>
            {fluorescences.map(f => (
              <SelectButton 
                key={f} 
                active={filters.fluorescence?.includes(f)} 
                onClick={() => handleFilterChange('fluorescence', f)}
              >
                {f}
              </SelectButton>
            ))}
          </FilterRow>

          {/* CERTIFICATE */}
          <FilterRow label="Certificate">
            <SelectButton 
              active={filters.certificate?.length === certificates.length && certificates.length > 0}
              onClick={() => handleSelectAll('certificate')}
            >
              ALL
            </SelectButton>
            {certificates.map(c => (
              <SelectButton 
                key={c} 
                active={filters.certificate?.includes(c)} 
                onClick={() => handleFilterChange('certificate', c)}
              >
                {c}
              </SelectButton>
            ))}
          </FilterRow>

          {/* LOCATION */}
          <FilterRow label="Location">
            <SelectButton 
              active={filters.location?.length === locations.length && locations.length > 0}
              onClick={() => handleSelectAll('location')}
            >
              ALL
            </SelectButton>
            {locations.map(l => (
              <SelectButton 
                key={l} 
                active={filters.location?.includes(l)} 
                onClick={() => handleFilterChange('location', l)}
              >
                {l}
              </SelectButton>
            ))}
          </FilterRow>

          {/* ACTION BUTTONS - FIXED TO BOTTOM RIGHT */}
          <div className="fixed bottom-4 right-4 z-50 flex gap-2 bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
            <button 
              onClick={() => setFilters({ shape: [], carat: { min: '', max: '' }, color: [], clarity: [], finishing: [], cut: [], polish: [], symmetry: [], fluorescence: [], certificate: [], location: [], length: { min: '', max: '' }, width: { min: '', max: '' }, diameter: '', price: { min: 0, max: 1000000 } })}
              className="font-semibold text-gray-700 bg-white hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
              style={{ fontSize: '13px', width: '120px', height: '40px' }}
            >
              {t('diamondSearch.buttons.reset')}
            </button>
            <button 
              onClick={handleSearch}
              className="bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
              style={{ fontSize: '13px', width: '150px', height: '40px' }}
            >
              {t('diamondSearch.buttons.search')}
            </button>
          </div>
      </div>

    </div>
  );
};

export default FilterPanel;
