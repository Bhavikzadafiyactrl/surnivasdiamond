import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import SelectedDiamondsSummary from '../components/SelectedDiamondsSummary';
import AuthPopup from '../components/AuthPopup';
import FilterPanel from '../components/FilterPanel';
import { useSocket } from '../contexts/SocketContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

export default function DiamondSearch() {
  const location = useLocation();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth(); // Rename to avoid conflict with local loading

  // Local state
  const [userName, setUserName] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Filter States
  const [filters, setFilters] = useState({
    search: '',
    shape: [],
    carat: { min: '', max: '' },
    color: [],
    clarity: [],
    finishing: [], 
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
  const finishings = ['3EX', '3VG+'];
  const cuts = ['EX', 'VG', 'GD', 'F'];
  const polishes = ['EX', 'VG', 'GD', 'F'];
  const symmetries = ['EX', 'VG', 'GD', 'F'];
  const fluorescences = ['NON', 'FNT', 'MED', 'STG', 'VST', 'VSL'];
  const certificates = ['GIA', 'IGI'];
  const locations = ['IND', 'HK', 'VN'];

  // Auth & Initial Logic
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/"); // Strict Redirect
      } else {
        setUserName(user.name || "User");
      }
    }
  }, [user, authLoading, navigate]);

  // URL Query Params
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const query = searchParams.get('q');
    if (query) {
       setFilters(prev => ({ ...prev, search: query }));
       setHasSearched(true); 
    }
  }, [location.search]);

  // Auto-trigger search when 'search' filter changes significantly AND from URL mount? 
  // No, let's just use effect for initial load. 
  // Wait, handleSearch reads from 'filters' state. State update is async.
  // We need to trigger search AFTER state update.
  useEffect(() => {
      const searchParams = new URLSearchParams(location.search);
      const query = searchParams.get('q');
      if (query && filters.search === query) {
          handleSearch();
      }
  }, [filters.search]); 

  // Socket listener for real-time diamond updates
  useEffect(() => {
    if (!socket) return;

    // This function handles the actual state update for searchResults
    const updateSearchResultsState = (data) => {
      setSearchResults(prev => {
        // If the updated diamond's status is 'reviewing' or 'sold', remove it from the list
        if (data.status === 'reviewing' || data.status === 'sold') {
             return prev.filter(d => d._id !== data.id);
        }

        // Find if the diamond already exists in the current results
        const exists = prev.find(d => d._id === data.id);

        if (exists) {
            // If it exists, update its properties
            return prev.map(diamond => 
                diamond._id === data.id 
                ? { 
                    ...diamond, 
                    Status: data.status || diamond.Status,
                    InBasketBy: data.inBasketBy !== undefined ? data.inBasketBy : diamond.InBasketBy,
                    HeldBy: data.heldBy !== undefined ? data.heldBy : diamond.HeldBy
                } 
                : diamond
            );
        }
        // If it doesn't exist and its status is not 'reviewing'/'sold',
        // we don't add it here. It should be handled by a refetch if it becomes 'available'
        // and was previously missing from the current search results.
        return prev; 
      });
    };
    
    // Improved Handler with access to current state via dependency
    const handleUpdateWithState = (data) => {
         const existsInCurrentResults = searchResults.find(d => d._id === data.id);
         
         // If a diamond becomes 'available' and is NOT currently in our search results,
         // it means it was previously hidden (e.g., sold, reviewing) and is now back.
         // In this case, we need to refetch the entire search results to include it
         // and ensure all filters are correctly applied.
         if (!existsInCurrentResults && data.status === 'available') {
             console.log("New available diamond detected that was not in current results, refetching...");
             handleSearch(); // Trigger a full search
             return; // Stop here, the refetch will update the state
         }
         
         // For all other updates (e.g., status change for an existing diamond,
         // or a diamond becoming 'reviewing'/'sold'), update the state directly.
         updateSearchResultsState(data);
    }

    socket.on('diamond:update', handleUpdateWithState);
    return () => socket.off('diamond:update', handleUpdateWithState);
  }, [socket, searchResults, filters]); // Add searchResults/filters dependencies

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleFilterChange = (category, value) => {
    setFilters(prev => {
      let nextFilters = { ...prev };
      const current = prev[category];

      // Handle main toggle logic first
      if (Array.isArray(current)) {
        if (category === 'shape') {
          // Single select for Shape: If clicking same, deselect; otherwise replace with new value
          nextFilters[category] = current.includes(value) ? [] : [value];
        } else {
          // Multi select for others
          nextFilters[category] = current.includes(value) 
            ? current.filter(item => item !== value)
            : [...current, value];
        }
      } else {
        nextFilters[category] = value;
      }

      // 1. Logic for "3EX" selection
      // "when user select 3EX in finishing then all three EXshoud be selected autot maticaly"
      if (category === 'finishing' && value === '3EX') {
        // Check if we just turned ON 3EX
        if (!prev.finishing.includes('3EX')) { // It wasn't there, so we added it
           
           // Check if shapes are selected and "ROUND" is NOT among them (i.e. only fancy shapes)
           // "if client click on any shape rather than round ... cut shoud not be selcted"
           const isFancyShapeOnly = nextFilters.shape.length > 0 && !nextFilters.shape.includes('ROUND');

           if (!isFancyShapeOnly) {
              // Standard behavior (Round included or All shapes): Select Cut EX
              if (!nextFilters.cut.includes('EX')) nextFilters.cut = [...nextFilters.cut, 'EX'];
           } else {
              // Fancy shape only: Ensure Cut is NOT selected (optional, per user "cut shoud not be selcted")
              // Or just don't add it. User said "any cut can not be selected" implying we might want to clear it?
              // The request says "cut shoud not be selcted". I will effectively NOT add it.
              // If it was already selected, should I remove it? "any cut can not be selected" suggests yes.
              nextFilters.cut = []; 
           }

           // Always select Polish and Sym for 3EX
           if (!nextFilters.polish.includes('EX')) nextFilters.polish = [...nextFilters.polish, 'EX'];
           if (!nextFilters.symmetry.includes('EX')) nextFilters.symmetry = [...nextFilters.symmetry, 'EX'];
        }
      }

      // 2. Logic for "VG" selection in Cut/Polish/Sym
      // "then user will select any VG then 3VG+ shoud be automaticaly auto select and 3EX will not selected"
      if (['cut', 'polish', 'symmetry'].includes(category) && value === 'VG') {
         // Check if we just turned ON 'VG'
         if (!prev[category].includes('VG')) {
            // Uncheck 3EX
            if (nextFilters.finishing.includes('3EX')) {
              nextFilters.finishing = nextFilters.finishing.filter(f => f !== '3EX');
            }
            // Check 3VG+
            if (!nextFilters.finishing.includes('3VG+')) {
              nextFilters.finishing = [...nextFilters.finishing, '3VG+'];
            }
         }
      }
      
      // 3. Logic: Re-evaluate Filters when SHAPE changes
      if (category === 'shape') {
          const isFancyShapeOnly = nextFilters.shape.length > 0 && !nextFilters.shape.includes('ROUND');
          
          if (isFancyShapeOnly) {
              // Fancy Shape Selected -> ALWAYS Clear Cut Filter
              // (Because Cut is not applicable/selectable for Fancy shapes in this UI)
              nextFilters.cut = [];
              
              // If 3EX is on, we still keep Polish/Sym as EX (logic below handles that)
          } else {
              // Round (or All) Selected
              // If 3EX is active, ensure Cut is EX
              if (nextFilters.finishing.includes('3EX')) {
                  if (!nextFilters.cut.includes('EX')) nextFilters.cut = [...nextFilters.cut, 'EX'];
              }
          }

          // Ensure Polish/Sym are enforced if 3EX is on (regardless of shape)
          if (nextFilters.finishing.includes('3EX')) {
              if (!nextFilters.polish.includes('EX')) nextFilters.polish = [...nextFilters.polish, 'EX'];
              if (!nextFilters.symmetry.includes('EX')) nextFilters.symmetry = [...nextFilters.symmetry, 'EX'];
          }
      }
      
      return nextFilters;
    });
  };

  const handleSearch = async () => {
    setHasSearched(true);
    setSearchLoading(true);
    try {
      // Get current user ID
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const userId = user ? (user.id || user._id) : null;

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/diamonds/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...filters, userId }) // Include userId in request
      });
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.data);
      } else {
        console.error("Search failed:", data.message);
        setSearchResults([]);
      }
    } catch (error) {
       console.error("Search error:", error);
       setSearchResults([]);
    } finally {
       setSearchLoading(false);
    }
  };

  // --- Sorting Logic ---
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // --- Selection Logic ---
  const [selectedDiamonds, setSelectedDiamonds] = useState([]);

  const handleSelectDiamond = (id) => {
    setSelectedDiamonds(prev => 
      prev.includes(id) ? prev.filter(dId => dId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedDiamonds.length === sortedResults.length) {
      setSelectedDiamonds([]);
    } else {
      setSelectedDiamonds(sortedResults.map(d => d._id));
    }
  };

  const handleHold = async () => {
    if (selectedDiamonds.length === 0) return;

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const userId = user ? user.id || user._id : null; 

    if (!userId) {
       alert("Please login to hold diamonds");
       return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/diamonds/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ diamondIds: selectedDiamonds, userId }),
      });

      const data = await response.json();
      if (data.success) {
        // Success
        console.log(`Success! ${data.modifiedCount} diamond(s) have been placed on hold.`);
        
        // Refresh results to show updated status (held diamonds will appear red)
        await handleSearch();
        
        // Clear selection after successful hold
        setSelectedDiamonds([]);
      } else {
        alert(`❌ Failed to hold diamonds: ${data.message}`);
        console.error('Hold failed:', data.message);
      }
    } catch (error) {
      alert(`❌ Error holding diamonds. Please try again.`);
      console.error('Hold error:', error);
    }
  };

  const handleUnhold = async () => {
    if (selectedDiamonds.length === 0) return;

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const userId = user ? user.id || user._id : null; 

    if (!userId) {
       alert("Please login to unhold diamonds");
       return;
    }

    // if (!window.confirm("Are you sure you want to release these diamonds?")) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/diamonds/unhold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ diamondIds: selectedDiamonds, userId }),
      });

      const data = await response.json();
      if (data.success) {
        console.log(`Success! ${data.modifiedCount} diamond(s) have been released.`);
        
        // Refresh results
        await handleSearch();
        
        // Clear selection
        setSelectedDiamonds([]);
      } else {
        alert(`❌ Failed to release diamonds: ${data.message}`);
      }
    } catch (error) {
      alert(`❌ Error releasing diamonds. Please try again.`);
      console.error('Unhold error:', error);
    }
  };

  const handleAddToBasket = async () => {
    if (selectedDiamonds.length === 0) {
      alert("Please select diamonds to add to basket");
      return;
    }

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const userId = user ? user.id || user._id : null;

    if (!userId) {
      alert("Please login to add diamonds to basket");
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/diamonds/basket/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ diamondIds: selectedDiamonds, userId }),
      });

      const data = await response.json();
      if (data.success) {
        console.log(`Success! ${data.modifiedCount} diamond(s) added to your basket.`);
        
        // Refresh results to show status
        await handleSearch();

        // Clear selection
        setSelectedDiamonds([]);
      } else {
        alert(`❌ Failed to add diamonds to basket: ${data.message}`);
        console.error('Add to basket failed:', data.message);
      }
    } catch (error) {
      alert(`❌ Error adding diamonds to basket. Please try again.`);
      console.error('Add to basket error:', error);
    }
  };

  const handleConfirmOrder = () => {
     alert(`Order confirmed for ${selectedDiamonds.length} diamonds`);
  };

  const sortedResults = [...searchResults].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
    
    // Custom sort orders
    const gradeOrders = {
       'Clarity': ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1', 'I2', 'I3'],
       'Color': ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
       'Cut': ['3EX', 'EX', 'VG', 'GD', 'F'],
       'Polish': ['EX', 'VG', 'GD', 'F'],
       'Sym': ['EX', 'VG', 'GD', 'F'],
       'Flour': ['NON', 'FNT', 'MED', 'STG', 'VST'],
       'Lab': ['GIA', 'IGI']
    };

    if (gradeOrders[sortConfig.key]) {
       const order = gradeOrders[sortConfig.key];
       const indexA = order.indexOf(aValue);
       const indexB = order.indexOf(bValue);
       // Handle cases where value might not be in the list (put at end)
       const valA = indexA === -1 ? 999 : indexA;
       const valB = indexB === -1 ? 999 : indexB;
       
       if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
       if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
       return 0;
    }

    // Special parsing for numeric values stored as strings or specific fields
    if (sortConfig.key === 'Measurement') {
       // Parse "L - W * D" to get L
       const parseL = (str) => {
          if (!str) return 0;
          const parts = str.split(/[x\-\*]/);
          return parseFloat(parts[0]) || 0;
       }
       aValue = parseL(aValue);
       bValue = parseL(bValue);
    } else if (sortConfig.key === 'Diameter (MM)') {
       aValue = parseFloat(aValue) || 0;
       bValue = parseFloat(bValue) || 0;
    } else {
       // For Amount$, Carats, Depth %, Table % which are numbers or sortable strings
       // Ensure numbers are treated as numbers
       if (typeof aValue === 'string') aValue = parseFloat(aValue);
       if (typeof bValue === 'string') bValue = parseFloat(bValue);
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  // Removed loading check - auth is now handled via redirect in useEffect

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans">
      {!user && <AuthPopup />}
      
      <div className={`transition-all duration-500 h-screen flex flex-col overflow-hidden ${!user ? 'filter blur-sm pointer-events-none select-none' : ''}`}>
        <div className="flex h-full">
          
          <Sidebar 
            isCollapsed={isSidebarCollapsed} 
            toggleSidebar={toggleSidebar} 
            isMobileOpen={isMobileOpen}
            closeMobileSidebar={() => setIsMobileOpen(false)}
          />

          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <Topbar userName={userName} onMenuClick={() => setIsMobileOpen(true)} />

            <main className="flex-1 flex flex-col overflow-hidden bg-gray-50 relative">
              
              {!hasSearched ? (
                /* INITIAL FULL PAGE VIEW */
                <div className="flex-1 overflow-y-auto p-0 flex flex-col h-full bg-white">
                   <div className="flex-1 animate-fade-in-up h-full">
                      <FilterPanel 
                        isFullPage={true} 
                        filters={filters} 
                        handleFilterChange={handleFilterChange} 
                        handleSearch={handleSearch} 
                        setFilters={setFilters} 
                        shapes={shapes} 
                        colors={colors} 
                        clarities={clarities} 
                        finishings={finishings}
                        cuts={cuts} 
                        polishes={polishes}
                        symmetries={symmetries}
                        fluorescences={fluorescences}
                        certificates={certificates}
                        locations={locations}
                      />
                   </div>
                </div>
              ) : (
                /* RESULTS VIEW WITH SIDEBAR */
                <div className="flex flex-col flex-1 overflow-hidden animate-fade-in">


                  {/* SEARCH RESULTS AREA */}
                  <div className="flex-1 flex flex-col overflow-hidden p-1">
                    <div className="mb-4 space-y-4 flex-shrink-0">
                        {/* Header Row */}
                        <div className="flex justify-between items-center border-b border-gray-100 pb-4 mt-2">
                             <div className="flex items-center gap-4">
                                <h1 className="text-2xl font-serif font-bold text-gray-900">{t('diamondSearch.results.title')}</h1>
                                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium border border-gray-200">
                                    {searchResults.length} {t('diamondSearch.results.diamonds')}
                                </span>
                             </div>
                             
                             <button 
                               onClick={() => setHasSearched(false)} 
                               className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm flex items-center gap-2"
                             >
                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                                 {t('diamondSearch.buttons.filter')}
                             </button>
                        </div>

                        {/* Summary Row */}
                        <div>
                             <SelectedDiamondsSummary 
                               selectedIds={selectedDiamonds} 
                               allDiamonds={searchResults} 
                               onHold={handleHold}
                               onUnhold={handleUnhold}
                               onAddToBasket={handleAddToBasket}
                               onConfirmOrder={handleConfirmOrder}
                             />
                        </div>
                    </div>

                     {searchLoading ? (
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex-1 flex flex-col min-h-0">
                           <div className="overflow-auto flex-1">
                             <table className="w-full text-xs text-left">
                               <thead className="bg-gray-50 border-b border-gray-200 whitespace-nowrap">
                                 <tr>
                                   {[...Array(20)].map((_, i) => (
                                     <th key={i} className="px-3 py-3 border-r border-gray-100 last:border-0">
                                       <div className="h-4 bg-gray-200 rounded animate-pulse w-16 mx-auto"></div>
                                     </th>
                                   ))}
                                 </tr>
                               </thead>
                               <tbody>
                                 {[...Array(15)].map((_, i) => (
                                   <tr key={i} className="border-b border-gray-50 last:border-0">
                                     {[...Array(20)].map((_, j) => (
                                       <td key={j} className="px-3 py-3 border-r border-gray-50 last:border-0">
                                         <div className="h-3 bg-gray-100 rounded animate-pulse w-full"></div>
                                       </td>
                                     ))}
                                   </tr>
                                 ))}
                               </tbody>
                             </table>
                           </div>
                        </div>
                     ) : searchResults.length > 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex-1 flex flex-col min-h-0">
                           <div className="overflow-auto flex-1">
                             <table className="w-full text-xs text-left leading-tight relative border-collapse">
                               <thead className="bg-[#f8f9fa] text-gray-600 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200 whitespace-nowrap sticky top-0 z-10 shadow-sm">
                                  <tr>
                                    <th className="px-2 py-3 border-r border-gray-200 text-center bg-[#f8f9fa] w-8">
                                      <input 
                                        type="checkbox" 
                                        className="rounded border-gray-300 text-black focus:ring-black w-3.5 h-3.5"
                                        checked={searchResults.length > 0 && selectedDiamonds.length === searchResults.length}
                                        onChange={handleSelectAll}
                                      />
                                    </th>
                                    <th className="px-2 py-3 border-r border-gray-200 bg-[#f8f9fa]">Status</th>
                                    <th className="px-2 py-3 border-r border-gray-200 bg-[#f8f9fa]">Loc</th>
                                   <th className="px-2 py-3 border-r border-gray-200 bg-[#f8f9fa]">Stone ID</th>
                                   <th className="px-2 py-3 border-r border-gray-200 bg-[#f8f9fa]">Report</th>
                                   <th className="px-2 py-3 border-r border-gray-200 bg-[#f8f9fa]">Video</th>
                                   <th className="px-2 py-3 border-r border-gray-200 bg-[#f8f9fa]">Lab</th>
                                   <th className="px-2 py-3 border-r border-gray-200 bg-[#f8f9fa]">Shape</th>
                                   <th className="px-2 py-3 border-r border-gray-200 cursor-pointer hover:bg-gray-100 bg-[#f8f9fa]" onClick={() => handleSort('Carats')}>Carat {getSortIndicator('Carats')}</th>
                                   <th className="px-2 py-3 border-r border-gray-200 cursor-pointer hover:bg-gray-100 bg-[#f8f9fa]" onClick={() => handleSort('Color')}>Color {getSortIndicator('Color')}</th>
                                   <th className="px-2 py-3 border-r border-gray-200 cursor-pointer hover:bg-gray-100 bg-[#f8f9fa]" onClick={() => handleSort('Clarity')}>Clarity {getSortIndicator('Clarity')}</th>
                                   <th className="px-2 py-3 border-r border-gray-200 cursor-pointer hover:bg-gray-100 bg-[#f8f9fa]" onClick={() => handleSort('Cut')}>Cut {getSortIndicator('Cut')}</th>
                                   <th className="px-2 py-3 border-r border-gray-200 cursor-pointer hover:bg-gray-100 bg-[#f8f9fa]" onClick={() => handleSort('Polish')}>Pol {getSortIndicator('Polish')}</th>
                                   <th className="px-2 py-3 border-r border-gray-200 cursor-pointer hover:bg-gray-100 bg-[#f8f9fa]" onClick={() => handleSort('Sym')}>Sym {getSortIndicator('Sym')}</th>
                                   <th className="px-2 py-3 border-r border-gray-200 cursor-pointer hover:bg-gray-100 bg-[#f8f9fa]" onClick={() => handleSort('Flour')}>Flor {getSortIndicator('Flour')}</th>
                                   <th className="px-2 py-3 border-r border-gray-200 cursor-pointer hover:bg-gray-100 bg-[#f8f9fa]" onClick={() => handleSort('Measurement')}>Meas {getSortIndicator('Measurement')}</th>
                                   <th className="px-2 py-3 border-r border-gray-200 cursor-pointer hover:bg-gray-100 bg-[#f8f9fa]" onClick={() => handleSort('Diameter (MM)')}>Diam {getSortIndicator('Diameter (MM)')}</th>
                                   <th className="px-2 py-3 border-r border-gray-200 cursor-pointer hover:bg-gray-100 bg-[#f8f9fa]" onClick={() => handleSort('Depth %')}>Depth {getSortIndicator('Depth %')}</th>
                                   <th className="px-2 py-3 border-r border-gray-200 cursor-pointer hover:bg-gray-100 bg-[#f8f9fa]" onClick={() => handleSort('Table %')}>Table {getSortIndicator('Table %')}</th>
                                   <th className="px-2 py-3 border-r border-gray-200 bg-[#f8f9fa]">Key</th>
                                   <th className="px-2 py-3 border-r border-gray-200 bg-[#f8f9fa]">BGM</th>
                                   <th className="px-2 py-3 border-gray-200 text-right cursor-pointer hover:bg-gray-100 bg-[#f8f9fa]" onClick={() => handleSort('Amount$')}>Price {getSortIndicator('Amount$')}</th>

                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 whitespace-nowrap bg-white">
                                  {sortedResults.map((diamond, index) => {
                                    const isSelected = selectedDiamonds.includes(diamond._id);
                                    const isHeld = diamond.Status === 'hold';
                                    const isInMyBasket = diamond.isInMyBasket; // From backend
                                    
                                    return (
                                    <tr key={diamond._id || index} className={`group hover:bg-blue-50 transition-colors duration-150 ${isSelected ? 'bg-blue-50' : ''} ${isHeld ? 'bg-red-50 hover:bg-red-100' : ''}`}>
                                       <td className="px-2 py-2 border-r border-gray-100 text-center">
                                         {!isInMyBasket ? (
                                           <input 
                                             type="checkbox" 
                                             className="rounded border-gray-300 text-black focus:ring-black w-3.5 h-3.5 cursor-pointer"
                                             checked={isSelected}
                                             onChange={() => handleSelectDiamond(diamond._id)}
                                           />
                                         ) : (
                                           <span className="text-gray-400 text-xs">🔒</span>
                                         )}
                                        </td>
                                       <td className="px-2 py-2 border-r border-gray-100 text-center">
                                         {isHeld && (
                                           <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-600 text-[9px] font-bold rounded border border-red-200">HOLD</span>
                                         )}
                                         {isInMyBasket && (
                                           <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[9px] font-bold rounded border border-blue-200 ml-1">BASKET</span>
                                         )}
                                         {!isHeld && !isInMyBasket && (
                                             <span className="inline-block w-2 h-2 rounded-full bg-green-400"></span>
                                         )}
                                       </td>
                                      <td className="px-2 py-2 border-r border-gray-100 font-medium text-gray-700">{diamond.Location}</td>
                                     <td className="px-2 py-2 border-r border-gray-100 font-medium">{diamond['Stone No']}</td>
                                     <td className="px-2 py-2 border-r border-gray-100">
                                       {diamond['Report No'] ? (
                                         <a 
                                           href={diamond.GIALINK || `https://www.gia.edu/report-check?reportno=${diamond['Report No']}`} 
                                           target="_blank" 
                                           rel="noopener noreferrer"
                                           className="text-blue-600 hover:text-blue-800 underline hover:no-underline font-medium"
                                           title="View Certificate"
                                           onClick={(e) => e.stopPropagation()}
                                         >
                                           {diamond['Report No']}
                                         </a>
                                       ) : (
                                         <span className="text-gray-500">-</span>
                                       )}
                                     </td>
                                       <td className="px-2 py-2 border-r border-gray-100 text-center">
                                         {diamond.videoLink ? (
                                           <a 
                                             href={diamond.videoLink.match(/^https?:\/\//) ? diamond.videoLink : `https://${diamond.videoLink}`}
                                             target="_blank" 
                                             rel="noopener noreferrer"
                                             className="text-blue-600 hover:text-blue-800 underline hover:no-underline font-medium"
                                             onClick={(e) => e.stopPropagation()}
                                           >
                                             Link
                                           </a>
                                         ) : (
                                           <span className="text-gray-500">-</span>
                                         )}
                                       </td>
                                     <td className="px-2 py-2 border-r border-gray-100 text-gray-600">{diamond.Lab}</td>
                                     <td className="px-2 py-2 border-r border-gray-100 font-semibold text-gray-800">{diamond.Shape}</td>
                                     <td className="px-2 py-2 border-r border-gray-100 font-bold text-gray-900">{Number(diamond.Carats).toFixed(2)}</td>
                                     <td className="px-2 py-2 border-r border-gray-100 font-medium">{diamond.Color}</td>
                                     <td className="px-2 py-2 border-r border-gray-100 text-gray-600">{diamond.Clarity}</td>
                                     <td className="px-2 py-2 border-r border-gray-100">{diamond.Cut}</td>
                                     <td className="px-2 py-2 border-r border-gray-100">{diamond.Polish}</td>
                                     <td className="px-2 py-2 border-r border-gray-100">{diamond.Sym}</td>
                                     <td className="px-2 py-2 border-r border-gray-100">{diamond.Flour}</td>
                                     <td className="px-2 py-2 border-r border-gray-100 text-gray-500 text-[10px]">{diamond.Measurement}</td>
                                     <td className="px-2 py-2 border-r border-gray-100">{diamond['Diameter (MM)']}</td>
                                     <td className="px-2 py-2 border-r border-gray-100">{diamond['Depth %']}</td>
                                     <td className="px-2 py-2 border-r border-gray-100">{diamond['Table %']}</td>
                                     <td className="px-2 py-2 border-r border-gray-100 max-w-xs truncate text-xs text-gray-500" title={diamond['Key To Symbols']}>{diamond['Key To Symbols']}</td>
                                     <td className="px-2 py-2 border-r border-gray-100">{diamond.BGM}</td>
                                      <td className="px-2 py-2 text-right font-bold text-green-600 tracking-wide">${Number(diamond['Amount$']).toFixed(2)}</td>
                                    </tr>
                                    );
                                  })}
                               </tbody>
                             </table>
                           </div>
                        </div>
                     ) : (
                        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center h-[60vh] flex flex-col items-center justify-center">
                           <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl animate-bounce">
                               💎
                           </div>
                           <h3 className="text-xl font-bold text-gray-900 mb-2">No Diamonds Found</h3>
                           <p className="text-gray-500 max-w-md mx-auto mb-6">We couldn't find any diamonds matching your specific criteria. Try relaxing your filters.</p>
                           <button 
                             onClick={() => setFilters({ shape: [], carat: { min: '', max: '' }, color: [], clarity: [], finishing: [], cut: [], polish: [], symmetry: [], fluorescence: [], certificate: [], location: [], length: { min: '', max: '' }, width: { min: '', max: '' }, diameter: '', price: { min: '', max: '' } })}
                             className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-md"
                           >
                             Clear All Filters
                           </button>
                        </div>
                     )}
                  </div>
                </div>
              )}

            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
