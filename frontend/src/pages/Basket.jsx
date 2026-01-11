import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import SelectedDiamondsSummary from '../components/SelectedDiamondsSummary';
import AuthPopup from '../components/AuthPopup';
import { useLanguage } from '../contexts/LanguageContext';
import { useSocket } from '../contexts/SocketContext';

export default function Basket() {
  const { t } = useLanguage();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [basketItems, setBasketItems] = useState([]);
  const [basketLoading, setBasketLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [selectedDiamonds, setSelectedDiamonds] = useState([]);

  useEffect(() => {
    // Check authentication
    // Check authentication
    const userStr = localStorage.getItem('user');
    
    if (userStr) {
      setIsLoggedIn(true);
      const user = JSON.parse(userStr);
      setUserName(user.name || "User");
      fetchBasket(user.id || user._id);
    } else {
        setLoading(false);
    }
  }, []);

  // Socket listener
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (data) => {
        // Optimistic update mechanism or just refetch
        // For basket, checking if the updated diamond is IN the basket is complex without full list
        // Safest is to Refetch if we have a user
        const userStr = localStorage.getItem('user');
        if (userStr) {
             const user = JSON.parse(userStr);
             fetchBasket(user.id || user._id);
        }
    };
    socket.on('diamond:update', handleUpdate);
    return () => socket.off('diamond:update', handleUpdate);
  }, [socket]);

  const fetchBasket = async (userId) => {
    setBasketLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/diamonds/basket?userId=${userId}`, {
         credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setBasketItems(data.data);
      } else {
        console.error("Fetch basket failed:", data.message);
        setBasketItems([]);
      }
    } catch (error) {
       console.error("Fetch basket error:", error);
       setBasketItems([]);
    } finally {
       setLoading(false);
       setBasketLoading(false);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

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

  const handleRemoveFromBasket = async () => {
    if (selectedDiamonds.length === 0) {
      alert("Please select diamonds to remove");
      return;
    }

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const userId = user ? user.id || user._id : null;

    if (!userId) {
      alert("Please login to remove diamonds");
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/diamonds/basket/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ diamondIds: selectedDiamonds, userId }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`✅ Success! ${data.modifiedCount} diamond(s) removed from basket.`);
        
        // Refresh the basket
        fetchBasket(userId);
        
        // Clear selection
        setSelectedDiamonds([]);
      } else {
        alert(`❌ Failed to remove diamonds: ${data.message}`);
        console.error('Remove failed:', data.message);
      }
    } catch (error) {
      alert(`❌ Error removing diamonds. Please try again.`);
      console.error('Remove error:', error);
    }
  };

  const handleConfirmOrder = () => {
     if (selectedDiamonds.length === 0) {
       alert("Please select diamonds to confirm order");
       return;
     }
     alert(`Order confirmed for ${selectedDiamonds.length} diamonds. This feature will be implemented soon!`);
  };

  const sortedResults = [...basketItems].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
    
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
       const valA = indexA === -1 ? 999 : indexA;
       const valB = indexB === -1 ? 999 : indexB;
       
       if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
       if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
       return 0;
    }

    if (sortConfig.key === 'Measurement') {
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

  const handleHoldDiamonds = async () => {
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
        alert(`✅ Success! ${data.modifiedCount} diamond(s) moved to Hold.`);
        fetchBasket(userId); // Refresh basket
        setSelectedDiamonds([]);
      } else {
        alert(`❌ Failed to hold: ${data.message}`);
      }
    } catch (error) {
      alert(`❌ Error connecting to server.`);
    }
  };

  const handleUnholdDiamonds = async () => {
    if (selectedDiamonds.length === 0) return;

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const userId = user ? user.id || user._id : null;

    if (!userId) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/diamonds/unhold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ diamondIds: selectedDiamonds, userId }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`✅ Success! ${data.modifiedCount} diamond(s) released from hold.`);
        fetchBasket(userId); // Refresh basket
        setSelectedDiamonds([]);
      } else {
        alert(`❌ Failed to release: ${data.message}`);
      }
    } catch (error) {
      alert(`❌ Error connecting to server.`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans">
      {!isLoggedIn && <AuthPopup />}
      
      <div className={`transition-all duration-500 h-screen flex flex-col overflow-hidden ${!isLoggedIn ? 'filter blur-sm pointer-events-none select-none' : ''}`}>
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
                
                {loading ? (
                   <div className="h-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
                   </div>
                ) : (
                <div className="flex flex-1 overflow-hidden animate-fade-in">
                  <div className="flex-1 overflow-y-auto p-1">
                    <div className="flex justify-between items-end mb-6 p-4">
                        <div className="flex flex-col gap-2">
                            <h1 className="text-2xl font-serif font-bold text-gray-900">{t('basketPage.title')} <span className="text-gray-400 font-sans text-sm font-normal ml-2">({basketItems.length} {t('basketPage.diamondsCount')})</span></h1>
                            <SelectedDiamondsSummary 
                              selectedIds={selectedDiamonds} 
                              allDiamonds={basketItems}
                              onHold={handleHoldDiamonds}
                              onUnhold={handleUnholdDiamonds}
                              onAddToBasket={handleRemoveFromBasket}
                              onConfirmOrder={handleConfirmOrder}
                              holdButtonLabel="HOLD"
                              addToBasketButtonLabel="REMOVE"
                              disableReleaseToggle={true}
                            />
                        </div>
                    </div>

                     {basketLoading ? (
                        <div className="h-[60vh] flex items-center justify-center">
                           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
                        </div>
                     ) : basketItems.length > 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mx-4">
                           <div className="overflow-x-auto">
                             <table className="w-full text-[11px] text-left leading-tight">
                               <thead className="bg-gray-50 text-gray-500 font-medium uppercase text-[10px] border-b border-gray-300 whitespace-nowrap">
                                  <tr>
                                    <th className="px-1 py-1 border-r border-gray-300 text-center">
                                      <input 
                                        type="checkbox" 
                                        className="rounded border-gray-300 text-black focus:ring-black"
                                        checked={basketItems.length > 0 && selectedDiamonds.length === basketItems.length}
                                        onChange={handleSelectAll}
                                      />
                                    </th>
                                    <th className="px-1 py-3 border-r border-gray-300">Loc</th>
                                   <th className="px-1 py-3 border-r border-gray-300">Stone ID</th>
                                   <th className="px-1 py-3 border-r border-gray-300">Report</th>
                                   <th className="px-1 py-3 border-r border-gray-300">Lab</th>
                                   <th className="px-1 py-3 border-r border-gray-300">Shape</th>
                                   <th className="px-1 py-3 border-r border-gray-300 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('Carats')}>Carat {getSortIndicator('Carats')}</th>
                                   <th className="px-1 py-3 border-r border-gray-300 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('Color')}>Color {getSortIndicator('Color')}</th>
                                   <th className="px-1 py-3 border-r border-gray-300 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('Clarity')}>Clarity {getSortIndicator('Clarity')}</th>
                                   <th className="px-1 py-3 border-r border-gray-300 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('Cut')}>Cut {getSortIndicator('Cut')}</th>
                                   <th className="px-1 py-3 border-r border-gray-300 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('Polish')}>Pol {getSortIndicator('Polish')}</th>
                                   <th className="px-1 py-3 border-r border-gray-300 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('Sym')}>Sym {getSortIndicator('Sym')}</th>
                                   <th className="px-1 py-3 border-r border-gray-300 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('Flour')}>Flor {getSortIndicator('Flour')}</th>
                                   <th className="px-1 py-3 border-r border-gray-300 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('Measurement')}>Meas {getSortIndicator('Measurement')}</th>
                                   <th className="px-1 py-3 border-r border-gray-300 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('Diameter (MM)')}>Diam {getSortIndicator('Diameter (MM)')}</th>
                                   <th className="px-1 py-3 border-r border-gray-300 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('Depth %')}>Depth {getSortIndicator('Depth %')}</th>
                                   <th className="px-1 py-3 border-r border-gray-300 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('Table %')}>Table {getSortIndicator('Table %')}</th>
                                   <th className="px-1 py-3 border-r border-gray-300">Key</th>
                                   <th className="px-1 py-3 border-r border-gray-300">BGM</th>
                                   <th className="px-1 py-3 border-r border-gray-300 text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('Amount$')}>Price {getSortIndicator('Amount$')}</th>

                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-300 whitespace-nowrap">
                                  {sortedResults.map((diamond, index) => {
                                    const isSelected = selectedDiamonds.includes(diamond._id);
                                    return (
                                    <tr key={diamond._id || index} className={`transition-colors ${isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}`}>
                                      <td className="px-1 py-2 border-r border-gray-300 text-center">
                                        <input 
                                          type="checkbox" 
                                          className="rounded border-gray-300 text-black focus:ring-black"
                                          checked={isSelected}
                                          onChange={() => handleSelectDiamond(diamond._id)}
                                        />
                                      </td>
                                      <td className="px-1 py-2 border-r border-gray-300 font-medium">{diamond.Location}</td>
                                     <td className="px-1 py-2 border-r border-gray-300">{diamond['Stone No']}</td>
                                     <td className="px-1 py-2 border-r border-gray-300">
                                       {diamond['Report No'] ? (
                                         <a 
                                           href={diamond.GIALINK || `https://www.gia.edu/report-check?reportno=${diamond['Report No']}`} 
                                           target="_blank" 
                                           rel="noopener noreferrer"
                                           className="text-blue-600 hover:text-blue-800 underline hover:no-underline font-medium"
                                         >
                                           {diamond['Report No']}
                                         </a>
                                       ) : '-'}
                                     </td>
                                     <td className="px-1 py-2 border-r border-gray-300">{diamond.Lab}</td>
                                     <td className="px-1 py-2 border-r border-gray-300">{diamond.Shape}</td>
                                     <td className="px-1 py-2 border-r border-gray-300 font-bold">{Number(diamond.Carats).toFixed(2)}</td>
                                     <td className="px-1 py-2 border-r border-gray-300">{diamond.Color}</td>
                                     <td className="px-1 py-2 border-r border-gray-300">{diamond.Clarity}</td>
                                     <td className="px-1 py-2 border-r border-gray-300">{diamond.Cut}</td>
                                     <td className="px-1 py-2 border-r border-gray-300">{diamond.Polish}</td>
                                     <td className="px-1 py-2 border-r border-gray-300">{diamond.Sym}</td>
                                     <td className="px-1 py-2 border-r border-gray-300">{diamond.Flour}</td>
                                     <td className="px-1 py-2 border-r border-gray-300">{diamond.Measurement}</td>
                                     <td className="px-1 py-2 border-r border-gray-300">{diamond['Diameter (MM)']}</td>
                                     <td className="px-1 py-2 border-r border-gray-300">{diamond['Depth %']}</td>
                                     <td className="px-1 py-2 border-r border-gray-300">{diamond['Table %']}</td>
                                     <td className="px-1 py-2 border-r border-gray-300 max-w-xs truncate" title={diamond['Key To Symbols']}>{diamond['Key To Symbols']}</td>
                                     <td className="px-1 py-2 border-r border-gray-300">{diamond.BGM}</td>
                                      <td className="px-1 py-2 border-r border-gray-300 text-right font-bold">${Number(diamond['Amount$']).toFixed(2)}</td>
                                    </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                           </div>
                        </div>
                     ) : (
                        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center h-[60vh] flex flex-col items-center justify-center mx-4">
                           <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                               🛒
                           </div>
                           <h3 className="text-xl font-bold text-gray-900 mb-2">{t('basketPage.emptyTitle')}</h3>
                           <p className="text-gray-500 max-w-md mx-auto mb-6">{t('basketPage.emptyDesc')}</p>
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
