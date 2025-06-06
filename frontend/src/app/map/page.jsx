"use client";
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import Navbar from "@/components/Navbar";

mapboxgl.accessToken = 'pk.eyJ1IjoiaGFtemFhcmZhbiIsImEiOiJjbTc2bTd2bHAwdnV1MnBzZTFnbDllZXR1In0.BYpxj3DZ5c3xeQBSNoov9g';

const LocationMap = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchType, setSearchType] = useState("email"); 

  useEffect(() => {
    const unifiedSearchMap = typeof window !== 'undefined' ? localStorage.getItem('unifiedSearchMap') : null;
    
    if (unifiedSearchMap) {
      setSearchInput(unifiedSearchMap);
      
      const searchEvent = new Event('submit');
      const form = document.querySelector('form');
      if (form) {
        setTimeout(() => {
          form.dispatchEvent(searchEvent);
        }, 500);
      }
      
      localStorage.removeItem('unifiedSearchMap');
    }
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchInput || searchInput.trim() === "") {
      setError("Please enter a valid email or phone number");
      return;
    }
    
    setLoading(true);
    setError(null);
    setBusinesses([]);
    
    try {
      let endpoint;
      let payload;

      if (searchType === "email") {
        endpoint = `http://127.0.0.1:5000/api2/search2/${searchInput.trim()}`;
        
        const response = await fetch(endpoint);
        const data = await response.json();
        
        if (data.status === 'success') {
          const processedBusinesses = processApiResponse(data.data);
          setBusinesses(processedBusinesses);
        } else {
          setError('Failed to fetch business data');
        }
      } else if (searchType === "phone") {
        const cleanedNumber = searchInput.replace(/\D/g, "");
        
        if (cleanedNumber.length < 10) {
          setError("Please enter a valid phone number with at least 10 digits");
          setLoading(false);
          return;
        }
        
        endpoint = 'http://127.0.0.1:5000/api/profile';
        payload = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone_number: cleanedNumber
          })
        };
        
        const profileResponse = await fetch(endpoint, payload);
        const profileData = await profileResponse.json();
        
        if (profileData && profileData.List) {
          const emails = new Set();
          
          Object.values(profileData.List).forEach(source => {
            source.Data.forEach(entry => {
              if (entry.Email) emails.add(entry.Email);
            });
          });
          
          const emailList = Array.from(emails);
          
          if (emailList.length > 0) {
            const businessResponse = await fetch(`http://127.0.0.1:5000/api2/search2/${emailList[0]}`);
            const businessData = await businessResponse.json();
            
            if (businessData.status === 'success') {
              const processedBusinesses = processApiResponse(businessData.data);
              setBusinesses(processedBusinesses);
            } else {
              setError('Failed to fetch business data using associated email');
            }
          } else {
            setError('No associated emails found for this phone number');
          }
        } else {
          setError('Failed to fetch profile data');
        }
      }
    } catch (err) {
      setError('Error fetching data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const processApiResponse = (data) => {
    const processedBusinesses = [];
    
    const yelpData = data.find(module => module.module === 'yelp')?.data;
    if (yelpData && yelpData.business_list && yelpData.business_list.length > 0) {
      yelpData.business_list.forEach(business => {
        const reviews = [];
        

        if (yelpData.review_list && yelpData.review_list.length > 0) {
          yelpData.review_list.forEach(review => {
            if (review.business_id === business.id) {
              reviews.push({
                rating: review.rating,
                text: review.text,
                user_name: review.user_name || 'Anonymous'
              });
            }
          });
        }
        
        if (business.latitude && business.longitude) {
          processedBusinesses.push({
            id: business.id,
            name: business.name,
            address: business.localized_address || business.address1,
            coordinates: [business.longitude, business.latitude],
            rating: business.avg_rating,
            review_count: business.review_count || 0,
            categories: business.categories ? business.categories.map(cat => cat.name) : [],
            phone: business.localized_phone || business.phone,
            reviews: reviews
          });
        }
      });
    }
    
    // Check for other location data from different modules
    data.forEach(module => {
      if (module.module === 'quora' && module.data && module.data.locationCredentials) {
        const quoraData = module.data;
        if (quoraData.locationCredentials && quoraData.locationCredentials.length > 0) {
          const locationName = quoraData.locationCredentials[0].location?.name;
          if (locationName) {
            processedBusinesses.push({
              id: `quora-${quoraData.uid}`,
              name: `${quoraData.names?.[0]?.givenName || ''} ${quoraData.names?.[0]?.familyName || ''}`,
              address: locationName,
              coordinates: [-73.9857, 40.7484], // Default to NYC if no coordinates
              rating: 0,
              review_count: 0,
              categories: ['Profile'],
              phone: '',
              reviews: []
            });
          }
        }
      }
      
    });
    
    return processedBusinesses;
  };

  useEffect(() => {
    if (loading || businesses.length === 0) return;
    
    if (map.current) map.current.remove();
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: businesses[0].coordinates,
      zoom: 12
    });

    const nav = new mapboxgl.NavigationControl({
      visualizePitch: true,
      showCompass: true
    });
    map.current.addControl(nav);

    businesses.forEach(business => {
      const popup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: true,
        className: 'dark-mode-popup'
      });

      const reviewsHtml = business.reviews
        .map(review => `
          <div class="mb-2 p-2 border-b border-gray-700">
            <div class="flex items-center">
              <span class="text-yellow-400">★</span>
              <span class="ml-1">${review.rating}/5</span>
            </div>
            <p class="text-sm">${review.text}</p>
            <p class="text-xs text-gray-400">- ${review.user_name}</p>
          </div>
        `)
        .join('');

      const popupContent = `
        <div class="p-4 max-w-sm">
          <h3 class="text-lg font-bold mb-2">${business.name}</h3>
          <p class="text-sm mb-2">${business.address}</p>
          <div class="flex items-center mb-2">
            <span class="text-yellow-400">★</span>
            <span class="ml-1">${business.rating}/5</span>
            <span class="ml-2">(${business.review_count} reviews)</span>
          </div>
          <p class="text-sm mb-2">${business.categories.join(', ')}</p>
          <p class="text-sm mb-4">${business.phone}</p>
          <div class="max-h-40 overflow-y-auto">
            ${reviewsHtml}
          </div>
        </div>
      `;

      new mapboxgl.Marker({
        color: '#60A5FA'
      })
        .setLngLat(business.coordinates)
        .setPopup(popup.setHTML(popupContent))
        .addTo(map.current);
    });

    return () => map.current?.remove();
  }, [loading, businesses]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Location Map</h1>
        
        <div className="max-w-md mx-auto mb-8 bg-gray-800 p-6 rounded-lg shadow-lg">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col space-y-2">
              <label htmlFor="searchInput" className="text-lg font-medium">
                Search for locations:
              </label>
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="emailType"
                    name="searchType"
                    value="email"
                    checked={searchType === "email"}
                    onChange={() => setSearchType("email")}
                    className="mr-2"
                  />
                  <label htmlFor="emailType">Email</label>
                </div>
              </div>
              <div className="relative">
                <input
                  type={ "email"}
                  id="searchInput"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={"Enter email address"}
                  className="w-full p-3 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-md font-medium transition duration-200"
              disabled={loading}
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </form>
          
          {error && (
            <div className="mt-4 p-3 bg-red-900/50 text-red-200 rounded-md">
              {error}
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-96 bg-gray-800 rounded-lg">
            <div className="text-2xl">Loading map data...</div>
          </div>
        ) : (
          <div className="h-[600px] rounded-lg overflow-hidden">
            <div ref={mapContainer} className="w-full h-full" />
          </div>
        )}
      </div>
      
      <link 
        href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" 
        rel="stylesheet" 
      />
      <style jsx global>{`
        .mapboxgl-popup-content {
          background: #1f2937 !important;
          color: #ffffff !important;
          max-width: 300px !important;
        }
        .mapboxgl-popup-tip {
          border-top-color: #1f2937 !important;
        }
        .mapboxgl-ctrl-group {
          background: #1f2937 !important;
        }
        .mapboxgl-ctrl button {
          background-color: #374151 !important;
        }
        .mapboxgl-ctrl button:hover {
          background-color: #4B5563 !important;
        }
        .mapboxgl-ctrl button span {
          filter: invert(1);
        }
      `}</style>
    </div>
  );
};

export default LocationMap;