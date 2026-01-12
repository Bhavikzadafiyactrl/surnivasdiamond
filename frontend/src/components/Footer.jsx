import React from 'react';
import { FaWhatsapp, FaEnvelope, FaMapMarkerAlt, FaViber } from 'react-icons/fa';
import { SiZalo } from 'react-icons/si';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

const Footer = () => {
  const { t } = useLanguage();
  const { user } = useAuth();

  const showGlobalPresence = user?.verifiedByOwners;

  return (
    <footer className="bg-gray-900 text-white py-16 px-6 border-t border-gray-800">
      <div className={`max-w-7xl mx-auto grid gap-12 ${showGlobalPresence ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
        
        {/* Global Presence - Only for Verified Users */}
        {showGlobalPresence && (
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
        )}
        
        {/* Contact Details */}
        <div className={`text-center ${showGlobalPresence ? 'md:text-right' : ''}`}>
           <h3 className="text-2xl font-serif mb-8 text-white border-b border-gray-700 inline-block pb-2">{t('footer.contactDetails')}</h3>
           <div className={`flex flex-col gap-6 text-gray-300 items-center ${showGlobalPresence ? 'md:items-end' : ''}`}>
             {/* Contact 1 */}
             <div className={`flex flex-col items-center ${showGlobalPresence ? 'md:items-end' : ''} gap-2`}>
                <span className="text-lg tracking-wide hover:text-white transition-colors font-medium">+91 78745 37685</span>
                <div className="flex gap-3">
                  <a href="https://viber.click/917874537685" target="_blank" rel="noopener noreferrer" className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors" title="Viber">
                    <FaViber size={18} />
                  </a>
                  <a href="https://zalo.me/917874537685" target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors" title="Zalo">
                   <SiZalo size={18} />
                  </a>
                  <a href="https://wa.me/917874537685" target="_blank" rel="noopener noreferrer" className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors" title="WhatsApp">
                    <FaWhatsapp size={18} />
                  </a>
                </div>
             </div>

             {/* Contact 2 */}
             <div className={`flex flex-col items-center ${showGlobalPresence ? 'md:items-end' : ''} gap-2`}>
                <span className="text-lg tracking-wide hover:text-white transition-colors font-medium">+91 92744 89860</span>
                <div className="flex gap-3">
                  <a href="https://viber.click/919274489860" target="_blank" rel="noopener noreferrer" className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors" title="Viber">
                    <FaViber size={18} />
                  </a>
                  <a href="https://zalo.me/919274489860" target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors" title="Zalo">
                   <SiZalo size={18} />
                  </a>
                  <a href="https://wa.me/919274489860" target="_blank" rel="noopener noreferrer" className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors" title="WhatsApp">
                    <FaWhatsapp size={18} />
                  </a>
                </div>
             </div>

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
