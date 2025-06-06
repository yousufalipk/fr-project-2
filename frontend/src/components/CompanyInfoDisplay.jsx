import React, { useState, useEffect } from 'react';

const CompanyInfoDisplay = ({ companyNumber, jurisdictionCode, searchPerformed }) => {
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    officers: false,
    filings: false,
    industryData: false
  });

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!searchPerformed) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Default values if not provided
        const jCode = jurisdictionCode || "gb";
        const cNumber = companyNumber || "00747985";
        
        const response = await fetch(
          `http://127.0.0.1:5000/api/company-details/${jCode}/${cNumber}`
        );
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setCompanyData(data.results.company);
      } catch (err) {
        setError(`Failed to fetch company data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, [companyNumber, jurisdictionCode, searchPerformed]);

  // Helper to format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Toggle expanded sections
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Render officers section
  const renderOfficers = () => {
    if (!companyData?.officers || companyData.officers.length === 0) {
      return <p className="text-gray-300 text-sm">No officers information available</p>;
    }

    return (
      <div className="mt-2">
        {companyData.officers.map((item, index) => (
          <div key={index} className="border-t border-gray-800 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 py-2 pl-2">
                <p className="text-gray-500 text-sm font-normal leading-normal">Name</p>
                <p className="text-gray-300 text-sm font-normal leading-normal">
                  {item.officer.name || 'N/A'}
                </p>
              </div>
              <div className="flex flex-col gap-1 py-2 pr-2">
                <p className="text-gray-500 text-sm font-normal leading-normal">Position</p>
                <p className="text-gray-300 text-sm font-normal leading-normal">
                  {item.officer.position || 'N/A'}
                </p>
              </div>
              <div className="flex flex-col gap-1 py-2 pl-2">
                <p className="text-gray-500 text-sm font-normal leading-normal">Start Date</p>
                <p className="text-gray-300 text-sm font-normal leading-normal">
                  {formatDate(item.officer.start_date)}
                </p>
              </div>
              <div className="flex flex-col gap-1 py-2 pr-2">
                <p className="text-gray-500 text-sm font-normal leading-normal">End Date</p>
                <p className="text-gray-300 text-sm font-normal leading-normal">
                  {item.officer.end_date ? formatDate(item.officer.end_date) : 'Current'}
                </p>
              </div>
              <div className="flex flex-col gap-1 py-2 pl-2">
                <p className="text-gray-500 text-sm font-normal leading-normal">Nationality</p>
                <p className="text-gray-300 text-sm font-normal leading-normal">
                  {item.officer.nationality || 'N/A'}
                </p>
              </div>
              <div className="flex flex-col gap-1 py-2 pr-2">
                <p className="text-gray-500 text-sm font-normal leading-normal">Status</p>
                <p className="text-gray-300 text-sm font-normal leading-normal">
                  {item.officer.inactive ? 'Inactive' : 'Active'}
                </p>
              </div>
              <div className="flex flex-col gap-1 py-2 col-span-2">
                <p className="text-gray-500 text-sm font-normal leading-normal">Address</p>
                <p className="text-gray-300 text-sm font-normal leading-normal">
                  {item.officer.address || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render filings section
  const renderFilings = () => {
    if (!companyData?.filings || companyData.filings.length === 0) {
      return <p className="text-gray-300 text-sm">No filings information available</p>;
    }

    return (
      <div className="mt-2">
        {companyData.filings.map((item, index) => (
          <div key={index} className="border-t border-gray-800 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 py-2 pl-2">
                <p className="text-gray-500 text-sm font-normal leading-normal">Title</p>
                <p className="text-gray-300 text-sm font-normal leading-normal">
                  {item.filing.title || 'N/A'}
                </p>
              </div>
              <div className="flex flex-col gap-1 py-2 pr-2">
                <p className="text-gray-500 text-sm font-normal leading-normal">Date</p>
                <p className="text-gray-300 text-sm font-normal leading-normal">
                  {formatDate(item.filing.date)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render industry codes section
  const renderIndustryCodes = () => {
    if (!companyData?.industry_codes || companyData.industry_codes.length === 0) {
      return <p className="text-gray-300 text-sm">No industry code information available</p>;
    }

    return (
      <div className="mt-2">
        {companyData.industry_codes.map((item, index) => (
          <div key={index} className="border-t border-gray-800 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 py-2 pl-2">
                <p className="text-gray-500 text-sm font-normal leading-normal">Code</p>
                <p className="text-gray-300 text-sm font-normal leading-normal">
                  {item.industry_code.code || 'N/A'}
                </p>
              </div>
              <div className="flex flex-col gap-1 py-2 pr-2">
                <p className="text-gray-500 text-sm font-normal leading-normal">Description</p>
                <p className="text-gray-300 text-sm font-normal leading-normal">
                  {item.industry_code.description || 'N/A'}
                </p>
              </div>
              <div className="flex flex-col gap-1 py-2 col-span-2">
                <p className="text-gray-500 text-sm font-normal leading-normal">Scheme</p>
                <p className="text-gray-300 text-sm font-normal leading-normal">
                  {item.industry_code.code_scheme_name || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="mt-4">
      <h2 className="text-gray-300 text-xl font-bold leading-tight tracking-tight px-4 pb-3">Company Information</h2>
      
      {loading && (
        <div className="p-8 flex justify-center">
          <div className="animate-pulse text-gray-300">Loading company data...</div>
        </div>
      )}
      
      {error && (
        <div className="p-4 border-t border-solid border-gray-800">
          <div className="bg-red-900/30 border border-red-700 p-4 rounded">
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      )}
      
      {!loading && !error && companyData && (
        <div className="p-4">
          {/* Basic company information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 pl-2">
              <p className="text-gray-500 text-sm font-normal leading-normal">Company Name</p>
              <p className="text-gray-300 text-sm font-normal leading-normal">
                {companyData.name || 'N/A'}
              </p>
            </div>
            
            <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 pr-2">
              <p className="text-gray-500 text-sm font-normal leading-normal">Company Number</p>
              <p className="text-gray-300 text-sm font-normal leading-normal">
                {companyData.company_number || 'N/A'}
              </p>
            </div>
            
            <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 pl-2">
              <p className="text-gray-500 text-sm font-normal leading-normal">Jurisdiction</p>
              <p className="text-gray-300 text-sm font-normal leading-normal">
                {companyData.jurisdiction_code?.toUpperCase() || 'N/A'}
              </p>
            </div>
            
            <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 pr-2">
              <p className="text-gray-500 text-sm font-normal leading-normal">Company Type</p>
              <p className="text-gray-300 text-sm font-normal leading-normal">
                {companyData.company_type || 'N/A'}
              </p>
            </div>
            
            <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 pl-2">
              <p className="text-gray-500 text-sm font-normal leading-normal">Incorporation Date</p>
              <p className="text-gray-300 text-sm font-normal leading-normal">
                {formatDate(companyData.incorporation_date)}
              </p>
            </div>
            
            <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 pr-2">
              <p className="text-gray-500 text-sm font-normal leading-normal">Dissolution Date</p>
              <p className="text-gray-300 text-sm font-normal leading-normal">
                {companyData.dissolution_date ? formatDate(companyData.dissolution_date) : 'N/A'}
              </p>
            </div>
            
            <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 pl-2">
              <p className="text-gray-500 text-sm font-normal leading-normal">Current Status</p>
              <p className="text-gray-300 text-sm font-normal leading-normal">
                {companyData.current_status || 'N/A'}
              </p>
            </div>
            
            <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 pr-2">
              <p className="text-gray-500 text-sm font-normal leading-normal">Last Updated</p>
              <p className="text-gray-300 text-sm font-normal leading-normal">
                {formatDate(companyData.updated_at)}
              </p>
            </div>
            
            <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 col-span-2">
              <p className="text-gray-500 text-sm font-normal leading-normal">Registered Address</p>
              <p className="text-gray-300 text-sm font-normal leading-normal">
                {companyData.registered_address_in_full || 'N/A'}
              </p>
            </div>
          </div>
          
          {/* Officers section with dropdown */}
          <div className="border-t border-solid border-gray-800 py-4 mt-4">
            <div 
              className="flex justify-between items-center cursor-pointer"
              onClick={() => toggleSection('officers')}
            >
              <p className="text-gray-500 text-sm font-semibold leading-normal">Company Officers</p>
              <span className="text-gray-400">
                {expandedSections.officers ? '▼' : '►'}
              </span>
            </div>
            
            {expandedSections.officers && renderOfficers()}
          </div>
          
          {/* Filings section with dropdown */}
          <div className="border-t border-solid border-gray-800 py-4">
            <div 
              className="flex justify-between items-center cursor-pointer"
              onClick={() => toggleSection('filings')}
            >
              <p className="text-gray-500 text-sm font-semibold leading-normal">Company Filings</p>
              <span className="text-gray-400">
                {expandedSections.filings ? '▼' : '►'}
              </span>
            </div>
            
            {expandedSections.filings && renderFilings()}
          </div>
          
          {/* Industry data section with dropdown */}
          <div className="border-t border-solid border-gray-800 py-4">
            <div 
              className="flex justify-between items-center cursor-pointer"
              onClick={() => toggleSection('industryData')}
            >
              <p className="text-gray-500 text-sm font-semibold leading-normal">Industry Classifications</p>
              <span className="text-gray-400">
                {expandedSections.industryData ? '▼' : '►'}
              </span>
            </div>
            
            {expandedSections.industryData && renderIndustryCodes()}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyInfoDisplay;