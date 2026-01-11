import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import AuthPopup from '../components/AuthPopup';
import { useLanguage } from '../contexts/LanguageContext';

export default function Profile() {
  const { t } = useLanguage();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    mobile: '',
    companyName: '',
    address: '',
    city: '',
    country: '',
    zipCode: ''
  });
  const [initialUserData, setInitialUserData] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSaving, setIsSaving] = useState(false);
  
  // OTP State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  
  // Password Change State
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordOtp, setPasswordOtp] = useState('');
  const [showPasswordOtpModal, setShowPasswordOtpModal] = useState(false);
  const [showNoChangesModal, setShowNoChangesModal] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const token = localStorage.getItem('token');
    // For cookie auth, we don't check token presence in localStorage anymore.
    // Instead we try to fetch profile. If 401, we redirect.
    // But we still want to show loading state.
    
    setIsLoggedIn(true);

    // Pre-populate from local storage to avoid empty state
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (storedUser) {
        const initial = {
            name: storedUser.name || '',
            email: storedUser.email || '',
            mobile: storedUser.mobile || '',
            companyName: storedUser.companyName || '',
            address: storedUser.address || '',
            city: storedUser.city || '',
            country: storedUser.country || '',
            zipCode: storedUser.zipCode || ''
        };
        setUserData(prev => ({ ...prev, ...initial }));
        setInitialUserData(initial);
    }

    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        headers: {
            // 'x-auth-token': token // Removed
        },
        credentials: 'include' // Add cookie support
      });
      
      if (response.ok) {
        const data = await response.json();
        const freshData = {
          name: data.name || storedUser?.name || '',
          email: data.email || storedUser?.email || '',
          mobile: data.mobile || '',
          companyName: data.companyName || '',
          address: data.address || '',
          city: data.city || '',
          country: data.country || '',
          zipCode: data.zipCode || ''
        };
        setUserData(freshData);
        setInitialUserData(freshData);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });

    if (JSON.stringify(userData) === JSON.stringify(initialUserData)) {
        setShowNoChangesModal(true);
        setIsSaving(false);
        return;
    }

    // const token = localStorage.getItem('token'); // Removed
    
    // 1. Request OTP
    try {
        const response = await fetch(`${API_URL}/auth/profile/send-otp`, {
            method: 'POST',
            credentials: 'include' // Add cookie support
        });
        
        const data = await response.json();

        if (response.ok) {
            setShowOtpModal(true);
            setMessage({ type: 'success', text: t('profile.otp.verifyDesc') });
        } else {
            setMessage({ type: 'error', text: data.message || 'Failed to send OTP.' });
        }
    } catch (error) {
        console.error("Send OTP Error:", error);
        setMessage({ type: 'error', text: 'Server error sending OTP.' });
    } finally {
        setIsSaving(false);
    }
  };

  const handleVerifyOtp = async () => {
      if (!otp || otp.length < 6) {
          alert("Please enter a valid 6-digit OTP.");
          return;
      }
      
      setOtpLoading(true);
      // const token = localStorage.getItem('token');

      try {
          const response = await fetch(`${API_URL}/auth/profile/verify-update`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              credentials: 'include',
              body: JSON.stringify({
                  otp,
                  updateData: userData
              })
          });

          const data = await response.json();

          if (response.ok) {
               setMessage({ type: 'success', text: 'Profile updated successfully!' });
               
               // Update local storage
               const storedUser = JSON.parse(localStorage.getItem('user'));
               if (storedUser) {
                   // Ensure we keep name/email/mobile consistent if they weren't changed
                   // Actually name/mobile are not changed by backend, but company details are.
                   // Let's update what we sent.
                   const updatedUser = { ...storedUser, ...userData };
                   // Restore fields that shouldn't change just in case frontend state was manipulated
                   updatedUser.name = storedUser.name; 
                   updatedUser.email = storedUser.email;
                   updatedUser.mobile = storedUser.mobile;
                   
                   localStorage.setItem('user', JSON.stringify(updatedUser));
               }
               
               setShowOtpModal(false);
               setIsEditing(false);
               setOtp('');
          } else {
              alert(data.message || "Invalid OTP");
          }
      } catch (error) {
          console.error("Verify OTP Error:", error);
          alert("Server error verifying OTP");
      } finally {
          setOtpLoading(false);
      }
  };

  const handlePasswordChange = async (e) => {
      e.preventDefault();
      setMessage({ type: '', text: '' });

      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
          setMessage({ type: 'error', text: 'Please fill in all password fields' });
          return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
          setMessage({ type: 'error', text: 'New passwords do not match' });
          return;
      }

      if (passwordData.newPassword.length < 6) {
          setMessage({ type: 'error', text: 'New password must be at least 6 characters' });
          return;
      }

      setIsSaving(true);
      // const token = localStorage.getItem('token');

      try {
          const response = await fetch(`${API_URL}/auth/profile/send-otp`, {
              method: 'POST',
              credentials: 'include'
          });

          const data = await response.json();

          if (response.ok) {
              setShowPasswordOtpModal(true);
              setMessage({ type: 'success', text: 'OTP sent to your email' });
          } else {
              setMessage({ type: 'error', text: data.message || 'Failed to send OTP' });
          }
      } catch (error) {
          setMessage({ type: 'error', text: 'Error sending OTP' });
    } finally {
          setIsSaving(false);
      }
  };

  const submitPasswordChange = async (e) => {
      e.preventDefault();
      setOtpLoading(true);
      setMessage({ type: '', text: '' });

      const token = localStorage.getItem('token'); // Keep var for now or remove? No, remove below.
      // Actually simply remove definition.
      // const token = localStorage.getItem('token');

      try {
          const response = await fetch(`${API_URL}/auth/change-password`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              credentials: 'include',
              body: JSON.stringify({
                  currentPassword: passwordData.currentPassword,
                  newPassword: passwordData.newPassword,
                  otp: passwordOtp
              })
          });

          const data = await response.json();

          if (response.ok) {
              setMessage({ type: 'success', text: 'Password changed successfully!' });
              setShowPasswordOtpModal(false);
              setShowPasswordSection(false);
              setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
              setPasswordOtp('');
          } else {
              setMessage({ type: 'error', text: data.message || 'Failed to change password' });
          }
      } catch (error) {
          setMessage({ type: 'error', text: 'Error changing password' });
      } finally {
          setOtpLoading(false);
      }
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const DetailRow = ({ label, value }) => (
    <div className="py-4 border-b border-gray-100 last:border-0">
      <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-base text-gray-900 font-medium">{value || '-'}</p>
    </div>
  );

  if (loading) return null;

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans">
      {!isLoggedIn && <AuthPopup />}

      <div className={`transition-all duration-500 h-screen flex flex-col overflow-hidden ${!isLoggedIn ? 'filter blur-sm pointer-events-none select-none' : ''}`}>
        <div className="flex h-full">
          
          <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />

          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <Topbar userName={userData.name} />

            <main className="flex-1 overflow-y-auto p-6 lg:p-10">
              <div className="max-w-4xl mx-auto">
                
                <div className="flex items-center justify-between mb-8">
                  <h1 className="text-3xl font-serif font-bold text-gray-900">{t('profile.title')}</h1>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-6 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
                    >
                      {t('profile.edit')}
                    </button>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-8">
                    
                    {message.text && (
                      <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                        {message.text}
                      </div>
                    )}

                    {!isEditing ? (
                      /* Read-Only View */
                      <div className="space-y-8">
                        <div>
                          <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">{t('profile.sections.personal')}</h2>
                          <div className="grid md:grid-cols-2 gap-x-8 gap-y-2">
                            <DetailRow label={t('profile.fields.fullName')} value={userData.name} />
                            <DetailRow label={t('profile.fields.email')} value={userData.email} />
                            <DetailRow label={t('profile.fields.mobile')} value={userData.mobile} />
                          </div>
                        </div>

                        <div>
                          <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">{t('profile.sections.company')}</h2>
                          <div className="grid md:grid-cols-2 gap-x-8 gap-y-2">
                            <DetailRow label={t('profile.fields.companyName')} value={userData.companyName} />
                            <DetailRow label={t('profile.fields.address')} value={userData.address} />
                            <DetailRow label={t('profile.fields.city')} value={userData.city} />
                            <DetailRow label={t('profile.fields.country')} value={userData.country} />
                            <DetailRow label={t('profile.fields.zipCode')} value={userData.zipCode} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Edit Form */
                      <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
                        
                        {/* Personal Info Section */}
                        {/* Personal Info Section */}
                        <div>
                          <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">{t('profile.sections.personal')}</h2>
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.fields.fullName')}</label>
                              <input
                                type="text"
                                name="name"
                                value={userData.name}
                                disabled
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.fields.email')}</label>
                              <input
                                type="email"
                                name="email"
                                value={userData.email}
                                disabled
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.fields.mobile')}</label>
                              <input
                                type="tel"
                                name="mobile"
                                value={userData.mobile}
                                disabled
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Company / Address Section */}
                        <div>
                          <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4 mt-8">{t('profile.sections.company')}</h2>
                          <div className="grid md:grid-cols-2 gap-6">
                             <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.fields.companyName')}</label>
                              <input
                                type="text"
                                name="companyName"
                                value={userData.companyName}
                                disabled
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.fields.address')}</label>
                              <textarea
                                name="address"
                                value={userData.address}
                                onChange={handleChange}
                                rows="3"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all resize-none"
                              ></textarea>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.fields.city')}</label>
                              <input
                                type="text"
                                name="city"
                                value={userData.city}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.fields.country')}</label>
                              <input
                                type="text"
                                name="country"
                                value={userData.country}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.fields.zipCode')}</label>
                              <input
                                type="text"
                                name="zipCode"
                                value={userData.zipCode}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Password Change Section */}
                        <div className="mt-8">
                          <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-900 border-b pb-2">{t('profile.sections.security')}</h2>
                            <button
                              type="button"
                              onClick={() => setShowPasswordSection(!showPasswordSection)}
                              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                              {showPasswordSection ? t('profile.password.cancel') : t('profile.password.change')}
                            </button>
                          </div>

                          {showPasswordSection && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                <div className="grid md:grid-cols-1 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.fields.currentPass')}</label>
                                  <input
                                    type="password"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.fields.newPass')}</label>
                                  <input
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.fields.confirmPass')}</label>
                                  <input
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={handlePasswordChange}
                                  disabled={isSaving}
                                  className="px-6 py-2 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                                >
                                  {isSaving ? t('profile.saving') : t('profile.password.change')}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="pt-6 flex justify-end gap-4">
                          <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            {t('profile.cancel')}
                          </button>
                          <button
                            type="submit"
                            disabled={isSaving}
                            className="px-8 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                          >
                            {isSaving ? t('profile.saving') : t('profile.save')}
                          </button>
                        </div>

                      </form>
                    )}
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
      {/* OTP Modal */}
      {showOtpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl scale-100 animate-scale-up">
                  <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                          📧
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">{t('profile.otp.verifyTitle')}</h3>
                      <p className="text-gray-500 text-sm mt-2">
                          {t('profile.otp.verifyDesc')}
                      </p>
                  </div>

                  <div className="space-y-4">
                      <input 
                          type="text" 
                          placeholder="Enter 6-digit OTP" 
                          maxLength="6"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                          className="w-full text-center text-2xl tracking-widest font-bold py-3 border-2 border-gray-200 rounded-xl focus:border-black focus:ring-0 outline-none transition-all"
                      />
                      
                      <button 
                          onClick={handleVerifyOtp}
                          disabled={otpLoading}
                          className="w-full py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-900 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                          {otpLoading ? 'Verifying...' : 'Verify & Save'}
                      </button>
                      
                      <button 
                          onClick={() => { setShowOtpModal(false); setOtp(''); }}
                          className="w-full py-3 text-gray-500 font-medium hover:text-gray-800 transition-colors"
                      >
                          {t('profile.cancel')}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Password Change OTP Modal */}
      {showPasswordOtpModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl">
                  <h2 className="text-2xl font-bold mb-2 text-gray-900">Verify OTP</h2>
                  <p className="text-gray-600 mb-6">Enter the 6-digit code sent to your email</p>
                  
                  <div className="space-y-4">
                      <input 
                          type="text"
                          placeholder="000000"
                          maxLength="6"
                          value={passwordOtp}
                          onChange={(e) => setPasswordOtp(e.target.value.replace(/\D/g, ''))}
                          className="w-full text-center text-2xl tracking-widest font-bold py-3 border-2 border-gray-200 rounded-xl focus:border-black focus:ring-0 outline-none transition-all"
                      />
                      
                      <button 
                          onClick={submitPasswordChange}
                          disabled={otpLoading}
                          className="w-full py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-900 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                          {otpLoading ? t('profile.saving') : t('profile.password.confirm')}
                      </button>
                      
                      <button 
                          onClick={() => { setShowPasswordOtpModal(false); setPasswordOtp(''); }}
                          className="w-full py-3 text-gray-500 font-medium hover:text-gray-800 transition-colors"
                      >
                          {t('profile.cancel')}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* No Changes Modal */}
      {showNoChangesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl scale-100 animate-scale-up text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                      ℹ️
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{t('profile.noChanges.title')}</h3>
                  <p className="text-gray-500 text-sm mt-2 mb-6">
                      {t('profile.noChanges.desc')}
                  </p>
                  
                  <button 
                      onClick={() => setShowNoChangesModal(false)}
                      className="w-full py-2.5 bg-black text-white font-bold rounded-xl hover:bg-gray-900 active:scale-95 transition-all"
                  >
                      {t('profile.noChanges.btn')}
                  </button>
              </div>
          </div>
      )}

    </div>
  );
}
