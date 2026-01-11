import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import { useLanguage } from '../contexts/LanguageContext';

const SelectedDiamondsSummary = ({ selectedIds, allDiamonds, onHold, onUnhold, onAddToBasket, onConfirmOrder, holdButtonLabel = 'HOLD', addToBasketButtonLabel = 'ADD TO BASKET', disableReleaseToggle = false }) => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  
  const stats = useMemo(() => {
    // ... (logic remains same)
    const selected = allDiamonds.filter(d => selectedIds.includes(d._id));
    
    const totalCarats = selected.reduce((sum, d) => sum + (parseFloat(d.Carats) || 0), 0);
    const totalPrice = selected.reduce((sum, d) => sum + (parseFloat(d['Amount$']) || 0), 0);
    
    // Get current user ID
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const currentUserId = user ? (user.id || user._id) : null;
    
    // Check if any selected diamond is held by SOMEONE ELSE (not me)
    const hasHeldByOthers = selected.some(d => 
      d.Status === 'hold' && d.HeldBy !== currentUserId
    );

    // Check if ALL selected diamonds are held by ME
    const isHeldByMe = selected.length > 0 && selected.every(d => 
      d.Status === 'hold' && d.HeldBy === currentUserId
    );
    
    return {
      count: selected.length,
      itemCount: selected.length,
      carats: totalCarats.toFixed(2),
      price: totalPrice.toFixed(2),
      hasHeldByOthers,
      isHeldByMe,
      selectedDiamonds: selected
    };
  }, [selectedIds, allDiamonds]);

  // Confirm Order Handler (Modified to call backend)
  const handleConfirmOrderWithApi = async () => {
      // 1. Basic Validation
      if (selectedIds.length === 0) {
          alert("Please select at least one diamond to confirm.");
          return;
      }

      // 2. Prepare Data
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      if (!user || user.role === 'admin') {
          alert("Please login as a client or employee to confirm orders.");
          return;
      }

      /*
      if (!window.confirm(`Are you sure you want to confirm the order for ${selectedIds.length} diamond(s)?`)) {
          return;
      }
      */

      // 3. Call Backend API
      try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/diamonds/order/confirm`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              credentials: 'include',
              body: JSON.stringify({
                  diamondIds: selectedIds,
                  userId: user._id || user.id
              })
          });
          
          const data = await response.json();

          if (data.success) {
            // alert(data.message); // Removed success alert
            // Redirect to Confirmation Page
            window.location.href = '/confirmation'; 
          } else {
            alert(data.message || "Failed to confirm order.");
          }

      } catch (error) {
          console.error("Order API Error:", error);
          alert("Error connecting to server. Please try again.");
      }
  };
  const handleContactInquiry = () => {
    // Navigate to contact page with diamond details
    navigate('/contact', { 
      state: { 
        diamonds: stats.selectedDiamonds,
        inquiry: true 
      } 
    });
  };

  return (
    <div className="flex items-center gap-6 text-sm animate-fade-in">
      <div className="flex items-baseline gap-1">
        <span className="text-gray-500">{t('diamondSearch.summary.selected')}:</span>
        <span className="font-bold text-black">{stats.count}</span>
        
      </div>
      
      <div className="w-px h-4 bg-gray-300"></div>
      
      <div className="flex items-baseline gap-1">
        <span className="text-gray-500">{t('diamondSearch.summary.carats')}:</span>
        <span className="font-bold text-black">{stats.carats}</span>
      </div>
      
      <div className="w-px h-4 bg-gray-300"></div>
      
      <div className="flex items-baseline gap-1">
        <span className="text-gray-500">{t('diamondSearch.summary.price')}:</span>
        <span className="font-bold text-black">${stats.price}</span>
      </div>

      {stats.count > 0 && (
        <>
          <div className="w-px h-4 bg-gray-300 mx-2"></div>
          
          <div className="flex items-center gap-2">
            {stats.hasHeldByOthers ? (
              // Show only Contact for Inquiry button if any selected diamond is held by SOMEONE ELSE
              <button 
                onClick={handleContactInquiry}
                className="px-3 py-1.5 rounded-md text-xs font-semibold bg-orange-600 text-white hover:bg-orange-700 transition-colors"
                style={{ height: '32px' }}
              >
                {t('diamondSearch.summary.contactInquiry')}
              </button>
            ) : (
              // Show regular buttons if no diamonds are held by others (available or held by me)
              <>
              <button 
                onClick={(stats.isHeldByMe && !disableReleaseToggle) ? onUnhold : onHold}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center justify-center ${
                  (stats.isHeldByMe && !disableReleaseToggle)
                    ? 'bg-orange-500 text-white hover:bg-orange-600' // Orange for Release
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300' // Default Hold (Gray)
                }`}
                style={{ height: '32px' }}
              >
                {(stats.isHeldByMe && !disableReleaseToggle) ? t('diamondSearch.summary.release') : t('diamondSearch.summary.hold')}
              </button>
                <button 
                  onClick={onAddToBasket}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold text-white transition-colors flex items-center justify-center ${
                    addToBasketButtonLabel === 'REMOVE' 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-black hover:bg-gray-800'
                  }`}
                  style={{ height: '32px' }}
                >
                  {addToBasketButtonLabel === 'REMOVE' || addToBasketButtonLabel === 'XÓA' ? t('diamondSearch.summary.remove') : t('diamondSearch.summary.addToBasket')}
                </button>
                <button 
                  onClick={handleConfirmOrderWithApi}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-semibold transition-colors shadow-sm flex items-center justify-center gap-2"
                  style={{ height: '32px' }}
                >
                  <FaCheckCircle className="text-xs" /> {t('diamondSearch.summary.confirmOrder')}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SelectedDiamondsSummary;
