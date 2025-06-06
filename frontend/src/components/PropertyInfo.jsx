import React, { useState, useEffect } from 'react';

const PropertyInfoDisplay = ({ address1, address2, searchPerformed }) => {
  const [propertyData, setPropertyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPropertyData = async () => {
      if (!searchPerformed) return;
      
      setLoading(true);
      setError(null);
      
      try {
        
        const addr1 = address1 || "2655 E 21ST ST";
        const addr2 = address2 || "BROOKLYN, NY 11235";
        
        const response = await fetch(
          `http://127.0.0.1:5000/api/property/search?address1=${encodeURIComponent(addr1)}&address2=${encodeURIComponent(addr2)}`
        );
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setPropertyData(data);
      } catch (err) {
        setError(`Failed to fetch property data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPropertyData();
  }, [address1, address2, searchPerformed]);

  // Helper function to format large numbers with commas
  const formatNumber = (num) => {
    if (num === undefined || num === null) return 'N/A';
    return num.toLocaleString('en-US');
  };

  // Helper function to format keys to be more readable
  const formatKey = (key) => {
    return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
  };

  // Format values based on key name
  const formatValue = (key, value) => {
    if (value === undefined || value === null) return 'N/A';
    
    if (typeof value === 'number') {
      if (key.toLowerCase().includes('value') || key.toLowerCase().includes('amt') || key.toLowerCase().includes('tax')) {
        return '$' + formatNumber(value);
      }
      return formatNumber(value);
    }
    
    if (Array.isArray(value)) {
      return value.join(', ') || 'N/A';
    }
    
    return String(value);
  };

  // Render section contents
  const renderSection = (data, sectionTitle) => {
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      return null;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        {Object.entries(data).map(([key, value]) => {
          // Skip rendering objects (we'll focus on flat values for clarity)
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            return null;
          }
          
          return (
            <div key={`${sectionTitle}-${key}`} className="flex flex-col gap-1 border-t border-solid border-gray-800 py-4 px-2">
              <p className="text-gray-500 text-sm font-normal leading-normal">{formatKey(key)}</p>
              <p className="text-gray-300 text-sm font-normal leading-normal">
                {formatValue(key, value)}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  // Main sections we want to display
  const renderPropertySections = () => {
    if (!propertyData || !propertyData.property || !propertyData.property[0]) {
      return null;
    }

    const property = propertyData.property[0];
    
    const sections = [
      {
        title: "Basic Information",
        data: {
          propertyType: property.summary?.propertyType,
          yearBuilt: property.summary?.yearBuilt,
          occupancy: property.summary?.absenteeInd,
          landUse: property.summary?.propLandUse,
          lotSize: `${formatNumber(property.lot?.lotSize2 || 0)} sq ft`,
          unitsCount: property.building?.summary?.unitsCount
        }
      },
      {
        title: "Address",
        data: {
          address: property.address?.line1,
          city: property.address?.locality,
          state: property.address?.countrySubd,
          zip: property.address?.postal1,
          county: property.area?.countrySecSubd
        }
      },
      {
        title: "Property Value",
        data: {
          totalValue: property.assessment?.market?.mktTtlValue,
          landValue: property.assessment?.market?.mktLandValue,
          improvementValue: property.assessment?.market?.mktImprValue,
          annualTax: property.assessment?.tax?.taxAmt,
          taxYear: property.assessment?.tax?.taxYear
        }
      },
      {
        title: "Building Details",
        data: {
          buildingSize: `${formatNumber(property.building?.size?.bldgSize || 0)} sq ft`,
          livingSize: `${formatNumber(property.building?.livingSize || 0)} sq ft`,
          stories: property.building?.summary?.levels,
          storyDescription: property.building?.summary?.storyDesc,
          view: property.building?.summary?.view
        }
      },
      {
        title: "Lot Dimensions",
        data: {
          lotFrontage: `${property.lot?.frontage || 0} ft`,
          lotDepth: `${property.lot?.depth || 0} ft`,
          lotNumber: property.lot?.lotNum,
          zoning: property.lot?.zoningType
        }
      },
      {
        title: "Owner Information",
        data: {
          ownerName: property.assessment?.owner?.owner1?.fullName,
          ownerStatus: property.assessment?.owner?.absenteeOwnerStatus === 'O' ? 'Owner Occupied' : 'Absentee Owner',
          mailingAddress: property.assessment?.owner?.mailingAddressOneLine
        }
      },
      {
        title: "Location",
        data: {
          latitude: property.location?.latitude,
          longitude: property.location?.longitude,
          censusTrack: property.area?.censusTractIdent,
          censusBlockGroup: property.area?.censusBlockGroup
        }
      }
    ];

    return (
      <div className="flex flex-col gap-6 w-full">
        {sections.map((section) => (
          <div key={section.title} className="w-full">
            <h3 className="text-gray-300 text-lg font-semibold mb-2">{section.title}</h3>
            {renderSection(section.data, section.title)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="mt-4">
      <h2 className="text-gray-300 text-xl font-bold leading-tight tracking-tight px-4 pb-3">Property Information</h2>
      
      {loading && (
        <div className="p-8 flex justify-center">
          <div className="animate-pulse text-gray-300">Loading property data...</div>
        </div>
      )}
      
      {error && (
        <div className="p-4 border-t border-solid border-gray-800">
          <div className="bg-red-900/30 border border-red-700 p-4 rounded">
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      )}
      
      {!loading && !error && propertyData && (
        <div className="p-4">
          {renderPropertySections()}
        </div>
      )}
    </div>
  );
};

export default PropertyInfoDisplay;