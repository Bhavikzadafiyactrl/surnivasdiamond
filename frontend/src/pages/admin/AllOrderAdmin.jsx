import { useState, useEffect } from 'react';
import { FaHistory, FaSpinner, FaSearch, FaBoxOpen, FaDownload } from 'react-icons/fa';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import * as XLSX from 'xlsx';
import { useAuth } from '../../contexts/AuthContext';

const AllOrderAdmin = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); 
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [managerFilter, setManagerFilter] = useState("all");

  // Selection State
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    // Fetch All Orders (Admin Endpoint)
    fetch(`${import.meta.env.VITE_API_URL}/diamonds/admin/orders`, {
      credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
      if(data.success) {
        setOrders(data.data);
      }
    })
    .catch(err => console.error("Error fetching admin orders:", err))
    .finally(() => setLoading(false));
  }, []);

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  const filteredOrders = orders.filter(order => {
      const diamond = order.diamondId || {};
      const user = order.userId || {};
      const term = searchTerm.toLowerCase();
      
      // Status filter
      let statusMatch = true;
      if (statusFilter === 'confirmed') {
          statusMatch = order.status === 'confirmed' && order.paymentStatus !== 'paid';
      } else if (statusFilter === 'allDone') {
          statusMatch = order.status === 'confirmed' && order.paymentStatus === 'paid';
      } else if (statusFilter === 'rejected') {
          statusMatch = order.status === 'rejected';
      } else if (statusFilter === 'pending') {
          statusMatch = order.status === 'pending';
      }
      
      // Search filter (Stone, Report, User, Company, Order ID)
      const searchMatch = (
          (diamond['Stone No'] && diamond['Stone No'].toLowerCase().includes(term)) ||
          (diamond['Report No'] && diamond['Report No'].toLowerCase().includes(term)) ||
          (diamond.Shape && diamond.Shape.toLowerCase().includes(term)) ||
          (order._id && order._id.toLowerCase().includes(term)) ||
          (user.name && user.name.toLowerCase().includes(term)) ||
          (user.companyName && user.companyName.toLowerCase().includes(term)) || 
          (user.email && user.email.toLowerCase().includes(term))
      );

      // Company Filter (Exact match from dropdown if we had one, or text match)
      const companyMatch = companyFilter ? (user.companyName && user.companyName.toLowerCase().includes(companyFilter.toLowerCase())) : true;
      
      // Manager Filter
      const userManagedBy = user.managedBy || 'none';
      const managerMatch = managerFilter === 'all' ? true : (userManagedBy === managerFilter);
      
      // Date range filter
      let dateMatch = true;
      if (startDate || endDate) {
          const orderDate = new Date(order.createdAt);
          if (startDate && new Date(startDate) > orderDate) {
              dateMatch = false;
          }
          if (endDate) {
              const end = new Date(endDate);
              end.setHours(23, 59, 59, 999); 
              if (end < orderDate) {
                  dateMatch = false;
              }
          }
      }
      
      return statusMatch && searchMatch && dateMatch && companyMatch && managerMatch;
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, startDate, endDate, companyFilter, managerFilter]);

  // Pagination Calculation
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Calculate totals - Dynamic based on Selection
  const ordersToCalculate = selectedOrderIds.length > 0 
      ? filteredOrders.filter(o => selectedOrderIds.includes(o._id)) 
      : filteredOrders;

  const calculations = ordersToCalculate.reduce((acc, order) => {
      if (order.status !== 'rejected') {
          const total = order.totalAmount || order.diamondId?.['Amount$'] || 0;
          const paid = order.paidAmount || 0;
          const discount = order.discount || 0;
          const due = (total - paid - discount);
          
          acc.totalPaid += paid;
          acc.totalDiscount += discount;
          acc.totalDue += due;
          acc.grandTotal += total;
      }
      return acc;
  }, { totalPaid: 0, totalDiscount: 0, totalDue: 0, grandTotal: 0 });

  const exportToExcel = () => {
    // Export Selected or All Filtered if none selected
    const dataToExport = selectedOrderIds.length > 0 
        ? filteredOrders.filter(o => selectedOrderIds.includes(o._id))
        : filteredOrders;

    const data = dataToExport.map(order => ({
        DATE: new Date(order.createdAt).toLocaleDateString(),
        TIME: new Date(order.createdAt).toLocaleTimeString(),
        'COMP. DATE': order.completedAt ? new Date(order.completedAt).toLocaleDateString() : '-',
        'COMP. TIME': order.completedAt ? new Date(order.completedAt).toLocaleTimeString() : '-',
        USER: order.userId?.name,
        COMPANY: order.userId?.companyName,
        EMAIL: order.userId?.email,
        MOBILE: order.userId?.mobile,
        LOC: order.diamondId?.Location,
        'STONE ID': order.diamondId?.['Stone No'],
        REPORT: order.diamondId?.['Report No'],
        LAB: order.diamondId?.Lab,
        SHAPE: order.diamondId?.Shape,
        CARAT: order.diamondId?.Carats,
        COLOR: order.diamondId?.Color,
        CLARITY: order.diamondId?.Clarity,
        CUT: order.diamondId?.Cut,
        POL: order.diamondId?.Polish,
        SYM: order.diamondId?.Sym,
        FLUOR: order.diamondId?.Flour,
        MEAS: order.diamondId?.Measurement,
        DIAM: order.diamondId?.['Diameter (MM)'],
        DEPTH: order.diamondId?.['Depth %'],
        TABLE: order.diamondId?.['Table %'],
        KEY: order.diamondId?.['Key To Symbols'],
        BGM: order.diamondId?.BGM,
        PRICE: order.totalAmount || order.diamondId?.['Amount$'],
        DISC: order.discount || 0,
        PAID: order.paidAmount,
        DUE: order.status === 'rejected' ? 0 : ((order.totalAmount || order.diamondId?.['Amount$']) - (order.paidAmount || 0) - (order.discount || 0)),
        STATUS: order.status
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, selectedOrderIds.length > 0 ? "Selected_Orders_Admin.xlsx" : "All_Orders_Admin.xlsx");
  };

  const toggleSelectAll = () => {
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
        <Topbar userName={user?.name || "Admin"} onMenuClick={() => setIsMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-gray-50">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                   <FaHistory className="text-black" /> All Orders (Admin)
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                   {selectedOrderIds.length > 0 ? `Showing metrics for ${selectedOrderIds.length} selected orders` : 'Viewing all filtered orders'}
                </p>
              </div>
              <button onClick={exportToExcel} className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 text-sm hover:bg-green-700 transition">
                  <FaDownload /> {selectedOrderIds.length > 0 ? `Export Selected (${selectedOrderIds.length})` : 'Export All Visible'}
              </button>
           </div>

           {/* Metrics Cards */}
           <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 transition-all ${selectedOrderIds.length > 0 ? 'ring-2 ring-blue-500 p-2 rounded-xl bg-blue-50/50' : ''}`}>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <div className="text-gray-500 text-xs uppercase font-bold tracking-wider">
                      {selectedOrderIds.length > 0 ? 'Selected Orders' : 'Total Orders'}
                  </div>
                  <div className="text-2xl font-bold text-gray-800 mt-1">{ordersToCalculate.length}</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <div className="text-gray-500 text-xs uppercase font-bold tracking-wider">Total Revenue (Paid)</div>
                  <div className="text-2xl font-bold text-green-600 mt-1">${calculations.totalPaid.toFixed(2)}</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <div className="text-gray-500 text-xs uppercase font-bold tracking-wider">Outstanding Payment</div>
                  <div className="text-2xl font-bold text-red-600 mt-1">${calculations.totalDue.toFixed(2)}</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <div className="text-gray-500 text-xs uppercase font-bold tracking-wider">Total Discount</div>
                  <div className="text-2xl font-bold text-orange-500 mt-1">${calculations.totalDiscount.toFixed(2)}</div>
              </div>
           </div>

           {/* Filters */}
           <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 space-y-4">
               <div className="flex flex-col md:flex-row gap-4">
                  {/* Search */}
                  <div className="flex-1 relative">
                      <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Search Stone ID, User, Company..." 
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-black outline-none text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                  </div>
                  
                  {/* Status Filter */}
                  <select 
                     className="px-4 py-2 border border-gray-300 rounded outline-none text-sm bg-white"
                     value={statusFilter}
                     onChange={(e) => setStatusFilter(e.target.value)}
                  >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed (Unpaid)</option>
                      <option value="allDone">All Done (Paid)</option>
                      <option value="rejected">Rejected</option>
                  </select>

                  {/* Manager Filter */}
                  <select 
                     className="px-4 py-2 border border-gray-300 rounded outline-none text-sm bg-white"
                     value={managerFilter}
                     onChange={(e) => setManagerFilter(e.target.value)}
                  >
                      <option value="all">All Managers</option>
                      <option value="none">None</option>
                      <option value="bhavik">Bhavik</option>
                      <option value="nikul">Nikul</option>
                  </select>

                  {/* Dates */}
                  <div className="flex gap-2">
                      <input 
                        type="date" 
                        className="px-4 py-2 border border-gray-300 rounded outline-none text-sm"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        placeholder="Start Date"
                      />
                      <input 
                        type="date" 
                        className="px-4 py-2 border border-gray-300 rounded outline-none text-sm"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        placeholder="End Date"
                      />
                  </div>
               </div>
           </div>

           {/* Results Table */}
           <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
               {loading ? (
                   <div className="p-10 text-center text-gray-500">
                       <FaSpinner className="animate-spin text-2xl mx-auto mb-2" /> Loading Orders...
                   </div>
               ) : filteredOrders.length === 0 ? (
                   <div className="p-10 text-center text-gray-500">
                       <FaBoxOpen className="text-4xl mx-auto mb-2 opacity-50" /> No orders found.
                   </div>
               ) : (
                <>
                <div className="overflow-x-auto">
                   <table className="w-full text-left text-xs">
                       <thead className="bg-gray-50 uppercase text-gray-500 font-bold border-b border-gray-200 whitespace-nowrap">
                           <tr>
                               <th className="px-4 py-3 text-center w-10">
                                   <input 
                                     type="checkbox" 
                                     checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                                     onChange={toggleSelectAll}
                                     className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                   />
                               </th>
                               <th className="px-2 py-3 text-xs">DATE/TIME</th>
                               <th className="px-2 py-3 text-xs">COMPLETED</th>
                               <th className="px-2 py-3 text-xs">USER</th>
                               <th className="px-2 py-3 text-xs">COMPANY</th>
                               <th className="px-2 py-3 text-xs">EMAIL</th>
                               <th className="px-2 py-3 text-xs">MOBILE</th>
                               <th className="px-2 py-3 text-xs">LOC</th>
                               <th className="px-2 py-3 text-xs">STONE ID</th>
                               <th className="px-2 py-3 text-xs">REPORT</th>
                               <th className="px-2 py-3 text-xs">LAB</th>
                               <th className="px-2 py-3 text-xs">SHAPE</th>
                               <th className="px-2 py-3 text-xs">CARAT</th>
                               <th className="px-2 py-3 text-xs">COLOR</th>
                               <th className="px-2 py-3 text-xs">CLARITY</th>
                               <th className="px-2 py-3 text-xs">CUT</th>
                               <th className="px-2 py-3 text-xs">POL</th>
                               <th className="px-2 py-3 text-xs">SYM</th>
                               <th className="px-2 py-3 text-xs">FLUOR</th>
                               <th className="px-2 py-3 text-xs">MEAS</th>
                               <th className="px-2 py-3 text-xs">DIAM</th>
                               <th className="px-2 py-3 text-xs">DEPTH</th>
                               <th className="px-2 py-3 text-xs">TABLE</th>
                               <th className="px-2 py-3 text-xs">KEY</th>
                               <th className="px-2 py-3 text-xs">BGM</th>
                               <th className="px-2 py-3 text-xs text-right">PRICE</th>
                               <th className="px-2 py-3 text-xs text-right">DISC</th>
                               <th className="px-2 py-3 text-xs text-right">PAID</th>
                               <th className="px-2 py-3 text-xs text-right">DUE</th>
                               <th className="px-2 py-3 text-xs text-center">STATUS</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                           {currentOrders.map(order => {
                               const diamond = order.diamondId || {};
                               const user = order.userId || {};
                               const total = order.totalAmount || diamond['Amount$'] || 0;
                               const paid = order.paidAmount || 0;
                               const discount = order.discount || 0;
                               const due = order.status === 'rejected' ? 0 : (total - paid - discount);
                               
                               return (
                                   <tr key={order._id} className={`hover:bg-blue-50/50 transition-colors ${selectedOrderIds.includes(order._id) ? 'bg-blue-50' : ''}`}>
                                       <td className="px-4 py-2 text-center">
                                           <input 
                                             type="checkbox" 
                                             checked={selectedOrderIds.includes(order._id)}
                                             onChange={() => toggleSelection(order._id)}
                                             className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                           />
                                       </td>
                                       <td className="px-2 py-2 text-xs">
                                           <div>{new Date(order.createdAt).toLocaleDateString()}</div>
                                           <div className="text-gray-500 text-[10px]">{new Date(order.createdAt).toLocaleTimeString()}</div>
                                       </td>
                                       <td className="px-2 py-2 text-xs">
                                           {order.completedAt ? (
                                               <>
                                                   <div>{new Date(order.completedAt).toLocaleDateString()}</div>
                                                   <div className="text-gray-500 text-[10px]">{new Date(order.completedAt).toLocaleTimeString()}</div>
                                               </>
                                           ) : '-'}
                                       </td>
                                       <td className="px-2 py-2 text-xs font-medium">{user.name || 'Unknown'}</td>
                                       <td className="px-2 py-2 text-xs text-gray-600">{user.companyName || '-'}</td>
                                       <td className="px-2 py-2 text-xs text-gray-600">{user.email || '-'}</td>
                                       <td className="px-2 py-2 text-xs text-gray-600">{user.mobile || '-'}</td>
                                       <td className="px-2 py-2 text-xs text-gray-600">{diamond.Location || '-'}</td>
                                       <td className="px-2 py-2 text-xs font-semibold">{diamond['Stone No'] || '-'}</td>
                                       <td className="px-2 py-2 text-xs text-blue-600">{diamond['Report No'] || '-'}</td>
                                       <td className="px-2 py-2 text-xs text-gray-600">{diamond.Lab || '-'}</td>
                                       <td className="px-2 py-2 text-xs">{diamond.Shape || '-'}</td>
                                       <td className="px-2 py-2 text-xs font-medium">{diamond.Carats || '-'}</td>
                                       <td className="px-2 py-2 text-xs">{diamond.Color || '-'}</td>
                                       <td className="px-2 py-2 text-xs">{diamond.Clarity || '-'}</td>
                                       <td className="px-2 py-2 text-xs">{diamond.Cut || '-'}</td>
                                       <td className="px-2 py-2 text-xs">{diamond.Polish || '-'}</td>
                                       <td className="px-2 py-2 text-xs">{diamond.Sym || '-'}</td>
                                       <td className="px-2 py-2 text-xs">{diamond.Flour || '-'}</td>
                                       <td className="px-2 py-2 text-xs">{diamond.Measurement || '-'}</td>
                                       <td className="px-2 py-2 text-xs">{diamond['Diameter (MM)'] || '-'}</td>
                                       <td className="px-2 py-2 text-xs">{diamond['Depth %'] || '-'}</td>
                                       <td className="px-2 py-2 text-xs">{diamond['Table %'] || '-'}</td>
                                       <td className="px-2 py-2 text-xs">{diamond['Key To Symbols'] || '-'}</td>
                                       <td className="px-2 py-2 text-xs">{diamond.BGM || '-'}</td>
                                       <td className="px-2 py-2 text-xs text-right font-bold text-gray-800">${Number(total).toFixed(2)}</td>
                                       <td className="px-2 py-2 text-xs text-right text-orange-600 font-medium">
                                           {discount > 0 ? `$${Number(discount).toFixed(2)}` : '-'}
                                       </td>
                                       <td className="px-2 py-2 text-xs text-right text-green-600 font-medium">
                                           {paid > 0 ? `$${Number(paid).toFixed(2)}` : '-'}
                                       </td>
                                       <td className="px-2 py-2 text-xs text-right font-bold text-red-500">
                                           {order.status === 'rejected' ? '-' : (due > 0.01 ? `$${Number(due).toFixed(2)}` : <span className="text-green-500">PAID</span>)}
                                       </td>
                                       <td className="px-2 py-2 text-center">
                                           <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                                               order.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-200' :
                                               order.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                               'bg-yellow-50 text-yellow-700 border-yellow-200'
                                           }`}>
                                               {order.status}
                                           </span>
                                       </td>
                                   </tr>
                               );
                           })}
                       </tbody>
                   </table>
                </div>

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
                            
                            {[...Array(Math.min(totalPages, 10))].map((_, idx) => {
                                const pageNum = idx + 1;
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => handlePageChange(pageNum)}
                                        className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                                            currentPage === pageNum 
                                            ? 'bg-blue-600 text-white border border-blue-600' 
                                            : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            {totalPages > 10 && <span className="text-gray-400 text-xs">...</span>}

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
                </>
                )}
           </div>
        </main>
      </div>
    </div>
  );
};

export default AllOrderAdmin;
