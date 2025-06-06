"use client";
import Navbar from '@/components/Navbar';
import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

const BusinessReport = () => {
  const [companyData, setCompanyData] = useState(null);
  const [openCorpData, setOpenCorpData] = useState(null);
  const [companyDetails, setCompanyDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchInputs, setSearchInputs] = useState({
    domain: '',
    companyName: ''
  });
  const contentRef = useRef(null);

  // Check for data from unified search on component mount
  useEffect(() => {
    const unifiedSearchBusiness = typeof window !== 'undefined' ? localStorage.getItem('unifiedSearchBusiness') : null;

    if (unifiedSearchBusiness) {
      try {
        const parsedData = JSON.parse(unifiedSearchBusiness);

        if (parsedData) {
          // Set the search inputs from unified search
          setSearchInputs(prevState => ({
            ...prevState,
            domain: parsedData.domain || '',
            companyName: parsedData.companyName || ''
          }));

          // Perform search automatically
          const searchEvent = new Event('submit');
          const form = document.querySelector('form');
          if (form) {
            setTimeout(() => {
              form.dispatchEvent(searchEvent);
            }, 500);
          }
        }

        // Clear the stored data
        localStorage.removeItem('unifiedSearchBusiness');
      } catch (err) {
        console.error('Error parsing unified search data:', err);
      }
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchInputs(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!searchInputs.domain && !searchInputs.companyName) {
      return;
    }

    setLoading(true);

    try {

      setCompanyData(null);
      setOpenCorpData(null);
      setCompanyDetails(null);


      if (searchInputs.domain) {
        const companyResponse = await fetch(`http://127.0.0.1:5000/api/company/${encodeURIComponent(searchInputs.domain)}`);
        const companyData = await companyResponse.json();
        setCompanyData(companyData);
      }


      if (searchInputs.companyName) {
        const openCorpResponse = await fetch(`http://127.0.0.1:5000/api/opencorporates/${encodeURIComponent(searchInputs.companyName)}`);
        const openCorpResult = await openCorpResponse.json();
        console.log(openCorpResult);
        setOpenCorpData(openCorpResult.data);

        // If we have a company from OpenCorporates, fetch the detailed company info
        if (openCorpResult.data && openCorpResult.data.company) {
          const company = openCorpResult.data.company;
          const jurisdictionCode = company.jurisdiction_code;
          const companyNumber = company.company_number;

          if (jurisdictionCode && companyNumber) {
            const companyDetailsResponse = await fetch(
              `http://127.0.0.1:5000/api/company-details/${jurisdictionCode}/${companyNumber}`
            );

            if (companyDetailsResponse.ok) {
              const detailsData = await companyDetailsResponse.json();
              setCompanyDetails(detailsData.results.company);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const corpCompany = openCorpData?.company || null;

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
  const [expandedSections, setExpandedSections] = useState({
    officers: false,
    filings: false,
    industryData: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Render officers section
  const renderOfficers = () => {
    if (!companyDetails?.officers || companyDetails.officers.length === 0) {
      return <p className="text-gray-300 text-sm">No officers information available</p>;
    }

    return (
      <div className="mt-2">
        {companyDetails.officers.map((item, index) => (
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
                <p className="text-gray-500 text-sm font-normal leading-normal">Role</p>
                <p className="text-gray-300 text-sm font-normal leading-normal">
                  {item.officer.officer_role || 'N/A'}
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
    if (!companyDetails?.filings || companyDetails.filings.length === 0) {
      return <p className="text-gray-300 text-sm">No filings information available</p>;
    }

    return (
      <div className="mt-2">
        {companyDetails.filings.map((item, index) => (
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
              <div className="flex flex-col gap-1 py-2 pl-2 col-span-2">
                <p className="text-gray-500 text-sm font-normal leading-normal">Description</p>
                <p className="text-gray-300 text-sm font-normal leading-normal">
                  {item.filing.description || 'N/A'}
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
    if (!companyDetails?.industry_codes || companyDetails.industry_codes.length === 0) {
      return <p className="text-gray-300 text-sm">No industry codes available</p>;
    }

    return (
      <div className="mt-2">
        {companyDetails.industry_codes.map((item, index) => (
          <div key={index} className="border-t border-gray-800 py-2">
            <div className="grid grid-cols-1 gap-2">
              <div className="flex flex-col gap-1 py-2">
                <p className="text-gray-500 text-sm font-normal leading-normal">Code</p>
                <p className="text-gray-300 text-sm font-normal leading-normal">
                  {item.industry_code.code || 'N/A'}
                </p>
              </div>
              <div className="flex flex-col gap-1 py-2">
                <p className="text-gray-500 text-sm font-normal leading-normal">Description</p>
                <p className="text-gray-300 text-sm font-normal leading-normal">
                  {item.industry_code.description || 'N/A'}
                </p>
              </div>
              <div className="flex flex-col gap-1 py-2">
                <p className="text-gray-500 text-sm font-normal leading-normal">Code Scheme</p>
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

  const renderSocialLinks = () => {
    const socials = companyData?.socials || {};
    return (
      <div className="flex flex-wrap gap-2">
        {socials.linkedin_url && (
          <a href={socials.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">LinkedIn</a>
        )}
        {socials.twitter_url && (
          <a href={socials.twitter_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Twitter</a>
        )}
        {socials.facebook_url && (
          <a href={socials.facebook_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Facebook</a>
        )}
        {socials.instagram_url && (
          <a href={socials.instagram_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Instagram</a>
        )}
        {socials.youtube_url && (
          <a href={socials.youtube_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">YouTube</a>
        )}
      </div>
    );
  };

  return (
    <div className="relative flex size-full min-h-screen flex-col bg-gray-900 dark group/design-root overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        <Navbar />

        <div className="fixed top-20 left-0 right-0 z-10 flex justify-center px-4 py-3 bg-gray-900/80 backdrop-blur-md">
          <form onSubmit={handleSubmit} className="relative w-full max-w-3xl transition-all duration-300">
            <div className="flex flex-wrap items-center w-full rounded-xl border border-solid p-2 transition-all duration-300 gap-2 border-gray-700">
              <div className="flex w-full md:w-5/12 items-center rounded-lg border border-gray-700 bg-gray-800/50">
                <div className="flex justify-center items-center w-10 h-10 text-gray-400">
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  name="domain"
                  placeholder="Enter domain (e.g. example.com)"
                  className="w-full bg-transparent text-gray-200 h-10 text-base focus:outline-none"
                  value={searchInputs.domain}
                  onChange={handleInputChange}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                />
                {searchInputs.domain && (
                  <button
                    type="button"
                    className="pr-2 text-gray-400 hover:text-gray-200"
                    onClick={() => setSearchInputs(prev => ({ ...prev, domain: '' }))}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex w-full md:w-5/12 items-center rounded-lg border border-gray-700 bg-gray-800/50">
                <div className="flex justify-center items-center w-10 h-10 text-gray-400">
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  name="companyName"
                  placeholder="Enter company name"
                  className="w-full bg-transparent text-gray-200 h-10 text-base focus:outline-none"
                  value={searchInputs.companyName}
                  onChange={handleInputChange}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                />
                {searchInputs.companyName && (
                  <button
                    type="button"
                    className="pr-2 text-gray-400 hover:text-gray-200"
                    onClick={() => setSearchInputs(prev => ({ ...prev, companyName: '' }))}
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="w-full md:w-1/12 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                disabled={loading}
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {isSearchFocused && (
              <div className="absolute top-full left-0 right-0 mt-1 p-1 text-xs text-gray-400 bg-gray-800/90 backdrop-blur-sm rounded-md">
                Enter domain name or company name to fetch data. You can search by either or both fields.
              </div>
            )}
          </form>
        </div>

        <div className="px-4 md:px-40 flex flex-1 justify-center py-5 mt-[208px]">
          <div ref={contentRef} className="layout-content-container flex flex-col max-w-[960px] flex-1">
            <div className="flex flex-wrap justify-between gap-3 p-4">
              <p className="text-gray-300 tracking-light text-3xl font-bold leading-tight min-w-72">Business Report</p>
            </div>

            {loading ? (
              <div className="flex justify-center items-center p-20">
                <div className="text-gray-300 text-xl">Loading data...</div>
              </div>
            ) : !companyData && !openCorpData ? (
              <div className="flex justify-center items-center p-20 text-center">
                <div className="text-gray-300 text-xl">
                  Enter a domain name or company name above to search for business information
                </div>
              </div>
            ) : (
              <>
                {companyData && (
                  <>
                    <div className="flex p-4 @container">
                      <div className="flex w-full flex-col gap-4 @[520px]:flex-row @[520px]:justify-between @[520px]:items-center">
                        <div className="flex gap-4">
                          <div
                            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full min-h-32 w-32"
                            style={{ backgroundImage: `url("${companyData?.logo_url || '/placeholder-logo.png'}")` }}
                          />
                          <div className="flex flex-col justify-center">
                            <p className="text-gray-300 text-[22px] font-bold leading-tight tracking-[-0.015em]">{companyData?.name || 'Company Name'}</p>
                            <p className="text-gray-500 text-base font-normal leading-normal">
                              {companyData?.domain || 'Domain'} · Est. {companyData?.founded_year || 'Year'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2">
                      <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 pr-2">
                        <p className="text-gray-500 text-sm font-normal leading-normal">Industry</p>
                        <p className="text-gray-300 text-sm font-normal leading-normal">{companyData?.industry || 'N/A'}</p>
                      </div>
                      <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 pl-2">
                        <p className="text-gray-500 text-sm font-normal leading-normal">Categories</p>
                        <p className="text-gray-300 text-sm font-normal leading-normal">
                          {companyData?.categories?.join(', ') || 'N/A'}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 pr-2">
                        <p className="text-gray-500 text-sm font-normal leading-normal">Employee Range</p>
                        <p className="text-gray-300 text-sm font-normal leading-normal">{companyData?.employees || 'N/A'}</p>
                      </div>

                      <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 pl-2">
                        <p className="text-gray-500 text-sm font-normal leading-normal">Revenue Range</p>
                        <p className="text-gray-300 text-sm font-normal leading-normal">{companyData?.revenue || 'N/A'}</p>
                      </div>
                      <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 col-span-2">
                        <p className="text-gray-500 text-sm font-normal leading-normal">Social Media</p>
                        {renderSocialLinks()}
                      </div>

                      <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 pr-2">
                        <p className="text-gray-500 text-sm font-normal leading-normal">Technologies</p>
                        <p className="text-gray-300 text-sm font-normal leading-normal">
                          {companyData?.technologies?.join(', ') || 'N/A'}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 pl-2">
                        <p className="text-gray-500 text-sm font-normal leading-normal">Industry</p>
                        <p className="text-gray-300 text-sm font-normal leading-normal">
                          {companyData?.industry || 'N/A'}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 col-span-2">
                        <p className="text-gray-500 text-sm font-normal leading-normal">Description</p>
                        <p className="text-gray-300 text-sm font-normal leading-normal">{companyData?.description || 'N/A'}</p>
                      </div>
                    </div>

                    <h2 className="text-gray-300 text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">Location & Contact</h2>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2">
                      <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 pr-2">
                        <p className="text-gray-500 text-sm font-normal leading-normal">Address</p>
                        <p className="text-gray-300 text-sm font-normal leading-normal">
                          {companyData?.location?.address || 'N/A'}, {companyData?.location?.state?.name || ''} {companyData?.location?.country?.name || ''}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 pl-2">
                        <p className="text-gray-500 text-sm font-normal leading-normal">Phone</p>
                        <p className="text-gray-300 text-sm font-normal leading-normal">{companyData?.location?.phone || 'N/A'}</p>
                      </div>
                    </div>
                  </>
                )}

                {corpCompany && (
                  <div className="mt-6 bg-gray-800/40 rounded-lg border border-gray-700/50 overflow-hidden">
                    <div className="p-6">
                      <h2 className="text-gray-200 text-2xl font-bold mb-6">Company Information</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1 py-4 pl-2">
                          <p className="text-gray-500 text-sm font-normal leading-normal">Company Name</p>
                          <p className="text-gray-300 text-sm font-normal leading-normal">
                            {corpCompany.name || 'N/A'}
                          </p>
                        </div>

                        <div className="flex flex-col gap-1 py-4 pr-2">
                          <p className="text-gray-500 text-sm font-normal leading-normal">Company Number</p>
                          <p className="text-gray-300 text-sm font-normal leading-normal">
                            {corpCompany.company_number || 'N/A'}
                          </p>
                        </div>

                        <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 pl-2">
                          <p className="text-gray-500 text-sm font-normal leading-normal">Jurisdiction</p>
                          <p className="text-gray-300 text-sm font-normal leading-normal">
                            {corpCompany.jurisdiction_code?.toUpperCase() || 'N/A'}
                          </p>
                        </div>

                        <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 pr-2">
                          <p className="text-gray-500 text-sm font-normal leading-normal">Company Type</p>
                          <p className="text-gray-300 text-sm font-normal leading-normal">
                            {corpCompany.company_type || 'N/A'}
                          </p>
                        </div>

                        <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 pl-2">
                          <p className="text-gray-500 text-sm font-normal leading-normal">Registry URL</p>
                          <a
                            href={corpCompany.registry_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 text-sm font-normal leading-normal hover:underline"
                          >
                            {corpCompany.registry_url || 'N/A'}
                          </a>
                        </div>

                        <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 pr-2">
                          <p className="text-gray-500 text-sm font-normal leading-normal">OpenCorporates URL</p>
                          <a
                            href={corpCompany.opencorporates_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 text-sm font-normal leading-normal hover:underline"
                          >
                            {corpCompany.opencorporates_url || 'N/A'}
                          </a>
                        </div>

                        {corpCompany.registered_address && (
                          <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 col-span-2">
                            <p className="text-gray-500 text-sm font-normal leading-normal">Registered Address</p>
                            <p className="text-gray-300 text-sm font-normal leading-normal">
                              {corpCompany.registered_address_in_full ||
                                `${corpCompany.registered_address.street_address || ''}, 
                                ${corpCompany.registered_address.locality || ''}, 
                                ${corpCompany.registered_address.region || ''}, 
                                ${corpCompany.registered_address.postal_code || ''}, 
                                ${corpCompany.registered_address.country || ''}`}
                            </p>
                          </div>
                        )}

                        {corpCompany.source && (
                          <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 col-span-2">
                            <p className="text-gray-500 text-sm font-normal leading-normal">Data Source</p>
                            <div className="text-gray-300 text-sm font-normal leading-normal">
                              <p>Publisher: {corpCompany.source.publisher || 'N/A'}</p>
                              <p>Terms: {corpCompany.source.terms || 'N/A'}</p>
                              <p>Retrieved At: {corpCompany.source.retrieved_at || 'N/A'}</p>
                            </div>
                          </div>
                        )}

                        {corpCompany.industry_codes && corpCompany.industry_codes.length > 0 && (
                          <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 col-span-2">
                            <p className="text-gray-500 text-sm font-normal leading-normal">Industry Codes</p>
                            <div className="text-gray-300 text-sm font-normal leading-normal">
                              {corpCompany.industry_codes.map((item, index) => (
                                <div key={index} className="mb-1">
                                  {item.industry_code.code} - {item.industry_code.description}
                                  ({item.industry_code.code_scheme_name})
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Detailed company information from company-details API */}
                      {companyDetails && (
                        <>
                          <div className="border-t border-solid border-gray-800 py-4 mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1 py-4 pl-2">
                                <p className="text-gray-500 text-sm font-normal leading-normal">Incorporation Date</p>
                                <p className="text-gray-300 text-sm font-normal leading-normal">
                                  {formatDate(companyDetails.incorporation_date)}
                                </p>
                              </div>

                              <div className="flex flex-col gap-1 py-4 pr-2">
                                <p className="text-gray-500 text-sm font-normal leading-normal">Dissolution Date</p>
                                <p className="text-gray-300 text-sm font-normal leading-normal">
                                  {companyDetails.dissolution_date ? formatDate(companyDetails.dissolution_date) : 'N/A'}
                                </p>
                              </div>

                              <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 pl-2">
                                <p className="text-gray-500 text-sm font-normal leading-normal">Current Status</p>
                                <p className="text-gray-300 text-sm font-normal leading-normal">
                                  {companyDetails.current_status || 'N/A'}
                                </p>
                              </div>

                              <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 pr-2">
                                <p className="text-gray-500 text-sm font-normal leading-normal">Last Updated</p>
                                <p className="text-gray-300 text-sm font-normal leading-normal">
                                  {formatDate(companyDetails.updated_at)}
                                </p>
                              </div>
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
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessReport;