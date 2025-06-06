"use client";
import Navbar from '@/components/Navbar';
import PropertyInfoSection from '@/components/PropertyInfo';
import CompanyInfoDisplay from '@/components/CompanyInfoDisplay';
import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

const PropertyCompanyPage = () => {
  const [searchInput, setSearchInput] = useState('');
  const [addressSearch, setAddressSearch] = useState({
    address1: '',
    address2: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchType, setSearchType] = useState("address"); 
  const [searchPerformed, setSearchPerformed] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    const unifiedSearchProperty = typeof window !== 'undefined' ? localStorage.getItem('unifiedSearchProperty') : null;
    
    if (unifiedSearchProperty) {
      try {
        const parsedData = JSON.parse(unifiedSearchProperty);
        
        if (parsedData && parsedData.searchInput) {
          setSearchInput(parsedData.searchInput);
          
          const searchEvent = new Event('submit');
          const form = document.querySelector('form');
          if (form) {
            setTimeout(() => {
              form.dispatchEvent(searchEvent);
            }, 500);
          }
        }
        
        localStorage.removeItem('unifiedSearchProperty');
      } catch (err) {
        console.error('Error parsing unified search data:', err);
      }
    }
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchInput || searchInput.trim() === "") {
      setError("Please enter a valid search query");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const addressParts = searchInput.split(',');
      const address1 = addressParts[0]?.trim() || '';
      const address2 = addressParts.slice(1).join(',').trim() || '';
      
      if (!address1) {
        setError("Please enter a valid address format: Street, City, State, Zip");
        setLoading(false);
        return;
      }
      
      setAddressSearch({
        address1,
        address2
      });
      
      setSearchPerformed(true);
    } catch (err) {
      setError('Error processing search: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex size-full min-h-screen flex-col bg-gray-900 dark group/design-root overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        <Navbar/>
        
        <div className="px-40 flex flex-1 justify-center py-5 mt-[60px]">
          <div ref={contentRef} className="layout-content-container flex flex-col max-w-[960px] flex-1">
            <div className="flex flex-wrap justify-between gap-3 p-4">
              <p className="text-gray-300 tracking-light text-3xl font-bold leading-tight min-w-72">Property Information</p>
            </div>
            
            <div className="bg-gray-800/40 rounded-lg border border-gray-700/50 p-6 mb-6">
              <form onSubmit={handleSearch} className="space-y-6">
                <div className="flex flex-col space-y-4">
                  <h3 className="text-xl font-semibold text-gray-200">
                    Search for property information
                  </h3>
                  
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="searchInput"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Enter address (e.g., 2655 E 21ST ST, BROOKLYN, NY 11235)"
                      className="w-full p-4 pl-12 bg-gray-700/80 rounded-lg border border-gray-600/30 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-transparent text-gray-200 placeholder-gray-400"
                      required
                    />
                  </div>
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 py-3 px-4 rounded-lg font-medium transition duration-200 flex items-center justify-center gap-2 text-white shadow-lg hover:shadow-blue-600/20"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      <span>Search</span>
                    </>
                  )}
                </button>
              </form>
              
              {error && (
                <div className="mt-6 p-4 bg-red-900/40 text-red-200 rounded-lg border border-red-800/30 flex items-center">
                  <div className="mr-3 flex-shrink-0">⚠️</div>
                  <p>{error}</p>
                </div>
              )}
            </div>
             
            {searchPerformed && (
              <div className="mt-4 bg-gray-800/40 rounded-lg border border-gray-700/50 overflow-hidden">
                {/* Property Information Section */}
                <div className="p-6">
                  <h2 className="text-gray-200 text-2xl font-bold mb-6">Property Information</h2>
                  <PropertyInfoSection 
                    address1={addressSearch.address1}
                    address2={addressSearch.address2}
                    searchPerformed={searchPerformed}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCompanyPage;