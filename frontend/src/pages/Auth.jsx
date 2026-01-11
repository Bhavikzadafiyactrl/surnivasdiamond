import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import brandingVideo from "../assets/SURNIVAS DIAMOND.mp4";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";

const Auth = () => {
  const { t } = useLanguage();
  const { login, user } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [view, setView] = useState("login"); // login, signup, forgotPassword, resetOtp, newPassword
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Form States
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    mobile: "",
    companyName: "",
    address: "",
    city: "",
    country: "",
    zipCode: "",
    otp: "",
    captchaInput: ""
  });

  const [captcha, setCaptcha] = useState({ num1: 0, num2: 0 });
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Generate simple captcha
  useEffect(() => {
    generateCaptcha();
  }, []);

  const generateCaptcha = () => {
    setCaptcha({
      num1: Math.floor(Math.random() * 10),
      num2: Math.floor(Math.random() * 10)
    });
  };

  // Handle Input Change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // API Config
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/auth";

  const [countryCode, setCountryCode] = useState("+91");

  const COUNTRY_CODES = [
    { code: "+91", country: "India" },
    { code: "+1", country: "USA/Canada" },
    { code: "+44", country: "UK" },
    { code: "+32", country: "Belgium" },
    { code: "+971", country: "UAE" },
    { code: "+972", country: "Israel" },
    { code: "+852", country: "Hong Kong" },
    { code: "+86", country: "China" },
    { code: "+61", country: "Australia" },
    { code: "+33", country: "France" },
    { code: "+49", country: "Germany" },
    { code: "+39", country: "Italy" },
    { code: "+81", country: "Japan" },
    { code: "+65", country: "Singapore" },
    { code: "+41", country: "Switzerland" },
    { code: "+66", country: "Thailand" },
    { code: "+84", country: "Vietnam" },
    { code: "+90", country: "Turkey" },
  ];

  // Handle Signup
  const handleSignup = async (e) => {
    e.preventDefault();
    
    // Turnstile check removed
    // if (!turnstileToken) {
    //   setError("Please complete the security verification");
    //   return;
    // }

    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          mobile: `${countryCode}${formData.mobile}`,
          companyName: formData.companyName,
          address: formData.address,
          city: formData.city,
          country: formData.country,
          zipCode: formData.zipCode,
          turnstileToken: turnstileToken
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Signup failed");
      }

      // On success, show OTP field
      setShowOtp(true);
      alert(data.message); 

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Turnstile check removed
    // if (!turnstileToken) {
    //   setError("Please complete the security verification");
    //   return;
    // }

    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          turnstileToken: turnstileToken
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.unverified) {
          setError("Account unverified. Please signup again to verify.");
        } else if (data.pendingApproval) {
          setError("Account verified. Waiting for Owner Approval.");
        } else {
          throw new Error(data.message || "Login failed");
        }
        return;
      }

      // Success
      // Success
      // localStorage.setItem("token", data.token);
      // localStorage.setItem("user", JSON.stringify(data.user)); // Handled by context now
      login(data.user); // Update context state
      
      // Role-based Redirect
      if (data.user.role === 'owner') {
          navigate("/admin/dashboard-management");
      } else {
          navigate("/dashboard");
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Verification
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: formData.email,
          otp: formData.otp
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Verification failed");
      }

      if (data.pendingApproval) {
          alert("Email Verified Successfully! Your account is now pending Owner Approval. Please contact admin.");
          setShowOtp(false);
          setIsSignup(false);
          setError("");
          navigate("/");
          return;
      }

      // Success
      // localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      // Role-based Redirect
      if (data.user.role === 'owner') {
          navigate("/admin/dashboard-management");
      } else {
          navigate("/");
      }

    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password Flow
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to send OTP");
      
      setView("resetOtp");
      alert(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/verify-reset-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: formData.email, otp: formData.otp }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Invalid OTP");
      
      setView("newPassword");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          email: formData.email, 
          otp: formData.otp,
          newPassword: formData.password
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to reset password");
      
      alert("Password reset successfully! Please login.");
      setView("login");
      setIsSignup(false);
      setShowOtp(false);
      setFormData({ ...formData, password: "", otp: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignup(!isSignup);
    setView(isSignup ? "login" : "signup");
    setShowOtp(false);
    setError("");
    setFormData({ ...formData, captchaInput: "" });
    generateCaptcha();
  };

  return (
    <div className="h-screen w-full flex overflow-hidden bg-white font-sans">
      
      {/* ================= LEFT SIDE (Visuals) ================= */}
      <div className="hidden lg:flex w-[65%] relative flex-col justify-between p-12 text-white overflow-hidden bg-black">
        
        {/* Background Video */}
        <div className="absolute inset-0 z-0">
            <video 
              src={brandingVideo} 
              autoPlay 
              loop 
              muted 
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Overlay to ensure text readability */}
            <div className="absolute inset-0 bg-black/30"></div>
        </div>

        {/* Removed Old Animation Elements (Mandala, Spheres) */}



        {/* Bottom Content */}

      </div>

      {/* ================= RIGHT SIDE (Form) ================= */}
      <div className="w-full lg:w-[35%] relative flex flex-col h-full overflow-y-auto bg-white">
        
        {/* Close Button */}
        <Link to="/" className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors z-50">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Link>

        {/* Form Container */}
        <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 py-12">
          
          {/* Logo Area */}
          <div className="text-center mb-10">
            <img src={logo} alt="Surnivash Logo" className="w-40 mx-auto mb-6" />
            {showOtp || view === "resetOtp" ? (
              <h3 className="text-2xl text-gray-600 font-light">{t('auth.verifyTitle')}</h3>
            ) : view === "forgotPassword" ? (
              <h3 className="text-2xl text-gray-600 font-light">{t('auth.recoverTitle')}</h3>
            ) : view === "newPassword" ? (
              <h3 className="text-2xl text-gray-600 font-light">{t('auth.setPassTitle')}</h3>
            ) : isSignup ? (
              <h3 className="text-2xl text-gray-600 font-light">{t('auth.signupTitle')}</h3>
            ) : (
              <div className="flex flex-col items-center">
                <h3 className="text-2xl font-bold tracking-widest uppercase text-black mb-2">SURNIVAS DIAMOND</h3>
                <p className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase">DIAMOND MANUFACTURER, IMPORTER & EXPORTER</p>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded text-center">
              {error}
            </div>
          )}

          {/* FORMS */}
          {/* FORMS */}
          {/* FORMS */}
          {/* 1. FORGOT PASSWORD FORM */}
          {view === "forgotPassword" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="relative group">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-blue-50/50 text-gray-800 px-4 py-3 rounded hover:bg-blue-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none placeholder-gray-400 text-sm border border-transparent"
                  placeholder={t('auth.email')}
                  required
                />
              </div>
              <button disabled={loading} className="w-full bg-gray-400 hover:bg-black text-white py-3 rounded font-medium shadow-sm transition-colors text-sm uppercase tracking-wide disabled:opacity-50">
                {loading ? t('auth.processing') : t('auth.sendOtpBtn')}
              </button>
              <div className="text-center mt-4">
                <button type="button" onClick={() => setView("login")} className="text-xs text-blue-600 hover:underline">
                  {t('auth.backToLogin')}
                </button>
              </div>
            </form>
          )}

          {/* 2. RESET OTP FORM */}
          {view === "resetOtp" && (
            <form onSubmit={handleVerifyResetOtp} className="space-y-4">
               <div className="space-y-1">
                <input
                  type="text"
                  name="otp"
                  value={formData.otp}
                  onChange={handleChange}
                  className="w-full bg-blue-50/50 text-gray-800 px-4 py-3 rounded hover:bg-blue-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none text-center tracking-[0.5em] font-bold placeholder-gray-400 border border-transparent focus:border-blue-200"
                  placeholder="ENTER OTP"
                  required
                />
              </div>
              <button disabled={loading} className="w-full bg-gray-400 hover:bg-black text-white py-3 rounded font-medium shadow-sm transition-colors text-sm uppercase tracking-wide disabled:opacity-50">
                {loading ? t('auth.verifying') : t('auth.verifyBtn')}
              </button>
              <div className="text-center mt-4">
                <button type="button" onClick={() => setView("login")} className="text-xs text-blue-600 hover:underline">
                   {t('auth.cancel')}
                </button>
              </div>
            </form>
          )}

          {/* 3. NEW PASSWORD FORM */}
          {view === "newPassword" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="relative group">
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-blue-50/50 text-gray-800 px-4 py-3 rounded hover:bg-blue-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none placeholder-gray-400 text-sm border border-transparent"
                  placeholder={t('auth.newPassword')}
                  required
                  minLength="6"
                />
              </div>
              <button disabled={loading} className="w-full bg-black text-white py-3 rounded font-medium shadow-sm transition-colors text-sm uppercase tracking-wide disabled:opacity-50">
                {loading ? t('auth.saving') : t('auth.setPassTitle')}
              </button>
            </form>
          )}

          {['login', 'signup'].includes(view) && (
            showOtp ? (
              // ============ OTP FORM (Signup) ============
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1">
                  <input
                    type="text"
                    name="otp"
                    value={formData.otp}
                    onChange={handleChange}
                    className="w-full bg-blue-50/50 text-gray-800 px-4 py-3 rounded hover:bg-blue-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none text-center tracking-[0.5em] font-bold placeholder-gray-400 border border-transparent focus:border-blue-200"
                    placeholder="ENTER OTP (SENT TO EMAIL)"
                    required
                  />
                </div>

                <div className="pt-2">
                  <button disabled={loading} className="w-full bg-gray-400 hover:bg-black text-white py-3 rounded font-medium shadow-sm transition-colors text-sm uppercase tracking-wide disabled:opacity-50">
                     {loading ? "Verifying..." : "Verify"}
                  </button>
                </div>
                 <div className="text-center mt-4">
                  <button type="button" onClick={() => setShowOtp(false)} className="text-xs text-blue-600 hover:underline">
                    Back to Login
                  </button>
                </div>
              </form>
            ) : (
              // ============ LOGIN / SIGNUP FORM ============
              <form onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-4">
                
                {isSignup && (
                  <div className="space-y-4">
                    <div className="relative group">
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full bg-blue-50/50 text-gray-800 px-4 py-3 rounded hover:bg-blue-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none placeholder-gray-400 text-sm border border-transparent"
                        placeholder={t('auth.fullName')}
                        required
                      />
                    </div>
                    
                    <div className="relative group flex gap-2">
                       {/* Dropdown removed for brevity, assuming standard select */}
                      <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="bg-blue-50/50 text-gray-800 px-2 py-3 rounded hover:bg-blue-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none text-sm border border-transparent w-28 appearance-none"
                      >
                          {COUNTRY_CODES.map((item) => (
                              <option key={item.code} value={item.code}>
                                  {item.code} ({item.country})
                              </option>
                          ))}
                      </select>
                      <input
                        type="tel"
                        name="mobile"
                        value={formData.mobile}
                        onChange={handleChange}
                        className="w-full bg-blue-50/50 text-gray-800 px-4 py-3 rounded hover:bg-blue-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none placeholder-gray-400 text-sm border border-transparent flex-1"
                        placeholder={t('auth.mobile')}
                        required
                      />
                    </div>

                    <div className="relative group">
                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        className="w-full bg-blue-50/50 text-gray-800 px-4 py-3 rounded hover:bg-blue-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none placeholder-gray-400 text-sm border border-transparent"
                        placeholder={t('auth.company')}
                        required
                      />
                    </div>

                    <div className="relative group">
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className="w-full bg-blue-50/50 text-gray-800 px-4 py-3 rounded hover:bg-blue-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none placeholder-gray-400 text-sm border border-transparent"
                        placeholder={t('auth.address')}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div>
                         <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          className="w-full bg-blue-50/50 text-gray-800 px-4 py-3 rounded hover:bg-blue-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none placeholder-gray-400 text-sm border border-transparent"
                          placeholder={t('auth.city')}
                          required
                        />
                       </div>
                       <div>
                         <input
                          type="text"
                          name="zipCode"
                          value={formData.zipCode}
                          onChange={handleChange}
                          className="w-full bg-blue-50/50 text-gray-800 px-4 py-3 rounded hover:bg-blue-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none placeholder-gray-400 text-sm border border-transparent"
                          placeholder={t('auth.zip')}
                          required
                        />
                       </div>
                    </div>

                    <div className="relative group">
                      <input
                        type="text"
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        className="w-full bg-blue-50/50 text-gray-800 px-4 py-3 rounded hover:bg-blue-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none placeholder-gray-400 text-sm border border-transparent"
                        placeholder={t('auth.country')}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="relative group">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full bg-blue-50/50 text-gray-800 px-4 py-3 rounded hover:bg-blue-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none placeholder-gray-400 text-sm border border-transparent"
                    placeholder={isSignup ? t('auth.email') : t('auth.userEmail')}
                    required
                  />
                </div>

                <div className="relative group">
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full bg-blue-50/50 text-gray-800 px-4 py-3 rounded hover:bg-blue-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none placeholder-gray-400 text-sm border border-transparent"
                    placeholder={t('auth.password')}
                    required
                  />
                </div>


                {/* Cloudflare Turnstile - Removed */}


                {!isSignup && (
                  <div className="text-right">
                    <button type="button" onClick={() => setView("forgotPassword")} className="text-xs text-blue-600 hover:underline">
                      {t('auth.forgotPass')}
                    </button>
                  </div>
                )}

                <button 
                  disabled={loading}
                  className="w-full bg-gray-400 hover:bg-black text-white py-3 rounded font-medium shadow-sm transition-colors text-sm uppercase tracking-wide disabled:opacity-50 mt-4 active:scale-[0.98]"
                >
                  {loading ? t('auth.processing') : isSignup ? t('auth.registerBtn') : t('auth.loginBtn')}
                </button>

                <div className="text-center space-y-2 mt-6">
                  <div className="text-sm text-gray-600">
                    {isSignup ? t('auth.haveAccount') : t('auth.newUser')}{" "}
                    <button type="button" onClick={toggleMode} className="text-blue-600 font-medium hover:underline">
                      {isSignup ? t('auth.loginBtn') : t('auth.registerBtn')}
                    </button>
                  </div>
                  {!isSignup && (
                    <div className="text-xs text-gray-500">
                      {t('auth.noLogin')} <Link to="/contact" className="text-blue-600 hover:underline">{t('auth.sendInquiry')}</Link>
                    </div>
                  )}
                </div>
              </form>
            )
          )}

        </div>

       

      </div>
    </div>
  );
};

export default Auth;
