import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { FaGem, FaShoppingBasket, FaHistory, FaSearch, FaArrowRight, FaCheck, FaTimes, FaMoneyBillWave, FaPause, FaBox, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { MdReceipt, MdDoneAll, MdCheckCircle } from 'react-icons/md';
import { Link } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useLanguage } from '../contexts/LanguageContext';

// Helper function to check if a file is a video
const isVideoFile = (url) => {
  if (!url) return false;
  const videoExtensions = ['.mp4', '.mov', '.webm', '.avi'];
  return videoExtensions.some(ext => url.toLowerCase().endsWith(ext));
};

// --- Sub-Components ---

const StatBox = ({ title, value, icon, colorClass, link }) => (
  <div className={`bg-white rounded-xl p-4 shadow-sm border ${colorClass} relative h-28 flex flex-col justify-between`}>
    <div className="flex justify-between items-start">
       <h4 className="text-gray-400 font-bold text-xs uppercase tracking-wide">{title}</h4>
       <div className="text-lg opacity-80">{icon}</div>
    </div>
    <div className="text-3xl font-bold text-gray-800">
      {value}
    </div>
    {link && <Link to={link} className="absolute inset-0" />}
  </div>
);

const MoneyCard = ({ title, value, bgClass, textClass, icon }) => (
  <div className={`${bgClass} rounded-xl p-4 h-24 flex flex-col justify-between relative`}>
      <div className="flex justify-between items-start">
           <h4 className={`font-bold text-xs uppercase tracking-wide ${textClass}`}>{title}</h4>
           <div className={`${textClass} opacity-80`}>{icon}</div>
      </div>
      <div className={`text-2xl font-bold ${textClass}`}>
          {value}
      </div>
  </div>
);

