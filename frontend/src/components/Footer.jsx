import React from 'react';
import { FaWhatsapp, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';
import { useLanguage } from '../contexts/LanguageContext';

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-gray-900 text-white py-16 px-6 border-t border-gray-800">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12">
        
        {/* Global Presence */}
        <div className="text-center md:text-left">
           <h3 className="text-2xl font-serif mb-8 text-white border-b border-gray-700 inline-block pb-2">{t('footer.globalPresence')}</h3>
           <div className="flex flex-col gap-4 text-gray-300">
             <div className="flex items-center justify-center md:justify-start gap-3">
                <span className="text-xl">🇮🇳</span> 
                <span className="text-lg tracking-wide">{t('footer.india')}</span>
             </div>
             <div className="flex items-center justify-center md:justify-start gap-3">
                <span className="text-xl">🇭🇰</span> 
                <span className="text-lg tracking-wide">{t('footer.hongkong')}</span>
             </div>
             <div className="flex items-center justify-center md:justify-start gap-3">
                <span className="text-xl">🇻🇳</span> 
                <span className="text-lg tracking-wide">{t('footer.vietnam')}</span>
             </div>
           </div>
        </div>
        
        {/* Contact Details */}
        <div className="text-center md:text-right">
           <h3 className="text-2xl font-serif mb-8 text-white border-b border-gray-700 inline-block pb-2">{t('footer.contactDetails')}</h3>
           <div className="flex flex-col gap-4 text-gray-300 items-center md:items-end">
             <div className="flex items-center gap-3">
                <span className="text-lg tracking-wide hover:text-white transition-colors">+91 78745 37685</span>
                <span className="text-green-500 text-xl"><FaWhatsapp /></span>
             </div>
             <p className="text-xs text-gray-500 uppercase tracking-wider -mt-2 mb-1">(Whatsapp / Zalo / Viber)</p>

             <div className="flex items-center gap-3">
                <span className="text-lg tracking-wide hover:text-white transition-colors">+91 92744 89860</span>
                <span className="text-green-500 text-xl"><FaWhatsapp /></span>
             </div>
             <p className="text-xs text-gray-500 uppercase tracking-wider -mt-2 mb-1">(Whatsapp / Zalo / Viber)</p>

             <div className="flex items-center gap-3 mt-2">
                <span className="text-lg tracking-wide hover:text-white transition-colors">surnivasdiamond75@gmail.com</span>
                <span className="text-blue-400 text-xl"><FaEnvelope /></span>
             </div>
           </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-gray-800 text-center">
        <p className="text-gray-500 text-sm tracking-widest uppercase">
          &copy; {new Date().getFullYear()} {t('footer.rights')}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
