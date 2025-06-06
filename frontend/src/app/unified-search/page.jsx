"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Search, ChevronDown } from 'lucide-react';

const UnifiedSearchPage = () => {
  const router = useRouter();
  const [searchType, setSearchType] = useState('phone');
  const [searchInput, setSearchInput] = useState('');
  const [secondaryInput, setSecondaryInput] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [error, setError] = useState(null);
  const [image, setImage] = useState(null);

  const searchTypes = {
    phone: {
      label: 'Phone',
      placeholder: 'Enter phone number',
      inputType: 'tel',
      validation: (value) => {
        const cleanedNumber = value.replace(/\D/g, "");
        return cleanedNumber.length >= 10;
      },
      errorMessage: 'Please enter a valid phone number with at least 10 digits',
      route: '/phone'
    },
    email: {
      label: 'Email',
      placeholder: 'Enter email address',
      inputType: 'email',
      validation: (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
      },
      errorMessage: 'Please enter a valid email address',
      route: '/email'
    },
    property: {
      label: 'Property',
      placeholder: 'Enter address (e.g., 2655 E 21ST ST, BROOKLYN, NY 11235)',
      inputType: 'text',
      validation: (value) => value.trim().length > 0,
      errorMessage: 'Please enter a valid address',
      route: '/PropertyCompany'
    },
    maps: {
      label: 'Maps',
      placeholder: 'Enter email address for location search',
      inputType: 'email',
      validation: (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
      },
      errorMessage: 'Please enter a valid email address',
      route: '/map'
    },
    business: {
      label: 'Business',
      placeholder: 'Enter domain (e.g., example.com) or company name',
      inputType: 'text',
      validation: (value) => value.trim().length > 0,
      errorMessage: 'Please enter a valid domain or company name',
      route: '/business',
      hasSecondaryInput: true,
      secondaryPlaceholder: 'Company name (optional)'
    },
    nameAndFace: {
      label: 'Name & Face',
      placeholder: 'Enter your name',
      inputType: 'text',
      validation: (value) => value.trim().length >= 5 && value.trim().length <= 30,
      errorMessage: 'Name must be between 5 and 30 characters',
      route: '/nameAndFace',
      hasSecondaryInput: true,
      secondaryPlaceholder: 'Upload Image'
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const selectSearchType = (type) => {
    setSearchType(type);
    setIsDropdownOpen(false);
    setSearchInput('');
    setSecondaryInput('');
    setError(null);
  };

  const handleSearch = (e) => {
    e.preventDefault();

    const currentSearchType = searchTypes[searchType];

    if (!searchInput || !currentSearchType.validation(searchInput)) {
      setError(currentSearchType.errorMessage);
      return;
    }

    setError(null);

    switch (searchType) {
      case 'phone':
        localStorage.setItem('unifiedSearchPhone', searchInput.replace(/\D/g, ""));
        router.push(currentSearchType.route);
        break;

      case 'email':
        localStorage.setItem('unifiedSearchEmail', searchInput);
        router.push(currentSearchType.route);
        break;

      case 'property':
        localStorage.setItem('unifiedSearchProperty', JSON.stringify({
          searchType: 'address',
          searchInput: searchInput
        }));
        router.push(currentSearchType.route);
        break;

      case 'company':
        localStorage.setItem('unifiedSearchProperty', JSON.stringify({
          searchType: 'company',
          searchInput: searchInput
        }));
        router.push(currentSearchType.route);
        break;

      case 'maps':
        localStorage.setItem('unifiedSearchMap', searchInput);
        router.push(currentSearchType.route);
        break;

      case 'business':
        localStorage.setItem('unifiedSearchBusiness', JSON.stringify({
          domain: searchInput,
          companyName: secondaryInput || ''
        }));
        router.push(currentSearchType.route);
        break;

      case 'nameAndFace':
        if (!image || !image.type.startsWith('image/')) {
          setError('Please upload a valid image file.');
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          localStorage.setItem('unifiedSearchNameAndFace', JSON.stringify({
            name: searchInput || '',
            image: reader.result,
            imageName: image.name,
          }));
          router.push(currentSearchType.route);
        };
        reader.readAsDataURL(image);
        break;

      default:
        console.error('Unknown search type');
    }
  };

  return (
    <div className="relative flex size-full min-h-screen flex-col bg-gray-900 dark group/design-root overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        <Navbar />

        <div className="flex flex-1 justify-center items-center py-5 px-4 mt-[60px]">
          <div className="layout-content-container flex flex-col max-w-[960px] w-full">
            <div className="flex flex-wrap justify-center gap-3 p-4 mb-8">
              <h1 className="text-gray-300 tracking-light text-4xl font-bold leading-tight text-center">
                Unified Search
              </h1>
              <p className="text-gray-400 text-center w-full mt-2">
                Search across all platforms from a single interface
              </p>
            </div>

            <div className="w-full max-w-2xl mx-auto bg-gray-800/80 p-8 rounded-xl shadow-xl backdrop-blur-sm border border-gray-700/30">
              <form onSubmit={handleSearch} className="space-y-6">
                <div className="flex flex-col space-y-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative w-full md:w-1/3">
                      <button
                        type="button"
                        onClick={toggleDropdown}
                        className="w-full flex items-center justify-between p-4 bg-gray-700/80 rounded-lg border border-gray-600/30 focus:outline-none focus:ring-2 focus:ring-blue-500/70 text-gray-200"
                      >
                        <span>{searchTypes[searchType].label}</span>
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      </button>

                      {isDropdownOpen && (
                        <div className="absolute z-10 mt-1 w-full bg-gray-700 rounded-lg shadow-lg border border-gray-600/30 py-1">
                          {Object.entries(searchTypes).map(([key, value]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => selectSearchType(key)}
                              className={`w-full text-left px-4 py-2 hover:bg-gray-600/50 ${searchType === key ? 'bg-blue-600/20 text-blue-300' : 'text-gray-200'
                                }`}
                            >
                              {value.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type={searchTypes[searchType].inputType}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder={searchTypes[searchType].placeholder}
                        className="w-full p-4 pl-12 bg-gray-700/80 rounded-lg border border-gray-600/30 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-transparent text-gray-200 placeholder-gray-400"
                      />
                    </div>
                  </div>

                  {searchType === 'business' && (
                    <div className="mt-4">
                      <input
                        type="text"
                        value={secondaryInput}
                        onChange={(e) => setSecondaryInput(e.target.value)}
                        placeholder={searchTypes[searchType].secondaryPlaceholder}
                        className="w-full p-4 bg-gray-700/80 rounded-lg border border-gray-600/30 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-transparent text-gray-200 placeholder-gray-400"
                      />
                    </div>
                  )}

                  {searchType === 'nameAndFace' && (
                    <div className="mt-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImage(e.target.files[0])}
                        className="w-full p-4 bg-gray-700/80 rounded-lg border border-gray-600/30 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-transparent text-gray-200 placeholder-gray-400"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 py-3 px-4 rounded-lg font-medium transition duration-200 flex items-center justify-center gap-2 text-white shadow-lg hover:shadow-blue-600/20"
                >
                  <Search className="h-4 w-4" />
                  <span>Search</span>
                </button>
              </form>

              {error && (
                <div className="mt-6 p-4 bg-red-900/40 text-red-200 rounded-lg border border-red-800/30 flex items-center">
                  <div className="mr-3 flex-shrink-0">⚠️</div>
                  <p>{error}</p>
                </div>
              )}

              <div className="mt-8 border-t border-gray-700/30 pt-6">
                <h3 className="text-gray-300 text-lg font-semibold mb-4">Search Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(searchTypes).map(([key, value]) => (
                    <div
                      key={key}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${searchType === key
                        ? 'border-blue-500/50 bg-blue-900/20'
                        : 'border-gray-700/30 bg-gray-800/50 hover:bg-gray-700/30'
                        }`}
                      onClick={() => selectSearchType(key)}
                    >
                      <h4 className="text-gray-200 font-medium mb-1">{value.label}</h4>
                      <p className="text-gray-400 text-sm">{value.placeholder}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedSearchPage;
