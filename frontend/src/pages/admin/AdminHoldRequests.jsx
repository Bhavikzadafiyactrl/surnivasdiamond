import { useState, useEffect } from 'react';
import { FaLock, FaSpinner, FaGem, FaUserCircle, FaBars, FaLockOpen, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { useSocket } from '../../contexts/SocketContext';

const AdminHoldRequests = () => {
  const { socket } = useSocket(); // Socket for real-time updates
  const [heldDiamonds, setHeldDiamonds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [userName, setUserName] = useState("Admin");

  // Filter & Selection State
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("all"); // 'all', 'stone', 'holder'
  const [selectedDiamondIds, setSelectedDiamondIds] = useState([]);
  
  // View & Expansion State
  const [viewMode, setViewMode] = useState('list'); // 'grid' | 'list'
  const [expandedRows, setExpandedRows] = useState([]);

  useEffect(() => {
    // Get user info for Topbar
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserName(user.name || "Admin");
    }
    fetchHeldDiamonds();
  }, []);

  // Socket listener for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (data) => {
      console.log('Real-time update recieved:', data);
      fetchHeldDiamonds();
    };

    socket.on('diamond:update', handleUpdate);

    return () => {
      socket.off('diamond:update', handleUpdate);
    };
  }, [socket]);

  const fetchHeldDiamonds = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/diamonds/admin/held`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setHeldDiamonds(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to fetch held diamonds');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkRelease = async (idsToRelease) => {
    if (!idsToRelease || idsToRelease.length === 0) return;
    
    if (!window.confirm(`WARNING: Release ${idsToRelease.length} diamond(s)? They will become available for everyone.`)) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/diamonds/admin/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ diamondIds: idsToRelease })
      });

      const data = await response.json();
      if (data.success) {
        alert('Diamonds released successfully');
        setSelectedDiamondIds([]); // Clear selection
        fetchHeldDiamonds(); // Refresh list
      } else {
        alert(data.message || 'Failed to release diamonds');
      }
    } catch (err) {
      alert('Error releasing diamonds');
    }
  };

  const getRemainingTime = (heldAt) => {
    if (!heldAt) return 'N/A';
    const heldDate = new Date(heldAt);
    const expireDate = new Date(heldDate.getTime() + 48 * 60 * 60 * 1000);
    const now = new Date();
    const diff = expireDate - now;

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const filteredDiamonds = heldDiamonds.filter(item => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();

    if (searchField === 'stone') {
        const stoneNo = item['Stone No'] ? item['Stone No'].toLowerCase() : '';
        const reportNo = item['Report No'] ? item['Report No'].toLowerCase() : '';
        return stoneNo.includes(term) || reportNo.includes(term);
    } else if (searchField === 'holder') {
        const name = item.holderDetails?.name?.toLowerCase() || '';
        const email = item.holderDetails?.email?.toLowerCase() || '';
        const mobile = item.holderDetails?.mobile || '';
        return name.includes(term) || email.includes(term) || mobile.includes(term);
    } else {
        // all
        const stoneNo = item['Stone No'] ? item['Stone No'].toLowerCase() : '';
        const reportNo = item['Report No'] ? item['Report No'].toLowerCase() : '';
        const name = item.holderDetails?.name?.toLowerCase() || '';
        const mobile = item.holderDetails?.mobile || '';
        return stoneNo.includes(term) || reportNo.includes(term) || name.includes(term) || mobile.includes(term);
    }
  });

  const toggleSelectAll = () => {
    if (selectedDiamondIds.length === filteredDiamonds.length) {
      setSelectedDiamondIds([]);
    } else {
      setSelectedDiamondIds(filteredDiamonds.map(d => d._id));
    }
  };

  const toggleSelect = (id) => {
    if (selectedDiamondIds.includes(id)) {
      setSelectedDiamondIds(selectedDiamondIds.filter(item => item !== id));
    } else {
      setSelectedDiamondIds([...selectedDiamondIds, id]);
    }
  };

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  const toggleRowExpansion = (id) => {
    if (expandedRows.includes(id)) {
        setExpandedRows(expandedRows.filter(rid => rid !== id));
    } else {
        setExpandedRows([...expandedRows, id]);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-black font-sans">
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        toggleSidebar={toggleSidebar} 
        isMobileOpen={isMobileOpen}
        closeMobileSidebar={() => setIsMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Topbar userName={userName} onMenuClick={() => setIsMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto p-6 lg:p-10 relative">
          
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
            <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                <FaLock className="text-orange-500" />
                Manage Hold Requests
                </h1>
                <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold border border-orange-200">
                {heldDiamonds.length}
                </span>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl w-full flex gap-2">
                <select 
                    value={searchField} 
                    onChange={(e) => setSearchField(e.target.value)}
                    className="bg-white border border-gray-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-100"
                >
                    <option value="all">Check All</option>
                    <option value="stone">Stone/Report ID</option>
                    <option value="holder">Holder Name/Mobile</option>
                </select>
                <div className="relative flex-1">
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all placeholder-gray-400 text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <FaGem className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                </div>
            </div>

            <div className="flex items-center gap-3">
                {selectedDiamondIds.length > 0 && (
                  <button 
                    onClick={() => handleBulkRelease(selectedDiamondIds)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-all animate-fade-in"
                  >
                    <FaLockOpen /> Release ({selectedDiamondIds.length})
                  </button>
                )}
                
                <div className="bg-white border border-gray-200 rounded-lg p-1 flex items-center shadow-sm">
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-orange-100 text-orange-800' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        List
                    </button>
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'grid' ? 'bg-orange-100 text-orange-800' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Grid
                    </button>
                </div>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
              <p>{error}</p>
            </div>
          )}

          {loading ? (
             <div className="flex justify-center items-center h-64"><FaSpinner className="animate-spin text-4xl text-blue-500" /></div>
          ) : filteredDiamonds.length === 0 ? (
             <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
                <FaGem className="mx-auto text-4xl text-gray-200 mb-4" />
                <p className="text-gray-500">
                    {searchTerm ? `No diamonds found matching "${searchTerm}"` : "No diamonds are currently on hold."}
                </p>
             </div>
          ) : (
             <>
                 {viewMode === 'list' ? (
                     // LIST VIEW
                     <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                         <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-orange-50 border-b border-orange-100 text-gray-500 font-medium uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 w-12 text-center">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                                                checked={filteredDiamonds.length > 0 && selectedDiamondIds.length === filteredDiamonds.length}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        <th className="px-4 py-4 w-8"></th>
                                        <th className="px-6 py-4">Stone ID</th>
                                        <th className="px-6 py-4">Specs</th>
                                        <th className="px-6 py-4">Price</th>
                                        <th className="px-6 py-4">Held By</th>
                                        <th className="px-6 py-4">Expires</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredDiamonds.map((item) => (
                                        <>
                                            <tr key={item._id} className={`hover:bg-orange-50/30 transition-colors ${selectedDiamondIds.includes(item._id) ? 'bg-orange-50' : ''}`}>
                                                <td className="px-6 py-4 text-center">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                                                        checked={selectedDiamondIds.includes(item._id)}
                                                        onChange={() => toggleSelect(item._id)}
                                                    />
                                                </td>
                                                <td className="px-4 py-4 text-center cursor-pointer text-gray-400 hover:text-orange-600" onClick={() => toggleRowExpansion(item._id)}>
                                                    {expandedRows.includes(item._id) ? <FaChevronUp /> : <FaChevronDown />}
                                                </td>
                                                <td className="px-6 py-4 font-mono font-medium text-gray-700">
                                                    {item['Stone No']}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900">{item.Shape}</div>
                                                    <div className="text-xs text-gray-500">{item.Carats}ct • {item.Color} • {item.Clarity}</div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-green-600">
                                                    ${item['Amount$']}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-900">{item.holderDetails?.name}</div>
                                                    <div className="text-xs text-gray-500">{item.holderDetails?.mobile}</div>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-orange-600 font-medium">
                                                    {getRemainingTime(item.HeldAt)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleBulkRelease([item._id])}
                                                        className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50"
                                                        title="Release Hold"
                                                    >
                                                        <FaLockOpen />
                                                    </button>
                                                </td>
                                            </tr>
                                            {/* Expanded Row */}
                                            {expandedRows.includes(item._id) && (
                                                <tr className="bg-gray-50/50 shadow-inner">
                                                    <td colSpan="8" className="px-6 py-4">
                                                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                                                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 border-b border-gray-100 pb-2">Technical Specifications</h4>
                                                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                                                                <div><span className="text-gray-400 text-xs block">Lab</span> {item.Lab}</div>
                                                                <div><span className="text-gray-400 text-xs block">Cut</span> {item.Cut || '-'}</div>
                                                                <div><span className="text-gray-400 text-xs block">Polish</span> {item.Polish}</div>
                                                                <div><span className="text-gray-400 text-xs block">Symmetry</span> {item.Sym}</div>
                                                                <div><span className="text-gray-400 text-xs block">Fluorescence</span> {item.Flour}</div>
                                                                <div><span className="text-gray-400 text-xs block">Table %</span> {item['Table %']}</div>
                                                                <div><span className="text-gray-400 text-xs block">Depth %</span> {item['Depth %']}</div>
                                                                <div><span className="text-gray-400 text-xs block">Measurements</span> {item.Measurement}</div>
                                                                <div><span className="text-gray-400 text-xs block">Location</span> {item.Location}</div>
                                                                <div className="col-span-2">
                                                                    <span className="text-gray-400 text-xs block">Report No</span>
                                                                    {item['Report No']}
                                                                    {item['Report No'] && (
                                                                         <a href={item.GIALINK || `https://www.gia.edu/report-check?reportno=${item['Report No']}`} target="_blank" rel="noreferrer" className="ml-2 text-blue-500 hover:underline text-xs">View Report</a>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            
                                                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mt-4 mb-3 border-b border-gray-100 pb-2">Holder Contact Info</h4>
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                                <div><span className="text-gray-400 text-xs block">Email</span> {item.holderDetails?.email}</div>
                                                                <div><span className="text-gray-400 text-xs block">Mobile</span> {item.holderDetails?.mobile}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                         </div>
                     </div>
                 ) : (
                     // GRID VIEW
                     <div className="grid grid-cols-1 gap-4">
                       <div className="flex items-center gap-2 mb-2 px-2">
                           <input 
                                type="checkbox" 
                                id="selectAllGrid"
                                className="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                                checked={filteredDiamonds.length > 0 && selectedDiamondIds.length === filteredDiamonds.length}
                                onChange={toggleSelectAll}
                            />
                            <label htmlFor="selectAllGrid" className="text-sm font-medium text-gray-600 cursor-pointer">Select All</label>
                       </div>

                       {filteredDiamonds.map((item) => (
                         <div key={item._id} className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${selectedDiamondIds.includes(item._id) ? 'border-orange-400 ring-1 ring-orange-400' : 'border-gray-100'}`}>
                              <div className="flex flex-col xl:flex-row items-stretch relative">
                                 
                                 {/* Selection Checkbox (Absolute Positioned) */}
                                 <div className="absolute top-4 left-4 z-10">
                                    <input 
                                      type="checkbox" 
                                      className="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                                      checked={selectedDiamondIds.includes(item._id)}
                                      onChange={() => toggleSelect(item._id)}
                                    />
                                 </div>
          
                                 {/* Left: Diamond Info (Matching User's Image Style) */}
                                 <div className="p-6 pl-14 flex-1 border-b xl:border-b-0 xl:border-r border-gray-100">
                                    {/* Top Meta Row (ID, Date) */}
                                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-2 font-mono">
                                        <span className="border border-gray-200 rounded px-1.5 py-0.5">ID: {item['Stone No']}</span>
                                        <span>•</span>
                                        <span>Held: {new Date(item.HeldAt).toLocaleDateString()} {new Date(item.HeldAt).toLocaleTimeString()}</span>
                                    </div>
          
                                    {/* Main Header Row */}
                                    <div className="flex items-center justify-between mb-6">
                                       <h3 className="text-2xl font-serif font-bold text-gray-900">
                                          {item.Shape} <span className="text-gray-300 mx-2">|</span> {item.Carats} Carat
                                       </h3>
                                       <div className="text-xl font-bold text-green-600">
                                          ${item['Amount$']}
                                       </div>
                                    </div>
          
                                    {/* Detailed Specs Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-8 text-sm">
                                       <div>
                                          <div className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-1">Color</div>
                                          <div className="font-bold text-gray-900">{item.Color}</div>
                                       </div>
                                       <div>
                                          <div className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-1">Clarity</div>
                                          <div className="font-bold text-gray-900">{item.Clarity}</div>
                                       </div>
                                       <div>
                                          <div className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-1">Cut</div>
                                          <div className="font-bold text-gray-900">{item.Cut || '-'}</div>
                                       </div>
                                       <div>
                                          <div className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-1">Lab</div>
                                          <div className="font-bold text-gray-900">{item.Lab}</div>
                                       </div>
                                       
                                       <div>
                                          <div className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-1">Polish</div>
                                          <div className="font-bold text-gray-900">{item.Polish}</div>
                                       </div>
                                       {/* ... (Rest of Grid View logic kept mostly same but wrapped in map) ... */}
                                       <div>
                                           <div className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-1">Symmetry</div>
                                           <div className="font-bold text-gray-900">{item.Sym}</div>
                                       </div>
                                       <div>
                                          <div className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-1">Fluorescence</div>
                                          <div className="font-bold text-gray-900">{item.Flour}</div>
                                       </div>
                                       <div>
                                           <div className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-1">Location</div>
                                           <div className="font-bold text-gray-900">{item.Location}</div>
                                       </div>
                                    </div>
                                    
                                    {/* Report Link */}
                                    <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-2">
                                       <span className="text-gray-400 text-xs">Report No:</span>
                                       {item['Report No'] ? (
                                          <a 
                                              href={item.GIALINK || `https://www.gia.edu/report-check?reportno=${item['Report No']}`} 
                                              target="_blank" 
                                              rel="noreferrer" 
                                              className="font-mono text-sm text-blue-600 font-medium hover:underline cursor-pointer flex items-center gap-1"
                                          >
                                              {item['Report No']} <span className="text-xs">🔗</span>
                                          </a>
                                       ) : (
                                          <span className="font-mono text-sm text-gray-700">{item['Report No']}</span>
                                       )}
                                    </div>
                                 </div>
          
          
                                 {/* Right: User & Hold Info (Combined Section) */}
                                 <div className="md:w-full xl:w-80 bg-gray-50 flex flex-col">
                                     {/* User Details */}
                                     <div className="p-6 border-b border-gray-200">
                                         <div className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-3 flex items-center gap-2">
                                             <FaUserCircle className="text-base" /> Held By
                                         </div>
                                         <div>
                                              <div className="font-bold text-gray-900">{item.holderDetails?.name || 'Unknown User'}</div>
                                              <div className="text-xs text-gray-500 mt-1">{item.holderDetails?.email}</div>
                                              <div className="text-xs text-gray-500 font-mono mt-0.5">{item.holderDetails?.mobile}</div>
                                         </div>
                                     </div>
          
                                     {/* Expiration & Actions */}
                                     <div className="p-6 flex-1 flex flex-col justify-center items-center text-center bg-orange-50/50">
                                         <div className="text-xs uppercase text-orange-800 font-bold mb-2">Expires In</div>
                                         <div className="text-3xl font-mono font-bold text-orange-600 mb-6 tracking-tight">
                                              {getRemainingTime(item.HeldAt)}
                                          </div>
                                          
                                          <button
                                               onClick={() => handleBulkRelease([item._id])}
                                               className="w-full bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 text-sm font-bold px-4 py-3 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
                                          >
                                               <FaLockOpen /> Release Hold
                                          </button>
                                     </div>
                                 </div>
                              </div>
                         </div>
                       ))}
                     </div>
                 )}
             </>
          )}

        </main>
      </div>
    </div>
  );
};

export default AdminHoldRequests;
