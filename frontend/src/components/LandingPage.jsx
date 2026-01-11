import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import logo from '../assets/logo.png'
import Footer from './Footer'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'

// Import Diamond Cut Videos
import roundVideo from '../assets/Round-1.mp4'
import cushionVideo from '../assets/Cushion-Rectangular-1.mp4'
import ovalVideo from '../assets/Oval-cut.mp4'
import pearVideo from '../assets/Pear-1.mp4'
import emeraldVideo from '../assets/Emerald-1.mp4'
import marquiseVideo from '../assets/Marquise.mp4'
import heartVideo from '../assets/Heart-1.mp4'

const DiamondShapeSelector = ({ t }) => {
  const [activeShape, setActiveShape] = useState(0);

  const shapes = [
    { id: 'round', name: t('shapes.round'), video: roundVideo, desc: t('shapes.details.round.desc'), chars: t('shapes.details.round.chars') },
    { id: 'cushion', name: t('shapes.cushion'), video: cushionVideo, desc: t('shapes.details.cushion.desc'), chars: t('shapes.details.cushion.chars') },
    { id: 'oval', name: t('shapes.oval'), video: ovalVideo, desc: t('shapes.details.oval.desc'), chars: t('shapes.details.oval.chars') },
    { id: 'pear', name: t('shapes.pear'), video: pearVideo, desc: t('shapes.details.pear.desc'), chars: t('shapes.details.pear.chars') },
    { id: 'emerald', name: t('shapes.emerald'), video: emeraldVideo, desc: t('shapes.details.emerald.desc'), chars: t('shapes.details.emerald.chars') },
    { id: 'marquise', name: t('shapes.marquise'), video: marquiseVideo, desc: t('shapes.details.marquise.desc'), chars: t('shapes.details.marquise.chars') },
    { id: 'heart', name: t('shapes.heart'), video: heartVideo, desc: t('shapes.details.heart.desc'), chars: t('shapes.details.heart.chars') },
  ];

  const activeData = shapes[activeShape];

  return (
    <div className="flex flex-col gap-12">
      {/* Visual Display (50/50 Split) */}
      <div className="grid lg:grid-cols-2 gap-12 items-center bg-white p-6 md:p-12 rounded-3xl shadow-sm border border-gray-100">
        {/* Left: Video */}
        <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl shadow-black/20 group">
          <video 
            key={activeData.id} // Key change forces reload for new video
            src={activeData.video} 
            className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105"
            autoPlay 
            loop 
            muted 
            playsInline
          />
        </div>

        {/* Right: Details */}
        <div className="text-left space-y-6 animate-fade-in" key={`${activeData.id}-text`}>
           <div>
             <h3 className="text-3xl md:text-4xl font-serif mb-2">{activeData.name}</h3>
             <div className="w-16 h-1 bg-black/80"></div>
           </div>
           
           <p className="text-lg text-gray-700 leading-relaxed font-light">
             {activeData.desc}
           </p>

           <div className="space-y-3 pt-4">
             <h4 className="text-xs font-bold tracking-[0.2em] uppercase text-gray-400">CHARACTERISTICS</h4>
             <ul className="grid grid-cols-1 gap-2">
               {Array.isArray(activeData.chars) && activeData.chars.map((char, i) => (
                 <li key={i} className="flex items-center gap-3 text-gray-800">
                   <span className="w-1.5 h-1.5 rounded-full bg-black/40"></span>
                   {char}
                 </li>
               ))}
             </ul>
           </div>
        </div>
      </div>

      {/* Navigation Strip */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        {shapes.map((shape, idx) => (
          <button
            key={shape.id}
            onClick={() => setActiveShape(idx)}
            className={`px-4 py-2 rounded-full text-sm font-medium tracking-wide transition-all duration-300 ${
              activeShape === idx 
                ? 'bg-black text-white scale-105 shadow-md' 
                : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-black'
            }`}
          >
            {shape.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0)
  const { language, toggleLanguage, setLanguage, t } = useLanguage();
  const { user } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-white text-black overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/80 border-b border-black/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <img src={logo} alt="Surnivash Logo" className="h-10 w-auto" />
             <h1 className="text-2xl font-serif font-bold tracking-wide uppercase">SURNIVAS DIAMOND</h1>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm tracking-wide hover:text-gray-400 transition-colors">{t('nav.home')}</Link>
            <Link to="/dashboard" className="text-sm tracking-wide hover:text-gray-400 transition-colors">{t('nav.dashboard')}</Link>
            <Link to="/contact" className="text-sm tracking-wide hover:text-gray-400 transition-colors">{t('nav.contact')}</Link>
            
            {/* Language Toggle */}
            <div className="flex items-center gap-2 text-xs font-bold tracking-widest">
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
                Vientnamese
              </button>
            </div>

            {user ? (
               <Link 
                  to={user.role === 'owner' ? "/admin/dashboard-management" : "/dashboard"} 
                  className="px-6 py-2 bg-black text-white rounded-full text-sm tracking-wide hover:bg-gray-800 transition-all font-medium"
               >
                {t('nav.goToDashboard')}
               </Link>
            ) : (
              <Link to="/auth" className="px-6 py-2 bg-black text-white rounded-full text-sm tracking-wide hover:bg-gray-800 transition-all font-medium">
                {t('nav.login')}
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-black rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-black rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        </div>

        {/* Floating Diamonds */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${10 + i * 12}%`,
              top: `${20 + (i % 3) * 20}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${4 + i * 0.3}s`
            }}
          >
            <svg className="w-6 h-6 opacity-10" viewBox="0 0 100 100">
              <path d="M50 10 L30 30 L10 30 L50 90 L90 30 L70 30 Z" fill="black" />
            </svg>
          </div>
        ))}

        {/* Main Content */}
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto animate-fade-in-up">
          <div className="inline-block mb-6 px-6 py-2 bg-black/5 backdrop-blur-sm rounded-full border border-black/20">
            <p className="text-sm tracking-widest text-gray-700">{t('hero.tagline')}</p>
          </div>
          
          <h1 className="text-7xl md:text-8xl font-serif mb-6 tracking-tight">
            <span className="block">{t('hero.title1')}</span>
            <span className="block mt-2">{t('hero.title2')}</span>
          </h1>
          
          <p className="text-xl text-gray-700 mb-8 max-w-3xl mx-auto leading-relaxed">
            {t('hero.desc1')}
          </p>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-black/30 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-black rounded-full animate-scroll"></div>
          </div>
        </div>
      </section>

      {/* Diamond Shapes Section */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-serif text-center mb-16">
            <span className="italic font-light text-gray-500 block text-2xl mb-2">{t('shapes.title')}</span>
            {t('shapes.subTitle')}
          </h2>
          
          <DiamondShapeSelector t={t} />
          
          <div className="text-center mt-12">
             <Link to="/diamonds" className="inline-block px-8 py-3 bg-black text-white rounded-full text-sm font-medium tracking-wide hover:bg-gray-800 transition-colors">
               {t('collections.view')}
             </Link>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  )
}

