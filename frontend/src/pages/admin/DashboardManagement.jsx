import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { FaPlus, FaEdit, FaTrash, FaToggleOn, FaToggleOff, FaImage, FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

// Helper function to check if a file is a video
const isVideoFile = (url) => {
  if (!url) return false;
  const videoExtensions = ['.mp4', '.mov', '.webm', '.avi'];
  return videoExtensions.some(ext => url.toLowerCase().endsWith(ext));
};

const AdminDiamondCard = ({ diamond, onToggle, onEdit, onDelete }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const images = diamond.imageUrls && diamond.imageUrls.length > 0 
      ? diamond.imageUrls 
      : [diamond.imageUrl];

  const nextImage = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const getStatusColor = (status) => {
    switch(((status || '').toLowerCase())) {
        case 'available': return 'bg-green-100 text-green-700 border-green-200';
        case 'hold': return 'bg-red-100 text-red-700 border-red-200';
        case 'sold': return 'bg-gray-100 text-gray-700 border-gray-200';
        case 'reviewing': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        case 'confirmed': return 'bg-purple-100 text-purple-700 border-purple-200';
        default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 flex flex-col group">
      <div className="relative h-64 bg-white">
        {isVideoFile(images[currentImageIndex]) ? (
          <video 
            src={`${import.meta.env.VITE_API_URL}${images[currentImageIndex]}`}
            className="w-full h-full object-contain transition-opacity duration-300 rounded-2xl"
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <img 
            src={`${import.meta.env.VITE_API_URL}${images[currentImageIndex]}`}
            alt={diamond.title}
            className="w-full h-full object-contain transition-opacity duration-300 rounded-2xl"
          />
        )}
        
        {/* Status Badge */}
        <div className="absolute top-2 left-2 z-20">
            <span className={`px-2 py-1 rounded-md text-xs font-bold border ${getStatusColor(diamond.status)} uppercase shadow-sm`}>
                {diamond.status || 'N/A'}
            </span>
        </div>

        {/* Toggle Button - Absolute Top Right */}
        <div className="absolute top-2 right-2 flex gap-2 z-20">
          <button
            onClick={() => onToggle(diamond._id)}
            className={`p-2 rounded-full ${diamond.isActive ? 'bg-green-500' : 'bg-gray-400'} text-white shadow-md hover:opacity-90 transition-opacity`}
            title={diamond.isActive ? "Deactivate" : "Activate"}
          >
            {diamond.isActive ? <FaToggleOn /> : <FaToggleOff />}
          </button>
        </div>

        {/* Carousel Controls */}
        {images.length > 1 && (
            <>
                {/* Arrows */}
                <button 
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                >
                    <FaChevronLeft size={12} />
                </button>
                <button 
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                >
                    <FaChevronRight size={12} />
                </button>

                {/* Dots */}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                    {images.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentImageIndex(idx); }}
                            className={`rounded-full transition-all duration-300 shadow-sm ${
                                idx === currentImageIndex 
                                    ? 'w-2 h-2 bg-black border border-white' 
                                    : 'w-1.5 h-1.5 bg-gray-300/80 hover:bg-gray-400'
                            }`}
                        />
                    ))}
                </div>
            </>
        )}
      </div>
{/* ... (rest of the card content) ... */}
      
      <div className="w-full p-4 flex flex-col justify-center">
          {/* Details List */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-4">
              <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">Stone ID</span>
                  <Link 
                    to={`/diamonds?q=${diamond.stoneId || ''}`}
                    className="font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    {diamond.stoneId || '-'}
                  </Link>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">Report No</span>
                  <span className="font-semibold text-blue-600">
                    {diamond.reportNo ? (
                      <a href={diamond.giaLink || `https://www.gia.edu/report-check?reportno=${diamond.reportNo}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {diamond.reportNo || '-'} 🔗
                      </a>
                    ) : (
                      diamond.reportNo || '-'
                    )}
                  </span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">Shape</span>
                  <span className="font-bold text-gray-900">{diamond.shape || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">Carat</span>
                  <span className="font-bold text-gray-900">{diamond.carats || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">Color</span>
                  <span className="font-bold text-gray-900">{diamond.color || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">Clarity</span>
                  <span className="font-bold text-gray-900">{diamond.clarity || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">Cut</span>
                  <span className="font-bold text-gray-900">{diamond.cut || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">Polish</span>
                  <span className="font-bold text-gray-900">{diamond.polish || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">Symmetry</span>
                  <span className="font-bold text-gray-900">{diamond.symmetry || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">Fluorescence</span>
                  <span className="font-bold text-gray-900">{diamond.fluorescence || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">Measurement</span>
                  <span className="font-bold text-gray-900">{diamond.measurement || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">Depth %</span>
                  <span className="font-bold text-gray-900">{diamond.depth || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">Table %</span>
                  <span className="font-bold text-gray-900">{diamond.table || '-'}</span>
              </div>
              <div className="flex justify-between">
                  <span className="text-gray-500">Lab</span>
                  <span className="font-bold text-gray-900">{diamond.cert || '-'}</span>
              </div>
          </div>
          
          {diamond.price && (
              <div className="pt-2 border-t border-gray-200 text-right mb-4">
                  <span className="text-lg font-bold text-green-600">${Number(diamond.price).toFixed(2)}</span>
              </div>
          )}

        <div className="flex gap-2 mt-auto">
          <button
            onClick={() => onEdit(diamond)}
            className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors"
          >
            <FaEdit /> Edit
          </button>
          <button
            onClick={() => onDelete(diamond._id)}
            className="flex-1 px-3 py-2 bg-red-500 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-red-600 transition-colors"
          >
            <FaTrash /> Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const DashboardManagement = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [diamonds, setDiamonds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDiamond, setEditingDiamond] = useState(null);
  const [formData, setFormData] = useState({
    reportNo: ''
  });
  
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // State for images
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : { name: 'Guest' };
  const API_URL = import.meta.env.VITE_API_URL;

  // Dashboard Video State
  const [dashboardVideoUrl, setDashboardVideoUrl] = useState('');
  const [newVideoFile, setNewVideoFile] = useState(null);
  const [videoUploading, setVideoUploading] = useState(false);

  useEffect(() => {
    fetchDiamonds();
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
      try {
          const response = await fetch(`${API_URL}/config`, { credentials: 'include' });
          const data = await response.json();
          if (data.success && data.data) {
              setDashboardVideoUrl(data.data.dashboardVideoUrl);
          }
      } catch (err) {
          console.error("Failed to fetch config", err);
      }
  };

  const handleVideoFileChange = (e) => {
      if (e.target.files && e.target.files[0]) {
          setNewVideoFile(e.target.files[0]);
      }
  };

  const handleUploadVideo = async () => {
      if (!newVideoFile) return;
      setVideoUploading(true);
      
      const formData = new FormData();
      formData.append('video', newVideoFile);

      try {
          const response = await fetch(`${API_URL}/config/video`, {
              method: 'POST',
              credentials: 'include',
              body: formData
          });
          const data = await response.json();
          if (data.success) {
              setDashboardVideoUrl(data.data.dashboardVideoUrl);
              setNewVideoFile(null);
              alert('Dashboard Video Updated Successfully! 🎬');
          } else {
              alert(data.message || 'Upload failed');
          }
      } catch (error) {
          console.error('Upload error:', error);
          alert('Upload failed');
      } finally {
          setVideoUploading(false);
      }
  };

  const fetchDiamonds = async () => {
    try {
      // const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/trending-diamonds/admin`, {
        credentials: 'include' // Important for Geo-Bypass Cookie
      });
      const data = await response.json();
      if (data.success) {
        setDiamonds(data.data);
      }
    } catch (error) {
      console.error('Fetch diamonds error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter Logic
  const filteredDiamonds = diamonds.filter(diamond => {
      const matchSearch = (diamond.reportNo || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (diamond.stoneId || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = filterStatus === 'all' || (diamond.status || '').toLowerCase() === filterStatus.toLowerCase();

      return matchSearch && matchStatus;
  });

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setNewFiles(files);
      
      const previews = files.map(file => ({
        url: URL.createObjectURL(file),
        type: file.type
      }));
      setNewPreviews(previews);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formDataToSend = new FormData();
    formDataToSend.append('reportNo', formData.reportNo);
    
    // Append multiple files
    if (newFiles.length > 0) {
      newFiles.forEach(file => {
        formDataToSend.append('images', file);
      });
    } else if (!editingDiamond) {
      alert('At least one image is required!');
      return;
    }

    try {
      const token = localStorage.getItem('token'); // Keep for now if used elsewhere or remove
      const url = editingDiamond 
        ? `${API_URL}/trending-diamonds/${editingDiamond._id}`
        : `${API_URL}/trending-diamonds`;
      
      const response = await fetch(url, {
        method: editingDiamond ? 'PUT' : 'POST',
        credentials: 'include',
        body: formDataToSend
      });

      const data = await response.json();
      if (data.success) {
        alert(editingDiamond ? 'Trending diamond updated!' : 'Trending diamond created!');
        fetchDiamonds();
        closeModal();
      } else {
        alert(data.message || 'Error saving diamond');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Error saving diamond');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this diamond?')) return;

    try {
      // const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/trending-diamonds/${id}`, {
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

  const handleToggle = async (id) => {
    try {
      // const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/trending-diamonds/${id}/toggle`, {
        method: 'PATCH',
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        fetchDiamonds();
      }
    } catch (error) {
      console.error('Toggle error:', error);
    }
  };

  const openModal = (diamond = null) => {
    if (diamond) {
      setEditingDiamond(diamond);
      setFormData({
        reportNo: diamond.reportNo || ''
      });
      
      // Handle legacy imageUrl vs imageUrls
      const images = diamond.imageUrls && diamond.imageUrls.length > 0 
        ? diamond.imageUrls 
        : (diamond.imageUrl ? [diamond.imageUrl] : []);
      
      setExistingImages(images);
    } else {
      setEditingDiamond(null);
      setFormData({
        reportNo: ''
      });
      setExistingImages([]);
    }
    setNewFiles([]);
    setNewPreviews([]);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDiamond(null);
    setNewFiles([]);
    setNewPreviews([]);
    setExistingImages([]);
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

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* --- DASHBOARD VIDEO CONFIG SECTION --- */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-200">
                <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Dashboard Greeting Video</h2>
                
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Video Preview */}
                    <div className="w-full md:w-1/2 aspect-video bg-black rounded-xl overflow-hidden relative group">
                        {dashboardVideoUrl ? (
                             <video 
                                src={`${import.meta.env.VITE_API_URL}${dashboardVideoUrl}`}
                                className="w-full h-full object-contain"
                                controls
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 flex-col">
                                <FaImage size={40} className="mb-2 opacity-50"/>
                                <span className="text-sm">No Video Set</span>
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="w-full md:w-1/2 space-y-4">
                        <p className="text-sm text-gray-600">
                            Upload a video to be shown on the right side of the Client Dashboard.
                            <br/>Supported formats: MP4, MOV, WEBM. Max 100MB.
                        </p>

                        <div className="flex gap-2 items-center">
                            <input
                                type="file"
                                accept="video/*"
                                onChange={handleVideoFileChange}
                                className="hidden"
                                id="dashboard-video-upload"
                            />
                            <label 
                                htmlFor="dashboard-video-upload" 
                                className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 text-sm font-medium transition-colors"
                            >
                                {newVideoFile ? newVideoFile.name : 'Choose Video File'}
                            </label>

                            {newVideoFile && (
                                <button
                                    onClick={handleUploadVideo}
                                    disabled={videoUploading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {videoUploading ? 'Uploading...' : 'Upload & Save'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- EXISTING DIAMOND LIST --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Management</h1>
              
              <div className="flex flex-wrap items-center gap-3">
                  {/* Search Bar */}
                  <input 
                      type="text" 
                      placeholder="Search Report No or Stone ID..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black outline-none"
                  />
                  
                  {/* Status Filter */}
                  <select 
                      value={filterStatus} 
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black outline-none bg-white"
                  >
                      <option value="all">All Status</option>
                      <option value="available">Available</option>
                      <option value="hold">Hold</option>
                      <option value="reviewing">Reviewing</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="sold">Sold</option>
                  </select>

                  <button 
                    onClick={() => openModal()}
                    className="px-4 py-2 bg-black text-white rounded-lg flex items-center gap-2 hover:bg-gray-800"
                  >
                    <FaPlus /> Add Trending Diamond
                  </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDiamonds.map((diamond) => (
                  <AdminDiamondCard 
                    key={diamond._id} 
                    diamond={diamond}
                    onToggle={handleToggle}
                    onEdit={openModal}
                    onDelete={handleDelete} 
                  />
                ))}
              </div>
            )}

            {!loading && filteredDiamonds.length === 0 && (
              <div className="text-center py-20 text-gray-500">
                No diamonds found matching your filters.
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {editingDiamond ? 'Edit' : 'Add'} Trending Diamond
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium mb-2">Diamond Media (Images/Videos) *</label>
                  
                  {/* Existing Images Grid */}
                  {existingImages.length > 0 && (
                     <div className="mb-4">
                         <p className="text-xs text-gray-500 mb-2">Existing Media:</p>
                         <div className="grid grid-cols-4 gap-2">
                             {existingImages.map((url, idx) => (
                                 <div key={idx} className="relative group">
                                     {isVideoFile(url) ? (
                                       <video 
                                         src={`${import.meta.env.VITE_API_URL}${url}`}
                                         className="h-20 w-full object-cover rounded-lg border"
                                         autoPlay
                                         loop
                                         muted
                                         playsInline
                                       />
                                     ) : (
                                       <img 
                                          src={`${import.meta.env.VITE_API_URL}${url}`}
                                          className="h-20 w-full object-cover rounded-lg border"
                                       />
                                     )}
                                 </div>
                             ))}
                         </div>
                     </div>
                  )}

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    {newPreviews.length > 0 ? (
                      <div className="relative">
                        <div className="grid grid-cols-4 gap-2">
                            {newPreviews.map((preview, idx) => (
                                preview.type?.startsWith('video') ? (
                                  <video key={idx} src={preview.url} className="h-20 w-full object-cover rounded-lg" autoPlay loop muted playsInline />
                                ) : (
                                  <img key={idx} src={preview.url} alt="New Preview" className="h-20 w-full object-cover rounded-lg" />
                                )
                            ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => { setNewPreviews([]); setNewFiles([]); }}
                          className="mt-2 px-3 py-1 bg-red-500 text-white rounded-lg text-sm"
                        >
                          Clear Selection
                        </button>
                      </div>
                    ) : (
                      <div>
                        <FaImage className="mx-auto text-4xl text-gray-400 mb-2" />
                        <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          onChange={handleImageChange}
                          className="hidden"
                          id="image-upload"
                        />
                        <label htmlFor="image-upload" className="px-4 py-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 inline-block">
                          Choose Files
                        </label>
                      </div>
                    )}
                  </div>
                  {!editingDiamond && newFiles.length === 0 && <p className="text-red-500 text-xs mt-1">Image is required</p>}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Report No *</label>
                    <input
                      type="text"
                      required
                      value={formData.reportNo}
                      onChange={(e) => setFormData({...formData, reportNo: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-black"
                      placeholder="Enter Report Number from diamond inventory"
                    />
                    <p className="text-xs text-gray-500 mt-1">This will fetch diamond details from your inventory</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                  >
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

export default DashboardManagement;
