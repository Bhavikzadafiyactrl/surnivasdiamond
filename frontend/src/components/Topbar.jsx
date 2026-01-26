import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import logo from '../assets/logo.png';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

const Topbar = ({ userName, onMenuClick }) => {
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');

  /* API URL definition */
  // const API_URL = import.meta.env.VITE_API_URL;
  const { logout } = useAuth(); // Use context logout

  const handleLogout = async () => {
    logout();
  };

  const handleSearch = () => {
    if (searchValue.trim()) {
      navigate(`/diamonds?q=${encodeURIComponent(searchValue)}`);
    }
  };

  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-40 shadow-sm">
      
      {/* Logo & Company Name */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <button onClick={onMenuClick} className="md:hidden p-2 -ml-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>

        {/* We reuse the logo here, assuming it's appropriate for white background */}
        <Link to="/" className="flex items-center gap-3">
           <img src={logo} alt="SURNIVAS" className="h-8 w-auto object-contain" />
           <span className="font-serif font-bold text-lg tracking-widest uppercase">SURNIVAS DIAMOND</span>
        </Link>
      </div>

      {/* Middle: Search Bar */}
      <div className="flex-1 max-w-xl mx-8 hidden md:block">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <input 
               type="text" 
               placeholder={t('topbar.searchPlaceholder')}
               value={searchValue}
               onChange={(e) => setSearchValue(e.target.value)}
               className="w-full bg-gray-50 border border-gray-200 text-sm px-4 py-2.5 rounded-full outline-none focus:border-black focus:ring-1 focus:ring-black transition-all pl-10"
               onKeyDown={(e) => {
                 if (e.key === 'Enter') {
                   handleSearch();
                 }
               }}
            />
            <button 
               onClick={handleSearch}
               className="absolute left-1 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-gray-200 text-gray-400 hover:text-black transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
            </button>
          </div>
          
          {/* SEARCH Button */}
          <button
            onClick={handleSearch}
            className={`px-4 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
              searchValue.trim() 
                ? 'bg-black text-white hover:bg-gray-800' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            disabled={!searchValue.trim()}
          >
            Search
          </button>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-6">

        {/* Language Toggle */}
        <div className="flex items-center gap-2 text-xs font-bold tracking-widest mr-2">
            <button 
            onClick={() => setLanguage('en')}
            className={`transition-colors hover:text-black ${language === 'en' ? 'text-black' : 'text-gray-400'}`}
            >
            EN
            </button>
            <span className="text-gray-300">|</span>
            <button 
            onClick={() => setLanguage('vn')}
            className={`transition-colors hover:text-black ${language === 'vn' ? 'text-black' : 'text-gray-400'}`}
            >
            Vietnamese
            </button>
        </div>
        
        {/* User Profile Link */}
        <Link 
          to="/profile" 
          className="flex items-center gap-2 hover:bg-gray-50 p-1.5 rounded-lg transition-colors group"
        >
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold text-sm border border-gray-200 group-hover:border-black transition-colors">
            {userName ? userName.charAt(0).toUpperCase() : 'U'}
          </div>
          <span className="text-sm font-medium hidden lg:block group-hover:text-black text-gray-700">{userName || t('topbar.user')}</span>
        </Link>
        
        {/* Message / Contact */}
        <Link to="/contact" className="relative p-2 text-gray-500 hover:text-black transition-colors" title="Messages">
           <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
             <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
           </svg>
           {/* Notification Dot Placeholder */}
           <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </Link>

        {/* Separator */}
        <div className="h-6 w-px bg-gray-200"></div>

        {/* Logout */}
        <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all text-sm font-medium" title={t('topbar.logout')}>
           <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
           </svg>
           <span className="hidden lg:block">{t('topbar.logout')}</span>
        </button>

      </div>
    </div>
  );
};

export default Topbar;
