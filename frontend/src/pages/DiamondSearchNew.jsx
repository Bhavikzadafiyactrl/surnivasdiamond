import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { exportDiamondsToExcel } from '../utils/exportUtils';
import { FaFileExcel, FaSearch, FaTimes, FaFilter } from 'react-icons/fa';

export default function DiamondSearchNew() {
  const location = useLocation();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user, loading: authLoading } = useAuth();

  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedDiamonds, setSelectedDiamonds] = useState([]);
  const [showFilters, setShowFilters] = useState(true);
  
  const [filters, setFilters] = useState({
    search: '',
    shape: [],
    carat: { min: '', max: '' },
    color: [],
    clarity: [],
    cut: [],
    price: { min: '', max: '' },
    polish: [],
    symmetry: [],
    fluorescence: [],
    certificate: [],
    location: [],
    length: { min: '', max: '' },
    width: { min: '', max: '' },
    diameter: ''
  });

  const shapes = ['ROUND', 'PRINCESS', 'CUSHION', 'OVAL', 'EMERALD', 'PEAR', 'RADIANT', 'MARQUISE', 'HEART'];
  const colors = Array.from({ length: 23 }, (_, i) => String.fromCharCode(68 + i));
  const clarities = ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1', 'I2', 'I3'];
  const cuts = ['EX', 'VG', 'GD', 'F'];
  const polishes = ['EX', 'VG', 'GD', 'F'];
  const symmetries = ['EX', 'VG', 'GD', 'F'];
  const fluorescences = ['NON', 'FNT', 'MED', 'STG', 'VST'];
  const certificates = ['GIA', 'IGI'];
  const locations = ['IND', 'HK', 'VN'];

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  const handleFilterChange = (category, value) => {
    setFilters(prev => {
      if (category === 'carat' || category === 'price' || category === 'length' || category === 'width') {
        return { ...prev, [category]: { ...prev[category], ...value } };
      }
      
      if (Array.isArray(prev[category])) {
        const newValues = prev[category].includes(value)
          ? prev[category].filter(v => v !== value)
          : [...prev[category], value];
        return { ...prev, [category]: newValues };
      }
      
      return { ...prev, [category]: value };
    });
  };

  const handleSearch = async () => {
    setSearchLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/diamonds/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(filters)
      });
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.diamonds || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectDiamond = (id) => {
    setSelectedDiamonds(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedDiamonds.length === searchResults.length) {
      setSelectedDiamonds([]);
    } else {
      setSelectedDiamonds(searchResults.map(d => d._id));
    }
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      shape: [],
      carat: { min: '', max: '' },
      color: [],
      clarity: [],
      cut: [],
      price: { min: '', max: '' },
      polish: [],
      symmetry: [],
      fluorescence: [],
      certificate: [],
      location: [],
      length: { min: '', max: '' },
      width: { min: '', max: '' },
      diameter: ''
    });
    setSearchResults([]);
    setSelectedDiamonds([]);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-50 flex flex-col">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-800">Advanced Diamond Search</h1>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <FaFilter className="w-3 h-3" />
            {showFilters ? 'Hide' : 'Show'} Filters
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          {selectedDiamonds.length > 0 && (
            <>
              <span className="text-sm text-gray-600">Selected: <strong>{selectedDiamonds.length}</strong></span>
              <button
                onClick={() => {
                  const selectedData = searchResults.filter(d => selectedDiamonds.includes(d._id));
                  exportDiamondsToExcel(selectedData, 'Selected_Diamonds.xlsx');
                }}
                className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <FaFileExcel /> Export ({selectedDiamonds.length})
              </button>
            </>
          )}
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-1.5 bg-black hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Dashboard
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Filters Sidebar */}
        {showFilters && (
          <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto p-4">
            <div className="space-y-4">
              {/* Shape Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Shape</label>
                <div className="grid grid-cols-3 gap-2">
                  {shapes.map(shape => (
                    <button
                      key={shape}
                      onClick={() => handleFilterChange('shape', shape)}
                      className={`px-2 py-1.5 text-xs font-medium rounded border transition-all ${
                        filters.shape.includes(shape)
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-black'
                      }`}
                    >
                      {shape.slice(0, 4)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Carat Range */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Carat</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="From"
                    value={filters.carat.min}
                    onChange={(e) => handleFilterChange('carat', { min: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:border-black focus:ring-1 focus:ring-black"
                  />
                  <input
                    type="number"
                    placeholder="To"
                    value={filters.carat.max}
                    onChange={(e) => handleFilterChange('carat', { max: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              {/* Clarity */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Clarity</label>
                <div className="grid grid-cols-4 gap-2">
                  {clarities.map(clarity => (
                    <button
                      key={clarity}
                      onClick={() => handleFilterChange('clarity', clarity)}
                      className={`px-2 py-1.5 text-xs font-medium rounded border transition-all ${
                        filters.clarity.includes(clarity)
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-black'
                      }`}
                    >
                      {clarity}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Color</label>
                <div className="grid grid-cols-6 gap-1">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => handleFilterChange('color', color)}
                      className={`px-2 py-1.5 text-xs font-medium rounded border transition-all ${
                        filters.color.includes(color)
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-black'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cut, Polish, Symmetry */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Cut</label>
                  {cuts.map(cut => (
                    <button
                      key={cut}
                      onClick={() => handleFilterChange('cut', cut)}
                      className={`w-full mb-1 px-2 py-1 text-xs font-medium rounded border transition-all ${
                        filters.cut.includes(cut)
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-black'
                      }`}
                    >
                      {cut}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Polish</label>
                  {polishes.map(pol => (
                    <button
                      key={pol}
                      onClick={() => handleFilterChange('polish', pol)}
                      className={`w-full mb-1 px-2 py-1 text-xs font-medium rounded border transition-all ${
                        filters.polish.includes(pol)
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-black'
                      }`}
                    >
                      {pol}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Sym</label>
                  {symmetries.map(sym => (
                    <button
                      key={sym}
                      onClick={() => handleFilterChange('symmetry', sym)}
                      className={`w-full mb-1 px-2 py-1 text-xs font-medium rounded border transition-all ${
                        filters.symmetry.includes(sym)
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-black'
                      }`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Price ($)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.price.min}
                    onChange={(e) => handleFilterChange('price', { min: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:border-black focus:ring-1 focus:ring-black"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.price.max}
                    onChange={(e) => handleFilterChange('price', { max: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              {/* Certificate & Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Certificate</label>
                  {certificates.map(cert => (
                    <button
                      key={cert}
                      onClick={() => handleFilterChange('certificate', cert)}
                      className={`w-full mb-1 px-2 py-1.5 text-xs font-medium rounded border transition-all ${
                        filters.certificate.includes(cert)
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-black'
                      }`}
                    >
                      {cert}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Location</label>
                  {locations.map(loc => (
                    <button
                      key={loc}
                      onClick={() => handleFilterChange('location', loc)}
                      className={`w-full mb-1 px-2 py-1.5 text-xs font-medium rounded border transition-all ${
                        filters.location.includes(loc)
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-black'
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={resetFilters}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <FaTimes className="w-3 h-3" /> Reset
                </button>
                <button
                  onClick={handleSearch}
                  className="flex-1 px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <FaSearch className="w-3 h-3" /> Search
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Table */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {searchLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
                <p className="text-gray-600">Searching diamonds...</p>
              </div>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs text-center border-collapse">
                <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-xs border-b sticky top-0">
                  <tr>
                    <th className="px-2 py-3 border-r">
                      <input
                        type="checkbox"
                        checked={selectedDiamonds.length === searchResults.length}
                        onChange={handleSelectAll}
                        className="w-4 h-4"
                      />
                    </th>
                    <th className="px-2 py-3 border-r">Status</th>
                    <th className="px-2 py-3 border-r">Stock ID</th>
                    <th className="px-2 py-3 border-r">Shape</th>
                    <th className="px-2 py-3 border-r">Carat</th>
                    <th className="px-2 py-3 border-r">Color</th>
                    <th className="px-2 py-3 border-r">Clarity</th>
                    <th className="px-2 py-3 border-r">Cut</th>
                    <th className="px-2 py-3 border-r">Pol</th>
                    <th className="px-2 py-3 border-r">Sym</th>
                    <th className="px-2 py-3 border-r">Fluor</th>
                    <th className="px-2 py-3 border-r">Lab</th>
                    <th className="px-2 py-3 border-r">Location</th>
                    <th className="px-2 py-3">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {searchResults.map((diamond) => (
                    <tr
                      key={diamond._id}
                      className={`hover:bg-blue-50 transition-colors ${selectedDiamonds.includes(diamond._id) ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-2 py-2 border-r">
                        <input
                          type="checkbox"
                          checked={selectedDiamonds.includes(diamond._id)}
                          onChange={() => handleSelectDiamond(diamond._id)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="px-2 py-2 border-r">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-400"></span>
                      </td>
                      <td className="px-2 py-2 font-medium border-r">{diamond.StockID}</td>
                      <td className="px-2 py-2 border-r">{diamond.Shape}</td>
                      <td className="px-2 py-2 font-semibold border-r">{diamond.Carats}</td>
                      <td className="px-2 py-2 border-r">{diamond.Color}</td>
                      <td className="px-2 py-2 border-r">{diamond.Clarity}</td>
                      <td className="px-2 py-2 border-r">{diamond.Cut}</td>
                      <td className="px-2 py-2 border-r">{diamond.Polish}</td>
                      <td className="px-2 py-2 border-r">{diamond.Sym}</td>
                      <td className="px-2 py-2 border-r">{diamond.Flour}</td>
                      <td className="px-2 py-2 border-r">{diamond.Lab}</td>
                      <td className="px-2 py-2 border-r">{diamond.Location}</td>
                      <td className="px-2 py-2 font-bold text-green-600">${diamond['Amount$']}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FaSearch className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Use filters and click Search to find diamonds</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
