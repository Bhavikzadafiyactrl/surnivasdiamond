import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaUpload, FaFilter, FaDownload, FaChartBar } from 'react-icons/fa';
import InventorySummary from '../../components/InventorySummary';
import * as XLSX from 'xlsx';
import { exportDiamondsToExcel } from '../../utils/exportUtils';

const ManageDiamondList = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [diamonds, setDiamonds] = useState([]);
  const [selectedDiamonds, setSelectedDiamonds] = useState([]); // Store full objects { _id, ... }
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Applied Filters (sent to backend)
  const [appliedFilters, setAppliedFilters] = useState({
    shape: [],
    carat: { min: '', max: '' },
    color: [],
    clarity: [],
    cut: [],
    polish: [],
    symmetry: [],
    fluorescence: [],
    location: [],
    status: []
  });
  
  // Temporary Filters (UI state before Apply)
  const [tempFilters, setTempFilters] = useState({
    shape: [],
    carat: { min: '', max: '' },
    color: [],
    clarity: [],
    cut: [],
    polish: [],
    symmetry: [],
    fluorescence: [],
    location: [],
    status: []
  });
  
  // Modal State
  const [showSummary, setShowSummary] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingDiamond, setEditingDiamond] = useState(null);
  const [formData, setFormData] = useState({
    StockID: '',
    "Report No": '',
    Shape: '',
    Carats: '',
    Color: '',
    Clarity: '',
    Cut: '',
    Polish: '',
    Sym: '',
    Flour: '',
    Measurement: '',
    "Diameter (MM)": '',
    "Depth %": '',
    "Table %": '',
    "Key To Symbols": '',
    BGM: '',
    Lab: '',
    "Amount$": '',
    Location: '',
    GIALINK: '',
    videoLink: '',
    Status: 'available'
  });

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : { name: 'Guest' };
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchDiamonds();
  }, [page, search, appliedFilters]);

  const fetchDiamonds = async () => {
    setLoading(true);
    // REMOVED: setSelectedIds([]); // Do not clear selection on fetch
    try {
      const token = localStorage.getItem('token');
      
      // Build query params with filters
      const params = new URLSearchParams({
        page,
        limit: 20,
        search
      });
      
      // Add filter params
      if (appliedFilters.shape.length > 0) params.append('shape', JSON.stringify(appliedFilters.shape));
      if (appliedFilters.color.length > 0) params.append('color', JSON.stringify(appliedFilters.color));
      if (appliedFilters.clarity.length > 0) params.append('clarity', JSON.stringify(appliedFilters.clarity));
      if (appliedFilters.cut.length > 0) params.append('cut', JSON.stringify(appliedFilters.cut));
      if (appliedFilters.polish.length > 0) params.append('polish', JSON.stringify(appliedFilters.polish));
      if (appliedFilters.symmetry.length > 0) params.append('symmetry', JSON.stringify(appliedFilters.symmetry));
      if (appliedFilters.fluorescence.length > 0) params.append('fluorescence', JSON.stringify(appliedFilters.fluorescence));
      if (appliedFilters.location.length > 0) params.append('location', JSON.stringify(appliedFilters.location));
      if (appliedFilters.status.length > 0) params.append('status', JSON.stringify(appliedFilters.status));
      if (appliedFilters.carat.min) params.append('caratMin', appliedFilters.carat.min);
      if (appliedFilters.carat.max) params.append('caratMax', appliedFilters.carat.max);

      const response = await fetch(`${API_URL}/diamonds/admin/list?${params}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setDiamonds(data.data);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Fetch diamonds error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchDiamonds();
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = editingDiamond 
        ? `${API_URL}/diamonds/admin/update/${editingDiamond._id}`
        : `${API_URL}/diamonds/admin/create`;
      
      const method = editingDiamond ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        alert(editingDiamond ? 'Diamond updated!' : 'Diamond created!');
        closeModal();
        fetchDiamonds();
      } else {
        alert(data.message || 'Error saving diamond');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Error saving diamond');
    }
  };

  const handleDelete = async (id) => {
    // Find the diamond to check its status
    const diamond = diamonds.find(d => d._id === id);
    
    // Only allow deletion if status is 'available'
    if (diamond && diamond.Status !== 'available') {
      alert(`Cannot delete diamond with status "${diamond.Status}". Only diamonds with "available" status can be deleted.`);
      return;
    }
    
    if (!confirm('Are you sure you want to delete this diamond?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/diamonds/admin/delete/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        alert('Diamond deleted!');
        fetchDiamonds(); 
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const openModal = (diamond = null) => {
    if (diamond) {
      setEditingDiamond(diamond);
      setFormData({
        StockID: diamond.StockID || '',
        "Report No": diamond["Report No"] || '',
        Shape: diamond.Shape || '',
        Carats: diamond.Carats || '',
        Color: diamond.Color || '',
        Clarity: diamond.Clarity || '',
        Cut: diamond.Cut || '',
        Polish: diamond.Polish || '',
        Sym: diamond.Sym || '',
        Flour: diamond.Flour || '',
        Measurement: diamond.Measurement || '',
        "Diameter (MM)": diamond["Diameter (MM)"] || '',
        "Depth %": diamond["Depth %"] || '',
        "Table %": diamond["Table %"] || '',
        "Key To Symbols": diamond["Key To Symbols"] || '',
        BGM: diamond.BGM || '',
        Lab: diamond.Lab || '',
        "Amount$": diamond["Amount$"] || '',
        Location: diamond.Location || '',
        GIALINK: diamond.GIALINK || '',
        videoLink: diamond.videoLink || '',
        Status: diamond.Status || 'available'
      });
    } else {
      setEditingDiamond(null);
      setFormData({
        StockID: '', "Report No": '', Shape: '', Carats: '', Color: '', Clarity: '',
        Cut: '', Polish: '', Sym: '', Flour: '', Measurement: '', "Diameter (MM)": '',
        "Depth %": '', "Table %": '', "Key To Symbols": '', BGM: '', Lab: '', "Amount$": '',
        Location: '', GIALINK: '', videoLink: '', Status: 'available'
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDiamond(null);
  };

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    const conf = confirm(`Upload "${file.name}"? This will import all diamonds from the CSV file.`);
    if (!conf) return;

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('csvFile', file);

      const response = await fetch(`${API_URL}/diamonds/admin/bulk-upload-csv`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        alert(`Success! Imported ${data.count} diamonds.`);
        fetchDiamonds();
      } else {
        const fullError = data.error ? `\n\nDetails: ${data.error}` : '';
        alert(`Upload Failed:\n${data.message || 'Unknown Error'}${fullError}`);
      }
    } catch (error) {
      console.error('CSV upload error:', error);
      alert('Network or Server Error uploading CSV');
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  // Filter helper functions
  const toggleFilter = (category, value) => {
    setTempFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(v => v !== value)
        : [...prev[category], value]
    }));
  };

  const updateCaratRange = (field, value) => {
    setTempFilters(prev => ({
      ...prev,
      carat: { ...prev.carat, [field]: value }
    }));
  };

  const applyFilters = () => {
    setAppliedFilters({...tempFilters});
    setPage(1);
  };

  const clearFilters = () => {
    const emptyFilters = {
      shape: [],
      carat: { min: '', max: '' },
      color: [],
      clarity: [],
      cut: [],
      polish: [],
      symmetry: [],
      fluorescence: [],
      location: [],
      status: []
    };
    setTempFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(1);
  };

  const hasActiveFilters = () => {
    return appliedFilters.shape.length > 0 ||
      appliedFilters.color.length > 0 ||
      appliedFilters.clarity.length > 0 ||
      appliedFilters.cut.length > 0 ||
      appliedFilters.polish.length > 0 ||
      appliedFilters.symmetry.length > 0 ||
      appliedFilters.fluorescence.length > 0 ||
      appliedFilters.location.length > 0 ||
      appliedFilters.status.length > 0 ||
      appliedFilters.carat.min || appliedFilters.carat.max;
  };

  // Selection Logic
  const toggleSelectAll = () => {
    // Check if all CURRENT PAGE diamonds are selected
    const allPageSelected = diamonds.every(d => selectedDiamonds.some(sd => sd._id === d._id));

    if (allPageSelected) {
      // Deselect all diamonds on current page
      setSelectedDiamonds(prev => prev.filter(sd => !diamonds.some(d => d._id === sd._id)));
    } else {
      // Select all diamonds on current page (avoid duplicates)
      const newSelections = diamonds.filter(d => !selectedDiamonds.some(sd => sd._id === d._id));
      setSelectedDiamonds(prev => [...prev, ...newSelections]);
    }
  };

  const toggleSelection = (diamond) => {
    if (selectedDiamonds.some(sd => sd._id === diamond._id)) {
      setSelectedDiamonds(prev => prev.filter(sd => sd._id !== diamond._id));
    } else {
      setSelectedDiamonds(prev => [...prev, diamond]);
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
      if (selectedDiamonds.length === 0) return;
      
      if (!window.confirm(`Are you sure you want to delete ${selectedDiamonds.length} diamonds? This action cannot be undone.`)) {
          return;
      }

      try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${import.meta.env.VITE_API_URL}/diamonds/admin/bulk-delete`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              credentials: 'include',
              body: JSON.stringify({ diamondIds: selectedDiamonds.map(d => d._id) })
          });

          const data = await response.json();
          if (data.success) {
              alert(`✅ ${data.message}`);
              setSelectedDiamonds([]);
              fetchDiamonds(); // Refresh list
          } else {
              alert(`❌ Failed to delete: ${data.message}`);
          }
      } catch (error) {
          console.error("Bulk delete error:", error);
          alert("❌ Error deleting diamonds.");
      }
  };

  // Export Logic
  const handleExportSelected = () => {
    if (selectedDiamonds.length === 0) return;
    exportDiamondsToExcel(selectedDiamonds, 'Admin_Selected_Diamonds.xlsx');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
        isMobileOpen={isMobileOpen}
        closeMobileSidebar={() => setIsMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Topbar userName={user.name} onMenuClick={() => setIsMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto p-2">
          <div className="w-full">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
              <h1 className="text-2xl font-bold text-gray-900">Manage Diamond List</h1>
              <div className="flex gap-2 w-full md:w-auto">
                <form onSubmit={handleSearch} className="flex-1 md:w-64 flex">
                  <input
                    type="text"
                    placeholder="Search Stock ID or Report No..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-4 py-2 border rounded-l-lg focus:outline-none focus:ring-1 focus:ring-black"
                  />
                  <button type="submit" className="px-4 py-2 bg-gray-200 border border-l-0 rounded-r-lg hover:bg-gray-300">
                    <FaSearch />
                  </button>
                </form>
                  <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-2 border rounded-lg flex items-center gap-2 hover:bg-gray-100 whitespace-nowrap ${hasActiveFilters() ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white'}`}
                  >
                    <FaFilter /> Filters
                    {hasActiveFilters() && (
                      <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-blue-600 text-white rounded-full">
                        {[...appliedFilters.shape, ...appliedFilters.color, ...appliedFilters.clarity, ...appliedFilters.cut, ...appliedFilters.polish, ...appliedFilters.symmetry, ...appliedFilters.fluorescence, ...appliedFilters.location, ...appliedFilters.status].length + (appliedFilters.carat.min || appliedFilters.carat.max ? 1 : 0)}
                      </span>
                    )}
                  </button>
                  
                  {/* Export Button */}
                  {selectedDiamonds.length > 0 && (
                    <>
                    <button 
                        onClick={handleExportSelected}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 whitespace-nowrap animate-fadeIn"
                    >
                        <FaDownload /> Export ({selectedDiamonds.length})
                    </button>
                    <button 
                        onClick={handleBulkDelete}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2 hover:bg-red-700 whitespace-nowrap animate-fadeIn"
                    >
                        <FaTrash /> Delete ({selectedDiamonds.length})
                    </button>
                    </>
                  )}

                  <button 
                    onClick={() => setShowSummary(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2 hover:bg-purple-700 whitespace-nowrap"
                  >
                    <FaChartBar /> Summary
                  </button>

                  <button 
                    onClick={() => openModal()}
                    className="px-4 py-2 bg-black text-white rounded-lg flex items-center gap-2 hover:bg-gray-800 whitespace-nowrap"
                  >
                    <FaPlus /> Add Diamond
                  </button>
                  <label className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 cursor-pointer whitespace-nowrap">
                    <FaUpload /> {uploading ? 'Uploading...' : 'Upload CSV'}
                    <input 
                      type="file" 
                      accept=".csv" 
                      onChange={handleCSVUpload} 
                      className="hidden" 
                      disabled={uploading}
                    />
                  </label>
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Advanced Diamond Filters</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Shape Filter */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">Shape</label>
                    <div className="flex flex-wrap gap-2">
                      {['ROUND', 'PRINCESS', 'CUSHION', 'EMERALD', 'OVAL', 'RADIANT', 'ASSCHER', 'MARQUISE', 'PEAR', 'HEART'].map(shape => (
                        <button
                          key={shape}
                          onClick={() => toggleFilter('shape', shape)}
                          className={`px-2 py-1 text-xs rounded border ${tempFilters.shape.includes(shape) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                          {shape}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Carat Range */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">Carat</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Min"
                        value={tempFilters.carat.min}
                        onChange={(e) => updateCaratRange('min', e.target.value)}
                        className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Max"
                        value={tempFilters.carat.max}
                        onChange={(e) => updateCaratRange('max', e.target.value)}
                        className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Color Filter */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">Color</label>
                    <div className="flex flex-wrap gap-2">
                      {['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'].map(color => (
                        <button
                          key={color}
                          onClick={() => toggleFilter('color', color)}
                          className={`px-2 py-1 text-xs rounded border ${tempFilters.color.includes(color) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clarity Filter */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">Clarity</label>
                    <div className="flex flex-wrap gap-2">
                      {['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1', 'I2'].map(clarity => (
                        <button
                          key={clarity}
                          onClick={() => toggleFilter('clarity', clarity)}
                          className={`px-2 py-1 text-xs rounded border ${tempFilters.clarity.includes(clarity) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                          {clarity}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cut Filter */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">Cut</label>
                    <div className="flex flex-wrap gap-2">
                      {['EX', 'VG', 'GD', 'F'].map(cut => (
                        <button
                          key={cut}
                          onClick={() => toggleFilter('cut', cut)}
                          className={`px-2 py-1 text-xs rounded border ${tempFilters.cut.includes(cut) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                          {cut}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Polish Filter */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">Polish</label>
                    <div className="flex flex-wrap gap-2">
                      {['EX', 'VG', 'GD', 'F'].map(polish => (
                        <button
                          key={polish}
                          onClick={() => toggleFilter('polish', polish)}
                          className={`px-2 py-1 text-xs rounded border ${tempFilters.polish.includes(polish) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                          {polish}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Symmetry Filter */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">Symmetry</label>
                    <div className="flex flex-wrap gap-2">
                      {['EX', 'VG', 'GD', 'F'].map(sym => (
                        <button
                          key={sym}
                          onClick={() => toggleFilter('symmetry', sym)}
                          className={`px-2 py-1 text-xs rounded border ${tempFilters.symmetry.includes(sym) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fluorescence Filter */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">Fluorescence</label>
                    <div className="flex flex-wrap gap-2">
                      {['NON', 'FNT', 'MED', 'STG', 'VST', 'VSL'].map(flour => (
                        <button
                          key={flour}
                          onClick={() => toggleFilter('fluorescence', flour)}
                          className={`px-2 py-1 text-xs rounded border ${tempFilters.fluorescence.includes(flour) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                          {flour}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Location Filter */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">Location</label>
                    <div className="flex flex-wrap gap-2">
                      {['INDIA', 'HONG KONG', 'VIETNAM'].map(loc => (
                        <button
                          key={loc}
                          onClick={() => toggleFilter('location', loc)}
                          className={`px-2 py-1 text-xs rounded border ${tempFilters.location.includes(loc) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">Status</label>
                    <div className="flex flex-wrap gap-2">
                      {['available', 'hold', 'reviewing', 'confirmed', 'sold'].map(status => (
                        <button
                          key={status}
                          onClick={() => toggleFilter('status', status)}
                          className={`px-2 py-1 text-xs rounded border ${tempFilters.status.includes(status) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Apply and Clear Buttons */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                  <button
                    onClick={clearFilters}
                    className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={applyFilters}
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm overflow-hidden border">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-center border-collapse">
                  <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-xs border-b">
                    <tr>
                      <th className="px-2 py-3 border-r border-gray-200 w-8 text-center">
                          <input 
                              type="checkbox" 
                              checked={diamonds.length > 0 && diamonds.every(d => selectedDiamonds.some(sd => sd._id === d._id))}
                              onChange={toggleSelectAll}
                              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                      </th>
                      <th className="px-2 py-2 whitespace-nowrap border-r border-gray-200 text-center">LOC</th>
                      <th className="px-2 py-2 whitespace-nowrap border-r border-gray-200 text-center">Stock ID</th>
                      <th className="px-2 py-2 whitespace-nowrap border-r border-gray-200 text-center">Report</th>
                      <th className="px-2 py-2 whitespace-nowrap border-r border-gray-200 text-center">Video</th>
                      <th className="px-2 py-2 whitespace-nowrap border-r border-gray-200 text-center">Lab</th>
                      <th className="px-2 py-2 whitespace-nowrap border-r border-gray-200 text-center">Shape</th>
                      <th className="px-2 py-2 whitespace-nowrap border-r border-gray-200 text-center">Carat</th>
                      <th className="px-2 py-2 whitespace-nowrap border-r border-gray-200 text-center">Color</th>
                      <th className="px-2 py-2 whitespace-nowrap border-r border-gray-200 text-center">Clarity</th>
                      <th className="px-2 py-2 whitespace-nowrap border-r border-gray-200 text-center">Cut</th>

                      <th className="px-2 py-2 whitespace-nowrap border-r border-gray-200 text-center">Pol</th>
                      <th className="px-2 py-2 whitespace-nowrap border-r border-gray-200 text-center">Sym</th>
                      <th className="px-2 py-2 whitespace-nowrap border-r border-gray-200 text-center">Fluor</th>
                      <th className="px-2 py-2 whitespace-nowrap border-r border-gray-200 text-center">Meas</th>
                      <th className="px-2 py-2 whitespace-nowrap border-r border-gray-200 text-center">Diam</th>
                      <th className="px-2 py-2 whitespace-nowrap border-r border-gray-200 text-center">Depth</th>
                      <th className="px-2 py-2 whitespace-nowrap border-r border-gray-200 text-center">Table</th>
                      <th className="px-2 py-2 whitespace-nowrap border-r border-gray-200 text-center">Key</th>
                      <th className="px-2 py-2 whitespace-nowrap border-r border-gray-200 text-center">BGM</th>
                      <th className="px-2 py-2 whitespace-nowrap border-r border-gray-200 text-center">Status</th>
                      <th className="px-2 py-2 whitespace-nowrap text-center">Price</th>
                      <th className="px-2 py-2 whitespace-nowrap text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr><td colSpan="21" className="text-center py-10">Loading...</td></tr>
                    ) : diamonds.length > 0 ? (
                      diamonds.map((diamond) => (
                        <tr key={diamond._id} className={`hover:bg-blue-50/50 text-xs transition-colors ${selectedDiamonds.some(sd => sd._id === diamond._id) ? 'bg-blue-50' : ''}`}>
                          <td className="px-2 py-2 border-r border-gray-200 text-center">
                              <input 
                                  type="checkbox" 
                                  checked={selectedDiamonds.some(sd => sd._id === diamond._id)}
                                  onChange={() => toggleSelection(diamond)}
                                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                              />
                          </td>
                          <td className="px-2 py-2 border-r border-gray-200 text-center">{diamond.Location || '-'}</td>
                          <td className="px-2 py-2 font-medium border-r border-gray-200 text-center">{diamond.StockID || '-'}</td>
                          <td className="px-2 py-2 border-r border-gray-200 text-center">
                            {diamond["Report No"] ? (
                                <a href={diamond.GIALINK || `https://www.gia.edu/report-check?reportno=${diamond["Report No"]}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                  {diamond["Report No"]} 🔗
                                </a>
                            ) : '-'}
                          </td>
                           <td className="px-2 py-2 border-r border-gray-200 text-center max-w-[150px] truncate" title={diamond.videoLink}>
                            {diamond.videoLink ? (
                                <a 
                                    href={diamond.videoLink.startsWith('http') || diamond.videoLink.startsWith('#') ? diamond.videoLink : `https://${diamond.videoLink}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-blue-600 hover:underline text-xs"
                                >
                                    {diamond.videoLink}
                                </a>
                            ) : '-'}
                          </td>
                          <td className="px-2 py-2 border-r border-gray-200 text-center">{diamond.Lab || '-'}</td>
                          <td className="px-2 py-2 border-r border-gray-200 text-center">{diamond.Shape || '-'}</td>
                          <td className="px-2 py-2 font-semibold border-r border-gray-200 text-center">{diamond.Carats || '-'}</td>
                          <td className="px-2 py-2 border-r border-gray-200 text-center">{diamond.Color || '-'}</td>
                          <td className="px-2 py-2 border-r border-gray-200 text-center">{diamond.Clarity || '-'}</td>
                          <td className="px-2 py-2 border-r border-gray-200 text-center">{diamond.Cut || '-'}</td>
                          <td className="px-2 py-2 border-r border-gray-200 text-center">{diamond.Polish || '-'}</td>
                          <td className="px-2 py-2 border-r border-gray-200 text-center">{diamond.Sym || '-'}</td>
                          <td className="px-2 py-2 border-r border-gray-200 text-center">{diamond.Flour || '-'}</td>
                          <td className="px-2 py-2 border-r border-gray-200 text-center">{diamond.Measurement || '-'}</td>
                          <td className="px-2 py-2 border-r border-gray-200 text-center">{diamond["Diameter (MM)"] || '-'}</td>
                          <td className="px-2 py-2 border-r border-gray-200 text-center">{diamond["Depth %"] || '-'}</td>
                          <td className="px-2 py-2 border-r border-gray-200 text-center">{diamond["Table %"] || '-'}</td>
                          <td className="px-2 py-2 border-r border-gray-200 text-center">{diamond["Key To Symbols"] || '-'}</td>
                          <td className="px-2 py-2 border-r border-gray-200 text-center">{diamond.BGM || '-'}</td>
                          <td className="px-2 py-2 border-r border-gray-200 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              diamond.Status === 'available' ? 'bg-green-100 text-green-700' :
                              diamond.Status === 'hold' ? 'bg-yellow-100 text-yellow-700' :
                              diamond.Status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                              diamond.Status === 'sold' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {diamond.Status || 'available'}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-green-600 font-semibold text-center">${diamond["Amount$"] || '-'}</td>
                          <td className="px-2 py-2 flex gap-1 justify-center">
                            <button onClick={() => openModal(diamond)} className="text-blue-500 hover:text-blue-700"><FaEdit size={12} /></button>
                            <button onClick={() => handleDelete(diamond._id)} className="text-red-500 hover:text-red-700"><FaTrash size={12} /></button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="21" className="text-center py-10 text-gray-500">No diamonds found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {!loading && totalPages > 1 && (
                <div className="flex justify-center p-4 border-t gap-2">
                  <button 
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="px-3 py-1">Page {page} of {totalPages}</span>
                  <button 
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      <InventorySummary isOpen={showSummary} onClose={() => setShowSummary(false)} />

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">{editingDiamond ? 'Edit' : 'Add'} Diamond</h2>
              <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                <div className="col-span-1">
                  <label className="block text-xs font-bold mb-1">Stock ID *</label>
                  <input type="text" name="StockID" required value={formData.StockID} onChange={handleInputChange} className="w-full px-2 py-1 border rounded" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold mb-1">Report No</label>
                  <input type="text" name="Report No" value={formData["Report No"]} onChange={handleInputChange} className="w-full px-2 py-1 border rounded" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold mb-1">Shape</label>
                  <input type="text" name="Shape" value={formData.Shape} onChange={handleInputChange} className="w-full px-2 py-1 border rounded" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold mb-1">Carats</label>
                  <input type="number" step="0.01" name="Carats" value={formData.Carats} onChange={handleInputChange} className="w-full px-2 py-1 border rounded" />
                </div>
                
                <div className="col-span-1">
                  <label className="block text-xs font-bold mb-1">Color</label>
                  <input type="text" name="Color" value={formData.Color} onChange={handleInputChange} className="w-full px-2 py-1 border rounded" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold mb-1">Clarity</label>
                  <input type="text" name="Clarity" value={formData.Clarity} onChange={handleInputChange} className="w-full px-2 py-1 border rounded" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold mb-1">Cut</label>
                  <input type="text" name="Cut" value={formData.Cut} onChange={handleInputChange} className="w-full px-2 py-1 border rounded" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold mb-1">Polish</label>
                  <input type="text" name="Polish" value={formData.Polish} onChange={handleInputChange} className="w-full px-2 py-1 border rounded" />
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-bold mb-1">Sym</label>
                  <input type="text" name="Sym" value={formData.Sym} onChange={handleInputChange} className="w-full px-2 py-1 border rounded" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold mb-1">Flour</label>
                  <input type="text" name="Flour" value={formData.Flour} onChange={handleInputChange} className="w-full px-2 py-1 border rounded" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold mb-1">Measurement</label>
                  <input type="text" name="Measurement" value={formData.Measurement} onChange={handleInputChange} className="w-full px-2 py-1 border rounded" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold mb-1">Diameter (MM)</label>
                  <input type="text" name="Diameter (MM)" value={formData["Diameter (MM)"]} onChange={handleInputChange} className="w-full px-2 py-1 border rounded" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold mb-1">Depth %</label>
                  <input type="number" step="0.01" name="Depth %" value={formData["Depth %"]} onChange={handleInputChange} className="w-full px-2 py-1 border rounded" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold mb-1">Table %</label>
                  <input type="number" step="0.01" name="Table %" value={formData["Table %"]} onChange={handleInputChange} className="w-full px-2 py-1 border rounded" />
                </div>
                
                <div className="col-span-1">
                  <label className="block text-xs font-bold mb-1">BGM</label>
                  <input type="text" name="BGM" value={formData.BGM} onChange={handleInputChange} className="w-full px-2 py-1 border rounded" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold mb-1">Key To Symbols</label>
                  <input type="text" name="Key To Symbols" value={formData["Key To Symbols"]} onChange={handleInputChange} className="w-full px-2 py-1 border rounded" />
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-bold mb-1">Lab</label>
                  <input type="text" name="Lab" value={formData.Lab} onChange={handleInputChange} className="w-full px-2 py-1 border rounded" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold mb-1">Location</label>
                  <input type="text" name="Location" value={formData.Location} onChange={handleInputChange} className="w-full px-2 py-1 border rounded" />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold mb-1">GIA Link</label>
                  <input type="text" name="GIALINK" value={formData.GIALINK} onChange={handleInputChange} className="w-full px-2 py-1 border rounded" />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold mb-1">Video Link</label>
                  <input type="text" name="videoLink" value={formData.videoLink} onChange={handleInputChange} className="w-full px-2 py-1 border rounded" />
                </div>

                <div className="col-span-1">
                   <label className="block text-xs font-bold mb-1">Status</label>
                   <select name="Status" value={formData.Status} onChange={handleInputChange} className="w-full px-2 py-1 border rounded">
                      <option value="available">Available</option>
                      <option value="hold">Hold</option>
                      <option value="reviewing">Reviewing</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="sold">Sold</option>
                   </select>
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-bold mb-1">Amount ($) *</label>
                  <input type="number" step="0.01" required name="Amount$" value={formData["Amount$"]} onChange={handleInputChange} className="w-full px-2 py-1 border rounded" />
                </div>

                <div className="col-span-4 flex gap-3 pt-4 border-t mt-2">
                  <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 border rounded hover:bg-gray-100">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-black text-white rounded hover:bg-gray-800">
                    {editingDiamond ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageDiamondList;

