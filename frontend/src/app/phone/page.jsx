"use client";
import Navbar from "@/components/Navbar";
import ProgressBar from "@/components/ProgressBar";
import React, { useState, useEffect } from "react";

const PhoneEmail = () => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [phoneNumber, setPhoneNumber] = useState("");
  const [searchedPhone, setSearchedPhone] = useState("");
  const [profileAPILoading, setProfileAPILoading] = useState(false);
  const [phoneAPILoading, setPhoneAPILoading] = useState(false);
  const [osintAPILoading, setOsintAPILoading] = useState(false);
  const [partialData, setPartialData] = useState(null);
  const [phoneValidationData, setPhoneValidationData] = useState(null);
  const [phoneValidationLoading, setPhoneValidationLoading] = useState(false);

  useEffect(() => {
    const unifiedSearchPhone = typeof window !== 'undefined' ? localStorage.getItem('unifiedSearchPhone') : null;
    
    if (unifiedSearchPhone) {
      setPhoneNumber(unifiedSearchPhone);
      
      const searchEvent = new Event('submit');
      const form = document.querySelector('form');
      if (form) {
        setTimeout(() => {
          form.dispatchEvent(searchEvent);
        }, 500);
      }
      
      localStorage.removeItem('unifiedSearchPhone');
    }
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!phoneNumber || phoneNumber.trim() === "") {
      setError("Please enter a valid phone number");
      return;
    }
    
    
    const cleanedNumber = phoneNumber.replace(/\D/g, "");
    
    if (cleanedNumber.length < 10) {
      setError("Please enter a valid phone number with at least 10 digits");
      return;
    }
    
    setSearchedPhone(cleanedNumber);
    setLoading(true);
    setError(null);
    setProfileData(null);
    setPartialData(null);
    setProfileAPILoading(true);
    setPhoneAPILoading(true);
    setOsintAPILoading(true);
    setPhoneValidationLoading(true);
    
    try {
      await fetchData(cleanedNumber);
    } catch (err) {
      setError(`Failed to fetch data: ${err.message}`);
      setLoading(false);
    }
  };

  const fetchData = async (phoneNum) => {
    try {
      let currentMergedData = {
        phones: [],
        emails: [],
        fullNames: [],
        addresses: [],
        websites: [],
        raw: {}
      };
      
      setPartialData(currentMergedData);
      
      fetch(`http://127.0.0.1:5000/validate/${phoneNum}`)
        .then(async response => {
          if (!response.ok) {
            throw new Error(`Phone validation API error! status: ${response.status}`);
          }
          const validationData = await response.json();
          setPhoneValidationData(validationData);
        })
        .catch(err => {
          console.error("Phone validation API error:", err);
        })
        .finally(() => {
          setPhoneValidationLoading(false);
        });
      
      fetch('http://127.0.0.1:5000//api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: phoneNum
        })
      }).then(async response => {
        if (!response.ok) {
          throw new Error(`Profile API error! status: ${response.status}`);
        }
        const profileAPIData = await response.json();
        const processedProfileData = processApiResponse(profileAPIData);
        
        currentMergedData = mergeData(processedProfileData, currentMergedData);
        setPartialData({...currentMergedData});
        setProfileAPILoading(false);
        
        if (!phoneAPILoading && !osintAPILoading && !phoneValidationLoading) {
          setLoading(false);
          setProfileData({...currentMergedData});
          localStorage.setItem('phoneOSINTData', JSON.stringify(currentMergedData));
        }
      }).catch(err => {
        setError(`Profile API error: ${err.message}`);
        setProfileAPILoading(false);
        if (!phoneAPILoading && !osintAPILoading && !phoneValidationLoading) {
          setLoading(false);
        }
      });
      
      fetch(`http://127.0.0.1:5000/fetch_phone_data?phone=${phoneNum}`).then(async response => {
        if (!response.ok) {
          throw new Error(`Phone data API error! status: ${response.status}`);
        }
        const phoneAPIData = await response.json();
        
        let osintAPIData = {};
        try {
          const osintResponse = await fetch(`http://127.0.0.1:5000/api/phone/osint?phone=${phoneNum}`);
          if (osintResponse.ok) {
            osintAPIData = await osintResponse.json();
          }
          setOsintAPILoading(false);
        } catch (err) {
          console.error("OSINT API error:", err);
          setOsintAPILoading(false);
        }
        
        const processedPhoneData = processPhoneApiData(phoneAPIData, osintAPIData);
        
        currentMergedData = mergeData(currentMergedData, processedPhoneData);
        setPartialData({...currentMergedData});
        setPhoneAPILoading(false);
        
        if (!profileAPILoading && !osintAPILoading && !phoneValidationLoading) {
          setLoading(false);
          setProfileData({...currentMergedData});
          localStorage.setItem('phoneOSINTData', JSON.stringify(currentMergedData));
        }
      }).catch(err => {
        setError(`Phone data API error: ${err.message}`);
        setPhoneAPILoading(false);
        if (!profileAPILoading && !osintAPILoading && !phoneValidationLoading) {
          setLoading(false);
        }
      });
      
    } catch (err) {
      setError(`Failed to fetch data: ${err.message}`);
      setLoading(false);
    }
  };

  const processApiResponse = (apiData) => {
    const processed = {
      phones: new Set(),
      emails: new Set(),
      fullNames: new Set(),
      addresses: new Set(),
      websites: new Set()
    };

    
    if (!apiData || !apiData.List) {
      return {
        phones: [],
        emails: [],
        fullNames: [],
        addresses: [],
        websites: [],
        raw: apiData
      };
    }

    Object.values(apiData.List).forEach(source => {
      source.Data.forEach(entry => {
        if (entry.Phone) processed.phones.add(entry.Phone);
        if (entry.Email) processed.emails.add(entry.Email);
        if (entry.FullName) processed.fullNames.add(entry.FullName);
        if (entry.FirstName && entry.LastName) {
          processed.fullNames.add(`${entry.FirstName} ${entry.LastName}`);
        }
        if (entry.Address) {
          const fullAddress = `${entry.Address}, ${entry.Region}, ${entry.State} ${entry.PostCode}`;
          processed.addresses.add(fullAddress);
        }
        if (entry.Site) processed.websites.add(entry.Site);
      });
    });

    return {
      phones: Array.from(processed.phones),
      emails: Array.from(processed.emails),
      fullNames: Array.from(processed.fullNames),
      addresses: Array.from(processed.addresses),
      websites: Array.from(processed.websites),
      raw: apiData 
    };
  };

  const processPhoneApiData = (data, osintData) => {
  const processed = {
    phones: [],
    fullNames: [],
    addresses: [],
    emails: [],
    websites: []
  };

  
  if (!data || !data.data || data.data.length === 0) {
  } else {
    const userData = data.data[0];
    
    if (userData.possibleOwners && userData.possibleOwners.length > 0) {
      const owner = userData.possibleOwners[0];
      
      
      if (owner.phones) {
        owner.phones.forEach(phone => {
          if (phone.number) {
            processed.phones.push(formatPhoneNumber(phone.number));
          }
        });
      }
      
      
      if (userData.number && !processed.phones.includes(formatPhoneNumber(userData.number))) {
        processed.phones.unshift(formatPhoneNumber(userData.number));
      }
      
      
      if (owner.names) {
        owner.names.forEach(name => {
          const fullName = [name.first, name.middle, name.last].filter(Boolean).join(' ');
          if (fullName) processed.fullNames.push(fullName);
        });
      }
      
      
      if (owner.locations) {
        owner.locations.forEach(location => {
          if (location.address) {
            const addressParts = [
              location.address.street,
              location.address.city,
              location.address.state_code,
              location.address.zip_code
            ].filter(Boolean);
            
            const formattedAddress = addressParts.join(', ');
            if (formattedAddress) processed.addresses.push(formattedAddress);
          }
        });
      }
      
      
      if (owner.emails) {
        owner.emails.forEach(email => {
          if (email.address) processed.emails.push(email.address);
        });
      }
      
      
      if (owner.otherContacts) {
        const websites = owner.otherContacts
          .filter(contact => contact.name && !contact.name.includes("Consumers") && !contact.name.includes("public records"))
          .map(contact => contact.name);
        
        
        const uniqueWebsites = [...new Set(websites)];
        processed.websites = uniqueWebsites;
      }
    }
  }


  if (osintData && osintData.status === 'success' && osintData.data && osintData.data.length > 0) {
    const moduleNames = osintData.data.map(module => module.module);
    
    moduleNames.forEach(moduleName => {
      if (moduleName && !processed.websites.includes(moduleName)) {
        processed.websites.push(moduleName);
      }
    });
    
    osintData.data.forEach(module => {
      if (module.module === 'apple' && module.data) {
        if (module.data.phone_numbers && Array.isArray(module.data.phone_numbers)) {
          module.data.phone_numbers.forEach(phone => {
            if (!processed.phones.includes(phone)) {
              processed.phones.push(phone);
            }
          });
        }
        
        if (module.data.main_email) {
          processed.emails.push(module.data.main_email);
        }
      }
      
      if (module.module === 'eyecon' && module.data) {
        if (module.data.name && !processed.fullNames.includes(module.data.name)) {
          processed.fullNames.push(module.data.name);
        }
        
        if (module.data.profile_url && !processed.websites.includes(module.data.profile_url)) {
          processed.websites.push(module.data.profile_url);
        }
      }
      
      if (module.data && module.data.address) {
        processed.addresses.push(module.data.address);
      }
    });
  }

  // Remove duplicates
  processed.phones = [...new Set(processed.phones)];
  processed.emails = [...new Set(processed.emails)];
  processed.fullNames = [...new Set(processed.fullNames)];
  processed.addresses = [...new Set(processed.addresses)];
  processed.websites = [...new Set(processed.websites)];

  return processed;
};

  
  const formatPhoneNumber = (phoneNumber) => {
    
    if (phoneNumber.length === 10) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6)}`;
    }
    return phoneNumber;
  };

  
  const mergeData = (data1, data2) => {
    const merged = {
      phones: [...new Set([...data1.phones, ...data2.phones])],
      emails: [...new Set([...data1.emails, ...data2.emails])],
      fullNames: [...new Set([...data1.fullNames, ...data2.fullNames])],
      addresses: [...new Set([...data1.addresses, ...data2.addresses])],
      websites: [...new Set([...data1.websites, ...data2.websites])],
      raw: { api1: data1.raw, api2: data2 }
    };
    
    return merged;
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderSection = (title, iconSvg, items, sectionKey) => {
    const hasMultipleItems = items && items.length > 1;
    const isExpanded = expandedSections[sectionKey];
    
    // Helper function to check if a string is a valid URL
    const isValidUrl = (string) => {
      try {
        new URL(string);
        return true;
      } catch {
        return false;
      }
    };
    
    // Helper function to check if a string is a domain
    const isDomain = (string) => {
      return /\.[a-z]{2,}$/i.test(string);
    };

    // Helper to add protocol if missing
    const ensureProtocol = (url) => {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      return 'https://' + url;
    };
    
    // Helper to render a text item that could be a URL/domain
    const renderTextItem = (text) => {
      if ((isValidUrl(text) || isDomain(text)) && (sectionKey === "websites" || sectionKey === "domains")) {
        return (
          <a 
            href={ensureProtocol(text)} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-400 hover:underline"
          >
            {text}
          </a>
        );
      }
      return text;
    };

    return (
      <>
        <h3 className="text-gray-300 text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">
          {title}
        </h3>
        <div className="flex items-center gap-4 bg-gray-900 px-4 min-h-[72px] py-2 justify-between">
          <div className="flex items-center gap-4">
            <div className="text-gray-300 flex items-center justify-center rounded-md bg-gray-800 shrink-0 size-12">
              {iconSvg}
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-gray-300 text-base font-medium leading-normal line-clamp-1">
                {`Verified ${title.toLowerCase()}`}
              </p>
              <p className="text-gray-500 text-sm font-normal leading-normal line-clamp-2">
                {items && items.length > 0 ? renderTextItem(items[0]) : 'Not available'}
              </p>
              {hasMultipleItems && isExpanded && (
                <div className="mt-2">
                  {items.slice(1).map((item, index) => (
                    <p key={index} className="text-gray-500 text-sm font-normal leading-normal mt-1">
                      {renderTextItem(item)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
          {hasMultipleItems && (
            <div className="shrink-0" onClick={() => toggleSection(sectionKey)}>
              <div className="text-gray-300 flex size-7 items-center justify-center cursor-pointer">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24px"
                  height="24px"
                  fill="currentColor"
                  viewBox="0 0 256 256"
                  style={{
                    transform: isExpanded ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s'
                  }}
                >
                  <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="relative flex size-full min-h-screen flex-col bg-gray-900 dark group/design-root overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        <Navbar/>
        <div className="px-4 md:px-40 flex flex-1 justify-center py-5 mt-14">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            <div className="flex flex-wrap justify-between gap-3 p-4">
              <div className="flex min-w-72 flex-col gap-3">
                <p className="text-gray-300 tracking-light text-3xl font-bold leading-tight">
                  Comprehensive Profile Report
                </p>
                <p className="text-gray-500 text-sm font-normal leading-normal">
                  Search for any phone number to get comprehensive information from multiple sources.
                </p>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter phone number (e.g., 9177839188)"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </form>
              {error && (
                <p className="text-red-400 mt-2">{error}</p>
              )}
            </div>
            
            {loading && (
              <ProgressBar 
                apiStatuses={{
                  "Profile API": profileAPILoading,
                  "Phone API": phoneAPILoading,
                  "OSINT API": osintAPILoading,
                  "Phone Validation": phoneValidationLoading
                }}
              />
            )}
            
            {!loading && !profileData && !error && (
              <div className="text-center py-10">
                <p className="text-gray-400 text-lg">Enter a phone number to search</p>
              </div>
            )}
            
            {partialData && !profileData && (
              <>
                <div className="mb-4">
                  <p className="text-gray-300 text-lg">
                    Results for: <span className="font-bold">{formatPhoneNumber(searchedPhone)}</span>
                    {(profileAPILoading || phoneAPILoading || osintAPILoading || phoneValidationLoading) && 
                      " (Still loading some data...)"
                    }
                  </p>
                </div>
                
                {renderSection("Phone numbers", 
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M222.37,158.46l-47.11-21.11-.13-.06a16,16,0,0,0-15.17,1.4,8.12,8.12,0,0,0-.75.56L134.87,160c-15.42-7.49-31.34-23.29-38.83-38.51l20.78-24.71c.2-.25.39-.5.57-.77a16,16,0,0,0,1.32-15.06l0-.12L97.54,33.64a16,16,0,0,0-16.62-9.52A56.26,56.26,0,0,0,32,80c0,79.4,64.6,144,144,144a56.26,56.26,0,0,0,55.88-48.92A16,16,0,0,0,222.37,158.46ZM176,208A128.14,128.14,0,0,1,48,80,40.2,40.2,0,0,1,82.87,40a.61.61,0,0,0,0,.12l21,47L83.2,111.86a6.13,6.13,0,0,0-.57.77,16,16,0,0,0-1,15.7c9.06,18.53,27.73,37.06,46.46,46.11a16,16,0,0,0,15.75-1.14,8.44,8.44,0,0,0,.74-.56L168.89,152l47,21.05h0s.08,0,.11,0A40.21,40.21,0,0,1,176,208Z" />
                  </svg>,
                  partialData.phones,
                  "phones"
                )}

                {renderSection("Full names",
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z" />
                  </svg>,
                  partialData.fullNames,
                  "names"
                )}

                {renderSection("Addresses",
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M228.92,49.69a8,8,0,0,0-6.86-1.45L160.93,63.52,99.58,32.84a8,8,0,0,0-5.52-.6l-64,16A8,8,0,0,0,24,56V200a8,8,0,0,0,9.94,7.76l61.13-15.28,61.35,30.68A8.15,8.15,0,0,0,160,224a8,8,0,0,0,1.94-.24l64-16A8,8,0,0,0,232,200V56A8,8,0,0,0,228.92,49.69ZM104,52.94l48,24V203.06l-48-24ZM40,62.25l48-12v127.5l-48,12Zm176,131.5-48,12V78.25l48-12Z" />
                  </svg>,
                  partialData.addresses,
                  "addresses"
                )}

                {renderSection("Email",
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48Zm-96,85.15L52.57,64H203.43ZM98.71,128,40,181.81V74.19Zm11.84,10.85,12,11.05a8,8,0,0,0,10.82,0l12-11.05,58,53.15H52.57ZM157.29,128,216,74.18V181.82Z" />
                  </svg>,
                  partialData.emails,
                  "emails"
                )}

                {renderSection("Websites",
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM101.63,168h52.74C149,186.34,140,202.87,128,215.89,116,202.87,107,186.34,101.63,168ZM98,152a145.72,145.72,0,0,1,0-48h60a145.72,145.72,0,0,1,0,48ZM40,128a87.61,87.61,0,0,1,3.33-24H81.79a161.79,161.79,0,0,0,0,48H43.33A87.61,87.61,0,0,1,40,128ZM154.37,88H101.63C107,69.66,116,53.13,128,40.11,140,53.13,149,69.66,154.37,88Zm19.84,16h38.46a88.15,88.15,0,0,1,0,48H174.21a161.79,161.79,0,0,0,0-48Zm32.16-16H170.94a142.39,142.39,0,0,0-20.26-45A88.37,88.37,0,0,1,206.37,88ZM105.32,43A142.39,142.39,0,0,0,85.06,88H49.63A88.37,88.37,0,0,1,105.32,43ZM49.63,168H85.06a142.39,142.39,0,0,0,20.26,45A88.37,88.37,0,0,1,49.63,168Zm101.05,45a142.39,142.39,0,0,0,20.26-45h35.43A88.37,88.37,0,0,1,150.68,213Z" />
                  </svg>,
                  partialData.websites,
                  "websites"
                )}
              </>
            )}
            
            {profileData && (
              <>
                <div className="mb-4">
                  <p className="text-gray-300 text-lg">
                    Results for: <span className="font-bold">{formatPhoneNumber(searchedPhone)}</span>
                  </p>
                </div>
                
                {renderSection("Phone numbers", 
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M222.37,158.46l-47.11-21.11-.13-.06a16,16,0,0,0-15.17,1.4,8.12,8.12,0,0,0-.75.56L134.87,160c-15.42-7.49-31.34-23.29-38.83-38.51l20.78-24.71c.2-.25.39-.5.57-.77a16,16,0,0,0,1.32-15.06l0-.12L97.54,33.64a16,16,0,0,0-16.62-9.52A56.26,56.26,0,0,0,32,80c0,79.4,64.6,144,144,144a56.26,56.26,0,0,0,55.88-48.92A16,16,0,0,0,222.37,158.46ZM176,208A128.14,128.14,0,0,1,48,80,40.2,40.2,0,0,1,82.87,40a.61.61,0,0,0,0,.12l21,47L83.2,111.86a6.13,6.13,0,0,0-.57.77,16,16,0,0,0-1,15.7c9.06,18.53,27.73,37.06,46.46,46.11a16,16,0,0,0,15.75-1.14,8.44,8.44,0,0,0,.74-.56L168.89,152l47,21.05h0s.08,0,.11,0A40.21,40.21,0,0,1,176,208Z" />
                  </svg>,
                  profileData.phones,
                  "phones"
                )}

                {renderSection("Full names",
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z" />
                  </svg>,
                  profileData.fullNames,
                  "names"
                )}

                {renderSection("Addresses",
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M228.92,49.69a8,8,0,0,0-6.86-1.45L160.93,63.52,99.58,32.84a8,8,0,0,0-5.52-.6l-64,16A8,8,0,0,0,24,56V200a8,8,0,0,0,9.94,7.76l61.13-15.28,61.35,30.68A8.15,8.15,0,0,0,160,224a8,8,0,0,0,1.94-.24l64-16A8,8,0,0,0,232,200V56A8,8,0,0,0,228.92,49.69ZM104,52.94l48,24V203.06l-48-24ZM40,62.25l48-12v127.5l-48,12Zm176,131.5-48,12V78.25l48-12Z" />
                  </svg>,
                  profileData.addresses,
                  "addresses"
                )}

                {renderSection("Email",
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48Zm-96,85.15L52.57,64H203.43ZM98.71,128,40,181.81V74.19Zm11.84,10.85,12,11.05a8,8,0,0,0,10.82,0l12-11.05,58,53.15H52.57ZM157.29,128,216,74.18V181.82Z" />
                  </svg>,
                  profileData.emails,
                  "emails"
                )}

                {renderSection("Websites",
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM101.63,168h52.74C149,186.34,140,202.87,128,215.89,116,202.87,107,186.34,101.63,168ZM98,152a145.72,145.72,0,0,1,0-48h60a145.72,145.72,0,0,1,0,48ZM40,128a87.61,87.61,0,0,1,3.33-24H81.79a161.79,161.79,0,0,0,0,48H43.33A87.61,87.61,0,0,1,40,128ZM154.37,88H101.63C107,69.66,116,53.13,128,40.11,140,53.13,149,69.66,154.37,88Zm19.84,16h38.46a88.15,88.15,0,0,1,0,48H174.21a161.79,161.79,0,0,0,0-48Zm32.16-16H170.94a142.39,142.39,0,0,0-20.26-45A88.37,88.37,0,0,1,206.37,88ZM105.32,43A142.39,142.39,0,0,0,85.06,88H49.63A88.37,88.37,0,0,1,105.32,43ZM49.63,168H85.06a142.39,142.39,0,0,0,20.26,45A88.37,88.37,0,0,1,49.63,168Zm101.05,45a142.39,142.39,0,0,0,20.26-45h35.43A88.37,88.37,0,0,1,150.68,213Z" />
                  </svg>,
                  profileData.websites,
                  "websites"
                )}
                
                {phoneValidationData && (
                  <div className="mt-6 bg-gray-900 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-gray-800 flex items-center justify-between">
                      <h3 className="text-gray-200 text-lg font-medium">Phone Validation Details</h3>
                      <button 
                        onClick={() => toggleSection('phoneValidation')}
                        className="text-gray-400 hover:text-gray-300 focus:outline-none"
                      >
                        {expandedSections['phoneValidation'] ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
                            <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
                            <path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    
                    {(expandedSections['phoneValidation'] === undefined || expandedSections['phoneValidation']) && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4">
                          <p className="text-gray-500 text-sm font-normal leading-normal">Carrier</p>
                          <p className="text-gray-300 text-sm font-normal leading-normal">{phoneValidationData.dipCarrier || 'N/A'}</p>
                        </div>
                        <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4">
                          <p className="text-gray-500 text-sm font-normal leading-normal">Messaging Provider</p>
                          <p className="text-gray-300 text-sm font-normal leading-normal">{phoneValidationData.dipMessagingProvider || 'N/A'}</p>
                        </div>
                        <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4">
                          <p className="text-gray-500 text-sm font-normal leading-normal">Country</p>
                          <p className="text-gray-300 text-sm font-normal leading-normal">{phoneValidationData.geoCountry || 'N/A'}</p>
                        </div>
                        <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4">
                          <p className="text-gray-500 text-sm font-normal leading-normal">Messaging Country Code</p>
                          <p className="text-gray-300 text-sm font-normal leading-normal">{phoneValidationData.dipMessagingCountryCode || 'N/A'}</p>
                        </div>
                        <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4">
                          <p className="text-gray-500 text-sm font-normal leading-normal">State</p>
                          <p className="text-gray-300 text-sm font-normal leading-normal">{phoneValidationData.geoState || 'N/A'}</p>
                        </div>
                        <div className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4">
                          <p className="text-gray-500 text-sm font-normal leading-normal">City</p>
                          <p className="text-gray-300 text-sm font-normal leading-normal">{phoneValidationData.geoCity || 'N/A'}</p>
                        </div>
                      </div>
                    )}
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

export default PhoneEmail;