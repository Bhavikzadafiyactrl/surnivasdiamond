import { useState, useEffect } from 'react';
import { FaCheckCircle, FaSpinner, FaGem, FaBars, FaTimesCircle, FaThList, FaThLarge } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useLanguage } from '../contexts/LanguageContext';

import { useSocket } from '../contexts/SocketContext';

const Confirmation = () => {
  const { t } = useLanguage();
  const { socket } = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [userName, setUserName] = useState("Guest");
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState('list'); // 'grid' or 'list'

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Date Filter State (Default: Empty - Show All)
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserName(user.name || "User");
      fetchOrders(user._id || user.id);
    } else {
        setLoading(false);
    }
  }, []);

  // Listen for real-time order updates
  useEffect(() => {
      if (!socket) return;

      const handleOrderUpdate = (data) => {
          setOrders(prevOrders => {
              return prevOrders.map(order => {
                  // Check if this order is targeted (handle both Object ID and String)
                  const isTargeted = data.orderIds && (
                      data.orderIds.includes(order._id) || 
                      data.orderIds.includes(order._id.toString())
                  );

                  if (isTargeted) {
                       const updatedOrder = { ...order };
                       
                       // Apply Status Update
                       if (data.status) {
                           updatedOrder.status = data.status;
                       }

                       // Apply Payment Update
                       if (data.paymentStatus) {
                           updatedOrder.paymentStatus = data.paymentStatus;
                           updatedOrder.paidAmount = data.paidAmount;
                           updatedOrder.discount = data.discount;
                       }
                       
                       return updatedOrder;
                  }
                  
                  return order;
              });
          });
      };

      socket.on('order:updated', handleOrderUpdate);

      return () => {
          socket.off('order:updated', handleOrderUpdate);
      };
  }, [socket]);

  const fetchOrders = async (userId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/diamonds/orders?userId=${userId}`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  // Filter Logic
  // Filter Logic
  // 1. Get orders for current tab
  const tabOrders = orders.filter(order => {
      const isPaid = order.paymentStatus === 'paid';
      const isRejected = order.status === 'rejected';

      if (activeTab === 'active') {
          return !isPaid && !isRejected;
      }
      if (activeTab === 'rejected') {
          return isRejected;
      }
      if (activeTab === 'history') {
          return isPaid && !isRejected;
      }
      return true;
  });

  // 2. Apply Search Filter
  const filteredOrders = tabOrders.filter(order => {
      const term = searchTerm ? searchTerm.toLowerCase() : '';
      const diamond = order.diamondId || {};
      const stoneNo = diamond['Stone No'] ? diamond['Stone No'].toLowerCase() : '';
      const reportNo = diamond['Report No'] ? diamond['Report No'].toString().toLowerCase() : '';
      const shape = diamond.Shape ? diamond.Shape.toLowerCase() : '';
      const color = diamond.Color ? diamond.Color.toLowerCase() : '';
      const clarity = diamond.Clarity ? diamond.Clarity.toLowerCase() : '';
      const orderId = order._id.toLowerCase();
      
      const matchesSearch = !searchTerm ? true : (
             stoneNo.includes(term) || 
             reportNo.includes(term) ||
             shape.includes(term) || 
             color.includes(term) || 
             clarity.includes(term) || 
             orderId.includes(term)
      );

      if (!matchesSearch) return false;

      // 4. Date range filter
      let dateMatch = true;
      if (startDate || endDate) {
          const orderDate = new Date(order.createdAt);
          if (startDate && new Date(startDate) > orderDate) {
              dateMatch = false;
          }
          if (endDate) {
              const end = new Date(endDate);
              end.setHours(23, 59, 59, 999); // Include the entire end date
              if (end < orderDate) {
                  dateMatch = false;
              }
          }
      }
      return dateMatch;
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab, startDate, endDate]);

  // Pagination Calculation
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  // Select Logic
  const handleSelect = (orderId) => {
    setSelectedIds(prev => {
        if (prev.includes(orderId)) {
            return prev.filter(id => id !== orderId);
        } else {
            return [...prev, orderId];
        }
    });
  };

  const handleSelectAll = (e) => {
      if (e.target.checked) {
          // Select all visible
          const visibleIds = filteredOrders.map(o => o._id);
          setSelectedIds(prev => [...new Set([...prev, ...visibleIds])]);
      } else {
          // Deselect visible items only
          const visibleIds = filteredOrders.map(o => o._id);
          setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
      }
  };

  const isAllVisibleSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedIds.includes(o._id));

  // Summary Calculation
  const summary = orders
    .filter(order => selectedIds.includes(order._id))
    .reduce((acc, order) => {
        const diamond = order.diamondId;
        if (!diamond) return acc;
        
        const total = order.totalAmount || parseFloat(diamond['Amount$']) || 0;
        const paid = order.paidAmount || 0;
        const discount = order.discount || 0;
        const due = Math.max(0, total - paid - discount); // Prevent negative due

        return {
            count: acc.count + 1,
            carats: acc.carats + (parseFloat(diamond.Carats) || 0),
            price: acc.price + total,
            due: acc.due + (order.status === 'confirmed' && order.paymentStatus !== 'paid' ? due : 0)
        };
    }, { count: 0, carats: 0, price: 0, due: 0 });

  // Cancel Logic (New)
  const areSelectedPending = selectedIds.length > 0 && selectedIds.every(id => {
      const order = orders.find(o => o._id === id);
      return order && order.status === 'pending';
  });

  const handleCancelOrders = async () => {
      if (!window.confirm(`Are you sure you want to cancel ${selectedIds.length} order(s)?`)) return;

      try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/diamonds/order/cancel`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              credentials: 'include',
              body: JSON.stringify({ orderIds: selectedIds })
          });

          const data = await response.json();

          if (data.success) {
              // Remove cancelled orders from display
              setOrders(orders.filter(o => !selectedIds.includes(o._id)));
              setSelectedIds([]);
              alert('Orders cancelled successfully');
          } else {
              setError(data.message || 'Failed to cancel orders');
          }
      } catch (err) {
          setError('Failed to cancel orders');
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

        {/* Fixed Header Section */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 z-10 shadow-sm shrink-0">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FaCheckCircle className="text-green-500" />
              {t('confirmation.title')}
            </h1>

            {/* Cancel Button */}
             {areSelectedPending && (
                <button 
                    onClick={handleCancelOrders}
                    className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:text-red-700 px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 animate-fade-in md:ml-auto"
                >
                    <FaTimesCircle /> {t('confirmation.cancelSelected')}
                </button>
             )}

            {/* Selection Summary Panel (Always Visible) */}
            <div className="bg-blue-50/50 border border-blue-100 shadow-sm rounded-lg px-6 py-2 flex items-center gap-6 md:gap-8 animate-fade-in w-full md:w-auto justify-between md:justify-start">
                <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{t('confirmation.summary.selected')}</span>
                    <span className="font-bold text-lg text-blue-600">{summary.count}</span>
                </div>
                <div className="w-px h-8 bg-gray-200"></div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{t('confirmation.summary.totalCarats')}</span>
                    <span className="font-bold text-lg">{summary.carats.toFixed(2)}</span>
                </div>
                <div className="w-px h-8 bg-gray-200"></div>
                 <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{t('confirmation.summary.totalValue')}</span>
                    <span className="font-bold text-lg text-gray-700">${summary.price.toFixed(2)}</span>
                </div>
                <div className="w-px h-8 bg-gray-200"></div>
                 <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider text-red-600">{t('confirmation.summary.totalDue')}</span>
                    <span className="font-bold text-lg text-red-600">${summary.due.toFixed(2)}</span>
                </div>
            </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 relative bg-gray-50">

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
              <p>{error}</p>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-6 border-b border-gray-200 mb-6">
              <button 
                  onClick={() => setActiveTab('active')}
                  className={`pb-3 px-2 text-sm font-bold transition-all relative ${
                      activeTab === 'active' 
                      ? 'text-blue-600' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                  {t('confirmation.tabs.active')} 
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                      {orders.filter(o => o.paymentStatus !== 'paid' && o.status !== 'rejected').length}
                  </span>
                  {activeTab === 'active' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
              </button>
              
              <button 
                  onClick={() => setActiveTab('rejected')}
                  className={`pb-3 px-2 text-sm font-bold transition-all relative ${
                      activeTab === 'rejected' 
                      ? 'text-red-600' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                  {t('confirmation.tabs.rejected')}
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                      {orders.filter(o => o.status === 'rejected').length}
                  </span>
                  {activeTab === 'rejected' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-t-full"></div>}
              </button>

              <button 
                  onClick={() => setActiveTab('history')}
                  className={`pb-3 px-2 text-sm font-bold transition-all relative ${
                      activeTab === 'history' 
                      ? 'text-green-600' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                  {t('confirmation.tabs.history')}
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'history' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {orders.filter(o => o.paymentStatus === 'paid' && o.status !== 'rejected').length}
                  </span>
                  {activeTab === 'history' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-green-600 rounded-t-full"></div>}
              </button>
          </div>

          {loading ? (
             <div className="flex justify-center items-center h-64"><FaSpinner className="animate-spin text-4xl text-blue-500" /></div>
          ) : tabOrders.length === 0 ? (
             <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
                <FaGem className="mx-auto text-4xl text-gray-200 mb-4" />
                <p className="text-gray-500">No orders found in {activeTab === 'active' ? 'Active' : 'History'}.</p>
             </div>
          ) : (
             <div className="flex flex-col gap-4">
                 
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                   {/* Search & Date Controls */}
                    <div className="flex flex-col md:flex-row gap-3 order-2 md:order-2 md:ml-auto w-full md:w-auto">
                        {/* Date Inputs */}
                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1">
                            <input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="text-sm bg-transparent outline-none text-gray-600 focus:text-black w-32"
                            />
                            <span className="text-gray-400">-</span>
                            <input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="text-sm bg-transparent outline-none text-gray-600 focus:text-black w-32"
                            />
                        </div>

                        {/* Search Bar */}
                        <div className="relative w-full md:w-64">
                            <input 
                              type="text" 
                              placeholder={t('confirmation.searchPlaceholder')}
                              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <FaGem className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                        </div>
                    </div>

                   {/* Toggle View & Select All */}
                   <div className="flex items-center gap-4 order-1 md:order-1">
                      {/* View Mode Toggle */}
                       <div className="flex gap-2 bg-white rounded-lg border border-gray-200 p-1">
                           <button
                               onClick={() => setViewMode('grid')}
                               className={`px-3 py-1.5 rounded-md font-medium text-xs transition-all flex items-center gap-2 ${
                                   viewMode === 'grid'
                                       ? 'bg-blue-100 text-blue-700 shadow-sm'
                                       : 'text-gray-500 hover:bg-gray-50'
                               }`}
                           >
                               <FaThLarge /> {t('confirmation.view.grid')}
                           </button>
                           <button
                               onClick={() => setViewMode('list')}
                               className={`px-3 py-1.5 rounded-md font-medium text-xs transition-all flex items-center gap-2 ${
                                   viewMode === 'list'
                                       ? 'bg-blue-100 text-blue-700 shadow-sm'
                                       : 'text-gray-500 hover:bg-gray-50'
                               }`}
                           >
                               <FaThList /> {t('confirmation.view.list')}
                           </button>
                       </div>

                       {filteredOrders.length > 0 && (
                           <div className="flex items-center gap-2 px-1">
                               <input 
                                    type="checkbox" 
                                    id="select-all"
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    onChange={handleSelectAll}
                                    checked={isAllVisibleSelected}
                               />
                               <label htmlFor="select-all" className="text-sm font-semibold text-gray-600 cursor-pointer select-none">{t('confirmation.view.selectAll')}</label>
                           </div>
                       )}
                   </div>
                 </div>

                 {filteredOrders.length === 0 ? (
                     <div className="text-center py-10">
                        <p className="text-gray-500">No matching orders found.</p>
                     </div>
                 ) : (
                     <>
                     {viewMode === 'list' ? (
                       /* LIST VIEW (TABLE) */
                       <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                          <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left">
                                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                                      <tr>
                                          <th className="px-6 py-4 w-10">
                                              {/* Header Checkbox (Duplicate select all logic if desired, or just empty) */}
                                              <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                    onChange={handleSelectAll}
                                                    checked={isAllVisibleSelected}
                                              />
                                          </th>
                                          <th className="px-6 py-3 font-semibold">Date / ID</th>
                                          <th className="px-6 py-3 font-semibold">Diamond Details</th>
                                          <th className="px-6 py-3 font-semibold">Report</th>
                                          <th className="px-6 py-3 font-semibold text-right">Price</th>
                                          <th className="px-6 py-3 font-semibold text-center">Status</th>
                                          <th className="px-6 py-3 font-semibold text-right">Paid</th>
                                          <th className="px-6 py-3 font-semibold text-right">Due</th>
                                          <th className="px-6 py-3 font-semibold text-right text-purple-600">Refund</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                      {currentOrders.map(order => {
                                          const diamond = order.diamondId;
                                          if(!diamond) return null;
                                          const isSelected = selectedIds.includes(order._id);
                                          const total = order.totalAmount || parseFloat(diamond['Amount$']) || 0;
                                          const paid = order.paidAmount || 0;
                                          const discount = order.discount || 0;
                                          const due = order.status === 'rejected' ? 0 : (total - paid - discount);

                                          return (
                                              <tr key={order._id} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50/30' : ''}`}>
                                                  <td className="px-6 py-4">
                                                      <input 
                                                          type="checkbox" 
                                                          checked={isSelected}
                                                          onChange={() => handleSelect(order._id)}
                                                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                      />
                                                  </td>
                                                  <td className="px-6 py-4">
                                                      <div className="font-medium text-gray-900">{new Date(order.createdAt).toLocaleDateString()}</div>
                                                      <div className="text-xs text-gray-500 font-mono mt-0.5">{diamond['Stone No']}</div>
                                                      <div className="text-[10px] text-gray-400 mt-0.5">{order._id.slice(-6).toUpperCase()}</div>
                                                  </td>
                                                  <td className="px-6 py-4">
                                                      <div className="flex flex-col">
                                                          <span className="font-bold text-gray-800">{diamond.Shape} <span className="text-gray-300">|</span> {diamond.Carats}ct</span>
                                                          <span className="text-xs text-gray-500 mt-1">
                                                              {diamond.Color} • {diamond.Clarity} • {diamond.Cut} • {diamond.Lab}
                                                          </span>
                                                          <span className="text-[10px] text-gray-400 mt-0.5">
                                                              {diamond.Polish} / {diamond.Sym} / {diamond.Flour}
                                                          </span>
                                                      </div>
                                                  </td>
                                                  <td className="px-6 py-4 font-mono text-xs text-blue-600">
                                                      {diamond['Report No'] ? (
                                                          <a href={diamond.GIALINK || `https://www.gia.edu/report-check?reportno=${diamond['Report No']}`} target="_blank" rel="noreferrer" className="hover:underline">{(diamond['Report No']||'').toString()} 🔗</a>
                                                      ) : (diamond['Report No']||'').toString()}
                                                  </td>
                                                  <td className="px-6 py-4 text-right font-bold text-gray-900">
                                                      ${total.toFixed(2)}
                                                  </td>
                                                  <td className="px-6 py-4 text-center">
                                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                                                          order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                          order.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                          'bg-blue-100 text-blue-800'
                                                      }`}>
                                                          {order.status}
                                                      </span>
                                                      {order.status === 'confirmed' && order.paymentStatus !== 'paid' && (
                                                          <div className="text-[10px] text-gray-500 mt-1 capitalize">{order.paymentStatus} Payment</div>
                                                      )}
                                                      {order.status !== 'rejected' && order.paymentStatus === 'paid' && (
                                                          <div className="text-[10px] text-green-600 font-bold mt-1">PAID</div>
                                                      )}
                                                  </td>
                                                  <td className="px-6 py-4 text-right font-bold text-green-600">
                                                      {order.status === 'rejected' ? (
                                                          <span className="text-gray-400">$0.00</span>
                                                      ) : (
                                                          <>
                                                              ${paid.toFixed(2)}
                                                              {discount > 0 && <div className="text-[10px] text-orange-500">Disc: -${discount.toFixed(2)}</div>}
                                                          </>
                                                      )}
                                                  </td>
                                                  <td className="px-6 py-4 text-right font-bold">
                                                      <span className={due > 0.01 ? 'text-red-600' : 'text-gray-400'}>
                                                          ${due.toFixed(2)}
                                                      </span>
                                                  </td>
                                                  <td className="px-6 py-4 text-right font-bold text-purple-600">
                                                      {order.status === 'rejected' && paid > 0 
                                                        ? `$${paid.toFixed(2)}` 
                                                        : <span className="text-gray-300">-</span>
                                                      }
                                                  </td>
                                              </tr>
                                          );
                                      })}
                                  </tbody>
                              </table>
                          </div>
                       </div>
                     ) : (
                       /* GRID VIEW (ORIGINAL CARD LAYOUT) */
                       <div className="grid grid-cols-1 gap-4">
                         {currentOrders.map((order) => {
                             const diamond = order.diamondId;
                             if (!diamond) return null;

                             const isSelected = selectedIds.includes(order._id);
                             
                             // Calculate amounts for this order
                             const total = order.totalAmount || parseFloat(diamond['Amount$']) || 0;
                             const paid = order.paidAmount || 0;
                             const discount = order.discount || 0;
                             const due = order.status === 'rejected' ? 0 : (total - paid - discount);
                             
                             return (
                             <div key={order._id} className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all relative mb-6 ${isSelected ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/10' : 'border-gray-100'}`}>
                                {/* Header Strip */}
                                <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex justify-between items-center relative">
                                    {/* Overlay selection click area */}
                                    <div className="flex items-center gap-4 z-10">
                                        <input 
                                            type="checkbox" 
                                            checked={isSelected}
                                            onChange={() => handleSelect(order._id)}
                                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                         <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200 text-xs">ID: {diamond['Stone No']}</span>
                                            <span>•</span>
                                            <span>Ordered: {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}</span>
                                         </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                         <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                                             order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                                             order.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                         }`}>
                                             {order.status === 'pending' ? t('confirmation.status.pending') :
                                              order.status === 'confirmed' ? t('confirmation.status.confirmed') :
                                              t('confirmation.status.rejected')}
                                         </div>
                                    </div>
                                </div>

                                {/* Main Content Body - Flex Container */}
                                <div className="flex flex-col md:flex-row items-stretch">
                                   
                                   {/* Left: Main Specs (With Padding) */}
                                   <div className="flex-1 p-6">
                                      <div className="flex items-center justify-between mb-4">
                                         <h3 className="text-2xl font-serif font-bold text-gray-900">
                                            {diamond.Shape} <span className="text-gray-400">|</span> {diamond.Carats} Carat
                                         </h3>
                                         <div className="text-xl font-bold text-green-600">
                                            ${diamond['Amount$']}
                                         </div>
                                      </div>

                                      {/* Detailed Grid */}
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-8 text-sm border-t border-gray-100 pt-4">
                                         <div>
                                            <div className="text-gray-400 text-xs uppercase mb-1">Color</div>
                                            <div className="font-bold text-gray-900">{diamond.Color}</div>
                                         </div>
                                         <div>
                                            <div className="text-gray-400 text-xs uppercase mb-1">Clarity</div>
                                            <div className="font-bold text-gray-900">{diamond.Clarity}</div>
                                         </div>
                                         <div>
                                            <div className="text-gray-400 text-xs uppercase mb-1">Cut</div>
                                            <div className="font-bold text-gray-900">{diamond.Cut}</div>
                                         </div>
                                         <div>
                                            <div className="text-gray-400 text-xs uppercase mb-1">Lab</div>
                                            <div className="font-bold text-gray-900">{diamond.Lab}</div>
                                         </div>

                                         <div>
                                            <div className="text-gray-400 text-xs uppercase mb-1">Polish</div>
                                            <div className="font-bold text-gray-900">{diamond.Polish}</div>
                                         </div>
                                         <div>
                                            <div className="text-gray-400 text-xs uppercase mb-1">Symmetry</div>
                                            <div className="font-bold text-gray-900">{diamond.Sym}</div>
                                         </div>
                                         <div>
                                            <div className="text-gray-400 text-xs uppercase mb-1">Fluorescence</div>
                                            <div className="font-bold text-gray-900">{diamond.Flour}</div>
                                         </div>
                                         <div>
                                            <div className="text-gray-400 text-xs uppercase mb-1">Location</div>
                                            <div className="font-bold text-gray-900">{diamond.Location}</div>
                                         </div>
                                         
                                         <div>
                                            <div className="text-gray-400 text-xs uppercase mb-1">Depth %</div>
                                            <div className="font-semibold text-gray-700">{diamond['Depth %']}</div>
                                         </div>
                                         <div>
                                            <div className="text-gray-400 text-xs uppercase mb-1">Table %</div>
                                            <div className="font-semibold text-gray-700">{diamond['Table %']}</div>
                                         </div>
                                         <div className="col-span-2">
                                            <div className="text-gray-400 text-xs uppercase mb-1">Measurements</div>
                                            <div className="font-mono text-gray-700">{diamond.Measurement}</div>
                                         </div>
                                      </div>
                                      
                                      {/* Report Link */}
                                      <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-2">
                                         <span className="text-gray-400 text-xs">Report No:</span>
                                         {diamond['Report No'] ? (
                                            <a href={diamond.GIALINK || `https://www.gia.edu/report-check?reportno=${diamond['Report No']}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-mono text-sm font-medium">
                                                {diamond['Report No']} 🔗
                                            </a>
                                         ) : (
                                            <span className="font-mono text-sm text-gray-700">{diamond['Report No']}</span>
                                         )}
                                      </div>
                                   </div>

                                   {/* Right: Status & Payment Message Panel (Flush & Full Height) */}
                                   <div className={`md:w-72 p-6 flex flex-col justify-center items-center text-center border-t md:border-t-0 md:border-l ${
                                       order.status === 'confirmed' ? 'bg-green-50 border-green-100' :
                                       order.status === 'rejected' ? 'bg-red-50 border-red-100' :
                                       'bg-blue-50 border-blue-100'
                                   }`}>
                                      <div className={`w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 ${
                                          order.status === 'confirmed' ? 'text-green-500' :
                                          order.status === 'rejected' ? 'text-red-500' :
                                          'text-blue-500'
                                      }`}>
                                          {order.status === 'confirmed' ? <FaCheckCircle className="text-xl" /> : 
                                           order.status === 'rejected' ? <FaCheckCircle className="text-xl rotate-45" /> : 
                                           <FaCheckCircle className="text-xl" />}
                                      </div>
                                      <h4 className={`font-bold mb-2 ${
                                          order.status === 'confirmed' ? 'text-green-800' :
                                          order.status === 'rejected' ? 'text-red-800' :
                                          'text-blue-800'
                                      }`}>
                                          {order.status === 'confirmed' ? t('confirmation.messages.orderConfirmed') : 
                                           order.status === 'rejected' ? t('confirmation.messages.orderRejected') : 
                                           t('confirmation.messages.orderReceived')}
                                      </h4>
                                      <p className={`text-xs leading-relaxed ${
                                          order.status === 'confirmed' ? 'text-green-700' :
                                          order.status === 'rejected' ? 'text-red-700' :
                                          'text-blue-700'
                                      }`}>
                                         {order.status === 'confirmed' ? t('confirmation.messages.orderConfirmedDesc') : 
                                          order.status === 'rejected' ? t('confirmation.messages.orderRejectedDesc') :
                                          t('confirmation.messages.orderReceivedDesc')}
                                      </p>
                                      
                                      {/* Payment Breakdown */}
                                      {order.status === 'confirmed' && (
                                         <div className="mt-4 w-full bg-white/50 rounded-lg p-3 border border-green-100 text-sm">
                                            <div className="flex justify-between mb-1">
                                               <span className="text-green-700 opacity-80">Total:</span>
                                               <span className="font-bold text-green-900">${total.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between mb-1">
                                               <span className="text-green-700 opacity-80">Paid:</span>
                                               <span className="font-bold text-green-900">${paid.toFixed(2)}</span>
                                            </div>
                                            {discount > 0 && (
                                                <div className="flex justify-between mb-1">
                                                   <span className="text-orange-600 opacity-80">Discount:</span>
                                                   <span className="font-bold text-orange-600">${discount.toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="border-t border-green-200 mt-2 pt-2 flex justify-between">
                                               <span className="font-bold text-green-800">Due:</span>
                                               <span className={`font-bold ${due > 0.01 ? 'text-red-600' : 'text-green-600'}`}>${due.toFixed(2)}</span>
                                            </div>
                                         </div>
                                      )}

                                      {/* Refunded Message for Rejected Orders */}
                                      {order.status === 'rejected' && paid > 0 && (
                                          <div className="mt-4 w-full bg-white/50 rounded-lg p-3 border border-red-100 text-sm">
                                              <div className="text-red-800 font-bold text-sm">Amount Refunded</div>
                                              <div className="text-red-600 font-bold text-lg mt-1">${paid.toFixed(2)}</div>
                                          </div>
                                      )}

                                      <div className={`mt-3 px-3 py-1 bg-white border text-xs font-mono rounded-full uppercase ${
                                          order.status === 'confirmed' ? 'border-green-200 text-green-700' :
                                          order.status === 'rejected' ? 'border-red-200 text-red-700' :
                                          'border-blue-200 text-blue-700'
                                      }`}>
                                         Status: {order.status}
                                      </div>
                                   </div>

                                </div>
                             </div>
                           )})}
                       </div>
                     )}
                     </>
                 )}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                      <div className="flex justify-between items-center px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl mt-4">
                          <div className="text-xs text-gray-500">
                              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredOrders.length)} of {filteredOrders.length} orders
                          </div>
                          <div className="flex items-center gap-1">
                              <button 
                                  onClick={() => handlePageChange(currentPage - 1)}
                                  disabled={currentPage === 1}
                                  className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-600 text-xs hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                  Prev
                              </button>
                              
                              {[...Array(totalPages)].map((_, idx) => (
                                  <button
                                      key={idx + 1}
                                      onClick={() => handlePageChange(idx + 1)}
                                      className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                                          currentPage === idx + 1 
                                          ? 'bg-blue-600 text-white border border-blue-600' 
                                          : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                                      }`}
                                  >
                                      {idx + 1}
                                  </button>
                              ))}

                              <button 
                                  onClick={() => handlePageChange(currentPage + 1)}
                                  disabled={currentPage === totalPages}
                                  className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-600 text-xs hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                  Next
                              </button>
                          </div>
                      </div>
                  )}
              </div>
          )}


        </main>
      </div>
    </div>
  );
};

export default Confirmation;
