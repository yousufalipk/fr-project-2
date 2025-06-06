"use client";
import Navbar from "@/components/Navbar";
import ProgressBar from "@/components/ProgressBar";
import React, { useState, useEffect } from "react";

const EmailOSINT = () => {
  const [emailData, setEmailData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [combinedData, setCombinedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [email, setEmail] = useState("");
  const [searchedEmail, setSearchedEmail] = useState("");
  const [emailOSINTLoading, setEmailOSINTLoading] = useState(false);
  const [userDataLoading, setUserDataLoading] = useState(false);
  const [search2Loading, setSearch2Loading] = useState(false);
  const [partialData, setPartialData] = useState(null);

  // Check for data from unified search on component mount
  useEffect(() => {
    const unifiedSearchEmail = typeof window !== 'undefined' ? localStorage.getItem('unifiedSearchEmail') : null;
    
    if (unifiedSearchEmail) {
      // Set the email from unified search
      setEmail(unifiedSearchEmail);
      
      // Perform search automatically
      const searchEvent = new Event('submit');
      const form = document.querySelector('form');
      if (form) {
        setTimeout(() => {
          form.dispatchEvent(searchEvent);
        }, 500);
      }
      
      // Clear the stored data
      localStorage.removeItem('unifiedSearchEmail');
    }
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!email || email.trim() === "") {
      setError("Please enter a valid email address");
      return;
    }
    
    // Basic email validation using regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    
    setSearchedEmail(email);
    setLoading(true);
    setError(null);
    setEmailData(null);
    setUserData(null);
    setCombinedData(null);
    setPartialData(null);
    setEmailOSINTLoading(true);
    setUserDataLoading(true);
    setSearch2Loading(true);
    
    try {
      await fetchAllData(email);
    } catch (err) {
      setError(`Failed to fetch data: ${err.message}`);
      setLoading(false);
    }
  };

  const fetchAllData = async (emailToSearch) => {
    setLoading(true);
    
    // Initialize an empty object with the structure needed for the UI
    let currentMergedData = {
      emails: [],
      passwords: [],
      ipAddresses: [],
      names: [],
      addresses: [],
      phones: [],
      usernames: [],
      domains: [],
      locations: [],
      registrationDates: [],
      socialProfiles: [],
      reviews: [],
      summary: {
        totalEmails: 0,
        totalPasswords: 0,
        totalIPs: 0,
        totalNames: 0,
        totalAddresses: 0,
        totalPhones: 0,
        totalUsernames: 0,
        totalDomains: 0,
        totalLocations: 0,
        totalRegistrationDates: 0,
        totalSocialProfiles: 0,
        totalReviews: 0
      }
    };
    
    // Set initial partial data to show empty sections
    setPartialData({...currentMergedData});
    
    try {
      // Create variables to store the processed data from each API
      let processedEmailOSINTData = null;
      let processedUserData = null;
      let processedSearch2Data = null;
      
      // Fetch email OSINT data
      fetch('http://127.0.0.1:5000/api/email/osint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailToSearch
        })
      }).then(async response => {
        if (!response.ok) {
          throw new Error(`Email OSINT API request failed with status ${response.status}`);
        }
        
        const emailOSINTData = await response.json();
        processedEmailOSINTData = processApiResponse(emailOSINTData);
        
        setEmailData({
          raw: emailOSINTData,
          processed: processedEmailOSINTData
        });
        
        // Update the partial data with email OSINT results
        currentMergedData = mergeAllData(processedUserData, processedEmailOSINTData, processedSearch2Data);
        setPartialData({...currentMergedData});
        setEmailOSINTLoading(false);
        
        // If all APIs have completed, set loading to false and finalize data
        if (!userDataLoading && !search2Loading) {
          setLoading(false);
          setCombinedData({...currentMergedData});
          localStorage.setItem('emailOSINTData', JSON.stringify(currentMergedData));
        }
      }).catch(err => {
        setError(`Email OSINT API error: ${err.message}`);
        setEmailOSINTLoading(false);
        if (!userDataLoading && !search2Loading) {
          setLoading(false);
        }
      });
      
      // Fetch user data
      fetch('http://127.0.0.1:5000/fetch_user_data').then(async response => {
        if (!response.ok) {
          throw new Error(`User API request failed with status ${response.status}`);
        }
        
        const userDataResult = await response.json();
        processedUserData = extractUserData(userDataResult);
        setUserData(userDataResult);
        
        // Update the partial data with user data results
        currentMergedData = mergeAllData(processedUserData, processedEmailOSINTData, processedSearch2Data);
        setPartialData({...currentMergedData});
        setUserDataLoading(false);
        
        // If all APIs have completed, set loading to false and finalize data
        if (!emailOSINTLoading && !search2Loading) {
          setLoading(false);
          setCombinedData({...currentMergedData});
          localStorage.setItem('emailOSINTData', JSON.stringify(currentMergedData));
        }
      }).catch(err => {
        setError(`User API error: ${err.message}`);
        setUserDataLoading(false);
        if (!emailOSINTLoading && !search2Loading) {
          setLoading(false);
        }
      });
      
      // Fetch search2 data
      fetch(`http://127.0.0.1:5000/api2/search2/${emailToSearch}`).then(async response => {
        if (!response.ok) {
          throw new Error(`Search2 API request failed with status ${response.status}`);
        }
        
        const search2Data = await response.json();
        processedSearch2Data = processSearch2Data(search2Data);
        
        // Update the partial data with search2 results
        currentMergedData = mergeAllData(processedUserData, processedEmailOSINTData, processedSearch2Data);
        setPartialData({...currentMergedData});
        setSearch2Loading(false);
        
        // If all APIs have completed, set loading to false and finalize data
        if (!emailOSINTLoading && !userDataLoading) {
          setLoading(false);
          setCombinedData({...currentMergedData});
          localStorage.setItem('emailOSINTData', JSON.stringify(currentMergedData));
        }
      }).catch(err => {
        setError(`Search2 API error: ${err.message}`);
        setSearch2Loading(false);
        if (!emailOSINTLoading && !userDataLoading) {
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
      emails: new Set(),
      passwords: new Set(),
      ipAddresses: new Set(),
      names: new Set(),
      addresses: new Set(),
      usernames: new Set(),
      registrationDates: new Set(),
      locations: new Set(),
      phones: new Set(),
      sources: {}
    };

    Object.entries(apiData.List).forEach(([sourceName, sourceInfo]) => {
      processed.sources[sourceName] = {
        infoLeak: sourceInfo.InfoLeak,
        data: []
      };

      sourceInfo.Data.forEach(entry => {
        if (entry.Email) processed.emails.add(entry.Email);
        if (entry.email) processed.emails.add(entry.email);
        if (entry.EMAIL) processed.emails.add(entry.EMAIL);
        
        if (entry.Password) {
          processed.passwords.add({
            value: entry.Password,
            source: sourceName
          });
        }
        if (entry.password) {
          processed.passwords.add({
            value: entry.password,
            source: sourceName
          });
        }
        if (entry['Password(MD5+Salt)']) {
          processed.passwords.add({
            value: entry['Password(MD5+Salt)'],
            type: 'MD5+Salt',
            salt: entry.Salt || '',
            source: sourceName
          });
        }
        if (entry['Password(SIC)']) {
          processed.passwords.add({
            value: entry['Password(SIC)'],
            type: 'SIC',
            source: sourceName
          });
        }
        
        if (entry.IP) {
          processed.ipAddresses.add({
            value: entry.IP,
            source: sourceName
          });
        }
        if (entry.ip) {
          processed.ipAddresses.add({
            value: entry.ip,
            source: sourceName
          });
        }
        
        if (entry.FirstName && entry.LastName) {
          processed.names.add({
            value: `${entry.FirstName} ${entry.LastName}`,
            source: sourceName
          });
        }
        if (entry.name) {
          processed.names.add({
            value: entry.name,
            source: sourceName
          });
        }
        if (entry.fullName) {
          processed.names.add({
            value: entry.fullName,
            source: sourceName
          });
        }
        
        if (entry.City || entry.State || entry.PostCode) {
          let address = '';
          if (entry.City) address += entry.City;
          if (entry.State) address += address ? `, ${entry.State}` : entry.State;
          if (entry.PostCode) address += address ? ` ${entry.PostCode}` : entry.PostCode;
          
          if (address) {
            processed.addresses.add({
              value: address,
              source: sourceName
            });
          }
        }
        if (entry.address) {
          processed.addresses.add({
            value: entry.address,
            source: sourceName
          });
        }
        
        if (entry.NickName) {
          processed.usernames.add({
            value: entry.NickName,
            source: sourceName
          });
        }
        if (entry.username) {
          processed.usernames.add({
            value: entry.username,
            source: sourceName
          });
        }
        if (entry.nickname) {
          processed.usernames.add({
            value: entry.nickname,
            source: sourceName
          });
        }
        
        if (entry.RegDate) {
          processed.registrationDates.add({
            value: entry.RegDate,
            source: sourceName
          });
        }
        if (entry.regDate) {
          processed.registrationDates.add({
            value: entry.regDate,
            source: sourceName
          });
        }
        if (entry['RegDate(UNIX)']) {
          const date = new Date(parseInt(entry['RegDate(UNIX)']) * 1000);
          processed.registrationDates.add({
            value: date.toISOString().split('T')[0],
            timestamp: entry['RegDate(UNIX)'],
            source: sourceName
          });
        }
        
        if (entry.TimeZone) {
          processed.locations.add({
            value: `UTC${entry.TimeZone > 0 ? '+' : ''}${entry.TimeZone}`,
            type: 'TimeZone',
            source: sourceName
          });
        }
        if (entry.timezone) {
          processed.locations.add({
            value: entry.timezone,
            type: 'TimeZone',
            source: sourceName
          });
        }
        
        if (entry.City || entry.State || entry.PostCode) {
          let locationData = [];
          if (entry.City) locationData.push(entry.City);
          if (entry.State) locationData.push(entry.State);
          if (entry.PostCode) locationData.push(entry.PostCode);
          
          processed.locations.add({
            value: locationData.join(', '),
            type: 'Address',
            source: sourceName
          });
        }
        if (entry.location) {
          processed.locations.add({
            value: entry.location,
            type: 'Location',
            source: sourceName
          });
        }
        
        if (entry.Phone) {
          processed.phones.add({
            value: entry.Phone,
            source: sourceName
          });
        }
        if (entry.phone) {
          processed.phones.add({
            value: entry.phone,
            source: sourceName
          });
        }
        if (entry.PHONE) {
          processed.phones.add({
            value: entry.PHONE,
            source: sourceName
          });
        }
        
        processed.sources[sourceName].data.push(entry);
      });
    });

    return {
      emails: Array.from(processed.emails),
      passwords: Array.from(processed.passwords),
      ipAddresses: Array.from(processed.ipAddresses),
      names: Array.from(processed.names),
      addresses: Array.from(processed.addresses),
      usernames: Array.from(processed.usernames),
      registrationDates: Array.from(processed.registrationDates),
      locations: Array.from(processed.locations),
      phones: Array.from(processed.phones),
      sources: processed.sources,
      summary: {
        numOfDatabase: apiData.NumOfDatabase,
        numOfResults: apiData.NumOfResults,
        price: apiData.price,
        searchTime: apiData.search_time || apiData['search time'],
        totalNames: Array.from(processed.names).length,
        totalPhones: Array.from(processed.phones).length,
        totalLocations: Array.from(processed.locations).length,
        totalUsernames: Array.from(processed.usernames).length
      }
    };
  };

  const processSearch2Data = (data) => {
    if (!data) return null;

    const processed = {
      emails: new Set(),
      usernames: new Set(),
      names: new Set(),
      domains: new Set(),
      reviews: [],
      socialProfiles: []
    };

    // Extract module names from the data if it's an array of modules
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (item.module) {
          // Special handling for whoxy module
          if (item.module === 'whoxy' && item.data && item.data.length > 0 && item.data[0].enrichment && item.data[0].enrichment.domain) {
            processed.domains.add(item.data[0].enrichment.domain);
          } else {
            processed.domains.add(item.module);
          }
        }
      });
    }

    const searchObject = (obj, path = "") => {
      if (!obj || typeof obj !== 'object') return;

      // If this object has a module property, add it to domains
      if (obj.module && typeof obj.module === 'string') {
        // Special handling for whoxy module
        if (obj.module === 'whoxy' && obj.data && obj.data.length > 0 && obj.data[0].enrichment && obj.data[0].enrichment.domain) {
          processed.domains.add(obj.data[0].enrichment.domain);
        } else {
          processed.domains.add(obj.module);
        }
      }

      Object.entries(obj).forEach(([key, value]) => {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'string' && value.includes('@') && value.includes('.') && value.length < 100) {
          processed.emails.add(value);
        }

        if ((key === 'nickName' || key === 'username' || key === 'contactName' || 
            key === 'familyName' || key === 'displayName' || key === 'name_with_nickname' || 
            key === 'name_without_period') && typeof value === 'string') {
          processed.names.add({
            value: value,
            source: "Search2 API"
          });
        }

        if ((key === 'nickName' || key === 'username') && value) {
          processed.usernames.add({
            value: value,
            source: "Search2 API"
          });
        }
        
        if (typeof value === 'string' && value.includes('http')) {
          try {
            const url = new URL(value);
            processed.domains.add(url.hostname);
          } catch {}
        }
        
        if (key === 'text' && typeof value === 'string' && value.length > 50) {
          processed.reviews.push({
            value: value,
            source: "Search2 API"
          });
        }
        
        if (typeof value === 'string' && 
            (value.includes('facebook') || value.includes('twitter') || 
             value.includes('instagram') || value.includes('linkedin') ||
             value.includes('yelp'))) {
          processed.socialProfiles.push({
            value: value,
            platform: value.includes('facebook') ? 'Facebook' : 
                      value.includes('twitter') ? 'Twitter' :
                      value.includes('instagram') ? 'Instagram' :
                      value.includes('linkedin') ? 'LinkedIn' :
                      value.includes('yelp') ? 'Yelp' : 'Unknown',
            source: "Search2 API"
          });
        }
        
        if (value && typeof value === 'object') {
          searchObject(value, currentPath);
        }
      });
    };

    const moduleData = data.module || data.data?.module;
    if (moduleData === 'yelp') {
      const userData = data.data || {};
      if (userData.name_with_nickname) {
        processed.names.add({
          value: userData.name_with_nickname,
          source: "Search2 API (Yelp)"
        });
      }
      if (userData.name_without_period) {
        processed.names.add({
          value: userData.name_without_period,
          source: "Search2 API (Yelp)"
        });
      }
      
      const reviewList = userData.review_list || [];
      reviewList.forEach(review => {
        if (review.text) {
          processed.reviews.push({
            value: review.text,
            source: "Search2 API (Yelp)"
          });
        }
      });
    }

    searchObject(data);

    return {
      emails: Array.from(processed.emails),
      names: Array.from(processed.names),
      usernames: Array.from(processed.usernames),
      domains: Array.from(processed.domains),
      reviews: processed.reviews,
      socialProfiles: processed.socialProfiles
    };
  };

  const mergeAllData = (userData, emailOSINTData, search2Data) => {
    // Create a base structure if all inputs are null
    if (!userData && !emailOSINTData && !search2Data) {
      return {
        emails: [],
        passwords: [],
        ipAddresses: [],
        names: [],
        addresses: [],
        phones: [],
        usernames: [],
        domains: [],
        locations: [],
        registrationDates: [],
        socialProfiles: [],
        reviews: [],
        summary: {
          totalEmails: 0,
          totalPasswords: 0,
          totalIPs: 0,
          totalNames: 0,
          totalAddresses: 0,
          totalPhones: 0,
          totalUsernames: 0,
          totalDomains: 0,
          totalLocations: 0,
          totalRegistrationDates: 0,
          totalSocialProfiles: 0,
          totalReviews: 0
        }
      };
    }
    
    // Start with emailOSINT data as the base
    const merged = emailOSINTData ? {
      emails: [...emailOSINTData.emails],
      passwords: [...emailOSINTData.passwords],
      ipAddresses: [...emailOSINTData.ipAddresses],
      names: [...emailOSINTData.names],
      addresses: [...emailOSINTData.addresses],
      phones: [...emailOSINTData.phones],
      usernames: [...emailOSINTData.usernames],
      domains: [],
      locations: [...emailOSINTData.locations],
      registrationDates: [...emailOSINTData.registrationDates],
      socialProfiles: [],
      reviews: [],
      summary: {
        totalEmails: emailOSINTData.emails.length,
        totalPasswords: emailOSINTData.passwords.length,
        totalIPs: emailOSINTData.ipAddresses.length,
        totalNames: emailOSINTData.names.length,
        totalAddresses: emailOSINTData.addresses.length,
        totalPhones: emailOSINTData.phones.length,
        totalUsernames: emailOSINTData.usernames.length,
        totalDomains: 0,
        totalLocations: emailOSINTData.locations.length,
        totalRegistrationDates: emailOSINTData.registrationDates.length,
        totalSocialProfiles: 0,
        totalReviews: 0
      }
    } : {
      emails: [],
      passwords: [],
      ipAddresses: [],
      names: [],
      addresses: [],
      phones: [],
      usernames: [],
      domains: [],
      locations: [],
      registrationDates: [],
      socialProfiles: [],
      reviews: [],
      summary: {
        totalEmails: 0,
        totalPasswords: 0,
        totalIPs: 0,
        totalNames: 0,
        totalAddresses: 0,
        totalPhones: 0,
        totalUsernames: 0,
        totalDomains: 0,
        totalLocations: 0,
        totalRegistrationDates: 0,
        totalSocialProfiles: 0,
        totalReviews: 0
      }
    };
    
    // Merge userData if available
    if (userData) {
      // Add emails from userData
      if (userData.emails) {
        userData.emails.forEach(email => {
          if (!merged.emails.some(e => typeof e === 'string' ? e === email.value : e.value === email.value)) {
            merged.emails.push(email);
          }
        });
      }
      
      // Add names from userData
      if (userData.names) {
        userData.names.forEach(name => {
          if (!merged.names.some(n => typeof n === 'string' ? n === name.value : n.value === name.value)) {
            merged.names.push(name);
          }
        });
      }
      
      // Add phones from userData
      if (userData.phones) {
        userData.phones.forEach(phone => {
          if (!merged.phones.some(p => typeof p === 'string' ? p === phone.value : p.value === phone.value)) {
            merged.phones.push(phone);
          }
        });
      }
      
      // Add addresses from userData
      if (userData.addresses) {
        userData.addresses.forEach(address => {
          if (!merged.addresses.some(a => typeof a === 'string' ? a === address.value : a.value === address.value)) {
            merged.addresses.push(address);
          }
        });
      }
      
      // Add social profiles from userData
      if (userData.socialProfiles) {
        merged.socialProfiles = [...merged.socialProfiles, ...userData.socialProfiles];
      }
      
      // Add reviews from userData
      if (userData.reviews) {
        merged.reviews = [...merged.reviews, ...userData.reviews];
      }
    }
    
    // Merge search2Data if available
    if (search2Data) {
      // Add emails from search2Data
      if (search2Data.emails) {
        search2Data.emails.forEach(email => {
          if (!merged.emails.some(e => typeof e === 'string' ? e === email : e.value === email)) {
            merged.emails.push(email);
          }
        });
      }
      
      // Add names from search2Data
      if (search2Data.names) {
        search2Data.names.forEach(name => {
          if (!merged.names.some(n => typeof n === 'string' ? n === name.value : n.value === name.value)) {
            merged.names.push(name);
          }
        });
      }
      
      // Add usernames from search2Data
      if (search2Data.usernames) {
        search2Data.usernames.forEach(username => {
          if (!merged.usernames.some(u => typeof u === 'string' ? u === username.value : u.value === username.value)) {
            merged.usernames.push(username);
          }
        });
      }
      
      // Add domains from search2Data
      if (search2Data.domains) {
        merged.domains = search2Data.domains;
      }
      
      // Add social profiles from search2Data
      if (search2Data.socialProfiles) {
        merged.socialProfiles = [...merged.socialProfiles, ...search2Data.socialProfiles];
      }
      
      // Add reviews from search2Data
      if (search2Data.reviews) {
        merged.reviews = [...merged.reviews, ...search2Data.reviews];
      }
    }
    
    // Update summary counts
    merged.summary.totalEmails = merged.emails.length;
    merged.summary.totalPasswords = merged.passwords.length;
    merged.summary.totalIPs = merged.ipAddresses.length;
    merged.summary.totalNames = merged.names.length;
    merged.summary.totalAddresses = merged.addresses.length;
    merged.summary.totalPhones = merged.phones.length;
    merged.summary.totalUsernames = merged.usernames.length;
    merged.summary.totalDomains = merged.domains.length;
    merged.summary.totalLocations = merged.locations.length;
    merged.summary.totalRegistrationDates = merged.registrationDates.length;
    merged.summary.totalSocialProfiles = merged.socialProfiles.length;
    merged.summary.totalReviews = merged.reviews.length;
    
    return merged;
  };

  const extractUserData = (data) => {
    if (!data || !data.data || data.data.length === 0) return null;
    
    const person = data.data[0];
    
    const extracted = {
      emails: [],
      names: [],
      phones: [],
      addresses: [],
      socialProfiles: [],
      reviews: []
    };
    
    if (person.emails && person.emails.length) {
      person.emails.forEach(email => {
        if (email.address) {
          extracted.emails.push({
            value: email.address,
            source: "User Data API"
          });
        }
      });
    }
    
    if (person.names && person.names.length) {
      person.names.forEach(name => {
        const fullName = `${name.first || ''} ${name.middle || ''} ${name.last || ''}`.trim();
        if (fullName) {
          extracted.names.push({
            value: fullName,
            source: "User Data API"
          });
        }
      });
    }
    
    if (person.phones && person.phones.length) {
      person.phones.forEach(phone => {
        if (phone.number) {
          extracted.phones.push({
            value: phone.number,
            type: phone.type || 'Unknown',
            source: "User Data API"
          });
        }
      });
    }
    
    if (person.addresses && person.addresses.length) {
      person.addresses.forEach(address => {
        let formattedAddress = '';
        if (address.street) formattedAddress += address.street;
        if (address.city) formattedAddress += formattedAddress ? `, ${address.city}` : address.city;
        if (address.state) formattedAddress += formattedAddress ? `, ${address.state}` : address.state;
        if (address.zip) formattedAddress += formattedAddress ? ` ${address.zip}` : address.zip;
        if (address.country) formattedAddress += formattedAddress ? `, ${address.country}` : address.country;
        
        if (formattedAddress) {
          extracted.addresses.push({
            value: formattedAddress,
            type: address.type || 'Unknown',
            source: "User Data API"
          });
        }
      });
    }
    
    if (person.socialProfiles && person.socialProfiles.length) {
      person.socialProfiles.forEach(profile => {
        if (profile.url) {
          extracted.socialProfiles.push({
            value: profile.url,
            platform: profile.name || 'Unknown',
            source: "User Data API"
          });
        }
      });
    }
    
    if (person.reviews && person.reviews.length) {
      person.reviews.forEach(review => {
        if (typeof review === 'string') {
          extracted.reviews.push({
            value: review,
            source: "User Data API"
          });
        } else if (review.text) {
          extracted.reviews.push({
            value: review.text,
            source: "User Data API"
          });
        }
      });
    }
    
    return extracted;
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderSection = (title, iconSvg, items, sectionKey) => {
    if (!items || items.length === 0) return null;
    
    const hasMultipleItems = items.length > 1;
    const isExpanded = expandedSections[sectionKey];

    // Special handling for domain items and social profiles
    const isDomainSection = sectionKey === "domains";
    const isSocialProfilesSection = sectionKey === "socialProfiles";
    
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
    
    // Helper function to extract platform name from URL
    const getPlatformNameFromUrl = (url) => {
      try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        const domain = hostname.split('.').slice(-2, -1)[0];
        return domain.charAt(0).toUpperCase() + domain.slice(1);
      } catch {
        return url;
      }
    };
    
    // Helper function to render a social profile item
    const renderSocialProfileItem = (item) => {
      const value = typeof item === 'string' ? item : item.value;
      const source = typeof item === 'string' ? "Search2 API" : item.source;
      const platform = typeof item === 'string' ? getPlatformNameFromUrl(value) : (item.platform || getPlatformNameFromUrl(value));
      
      if (isValidUrl(value)) {
        return (
          <div>
            <p className="text-gray-500 text-sm">
              <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                {platform}
              </a>
            </p>
            <p className="text-gray-400 text-xs">Source: {source}</p>
          </div>
        );
      } else {
        return (
          <div>
            <p className="text-gray-500 text-sm">{value}</p>
            <p className="text-gray-400 text-xs">Source: {source}</p>
          </div>
        );
      }
    };

    // Helper to render a text item that could be a URL/domain
    const renderTextItem = (text) => {
      if ((isValidUrl(text) || isDomain(text)) && isDomainSection) {
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
              
              {/* First item rendering */}
              {isSocialProfilesSection ? (
                renderSocialProfileItem(items[0])
              ) : (
                typeof items[0] === 'string' ? (
                  <p className="text-gray-500 text-sm font-normal leading-normal line-clamp-2">
                    {renderTextItem(items[0])}
                  </p>
                ) : (
                  <div className="text-gray-500 text-sm font-normal leading-normal line-clamp-2">
                    <p className="text-gray-500">{items[0].value}</p>
                    <p className="text-gray-400 text-xs">Source: {items[0].source}</p>
                  </div>
                )
              )}
              
              {/* Additional items when expanded */}
              {hasMultipleItems && isExpanded && (
                <div className="mt-3 space-y-2">
                  {items.slice(1).map((item, index) => (
                    <div key={index} className="border-t border-gray-800 pt-2">
                      {isSocialProfilesSection ? (
                        renderSocialProfileItem(item)
                      ) : (
                        typeof item === 'string' ? (
                          <p className="text-gray-500 text-sm">{renderTextItem(item)}</p>
                        ) : (
                          <div>
                            <p className="text-gray-500 text-sm">{item.value}</p>
                            <p className="text-gray-400 text-xs">Source: {item.source}</p>
                          </div>
                        )
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {hasMultipleItems && (
            <div 
              className="text-gray-300 cursor-pointer hover:text-gray-100"
              onClick={() => toggleSection(sectionKey)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="currentColor"
                viewBox="0 0 256 256"
                className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              >
                <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
              </svg>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderSummary = () => {
    if (!combinedData) return null;
    
    const summary = combinedData.summary;
    
    return (
      <div className="bg-gray-900 p-4 rounded-lg mb-4">
        <h3 className="text-gray-300 text-lg font-bold mb-3">Summary</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-800 p-3 rounded flex flex-col">
            <span className="text-gray-400 text-sm">Total Names</span>
            <span className="text-gray-200 font-medium">{summary.totalNames}</span>
          </div>
          <div className="bg-gray-800 p-3 rounded flex flex-col">
            <span className="text-gray-400 text-sm">Total Phones</span>
            <span className="text-gray-200 font-medium">{summary.totalPhones}</span>
          </div>
          <div className="bg-gray-800 p-3 rounded flex flex-col">
            <span className="text-gray-400 text-sm">Total Location Data</span>
            <span className="text-gray-200 font-medium">{summary.totalLocations}</span>
          </div>
          <div className="bg-gray-800 p-3 rounded flex flex-col">
            <span className="text-gray-400 text-sm">Total Usernames</span>
            <span className="text-gray-200 font-medium">{summary.totalUsernames}</span>
          </div>
          <div className="bg-gray-800 p-3 rounded flex flex-col">
            <span className="text-gray-400 text-sm">Total Domains</span>
            <span className="text-gray-200 font-medium">{summary.totalDomains || 0}</span>
          </div>
          <div className="bg-gray-800 p-3 rounded flex flex-col">
            <span className="text-gray-400 text-sm">Total Social Profiles</span>
            <span className="text-gray-200 font-medium">{summary.totalSocialProfiles || 0}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderSocialProfiles = () => {
    if (!combinedData || !combinedData.socialProfiles || combinedData.socialProfiles.length === 0) return null;
    
    return renderSection("Social Profiles", 
      <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
        <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM101.63,168h52.74C149,186.34,140,202.87,128,215.89,116,202.87,107,186.34,101.63,168ZM98,152a145.72,145.72,0,0,1,0-48h60a145.72,145.72,0,0,1,0,48ZM40,128a87.61,87.61,0,0,1,3.33-24H81.79a161.79,161.79,0,0,0,0,48H43.33A87.61,87.61,0,0,1,40,128ZM154.37,88H101.63C107,69.66,116,53.13,128,40.11,140,53.13,149,69.66,154.37,88Zm19.84,16h38.46a88.15,88.15,0,0,1,0,48H174.21a161.79,161.79,0,0,0,0-48Zm32.16-16H170.94a142.39,142.39,0,0,0-20.26-45A88.37,88.37,0,0,1,206.37,88ZM105.32,43A142.39,142.39,0,0,0,85.06,88H49.63A88.37,88.37,0,0,1,105.32,43ZM49.63,168H85.06a142.39,142.39,0,0,0,20.26,45A88.37,88.37,0,0,1,49.63,168Zm101.05,45a142.39,142.39,0,0,0,20.26-45h35.43A88.37,88.37,0,0,1,150.68,213Z" />
      </svg>,
      combinedData.socialProfiles,
      "socialProfiles"
    );
  };

  const renderReviews = () => {
    if (!combinedData || !combinedData.reviews || combinedData.reviews.length === 0) return null;
    
    return renderSection("Reviews", 
      <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
        <path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-68-56a12,12,0,1,1-12-12A12,12,0,0,1,140,152Z" />
      </svg>,
      combinedData.reviews,
      "reviews"
    );
  };

  if (error) return <div className="text-white">{error}</div>;

  return (
    <div className="relative flex size-full min-h-screen flex-col bg-gray-900 dark group/design-root overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        <Navbar/>
        <div className="px-4 md:px-40 flex flex-1 justify-center py-5 mt-14">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            <div className="flex flex-wrap justify-between gap-3 p-4">
              <div className="flex min-w-72 flex-col gap-3">
                <p className="text-gray-300 tracking-light text-3xl font-bold leading-tight">
                  Email OSINT Report
                </p>
                <p className="text-gray-500 text-sm font-normal leading-normal">
                  Search for any email address to get detailed information about associated data leaks.
                </p>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address (e.g., example@domain.com)"
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
                  "Email OSINT": emailOSINTLoading,
                  "User Data": userDataLoading,
                  "Search2": search2Loading
                }}
              />
            )}
            
            {!loading && !combinedData && !error && (
              <div className="text-center py-10">
                <p className="text-gray-400 text-lg">Enter an email address to search</p>
              </div>
            )}
            
            {!loading && partialData && !combinedData && (
              <>
                <div className="mb-4">
                  <p className="text-gray-300 text-lg">
                    Results for: <span className="font-bold">{searchedEmail}</span>
                    {(emailOSINTLoading || userDataLoading || search2Loading) && 
                      " (Still loading some data...)"
                    }
                  </p>
                </div>
                
                {renderSummary()}
              </>
            )}
            
            {combinedData && (
              <>
                <div className="mb-4">
                  <p className="text-gray-300 text-lg">
                    Results for: <span className="font-bold">{searchedEmail}</span>
                  </p>
                </div>
                
                {renderSummary()}
                
                {renderSection("Email Addresses", 
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48Zm-96,85.15L52.57,64H203.43ZM98.71,128,40,181.81V74.19Zm11.84,10.85,12,11.05a8,8,0,0,0,10.82,0l12-11.05,58,53.15H52.57ZM157.29,128,216,74.18V181.82Z" />
                  </svg>,
                  combinedData.emails,
                  "emails"
                )}
                
                {renderSection("IP Addresses", 
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M128,16a88.1,88.1,0,0,0-88,88c0,75.3,80,132.17,83.41,134.55a8,8,0,0,0,9.18,0C136,236.17,216,179.3,216,104A88.1,88.1,0,0,0,128,16Zm0,56a32,32,0,1,1-32,32A32,32,0,0,1,128,72Z" />
                  </svg>,
                  combinedData.ipAddresses,
                  "ips"
                )}
                
                {renderSection("Passwords", 
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-68-56a12,12,0,1,1-12-12A12,12,0,0,1,140,152Z" />
                  </svg>,
                  combinedData.passwords,
                  "passwords"
                )}
                
                {renderSection("Names", 
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z" />
                  </svg>,
                  combinedData.names,
                  "names"
                )}
                
                {renderSection("Usernames", 
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z" />
                  </svg>,
                  combinedData.usernames,
                  "usernames"
                )}
                
                {renderSection("Addresses", 
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M228.92,49.69a8,8,0,0,0-6.86-1.45L160.93,63.52,99.58,32.84a8,8,0,0,0-5.52-.6l-64,16A8,8,0,0,0,24,56V200a8,8,0,0,0,9.94,7.76l61.13-15.28,61.35,30.68A8.15,8.15,0,0,0,160,224a8,8,0,0,0,1.94-.24l64-16A8,8,0,0,0,232,200V56A8,8,0,0,0,228.92,49.69ZM104,52.94l48,24V203.06l-48-24ZM40,62.25l48-12v127.5l-48,12Zm176,131.5-48,12V78.25l48-12Z" />
                  </svg>,
                  combinedData.addresses,
                  "addresses"
                )}
                
                {renderSection("Registration Dates", 
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM48,48H72v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48ZM208,208H48V96H208V208Z" />
                  </svg>,
                  combinedData.registrationDates,
                  "registrationDates"
                )}
                
                {renderSection("Locations", 
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M128,16a88.1,88.1,0,0,0-88,88c0,75.3,80,132.17,83.41,134.55a8,8,0,0,0,9.18,0C136,236.17,216,179.3,216,104A88.1,88.1,0,0,0,128,16Zm0,56a32,32,0,1,1-32,32A32,32,0,0,1,128,72Z" />
                  </svg>,
                  combinedData.locations,
                  "locations"
                )}
                
                {renderSection("Phones", 
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M220.78,162.13l-46.51-19.37a16,16,0,0,0-16.16,1.4,8.12,8.12,0,0,0-.75.56L134.87,160c-15.42-7.49-31.34-23.29-38.83-38.51l20.1-20.1c.2-.25.39-.5.57-.77a16,16,0,0,0,1.32-15.06l0-.12L97.54,33.64a16,16,0,0,0-16.62-9.52A56.26,56.26,0,0,0,32,80c0,79.4,64.6,144,144,144a56.09,56.09,0,0,0,55.67-43.83A16,16,0,0,0,220.78,162.13ZM176,208A128.14,128.14,0,0,1,48,80,40.07,40.07,0,0,1,82.87,40.49l16.17,38.81L75.88,102.47A103.33,103.33,0,0,0,153.53,180.12l23.17-23.17,38.81,16.17A40,40,0,0,1,176,208Z" />
                  </svg>,
                  combinedData.phones,
                  "phones"
                )}
                
                {renderSocialProfiles()}
                
                {renderReviews()}
                
                {renderSection("Domains", 
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM101.63,168h52.74C149,186.34,140,202.87,128,215.89,116,202.87,107,186.34,101.63,168ZM98,152a145.72,145.72,0,0,1,0-48h60a145.72,145.72,0,0,1,0,48ZM40,128a87.61,87.61,0,0,1,3.33-24H81.79a161.79,161.79,0,0,0,0,48H43.33A87.61,87.61,0,0,1,40,128ZM154.37,88H101.63C107,69.66,116,53.13,128,40.11,140,53.13,149,69.66,154.37,88Zm19.84,16h38.46a88.15,88.15,0,0,1,0,48H174.21a161.79,161.79,0,0,0,0-48Zm32.16-16H170.94a142.39,142.39,0,0,0-20.26-45A88.37,88.37,0,0,1,206.37,88ZM105.32,43A142.39,142.39,0,0,0,85.06,88H49.63A88.37,88.37,0,0,1,105.32,43ZM49.63,168H85.06a142.39,142.39,0,0,0,20.26,45A88.37,88.37,0,0,1,49.63,168Zm101.05,45a142.39,142.39,0,0,0,20.26-45h35.43A88.37,88.37,0,0,1,150.68,213Z" />
                  </svg>,
                  combinedData.domains,
                  "domains"
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailOSINT;