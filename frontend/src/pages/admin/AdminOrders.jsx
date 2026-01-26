import { useState, useEffect } from 'react';
import { FaSearch, FaFilter, FaCheckCircle, FaTimesCircle, FaEnvelope, FaPhone, FaChevronDown, FaChevronUp, FaBoxOpen, FaSpinner, FaCheck, FaTimes, FaCalendarAlt, FaUserCircle } from 'react-icons/fa';
import { MdReceipt } from 'react-icons/md';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { useSocket } from '../../contexts/SocketContext';

// --- BULK SETTLE PANEL COMPONENT ---
const BulkSettlePanel = ({ orders, totalOriginal, userName, onSettle }) => {
    const [negotiatedAmount, setNegotiatedAmount] = useState(totalOriginal);
    
    // Auto-update if selection changes drastically (optional, but good practice)
    useEffect(() => {
        setNegotiatedAmount(totalOriginal);
    }, [totalOriginal]);

    const discountAmount = Math.max(0, totalOriginal - negotiatedAmount);
    const discountPercent = totalOriginal > 0 ? (discountAmount / totalOriginal) * 100 : 0;

    return (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><MdReceipt className="text-8xl text-blue-900" /></div>
            
            <div className="relative z-10">
                <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2 mb-4">
                    <FaCheckCircle className="text-blue-600" /> 
                    Mass Settlement Negotiation
                    <span className="bg-white text-blue-900 text-xs px-2 py-1 rounded border border-blue-100 uppercase tracking-wider">
                        Target: {userName} ({orders.length} orders)
                    </span>
                </h3>

                <div className="flex flex-col md:flex-row gap-8 items-end">
                    
                    {/* ORIGINAL */}
                    <div>
                        <div className="text-xs uppercase font-bold text-gray-500 mb-1">Total Original Price</div>
                        <div className="text-2xl font-serif font-bold text-gray-400 line-through decoration-red-400">
                             ${totalOriginal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>

                    {/* NEGOTIATED INPUT */}
                    <div>
                         <div className="text-xs uppercase font-bold text-blue-700 mb-1">🔥 Deal Amount</div>
                         <div className="flex items-center gap-2">
                             <span className="text-2xl font-bold text-blue-700">$</span>
                             <input 
                                type="number" 
                                value={negotiatedAmount}
                                onChange={(e) => setNegotiatedAmount(parseFloat(e.target.value) || 0)}
                                className="text-3xl font-bold text-blue-900 bg-white border border-blue-200 rounded-lg px-3 py-1 w-48 shadow-inner focus:ring-2 focus:ring-blue-500 outline-none"
                             />
                         </div>
                    </div>

                    {/* METRICS */}
                    <div className="bg-white/60 p-3 rounded-lg border border-blue-100">
                         <div className="text-xs text-gray-500 font-bold uppercase">Discount</div>
                         <div className="text-xl font-bold text-green-600">
                             {discountPercent.toFixed(2)}% <span className="text-sm text-gray-400">($ {discountAmount.toFixed(2)})</span>
                         </div>
                    </div>

                    {/* ACTION */}
                    <button 
                        onClick={() => onSettle(negotiatedAmount)}
                        className="ml-auto bg-black text-white px-8 py-3 rounded-lg font-bold uppercase tracking-wider hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center gap-2"
                    >
                        <FaCheck /> All Done
                    </button>
                </div>
            </div>
        </div>
    );
};

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [userName, setUserName] = useState("Admin");
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [tempPaymentAmount, setTempPaymentAmount] = useState("");
  const [isListView, setIsListView] = useState(false); // New state for List View toggle

  useEffect(() => {
    // Get user info for Topbar
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserName(user.name || "Admin");
    }
    fetchOrders();
  }, []);

  // Socket listener
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (data) => {
        // Since confirmOrder emits 'reviewing', and other changes might affect order status
        // We simply refetch the orders list to keep it fresh
        fetchOrders();
    };
    socket.on('diamond:update', handleUpdate);
    return () => socket.off('diamond:update', handleUpdate);
  }, [socket]);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/diamonds/admin/orders`, {
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

  const handleUpdateStatus = async (ids, status) => {
    if (!ids || ids.length === 0) return;
    
    const action = status === 'confirmed' ? 'Confirm' : 'Reject';
    if (!window.confirm(`${action} ${ids.length} order(s)? This cannot be undone.`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/diamonds/admin/orders/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ orderIds: ids, status })
      });

      const data = await response.json();
      if (data.success) {
        alert(`Orders ${status} successfully`);
        setSelectedOrderIds([]); // Clear selection
        fetchOrders(); // Refresh list
      } else {
        alert(data.message || `Failed to ${status} orders`);
      }
    } catch (err) {
      alert(`Error updating orders`);
    }
  };

  const handleEditPayment = (order) => {
      setEditingPaymentId(order._id);
      setTempPaymentAmount(order.paidAmount || 0);
  };

  const handleSavePayment = async (orderId, action = 'update', specificAmount = null) => {
      try {
        const amountToSend = specificAmount !== null ? specificAmount : tempPaymentAmount;
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/diamonds/admin/orders/update-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ 
              orderId, 
              paidAmount: amountToSend,
              action 
          })
        });
  
        const data = await response.json();
        if (data.success) {
          if (action === 'settle') {
              alert("Order settled successfully!");
          } else {
              alert("Payment updated successfully");
          }
          setEditingPaymentId(null);
          setTempPaymentAmount("");
          fetchOrders();
        } else {
          alert(data.message || "Failed to update payment");
        }
      } catch (err) {
        alert("Error saving payment");
      }
  };

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  const toggleSelectAll = () => {
    const allFilteredSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.includes(o._id));

    if (allFilteredSelected) {
      // Remove all filtered IDs from selection
      const filteredIds = filteredOrders.map(o => o._id);
      setSelectedOrderIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      // Add all filtered IDs to selection
      const filteredIds = filteredOrders.map(o => o._id);
      setSelectedOrderIds(prev => [...new Set([...prev, ...filteredIds])]);
    }
  };

  const toggleSelect = (id) => {
    if (selectedOrderIds.includes(id)) {
      setSelectedOrderIds(selectedOrderIds.filter(item => item !== id));
    } else {
      setSelectedOrderIds([...selectedOrderIds, id]);
    }
  };

  const filteredOrders = orders.filter(item => {
    // 1. Tab Filter
    const isPaid = item.paymentStatus === 'paid';
    const isRejected = item.status === 'rejected';

    if (activeTab === 'rejected') {
        if (!isRejected) return false;
    } else if (activeTab === 'active') {
        if (isPaid || isRejected) return false;
    } else if (activeTab === 'history') {
        // History = Paid (Completed) AND NOT Rejected
        if (!isPaid || isRejected) return false;
    }

    // 2. Status Filter (Dropdown)
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;

    // 3. Search Filter
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const stoneNo = item.diamondId?.['Stone No'] ? item.diamondId['Stone No'].toLowerCase() : '';
    const reportNo = item.diamondId?.['Report No'] ? item.diamondId['Report No'].toLowerCase() : '';
    const userName = item.userId?.name ? item.userId.name.toLowerCase() : '';
    const userEmail = item.userId?.email ? item.userId.email.toLowerCase() : '';
    const orderId = item._id.toLowerCase();

    return stoneNo.includes(term) || 
           reportNo.includes(term) || 
           userName.includes(term) || 
           userEmail.includes(term) ||
           orderId.includes(term);
  }).sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

  const getStatusBadge = (status) => {
    switch(status) {
      case 'confirmed':
        return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200 flex items-center gap-1"><FaCheck /> CONFIRMED</span>;
      case 'rejected':
        return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-200 flex items-center gap-1"><FaTimes /> REJECTED</span>;
      default:
        return <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold border border-yellow-200 flex items-center gap-1"><FaSpinner className="animate-spin" /> PENDING</span>;
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
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                <MdReceipt className="text-blue-600" />
                Manage Orders
                </h1>
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-200">
                {orders.length} Total
                </span>
            </div>

            <div className="flex flex-col gap-4">
              {/* Tabs */}
              <div className="flex gap-6 border-b border-gray-200">
                  <button 
                      onClick={() => setActiveTab('active')}
                      className={`pb-3 px-2 text-sm font-bold transition-all relative ${
                          activeTab === 'active' 
                          ? 'text-blue-600' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                  >
                      Active Orders 
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                          {orders.filter(o => o.paymentStatus !== 'paid' && o.status !== 'rejected').length}
                      </span>
                      {activeTab === 'active' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
                  </button>
                  <button 
                      onClick={() => setActiveTab('history')}
                      className={`pb-3 px-2 text-sm font-bold transition-all relative ${
                          activeTab === 'history' 
                          ? 'text-green-600' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                  >
                      All Done (History)
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'history' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {orders.filter(o => o.paymentStatus === 'paid' && o.status !== 'rejected').length}
                      </span>
                      {activeTab === 'history' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-green-600 rounded-t-full"></div>}
                  </button>
                  <button 
                      onClick={() => setActiveTab('rejected')}
                      className={`pb-3 px-2 text-sm font-bold transition-all relative ${
                          activeTab === 'rejected' 
                          ? 'text-red-600' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                  >
                      Rejected
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                          {orders.filter(o => o.status === 'rejected').length}
                      </span>
                      {activeTab === 'rejected' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-t-full"></div>}
                  </button>
              </div>

              {/* Search & Filter */}
              <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                {selectedOrderIds.length > 0 && (
                  <div className="flex gap-2">
                    {/* Only show Confirm button if ANY selected order is pending */}
                    {selectedOrderIds.some(id => {
                      const order = orders.find(o => o._id === id);
                      return order && order.status === 'pending';
                    }) && (
                      <button 
                          onClick={() => {
                            const pendingIds = selectedOrderIds.filter(id => {
                              const order = orders.find(o => o._id === id);
                              return order && order.status === 'pending';
                            });
                            if (pendingIds.length > 0) {
                              handleUpdateStatus(pendingIds, 'confirmed');
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-all animate-fade-in"
                      >
                          <FaCheck /> Confirm ({selectedOrderIds.filter(id => {
                            const order = orders.find(o => o._id === id);
                            return order && order.status === 'pending';
                          }).length})
                      </button>
                    )}
                    <button 
                        onClick={() => handleUpdateStatus(selectedOrderIds, 'rejected')}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-all animate-fade-in"
                    >
                        <FaTimes /> Reject ({selectedOrderIds.length})
                    </button>
                  </div>
                )}
                
                <div className="flex w-full md:w-auto bg-white border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                    <div className="relative flex-1">
                        <input 
                            type="text" 
                            placeholder="Search..." 
                            className="w-full pl-10 pr-4 py-2 border-none outline-none text-sm min-w-[200px]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                    </div>
                    <div className="border-l border-gray-200">
                         <select 
                             className="h-full px-4 py-2 text-sm bg-gray-50 outline-none text-gray-600 font-medium cursor-pointer hover:bg-gray-100 transition"
                             value={statusFilter}
                             onChange={(e) => setStatusFilter(e.target.value)}
                         >
                             <option value="all">All Status</option>
                             <option value="pending">Pending</option>
                             <option value="confirmed">Confirmed</option>
                             <option value="rejected">Rejected</option>
                         </select>
                    </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bulk Selection Header */}
          {filteredOrders.length > 0 && (
             <div className="mb-4 flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="selectAll"
                      className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      checked={filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.includes(o._id))}
                      onChange={toggleSelectAll}
                    />
                    <label htmlFor="selectAll" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                       Select All {filteredOrders.length} Orders
                    </label>
                </div>

                <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-bold text-gray-600 hover:text-gray-900">
                        <input 
                            type="checkbox"
                            className="w-4 h-4 text-black rounded border-gray-300 focus:ring-black"
                            checked={isListView}
                            onChange={(e) => setIsListView(e.target.checked)}
                        />
                        List View
                    </label>
                </div>
             </div>
          )}

          {/* SUMMARY METRICS (Dynamic Calculation) */}
          {filteredOrders.length > 0 && (
             (() => {
                // Calculation Logic: Uses SELECTED orders if any, otherwise FILTERED orders
                const ordersToCalc = selectedOrderIds.length > 0 
                    ? orders.filter(o => selectedOrderIds.includes(o._id)) 
                    : filteredOrders;

                const totals = ordersToCalc.reduce((acc, order) => {
                    if (order.status === 'rejected') return acc;
                    const total = order.totalAmount || order.diamondId?.['Amount$'] || 0;
                    const paid = order.paidAmount || 0;
                    const discount = order.discount || 0;
                    const due = Math.max(0, total - paid - discount);

                    return {
                        total: acc.total + Number(total),
                        paid: acc.paid + Number(paid),
                        discount: acc.discount + Number(discount),
                        due: acc.due + Number(due)
                    };
                }, { total: 0, paid: 0, discount: 0, due: 0 });

                // --- BULK SETTLE LOGIC Check ---
                // 1. Must have selection
                // 2. All must be same user
                // 3. All must be confirmed
                // 4. All must be unpaid (paymentStatus != 'paid')
                const selectedOrders = orders.filter(o => selectedOrderIds.includes(o._id));
                let canBulkSettle = false;
                let bulkUser = null;
                
                if (selectedOrders.length > 1) {
                    const firstUser = selectedOrders[0].userId?._id;
                    const allSameUser = selectedOrders.every(o => o.userId?._id === firstUser);
                    const allConfirmed = selectedOrders.every(o => o.status === 'confirmed');
                    const allUnpaid = selectedOrders.every(o => o.paymentStatus !== 'paid');

                    if (allSameUser && allConfirmed && allUnpaid) {
                        canBulkSettle = true;
                        bulkUser = selectedOrders[0].userId?.name;
                    }
                }

                return (
                    <div className="flex flex-col gap-4 mb-6">
                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-up">
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center md:items-start">
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Total Amount</div>
                                <div className="text-2xl font-serif font-bold text-gray-900">${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                <div className="text-[10px] text-gray-400 mt-1">
                                    {selectedOrderIds.length > 0 ? `For ${selectedOrderIds.length} Selected` : `For ${filteredOrders.length} Visible`}
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center md:items-start">
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Total Paid</div>
                                <div className="text-2xl font-serif font-bold text-green-600">${totals.paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center md:items-start">
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Total Discount</div>
                                <div className="text-2xl font-serif font-bold text-orange-500">${totals.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center md:items-start">
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Total Due</div>
                                <div className="text-2xl font-serif font-bold text-red-600">${totals.due.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </div>
                        </div>

                        {/* BULK SETTLE / NEGOTIATION PANEL */}
                        {canBulkSettle && (
                            <BulkSettlePanel 
                                orders={selectedOrders}
                                totalOriginal={totals.total} 
                                userName={bulkUser}
                                onSettle={async (negotiatedAmount) => {
                                    if(!window.confirm(`Are you sure? This will settle ${selectedOrders.length} orders for a total of $${negotiatedAmount}.`)) return;
                                    
                                    // Calculate Discount %
                                    // Discount% = (Total - Negotiated) / Total
                                    const totalOriginal = totals.total;
                                    const discountPct = (totalOriginal - negotiatedAmount) / totalOriginal;
                                    
                                    console.log(`Bulk Settle: Total ${totalOriginal}, Neg ${negotiatedAmount}, Disc% ${discountPct}`);

                                    // Process each order
                                    const promises = selectedOrders.map(async (order) => {
                                        const original = order.totalAmount || order.diamondId?.['Amount$'] || 0;
                                        const discountAmt = original * discountPct;
                                        const paidAmt = original - discountAmt;
                                        
                                        // Update Order via API (imitating handleSavePayment)
                                        // We use action='settle' but we must provide the specific paid amount calculated
                                        // Actually 'settle' action in backend calculates discount automatically if we pass paidAmount.
                                        // "If action === 'settle' ... currentPaid = paidAmount ... order.discount = total - currentPaid"
                                        // So we just need to send the calculated 'paidAmt' and action='settle'.
                                        
                                        return fetch(`${import.meta.env.VITE_API_URL}/diamonds/admin/orders/update-payment`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            credentials: 'include',
                                            body: JSON.stringify({ 
                                                orderId: order._id, 
                                                paidAmount: paidAmt,
                                                action: 'settle' 
                                            })
                                        });
                                    });

                                    await Promise.all(promises);
                                    alert('Bulk Settlement Complete!');
                                    setSelectedOrderIds([]);
                                    fetchOrders();
                                }}
                            />
                        )}
                    </div>
                );
             })()
          )}

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
              <p>{error}</p>
            </div>
          )}

          {loading ? (
             <div className="flex justify-center items-center h-64"><FaSpinner className="animate-spin text-4xl text-blue-500" /></div>
          ) : filteredOrders.length === 0 ? (
             <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
                <FaBoxOpen className="mx-auto text-4xl text-gray-200 mb-4" />
                <p className="text-gray-500">
                    {searchTerm ? `No orders found matching "${searchTerm}"` : "No orders found."}
                </p>
             </div>
          ) : isListView ? (
             <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex-1 flex flex-col min-h-0">
                 <div className="overflow-auto flex-1">
                   <table className="w-full text-[11px] text-left leading-tight relative">
                     <thead className="bg-gray-50 text-gray-500 font-medium uppercase text-[10px] border-b border-gray-300 whitespace-nowrap sticky top-0 z-10 shadow-sm">
                       <tr>
                         <th className="px-1 py-1 border-r border-gray-300 text-center w-8">#</th>
                         <th className="px-1 py-3 border-r border-gray-300">Status</th>
                         <th className="px-1 py-3 border-r border-gray-300">Company</th>
                         <th className="px-1 py-3 border-r border-gray-300">User</th>
                         <th className="px-1 py-3 border-r border-gray-300">Total</th>
                         <th className="px-1 py-3 border-r border-gray-300">Paid</th>
                         <th className="px-1 py-3 border-r border-gray-300">Disc</th>
                         <th className="px-1 py-3 border-r border-gray-300">Due</th>
                         {activeTab === 'rejected' && <th className="px-1 py-3 border-r border-gray-300">Refund</th>}
                         
                         {/* Diamond Details */}
                         <th className="px-1 py-3 border-r border-gray-300">Loc</th>
                         <th className="px-1 py-3 border-r border-gray-300">Stone ID</th>
                         <th className="px-1 py-3 border-r border-gray-300">Shape</th>
                         <th className="px-1 py-3 border-r border-gray-300">Carat</th>
                         <th className="px-1 py-3 border-r border-gray-300">Color</th>
                         <th className="px-1 py-3 border-r border-gray-300">Clarity</th>
                         <th className="px-1 py-3 border-r border-gray-300">Cut</th>
                         <th className="px-1 py-3 border-r border-gray-300">Pol</th>
                         <th className="px-1 py-3 border-r border-gray-300">Sym</th>
                         <th className="px-1 py-3 border-r border-gray-300">Fluor</th>
                         <th className="px-1 py-3 border-r border-gray-300">Lab</th>
                         <th className="px-1 py-3 border-r border-gray-300">Actions</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-300 whitespace-nowrap">
                       {filteredOrders.map((order) => {
                         const diamond = order.diamondId;
                         const user = order.userId;
                         if (!diamond) return null;
                         
                         const isSelected = selectedOrderIds.includes(order._id);
                         const isPending = order.status === 'pending';
                         const total = order.totalAmount || diamond?.['Amount$'] || 0;
                         const paid = order.paidAmount || 0;
                         const discount = order.discount || 0;
                         // If rejected, due is 0.
                         const due = order.status === 'rejected' ? 0 : (total - paid - discount);

                         return (
                           <tr key={order._id} className={`hover:bg-blue-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                             <td className="px-1 py-2 border-r border-gray-300 text-center">
                               <input 
                                 type="checkbox" 
                                 className="rounded border-gray-300 text-black focus:ring-black"
                                 checked={isSelected}
                                 onChange={() => toggleSelect(order._id)}
                               />
                             </td>
                             <td className="px-1 py-2 border-r border-gray-300">
                                {getStatusBadge(order.status)}
                             </td>
                             {/* Company Name */}
                             <td className="px-1 py-2 border-r border-gray-300 font-extrabold text-black text-xs uppercase">
                                {user?.companyName || '-'}
                             </td>
                             {/* User Name */}
                             <td className="px-1 py-2 border-r border-gray-300">
                                <div className="font-bold text-gray-800">{user?.name || 'Unknown'}</div>
                                <div className="text-[9px] text-gray-500">{user?.mobile}</div>
                             </td>
                             {/* Total */}
                             <td className="px-1 py-2 border-r border-gray-300 font-bold text-green-700">
                                ${Number(total).toFixed(2)}
                             </td>
                             {/* Paid */}
                             <td className="px-1 py-2 border-r border-gray-300 text-gray-600">
                                {paid > 0 ? `$${Number(paid).toFixed(2)}` : '-'}
                             </td>
                             {/* Discount */}
                             <td className="px-1 py-2 border-r border-gray-300 text-orange-600">
                                {discount > 0 ? `$${Number(discount).toFixed(2)}` : '-'}
                             </td>
                             {/* Due */}
                             <td className="px-1 py-2 border-r border-gray-300 font-bold text-red-600">
                                {order.status === 'rejected' ? <span className="text-gray-400 font-normal">-</span> : (due > 0.01 ? `$${Number(due).toFixed(2)}` : <span className="text-green-600 text-[10px] bg-green-100 px-1 rounded">PAID</span>)}
                             </td>
                             {/* Refund (for Rejected) */}
                             {activeTab === 'rejected' && (
                                <td className="px-1 py-2 border-r border-gray-300 font-bold text-red-600 bg-red-50">
                                    {paid > 0 ? `$${Number(paid).toFixed(2)}` : '-'}
                                </td>
                             )}
                             
                             {/* Diamond Specs */}
                             <td className="px-1 py-2 border-r border-gray-300">{diamond.Location}</td>
                             <td className="px-1 py-2 border-r border-gray-300 font-mono">{diamond['Stone No']}</td>
                             <td className="px-1 py-2 border-r border-gray-300">{diamond.Shape}</td>
                             <td className="px-1 py-2 border-r border-gray-300 font-bold">{diamond.Carats}</td>
                             <td className="px-1 py-2 border-r border-gray-300">{diamond.Color}</td>
                             <td className="px-1 py-2 border-r border-gray-300">{diamond.Clarity}</td>
                             <td className="px-1 py-2 border-r border-gray-300">{diamond.Cut}</td>
                             <td className="px-1 py-2 border-r border-gray-300">{diamond.Polish}</td>
                             <td className="px-1 py-2 border-r border-gray-300">{diamond.Sym}</td>
                             <td className="px-1 py-2 border-r border-gray-300">{diamond.Flour}</td>
                             <td className="px-1 py-2 border-r border-gray-300">{diamond.Lab}</td>
                             <td className="px-1 py-2 border-r border-gray-300 text-center">
                                {isPending ? (
                                    <div className="flex items-center gap-1 justify-center">
                                        <button onClick={() => handleUpdateStatus([order._id], 'confirmed')} className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200" title="Confirm"><FaCheck /></button>
                                        <button onClick={() => handleUpdateStatus([order._id], 'rejected')} className="p-1 bg-red-100 text-red-700 rounded hover:bg-red-200" title="Reject"><FaTimes /></button>
                                    </div>
                                ) : (
                                    <span className="text-gray-400">-</span>
                                )}
                             </td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                 </div>
             </div>
          ) : (
             <div className="grid grid-cols-1 gap-4">
                {filteredOrders.map((order) => {
                  const diamond = order.diamondId;
                  const user = order.userId;
                  const isPending = order.status === 'pending';
                  const isConfirmed = order.status === 'confirmed';
                  const total = order.totalAmount || diamond?.['Amount$'] || 0;
                  const paid = order.paidAmount || 0;
                  const discount = order.discount || 0;
                  const due = total - paid - discount;

                  if (!diamond) return null; // Skip if diamond data is missing

                  return (
                    <div key={order._id} className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${selectedOrderIds.includes(order._id) ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-100'}`}>
                      <div className="flex flex-col xl:flex-row items-stretch relative">
                         
                         {/* Selection Checkbox (Absolute Positioned) */}
                         <div className="absolute top-4 left-4 z-10">
                            <input 
                              type="checkbox" 
                              className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                              checked={selectedOrderIds.includes(order._id)}
                              onChange={() => toggleSelect(order._id)}
                            />
                         </div>
  
                         {/* Left: Diamond Info */}
                         <div className="p-6 pl-14 flex-1 border-b xl:border-b-0 xl:border-r border-gray-100">
                            {/* Top Meta Row (Order ID, Date) */}
                            <div className="flex items-center gap-3 text-xs text-gray-400 mb-2 font-mono">
                                <span className="border border-gray-200 rounded px-1.5 py-0.5">ID: {diamond['Stone No'] || order._id.slice(-6).toUpperCase()}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1"><FaCalendarAlt /> Ordered: {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}</span>
                            </div>
  
                            {/* Main Header Row */}
                            <div className="flex items-center justify-between mb-6">
                               <h3 className="text-2xl font-serif font-bold text-gray-900">
                                  {diamond.Shape} <span className="text-gray-300 mx-2">|</span> {diamond.Carats} Carat
                               </h3>
                               <div className="text-xl font-bold text-green-600">
                                  ${diamond['Amount$']}
                               </div>
                            </div>
  
                            {/* Detailed Specs Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-8 text-sm mb-6">
                               <div>
                                  <div className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-1">Color</div>
                                  <div className="font-bold text-gray-900">{diamond.Color}</div>
                               </div>
                               <div>
                                  <div className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-1">Clarity</div>
                                  <div className="font-bold text-gray-900">{diamond.Clarity}</div>
                               </div>
                               <div>
                                  <div className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-1">Cut</div>
                                  <div className="font-bold text-gray-900">{diamond.Cut || '-'}</div>
                               </div>
                               <div>
                                  <div className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-1">Lab</div>
                                  <div className="font-bold text-gray-900">{diamond.Lab}</div>
                               </div>
                               
                               <div>
                                  <div className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-1">Polish</div>
                                  <div className="font-bold text-gray-900">{diamond.Polish}</div>
                               </div>
                               <div>
                                  <div className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-1">Symmetry</div>
                                  <div className="font-bold text-gray-900">{diamond.Sym}</div>
                               </div>
                               <div>
                                  <div className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-1">Fluorescence</div>
                                  <div className="font-bold text-gray-900">{diamond.Flour}</div>
                               </div>
                               <div>
                                  <div className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-1">Location</div>
                                  <div className="font-bold text-gray-900">{diamond.Location}</div>
                               </div>

                               <div>
                                  <div className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-1">Depth %</div>
                                  <div className="font-semibold text-gray-700">{diamond['Depth %']}</div>
                               </div>
                               <div>
                                  <div className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-1">Table %</div>
                                  <div className="font-semibold text-gray-700">{diamond['Table %']}</div>
                               </div>
                               <div className="col-span-2">
                                  <div className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-1">Measurements</div>
                                  <div className="font-mono text-gray-600">{diamond.Measurements}</div>
                               </div>
                            </div>

                             {/* Report Link */}
                            <div className="text-xs">
                               <span className="text-gray-400">Report No: </span>
                               {diamond['Report No'] ? (
                                  <a href={diamond.GIALINK || `https://www.gia.edu/report-check?reportno=${diamond['Report No']}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-mono">
                                      {diamond['Report No']} 🔗
                                  </a>
                               ) : (
                                  <span className="font-mono text-gray-700">{diamond['Report No']}</span>
                               )}
                            </div>
                         </div>
  
  
                         {/* Right: Order Info & Actions */}
                         <div className="md:w-full xl:w-96 bg-gray-50 flex flex-col">
                             {/* User Details */}
                             <div className="p-6 border-b border-gray-200">
                                 <div className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-3 flex items-center justify-between">
                                     <span className="flex items-center gap-2"><FaUserCircle className="text-base" /> Ordered By</span>
                                     {getStatusBadge(order.status)}
                                 </div>
                                 <div className="mb-4">
                                      <div className="font-bold text-gray-900 text-lg">{user?.name || 'Unknown User'}</div>
                                      <div className="text-sm text-gray-500 mt-1">{user?.email}</div>
                                      <div className="text-sm text-gray-500 font-mono mt-0.5">{user?.mobile}</div>
                                 </div>
                             </div>

                             {/* Payment Details (Only for confirmed orders) */}
                             {isConfirmed && (
                                <div className="p-6 bg-blue-50 flex-1 border-b border-gray-200">
                                    <div className="text-[10px] uppercase text-blue-800 font-bold tracking-wider mb-3 flex justify-between items-center">
                                      <span>Payment Status</span>
                                      <span className={`px-2 py-0.5 rounded ${order.paymentStatus === 'paid' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>
                                        {order.paymentStatus?.toUpperCase() || 'PENDING'}
                                      </span>
                                    </div>
                                    
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Total Amount:</span>
                                            <span className="font-bold">${Number(total).toFixed(2)}</span>
                                        </div>
                                        
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600">Received:</span>
                                            {editingPaymentId === order._id ? (
                                                <input 
                                                  type="number" 
                                                  className="w-24 px-2 py-1 text-right text-sm border rounded focus:ring-1 focus:ring-black outline-none"
                                                  value={tempPaymentAmount}
                                                  onChange={(e) => setTempPaymentAmount(e.target.value)}
                                                  autoFocus
                                                />
                                            ) : (
                                                <span className="font-bold text-green-700">${Number(paid).toFixed(2)}</span>
                                            )}
                                        </div>

                                        {discount > 0 && (
                                            <div className="flex justify-between items-center text-orange-600">
                                                <span className="text-sm">Discount:</span>
                                                <span className="font-bold">${Number(discount).toFixed(2)}</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between border-t border-blue-200 pt-2 mt-2">
                                            <span className="text-gray-600 font-bold">Balance Due:</span>
                                            <span className={`font-bold ${due > 0.01 ? 'text-red-600' : 'text-green-700'}`}>
                                              ${Number(due).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Edit/Save/Full Settle Buttons */}
                                    <div className="mt-4">
                                        {editingPaymentId === order._id ? (
                                            <div className="flex gap-2 justify-end">
                                                <button 
                                                  onClick={() => setEditingPaymentId(null)}
                                                  className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs font-bold hover:bg-gray-300 transition-colors"
                                                >
                                                  Cancel
                                                </button>
                                                <button 
                                                  onClick={() => handleSavePayment(order._id, 'update', tempPaymentAmount)}
                                                  className="bg-black text-white px-3 py-1 rounded text-xs font-bold hover:bg-gray-800 transition-colors"
                                                >
                                                  Save
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between mt-4 border-t border-gray-100 pt-3">
                                                <button 
                                                  onClick={() => handleEditPayment(order)}
                                                  className="text-blue-600 text-xs font-bold hover:underline"
                                                >
                                                  EDIT DETAILS
                                                </button>
                                                
                                                {/* Only show Settle button if there is a remaining balance */}
                                                {due > 0.01 && (
                                                    <button 
                                                        onClick={() => {
                                                            if(window.confirm(`Mark this order as Fully Paid?\n\nCurrent Paid: $${paid.toFixed(2)}\nDiscount to Apply: $${due.toFixed(2)}\n\nProceed?`)) {
                                                                handleSavePayment(order._id, 'settle', paid);
                                                            }
                                                        }}
                                                        className="bg-green-600 text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm"
                                                    >
                                                        <FaCheckCircle /> ALL DONE
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                             )}
  
                             {/* Actions (Only for pending orders) */}
                             {isPending && (
                                 <div className="p-4 grid grid-cols-2 gap-3 bg-white mt-auto">
                                     <button
                                          onClick={() => handleUpdateStatus([order._id], 'confirmed')}
                                          className="flex items-center justify-center gap-2 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 font-bold py-2 rounded-lg transition-colors text-sm"
                                     >
                                          <FaCheck /> Confirm
                                     </button>
                                     <button
                                          onClick={() => handleUpdateStatus([order._id], 'rejected')}
                                          className="flex items-center justify-center gap-2 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-bold py-2 rounded-lg transition-colors text-sm"
                                     >
                                          <FaTimes /> Reject
                                     </button>
                                 </div>
                             )}
                         </div>
                      </div>
                    </div>
                  );
                })}
             </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminOrders;