const TrendingDiamondCard = ({ diamond }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const images = diamond.imageUrls && diamond.imageUrls.length > 0 
      ? diamond.imageUrls 
      : [diamond.imageUrl];

  const nextImage = (e) => {
      e.preventDefault();
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e) => {
      e.preventDefault();
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow flex flex-col group">
          <div className="w-full h-64 bg-white relative">
              {isVideoFile(images[currentImageIndex]) ? (
                <video 
                    src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${images[currentImageIndex]}`}
                    className="w-full h-full object-contain absolute inset-0 transition-opacity duration-300 rounded-2xl"
                    autoPlay
                    loop
                    muted
                    playsInline
                />
              ) : (
                <img 
                    src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${images[currentImageIndex]}`}
                    alt={diamond.title}
                    className="w-full h-full object-contain absolute inset-0 transition-opacity duration-300 rounded-2xl"
                />
              )}
              
              {/* Navigation controls - only if multiple images */}
              {images.length > 1 && (
                  <>
                      {/* Arrows - Visible on Hover */}
                      <button 
                          onClick={prevImage}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                      >
                          <FaChevronLeft size={14} />
                      </button>
                      <button 
                          onClick={nextImage}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                      >
                          <FaChevronRight size={14} />
                      </button>

                      {/* Pagination Dots */}
                      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                          {images.map((_, idx) => (
                              <button
                                  key={idx}
                                  onClick={(e) => { e.preventDefault(); setCurrentImageIndex(idx); }}
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
          
          <div className="w-full p-4 flex flex-col justify-center">
              {/* Details List */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
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
                            <a 
                              href={diamond.giaLink || `https://www.gia.edu/report-check?reportno=${diamond.reportNo}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="hover:underline cursor-pointer"
                              onClick={(e) => e.stopPropagation()} // Prevent card click if any
                            >
                              {diamond.reportNo}
                            </a>
                        ) : (
                          '-'
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
                  <div className="mt-3 pt-2 border-t border-gray-200">
                      <div className="text-right mb-3">
                          <span className="text-lg font-bold text-green-600">${diamond.price.toFixed(2)}</span>
                      </div>
                      <Link 
                        to={`/diamonds?q=${diamond.reportNo || ''}`}
                        className="block w-full py-2 bg-black text-white text-center rounded-lg font-medium hover:bg-gray-800 transition-colors"
                      >
                        Buy
                      </Link>
                  </div>
              )}
          </div>
      </div>
  );
};


const Dashboard = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trendingDiamonds, setTrendingDiamonds] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [dashboardVideoUrl, setDashboardVideoUrl] = useState('');

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : { name: 'Guest' };

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);
  const { socket } = useSocket();
  const { t } = useLanguage();

  useEffect(() => {
    fetchStats();
    fetchTrendingDiamonds();
    fetchConfig();

    // Socket listeners for real-time updates
    if (socket) {
      // Listen for order changes
      socket.on('orderUpdated', () => {
        console.log('📊 Order updated - refreshing stats');
        fetchStats();
      });

      // Listen for trending diamond changes
      socket.on('trendingDiamondUpdated', () => {
        console.log('💎 Trending diamonds updated - refreshing');
        fetchTrendingDiamonds();
      });

      // Cleanup listeners
      return () => {
        socket.off('orderUpdated');
        socket.off('trendingDiamondUpdated');
      };
    }
  }, [socket]);

  const fetchStats = async () => {
      try {
          // const token = localStorage.getItem('token'); // Removed
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/diamonds/admin/stats`, {
             credentials: 'include'
          });
          const data = await response.json();
          if (data.success) {
              setStats(data.data);
          }
      } catch (err) {
          console.error("Failed to fetch dashboard stats", err);
      } finally {
          setLoading(false);
      }
  };

  const fetchTrendingDiamonds = async () => {
      try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/trending-diamonds`, {
            credentials: 'include' // Important for Geo-Bypass Cookie
          });
          const data = await response.json();
          if (data.success) {
              setTrendingDiamonds(data.data);
          }
      } catch (err) {
          console.error("Failed to fetch trending diamonds", err);
      } finally {
          setTrendingLoading(false);
      }
  };

  const fetchConfig = async () => {
      try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/config`, { credentials: 'include' });
          const data = await response.json();
          if (data.success && data.data) {
              setDashboardVideoUrl(data.data.dashboardVideoUrl);
          }
      } catch (err) {
          console.error("Failed to fetch config", err);
      }
  };

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

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Header */}
            <div className="border-l-4 border-black pl-4 mb-6">
                 <h1 className="text-xl font-bold text-gray-900 inline-block">{t('dashboardPage.overview')}</h1>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
                </div>
            ) : (
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* LEFT COLUMN: 3x3 STATS GRID (50%) */}
                    <div className="w-full lg:w-1/2">
                        {stats && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <StatBox 
                                    title={t('dashboardPage.stats.totalOrders')}
                                    value={stats.totalOrders} 
                                    icon={<FaBox/>} 
                                    link={user.role === 'client' ? '/order-history' : '/admin/all-orders'}
                                />
                                <StatBox 
                                    title={t('dashboardPage.stats.allDone')} 
                                    value={stats.allDone} 
                                    icon={<MdCheckCircle/>} 
                                    link={user.role === 'client' ? '/order-history' : '/admin/all-orders'}
                                />
                                <StatBox 
                                    title={t('dashboardPage.stats.confirmed')} 
                                    value={stats.confirmed} 
                                    icon={<FaGem/>} 
                                    link={user.role === 'client' ? '/order-history' : '/admin/all-orders'}
                                />
                                <StatBox 
                                    title={t('dashboardPage.stats.rejected')} 
                                    value={stats.rejected} 
                                    icon={<FaTimes/>} 
                                    link={user.role === 'client' ? '/order-history' : '/admin/all-orders'}
                                />
                                <StatBox 
                                    title={t('dashboardPage.stats.basket')} 
                                    value={stats.basketCount} 
                                    icon={<FaShoppingBasket/>} 
                                    link="/basket"
                                />
                                <StatBox 
                                    title={t('dashboardPage.stats.hold')} 
                                    value={stats.holdCount} 
                                    icon={<FaPause/>} 
                                    link={user.role === 'client' ? '/held-diamonds' : '/admin/hold-requests'}
                                />
                                <MoneyCard 
                                    title={t('dashboardPage.stats.totalPaid')} 
                                    value={`$${stats.totalPaid.toFixed(2)}`} 
                                    bgClass="bg-green-50 border-green-400 border-b-4" 
                                    textClass="text-green-700"
                                    icon={<FaMoneyBillWave />}
                                />
                                <MoneyCard 
                                    title={t('dashboardPage.stats.totalDue')} 
                                    value={`$${stats.totalDue.toFixed(2)}`} 
                                    bgClass="bg-red-50 border-red-400 border-b-4" 
                                    textClass="text-red-700"
                                    icon={<FaMoneyBillWave />}
                                />
                                <MoneyCard 
                                    title={t('dashboardPage.stats.discount')} 
                                    value={`$${stats.totalDiscount.toFixed(2)}`} 
                                    bgClass="bg-purple-50 border-purple-400 border-b-4" 
                                    textClass="text-purple-700"
                                    icon={<FaMoneyBillWave />}
                                />
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: GREETING VIDEO (50%) */}
                    <div className="w-full lg:w-1/2">
                        <div className="bg-black rounded-xl overflow-hidden shadow-lg h-full min-h-[300px] flex items-center justify-center relative">
                            {dashboardVideoUrl ? (
                                <video 
                                    src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${dashboardVideoUrl}`}
                                    className="w-full h-full object-cover absolute inset-0"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    controls={false} // Clean look
                                />
                            ) : (
                                <div className="text-white/30 flex flex-col items-center">
                                    <FaGem size={48} className="mb-2"/>
                                    <p>Welcome to Surnivash Diamond</p>
                                </div>
                            )}
                            
                            {/* Overlay Text (Optional) */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
                                <h2 className="text-2xl font-bold mb-1 drop-shadow-md">{t('dashboardPage.welcome')} {user ? user.name : 'Guest'}</h2>
                                <p className="text-sm opacity-80">{t('dashboardPage.checkOut')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Trending Diamonds Section - Only for Clients */}
            {user.role === 'client' && (
              <div className="mt-8">
                <h2 className="text-xl font-bold text-gray-900 border-l-4 border-black pl-4 mb-4">{t('dashboardPage.trending')}</h2>
                
                {trendingLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : trendingDiamonds.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trendingDiamonds.map((diamond) => (
                      <TrendingDiamondCard key={diamond._id} diamond={diamond} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-500">
                    {t('dashboardPage.noTrending')}
                  </div>
                )}
              </div>
            )}
            
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;