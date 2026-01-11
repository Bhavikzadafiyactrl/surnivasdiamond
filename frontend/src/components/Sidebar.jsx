import { Link, useLocation } from 'react-router-dom';
import { 
  FaThLarge, 
  FaGem, 
  FaCheckCircle, 
  FaShoppingBasket, 
  FaPauseCircle, 
  FaUser,
  FaBars,
  FaHistory,
  FaClipboardList,
  FaSearch
} from 'react-icons/fa';
import { 
  MdDashboard, 
  MdMessage, 
  MdPanTool, 
  MdShoppingBasket, 
  MdReceipt, 
  MdAppRegistration 
} from 'react-icons/md';

import { useLanguage } from '../contexts/LanguageContext';

const Sidebar = ({ isCollapsed, toggleSidebar, isMobileOpen, closeMobileSidebar }) => {
  const { t } = useLanguage();
  const location = useLocation();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const role = user?.role || 'client';

  /* Translations added for Sidebar items */
  const baseMenuItems = [
    { name: t('sidebar.dashboard'), path: '/dashboard', icon: <FaThLarge /> },
    { name: t('sidebar.diamondSearch'), path: '/diamonds', icon: <FaSearch /> },
    { name: t('sidebar.confirmation'), path: '/confirmation', icon: <FaCheckCircle /> },
    { name: t('sidebar.basket'), path: '/basket', icon: <FaShoppingBasket /> },
    { name: t('sidebar.holdDiamonds'), path: '/held-diamonds', icon: <FaPauseCircle /> },
    { name: t('sidebar.orderHistory'), path: '/order-history', icon: <FaHistory /> },
    { name: t('sidebar.profile'), path: '/profile', icon: <FaUser /> }
  ];

  const adminMenuItems = [
    { name: t('sidebar.dashboardManagement'), path: '/admin/dashboard-management', icon: <MdDashboard /> },
    { name: t('sidebar.messageManager'), path: '/admin/messages', icon: <MdMessage /> },
    { name: t('sidebar.manageHoldRequests'), path: '/admin/hold-requests', icon: <MdPanTool /> },
    { name: t('sidebar.manageOrders'), path: '/admin/orders', icon: <MdReceipt /> },
    { name: t('sidebar.totalOrdersAdmin'), path: '/admin/all-orders', icon: <FaClipboardList /> },
    { name: t('sidebar.manageDiamondList'), path: '/admin/diamond-list', icon: <FaGem /> },
    { name: t('sidebar.manageRegistration'), path: '/admin/registrations', icon: <MdAppRegistration /> }
  ];

  const menuItems = ['owner', 'employee'].includes(role) 
    ? [...baseMenuItems, { type: 'divider' }, ...adminMenuItems]
    : baseMenuItems;

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          onClick={closeMobileSidebar}
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-50 md:relative h-full bg-black text-white transition-all duration-300 ease-in-out flex flex-col border-r border-gray-800
        ${isCollapsed ? 'w-16' : 'w-64'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
      
      {/* Toggle Button Container */}
      <div className="h-16 flex items-center justify-center border-b border-gray-800">
        <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-gray-800 transition-colors">
           <FaBars className="w-6 h-6" />
        </button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 py-6 space-y-2 overflow-y-auto">
        {menuItems.map((item, index) => {
          if (item.type === 'divider') {
             return <div key={`divider-${index}`} className="h-px bg-gray-800 my-2 mx-4" />;
          }

          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center py-2 rounded-lg transition-all group ${
                isCollapsed ? 'justify-center mx-auto w-9' : 'px-3 mx-2'
              } ${
                location.pathname === item.path 
                  ? 'bg-white text-black font-medium' 
                  : 'text-gray-400 hover:bg-gray-900 hover:text-white'
              }`}
              title={isCollapsed ? item.name : ''}
            >
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-lg">
                {item.icon}
              </div>
              
              <span className={`text-sm whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 ml-3'}`}>
                {item.name}
              </span>
              
              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-16 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>
      
      

    </div>
    </>
  );
};

export default Sidebar;
