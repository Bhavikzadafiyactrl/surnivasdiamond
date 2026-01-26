import { useState, useEffect } from 'react';
import { FaHistory, FaSpinner, FaSearch, FaFileExcel } from 'react-icons/fa';
import { FaHistory, FaSpinner, FaSearch, FaFileExcel } from 'react-icons/fa';
import { exportOrdersToExcel } from '../utils/exportUtils';

import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useLanguage } from '../contexts/LanguageContext';

const OrderHistory = () => {
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, confirmed, allDone, rejected
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  
  // Selection State
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserName(user.name || "User");
      
      fetch(`${import.meta.env.VITE_API_URL}/diamonds/orders?userId=${user.id || user._id}`, {
        credentials: 'include'
      })
      .then(res => res.json())
      .then(data => {
        if(data.success) {
          setOrders(data.data);
        }
      })
      .catch(err => console.error("Error fetching orders:", err))
      .finally(() => setLoading(false));
    } else {
        setLoading(false);
    }
  }, []);

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  const filteredOrders = orders.filter(order => {
      const diamond = order.diamondId || {};
      const term = searchTerm.toLowerCase();
      
      // Status filter
      let statusMatch = true;
      if (statusFilter === 'confirmed') {
          statusMatch = order.status === 'confirmed' && order.paymentStatus !== 'paid';
      } else if (statusFilter === 'allDone') {
          statusMatch = order.status === 'confirmed' && order.paymentStatus === 'paid';
      } else if (statusFilter === 'rejected') {
          statusMatch = order.status === 'rejected';
      }
      
      // Search filter
      const searchMatch = (
          (diamond.StockID && diamond.StockID.toLowerCase().includes(term)) ||
          (diamond['Report No'] && diamond['Report No'].toLowerCase().includes(term)) ||
          (diamond.Shape && diamond.Shape.toLowerCase().includes(term)) ||
          (order._id && order._id.toLowerCase().includes(term)) 
      );
      
      // Date range filter
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
      
      return statusMatch && searchMatch && dateMatch;
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, startDate, endDate]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Calculate totals - Dynamic based on Selection (Persists across pages)
  const ordersToCalculate = selectedOrderIds.length > 0
      ? filteredOrders.filter(o => selectedOrderIds.includes(o._id))
      : filteredOrders;

  const calculations = ordersToCalculate.reduce((acc, order) => {
      if (order.status !== 'rejected') {
          const total = order.totalAmount || order.diamondId?.['Amount$'] || 0;
          const paid = order.paidAmount || 0;
          const discount = order.discount || 0;
          const due = order.status === 'confirmed' ? (total - paid - discount) : 0;
          
          acc.totalPaid += paid;
          acc.totalDiscount += discount;
          acc.totalDue += due;
      }
      return acc;
  }, { totalPaid: 0, totalDiscount: 0, totalDue: 0 });

  // Function to export filtered orders to Excel
  const handleExportExcel = () => {
    // Export Selected (from any page) or All Filtered
    const dataToExport = selectedOrderIds.length > 0 
        ? filteredOrders.filter(o => selectedOrderIds.includes(o._id))
        : filteredOrders;

    if (dataToExport.length === 0) return;

    exportOrdersToExcel(dataToExport, selectedOrderIds.length > 0 ? "Selected_Order_History.xlsx" : `Order_History_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const toggleSelectAll = () => {
    // Select ALL filtered items (Global Select), not just visible page
    if (selectedOrderIds.length === filteredOrders.length) {
        setSelectedOrderIds([]);
    } else {
        setSelectedOrderIds(filteredOrders.map(o => o._id));
    }
  };

  const toggleSelection = (id) => {
    if (selectedOrderIds.includes(id)) {
        setSelectedOrderIds(selectedOrderIds.filter(sid => sid !== id));
    } else {
        setSelectedOrderIds([...selectedOrderIds, id]);
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

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
            <h1 className="text-2xl font-serif font-bold mb-6 flex items-center gap-2 text-gray-900">
                <FaHistory className="text-gray-500" /> {t('orderHistory.title')}
            </h1>

            {/* Search Bar, Filter, and Date Range */}
            <div className="mb-6 flex gap-4 flex-wrap">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 flex-1 min-w-[300px]">
                    <FaSearch className="text-gray-400" />
                    <input 
                        type="text" 
                        placeholder={t('orderHistory.searchPlaceholder')} 
                        className="flex-1 outline-none text-sm placeholder-gray-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm text-sm outline-none cursor-pointer hover:bg-gray-50"
                >
                    <option value="all">{t('orderHistory.status.all')}</option>
                    <option value="confirmed">{t('orderHistory.status.confirmed')}</option>
                    <option value="allDone">{t('orderHistory.status.allDone')}</option>
                    <option value="rejected">{t('orderHistory.status.rejected')}</option>
                </select>
                
                <div className="flex gap-2 items-center bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
                    <label className="text-xs text-gray-600 font-medium">{t('orderHistory.date.from')}:</label>
                    <input  
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="outline-none text-sm cursor-pointer"
                    />
                </div>
                
                <div className="flex gap-2 items-center bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
                    <label className="text-xs text-gray-600 font-medium">{t('orderHistory.date.to')}:</label>
                    <input 
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="outline-none text-sm cursor-pointer"
                    />
                </div>
                
                {(startDate || endDate) && (
                    <button
                        onClick={() => { setStartDate(""); setEndDate(""); }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200 transition-colors"
                    >
                        {t('orderHistory.date.clear')}
                    </button>
                )}
                
                <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors shadow-sm ml-auto"
                >
                    <FaFileExcel /> {selectedOrderIds.length > 0 ? `${t('orderHistory.export')} (${selectedOrderIds.length})` : t('orderHistory.export')}
                </button>
            </div>

            {/* Summary Cards */}
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 transition-all ${selectedOrderIds.length > 0 ? 'ring-2 ring-blue-500 p-2 rounded-xl bg-blue-50/50' : ''}`}>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <h3 className="text-xs font-medium text-green-600 mb-1">{selectedOrderIds.length > 0 ? 'Total Paid (Selected)' : t('orderHistory.total.paid')}</h3>
                    <p className="text-2xl font-bold text-green-700">${calculations.totalPaid.toFixed(2)}</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <h3 className="text-xs font-medium text-purple-600 mb-1">{selectedOrderIds.length > 0 ? 'Total Discount (Selected)' : t('orderHistory.total.discount')}</h3>
                    <p className="text-2xl font-bold text-purple-700">${calculations.totalDiscount.toFixed(2)}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <h3 className="text-xs font-medium text-red-600 mb-1">{selectedOrderIds.length > 0 ? 'Total Due (Selected)' : t('orderHistory.total.due')}</h3>
                    <p className="text-2xl font-bold text-red-700">${calculations.totalDue.toFixed(2)}</p>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                {/* Custom Table Layout similar to DiamondSearch.jsx */}
                
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <FaSpinner className="animate-spin text-4xl text-blue-500" />
                    </div>
                ) : (
                    <>
                    <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left leading-tight whitespace-nowrap">
                        <thead className="bg-gray-50 text-gray-500 font-medium uppercase text-[10px] border-b border-gray-300">
                            <tr>
                                <th className="px-2 py-3 border-r border-gray-200 w-8 text-center">
                                    <input 
                                        type="checkbox" 
                                        checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                </th>
                                <th className="px-2 py-3 border-r border-gray-200">Date</th>
                                <th className="px-2 py-3 border-r border-gray-200">Sold Date</th>
                                <th className="px-2 py-3 border-r border-gray-200">Loc</th>
                                <th className="px-2 py-3 border-r border-gray-200">Stock ID</th>
                                <th className="px-2 py-3 border-r border-gray-200">Report</th>
                                <th className="px-2 py-3 border-r border-gray-200">Lab</th>
                                <th className="px-2 py-3 border-r border-gray-200">Shape</th>
                                <th className="px-2 py-3 border-r border-gray-200">Carat</th>
                                <th className="px-2 py-3 border-r border-gray-200">Color</th>
                                <th className="px-2 py-3 border-r border-gray-200">Clarity</th>
                                <th className="px-2 py-3 border-r border-gray-200">Cut</th>
                                <th className="px-2 py-3 border-r border-gray-200">Pol</th>
                                <th className="px-2 py-3 border-r border-gray-200">Sym</th>
                                <th className="px-2 py-3 border-r border-gray-200">Fluor</th>
                                <th className="px-2 py-3 border-r border-gray-200">Meas</th>
                                <th className="px-2 py-3 border-r border-gray-200">Diam</th>
                                <th className="px-2 py-3 border-r border-gray-200">Depth</th>
                                <th className="px-2 py-3 border-r border-gray-200">Table</th>
                                <th className="px-2 py-3 border-r border-gray-200">Key</th>
                                <th className="px-2 py-3 border-r border-gray-200">BGM</th>
                                <th className="px-2 py-3 border-r border-gray-200">Price</th>
                                {/* New Columns */}
                                <th className="px-2 py-3 border-r border-gray-200">Status</th>
                                <th className="px-2 py-3 border-r border-gray-200 text-right">Paid</th>
                                <th className="px-2 py-3 border-r border-gray-200 text-right">Discount</th>
                                <th className="px-2 py-3 border-r border-gray-200 text-right">Due</th>
                                <th className="px-2 py-3 border-r border-gray-200 text-right">Refund</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {currentOrders.length > 0 ? (
                                currentOrders.map((order) => {
                                    const diamond = order.diamondId || {};
                                    const total = order.totalAmount || diamond['Amount$'] || 0;
                                    const paid = order.paidAmount || 0;
                                    const discount = order.discount || 0;
                                    const due = order.status === 'confirmed' ? (total - paid - discount) : 0;
                                    
                                    return (
                                        <tr key={order._id} className={`hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-none ${selectedOrderIds.includes(order._id) ? 'bg-blue-50' : ''}`}>
                                            <td className="px-2 py-2 border-r border-gray-100 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedOrderIds.includes(order._id)}
                                                    onChange={() => toggleSelection(order._id)}
                                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="px-2 py-2 border-r border-gray-100 text-gray-600">
                                                {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </td>
                                            <td className="px-2 py-2 border-r border-gray-100 text-gray-600">
                                                {order.completedAt ? new Date(order.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                                            </td>
                                            <td className="px-2 py-2 border-r border-gray-100 font-medium">{diamond.Location}</td>
                                            <td className="px-2 py-2 border-r border-gray-100">{diamond.StockID}</td>
                                            <td className="px-2 py-2 border-r border-gray-100 text-blue-600 underline cursor-pointer" title="View Report">
                                                 {diamond['Report No'] ? (
                                                     <a href={diamond.GIALINK || `https://www.gia.edu/report-check?reportno=${diamond['Report No']}`} target="_blank" rel="noopener noreferrer">{diamond['Report No']}</a>
                                                 ) : (
                                                     <span className="text-gray-400">-</span>
                                                 )}
                                            </td>
                                            <td className="px-2 py-2 border-r border-gray-100">{diamond.Lab}</td>
                                            <td className="px-2 py-2 border-r border-gray-100">{diamond.Shape}</td>
                                            <td className="px-2 py-2 border-r border-gray-100 font-bold">{Number(diamond.Carats).toFixed(2)}</td>
                                            <td className="px-2 py-2 border-r border-gray-100">{diamond.Color}</td>
                                            <td className="px-2 py-2 border-r border-gray-100">{diamond.Clarity}</td>
                                            <td className="px-2 py-2 border-r border-gray-100">{diamond.Cut}</td>
                                            <td className="px-2 py-2 border-r border-gray-100">{diamond.Polish}</td>
                                            <td className="px-2 py-2 border-r border-gray-100">{diamond.Sym}</td>
                                            <td className="px-2 py-2 border-r border-gray-100">{diamond.Flour}</td>
                                            <td className="px-2 py-2 border-r border-gray-100">{diamond.Measurement}</td>
                                            <td className="px-2 py-2 border-r border-gray-100">{diamond['Diameter (MM)']}</td>
                                            <td className="px-2 py-2 border-r border-gray-100">{diamond['Depth %']}</td>
                                            <td className="px-2 py-2 border-r border-gray-100">{diamond['Table %']}</td>
                                            <td className="px-2 py-2 border-r border-gray-100 max-w-[150px] truncate" title={diamond['Key To Symbols']}>{diamond['Key To Symbols']}</td>
                                            <td className="px-2 py-2 border-r border-gray-100">{diamond.BGM}</td>
                                            <td className="px-2 py-2 border-r border-gray-100 font-bold">${Number(total).toFixed(2)}</td>
                                            
                                            {/* Status Column */}
                                            <td className="px-2 py-2 border-r border-gray-100">
                                                {order.status === 'confirmed' ? (
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                                        {order.paymentStatus === 'paid' ? 'PAID' : 'CONFIRMED'}
                                                    </span>
                                                ) : order.status === 'rejected' ? (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">REJECTED</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">PENDING</span>
                                                )}
                                            </td>
                                            
                                {/* Paid Column */}
                                            <td className="px-2 py-2 border-r border-gray-100 text-right text-green-600 font-medium">
                                                ${Number(paid).toFixed(2)}
                                            </td>

                                            {/* Discount Column */}
                                            <td className="px-2 py-2 border-r border-gray-100 text-right text-purple-600 font-medium">
                                                ${Number(discount).toFixed(2)}
                                            </td>

                                            {/* Due Column */}
                                            <td className="px-2 py-2 border-r border-gray-100 text-right font-bold">
                                                {due > 0.01 ? (
                                                    <span className="text-red-500">${Number(due).toFixed(2)}</span>
                                                ) : (
                                                     <span className="text-gray-400">$0.00</span>
                                                )}
                                            </td>
                                            
                                            {/* Refund Column */}
                                            <td className="px-2 py-2 border-r border-gray-100 text-right font-medium">
                                                {order.status === 'rejected' && paid > 0 ? (
                                                    <span className="text-purple-600">${Number(paid).toFixed(2)}</span>
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </td>

                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="25" className="px-6 py-12 text-center text-gray-500">
                                        {t('orderHistory.noOrders')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex justify-between items-center px-4 py-3 border-t border-gray-200 bg-gray-50">
                          <div className="text-xs text-gray-500">
                              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredOrders.length)} of {filteredOrders.length} entries
                          </div>
                          <div className="flex items-center gap-1">
                              <button 
                                  onClick={() => handlePageChange(currentPage - 1)}
                                  disabled={currentPage === 1}
                                  className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-600 text-xs hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                  Prev
                              </button>
                              
                              {[...Array(totalPages)].map((_, idx) => (
                                  <button
                                      key={idx + 1}
                                      onClick={() => handlePageChange(idx + 1)}
                                      className={`px-3 py-1 rounded text-xs font-bold ${
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
                                  className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-600 text-xs hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                  Next
                              </button>
                          </div>
                      </div>
                    )}
                    </>
                )}
            </div>
        </main>
      </div>
    </div>
  );
};

export default OrderHistory;
