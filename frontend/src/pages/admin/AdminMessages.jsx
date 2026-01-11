import { useState, useEffect } from 'react';
import { FaTrash, FaSpinner, FaChevronLeft, FaChevronRight, FaChevronDown, FaChevronUp, FaSearch } from 'react-icons/fa';
import { MdMarkEmailRead } from 'react-icons/md';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { useSocket } from '../../contexts/SocketContext';

const AdminMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [userName, setUserName] = useState("Admin");
  
  // State for View Mode, Selection, and Expansion
  const [viewMode, setViewMode] = useState('list'); // 'grid' or 'list'
  const [selectedIds, setSelectedIds] = useState([]);
  const [expandedRows, setExpandedRows] = useState([]);

  // State for Search
  const [searchText, setSearchText] = useState('');
  const [searchField, setSearchField] = useState('all');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserName(user.name || "Admin");
    }
    fetchMessages(page);
  }, [page]);

  // Socket listener
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;
    const handleRefresh = () => {
        fetchMessages(page);
    };
    
    socket.on('message:new', handleRefresh);
    socket.on('message:update', handleRefresh);
    socket.on('message:delete', handleRefresh);
    socket.on('message:bulk-delete', handleRefresh);

    return () => {
        socket.off('message:new', handleRefresh);
        socket.off('message:update', handleRefresh);
        socket.off('message:delete', handleRefresh);
        socket.off('message:bulk-delete', handleRefresh);
    };
  }, [socket, page]);

  const fetchMessages = async (currentPage) => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: currentPage,
        limit: 10,
        search: searchText,
        field: searchField
      });

      const response = await fetch(`${import.meta.env.VITE_API_URL}/contact?${query.toString()}`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.data);
        setTotalPages(data.totalPages);
        setSelectedIds([]); 
        setExpandedRows([]); // Reset expansion
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1); // Reset to first page
    fetchMessages(1);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/contact/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      const data = await response.json();
      if (data.success) {
        setMessages(messages.filter(msg => msg._id !== id));
        setSelectedIds(selectedIds.filter(selId => selId !== id));
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Failed to delete message');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} messages?`)) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/contact/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ ids: selectedIds })
      });

      const data = await response.json();
      if (data.success) {
        setMessages(messages.filter(msg => !selectedIds.includes(msg._id)));
        setSelectedIds([]);
        alert(`${data.deletedCount} messages deleted successfully.`);
        fetchMessages(page); 
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Failed to delete messages');
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/contact/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      if (data.success) {
        setMessages(messages.map(msg => msg._id === id ? { ...msg, status: newStatus } : msg));
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  // Selection Logic
  const toggleSelection = (id) => {
    if (selectedIds.includes(id)) {
        setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
        setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === messages.length) {
        setSelectedIds([]);
    } else {
        setSelectedIds(messages.map(msg => msg._id));
    }
  };

  // Expansion Logic
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
          
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4">
             <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
               <MdMarkEmailRead className="text-blue-600" />
               Message Management
             </h1>

             {/* Search Bar */}
             <form onSubmit={handleSearch} className="flex-1 max-w-2xl w-full flex gap-2">
                <select 
                    value={searchField} 
                    onChange={(e) => setSearchField(e.target.value)}
                    className="bg-white border border-gray-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
                >
                    <option value="all">Check All</option>
                    <option value="name">Client Name</option>
                    <option value="mobile">Mobile Number</option>
                    <option value="content">ID / Report No / Msg</option>
                </select>
                <div className="relative flex-1">
                    <input 
                        type="text" 
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="Search messages..." 
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    Search
                </button>
             </form>

             <div className="flex items-center gap-3">
                {selectedIds.length > 0 && (
                    <button 
                        onClick={handleBulkDelete}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm font-medium text-sm"
                    >
                        <FaTrash /> Delete ({selectedIds.length})
                    </button>
                )}
                
                <div className="bg-white border border-gray-200 rounded-lg p-1 flex items-center shadow-sm">
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-gray-100 text-black' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        List
                    </button>
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'grid' ? 'bg-gray-100 text-black' : 'text-gray-500 hover:text-gray-900'}`}
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

          {loading && messages.length === 0 ? (
             <div className="flex justify-center items-center h-64"><FaSpinner className="animate-spin text-4xl text-blue-500" /></div>
          ) : messages.length === 0 ? (
             <div className="text-center py-20 text-gray-500 bg-white rounded-xl shadow-sm">No messages found matching criteria.</div>
          ) : (
             <>
                 {viewMode === 'list' ? (
                     // LIST VIEW
                     <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                         <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 w-12 text-center">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedIds.length === messages.length && messages.length > 0}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                        </th>
                                        <th className="px-4 py-4 w-8"></th> {/* Expansion Arrow */}
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">User</th>
                                        <th className="px-6 py-4">Subject</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {messages.map((msg) => (
                                        <>
                                            <tr key={msg._id} className={`hover:bg-blue-50/50 transition-colors ${selectedIds.includes(msg._id) ? 'bg-blue-50' : ''}`}>
                                                <td className="px-6 py-4 text-center">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedIds.includes(msg._id)}
                                                        onChange={() => toggleSelection(msg._id)}
                                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="px-4 py-4 text-center cursor-pointer text-gray-400 hover:text-blue-600" onClick={() => toggleRowExpansion(msg._id)}>
                                                    {expandedRows.includes(msg._id) ? <FaChevronUp /> : <FaChevronDown />}
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                                    <div>{new Date(msg.createdAt).toLocaleDateString()}</div>
                                                    <div className="text-xs opacity-75">{new Date(msg.createdAt).toLocaleTimeString()}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-900">{msg.name}</div>
                                                    <div className="text-gray-500 text-xs">{msg.email}</div>
                                                    <div className="text-gray-400 text-xs">{msg.mobile}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-900 truncate max-w-[200px]" title={msg.subject}>{msg.subject}</div>
                                                    {!expandedRows.includes(msg._id) && (
                                                        <div className="text-gray-500 text-xs truncate max-w-[300px]">{msg.message}</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <select
                                                        value={msg.status}
                                                        onChange={(e) => handleStatusUpdate(msg._id, e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className={`text-xs font-bold uppercase px-3 py-1 rounded-full border-none cursor-pointer outline-none transition-colors
                                                            ${msg.status === 'pending' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 
                                                              msg.status === 'in-progress' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 
                                                              'bg-green-100 text-green-700 hover:bg-green-200'}`}
                                                    >
                                                        <option value="pending">Pending</option>
                                                        <option value="in-progress">In Progress</option>
                                                        <option value="resolved">Resolved</option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleDelete(msg._id)}
                                                        className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50"
                                                        title="Delete Message"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </td>
                                            </tr>
                                            {/* Expanded Row */}
                                            {expandedRows.includes(msg._id) && (
                                                <tr className="bg-gray-50/50">
                                                    <td colSpan="7" className="px-6 py-4">
                                                        <div className="bg-white rounded border border-gray-100 p-4 shadow-sm">
                                                            <div className="flex gap-4 mb-2">
                                                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Full Message Details</span>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <div>
                                                                    <p className="text-sm text-gray-600 font-semibold">Subject</p>
                                                                    <p className="text-gray-900">{msg.subject}</p>
                                                                </div>
                                                                <div>
                                                                     <p className="text-sm text-gray-600 font-semibold">Contact</p>
                                                                     <p className="text-gray-900 text-sm">{msg.name} ({msg.mobile})</p>
                                                                </div>
                                                                <div className="md:col-span-2">
                                                                    <p className="text-sm text-gray-600 font-semibold mb-1">Message Body</p>
                                                                    <div className="bg-gray-50 p-3 rounded text-gray-800 text-sm whitespace-pre-wrap border border-gray-100">
                                                                        {msg.message}
                                                                    </div>
                                                                </div>
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
                     <div className="space-y-4">
                       <div className="flex items-center gap-2 mb-2 px-2">
                           <input 
                                type="checkbox" 
                                checked={selectedIds.length === messages.length && messages.length > 0}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                id="selectAllGrid"
                            />
                            <label htmlFor="selectAllGrid" className="text-sm font-medium text-gray-600 cursor-pointer">Select All</label>
                       </div>

                       {messages.map((msg) => (
                         <div key={msg._id} className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md ${selectedIds.includes(msg._id) ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}>
                            {/* Header Strip */}
                            <div className="bg-gray-50 px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100">
                               
                               {/* Date & User Info */}
                               <div className="flex items-center gap-4 text-sm">
                                  <input 
                                        type="checkbox" 
                                        checked={selectedIds.includes(msg._id)}
                                        onChange={() => toggleSelection(msg._id)}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                  <div className="flex items-center gap-3 md:gap-6 flex-wrap">
                                      <div className="text-gray-500 font-medium">
                                        {new Date(msg.createdAt).toLocaleDateString()}
                                        <span className="mx-2 hidden md:inline">•</span>
                                        {new Date(msg.createdAt).toLocaleTimeString()}
                                      </div>
                                      <div className="flex items-center gap-2 flex-wrap text-xs md:text-sm">
                                         <span className="font-bold text-gray-900">{msg.name}</span>
                                         <span className="text-gray-400">|</span>
                                         <span className="text-gray-600">{msg.mobile}</span>
                                         <span className="text-gray-400">|</span>
                                         <span className="text-blue-600 font-medium">{msg.email}</span>
                                      </div>
                                  </div>
                               </div>

                               {/* Actions */}
                               <div className="flex items-center gap-4 ml-8 md:ml-0">
                                  <select
                                    value={msg.status}
                                    onChange={(e) => handleStatusUpdate(msg._id, e.target.value)}
                                    className={`text-xs font-bold uppercase px-3 py-1.5 rounded-full border-none cursor-pointer outline-none transition-colors
                                      ${msg.status === 'pending' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 
                                        msg.status === 'in-progress' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 
                                        'bg-green-100 text-green-700 hover:bg-green-200'}`}
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="in-progress">In Progress</option>
                                    <option value="resolved">Resolved</option>
                                  </select>
                                  
                                  <button
                                    onClick={() => handleDelete(msg._id)}
                                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                    title="Delete Message"
                                  >
                                    <FaTrash />
                                  </button>
                               </div>
                            </div>

                            {/* Message Body */}
                            <div className="p-6 ml-8 md:ml-0">
                               <h3 className="text-lg font-bold text-gray-900 mb-2">{msg.subject}</h3>
                               <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                            </div>
                         </div>
                       ))}
                     </div>
                 )}
             </>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                  ${page === 1 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm'}`}
              >
                <FaChevronLeft className="text-xs" /> Previous
              </button>
              
              <span className="text-sm font-medium text-gray-600">
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                  ${page === totalPages 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm'}`}
              >
                Next <FaChevronRight className="text-xs" />
              </button>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default AdminMessages;
