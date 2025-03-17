import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Update this component (around line 5-89 in your code)
// Fixed StyledCaptionText component
const StyledCaptionText = ({ text, customization, darkMode, getColor }) => {
  // Font styles from customization
  const fontStyles = {
    fontFamily: getFontFamily(customization.fontFamily),
    fontSize: getFontSize(customization.fontSize),
    fontWeight: getFontWeight(customization.fontWeight),
    color: customization.textColor || (darkMode ? '#FFFFFF' : '#000000'),
    letterSpacing: getLetterSpacing(customization.letterSpacing),
    lineHeight: '1.4',
    display: 'inline-block'
  };

  // Process the text to identify tagged parts
  const processText = (text) => {
    if (!text) return [];
    
    const segments = [];
    let currentIndex = 0;
    
    // Regular expression to find tags
    const tagRegex = /<(noun|verb|adjective)>(.*?)<\/\1>/g;
    let match;
    
    // Find all tag matches
    while ((match = tagRegex.exec(text)) !== null) {
      // If there's text before the match, add it as plain text
      if (match.index > currentIndex) {
        segments.push({
          type: 'text',
          content: text.substring(currentIndex, match.index)
        });
      }
      
      // Add the tagged content
      segments.push({
        type: match[1], // noun, verb, or adjective
        content: match[2] // the content inside the tags
      });
      
      // Update the current index
      currentIndex = match.index + match[0].length;
    }
    
    // Add any remaining text after the last match
    if (currentIndex < text.length) {
      segments.push({
        type: 'text',
        content: text.substring(currentIndex)
      });
    }
    
    return segments;
  };
  
  // Parse text into segments
  const segments = processText(text);
  
  // Main render function - completely pure React approach
  return (
    <span style={fontStyles}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <span key={index}>{segment.content}</span>;
        } else if (segment.type === 'noun') {
          return (
            <span 
              key={index}
              style={{
                color: getColor('noun'),
                textDecoration: 'underline'
              }}
            >
              {segment.content}
            </span>
          );
        } else if (segment.type === 'verb') {
          return (
            <span 
              key={index}
              style={{
                color: getColor('verb'),
                textDecoration: 'underline'
              }}
            >
              {segment.content}
            </span>
          );
        } else if (segment.type === 'adjective') {
          return (
            <span 
              key={index}
              style={{
                color: getColor('adjective'),
                textDecoration: 'underline'
              }}
            >
              {segment.content}
            </span>
          );
        }
        return null;
      })}
    </span>
  );
};
// API base URL - change this if your backend is running on a different port/host
const API_BASE_URL = 'http://127.0.0.1:5000';
 // Get font size based on settings - now supports numeric values
const getFontSize = (sizeValue) => {
  if (typeof sizeValue === 'number') {
    return `${sizeValue}px`;
  }
  const sizeMap = {
    'Small': '14px',
    'Medium': '16px',
    'Large': '20px',
    'X-Large': '24px'
  };
  return sizeMap[sizeValue] || '16px';
};

// Get font weight based on settings - now supports numeric values
const getFontWeight = (weightValue) => {
  if (typeof weightValue === 'number') {
    return weightValue.toString();
  }
  const weightMap = {
    'Light': '300',
    'Regular': '400',
    'Bold': '700'
  };
  return weightMap[weightValue] || '400';
};

// Get letter spacing based on settings - now supports numeric values
const getLetterSpacing = (spacingValue) => {
  if (typeof spacingValue === 'number') {
    return `${spacingValue}px`;
  }
  return spacingValue || 'normal';
};

// Get font family based on settings
const getFontFamily = (fontOption) => {
  const fontMap = {
    'Arial / Helvetica': 'Arial, Helvetica, sans-serif',
    'Lexend': 'Lexend, Arial, sans-serif',
    'Nunito Sans': 'Nunito Sans, Arial, sans-serif',
    'Chewy': 'Chewy, cursive',
    'Open Sans': 'Open Sans, Arial, sans-serif',
    'Verdana': 'Verdana, Geneva, sans-serif',
    'Shizuru': 'Shizuru, cursive'
  };

  return fontMap[fontOption] || 'Arial, Helvetica, sans-serif';
};

