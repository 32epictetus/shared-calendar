import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set } from 'firebase/database';

const CalendarApp = () => {
  // Firebase configuration
  const firebaseConfig = {  
    apiKey: "AIzaSyDSBW64TdRAK74ZoPcasqr1DkXv_hWV91E",  
    authDomain: "shared-calendar-f4108.firebaseapp.com",  
    databaseURL: "https://shared-calendar-f4108-default-rtdb.firebaseio.com",  
    projectId: "shared-calendar-f4108",  
    storageBucket: "shared-calendar-f4108.firebasestorage.app",  
    messagingSenderId: "775398150885",  
    appId: "1:775398150885:web:fbf40577ac32e54374fa0c"
  };

  // Initialize Firebase (wrapped in useEffect to avoid multiple initializations)
  useEffect(() => {
    try {
      initializeApp(firebaseConfig);
    } catch (error) {
      // App already initialized
      console.log("Firebase already initialized");
    }
  }, []);
  
  const database = getDatabase();
  
  // Current date to start calendar
  const today = new Date();
  
  // User identification
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('calendarUsername') || '';
  });
  
  // Input value for username entry
  const [inputUsername, setInputUsername] = useState('');
  
  // Names for the couple
  const [names, setNames] = useState({
    person1: 'dkh',
    person2: 'acb'
  });
  
  // Fixed time slots
  const timeSlots = ['Morning', 'Afternoon', 'Evening'];
  
  // Current day offset (0 = starting with today)
  const [dayOffset, setDayOffset] = useState(0);
  
  // Generate days for week view - showing 4 consecutive days
  const generateDays = (offset = 0) => {
    const days = [];
    const daysToShow = 4; // Show 4 days total
    
    // Start date with offset
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + offset);
    
    // Generate consecutive days
    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push({
        date,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        dateKey: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
      });
    }
    return days;
  };
  
  // Get current days based on the offset
  const days = generateDays(dayOffset);
  
  // Navigate to next set of days
  const showNextDay = () => {
    setDayOffset(dayOffset + 4);
  };
  
  // Navigate to previous set of days
  const showPrevDay = () => {
    const newOffset = Math.max(0, dayOffset - 4);
    setDayOffset(newOffset);
  };
  
  // Status values
  // 0: Available, 1: Unavailable, 2: TBD, 3: Planned
  
  // Firebase state management
  const [availability, setAvailability] = useState({});
  const [previousStatus, setPreviousStatus] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Load data from Firebase
  useEffect(() => {
    const availabilityRef = ref(database, 'calendar/availability');
    const previousStatusRef = ref(database, 'calendar/previousStatus');
    
    // Get availability data
    const availabilityUnsubscribe = onValue(availabilityRef, (snapshot) => {
      const data = snapshot.val() || {};
      setAvailability(data);
      setLoading(false);
    });
    
    // Get previous status data
    const previousStatusUnsubscribe = onValue(previousStatusRef, (snapshot) => {
      const data = snapshot.val() || {};
      setPreviousStatus(data);
    });
    
    // Cleanup function
    return () => {
      availabilityUnsubscribe();
      previousStatusUnsubscribe();
    };
  }, [database]);
  
  // Save data to Firebase when changes occur
  useEffect(() => {
    // Only save when loaded (to prevent overwriting with empty data)
    if (!loading && Object.keys(availability).length > 0) {
      set(ref(database, 'calendar/availability'), availability);
    }
  }, [availability, database, loading]);
  
  useEffect(() => {
    // Only save when loaded
    if (!loading && Object.keys(previousStatus).length > 0) {
      set(ref(database, 'calendar/previousStatus'), previousStatus);
    }
  }, [previousStatus, database, loading]);
  
  // Get status for a date-based slot
  const getStatus = (person, dateKey, timeSlot) => {
    if (!availability[dateKey] || !availability[dateKey][person] || availability[dateKey][person][timeSlot] === undefined) {
      return 2; // Default to TBD
    }
    return availability[dateKey][person][timeSlot];
  };
  
  // Toggle availability function with state tracking - date-based
  const toggleAvailability = (person, dateKey, timeSlot) => {
    const newAvailability = {...availability};
    const newPreviousStatus = {...previousStatus};
    
    // Initialize nested objects if they don't exist
    if (!newAvailability[dateKey]) {
      newAvailability[dateKey] = { person1: {}, person2: {} };
    }
    
    if (!newAvailability[dateKey][person]) {
      newAvailability[dateKey][person] = {
        0: 2, 1: 2, 2: 2 // Default to TBD
      };
    }
    
    const currentStatus = newAvailability[dateKey][person][timeSlot] !== undefined 
      ? newAvailability[dateKey][person][timeSlot] 
      : 2; // Default to TBD
    
    let newStatus = (currentStatus + 1) % 4;
    
    // If current status is Planned (3) and changing to something else
    if (currentStatus === 3 && newStatus !== 3) {
      const otherPerson = person === 'person1' ? 'person2' : 'person1';
      
      // Initialize nested objects for the other person if needed
      if (!newPreviousStatus[dateKey]) {
        newPreviousStatus[dateKey] = {};
      }
      
      if (!newPreviousStatus[dateKey][otherPerson]) {
        newPreviousStatus[dateKey][otherPerson] = {};
      }
      
      // Restore other person's previous status
      if (newPreviousStatus[dateKey][otherPerson][timeSlot] !== undefined) {
        newAvailability[dateKey][otherPerson][timeSlot] = newPreviousStatus[dateKey][otherPerson][timeSlot];
      } else {
        // Default to TBD if no previous status
        newAvailability[dateKey][otherPerson][timeSlot] = 2;
      }
    }
    
    // If new status is Planned (3)
    if (newStatus === 3) {
      const otherPerson = person === 'person1' ? 'person2' : 'person1';
      
      // Initialize nested objects for the other person if needed
      if (!newAvailability[dateKey][otherPerson]) {
        newAvailability[dateKey][otherPerson] = {
          0: 2, 1: 2, 2: 2 // Default to TBD
        };
      }
      
      // Save other person's current status before changing to Planned
      if (!newPreviousStatus[dateKey]) {
        newPreviousStatus[dateKey] = {};
      }
      
      if (!newPreviousStatus[dateKey][otherPerson]) {
        newPreviousStatus[dateKey][otherPerson] = {};
      }
      
      newPreviousStatus[dateKey][otherPerson][timeSlot] = 
        newAvailability[dateKey][otherPerson][timeSlot] !== undefined
          ? newAvailability[dateKey][otherPerson][timeSlot]
          : 2; // Default to TBD if not set
      
      // Set other person to Planned too
      newAvailability[dateKey][otherPerson][timeSlot] = 3;
    }
    
    // Set new status for current person
    newAvailability[dateKey][person][timeSlot] = newStatus;
    
    setAvailability(newAvailability);
    setPreviousStatus(newPreviousStatus);
  };
  
  // Get status color
  const getStatusColor = (status) => {
    switch(status) {
      case 0: return 'bg-green-200'; // Available
      case 1: return 'bg-red-200';   // Unavailable
      case 2: return 'bg-yellow-200'; // TBD
      case 3: return 'bg-purple-200'; // Planned
      default: return 'bg-gray-100';
    }
  };
  
  // Get status text
  const getStatusText = (status) => {
    switch(status) {
      case 0: return 'A'; // Available
      case 1: return 'UA'; // Unavailable
      case 2: return '?'; // TBD
      case 3: return '■'; // Planned (black square)
      default: return '';
    }
  };
  
  // Handle username entry
  const handleUsernameSubmit = () => {
    if (inputUsername.trim()) {
      localStorage.setItem('calendarUsername', inputUsername.trim());
      setUsername(inputUsername.trim());
    }
  };
  
  // If username not set, show login screen
  if (!username) {
    return (
      <div className="bg-gray-50 rounded-lg shadow-md w-full mx-auto max-w-sm p-6">
        <h2 className="text-xl font-bold mb-4">Enter your name</h2>
        <input 
          className="border p-2 w-full mb-4 rounded" 
          placeholder="Your name"
          value={inputUsername}
          onChange={(e) => setInputUsername(e.target.value)}
        />
        <button 
          className="bg-blue-500 text-white px-4 py-2 rounded w-full"
          onClick={handleUsernameSubmit}
        >
          Enter Calendar
        </button>
      </div>
    );
  }
  
  // Show loading indicator
  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg shadow-md w-full mx-auto max-w-sm p-6 text-center">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-3"></div>
          <div className="h-24 bg-gray-200 rounded w-full mb-3"></div>
          <div className="h-36 bg-gray-200 rounded w-full"></div>
        </div>
        <p className="mt-4 text-gray-600">Loading calendar data...</p>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-50 rounded-lg shadow-md w-full mx-auto max-w-sm">
      <div className="p-3">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-xl font-bold text-gray-800">Weekly Availability</h1>
          <div className="text-xs text-gray-500">
            Logged in as: <span className="font-medium">{username}</span>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex justify-between mb-3 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-200 rounded mr-1"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-200 rounded mr-1"></div>
            <span>Unavailable</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-200 rounded mr-1"></div>
            <span>TBD</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-purple-200 rounded mr-1 flex items-center justify-center">
              <div className="w-1 h-1 bg-black"></div>
            </div>
            <span>Planned</span>
          </div>
        </div>
        
        {/* Day navigation */}
        <div className="flex justify-between items-center mb-2">
          <button 
            className="px-2 py-1 bg-gray-200 rounded text-sm disabled:opacity-50"
            onClick={showPrevDay}
            disabled={dayOffset === 0}
          >
            ◀ Prev
          </button>
          <span className="text-sm font-medium">
            {dayOffset === 0 ? 'This Week' : 
              `${days[0].month} ${days[0].dayNumber} - ${days[3].month} ${days[3].dayNumber}`}
          </span>
          <button 
            className="px-2 py-1 bg-gray-200 rounded text-sm"
            onClick={showNextDay}
          >
            Next ▶
          </button>
        </div>
        
        {/* Mobile Calendar */}
        <div className="border rounded-md">
          {/* Calendar Header */}
          <div className="grid grid-cols-5 bg-gray-100 border-b">
            <div className="p-2 font-bold text-xs">Time</div>
            {days.map((day, index) => {
              const isToday = day.dateKey === `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
              
              return (
                <div 
                  key={index} 
                  className={`p-2 text-center text-xs ${isToday ? 'font-bold bg-blue-50' : ''}`}
                >
                  <div>{day.dayName}</div>
                  <div>{day.dayNumber}</div>
                  {isToday && <div className="text-xs text-blue-500">Today</div>}
                </div>
              );
            })}
          </div>
          
          {/* Person 1 */}
          <div className="border-b bg-blue-100">
            <div className="p-2 text-xs font-medium">
              {names.person1}
            </div>
          </div>
          
          {/* Person 1 Time Slots */}
          {timeSlots.map((slot, slotIndex) => (
            <div key={slotIndex} className="grid grid-cols-5 border-b">
              <div className="p-2 text-xs font-medium bg-gray-50">
                {slot}
              </div>
              {days.map((day, dayIndex) => {
                const dateKey = day.dateKey;
                const status = getStatus('person1', dateKey, slotIndex);
                const otherPersonStatus = getStatus('person2', dateKey, slotIndex);
                
                // Check coordination status
                const isAvailable = status === 0;
                const otherIsAvailable = otherPersonStatus === 0;
                const otherIsTBD = otherPersonStatus === 2;
                
                return (
                  <div 
                    key={dayIndex} 
                    className={`p-2 text-center ${getStatusColor(status)} cursor-pointer relative`}
                    onClick={() => toggleAvailability('person1', dateKey, slotIndex)}
                  >
                    <div className="text-xs">{getStatusText(status)}</div>
                    {/* Show green dot if both are Available */}
                    {isAvailable && otherIsAvailable && (
                      <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                    )}
                    {/* Show yellow dot if Available but other is TBD */}
                    {isAvailable && otherIsTBD && (
                      <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-yellow-600 rounded-full"></div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          
          {/* Person 2 */}
          <div className="border-b bg-cyan-100">
            <div className="p-2 text-xs font-medium">
              {names.person2}
            </div>
          </div>
          
          {/* Person 2 Time Slots */}
          {timeSlots.map((slot, slotIndex) => (
            <div key={slotIndex} className="grid grid-cols-5 border-b">
              <div className="p-2 text-xs font-medium bg-gray-50">
                {slot}
              </div>
              {days.map((day, dayIndex) => {
                const dateKey = day.dateKey;
                const status = getStatus('person2', dateKey, slotIndex);
                const otherPersonStatus = getStatus('person1', dateKey, slotIndex);
                
                // Check coordination status
                const isAvailable = status === 0;
                const otherIsAvailable = otherPersonStatus === 0;
                const otherIsTBD = otherPersonStatus === 2;
                
                return (
                  <div 
                    key={dayIndex} 
                    className={`p-2 text-center ${getStatusColor(status)} cursor-pointer relative`}
                    onClick={() => toggleAvailability('person2', dateKey, slotIndex)}
                  >
                    <div className="text-xs">{getStatusText(status)}</div>
                    {/* Show green dot if both are Available */}
                    {isAvailable && otherIsAvailable && (
                      <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                    )}
                    {/* Show yellow dot if Available but other is TBD */}
                    {isAvailable && otherIsTBD && (
                      <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-yellow-600 rounded-full"></div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        
        <div className="text-center text-xs text-gray-500 mt-2">
          Tap to change: Available → Unavailable → TBD → Planned
        </div>
        
        <div className="text-center text-xs text-blue-500 mt-3">
          Changes are saved automatically and synced to all devices
        </div>
      </div>
    </div>
  );
};

export default CalendarApp;
