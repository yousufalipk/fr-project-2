import React, { useState, useEffect } from 'react';

const EmailProfile = () => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    emails: false,
    fullNames: false,
    usernames: false,
    domains: false,
    socialMedia: false,
    reviews: false
  });
  
  const email = "smocker600@gmail.com";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://127.0.0.1:5000/api2/search2/${email}`);
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const jsonData = await response.json();
        
        const extractedInfo = extractInfo(jsonData);
        setProfileData(extractedInfo);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);


  const extractInfo = (data) => {
    if (!data) return null;

    let extractedInfo = {
      emails: new Set(),
      usernames: new Set(),
      fullNames: new Set(),
      domains: new Set(),
      reviews: [],
      socialMedia: new Set()
    };

    const searchObject = (obj, path = "") => {
      if (!obj || typeof obj !== 'object') return;

      Object.entries(obj).forEach(([key, value]) => {
        const currentPath = path ? `${path}.${key}` : key;
        
 
        if (typeof value === 'string' && value.includes('@gm') && value.includes('.') && value.length < 100) {
          extractedInfo.emails.add(value);
        }

        if ((key === 'nickName' || key === 'username' || key === 'contactName' || key === 'familyName' || key === 'displayName') && typeof value === 'string') {
          extractedInfo.fullNames.add(value);
        }

        if ((key === 'nickName' || key === 'username') && value) {
          extractedInfo.usernames.add(value);
        }
        
        if (typeof value === 'string' && value.includes('http')) {
          try {
            const url = new URL(value);
            extractedInfo.domains.add(url.hostname);
          } catch {}
        }
        
        if (key === 'text' && typeof value === 'string' && value.length > 50) {
          extractedInfo.reviews.push(value);
        }
        
        if (typeof value === 'string' && 
            (value.includes('facebook') || value.includes('twitter') || 
             value.includes('instagram') || value.includes('linkedin') ||
             value.includes('yelp'))) {
          extractedInfo.socialMedia.add(value);
        }
        
        if (value && typeof value === 'object') {
          searchObject(value, currentPath);
        }
      });
    };

    const moduleData = data.module || data.data?.module;
    if (moduleData === 'yelp') {
      const userData = data.data || {};
      if (userData.name_with_nickname) extractedInfo.fullNames.add(userData.name_with_nickname);
      if (userData.name_without_period) extractedInfo.fullNames.add(userData.name_without_period);
      
      const reviewList = userData.review_list || [];
      reviewList.forEach(review => {
        if (review.text) extractedInfo.reviews.push(review.text);
      });
    }

    searchObject(data);

    return {
      emails: Array.from(extractedInfo.emails),
      usernames: Array.from(extractedInfo.usernames),
      fullNames: Array.from(extractedInfo.fullNames),
      domains: Array.from(extractedInfo.domains),
      reviews: extractedInfo.reviews,
      socialMedia: Array.from(extractedInfo.socialMedia)
    };
  };

  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const renderSection = (title, iconSvg, items, sectionKey) => {
    const hasMultipleItems = items && items.length > 1;
    const isExpanded = expandedSections[sectionKey];
    
    // Helper to determine if an item is a valid URL
    const isValidUrl = (string) => {
      try {
        new URL(string);
        return true;
      } catch {
        return false;
      }
    };
    
    // Helper to get platform name from URL
    const getPlatformName = (url) => {
      try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        // Extract domain name without extension
        const domain = hostname.split('.').slice(-2, -1)[0];
        return domain.charAt(0).toUpperCase() + domain.slice(1);
      } catch {
        return url;
      }
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
              
              {/* First item rendering with special handling for social media links */}
              {items && items.length > 0 && (
                <p className="text-gray-500 text-sm font-normal leading-normal line-clamp-2">
                  {sectionKey === "socialMedia" && isValidUrl(items[0]) ? (
                    <a href={items[0]} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                      {getPlatformName(items[0])}
                    </a>
                  ) : (
                    items[0]
                  )}
                </p>
              )}
              
              {/* Additional items when expanded, with special handling for social media links */}
              {hasMultipleItems && isExpanded && (
                <div className="mt-2">
                  {items.slice(1).map((item, index) => (
                    <p key={index} className="text-gray-500 text-sm font-normal leading-normal mt-1">
                      {sectionKey === "socialMedia" && isValidUrl(item) ? (
                        <a href={item} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                          {getPlatformName(item)}
                        </a>
                      ) : (
                        item
                      )}
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

  if (loading) return (
    <div className="relative flex size-full min-h-screen flex-col bg-gray-900 dark group/design-root overflow-x-hidden">
      <div className="flex items-center justify-center h-screen">
        <div className="text-white">Loading...</div>
      </div>
    </div>
  );

  if (error) return (
    <div className="relative flex size-full min-h-screen flex-col bg-gray-900 dark group/design-root overflow-x-hidden">
      <div className="flex items-center justify-center h-screen">
        <div className="text-white">{error}</div>
      </div>
    </div>
  );

  return (
    <div className="relative flex size-full min-h-screen flex-col bg-gray-900 dark group/design-root overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        <div className="px-4 md:px-40 flex flex-1 justify-center py-5 mt-14">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            <div className="flex flex-wrap justify-between gap-3 p-4">
              <div className="flex min-w-72 flex-col gap-3">
                <p className="text-gray-300 tracking-light text-3xl font-bold leading-tight">
                  Email profile report
                </p>
                <p className="text-gray-500 text-sm font-normal leading-normal">
                  This email profile report provides detailed information about the email address {email}.
                </p>
              </div>
            </div>
            
            {profileData && (
              <>
                {renderSection("Email addresses", 
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48Zm-96,85.15L52.57,64H203.43ZM98.71,128,40,181.81V74.19Zm11.84,10.85,12,11.05a8,8,0,0,0,10.82,0l12-11.05,58,53.15H52.57ZM157.29,128,216,74.18V181.82Z" />
                  </svg>,
                  profileData.emails,
                  "emails"
                )}

                {renderSection("Full names",
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z" />
                  </svg>,
                  profileData.fullNames,
                  "fullNames"
                )}

                {renderSection("Usernames",
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z" />
                  </svg>,
                  profileData.usernames,
                  "usernames"
                )}

                {renderSection("Domains",
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM101.63,168h52.74C149,186.34,140,202.87,128,215.89,116,202.87,107,186.34,101.63,168ZM98,152a145.72,145.72,0,0,1,0-48h60a145.72,145.72,0,0,1,0,48ZM40,128a87.61,87.61,0,0,1,3.33-24H81.79a161.79,161.79,0,0,0,0,48H43.33A87.61,87.61,0,0,1,40,128ZM154.37,88H101.63C107,69.66,116,53.13,128,40.11,140,53.13,149,69.66,154.37,88Zm19.84,16h38.46a88.15,88.15,0,0,1,0,48H174.21a161.79,161.79,0,0,0,0-48Zm32.16-16H170.94a142.39,142.39,0,0,0-20.26-45A88.37,88.37,0,0,1,206.37,88ZM105.32,43A142.39,142.39,0,0,0,85.06,88H49.63A88.37,88.37,0,0,1,105.32,43ZM49.63,168H85.06a142.39,142.39,0,0,0,20.26,45A88.37,88.37,0,0,1,49.63,168Zm101.05,45a142.39,142.39,0,0,0,20.26-45h35.43A88.37,88.37,0,0,1,150.68,213Z" />
                  </svg>,
                  profileData.domains,
                  "domains"
                )}

                {renderSection("Social Media",
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M176,16H80A24,24,0,0,0,56,40V216a24,24,0,0,0,24,24h96a24,24,0,0,0,24-24V40A24,24,0,0,0,176,16Zm8,200a8,8,0,0,1-8,8H80a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h96a8,8,0,0,1,8,8ZM168,56H88a8,8,0,0,0,0,16h80a8,8,0,0,0,0-16Zm-40,152a12,12,0,1,0-12-12A12,12,0,0,0,128,208Z" />
                  </svg>,
                  profileData.socialMedia,
                  "socialMedia"
                )}

                {profileData.reviews && profileData.reviews.length > 0 && renderSection("Reviews",
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-4,48a12,12,0,1,1-12,12A12,12,0,0,1,124,72Zm12,120a16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v48a8,8,0,0,1,0,16Z" />
                  </svg>,
                  profileData.reviews,
                  "reviews"
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailProfile;