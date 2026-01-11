import { useState, useEffect } from 'react';
import { FaSearch, FaUserCheck, FaUserEdit, FaFilter, FaCheck, FaTimes, FaMobile, FaBuilding, FaEnvelope } from 'react-icons/fa';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { useSocket } from '../../contexts/SocketContext';

export default function ManageRegistrations() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('management'); 
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  
  // Auth state
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : { name: 'Admin' };
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchUsers();
  }, []);

  // Socket Listener for Real-time Updates
  const { socket } = useSocket();
  useEffect(() => {
     if (!socket) return;
     
     const handleUserUpdate = () => {
         fetchUsers();
     };

     socket.on('user:registered', handleUserUpdate);
     socket.on('user:updated', handleUserUpdate);
     socket.on('user:deleted', handleUserUpdate);

     return () => {
         socket.off('user:registered', handleUserUpdate);
         socket.off('user:updated', handleUserUpdate);
         socket.off('user:deleted', handleUserUpdate);
     };
  }, [socket]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/users`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  // Bulk Logic
  const handleSelectUser = (id) => {
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]);
  };

  const handleSelectAll = (filteredList) => {
    if (selectedUsers.length === filteredList.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredList.map(u => u._id));
    }
  };

  const handleBulkAction = async (action, value) => {
    if (!confirm(`Are you sure you want to ${action} ${selectedUsers.length} users?`)) return;

    try {
        if (action === 'delete') {
             await Promise.all(selectedUsers.map(id => 
                 fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/users/delete`, {
                     method: 'DELETE',
                     headers: { 'Content-Type': 'application/json' },
                     credentials: 'include',
                     body: JSON.stringify({ userId: id })
                 })
             ));
        } else if (action === 'role') {
             await Promise.all(selectedUsers.map(id => 
                 fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/users/update`, {
                     method: 'PUT',
                     headers: { 'Content-Type': 'application/json' },
                     credentials: 'include',
                     body: JSON.stringify({ userId: id, role: value })
                 })
             ));
        } else if (action === 'verify') {
             await Promise.all(selectedUsers.map(id => 
                 fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/users/update`, {
                     method: 'PUT',
                     headers: { 'Content-Type': 'application/json' },
                     credentials: 'include',
                     body: JSON.stringify({ userId: id, isVerified: value })
                 })
             ));
        } else if (action === 'approve_owner') {
             await Promise.all(selectedUsers.map(id => 
                 fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/users/update`, {
                     method: 'PUT',
                     headers: { 'Content-Type': 'application/json' },
                     credentials: 'include',
                     body: JSON.stringify({ userId: id, verifiedByOwners: value })
                 })
             ));
        }

        setSelectedUsers([]);
        fetchUsers();
    } catch (error) {
        console.error("Bulk action failed:", error);
        alert("Some actions failed.");
    }
  };

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  const filteredUsers = users.filter(u => {
    // Exclude self
    if (u._id === (user.id || user._id)) return false;

    const term = searchTerm.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.companyName && u.companyName.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.mobile && u.mobile.toString().includes(term))
    );
  });

  const displayUsers = activeTab === 'authentication' 
    ? filteredUsers.filter(u => !u.verifiedByOwners) 
    : filteredUsers.filter(u => u.verifiedByOwners);

  // Determine available actions based on selection
  let availableRoles = [];
  if (selectedUsers.length === 1) {
      const selectedUser = users.find(u => u._id === selectedUsers[0]);
      if (selectedUser) {
          if (selectedUser.role === 'client') availableRoles = ['employee', 'owner'];
          else if (selectedUser.role === 'employee') availableRoles = ['client', 'owner'];
          else if (selectedUser.role === 'owner') availableRoles = ['client', 'employee'];
          else availableRoles = ['client', 'employee', 'owner']; // Fallback
      }
  } else if (selectedUsers.length > 1) {
      availableRoles = ['client', 'employee', 'owner'];
  }

  return (
    <div className="flex h-screen bg-[#FDFBF7]">
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        toggleSidebar={toggleSidebar} 
        isMobileOpen={isMobileOpen}
        closeMobileSidebar={() => setIsMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden transition-all duration-300">
        <Topbar userName={user.name} onMenuClick={() => setIsMobileOpen(true)} />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            
            <div className="mb-8 flex justify-between items-end">
               <div>
                   <h1 className="text-3xl font-serif font-bold text-gray-900">Manage Registrations</h1>
                   <p className="text-gray-500 mt-1">Manage user access and details.</p>
               </div>
            </div>

            {/* Selection Toolbar */}
            {selectedUsers.length > 0 && (
                <div className="mb-6 bg-black text-white p-4 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-4 animate-fade-in-up">
                    <div className="font-bold flex items-center gap-2">
                        <span className="bg-white text-black px-2 py-0.5 rounded-full text-xs">{selectedUsers.length}</span>
                        Users Selected
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {selectedUsers.length > 0 && selectedUsers.every(id => {
                            const u = users.find(usr => usr._id === id);
                            return u && !u.verifiedByOwners;
                        }) && (
                             <button 
                                onClick={() => handleBulkAction('approve_owner', true)}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                             >
                                <FaUserCheck /> Approve
                             </button>
                        )}
                        
                        {selectedUsers.length > 0 && selectedUsers.every(id => {
                            const u = users.find(usr => usr._id === id);
                            return u && u.verifiedByOwners;
                        }) && (
                             <button 
                                onClick={() => handleBulkAction('approve_owner', false)}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                             >
                                <FaTimes /> Unapprove
                             </button>
                        )}
                        
                        <div className="w-px h-8 bg-gray-700 mx-2"></div>
                        
                        {availableRoles.includes('client') && (
                            <button onClick={() => handleBulkAction('role', 'client')} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors">
                                Make Client
                            </button>
                        )}
                        {availableRoles.includes('employee') && (
                            <button onClick={() => handleBulkAction('role', 'employee')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors">
                                Make Employee
                            </button>
                        )}
                        {availableRoles.includes('owner') && (
                            <button onClick={() => handleBulkAction('role', 'owner')} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors">
                                Make Owner
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Toggle Tabs & Search */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                    <button
                        onClick={() => { setActiveTab('authentication'); setSelectedUsers([]); }}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'authentication' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        Authentication
                        {users.filter(u => !u.verifiedByOwners).length > 0 && (
                            <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                {users.filter(u => !u.verifiedByOwners).length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => { setActiveTab('management'); setSelectedUsers([]); }}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'management' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                         Management
                    </button>
                </div>

                <div className="relative w-full sm:w-64">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search users..." 
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 bg-white shadow-sm text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Content Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4 w-10">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-gray-300 text-black focus:ring-black"
                                        checked={selectedUsers.length > 0 && selectedUsers.length === displayUsers.length}
                                        onChange={() => handleSelectAll(displayUsers)}
                                    />
                                </th>
                                <th className="px-6 py-4">User Details</th>
                                <th className="px-6 py-4">Contact Info</th>
                                <th className="px-6 py-4">Location</th>
                                <th className="px-6 py-4">Status & Role</th>
                                <th className="px-6 py-4">Managed By</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-400">Loading users...</td></tr>
                            ) : displayUsers.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-400">No users found.</td></tr>
                            ) : displayUsers.map(u => (
                                <tr key={u._id} className={`hover:bg-gray-50 transition-colors group ${selectedUsers.includes(u._id) ? 'bg-blue-50/30' : ''}`}>
                                    <td className="px-6 py-4">
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-gray-300 text-black focus:ring-black"
                                            checked={selectedUsers.includes(u._id)}
                                            onChange={() => handleSelectUser(u._id)}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                                                u.role === 'owner' ? 'bg-purple-500' : u.role === 'employee' ? 'bg-blue-500' : 'bg-gray-400'
                                            }`}>
                                                {u.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900">{u.name}</div>
                                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                                    <FaBuilding className="w-3 h-3" /> {u.companyName || 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="text-sm text-gray-600 flex items-center gap-2">
                                                <FaEnvelope className="text-gray-400 w-3 h-3" /> {u.email}
                                            </div>
                                            <div className="text-sm text-gray-600 flex items-center gap-2">
                                                <FaMobile className="text-gray-400 w-3 h-3" /> {u.mobile}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-600">
                                            <div className="font-medium text-gray-900 mb-0.5">{u.address}</div>
                                            {u.city}, {u.country}
                                            <div className="text-xs text-gray-400">{u.zipCode}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col items-start gap-1">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                u.isVerified 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {u.isVerified ? 'Verified' : 'Pending'}
                                            </span>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                u.verifiedByOwners 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-orange-100 text-orange-800'
                                            }`}>
                                                {u.verifiedByOwners ? 'Approved' : 'Not Approved'}
                                            </span>
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 border border-gray-200 px-2 rounded bg-gray-50">
                                                {u.role}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select 
                                            value={u.managedBy || 'none'}
                                            onChange={(e) => {
                                                fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/users/update`, {
                                                    method: 'PUT',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    credentials: 'include',
                                                    body: JSON.stringify({ userId: u._id, managedBy: e.target.value })
                                                })
                                                .then(res => res.json())
                                                .then(data => {
                                                    if (data.success) {
                                                        setUsers(users.map(user => 
                                                            user._id === u._id ? { ...user, managedBy: e.target.value } : user
                                                        ));
                                                    }
                                                })
                                                .catch(err => console.error('Update error:', err));
                                            }}
                                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black"
                                        >
                                            <option value="none">None</option>
                                            <option value="bhavik">Bhavik</option>
                                            <option value="nikul">Nikul</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
