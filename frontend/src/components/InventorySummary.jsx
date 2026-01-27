import React, { useEffect, useState } from 'react';
import { FaTimes, FaSpinner } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL;

const SummaryTable = ({ title, data, labelKey = '_id' }) => {
  if (!data || data.length === 0) return null;

  // Calculate totals for footer
  const totals = data.reduce((acc, item) => ({
    totalPcs: acc.totalPcs + (item.totalPcs || 0),
    totalCts: acc.totalCts + (item.totalCts || 0),
    availablePcs: acc.availablePcs + (item.availablePcs || 0),
    availableCts: acc.availableCts + (item.availableCts || 0),
    soldPcs: acc.soldPcs + (item.soldPcs || 0),
    soldCts: acc.soldCts + (item.soldCts || 0),
  }), { totalPcs: 0, totalCts: 0, availablePcs: 0, availableCts: 0, soldPcs: 0, soldCts: 0 });

  return (
    <div className="mb-6">
      <h3 className="text-lg font-bold text-gray-800 mb-2 border-b pb-1">{title}</h3>
      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-700 font-semibold uppercase text-xs">
            <tr>
              <th className="px-4 py-2 border-b">Category</th>
              <th className="px-4 py-2 border-b bg-blue-50 text-blue-800 text-center" colSpan="2">Available</th>
              <th className="px-4 py-2 border-b bg-green-50 text-green-800 text-center" colSpan="2">Sold</th>
              <th className="px-4 py-2 border-b bg-gray-200 text-gray-800 text-center" colSpan="2">Total</th>
            </tr>
            <tr>
              <th className="px-4 py-2 border-b"></th>
              <th className="px-2 py-1 border-b text-center bg-blue-50">Pcs</th>
              <th className="px-2 py-1 border-b text-center bg-blue-50">Cts</th>
              <th className="px-2 py-1 border-b text-center bg-green-50">Pcs</th>
              <th className="px-2 py-1 border-b text-center bg-green-50">Cts</th>
              <th className="px-2 py-1 border-b text-center bg-gray-200">Pcs</th>
              <th className="px-2 py-1 border-b text-center bg-gray-200">Cts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-900 border-r">{item[labelKey] || 'N/A'}</td>
                <td className="px-2 py-2 text-center text-blue-700 border-r">{item.availablePcs}</td>
                <td className="px-2 py-2 text-center text-blue-700 border-r">{item.availableCts?.toFixed(2)}</td>
                <td className="px-2 py-2 text-center text-green-700 border-r">{item.soldPcs}</td>
                <td className="px-2 py-2 text-center text-green-700 border-r">{item.soldCts?.toFixed(2)}</td>
                <td className="px-2 py-2 text-center font-semibold border-r">{item.totalPcs}</td>
                <td className="px-2 py-2 text-center font-semibold">{item.totalCts?.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
           <tfoot className="bg-gray-100 font-bold">
            <tr>
              <td className="px-4 py-2 border-r">TOTAL</td>
              <td className="px-2 py-2 text-center text-blue-800 border-r">{totals.availablePcs}</td>
              <td className="px-2 py-2 text-center text-blue-800 border-r">{totals.availableCts?.toFixed(2)}</td>
              <td className="px-2 py-2 text-center text-green-800 border-r">{totals.soldPcs}</td>
              <td className="px-2 py-2 text-center text-green-800 border-r">{totals.soldCts?.toFixed(2)}</td>
              <td className="px-2 py-2 text-center border-r">{totals.totalPcs}</td>
              <td className="px-2 py-2 text-center">{totals.totalCts?.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

const InventorySummary = ({ isOpen, onClose }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overall'); // overall, shape, color, clarity, location

  useEffect(() => {
    if (isOpen) {
      fetchSummary();
    }
  }, [isOpen]);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/diamonds/summary`, {
          credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setSummary(data.data);
      } else {
        setError(data.message || 'Failed to fetch summary');
      }
    } catch (err) {
      console.error(err);
      setError('Network error fetching summary');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            📊 Inventory Summary
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-red-500">
            <FaTimes size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-2 bg-gray-50">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-64 text-gray-500">
               <FaSpinner className="animate-spin text-4xl mb-3 text-blue-500" />
               <p>Loading summary data...</p>
             </div>
          ) : error ? (
            <div className="text-red-500 p-8 text-center bg-red-50 rounded-lg mx-4 mt-4 border border-red-100">
                <p className="font-bold">Error</p>
                <p>{error}</p>
                <button onClick={fetchSummary} className="mt-4 px-4 py-2 bg-white border border-red-200 rounded hover:bg-red-50 text-sm">Retry</button>
            </div>
          ) : summary ? (
            <div className="h-full flex flex-col">
                 {/* Tabs */}
                 <div className="flex bg-white border-b px-4 gap-4 sticky top-0 z-10 shadow-sm">
                    {['Shape', 'Color', 'Clarity', 'Location'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab.toLowerCase())}
                            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                                activeTab === tab.toLowerCase() 
                                ? 'border-black text-black' 
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                     <button
                        onClick={() => setActiveTab('overall')}
                        className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ml-auto ${
                            activeTab === 'overall' 
                            ? 'border-blue-600 text-blue-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Overview
                    </button>
                 </div>

                 <div className="p-4 bg-white m-2 rounded-lg shadow-sm flex-1 overflow-auto">
                    {activeTab === 'overall' && (
                        <div className="p-4">
                             <SummaryTable title="Overall Summary" data={summary.overall} labelKey="_id" />
                             
                             <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-6 bg-blue-50 rounded-xl border border-blue-100">
                                    <h4 className="text-blue-800 font-bold mb-2">Available Stock</h4>
                                    <div className="text-3xl font-bold text-blue-900">{summary.overall[0]?.availablePcs} <span className="text-lg font-normal text-blue-700">Pcs</span></div>
                                    <div className="text-xl text-blue-700">{summary.overall[0]?.availableCts?.toFixed(2)} <span className="text-sm">Cts</span></div>
                                </div>
                                <div className="p-6 bg-green-50 rounded-xl border border-green-100">
                                    <h4 className="text-green-800 font-bold mb-2">Sold Stock</h4>
                                    <div className="text-3xl font-bold text-green-900">{summary.overall[0]?.soldPcs} <span className="text-lg font-normal text-green-700">Pcs</span></div>
                                    <div className="text-xl text-green-700">{summary.overall[0]?.soldCts?.toFixed(2)} <span className="text-sm">Cts</span></div>
                                </div>
                             </div>
                        </div>
                    )}
                    
                    {activeTab === 'shape' && <SummaryTable title="Inventory by Shape" data={summary.byShape} />}
                    {activeTab === 'color' && <SummaryTable title="Inventory by Color" data={summary.byColor} />}
                    {activeTab === 'clarity' && <SummaryTable title="Inventory by Clarity" data={summary.byClarity} />}
                    {activeTab === 'location' && <SummaryTable title="Inventory by Location" data={summary.byLocation} />}
                 </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default InventorySummary;
