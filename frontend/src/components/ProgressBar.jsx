import React from "react";

const ProgressBar = ({ apiStatuses }) => {
  // Calculate overall progress
  const totalApis = Object.keys(apiStatuses).length;
  const completedApis = Object.values(apiStatuses).filter(status => !status).length;
  const progress = totalApis > 0 ? Math.round((completedApis / totalApis) * 100) : 0;

  return (
    <div className="w-full mb-6">
      <div className="flex justify-between mb-1">
        <span className="text-base font-medium text-blue-700 dark:text-white">
          Loading APIs ({completedApis}/{totalApis})
        </span>
        <span className="text-sm font-medium text-blue-700 dark:text-white">
          {progress}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <div 
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-in-out" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {Object.entries(apiStatuses).map(([apiName, isLoading]) => (
          <div 
            key={apiName} 
            className="flex items-center space-x-2 text-sm"
          >
            {isLoading ? (
              <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="h-4 w-4 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            <span className={isLoading ? "text-gray-600" : "text-green-600 font-medium"}>
              {apiName}: {isLoading ? "Loading..." : "Completed"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressBar; 