import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import logo from '../assets/logo.png'
import Footer from '../components/Footer'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'

export default function Contact() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const location = useLocation();
  const inquiryDiamonds = location.state?.diamonds || [];
  const isInquiry = location.state?.inquiry || false;
  const API_URL = import.meta.env.VITE_API_URL;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    subject: '',
    message: ''
  })

  // Pre-fill form with user info and diamond inquiry details
  useEffect(() => {
    const fetchUserAndPrefill = async () => {
      // Get basic user info from localStorage
      const userStr = localStorage.getItem('user');
      const localUser = userStr ? JSON.parse(userStr) : null;
      const token = localStorage.getItem('token');



      // Fetch full user profile from backend to get mobile
      let fullUser = localUser;
      if (token && localUser) {
        try {
          const response = await fetch('http://localhost:5000/api/auth/profile', {
            headers: {
              'x-auth-token': token
            }
          });
          
          if (response.ok) {
            fullUser = await response.json();

          } else {
            console.error('Profile fetch failed:', response.status, response.statusText);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          // Fall back to localStorage user
        }
      }



      if (isInquiry && inquiryDiamonds.length > 0) {
        // Format complete diamond details
        const diamondDetails = inquiryDiamonds.map((d, idx) => {
          return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DIAMOND ${idx + 1}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 LOCATION & IDENTIFICATION
   Location: ${d.Location || 'N/A'}
   Stone No: ${d['Stone No'] || 'N/A'}
   Report No: ${d['Report No'] || 'N/A'}
   Lab: ${d.Lab || 'N/A'}
`;
        }).join('\n');

        const totalCarats = inquiryDiamonds.reduce((sum, d) => sum + parseFloat(d.Carats || 0), 0);
        const totalPrice = inquiryDiamonds.reduce((sum, d) => sum + parseFloat(d['Amount$'] || 0), 0);


        
        setFormData(prev => ({
          ...prev,
          name: fullUser?.name || '',
          email: fullUser?.email || '',
          mobile: fullUser?.mobile || '',
          subject: 'Inquiry about Held Diamonds',
          message: `I am interested in the following diamonds that are currently on hold:

${diamondDetails}


Please provide more information about these diamonds and their availability.`
        }));
      } else if (fullUser) {
        // Pre-fill user info even if not inquiry

        
        setFormData(prev => ({
          ...prev,
          name: fullUser.name || '',
          email: fullUser.email || '',
          mobile: fullUser.mobile || ''
        }));
      }
    };

    fetchUserAndPrefill();
  }, []); // Empty dependency array - run only once on mount

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Get user ID from localStorage
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const userId = user ? (user.id || user._id) : null;

    try {
      const response = await fetch(`${API_URL}/contact`, { // Reverted to /contact based on database routes
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Added credentials: 'include'
        body: JSON.stringify({ // Kept original body structure to include userId
          name: formData.name,
          email: formData.email,
          mobile: formData.mobile,
          subject: formData.subject,
          message: formData.message,
          userId: userId
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ ' + data.message);
        // Reset form
        setFormData({ name: '', email: '', mobile: '', subject: '', message: '' });
      } else {
        alert('❌ Failed to send message: ' + data.message);
      }
    } catch (error) {
      console.error('Contact form submission error:', error);
      alert('❌ Error sending message. Please try again later.');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/80 border-b border-black/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <img src={logo} alt="Surnivash Logo" className="h-10 w-auto" />
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm tracking-wide hover:text-gray-400 transition-colors">{t('nav.home')}</Link>
            <Link to="/dashboard" className="text-sm tracking-wide hover:text-gray-400 transition-colors">{t('nav.dashboard')}</Link>
            <Link to="/contact" className="text-sm tracking-wide hover:text-gray-400 transition-colors">{t('nav.contact')}</Link>
            {user ? (
               <Link to="/dashboard" className="px-6 py-2 bg-black text-white rounded-full text-sm tracking-wide hover:bg-gray-800 transition-all font-medium">
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

      {/* Contact Header */}
      <section className="pt-32 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl md:text-7xl font-serif mb-6">{t('contact.title')}</h1>
          <p className="text-xl text-gray-700">
            {t('contact.subtitle')}
          </p>
        </div>
      </section>


      {/* Contact Form - Full Width */}
      <section className="pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-serif mb-8 text-center">{t('contact.header')}</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">{t('contact.name')} *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-black/20 rounded-lg focus:outline-none focus:border-black transition-colors"
                placeholder={t('contact.placeholderName')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('contact.email')} *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-black/20 rounded-lg focus:outline-none focus:border-black transition-colors"
                placeholder={t('contact.placeholderEmail')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('contact.phone')} *</label>
              <input
                type="tel"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-black/20 rounded-lg focus:outline-none focus:border-black transition-colors"
                placeholder={t('contact.placeholderPhone')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('contact.subject')} *</label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-black/20 rounded-lg focus:outline-none focus:border-black transition-colors"
                placeholder={t('contact.placeholderSubject')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('contact.message')} *</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows="8"
                className="w-full px-4 py-3 border border-black/20 rounded-lg focus:outline-none focus:border-black transition-colors resize-none"
                placeholder={t('contact.placeholderMessage')}
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full px-8 py-4 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-all duration-300"
            >
              {t('contact.send')}
            </button>
          </form>
        </div>
      </section>

      {/* Footer with Contact Information */}
      {/* Footer with Contact Information */}
      <Footer />
    </div>
  )
}
