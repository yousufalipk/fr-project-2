import React, { useState, useEffect } from 'react';

const UserDataDisplay = () => {
  const [userData, setUserData] = useState(null);
  const [emailData, setEmailData] = useState(null);
  const [mergedData, setMergedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  const email = "smocker600@gmail.com"; // You can make this dynamic if needed

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch data from both APIs in parallel
      const [userDataResponse, emailDataResponse] = await Promise.all([
        fetch('http://127.0.0.1:5000/fetch_user_data'),
        fetch(`http://127.0.0.1:5000/api2/search2/${email}`)
      ]);
      
      if (!userDataResponse.ok) {
        throw new Error(`User API request failed with status ${userDataResponse.status}`);
      }
      
      if (!emailDataResponse.ok) {
        throw new Error(`Email API request failed with status ${emailDataResponse.status}`);
      }
      
      const userData = await userDataResponse.json();
      const emailData = await emailDataResponse.json();
      
      // Process email data
      const processedEmailData = extractInfo(emailData);
      
      setUserData(userData);
      setEmailData(processedEmailData);
      
      // Merge the data
      const merged = mergeData(userData, processedEmailData);
      setMergedData(merged);
      
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

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

  // Merge data from both sources intelligently
  const mergeData = (userData, emailData) => {
    if (!userData || !userData.data || userData.data.length === 0) {
      return null;
    }
    
    const person = JSON.parse(JSON.stringify(userData.data[0])); // Deep clone to avoid modifying original
    
    if (emailData) {
      // Add emails from email profile to contact information
      if (emailData.emails && emailData.emails.length > 0) {
        if (!person.emails) person.emails = [];
        emailData.emails.forEach(email => {
          // Check if email already exists
          if (!person.emails.some(e => e.address === email)) {
            person.emails.push({ address: email, source: "Email Profile" });
          }
        });
      }
      
      // Add names from email profile
      if (emailData.fullNames && emailData.fullNames.length > 0) {
        if (!person.names) person.names = [];
        emailData.fullNames.forEach(name => {
          // Split name by spaces
          const nameParts = name.trim().split(/\s+/);
          if (nameParts.length >= 2) {
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ');
            
            // Check if this name already exists
            if (!person.names.some(n => n.first === firstName && n.last === lastName)) {
              person.names.push({ first: firstName, last: lastName, source: "Email Profile" });
            }
          } else if (nameParts.length === 1) {
            // Just a username/nickname
            if (!person.names.some(n => n.first === nameParts[0])) {
              person.names.push({ first: nameParts[0], last: "", source: "Email Profile" });
            }
          }
        });
      }
      
      // Add social profiles
      if (emailData.socialMedia && emailData.socialMedia.length > 0) {
        if (!person.socialProfiles) person.socialProfiles = [];
        emailData.socialMedia.forEach(profile => {
          try {
            const url = new URL(profile);
            const domain = url.hostname;
            // Check if this profile already exists
            if (!person.socialProfiles.some(p => p.url === profile)) {
              person.socialProfiles.push({ 
                domain: domain,
                url: profile,
                name: domain.split('.')[0],
                source: "Email Profile"
              });
            }
          } catch {
            // Not a valid URL, just add it as is
            if (!person.socialProfiles.some(p => p.url === profile)) {
              person.socialProfiles.push({ 
                domain: "unknown",
                url: profile,
                name: profile,
                source: "Email Profile"
              });
            }
          }
        });
      }
      
      // Add review content as a new section
      if (emailData.reviews && emailData.reviews.length > 0) {
        person.reviews = emailData.reviews;
      }
      
      // Add domains as other profiles
      if (emailData.domains && emailData.domains.length > 0) {
        if (!person.otherProfiles) person.otherProfiles = [];
        emailData.domains.forEach(domain => {
          if (!person.otherProfiles.some(p => p.domain === domain)) {
            person.otherProfiles.push({
              domain: domain,
              category: "personal_profiles",
              name: domain,
              source: "Email Profile"
            });
          }
        });
      }
    }
    
    return { data: [person] };
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Helper function to format phone numbers
  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return '';
    
    // Format: (XXX) XXX-XXXX
    const cleaned = ('' + phoneNumber).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    
    return phoneNumber;
  };

  // Helper function to format dates
  const formatDate = (date) => {
    if (!date) return 'Unknown';
    
    return `${date.month}/${date.day}/${date.year}`;
  };

  const renderSection = (title, iconSvg, items, sectionKey) => {
    if (!items || (Array.isArray(items) && items.length === 0)) return null;
    
    const isExpanded = expandedSections[sectionKey];

    const renderContent = () => {
      switch(sectionKey) {
        case "personal":
          return (
            <div className="mt-2">
              {items.names && items.names.length > 0 && (
                <div className="border-t border-gray-800 pt-2">
                  <p className="text-gray-500 text-sm font-normal leading-normal">
                    Full Name: {items.names[0].first} {items.names[0].last}
                  </p>
                  <p className="text-gray-400 text-xs">Source: Personal Record</p>
                </div>
              )}
              {items.gender && (
                <div className="mt-2 border-t border-gray-800 pt-2">
                  <p className="text-gray-500 text-sm font-normal leading-normal">
                    Gender: {items.gender.content}
                  </p>
                  <p className="text-gray-400 text-xs">Source: Personal Record</p>
                </div>
              )}
            </div>
          );
          
        case "contact":
          return (
            <div className="mt-2">
              {items.emails && items.emails.map((email, idx) => (
                <div key={`email-${idx}`} className="mt-2 border-t border-gray-800 pt-2">
                  <p className="text-gray-500 text-sm font-normal leading-normal">
                    {email.address}
                  </p>
                  <p className="text-gray-400 text-xs">Source: {email.source || "Contact Records"}</p>
                </div>
              ))}
              {items.phones && items.phones.map((phone, idx) => (
                <div key={`phone-${idx}`} className="mt-2 border-t border-gray-800 pt-2">
                  <p className="text-gray-500 text-sm font-normal leading-normal">
                    {formatPhoneNumber(phone.number)} ({phone.line_type})
                  </p>
                  <p className="text-gray-400 text-xs">Source: Contact Records</p>
                </div>
              ))}
            </div>
          );
          
        case "locations":
          return (
            <div className="mt-2">
              {items.map((location, idx) => (
                <div key={`location-${idx}`} className="mt-2 border-t border-gray-800 pt-2">
                  <p className="text-gray-500 text-sm font-normal leading-normal">
                    {location.address.street}, {location.address.city}, {location.address.state} {location.address.zip_code}
                  </p>
                  <p className="text-gray-400 text-xs">First seen: {formatDate(location.address.date_first_seen?.date)}</p>
                </div>
              ))}
            </div>
          );
          
        case "education":
          return (
            <div className="mt-2">
              {items.map((education, idx) => (
                <div key={`edu-${idx}`} className="mt-2 border-t border-gray-800 pt-2">
                  <p className="text-gray-500 text-sm font-normal leading-normal">
                    {education.display}
                  </p>
                  <p className="text-gray-400 text-xs">Source: Education Records</p>
                </div>
              ))}
            </div>
          );
          
        case "social":
          return (
            <div className="mt-2">
              {items.socialProfiles && items.socialProfiles.map((profile, idx) => (
                <div key={`social-${idx}`} className="mt-2 border-t border-gray-800 pt-2">
                  <p className="text-gray-500 text-sm font-normal leading-normal">
                    {getSocialIcon(profile.domain)} 
                    {profile.url ? (
                      <a href={profile.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                        {profile.name || profile.domain}
                      </a>
                    ) : (
                      profile.name || profile.domain
                    )}
                  </p>
                  <p className="text-gray-400 text-xs">Source: {profile.source || "Social Media Profiles"}</p>
                </div>
              ))}
              {items.otherProfiles && items.otherProfiles
                .filter(profile => profile.category === "personal_profiles")
                .map((profile, idx) => (
                  <div key={`other-${idx}`} className="mt-2 border-t border-gray-800 pt-2">
                    <p className="text-gray-500 text-sm font-normal leading-normal">
                      {getSocialIcon(profile.domain)} 
                      {profile.url ? (
                        <a href={profile.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                          {profile.name || profile.domain}
                        </a>
                      ) : (
                        profile.name || profile.domain
                      )}
                    </p>
                    <p className="text-gray-400 text-xs">Source: {profile.source || "Other Online Profiles"}</p>
                  </div>
                ))}
            </div>
          );
        
        case "reviews":
          return (
            <div className="mt-2">
              {items.map((review, idx) => (
                <div key={`review-${idx}`} className="mt-2 border-t border-gray-800 pt-2">
                  <p className="text-gray-500 text-sm font-normal leading-normal">
                    {review.length > 100 ? `${review.substring(0, 100)}...` : review}
                  </p>
                  <p className="text-gray-400 text-xs">Source: Online Reviews</p>
                </div>
              ))}
            </div>
          );
          
        default:
          return null;
      }
    };

    // Get display labels for each section
    const getDisplayData = () => {
      switch(sectionKey) {
        case "personal":
          const name = items.names && items.names.length > 0 
            ? `${items.names[0].first} ${items.names[0].last}` 
            : "Personal information";
          return { 
            title: "Personal Information",
            label: "Verified personal data",
            value: name
          };
        case "contact":
          const primaryEmail = items.emails && items.emails.length > 0 
            ? items.emails[0].address 
            : (items.phones && items.phones.length > 0 
              ? formatPhoneNumber(items.phones[0].number) 
              : "Contact information");
          return { 
            title: "Contact Information",
            label: "Verified contact details",
            value: primaryEmail
          };
        case "locations":
          const primaryLocation = items && items.length > 0 
            ? `${items[0].address.city}, ${items[0].address.state_code}` 
            : "Location information";
          return { 
            title: "Locations",
            label: "Verified locations",
            value: primaryLocation
          };
        case "education":
          const primaryEducation = items && items.length > 0 
            ? items[0].display 
            : "Education information";
          return { 
            title: "Education",
            label: "Verified education history",
            value: primaryEducation
          };
        case "social":
          const primarySocial = items.socialProfiles && items.socialProfiles.length > 0 
            ? items.socialProfiles[0].name 
            : (items.otherProfiles && items.otherProfiles.length > 0 
              ? items.otherProfiles[0].name || items.otherProfiles[0].domain 
              : "Social profiles");
          return { 
            title: "Social Profiles",
            label: "Verified social accounts",
            value: primarySocial
          };
        case "reviews":
          return { 
            title: "User Reviews",
            label: "Online Reviews",
            value: items.length > 0 ? `${items.length} reviews found` : "Reviews"
          };
        default:
          return { title: title, label: "Information", value: "Data" };
      }
    };

    const displayData = getDisplayData();
    const hasMultipleItems = (
      (sectionKey === "personal" && ((items.names && items.names.length > 0) || items.gender)) ||
      (sectionKey === "contact" && ((items.emails && items.emails.length > 0) || (items.phones && items.phones.length > 0))) ||
      (sectionKey === "locations" && items && items.length > 0) ||
      (sectionKey === "education" && items && items.length > 0) ||
      (sectionKey === "social" && ((items.socialProfiles && items.socialProfiles.length > 0) || 
        (items.otherProfiles && items.otherProfiles.filter(p => p.category === "personal_profiles").length > 0))) ||
      (sectionKey === "reviews" && items && items.length > 0)
    );

    return (
      <>
        <h3 className="text-gray-300 text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">
          {displayData.title}
        </h3>
        <div className="flex items-center gap-4 bg-gray-900 px-4 min-h-[72px] py-2 justify-between">
          <div className="flex items-center gap-4">
            <div className="text-gray-300 flex items-center justify-center rounded-md bg-gray-800 shrink-0 size-12">
              {iconSvg}
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-gray-300 text-base font-medium leading-normal line-clamp-1">
                {displayData.label}
              </p>
              <p className="text-gray-500 text-sm font-normal leading-normal line-clamp-2">
                {displayData.value}
              </p>
              
              {hasMultipleItems && isExpanded && renderContent()}
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

  const getSocialIcon = (domain) => {
    // Just returning text here, but you could use SVG icons to match the other sections
    if (domain && domain.includes('google')) return '🅖';
    if (domain && domain.includes('vk.com')) return 'Ⓥ';
    if (domain && domain.includes('facebook')) return 'ⓕ';
    if (domain && domain.includes('twitter')) return '𝕏';
    if (domain && domain.includes('instagram')) return 'ⓘ';
    if (domain && domain.includes('linkedin')) return 'ⓛ';
    return '🌐';
  };

  const renderSummary = () => {
    if (!mergedData || !mergedData.data || mergedData.data.length === 0) return null;
    
    const person = mergedData.data[0];
    
    // Count the total reviews
    const reviewCount = person.reviews ? person.reviews.length : 0;
    
    return (
      <div className="bg-gray-900 p-4 rounded-lg mb-4">
        <h3 className="text-gray-300 text-lg font-bold mb-3">Summary</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-800 p-3 rounded flex flex-col">
            <span className="text-gray-400 text-sm">Total Names</span>
            <span className="text-gray-200 font-medium">{person.names ? person.names.length : 0}</span>
          </div>
          <div className="bg-gray-800 p-3 rounded flex flex-col">
            <span className="text-gray-400 text-sm">Total Phones</span>
            <span className="text-gray-200 font-medium">{person.phones ? person.phones.length : 0}</span>
          </div>
          <div className="bg-gray-800 p-3 rounded flex flex-col">
            <span className="text-gray-400 text-sm">Total Location Data</span>
            <span className="text-gray-200 font-medium">{person.locations ? person.locations.length : 0}</span>
          </div>
          <div className="bg-gray-800 p-3 rounded flex flex-col">
            <span className="text-gray-400 text-sm">Total Social Profiles</span>
            <span className="text-gray-200 font-medium">
              {(person.socialProfiles ? person.socialProfiles.length : 0) + 
              (person.otherProfiles ? person.otherProfiles.filter(p => p.category === "personal_profiles").length : 0)}
            </span>
          </div>
          {reviewCount > 0 && (
            <div className="bg-gray-800 p-3 rounded flex flex-col">
              <span className="text-gray-400 text-sm">Total Reviews</span>
              <span className="text-gray-200 font-medium">{reviewCount}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) return <div className="text-white">Loading...</div>;
  if (error) return <div className="text-white">{error}</div>;
  if (!mergedData || !mergedData.data || mergedData.data.length === 0) {
    return <div className="text-white p-4">No user data found.</div>;
  }

  const person = mergedData.data[0];

  return (
    <div className="layout-content-container flex flex-col max-w-[960px] flex-1 mt-12">
      <div className="flex flex-wrap justify-between gap-3 p-4">
        <div className="flex min-w-72 flex-col gap-3">
          <p className="text-gray-300 tracking-light text-3xl font-bold leading-tight">
            Unified OSINT Report
          </p>
          <p className="text-gray-500 text-sm font-normal leading-normal">
            This report provides combined information from multiple data sources.
          </p>
        </div>
      </div>
      
      {renderSummary()}
      
      {renderSection("Personal Information", 
        <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
          <path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z" />
        </svg>,
        person,
        "personal"
      )}
      
      {renderSection("Contact Information", 
        <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
          <path d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48Zm-96,85.15L52.57,64H203.43ZM98.71,128,40,181.81V74.19Zm11.84,10.85,12,11.05a8,8,0,0,0,10.82,0l12-11.05,58,53.15H52.57ZM157.29,128,216,74.18V181.82Z" />
        </svg>,
        person,
        "contact"
      )}
      
      {renderSection("Locations", 
        <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
          <path d="M128,16a88.1,88.1,0,0,0-88,88c0,75.3,80,132.17,83.41,134.55a8,8,0,0,0,9.18,0C136,236.17,216,179.3,216,104A88.1,88.1,0,0,0,128,16Zm0,56a32,32,0,1,1-32,32A32,32,0,0,1,128,72Z" />
        </svg>,
        person.locations,
        "locations"
      )}
      
      {renderSection("Education", 
        <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
          <path d="M251.76,88.94l-120-64a8,8,0,0,0-7.52,0l-120,64a8,8,0,0,0,0,14.12L32,117.87v48.42a15.91,15.91,0,0,0,4.06,10.65C49.16,191.53,78.51,216,128,216a130.83,130.83,0,0,0,48-8.76V240a8,8,0,0,0,16,0V199.51a115.12,115.12,0,0,0,27.94-22.57A15.91,15.91,0,0,0,224,166.29V117.87l27.76-14.81a8,8,0,0,0,0-14.12ZM208,166.29c0,.23-.07.45-.1.68-14.93,20.26-37.1,33.69-79.9,33-43.55-.67-65.24-22.42-80-41.77V126.4l75.76,40.4a8,8,0,0,0,7.52,0l76.72-40.91ZM128,150.93,35.35,96,128,41.07,220.65,96Z" />
        </svg>,
        person.educations,
        "education"
      )}
      
      {renderSection("Social Profiles", 
        <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
          <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0ZM96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120ZM198.77,181.41a80.17,80.17,0,0,0-46.09-37.82,48,48,0,1,0-49.36,0,80.17,80.17,0,0,0-46.09,37.82,88,88,0,1,1,141.54,0Z" />
        </svg>,
        person,
        "social"
      )}
      
      {person.reviews && person.reviews.length > 0 && renderSection("User Reviews", 
        <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
          <path d="M180,64H40A12,12,0,0,0,28,76V192a12,12,0,0,0,12,12H204a12,12,0,0,0,12-12V112A48,48,0,0,0,180,64ZM40,84H96.23l-17.9,36a8,8,0,0,0,3.38,10.8,8.24,8.24,0,0,0,3.7.92,8,8,0,0,0,7.12-4.4L113.65,84H168V84a8,8,0,0,0,16,0,32,32,0,0,1,32,32v64H40Z" />
        </svg>,
        person.reviews,
        "reviews"
      )}
    </div>
  );
};

export default UserDataDisplay;