function App() {
  const [youtubeLink, setYoutubeLink] = useState('https://www.youtube.com/watch?v=zy2Zj8yIe6c');
  const [videoId, setVideoId] = useState('');
  const [captions, setCaptions] = useState({});
  const [selectedLanguages, setSelectedLanguages] = useState({
    primary: 'en',
    secondary: ''
    // tertiary language removed
  }); 
  
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [availableTranscripts, setAvailableTranscripts] = useState([]);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeCaptions, setActiveCaptions] = useState({});

  // for hightlight
  const [highlightingEnabled, setHighlightingEnabled] = useState(true);

  // New state for managing language customization collapse
  const [collapsedLanguages, setCollapsedLanguages] = useState({});
  
  // Add missing hiddenLanguages state
  const [hiddenLanguages, setHiddenLanguages] = useState({});

  // Caption placement state with updated options
  const [captionPlacement, setCaptionPlacement] = useState('Below Video');
  
  // State for free movement of overlay captions
  const [overlayPosition, setOverlayPosition] = useState({
    x: 50, // percentage
    y: 80, // percentage
    isDragging: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    width: 40 // percentage
  });
  
  // Global customization options
  const [nounColor, setNounColor] = useState('Electric Blue');
  const [verbColor, setVerbColor] = useState('Cherry Red');
  const [adjectiveColor, setAdjectiveColor] = useState('Forest Green');
  
  // Per-language customization settings with updated defaults
  const [languageCustomizations, setLanguageCustomizations] = useState({});
  
  // Replace high contrast with theme mode
  const [darkMode, setDarkMode] = useState(false);
  
  // New state for UI enhancements
  const [settingsPanelCollapsed, setSettingsPanelCollapsed] = useState(false);
  const [captionsHeight, setCaptionsHeight] = useState('normal');
  
  // New state for caption spacing
  const [captionSpacing, setCaptionSpacing] = useState(10); // Default 10px spacing
  
  // Refs
  const overlayRef = useRef(null);
  const videoContainerRef = useRef(null);
  const videoResizeHandleRef = useRef(null);
  const captionsResizeHandleRef = useRef(null);
  const activeResizeRef = useRef(null);

  // Add new state for resize handling
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState(null);
  const resizeStartRef = useRef(null);

  // Add new state variables for loading progress and status management
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showLoadingProgress, setShowLoadingProgress] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [statusFadeOut, setStatusFadeOut] = useState(false);

  // Add helper function for status management
  const setStatusWithTimeout = (message, duration = 0) => {
    setStatus(message);
    setShowStatus(true);
    setStatusFadeOut(false);

    if (duration > 0) {
      setTimeout(() => {
        setStatusFadeOut(true);
        setTimeout(() => {
          setShowStatus(false);
          setStatus('');
        }, 500);
      }, duration);
    }
  };

  // Extract video ID from YouTube URL
  const extractVideoId = (url) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  // Toggle settings panel collapse
  const toggleSettingsPanel = () => {
    setSettingsPanelCollapsed(!settingsPanelCollapsed);
  };

  // Toggle captions height
  const toggleCaptionsHeight = () => {
    setCaptionsHeight(captionsHeight === 'normal' ? 'expanded' : 'normal');
  };

  // Get selected languages as an array (for compatibility with the rest of the code)
  const getSelectedLanguagesArray = () => {
    return Object.values(selectedLanguages).filter(lang => lang !== '');
  };

  useEffect(() => {
    const initialCollapsedState = {};
    getSelectedLanguagesArray().forEach(lang => {
      initialCollapsedState[lang] = true; // Default: Collapsed (closed)
    });
    setCollapsedLanguages(initialCollapsedState);
  }, [selectedLanguages]); 
  
  // Toggle collapse for a specific language
  const toggleLanguageCollapse = (lang) => {
    setCollapsedLanguages(prev => ({
      ...prev,
      [lang]: !prev[lang]
    }));
  };

  // highlighting api
  const HIGHLIGHTER_API_URL = './Grammar-Highlighter/highlight'; // Grammar Highlighter API URL
  
   // Call Grammar Highlighter API
   const extractKeywords = async (text) => {
    try {
      const response = await fetch(HIGHLIGHTER_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error(`Failed to extract keywords: ${response.status}`);

      const data = await response.json();
      return data.keywords || [];
    } catch (error) {
      console.error('Error extracting keywords:', error);
      return [];
    }
  };

  // Highlight keywords in captions
  const highlightKeywords = async (text) => {
    if (!highlightingEnabled || !text) return text;

    const keywords = await extractKeywords(text);
    if (keywords.length === 0) return text;

    const regex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
    return text.split(regex).map((part, index) =>
      keywords.includes(part) ? (
        <span key={index} className="highlighted-keyword">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  // Initialize with the default URL and load Iconify script
  useEffect(() => {
    const id = extractVideoId(youtubeLink);
    if (id) {
      setVideoId(id);
    }
    
    // Check for user's preferred color scheme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
      document.body.classList.add('dark-mode');
    }
    
    // Listen for changes in color scheme preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      setDarkMode(e.matches);
      if (e.matches) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    };
    
    // Load Iconify script if it's not already loaded (for the dark mode toggle)
    if (!window.Iconify) {
      const script = document.createElement('script');
      script.src = 'https://code.iconify.design/1/1.0.4/iconify.min.js';
      script.async = true;
      document.body.appendChild(script);
    }
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
        // Clean up Iconify script if we added it
        const iconifyScript = document.querySelector('script[src="https://code.iconify.design/1/1.0.4/iconify.min.js"]');
        if (iconifyScript && !document.head.contains(iconifyScript)) {
          document.body.removeChild(iconifyScript);
        }
      };
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
      return () => {
        mediaQuery.removeListener(handleChange);
        // Clean up Iconify script if we added it
        const iconifyScript = document.querySelector('script[src="https://code.iconify.design/1/1.0.4/iconify.min.js"]');
        if (iconifyScript && !document.head.contains(iconifyScript)) {
          document.body.removeChild(iconifyScript);
        }
      };
    }
  }, []);

  // Initialize language customizations when new languages are selected
  useEffect(() => {
    const newLanguageCustomizations = { ...languageCustomizations };
    let hasChanges = false;
    
    // Initialize customizations for any new languages with improved default options
    Object.values(selectedLanguages).forEach(lang => {
      if (lang && !newLanguageCustomizations[lang]) {
        newLanguageCustomizations[lang] = {
          fontFamily: 'Arial / Helvetica',
          fontSize: 16,
          fontWeight: 400,
          textColor: darkMode ? '#FFFFFF' : '#000000',
          letterSpacing: 0
        };
        hasChanges = true;
      }
    });
    
    // Only update state if there are actual changes
    if (hasChanges) {
      setLanguageCustomizations(newLanguageCustomizations);
    }
  }, [selectedLanguages]);

  // Update language customizations when dark mode changes
  useEffect(() => {
    // Update text colors for all languages when dark mode changes
    const updatedCustomizations = { ...languageCustomizations };
    let hasChanges = false;
    
    Object.keys(updatedCustomizations).forEach(lang => {
      if (updatedCustomizations[lang]?.textColor === '#000000' || updatedCustomizations[lang]?.textColor === '#FFFFFF') {
        updatedCustomizations[lang].textColor = darkMode ? '#FFFFFF' : '#000000';
        hasChanges = true;
      }
    });
    
    // Only update state if there are actual changes
    if (hasChanges) {
      setLanguageCustomizations(updatedCustomizations);
    }
  }, [darkMode]);

  // Add this function to toggle language visibility
  const toggleLanguageVisibility = (lang) => {
    setHiddenLanguages(prev => ({
      ...prev,
      [lang]: !prev[lang]
    }));
  };

  // Set up video container resize functionality
  useEffect(() => {
    if (!videoId) return;
    
    const videoContainer = videoContainerRef.current;
    const resizeHandle = videoResizeHandleRef.current;
    
    if (!videoContainer || !resizeHandle) return;
    
    const handleMouseDown = (e) => {
      e.preventDefault();
      
      // Save initial position and dimensions
      const startX = e.clientX;
      const startWidth = videoContainer.offsetWidth;
      
      activeResizeRef.current = 'video';
      
      const handleMouseMove = (moveEvent) => {
        if (activeResizeRef.current !== 'video') return;
        
        // Calculate new width based on mouse movement
        const deltaX = moveEvent.clientX - startX;
        const newWidth = Math.max(300, startWidth + deltaX); // Minimum 300px width
        
        // Set width
        videoContainer.style.width = `${newWidth}px`;
        
        // Update the video wrapper's padding-top to maintain aspect ratio
        const videoWrapper = videoContainer.querySelector('.video-wrapper');
        if (videoWrapper) {
          // No need to explicitly set height - padding-top maintains ratio
          videoWrapper.style.paddingTop = `${(9/16) * 100}%`; // Keep 16:9 ratio
        }
        
        moveEvent.preventDefault();
      };
      
      const handleMouseUp = () => {
        activeResizeRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };
    
    resizeHandle.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      if (resizeHandle) {
        resizeHandle.removeEventListener('mousedown', handleMouseDown);
      }
    };
  }, [videoId]);

  // Set up captions container resize functionality
  useEffect(() => {
    if (!captionsResizeHandleRef.current) return;
    
    const resizeHandle = captionsResizeHandleRef.current;
    
    const handleMouseDown = (e) => {
      e.preventDefault();
      
      // Find the active captions section
      const captionsSection = document.querySelector('.active-captions-section');
      if (!captionsSection) return;
      
      // Save initial position and dimensions
      const startY = e.clientY;
      const startHeight = captionsSection.offsetHeight;
      
      activeResizeRef.current = 'captions';
      
      const handleMouseMove = (moveEvent) => {
        if (activeResizeRef.current !== 'captions') return;
        
        // Calculate new height
        const height = startHeight + (moveEvent.clientY - startY);
        
        // Apply new height with min constraint
        if (height > 100) {
          captionsSection.style.height = `${height}px`;
          captionsSection.style.maxHeight = `${height}px`;
        }
        
        moveEvent.preventDefault();
      };
      
      const handleMouseUp = () => {
        activeResizeRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };
    
    resizeHandle.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      resizeHandle.removeEventListener('mousedown', handleMouseDown);
    };
  }, [availableLanguages.length]);

  // Handle YouTube link input
  const handleLinkChange = (e) => {
    setYoutubeLink(e.target.value);
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    const id = extractVideoId(youtubeLink);
    if (id) {
      setVideoId(id);
      setStatusWithTimeout('Fetching available languages...'); // No timeout for loading message
      setIsLoading(true);
      fetchAvailableLanguages(id);
    } else {
      setStatusWithTimeout('Invalid YouTube URL', 3000);
    }
  };

  // Function to fetch available languages using the youtube_transcript_api
  const fetchAvailableLanguages = async (videoId) => {
    try {
      console.log(`Fetching languages for video ID: ${videoId}`);
      const response = await fetch(`${API_BASE_URL}/api/list-transcripts?videoId=${videoId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error (${response.status}):`, errorText);
        throw new Error(`Failed to fetch transcript list: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received data:', data);
      
      if (data.error) {
        console.error('API returned error:', data.error);
        throw new Error(data.error);
      }
      
      // Filter out duplicate transcripts based on language_code
      const uniqueTranscripts = data.transcripts.filter((transcript, index, self) =>
        index === self.findIndex(t => t.language_code === transcript.language_code)
      );
      
      // Store the filtered transcript information
      setAvailableTranscripts(uniqueTranscripts);
      
      // Also keep the unique language codes for backward compatibility
      const languageCodes = uniqueTranscripts.map(t => t.language_code);
      setAvailableLanguages(languageCodes);
      console.log(`Found ${languageCodes.length} unique languages:`, languageCodes);
      
      // Set primary language to English if available, otherwise first available language
      const defaultPrimary = uniqueTranscripts.find(t => t.language_code === 'en')?.language_code 
        || (uniqueTranscripts[0]?.language_code || '');
        
      setSelectedLanguages({
        primary: defaultPrimary,
        secondary: ''
      });
      
      setStatusWithTimeout(`Found captions in ${languageCodes.length} languages. Fetching transcripts...`);
      
      // Fetch transcripts for all available languages
      await fetchCaptions(videoId, languageCodes);
      
    } catch (error) {
      console.error('Error fetching transcript languages:', error);
      setStatusWithTimeout(`Error: ${error.message}`, 5000);
      setIsLoading(false);
    }
  };

  // Function to fetch transcripts for all available languages
  const fetchCaptions = async (videoId, languages) => {
    try {
      setStatusWithTimeout('Loading transcripts...'); // No timeout for loading message
      setLoadingProgress(0);
      setShowLoadingProgress(true);
      
      // Create an array of promises for parallel fetching
      const fetchPromises = languages.map(async (lang) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/get-transcript?videoId=${videoId}&lang=${lang}`);
          
          if (!response.ok) {
            console.warn(`Failed to fetch transcript for ${lang}: ${response.status}`);
            return { lang, error: true };
          }
          
          const data = await response.json();
          
          if (data.error) {
            console.warn(`Error fetching transcript for ${lang}: ${data.error}`);
            return { lang, error: true };
          }
          
          // Process the transcript data - add POS tagging
          const processedTranscript = data.transcript.map(caption => ({
            ...caption,
            text: applyPOSTagging(caption.text),
            end: caption.start + caption.duration // Calculate end time
          }));
          
          // Update captions immediately as each one loads
          setCaptions(prev => ({
            ...prev,
            [lang]: processedTranscript
          }));

          // Update loading progress
          setLoadingProgress(prev => prev + (100 / languages.length));
          
          return { lang, transcript: processedTranscript };
        } catch (error) {
          console.warn(`Error processing transcript for ${lang}:`, error);
          return { lang, error: true };
        }
      });
      
      // Wait for all transcripts to load in parallel
      const results = await Promise.all(fetchPromises);
      
      // Count successful loads
      const successfulLoads = results.filter(result => !result.error).length;
      
      // Update final status with timeout
      setStatusWithTimeout(`Successfully loaded captions in ${successfulLoads} languages`, 2000);
      setLoadingProgress(100);

      // Start fade out animation
      setTimeout(() => {
        setShowLoadingProgress(false);
      }, 500);
      
    } catch (error) {
      console.error('Error fetching captions:', error);
      setStatusWithTimeout(`Error fetching captions: ${error.message}`, 5000); // Show error messages longer
      setShowLoadingProgress(false);
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }
  };

  // Hightlighting
  const toggleHighlighting = () => setHighlightingEnabled(!highlightingEnabled);

  // Function to apply part-of-speech tagging (simplified for demo)
  const applyPOSTagging = (text) => {
    // This is a simplified implementation. In a production environment,
    // you would use a more sophisticated NLP approach.
    
    // Common words lists for basic POS tagging
    const commonNouns = ['person', 'time', 'year', 'way', 'day', 'thing', 'man', 'world', 'life', 'hand', 'part', 'child', 'eye', 'woman', 'place', 'work', 'week', 'case', 'point', 'government', 'company', 'number', 'group', 'problem', 'fact'];
    const commonVerbs = ['be', 'have', 'do', 'say', 'go', 'can', 'get', 'would', 'make', 'know', 'will', 'think', 'take', 'see', 'come', 'could', 'want', 'look', 'use', 'find', 'give', 'tell', 'work', 'may', 'should', 'call', 'try', 'ask', 'need', 'feel', 'become', 'leave', 'put', 'mean', 'keep', 'let', 'begin', 'seem', 'help', 'talk', 'turn', 'start', 'might', 'show', 'hear', 'play', 'run', 'move', 'like', 'live', 'believe', 'hold', 'bring', 'happen', 'must', 'write', 'provide'];
    const commonAdjectives = ['good', 'new', 'first', 'last', 'long', 'great', 'little', 'own', 'other', 'old', 'right', 'big', 'high', 'different', 'small', 'large', 'next', 'early', 'young', 'important', 'few', 'public', 'bad', 'same', 'able', 'true'];

    // Tokenize the text
    const words = text.split(/\s+/);
    let taggedText = '';

    for (let i = 0; i < words.length; i++) {
      const originalWord = words[i];
      const word = originalWord.toLowerCase().replace(/[^\w\s]/g, '');
      
      if (commonNouns.includes(word)) {
        taggedText += originalWord.replace(word, `<noun>${word}</noun>`);
      } else if (commonVerbs.includes(word)) {
        taggedText += originalWord.replace(word, `<verb>${word}</verb>`);
      } else if (commonAdjectives.includes(word)) {
        taggedText += originalWord.replace(word, `<adjective>${word}</adjective>`);
      } else {
        taggedText += originalWord;
      }
      
      if (i < words.length - 1) {
        taggedText += ' ';
      }
    }

    return taggedText;
  };

  // Set language rank (primary, secondary)
  const setLanguageRank = (lang, rank) => {
    // If language is already selected in another rank, clear it
    const updatedLanguages = { ...selectedLanguages };
    
    // If this language is already in another position, remove it
    Object.keys(updatedLanguages).forEach(key => {
      if (updatedLanguages[key] === lang && key !== rank) {
        updatedLanguages[key] = '';
      }
    });

    // Set the language to the new rank
    updatedLanguages[rank] = lang;
    setSelectedLanguages(updatedLanguages);
  };

  // Update customization for a specific language
  const updateLanguageCustomization = (lang, property, value) => {
    setLanguageCustomizations(prev => {
      // Get existing customization or create new one with defaults
      const existingCustomization = prev[lang] || {
        fontFamily: 'Arial / Helvetica',
        fontSize: 16,
        fontWeight: 400,
        textColor: darkMode ? '#FFFFFF' : '#000000',
        letterSpacing: 0
      };

      // Create new customization object with updated property
      const updatedCustomization = {
        ...existingCustomization,
        [property]: value
      };

      // Return new state with updated customization
      return {
        ...prev,
        [lang]: updatedCustomization
      };
    });
  };

  // Get color based on settings
  const getColor = (type) => {
    const colorMap = {
      'Electric Blue': '#007bff',
      'Cherry Red': '#dc3545',
      'Forest Green': '#28a745',
      'Sunny Yellow': '#ffc107',
      'Royal Purple': '#6f42c1'
    };
    
    switch(type) {
      case 'noun':
        return colorMap[nounColor] || colorMap['Electric Blue'];
      case 'verb':
        return colorMap[verbColor] || colorMap['Cherry Red'];
      case 'adjective':
        return colorMap[adjectiveColor] || colorMap['Forest Green'];
      default:
        return darkMode ? '#FFFFFF' : '#000000';
    }
  };

  // Format caption text using new StyledCaptionText component
  const formatCaptionText = (text, lang) => {
    if (!text) return '';
    
    const customization = languageCustomizations[lang] || {
      fontFamily: 'Arial / Helvetica',
      fontSize: 16,
      fontWeight: 400,
      textColor: darkMode ? '#FFFFFF' : '#000000',
      letterSpacing: 0
    };

    const fullCustomization = {
      ...customization,
      fontFamily: customization.fontFamily || 'Arial / Helvetica',
      fontSize: customization.fontSize || 16,
      fontWeight: customization.fontWeight || 400,
      textColor: customization.textColor || (darkMode ? '#FFFFFF' : '#000000'),
      letterSpacing: customization.letterSpacing || 0
    };
    
    return (
      <StyledCaptionText 
        text={text} 
        customization={fullCustomization} 
        darkMode={darkMode}
        getColor={getColor}
      />
    );
  };

  // Get caption style for a specific language (simplified)
  const getCaptionStyle = (lang) => {
    const customization = languageCustomizations[lang] || {};
    const isRTL = ['ar', 'fa', 'he', 'ur'].includes(lang);
    
    return {
      fontFamily: getFontFamily(customization.fontFamily || 'Arial / Helvetica'),
      fontSize: getFontSize(customization.fontSize || 16),
      fontWeight: getFontWeight(customization.fontWeight || 400),
      color: customization.textColor || (darkMode ? '#FFFFFF' : '#000000'),
      letterSpacing: getLetterSpacing(customization.letterSpacing || 0),
      backgroundColor: 'transparent',
      direction: isRTL ? 'rtl' : 'ltr'
    };
  };

  // Update the active captions based on current time
  useEffect(() => {
    const newActiveCaptions = {};
    
    getSelectedLanguagesArray().forEach(lang => {
      if (captions[lang]) {
        const activeCaption = captions[lang].find(
          caption => currentTime >= caption.start && currentTime <= caption.end
        );
        
        if (activeCaption) {
          newActiveCaptions[lang] = activeCaption;
        }
      }
    });
    
    setActiveCaptions(newActiveCaptions);
  }, [currentTime, captions, selectedLanguages]);

  // Initialize YouTube API and player
  useEffect(() => {
    if (!videoId) return;
    
    let player = null;
    
    // Load YouTube iframe API if it's not already loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      
      window.onYouTubeIframeAPIReady = () => {
        createYouTubePlayer();
      };
    } else {
      createYouTubePlayer();
    }
    
    function createYouTubePlayer() {
      if (window.player) {
        window.player.destroy();
      }
      
      window.player = new window.YT.Player('youtube-player', {
        videoId: videoId,
        events: {
          'onReady': onPlayerReady,
          'onStateChange': onPlayerStateChange
        }
      });
    }
    
    function onPlayerReady(event) {
      console.log('YouTube player ready');
      player = event.target; // Store the player reference
    }
    
    function onPlayerStateChange(event) {
      // Update current time when video is playing
      if (event.data === window.YT.PlayerState.PLAYING) {
        const updateTime = () => {
          if (player && player.getCurrentTime) {
            setCurrentTime(player.getCurrentTime());
          }
          if (player && player.getPlayerState() === window.YT.PlayerState.PLAYING) {
            requestAnimationFrame(updateTime);
          }
        };
        updateTime();
      }
    }
    
    return () => {
      if (window.player) {
        window.player.destroy();
        window.player = null;
      }
    };
  }, [videoId]);

  // Find transcript by language code
  const findTranscriptByLanguageCode = (code) => {
    return availableTranscripts.find(t => t.language_code === code);
  };

  // Helper function to get language name
  const getLanguageName = (langCode) => {
    const transcript = findTranscriptByLanguageCode(langCode);
    return transcript?.language || langCode;
  };
  
  // Start dragging the caption overlay
  const handleMouseDown = (e) => {
    if (captionPlacement !== 'Overlay') return;
    
    const videoContainer = videoContainerRef.current;
    if (!videoContainer) return;
    
    const rect = videoContainer.getBoundingClientRect();
    const overlayElement = overlayRef.current;
    if (!overlayElement) return;

    // Calculate initial position relative to the container
    const initialX = (e.clientX - rect.left) / rect.width * 100;
    const initialY = (e.clientY - rect.top) / rect.height * 100;
    
    // Set dragging to true and store initial positions
    setOverlayPosition(prev => ({ 
      ...prev, 
      isDragging: true,
      startX: initialX,
      startY: initialY,
      lastX: prev.x,
      lastY: prev.y
    }));
    
    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Prevent default dragging behavior
    e.preventDefault();
  };
  
  // Handle mouse move during dragging - Improved for smoother movement
  const handleMouseMove = (e) => {
    if (!overlayPosition.isDragging) return;
    
    // Get the video container dimensions
    const videoContainer = videoContainerRef.current;
    if (!videoContainer) return;
    
    const rect = videoContainer.getBoundingClientRect();
    
    // Calculate current position as percentage of container
    const currentX = (e.clientX - rect.left) / rect.width * 100;
    const currentY = (e.clientY - rect.top) / rect.height * 100;
    
    // Calculate the delta movement from the start position
    const deltaX = currentX - overlayPosition.startX;
    const deltaY = currentY - overlayPosition.startY;
    
    // Calculate new position with smooth movement
    const newX = Math.max(0, Math.min(100, overlayPosition.lastX + deltaX));
    const newY = Math.max(0, Math.min(100, overlayPosition.lastY + deltaY));
    
    // Update position with smooth transition
    setOverlayPosition(prev => ({ 
      ...prev, 
      x: newX,
      y: newY
    }));
    
    // Prevent text selection during drag
    window.getSelection().removeAllRanges();
  };
  
  // Stop dragging with smooth finish
  const handleMouseUp = () => {
    setOverlayPosition(prev => ({ 
      ...prev, 
      isDragging: false,
      lastX: prev.x,
      lastY: prev.y
    }));
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Handle touch start for mobile devices - improved for smoother touch interaction
  const handleTouchStart = (e) => {
    if (captionPlacement !== 'Overlay') return;
    
    const touch = e.touches[0];
    const videoContainer = videoContainerRef.current;
    if (!videoContainer) return;
    
    const rect = videoContainer.getBoundingClientRect();
    
    // Calculate initial touch position relative to container
    const initialX = (touch.clientX - rect.left) / rect.width * 100;
    const initialY = (touch.clientY - rect.top) / rect.height * 100;
    
    // Set dragging to true and store initial positions
    setOverlayPosition(prev => ({ 
      ...prev, 
      isDragging: true,
      startX: initialX,
      startY: initialY,
      lastX: prev.x,
      lastY: prev.y
    }));
    
    // Add event listeners
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    
    // Prevent default behavior like scrolling
    e.preventDefault();
  };
  
  // Handle touch move for mobile devices - improved for smoother movement
  const handleTouchMove = (e) => {
    if (!overlayPosition.isDragging) return;
    
    const touch = e.touches[0];
    const videoContainer = videoContainerRef.current;
    if (!videoContainer) return;
    
    const rect = videoContainer.getBoundingClientRect();
    
    // Calculate current position as percentage of container
    const currentX = (touch.clientX - rect.left) / rect.width * 100;
    const currentY = (touch.clientY - rect.top) / rect.height * 100;
    
    // Calculate the delta movement from the start position
    const deltaX = currentX - overlayPosition.startX;
    const deltaY = currentY - overlayPosition.startY;
    
    // Calculate new position with smooth movement
    const newX = Math.max(0, Math.min(100, overlayPosition.lastX + deltaX));
    const newY = Math.max(0, Math.min(100, overlayPosition.lastY + deltaY));
    
    // Update position with smooth transition
    setOverlayPosition(prev => ({ 
      ...prev, 
      x: newX,
      y: newY
    }));
    
    // Prevent scrolling while dragging
    e.preventDefault();
  };
  
  // Handle touch end for mobile devices - with smooth finish
  const handleTouchEnd = () => {
    setOverlayPosition(prev => ({ 
      ...prev, 
      isDragging: false,
      lastX: prev.x,
      lastY: prev.y
    }));
    
    // Remove event listeners
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
  };
  
  // Toggle dark mode using the new fancy toggle
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    
    // Update body class for global styling
    if (!darkMode) {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.remove('dark-mode');
      document.body.classList.add('light-mode');
    }
  };

  // Jump to time in video when clicking on a transcript
  const jumpToTime = (time) => {
    if (window.player && window.player.seekTo) {
      window.player.seekTo(time);
      window.player.playVideo();
    }
  };

  // Handle resize start
  const handleResizeStart = (e, direction) => {
    e.stopPropagation(); // Prevent drag event from firing
    const videoContainer = videoContainerRef.current;
    const overlay = overlayRef.current;
    if (!videoContainer || !overlay) return;

    setIsResizing(true);
    setResizeDirection(direction);
    
    // Store initial values
    resizeStartRef.current = {
      x: e.clientX,
      width: overlayPosition.width,
      containerWidth: videoContainer.getBoundingClientRect().width,
      direction: direction,
      initialX: overlayPosition.x // Store initial X position
    };

    // Add event listeners to document to ensure smooth dragging
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', handleResizeEnd);
    
    // Prevent text selection and default behaviors
    e.preventDefault();
    window.getSelection().removeAllRanges();
  };

  // Handle resize
  const handleResize = (e) => {
    if (!isResizing || !resizeStartRef.current) return;

    const { x: startX, width: startWidth, containerWidth, direction, initialX } = resizeStartRef.current;
    const deltaX = e.clientX - startX;
    
    // Calculate width change as percentage
    const deltaWidth = (deltaX / containerWidth) * 100;
    
    // Calculate new width based on resize direction
    let newWidth;
    if (direction === 'right') {
      newWidth = Math.max(20, Math.min(90, startWidth + deltaWidth));
    } else {
      newWidth = Math.max(20, Math.min(90, startWidth - deltaWidth));
    }
    
    // If resizing from left, adjust position to maintain right edge position
    if (direction === 'left') {
      const currentRight = initialX + (startWidth / 2);
      const newX = currentRight - (newWidth / 2);
      setOverlayPosition(prev => ({
        ...prev,
        x: Math.max(newWidth / 2, Math.min(100 - newWidth / 2, newX)),
        width: newWidth
      }));
    } else {
      // Update width only for right resize
      setOverlayPosition(prev => ({
        ...prev,
        width: newWidth
      }));
    }

    // Prevent text selection during resize
    window.getSelection().removeAllRanges();
  };

  // Handle resize end
  const handleResizeEnd = () => {
    if (!isResizing) return;
    
    setIsResizing(false);
    setResizeDirection(null);
    resizeStartRef.current = null;
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  return (
    <div className={`app-container ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <h1 className="app-title">Caption<span className="second-c">C</span>raft</h1>
      
      {/* Fancy Dark Mode Toggle */}
      <div className="dark-mode-toggle">
        <label>
          <input 
            className="toggle-checkbox" 
            type="checkbox" 
            checked={darkMode}
            onChange={toggleDarkMode}
          />
          <div className="toggle-slot">
            <div className="sun-icon-wrapper">
              <div className="iconify sun-icon" data-icon="feather-sun" data-inline="false"></div>
            </div>
            <div className="toggle-button"></div>
            <div className="moon-icon-wrapper">
              <div className="iconify moon-icon" data-icon="feather-moon" data-inline="false"></div>
            </div>
          </div>
        </label>
      </div>
      
      {/* Input Box */}
      <form onSubmit={handleSubmit} className="form-container">
        <div className="input-group">
          <input
            type="text"
            value={youtubeLink}
            onChange={handleLinkChange}
            placeholder="Paste YouTube URL here (e.g., https://www.youtube.com/watch?v=D9Ihs241zeg)"
            className="input-field"
            aria-label="YouTube video URL"
          />
          <button 
            type="submit"
            className="submit-button"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Load Video'}
          </button>
        </div>
      </form>
      
      {/* Status message */}
      {showStatus && (
        <>
          <div className={`status-message ${statusFadeOut ? 'fade-out' : ''}`} role="status" aria-live="polite">
            {status}
          </div>
          {showLoadingProgress && (
            <div className={`loading-progress ${loadingProgress === 100 ? 'fade-out' : ''}`}>
              <div 
                className="loading-progress-fill" 
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
          )}
        </>
      )}
      
      {videoId && (
        <div className="main-content">
          {/* Main Content Area (Video + Captions) */}
          <div className="content-area">
            {/* Video Embed Box */}
            <div className="video-container" ref={videoContainerRef}>
              <div className="video-header">
                <div className="placement-toggle">
                  <div className="placement-buttons">
                    <button 
                      className={`placement-button ${captionPlacement === 'Below Video' ? 'active' : ''}`}
                      onClick={() => setCaptionPlacement('Below Video')}
                    >
                      Below
                    </button>
                    <button 
                      className={`placement-button ${captionPlacement === 'Overlay' ? 'active' : ''}`}
                      onClick={() => setCaptionPlacement('Overlay')}
                    >
                      Overlay
                    </button>
                  </div>
                </div>
              </div>
              <div className="video-wrapper" style={{ paddingTop: '56.25%' }}> {/* 16:9 Aspect Ratio */}
                {/* YouTube player */}
                <div id="youtube-player" className="video-frame"></div>
              </div>
              
              {/* Video resize handle */}
              <div 
                ref={videoResizeHandleRef}
                className="video-resize-handle" 
                title="Drag to resize video"
              ></div>
              
              {/* Real-time captions overlay - with improved draggable functionality */}
              {captionPlacement === 'Overlay' && (
                <div 
                  className={`captions-overlay ${overlayPosition.isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''}`}
                  style={{
                    position: 'absolute',
                    left: `${overlayPosition.x}%`,
                    top: `${overlayPosition.y}%`,
                    transform: 'translate(-50%, -50%)',
                    cursor: overlayPosition.isDragging ? 'grabbing' : 'grab',
                    transition: overlayPosition.isDragging || isResizing ? 'none' : 'all 0.1s ease-out',
                    width: `${overlayPosition.width}%`,
                    minWidth: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    backgroundColor: darkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: '8px',
                    padding: '8px',
                    boxSizing: 'border-box',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                  ref={overlayRef}
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                  tabIndex="0"
                  role="region"
                  aria-label="Movable captions overlay"
                >
                  {/* Left resize handle */}
                  <div
                    className="resize-handle resize-handle-left"
                    style={{
                      position: 'absolute',
                      left: '-8px',
                      top: 0,
                      width: '16px',
                      height: '100%',
                      cursor: 'ew-resize',
                      backgroundColor: isResizing && resizeDirection === 'left' ? 
                        'rgba(255, 255, 255, 0.2)' : 'transparent',
                      borderRadius: '4px 0 0 4px',
                      zIndex: 10
                    }}
                    onMouseDown={(e) => handleResizeStart(e, 'left')}
                  />

                  {/* Right resize handle */}
                  <div
                    className="resize-handle resize-handle-right"
                    style={{
                      position: 'absolute',
                      right: '-8px',
                      top: 0,
                      width: '16px',
                      height: '100%',
                      cursor: 'ew-resize',
                      backgroundColor: isResizing && resizeDirection === 'right' ? 
                        'rgba(255, 255, 255, 0.2)' : 'transparent',
                      borderRadius: '0 4px 4px 0',
                      zIndex: 10
                    }}
                    onMouseDown={(e) => handleResizeStart(e, 'right')}
                  />

                  {/* Resize indicators - always visible */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '-4px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '4px',
                      height: '24px',
                      backgroundColor: isResizing && resizeDirection === 'left' ? 
                        'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.3)',
                      borderRadius: '2px',
                      pointerEvents: 'none',
                      transition: 'background-color 0.1s ease'
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: '-4px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '4px',
                      height: '24px',
                      backgroundColor: isResizing && resizeDirection === 'right' ? 
                        'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.3)',
                      borderRadius: '2px',
                      pointerEvents: 'none',
                      transition: 'background-color 0.1s ease'
                    }}
                  />
                  
                  <div className="overlay-drag-instructions">
                    Hold to move • Drag edges to resize
                  </div>
                  
                  {getSelectedLanguagesArray().map(lang => (
                    activeCaptions[lang] && (
                      <div 
                        key={lang} 
                        className="overlay-caption" 
                        style={{
                          ...getCaptionStyle(lang),
                          width: '100%',
                          textAlign: 'center',
                          padding: '4px 8px',
                          whiteSpace: 'pre-wrap',
                          overflowWrap: 'break-word',
                          wordWrap: 'break-word',
                          maxWidth: '100%',
                          display: 'block',
                          userSelect: 'none' // Prevent text selection while dragging
                        }}
                      >
                        {formatCaptionText(activeCaptions[lang].text, lang)}
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
            
            {/* Captions Display - for Below Video mode only - with reduced spacing */}
            {captionPlacement === 'Below Video' && 
             availableLanguages.length > 0 && (
              <div className="captions-container closer-to-video">
                
                {/* Current active captions section - all languages together */}
                <div className={`active-captions-section ${captionsHeight === 'expanded' ? 'expanded' : ''}`}>
                  <button
                    className="toggle-caption-height"
                    onClick={toggleCaptionsHeight}
                    title={captionsHeight === 'normal' ? 'Expand captions' : 'Collapse captions'}
                  >
                    {captionsHeight === 'normal' ? '↓' : '↑'}
                  </button>
                  
                  {getSelectedLanguagesArray().map(lang => {
                  // Skip hidden languages
                  if (hiddenLanguages[lang]) return null;
                  
                  return (
                    <div 
                      key={`active-${lang}`} 
                      className="caption-text-container"
                      style={{ marginBottom: `${captionSpacing}px` }}
                    >
                      <div className="caption-content-wrapper">
                        {activeCaptions[lang] ? (
                          <div className="caption-text">
                            {formatCaptionText(activeCaptions[lang].text, lang)}
                          </div>
                        ) : (
                          <span className="no-caption">   ...</span>
                        )}
                        <span className={`language-tag-right ${lang === selectedLanguages.primary ? 'primary' : 'secondary'}`}>
                          {getLanguageName(lang)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                </div>

                {/* Caption spacing control */}
                <div className="caption-spacing-control-below">
                  <input
                    type="range"
                    id="caption-spacing-below"
                    min="-20"
                    max="40"
                    step="0.25"
                    value={captionSpacing}
                    onChange={(e) => setCaptionSpacing(Number(e.target.value))}
                    className="spacing-slider-below"
                    aria-label="Adjust caption spacing"
                  />
                </div>
                
                {/* Caption resize handle */}
                <div 
                  ref={captionsResizeHandleRef}
                  className="resize-handle resize-handle-vertical" 
                  title="Drag to resize captions height"
                ></div>
                
                {/* Transcripts section - all languages */}
                <div className="transcripts-section">
                  <h3 className="section-subtitle">Full Transcripts</h3>
                  
                  {getSelectedLanguagesArray().map(lang => (
                    <div key={`transcript-${lang}`} className="language-section">
                      <h4 className="language-title">
                        {getLanguageName(lang)} 
                        {lang === selectedLanguages.primary ? ' (Primary)' : 
                         lang === selectedLanguages.secondary ? ' (Secondary)' : ''}
                      </h4>
                      
                      {/* Full transcript with timestamps */}
                      <div className="captions-content">
                        {captions[lang]?.map((caption, index) => (
                          <div key={index} 
                            className={`caption-item ${currentTime >= caption.start && currentTime <= caption.end ? 'active-caption' : ''}`}
                            onClick={() => jumpToTime(caption.start)}
                            tabIndex="0"
                            role="button"
                            aria-label={`Jump to ${Math.floor(caption.start / 60)}:${(caption.start % 60).toFixed(1).padStart(4, '0')}`}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                jumpToTime(caption.start);
                              }
                            }}
                          >
                            <div className="timestamp">
                              {Math.floor(caption.start / 60)}:{(caption.start % 60).toFixed(1).padStart(4, '0')} - 
                              {Math.floor(caption.end / 60)}:{(caption.end % 60).toFixed(1).padStart(4, '0')}
                            </div>
                            <div className="caption-text">
                              {formatCaptionText(caption.text, lang)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Settings Panel - Now with improved toggle */}
          <div className={`settings-panel ${settingsPanelCollapsed ? 'collapsed' : ''}`}>
            <button 
              className="settings-toggle" 
              onClick={toggleSettingsPanel}
              title={settingsPanelCollapsed ? "Expand settings panel" : "Collapse settings panel"}
              aria-expanded={!settingsPanelCollapsed}
              aria-controls="settings-content"
            >
              <span className="settings-toggle-icon">
                {settingsPanelCollapsed ? '»' : '«'}
              </span>
            </button>
            
            <div id="settings-content" style={{ display: settingsPanelCollapsed ? 'none' : 'block', width: '100%' }}>
              <h2 className="section-title">Customize Display</h2>
              
              {/* Language Selection */}
              <div className="settings-section">
                <h3 className="settings-title">Select Languages</h3>
                
                {/* Primary Language Dropdown */}
                <div className="language-selection-item">
                  <label className="settings-label" htmlFor="primary-language">Primary Language</label>
                  <div className="language-dropdown-container">
                    <select 
                      id="primary-language"
                      value={selectedLanguages.primary} 
                      onChange={(e) => setLanguageRank(e.target.value, 'primary')}
                      className="settings-select language-dropdown"
                    >
                      {availableTranscripts.map((transcript, index) => (
                        <option key={`primary-${transcript.language_code}-${index}`} value={transcript.language_code}>
                          {transcript.language}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Secondary Language Dropdown */}
                <div className="language-selection-item">
                  <label className="settings-label" htmlFor="secondary-language">Secondary Language</label>
                  <div className="language-dropdown-container">
                    <select 
                      id="secondary-language"
                      value={selectedLanguages.secondary} 
                      onChange={(e) => setLanguageRank(e.target.value, 'secondary')}
                      className="settings-select language-dropdown"
                    >
                      <option value="" key="none">None</option>
                      {availableTranscripts.map((transcript, index) => (
                        <option key={`secondary-${transcript.language_code}-${index}`} value={transcript.language_code}>
                          {transcript.language}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Language-specific customization */}
              <div className="settings-section">
                <h3 className="settings-title">Language Customizations</h3>
                
                {getSelectedLanguagesArray().map(lang => (
                  <div key={`customize-${lang}`} className={`language-customization-card ${collapsedLanguages[lang] ? 'collapsed' : ''}`}>
                    <div 
                      className="language-card-header"
                      onClick={() => toggleLanguageCollapse(lang)}
                    >
                      <div className="language-header-content">
                        <span className="language-name">{getLanguageName(lang)}</span>
                        <button
                          className={`visibility-toggle-icon ${hiddenLanguages[lang] ? 'hidden' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLanguageVisibility(lang);
                          }}
                          title={hiddenLanguages[lang] ? 'Show Language' : 'Hide Language'}
                          aria-label={hiddenLanguages[lang] ? 'Show Language' : 'Hide Language'}
                        />
                        {lang === selectedLanguages.primary && <span className="language-tag primary">Primary</span>}
                        {lang === selectedLanguages.secondary && <span className="language-tag secondary">Secondary</span>}
                      </div>
                      <button 
                        className="collapse-toggle"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLanguageCollapse(lang);
                        }}
                        aria-label={collapsedLanguages[lang] ? "Expand language settings" : "Collapse language settings"}
                      />
                    </div>
                    
                    <div className="language-card-content">
                      {/* Visibility Toggle */}
                      <button
                        className={`visibility-toggle-icon ${hiddenLanguages[lang] ? 'hidden' : ''}`}
                        onClick={() => toggleLanguageVisibility(lang)}
                        title={hiddenLanguages[lang] ? 'Show Language' : 'Hide Language'}
                        aria-label={hiddenLanguages[lang] ? 'Show Language' : 'Hide Language'}
                      />

                      {/* Font Selection */}
                      <div className="option-group">
                        <div className="option-label">Font</div>
                        <select 
                          className="font-select"
                          value={languageCustomizations[lang]?.fontFamily || 'Arial / Helvetica'}
                          onChange={(e) => updateLanguageCustomization(lang, 'fontFamily', e.target.value)}
                          style={{ fontFamily: getFontFamily(languageCustomizations[lang]?.fontFamily || 'Arial / Helvetica') }}
                        >
                          {[
                            'Arial / Helvetica',
                            'Lexend',
                            'Nunito Sans',
                            'Chewy',
                            'Open Sans',
                            'Verdana',
                            ...(lang === 'ja' ? ['Shizuru'] : [])
                          ].map(font => (
                            <option 
                              key={font} 
                              value={font}
                              style={{ fontFamily: getFontFamily(font) }}
                            >
                              {font}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Font Size */}
                      <div className="option-group">
                        <div className="option-label">Size</div>
                        <div className="button-group">
                          {[
                            { value: 14, label: 'Small' },
                            { value: 18, label: 'Medium' },
                            { value: 24, label: 'Large' }
                          ].map(size => (
                            <button
                              key={size.value}
                              className={`option-button ${(languageCustomizations[lang]?.fontSize === size.value) ? 'active' : ''}`}
                              onClick={() => {
                                const updatedCustomization = {
                                  ...languageCustomizations[lang],
                                  fontSize: size.value
                                };
                                setLanguageCustomizations(prev => ({
                                  ...prev,
                                  [lang]: updatedCustomization
                                }));
                              }}
                            >
                              {size.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Font Weight */}
                      <div className="option-group">
                        <div className="option-label">Font Weight</div>
                        <div className="button-group">
                          {[
                            { value: 300, label: 'Light' },
                            { value: 400, label: 'Regular' },
                            { value: 700, label: 'Bold' }
                          ].map(weight => (
                            <button
                              key={weight.value}
                              className={`option-button ${(languageCustomizations[lang]?.fontWeight === weight.value) ? 'active' : ''}`}
                              onClick={() => {
                                const updatedCustomization = {
                                  ...languageCustomizations[lang],
                                  fontWeight: weight.value
                                };
                                setLanguageCustomizations(prev => ({
                                  ...prev,
                                  [lang]: updatedCustomization
                                }));
                              }}
                            >
                              {weight.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Character Spacing */}
                      <div className="option-group">
                        <div className="option-label">Character Spacing</div>
                        <div className="button-group">
                          {[
                            { value: -1, label: 'Tight' },
                            { value: 0, label: 'Normal' },
                            { value: 2, label: 'Wide' }
                          ].map(spacing => (
                            <button
                              key={spacing.value}
                              className={`option-button ${languageCustomizations[lang]?.letterSpacing === spacing.value ? 'active' : ''}`}
                              onClick={() => updateLanguageCustomization(lang, 'letterSpacing', spacing.value)}
                            >
                              {spacing.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Preview Text */}
                      <div 
                        className="preview-text"
                        style={getCaptionStyle(lang)}
                      >
                        The quick brown fox jumps over the lazy dog.
                      </div>

                      {/* Action Buttons */}
                      <div className="button-row">
                        <button 
                          className="action-button secondary"
                          onClick={() => {
                            setLanguageCustomizations(prev => ({
                              ...prev,
                              [lang]: {
                                fontFamily: 'Arial / Helvetica',
                                fontSize: 16,
                                fontWeight: 400,
                                textColor: darkMode ? '#FFFFFF' : '#000000',
                                letterSpacing: 0
                              }
                            }));
                          }}
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Keyword Highlighting */}
              <div className="settings-section">
                <h3 className="settings-title">Keyword Highlighting</h3>
                <div className="toggle-container">
                  <input 
                    type="checkbox" 
                    id="highlight-toggle"
                    checked={highlightingEnabled} 
                    onChange={toggleHighlighting} 
                  />
                  <label htmlFor="highlight-toggle">
                    <div className="toggle-switch"></div>
                    Enable Keyword Highlighting
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;