import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { JSX } from "react";
import Header from "../../components/Header/Header";
import Sidebar from "../../components/Sidebar/Sidebar";
import { useHierarchy } from "../../context/HeirarchyContext";
import { useAuth } from "../../context/AuthContext";
import { getColleges, createCollege } from "../../api/colleges";
import { getDepartments, createDepartment } from "../../api/department";
import { createSemester } from "../../api/semester";
import { createCourse, deleteCourse } from "../../api/courses";
import { createTopic, deleteTopic } from "../../api/topics";
import { createSubtopic, deleteSubtopic, updateSubtopic, createSubtopicContent, getSubtopicContent, deleteSubtopicContent } from "../../api/subtopics";
import "./ContentView.css";
import { processMathExpressions, isStandaloneMathLine } from "../../utils/mathProcessor";
import { convertLatexToUnicode } from "../../utils/latexToUnicode";
import { MarkdownRenderer } from "../../components/MarkdownRenderer/MarkdownRenderer";
import { getCachedData, setCachedData } from "../../utils/cacheManager";

  // Google Slides: Try to open with app first. Returns true if app opened (page went hidden), false otherwise.
  const tryOpenWithGoogleSlides = (driveUrl: string): Promise<boolean> => {
    if (!isMobile()) {
      window.open(driveUrl, '_blank', 'noopener,noreferrer');
      return Promise.resolve(true);
    }

    const fileId = driveUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1] || driveUrl.match(/[?&]id=([a-zA-Z0-9-_]+)/)?.[1];
    if (!fileId) {
      window.open(driveUrl, '_blank', 'noopener,noreferrer');
      return Promise.resolve(true);
    }

    return new Promise<boolean>((resolve) => {
      let resolved = false;
      const resolveOnce = (opened: boolean) => {
        if (!resolved) {
          resolved = true;
          document.removeEventListener('visibilitychange', onVisibilityChange);
          if (iframe.parentNode) document.body.removeChild(iframe);
          resolve(opened);
        }
      };

      const onVisibilityChange = () => {
        if (document.hidden) resolveOnce(true);
      };
      document.addEventListener('visibilitychange', onVisibilityChange);

      const slidesAppUrl = `googleslides://docs.google.com/presentation/d/${fileId}/edit`;
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = slidesAppUrl;
      document.body.appendChild(iframe);

      setTimeout(() => resolveOnce(false), 2000);
    });
  };

  // Initialize MathJax
  declare global {
  interface Window {
    MathJax?: {
      typesetPromise: (elements?: HTMLElement[]) => Promise<void>;
      startup: {
        ready: () => void;
      };
      config: {
        tex: {
          inlineMath: string[][];
          displayMath: string[][];
        };
      };
    };
  }
}

// Detect mobile device (utility function)
const isMobile = () => {
  return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Detect iOS devices (iPhone/iPad/iPod, including iPadOS reporting as Mac)
const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

interface ContentViewProps {
  onNavigateToLogin: () => void;
  onNavigateToHeirarchy: () => void;
  isFullscreen?: boolean;
  onFullscreenToggle?: () => void;
}

const ContentView: React.FC<ContentViewProps> = ({
  onNavigateToLogin,
  onNavigateToHeirarchy,
  isFullscreen = false,
  onFullscreenToggle
}) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // start hidden to avoid initial flash
    
    const [playingVideos, setPlayingVideos] = useState<{ [key: string]: boolean }>({});
  const [loadingVideos, setLoadingVideos] = useState<Set<string>>(new Set());
  const [openResources, setOpenResources] = useState<Set<number>>(new Set());
  const [fullscreenResource, setFullscreenResource] = useState<number | null>(null);
  const [loadingResources, setLoadingResources] = useState<Set<number>>(new Set());
  const [showGoogleSlidesPopup, setShowGoogleSlidesPopup] = useState(false);


  // Load saved mode from localStorage or default to "normal"
  const getSavedMode = (): "deep" | "normal" | "rush" => {
    try {
      const saved = localStorage.getItem('contentMode');
      if (saved === 'deep' || saved === 'normal' || saved === 'rush') {
        return saved;
      }
    } catch (error) {
      console.warn('Error reading saved mode:', error);
    }
    return 'normal';
  };

  const [mode, setMode] = useState<"deep" | "normal" | "rush">(getSavedMode());

  // Custom setMode function that persists to localStorage
  const handleModeChange = (newMode: "deep" | "normal" | "rush") => {
    setMode(newMode);
    try {
      localStorage.setItem('contentMode', newMode);
    } catch (error) {
      console.warn('Error saving mode to localStorage:', error);
    }
  };

  // Save mode to localStorage whenever it changes (fallback)
  useEffect(() => {
    try {
      localStorage.setItem('contentMode', mode);
    } catch (error) {
      console.warn('Error saving mode to localStorage:', error);
    }
  }, [mode]);

  // Initialize MathJax
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://polyfill.io/v3/polyfill.min.js?features=es6';
    script.async = true;
    document.head.appendChild(script);

    const mathJaxScript = document.createElement('script');
    mathJaxScript.id = 'MathJax-script';
    mathJaxScript.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
    mathJaxScript.async = true;
    mathJaxScript.onload = () => {
      if (window.MathJax) {
        (window.MathJax.config as any) = {
          tex: {
            inlineMath: [['\\(', '\\)'], ['$', '$']],
            displayMath: [['\\[', '\\]'], ['$$', '$$']],
            processEscapes: true,
            processEnvironments: true
          }
        };
        window.MathJax.startup.ready();
      }
    };
    document.head.appendChild(mathJaxScript);

    return () => {
      // Cleanup
      const existingScript = document.getElementById('MathJax-script');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);
  // Removed mobile detection code
  const { selectedSubtopic, hierarchy, selectedCourse, selectedTopic, courses, topics, subtopics, setSelectedCourse, setSelectedTopic, setSelectedSubtopic, loadTopics, loadSubtopics, loadContent, loadCourses, setHierarchy, clearTopicCache, clearSubtopicCache } = useHierarchy();

  // Debug logging for topics state (only in development)
  if (import.meta.env.DEV) {
    console.log('ContentView render - topics:', topics, 'selectedCourse:', selectedCourse);
  }

  // Debug when topics change (only in development)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('ContentView - topics changed:', topics);
    }
  }, [topics]);
  const { isAdmin } = useAuth();
  const [contentData, setContentData] = useState<any>(null);

  // Re-render MathJax when content changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.MathJax) {
        window.MathJax.typesetPromise().catch((err: Error) => {
          console.warn('MathJax typeset error:', err);
        });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [contentData]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [isLoadingSubtopics, setIsLoadingSubtopics] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [loadedSections, setLoadedSections] = useState<Set<string>>(new Set());

  // Admin state
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminMode, setAdminMode] = useState<'colleges' | 'departments' | 'semesters'>('colleges');
  const [showAddForm, setShowAddForm] = useState<{ mode: string; visible: boolean }>({ mode: '', visible: false });
  const [addFormData, setAddFormData] = useState({
    name: '',
    courseId: '',
    topicId: ''
  });
  const [showContentAddForm, setShowContentAddForm] = useState<{ section: string; visible: boolean }>({ section: '', visible: false });
  const [contentAddFormData, setContentAddFormData] = useState({
    contentType: 'notes',
    title: '',
    content: '',
    resourceType: 'ppt', // 'pdf' or 'ppt'
    contentFormat: 'normal' // 'normal', 'math', or 'code'
  });
  const [addResourceStatus, setAddResourceStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [adminFormData, setAdminFormData] = useState({
    name: '',
    collegeId: '',
    departmentId: ''
  });
  const [adminColleges, setAdminColleges] = useState<any[]>([]);
  const [adminDepartments, setAdminDepartments] = useState<any[]>([]);


  // Admin functions
  const handleAddItem = (mode: string) => {
    setShowAddForm({ mode, visible: true });
    setAddFormData({ name: '', courseId: '', topicId: '' });
  };

  const handleAddSubmit = async () => {
    try {
      let result;
      switch (showAddForm.mode) {
        case 'courses':
          // For courses, use the stored semester ID directly
          if (!hierarchy || !hierarchy.semesterId) return;
          result = await createCourse(addFormData.name, hierarchy.semesterId);
          // Refresh courses
          if (hierarchy) {
            loadCourses();
          }
          break;
        case 'topics':
          if (!selectedCourse) {
            console.error('No course selected for topic creation');
            return;
          }
          console.log('Creating topic:', addFormData.name, 'for course:', selectedCourse.id);
          result = await createTopic(addFormData.name, parseInt(selectedCourse.id));
          console.log('Topic created:', result);
          // Clear cache and refresh topics
          clearTopicCache(selectedCourse.id);
          await loadTopics(selectedCourse.id);
          console.log('Topics refreshed after creation');
          break;
        case 'subtopics':
          if (!selectedTopic) return;
          result = await createSubtopic(addFormData.name, parseInt(selectedTopic.id));
          // Clear cache and refresh subtopics
          clearSubtopicCache(selectedTopic.id);
          loadSubtopics(selectedTopic.id);
          break;
      }
      console.log('Added:', result);
      setShowAddForm({ mode: '', visible: false });
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleAddResource = async () => {
    if (!selectedSubtopic || !contentAddFormData.title.trim() || !contentAddFormData.content.trim()) {
      return;
    }

    setAddResourceStatus('loading');

    try {
      await createSubtopicContent(parseInt(selectedSubtopic.id), {
        contentType: 'drive',
        contentOrder: 1,
        title: contentAddFormData.title,
        content: contentAddFormData.content,
        metadata: { resourceType: contentAddFormData.resourceType }
      });

      setAddResourceStatus('success');

      // Refresh content
      loadContentData();
      setShowContentAddForm({ section: '', visible: false });

      // Reset status after showing success for a moment
      setTimeout(() => {
        setAddResourceStatus('idle');
        // Clear form data
        setContentAddFormData({ contentType: 'drive', title: '', content: '', resourceType: 'ppt', contentFormat: 'normal' });
      }, 1500);

    } catch (error) {
      console.error('Error adding resource:', error);
      setAddResourceStatus('error');

      // Reset status after showing error for a moment
      setTimeout(() => {
        setAddResourceStatus('idle');
      }, 3000);
    }
  };

  const handleDeleteItem = async (item: any) => {
    try {
      const mode = selectedCourse ? (selectedTopic ? 'subtopics' : 'topics') : 'courses';
      let result;

      switch (mode) {
        case 'courses':
          result = await deleteCourse(item.id);
          // Refresh courses
          if (hierarchy) {
            loadCourses();
          }
          break;
        case 'topics':
          result = await deleteTopic(item.id);
          // Clear cache and refresh topics
          if (selectedCourse) {
            clearTopicCache(selectedCourse.id);
            loadTopics(selectedCourse.id);
          }
          break;
        case 'subtopics':
          result = await deleteSubtopic(item.id);
          // Clear cache and refresh subtopics
          if (selectedTopic) {
            clearSubtopicCache(selectedTopic.id);
            loadSubtopics(selectedTopic.id);
          }
          break;
      }

      console.log('Item deleted:', result);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleEditSubtopic = async (item: any, newName: string) => {
    try {
      const result = await updateSubtopic(item.id, newName);

      // Refresh subtopics to get updated data
      if (selectedTopic) {
        loadSubtopics(selectedTopic.id);
      }

      // Update selectedSubtopic if it's the one being edited
      if (selectedSubtopic && selectedSubtopic.id === item.id) {
        setSelectedSubtopic({ ...selectedSubtopic, name: newName, label: newName });
      }

      console.log('Subtopic updated:', result);
    } catch (error) {
      console.error('Error updating subtopic:', error);
    }
  };

  const handleAdminSubmit = async () => {
    try {
      let result;
      switch (adminMode) {
        case 'colleges':
          result = await createCollege(adminFormData.name);
          break;
        case 'departments':
          result = await createDepartment(adminFormData.name, parseInt(adminFormData.collegeId));
          break;
        case 'semesters':
          result = await createSemester(adminFormData.name, parseInt(adminFormData.departmentId));
          break;
      }
      console.log('Created:', result);
      // Reset form
      setAdminFormData({
        name: '',
        collegeId: '',
        departmentId: ''
      });
    } catch (error) {
      console.error('Error creating entity:', error);
    }
  };


  // Smart content cache using version-based invalidation
  // For content we use per-device cache: users will reuse cached content
  // on repeated visits from the same browser until the cache is invalidated
  // by our versioning logic in cacheManager (or by a future global version).
  const getContentFromCache = useCallback((subtopicId: string): any | null => {
    const cacheKey = `content_cache_${subtopicId}`;
    return getCachedData<any>(cacheKey);
  }, []);

  const setContentInCache = useCallback((subtopicId: string, content: any) => {
    const cacheKey = `content_cache_${subtopicId}`;
    setCachedData(cacheKey, content);
  }, []);

  const notesRef = useRef<HTMLDivElement>(null);

  // Ensure hierarchy is loaded from localStorage if context doesn't have it
  useEffect(() => {
    if (!hierarchy) {
      const savedHierarchy = localStorage.getItem('hierarchy');
      if (savedHierarchy) {
        const parsed = JSON.parse(savedHierarchy);
        if (parsed.semester) {
          setHierarchy(parsed);
        }
      }
    }
  }, [hierarchy, setHierarchy]);

  // Ensure courses are loaded when component mounts
  useEffect(() => {
    if (hierarchy && courses.length === 0) {
      setIsLoadingCourses(true);
      loadCourses().finally(() => setIsLoadingCourses(false));
    }
  }, [hierarchy, courses.length, loadCourses]);

  // Courses are loaded automatically in HierarchyContext when hierarchy changes
  // No need for additional loading here

  useEffect(() => {
    // Load content when selectedSubtopic changes, but don't auto-focus on sections
    if (selectedSubtopic) {
      loadContentData();
      setOpenResources(new Set()); // Clear open resources when switching subtopics
      setPlayingVideos({}); // Clear playing videos when switching subtopics
      // Exit fullscreen and unlock orientation for mobile
      handlePauseVideo();
      setLoadingResources(new Set()); // Clear loading resources when switching subtopics
    } else {
      setContentData(null);
      setLoadedSections(new Set()); // Clear loaded sections
      setOpenResources(new Set()); // Clear open resources
      setPlayingVideos({}); // Clear playing videos
      // Exit fullscreen and unlock orientation for mobile
      handlePauseVideo();
      setLoadingResources(new Set()); // Clear loading resources
    }
  }, [selectedSubtopic]);

  // Load admin data when admin panel opens
  useEffect(() => {
    if (showAdminPanel && isAdmin) {
      loadAdminColleges();
    }
  }, [showAdminPanel, isAdmin]);

  // Load departments when college is selected
  useEffect(() => {
    if (adminFormData.collegeId && showAdminPanel) {
      loadAdminDepartments(parseInt(adminFormData.collegeId));
    } else {
      setAdminDepartments([]);
    }
  }, [adminFormData.collegeId, showAdminPanel]);

  const loadAdminColleges = async () => {
    try {
      const colleges = await getColleges();
      setAdminColleges(colleges.data || []);
    } catch (error) {
      console.error('Error loading colleges:', error);
      setAdminColleges([]);
    }
  };

  const loadAdminDepartments = async (collegeId: number) => {
    try {
      const departments = await getDepartments(collegeId);
      setAdminDepartments(departments.data || []);
    } catch (error) {
      console.error('Error loading departments:', error);
      setAdminDepartments([]);
    }
  };

  const loadContentData = async () => {
    if (!selectedSubtopic) return;

    setIsLoadingContent(true);
    setLoadedSections(new Set()); // Reset loaded sections

    const subtopicId = selectedSubtopic.id.toString();

    // Bypass cache for admin users to ensure instant updates
    if (!isAdmin) {
      // Check sessionStorage cache first (only for non-admin users)
      const cachedContent = getContentFromCache(subtopicId);
      if (cachedContent) {
        // Ensure cached content has all required array properties
        const safeCachedContent = {
          ...cachedContent,
          videos: Array.isArray(cachedContent.videos) ? cachedContent.videos : [],
          driveResources: Array.isArray(cachedContent.driveResources) ? cachedContent.driveResources : [],
          notesItems: Array.isArray(cachedContent.notesItems) ? cachedContent.notesItems : [],
          questions: Array.isArray(cachedContent.questions) ? cachedContent.questions : [],
          notes: cachedContent.notes || ''
        };
        setContentData(safeCachedContent);
        setIsLoadingContent(false);
        // Don't auto-load sections - let them load progressively when viewed
        return;
      }
    } else {
      // Clear cache for admin users
      try {
        const cacheKey = `content_cache_${subtopicId}`;
        sessionStorage.removeItem(cacheKey);
      } catch (error) {
        console.error('Error clearing cache:', error);
      }
    }

    // Fetch from API
    try {
      const content = await loadContent(subtopicId);
      if (content && Array.isArray(content) && content.length > 0) {
        // Transform the backend content format to frontend format
        const transformedContent = transformContentData(content);
        // Store in sessionStorage cache only for non-admin users
        if (!isAdmin) {
          setContentInCache(subtopicId, transformedContent);
        }
        setContentData(transformedContent);
      } else {
        // No fallback content - sections will render empty
        const emptyContent = {
          title: "",
          videos: [],
          driveResources: [],
          notes: "",
          notesItems: [],
          questions: []
        };
        setContentData(emptyContent);
      }

      // Sections will load progressively as they come into view or when interacted with
      // No automatic loading to prevent unwanted focus on PDFs/PPTs/videos

    } catch (error) {
      // On error, use empty content
      const emptyContent = {
        title: "",
        videos: [],
        driveResources: [],
        notes: "",
        notesItems: [],
        questions: []
      };
      setContentData(emptyContent);

      // Still simulate progressive loading
      setTimeout(() => setLoadedSections(prev => new Set([...prev, "featuredVideo"])), 300);
      setTimeout(() => setLoadedSections(prev => new Set([...prev, "driveResources"])), 450);
      setTimeout(() => setLoadedSections(prev => new Set([...prev, "notes"])), 600);
      setTimeout(() => setLoadedSections(prev => new Set([...prev, "questions"])), 750);
    }

    setIsLoadingContent(false);
  };

  const transformContentData = (backendContent: any[]) => {
    // Transform backend content array to frontend format
    const contentMap: { [key: string]: any[] } = {
      videos: [], // Keep for featuredVideo processing
      driveResources: [],
      notes: [],
      questions: []
    };

    // Safety check: ensure backendContent is an array
    if (!Array.isArray(backendContent)) {
      return {
        title: selectedSubtopic?.name || 'Content',
        videos: [],
        featuredVideo: null,
        driveResources: [],
        notes: '',
        notesItems: [],
        questions: []
      };
    }

    backendContent.forEach(item => {
      // Handle both content_type and contentType (backend may use either)
      const contentType = item.content_type || item.contentType;

      switch (contentType) {
        case 'video':
          if (item.content && (item.content.includes('youtube.com') || item.content.includes('youtu.be'))) {
            contentMap.videos.push({
              id: item.id, // Store backend ID for deletion
              title: item.title || 'Video Content',
              youtubeUrl: item.content
            });
          }
          break;
        case 'drive':
          contentMap.driveResources.push({
            id: item.id, // Store backend ID for deletion
            title: item.title || 'Drive Resource',
            url: item.content
          });
          break;
        case 'notes':
          if (item.content) {
            contentMap.notes.push({
              id: item.id, // Store backend ID for deletion
              content: item.content
            });
          }
          break;
        case 'question':
          contentMap.questions.push({
            id: item.id, // Store backend ID for deletion
            question: item.title || item.content || 'Question',
            answer: item.metadata?.answer || item.metadata?.Answer || 'Answer not available',
            metadata: item.metadata // Include metadata for format information
          });
          break;
      }
    });

    return {
      title: selectedSubtopic?.name || 'Content',
      videos: contentMap.videos, // Support multiple videos
      featuredVideo: contentMap.videos[0] || null, // Keep for backward compatibility
      driveResources: contentMap.driveResources,
      notes: contentMap.notes.map((n: any) => n.content).join('\n\n'),
      notesItems: contentMap.notes, // Store notes with IDs
      questions: contentMap.questions
    };
  };


    const handleMenuToggle = () => {
      setSidebarCollapsed(prev => !prev);
    };

    // Match content area transition easing to sidebar for synchronized toggle
    useEffect(() => {
      const contentMain = document.querySelector('.content-main') as HTMLElement | null;
      if (!contentMain) return;

      // Use same cubic-bezier as sidebar for margin-left and width transitions
      contentMain.style.transition = `margin-left 260ms cubic-bezier(0.4, 0, 0.2, 1), width 260ms cubic-bezier(0.4, 0, 0.2, 1)`;
    }, [sidebarCollapsed]);

    // Swipe gesture for mobile devices: swipe right to open sidebar, swipe left to close
    useEffect(() => {
      // Only enable swipe for mobile devices (both browsers and PWA)
      if (!isMobile() || isFullscreen) {
        return;
      }

      let touchStartX = 0;
      let touchStartY = 0;
      let touchStartTime = 0;
      let touchStartedOnSidebar = false;
      const SWIPE_THRESHOLD = 50; // Minimum distance for swipe
      const SWIPE_TIME_THRESHOLD = 300; // Maximum time for swipe (ms)
      const MAX_VERTICAL_DISTANCE = 100; // Maximum vertical distance to consider it a horizontal swipe

      const handleTouchStart = (e: Event) => {
        const touchEvent = e as TouchEvent;
        const target = touchEvent.target as HTMLElement;
        
        // Ignore touches on specific interactive elements (back button, inputs, non-sidebar buttons)
        // Allow touches on nav-link (sidebar widgets) to enable swipe detection
        if (target && (
          target.tagName === 'INPUT' ||
          (target.closest('.sidebar-back-icon') !== null) // Back button only
        )) {
          touchStartX = 0;
          touchStartY = 0;
          touchStartTime = 0;
          touchStartedOnSidebar = false;
          return;
        }
        
        // Track if touch started on sidebar (including widgets)
        touchStartedOnSidebar = target ? target.closest('.sidebar') !== null : false;
        
        const touch = touchEvent.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchStartTime = Date.now();
      };

      const handleTouchEnd = (e: Event) => {
        if (!touchStartX || !touchStartY) return;

        const touchEvent = e as TouchEvent;
        const touch = touchEvent.changedTouches[0];
        const touchEndX = touch.clientX;
        const touchEndY = touch.clientY;
        const touchEndTime = Date.now();

        const deltaX = touchEndX - touchStartX; // Positive if swiped right (left to right), negative if swiped left (right to left)
        const deltaY = Math.abs(touchStartY - touchEndY);
        const deltaTime = touchEndTime - touchStartTime;
        const absDeltaX = Math.abs(deltaX);

        // Check if it's a valid swipe: fast enough, mostly horizontal
        if (
          absDeltaX > SWIPE_THRESHOLD &&
          deltaTime < SWIPE_TIME_THRESHOLD &&
          deltaY < MAX_VERTICAL_DISTANCE
        ) {
          // Use the stored value from touchStart to know if swipe started on sidebar
          if (touchStartedOnSidebar && !sidebarCollapsed) {
            // Swipe right on sidebar to navigate back in hierarchy
            if (deltaX > SWIPE_THRESHOLD) {
              // Hierarchy: Courses -> Topics -> Subtopics
              // Navigation back: Subtopics -> Topics -> Courses
              if (selectedTopic) {
                // Currently viewing subtopics -> go back to topics view
                e.preventDefault();
                e.stopPropagation();
                setSelectedTopic(null);
                // Reset touch start values immediately to prevent click
                touchStartX = 0;
                touchStartY = 0;
                touchStartTime = 0;
                return;
              } else if (selectedCourse) {
                // Currently viewing topics -> go back to courses view
                e.preventDefault();
                e.stopPropagation();
                setSelectedCourse(null);
                // Reset touch start values immediately to prevent click
                touchStartX = 0;
                touchStartY = 0;
                touchStartTime = 0;
                return;
              }
              // If in courses view (both null), do nothing
            }
            // Swipe left (right to left) to close sidebar when open
            else if (deltaX < -SWIPE_THRESHOLD) {
              e.preventDefault();
              e.stopPropagation();
              setSidebarCollapsed(true);
              // Reset touch start values immediately to prevent click
              touchStartX = 0;
              touchStartY = 0;
              touchStartTime = 0;
              return;
            }
          } else {
            // Swipe right (left to right) to open sidebar when closed
            if (deltaX > SWIPE_THRESHOLD && sidebarCollapsed) {
              setSidebarCollapsed(false);
            }
            // Swipe left (right to left) to close sidebar when open (outside sidebar)
            else if (deltaX < -SWIPE_THRESHOLD && !sidebarCollapsed && !touchStartedOnSidebar) {
              setSidebarCollapsed(true);
            }
          }
        }

        // Reset touch start values
        touchStartX = 0;
        touchStartY = 0;
        touchStartTime = 0;
        touchStartedOnSidebar = false;
      };

      // Add touch event listeners to the content view and sidebar
      const contentView = document.querySelector('.content-view');
      const sidebar = document.querySelector('.sidebar');
      
      if (contentView) {
        contentView.addEventListener('touchstart', handleTouchStart, { passive: true });
        contentView.addEventListener('touchend', handleTouchEnd, { passive: false }); // Need preventDefault
      }
      
      // Also listen on sidebar when it's open (for swipe navigation and close)
      if (sidebar && !sidebarCollapsed) {
        sidebar.addEventListener('touchstart', handleTouchStart, { passive: true });
        sidebar.addEventListener('touchend', handleTouchEnd, { passive: false }); // Need preventDefault
      }

      return () => {
        if (contentView) {
          contentView.removeEventListener('touchstart', handleTouchStart);
          contentView.removeEventListener('touchend', handleTouchEnd);
        }
        if (sidebar) {
          sidebar.removeEventListener('touchstart', handleTouchStart);
          sidebar.removeEventListener('touchend', handleTouchEnd);
        }
      };
    }, [sidebarCollapsed, isFullscreen, selectedTopic, selectedCourse]);

  const handleFullscreenToggle = () => {
    if (!isFullscreen) {
      // First close the sidebar, then enter fullscreen with smooth transition
      setSidebarCollapsed(true);
      // Delay to allow sidebar animation to start, then enter fullscreen
      setTimeout(() => {
        onFullscreenToggle?.();
        // Ensure we can scroll to top when entering fullscreen
        setTimeout(() => {
          const fullscreenContainer = document.querySelector('.content-view.fullscreen-mode');
          if (fullscreenContainer) {
            fullscreenContainer.scrollTop = 0;
          }
        }, 100);
      }, 300); // Match sidebar transition duration
    } else {
      // Exiting fullscreen - smooth transition
      onFullscreenToggle?.();
    }
  };

  // Calculate optimal tooltip position to stay within viewport

  // Keyboard shortcut for fullscreen (Alt+F)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        // Blur any focused iframe to ensure shortcuts work
        if (document.activeElement instanceof HTMLIFrameElement) {
          document.activeElement.blur();
        }
        handleFullscreenToggle();
      }
    };

    // Use document event listener with capture to work even when focused in iframes
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isFullscreen]); // Include dependencies

  // Keyboard shortcut for closing resources (Alt+X), exiting resource fullscreen (Escape), and toggling resource fullscreen (Alt+S)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle resource fullscreen exit (Escape key)
      if (event.key === 'Escape' && fullscreenResource) {
        event.preventDefault();
        // Blur any focused iframe to ensure shortcuts work
        if (document.activeElement instanceof HTMLIFrameElement) {
          document.activeElement.blur();
        }
        setFullscreenResource(null);
        setLoadingResources(new Set()); // Clear loading states when exiting fullscreen
        return;
      }

      // Handle resource fullscreen toggle (Alt+S)
      if (event.altKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        // Blur any focused iframe to ensure shortcuts work
        if (document.activeElement instanceof HTMLIFrameElement) {
          document.activeElement.blur();
        }
        if (fullscreenResource) {
          // Currently in fullscreen, exit
          setFullscreenResource(null);
        } else if (openResources.size > 0) {
          // Enter fullscreen for the first open resource - pause any playing videos
          setPlayingVideos({}); // Pause all videos when entering resource fullscreen
          // Exit fullscreen and unlock orientation for mobile
          handlePauseVideo();
          const firstOpenResourceId = Array.from(openResources)[0];
          setLoadingResources(prev => new Set([...prev, firstOpenResourceId])); // Show loading for fullscreen
          setFullscreenResource(firstOpenResourceId);
        }
        return;
      }

      if (event.altKey && event.key.toLowerCase() === 'x' && openResources.size > 0) {
        // Debug: Log the event
        console.log('Alt+X pressed, openResources:', openResources.size);

          event.preventDefault();
        // Close all open resources regardless of focus
          setOpenResources(new Set());
        setLoadingResources(new Set()); // Clear loading states

        // Remove focus from any iframe
        const activeElement = document.activeElement;
          if (activeElement && activeElement instanceof HTMLElement) {
            activeElement.blur();
        }
      }
    };

    // Use document event listener with capture to work even when focused in iframes
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [openResources, fullscreenResource]);

    // Add keyboard shortcuts for sidebar toggle (Ctrl+Z) and highlight undo (Ctrl+Z when toolbar is visible)
    useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'z') {
        event.preventDefault();
        // Blur any focused iframe to ensure shortcuts work
        if (document.activeElement instanceof HTMLIFrameElement) {
          document.activeElement.blur();
        }
        setSidebarCollapsed(prev => !prev);
      }
    };

    // Use document event listener with capture to work even when focused in iframes
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, []);


  const handleNavigate = (path: string) => {
    if (path === "/login") onNavigateToLogin();
    if (path === "/heirarchy") onNavigateToHeirarchy();
  };

  const handleCourseClick = async (course: any) => {
    console.log('Course clicked:', course);
    setSelectedCourse(course);
    setIsLoadingTopics(true);
    try {
      console.log('Loading topics for course:', course.id);
      await loadTopics(course.id);
      console.log('Topics loaded, current topics state:', topics);
    } finally {
      setIsLoadingTopics(false);
    }
  };

  const handleTopicClick = async (topic: any) => {
    // Keep subtopic selection and content when switching topics
    // Only clear when selecting a different subtopic, not when switching topics
    // setSelectedSubtopic(null);  // Commented out to maintain focus
    // setContentData(null);       // Commented out to maintain focus

    // Set the new topic and load its subtopics
    setSelectedTopic(topic);
    setIsLoadingSubtopics(true);
    try {
      await loadSubtopics(topic.id);
    } finally {
      setIsLoadingSubtopics(false);
    }
  };

  const handleBackToCourses = () => {
    setSelectedCourse(null);
    setSelectedTopic(null);
    // Don't clear selectedSubtopic and contentData to maintain focus
  };

  const handleBackToTopics = () => {
    setSelectedTopic(null);
    // Don't clear selectedSubtopic and contentData to maintain focus
  };

  const handleSubtopicClick = async (subtopic: any) => {
    // Set the selected subtopic (this will trigger the useEffect to load content)
    setSelectedSubtopic(subtopic);
  };

  const getYoutubeId = (url: string) => {
    const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
    return match ? match[1] : "";
  };

  const getEmbeddedUrl = (url: string, isPdf: boolean) => {
    if (isPdf) {
      // Extract filename from URL (handle both full URLs and just filenames)
      let filename: string;
      if (url.startsWith("http")) {
        // Extract filename from full URL
        const urlParts = url.split('/');
        filename = urlParts[urlParts.length - 1].split('?')[0]; // Remove query params if any
      } else {
        // Already just a filename
        filename = url;
      }

      // Build Cloudflare Worker URL with filename as route
      const workerBaseUrl = 'https://pdf-storage.suganthr09.workers.dev';
      const workerUrl = `${workerBaseUrl}/${filename}`;

      if (import.meta.env.DEV) {
        console.log('🔗 PDF URL - Original:', url);
        console.log('🔗 PDF URL - Filename:', filename);
        console.log('🔗 PDF URL - Worker URL:', workerUrl);
      }

      // Apply the Google Docs viewer ONLY on iOS (prevents forced downloads).
      // Keep Android/Desktop/Mac using the direct PDF URL as before.
      if (isIOS()) {
        // Hint Google to use the first signed-in account
        return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(workerUrl)}&authuser=0`;
      }
      return workerUrl;
    } else {
      // For PPTs and other files: Use direct Google Drive preview URL
      // Extract file ID from Google Drive sharing URL
      const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
      if (!fileIdMatch) return url;

      const fileId = fileIdMatch[1];
      // Use direct Google Drive preview URL - works best for public files
      // This format works for public files and provides native Google Drive viewer.
      // Hint Google to use the first signed-in account.
      return `https://drive.google.com/file/d/${fileId}/preview?authuser=0`;
    }
  };

  const getYoutubeThumbnail = (url: string, qualityIndex: number = 0) => {
    const videoId = getYoutubeId(url);
    if (!videoId) return "";

    // Try thumbnail qualities from highest to lowest resolution
    const thumbnailQualities = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault', 'default'];
    const baseUrl = `https://img.youtube.com/vi/${videoId}`;

    if (qualityIndex >= thumbnailQualities.length) {
      return ""; // No more qualities to try, return empty for blank thumbnail
    }

    return `${baseUrl}/${thumbnailQualities[qualityIndex]}.jpg`;
  };

   // Check if running as PWA
  const isPWA = () => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  };

  const handlePlayVideo = async (id: string) => {
    setPlayingVideos({ ...playingVideos, [id]: true });
    setLoadingVideos(prev => new Set(prev).add(id));
    
    // Lock screen orientation to landscape when video starts playing (for PWA on mobile)
    if (isMobile() && isPWA()) {
      try {
        if ('screen' in window && 'orientation' in window.screen) {
          const screenOrientation = (window.screen as any).orientation;
          if (screenOrientation && screenOrientation.lock) {
            await screenOrientation.lock('landscape');
            console.log('Screen orientation locked to landscape for video playback');
          } else if (screenOrientation && screenOrientation.unlock) {
            // Fallback to unlock if lock is not available
            await screenOrientation.unlock();
            console.log('Screen orientation unlocked for video playback');
          }
        }
      } catch (error) {
        console.log('Could not lock screen orientation to landscape:', error);
        // Try unlock as fallback
        try {
          if ('screen' in window && 'orientation' in window.screen) {
            const screenOrientation = (window.screen as any).orientation;
            if (screenOrientation && screenOrientation.unlock) {
              await screenOrientation.unlock();
            }
          }
        } catch (unlockError) {
          console.log('Could not unlock screen orientation:', unlockError);
        }
      }
    }
  };

  // Handle video pause/stop to exit fullscreen and unlock orientation on mobile PWA
  const handlePauseVideo = async () => {
    if (isMobile() && isPWA()) {
      try {
        // Exit fullscreen if active
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
        // Unlock orientation when videos stop
        if ('screen' in window && 'orientation' in window.screen) {
          const screenOrientation = (window.screen as any).orientation;
          if (screenOrientation && screenOrientation.unlock) {
            await screenOrientation.unlock();
            console.log('Screen orientation unlocked after video pause');
          }
        }
      } catch (error) {
        console.log('Failed to exit fullscreen or unlock orientation:', error);
      }
    }
  };

  // Handle orientation for video playback in PWA
  useEffect(() => {
    if (!isMobile() || !isPWA()) return;

    const hasPlayingVideos = Object.keys(playingVideos).length > 0 &&
                             Object.values(playingVideos).some(v => v === true);

    if (hasPlayingVideos) {
      // Lock orientation to landscape when videos are playing
      const lockOrientationToLandscape = async () => {
        try {
          if ('screen' in window && 'orientation' in window.screen) {
            const screenOrientation = (window.screen as any).orientation;
            if (screenOrientation && screenOrientation.lock) {
              await screenOrientation.lock('landscape');
            } else if (screenOrientation && screenOrientation.unlock) {
              // Fallback to unlock if lock is not available
              await screenOrientation.unlock();
            }
          }
        } catch (error) {
          // Fallback: try to unlock if lock fails
          try {
            if ('screen' in window && 'orientation' in window.screen) {
              const screenOrientation = (window.screen as any).orientation;
              if (screenOrientation && screenOrientation.unlock) {
                await screenOrientation.unlock();
              }
            }
          } catch (unlockError) {
            console.log('Orientation lock/unlock not available');
          }
        }
      };

      lockOrientationToLandscape();
      // Periodically try to lock to landscape (in case it gets locked by system)
      const interval = setInterval(lockOrientationToLandscape, 2000);
      return () => {
        clearInterval(interval);
        // Unlock orientation when videos stop playing
        if ('screen' in window && 'orientation' in window.screen) {
          const screenOrientation = (window.screen as any).orientation;
          if (screenOrientation && screenOrientation.unlock) {
            try {
              const unlockResult = screenOrientation.unlock();
              // Check if unlock returns a Promise before calling catch
              if (unlockResult && typeof unlockResult.catch === 'function') {
                unlockResult.catch(() => {
                  // Ignore errors when unlocking on cleanup
                });
              }
            } catch (error) {
              // Ignore errors when unlocking on cleanup
            }
          }
        }
      };
    } else {
      // No videos playing - unlock orientation
      if ('screen' in window && 'orientation' in window.screen) {
        const screenOrientation = (window.screen as any).orientation;
        if (screenOrientation && screenOrientation.unlock) {
          try {
            const unlockResult = screenOrientation.unlock();
            // Check if unlock returns a Promise before calling catch
            if (unlockResult && typeof unlockResult.catch === 'function') {
              unlockResult.catch(() => {
                // Ignore errors when unlocking
              });
            }
          } catch (error) {
            // Ignore errors when unlocking
          }
        }
      }
    }
  }, [playingVideos]);

  // Lock screen orientation to landscape when video enters fullscreen
  useEffect(() => {
    if (!isMobile() || !isPWA()) return;

    const handleFullscreenChange = async () => {
      const fullscreenElement = document.fullscreenElement;
      
      // Check if fullscreen element is a video iframe or contains one
      const isVideoFullscreen = fullscreenElement && (
        fullscreenElement.tagName === 'IFRAME' ||
        fullscreenElement.querySelector('iframe')
      );

      if (isVideoFullscreen) {
        // Lock screen orientation to landscape when video is in fullscreen
        try {
          if ('screen' in window && 'orientation' in window.screen) {
            const screenOrientation = (window.screen as any).orientation;
            if (screenOrientation && screenOrientation.lock) {
              await screenOrientation.lock('landscape');
              console.log('Screen orientation locked to landscape for video');
            } else if (screenOrientation && screenOrientation.unlock) {
              // Fallback to unlock if lock is not available
              await screenOrientation.unlock();
              console.log('Screen orientation unlocked for video');
            }
          }
        } catch (error) {
          console.log('Could not lock screen orientation to landscape:', error);
          // Try unlock as fallback
          try {
            if ('screen' in window && 'orientation' in window.screen) {
              const screenOrientation = (window.screen as any).orientation;
              if (screenOrientation && screenOrientation.unlock) {
                await screenOrientation.unlock();
              }
            }
          } catch (unlockError) {
            console.log('Could not unlock screen orientation:', unlockError);
          }
        }
      } else if (!fullscreenElement) {
        // Video exited fullscreen - unlock orientation
        try {
          if ('screen' in window && 'orientation' in window.screen) {
            const screenOrientation = (window.screen as any).orientation;
            if (screenOrientation && screenOrientation.unlock) {
              await screenOrientation.unlock();
              console.log('Screen orientation unlocked after exiting fullscreen');
            }
          }
        } catch (error) {
          console.log('Could not unlock screen orientation:', error);
        }
      }
    };

    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // NOTE: parseStructuredText function is deprecated - now using MarkdownRenderer for automatic Markdown + LaTeX rendering
  // Keeping the function for parseInlineFormatting which is still used for question rendering
  // @ts-ignore - Function kept for parseInlineFormatting compatibility
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const parseStructuredText = (text: string, contentFormat: string = 'normal') => {
    if (!text || text.trim() === '') {
      return [<p key="empty" className="structured-paragraph">No content available</p>];
    }

    // CODE FORMAT: Display EXACT input with NO processing, NO structuring, NO parsing
    if (contentFormat === 'code') {
        return [
          <pre
            key="raw-code-display"
            style={{
              whiteSpace: 'pre',
              background: '#1e1e1e',
              color: '#d4d4d4',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #333',
              fontFamily: 'monospace',
              fontSize: '14px',
              lineHeight: '1.4',
              margin: '1rem 0',
              overflowX: 'auto',
              display: 'block',
              width: '100%'
            }}
          >
            {text}
          </pre>
        ];
    }

    // Content parsing for regular text sections
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let inList = false;
    let listItems: JSX.Element[] = [];
    let currentIndentation = 0;
    let listType: 'bullet' | 'numbered' = 'bullet';
    let listStartNumber = 1;
    let inTable = false;
    let tableRows: string[][] = [];
    let tableHeaders: string[] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        if (listType === 'numbered') {
          elements.push(
            <ol key={`list-${elements.length}`} className="structured-list structured-numbered-list" start={listStartNumber}>
              {listItems}
            </ol>
          );
        } else {
          elements.push(
            <ul key={`list-${elements.length}`} className="structured-list">
              {listItems}
            </ul>
          );
        }
        listItems = [];
        inList = false;
        listStartNumber = 1;
      }
    };

    const flushTable = () => {
      if (inTable && tableRows.length > 0) {
        elements.push(
          <table key={`table-${elements.length}`} className="structured-table">
            {tableHeaders.length > 0 && (
              <thead>
                <tr>
                  {tableHeaders.map((header, index) => (
                    <th key={index} className="structured-table-header">
                      {parseInlineFormatting(header.trim())}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {tableRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="structured-table-cell">
                      {parseInlineFormatting(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );
        inTable = false;
        tableRows = [];
        tableHeaders = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      const leadingSpaces = line.length - line.trimLeft().length;

      // Skip standalone square brackets (just [ or ] on their own line)
      if (trimmedLine === '[' || trimmedLine === ']') {
        return; // Skip this line
      }



      // Table detection - Markdown format
      const tableRow = trimmedLine.match(/^\|(.+)\|$/);
      const tableSeparator = trimmedLine.match(/^\|[\s\-\|:]+\|$/);

      if (tableRow && !inTable) {
        // Start of table
        flushList();
        inTable = true;
        const cells = trimmedLine.split('|').slice(1, -1).map(cell => cell.trim());
        tableHeaders = cells;
      } else if (tableSeparator && inTable && tableHeaders.length > 0) {
        // Table separator row - skip this
        return;
      } else if (tableRow && inTable) {
        // Table data row
        const cells = trimmedLine.split('|').slice(1, -1).map(cell => cell.trim());
        tableRows.push(cells);
        return;
      } else if (inTable && trimmedLine === '') {
        // Empty line ends table
        flushTable();
        return;
      } else if (inTable && !tableRow) {
        // Non-table line ends table
        flushTable();
      }

      // Table detection - Dot format (Name. Age. City)
      const dotSeparated = trimmedLine.split('.').map(cell => cell.trim()).filter(cell => cell);
      const isDotTable = dotSeparated.length >= 2; // At least 2 columns

      if (isDotTable && !inTable) {
        // Check if this could be a table header by looking at next lines
        const nextLines = lines.slice(index + 1, index + 3);
        const hasConsistentDotRows = nextLines.every(line => {
          const cells = line.trim().split('.').map(cell => cell.trim()).filter(cell => cell);
          return cells.length === dotSeparated.length;
        });

        if (hasConsistentDotRows && nextLines.length > 0) {
          // Start of dot table
          flushList();
          inTable = true;
          tableHeaders = dotSeparated;
          return;
        }
      }

      if (isDotTable && inTable && dotSeparated.length === tableHeaders.length) {
        // Dot table data row
        tableRows.push(dotSeparated);
        return;
      }

      // End table on empty line or inconsistent format
      if (inTable && (trimmedLine === '' || (isDotTable && dotSeparated.length !== tableHeaders.length))) {
        flushTable();
        if (trimmedLine === '') return;
      }

      // Indented code block (4+ spaces or tab)
      if (leadingSpaces >= 4 || line.startsWith('\t')) {
        flushList();
        // Check if this starts a new code block or continues existing
        if (elements.length > 0 && elements[elements.length - 1]?.props?.className === 'structured-code-block') {
          // Extend existing code block
          const lastElement = elements[elements.length - 1];
          const existingCode = lastElement.props.children.props.children;
          const combinedCode = existingCode + '\n' + line;

          elements[elements.length - 1] = (
            <pre key={`code-extended-${index}`} className="structured-code-block">
              <code className="language-text">
                {combinedCode}
              </code>
            </pre>
          );
        } else {
          // Start new indented code block
          elements.push(
            <pre key={`code-${index}`} className="structured-code-block">
              <code className="language-text">
                {line}
              </code>
            </pre>
          );
        }
        return;
      }

      // Empty line - flush any pending list
      if (!trimmedLine) {
        flushList();
        return;
      }

      // Headings (# ## ###)
      const headingMatch = trimmedLine.match(/^(#{1,6})\s*(.+)?$/);
      if (headingMatch) {
        flushList();
        flushTable();
        const level = headingMatch[1].length;
        const content = headingMatch[2] || '';
        const className = `structured-heading structured-h${level}`;
        elements.push(
          <div key={index} className={className}>
            {parseInlineFormatting(content)}
          </div>
        );
        return;
      }

      // Blockquotes (> text)
      const blockquoteMatch = trimmedLine.match(/^>\s*(.+)$/);
      if (blockquoteMatch) {
        flushList();
        flushTable();
        elements.push(
          <blockquote key={index} className="structured-blockquote">
            {parseInlineFormatting(blockquoteMatch[1])}
          </blockquote>
        );
        return;
      }

      // Horizontal lines (--- or ***)
      const horizontalLineMatch = trimmedLine.match(/^[-*_]{3,}$/);
      if (horizontalLineMatch) {
        flushList();
        elements.push(
          <hr key={index} className="structured-horizontal-line" />
        );
        return;
      }

      // Numbered lists (1., 2., etc.)
      const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
      if (numberedMatch) {
        const listNumber = parseInt(numberedMatch[1]);
        const content = numberedMatch[2];
        const indentation = Math.floor(leadingSpaces / 2);

        if (!inList || listType !== 'numbered' || indentation !== currentIndentation) {
          flushList();
          inList = true;
          listType = 'numbered';
          currentIndentation = indentation;
          listStartNumber = listNumber;
        }

        listItems.push(
          <li key={`item-${index}`} className="structured-list-item" style={{ marginLeft: `${indentation * 20}px` }}>
            {parseInlineFormatting(content)}
          </li>
        );
        return;
      }

      // Bullet points (*, -, •)
      const bulletMatch = trimmedLine.match(/^[-*•]\s+(.+)$/);
      if (bulletMatch) {
        const content = bulletMatch[1];
        const indentation = Math.floor(leadingSpaces / 2);

        if (!inList || listType !== 'bullet' || indentation !== currentIndentation) {
          flushList();
          inList = true;
          listType = 'bullet';
          currentIndentation = indentation;
        }

        listItems.push(
          <li key={`item-${index}`} className="structured-list-item" style={{ marginLeft: `${indentation * 20}px` }}>
            {parseInlineFormatting(content)}
          </li>
        );
        return;
      }

      // Block math detection ($$...$$ or \[...\]) - only if format is 'math'
      if (contentFormat === 'math') {
        const blockMathMatch = trimmedLine.match(/^\$\$([^$]+)\$\$$/) || trimmedLine.match(/^\\\[([^\]]+)\\\]$/);
        if (blockMathMatch) {
          flushList();
          flushTable();
          const mathContent = blockMathMatch[1].trim();
          elements.push(
            <div key={`math-${index}`} className="math-block" style={{ margin: '1em 0', textAlign: 'left' }}>
              <span className="math-display">$${mathContent}$$</span>
            </div>
          );
          return;
        }
      }

      // Check if line is a standalone math expression (possibly in square brackets)
      if (isStandaloneMathLine(trimmedLine)) {
        flushList();
        flushTable();
        
        if (contentFormat === 'math') {
          // For math format: use MathJax
          let processedLine = processMathExpressions(trimmedLine, true, false);
          
          // Ensure it's in block math format
          if (!processedLine.trim().startsWith('$$')) {
            const mathMatch = processedLine.match(/\$\$([^$]+)\$\$/) || processedLine.match(/\\\(([^\)]+)\\\)/);
            if (mathMatch) {
              processedLine = `$$${mathMatch[1].trim()}$$`;
            } else {
              processedLine = `$$${processedLine.trim()}$$`;
            }
          }
          
          const mathContentMatch = processedLine.match(/\$\$([^$]+)\$\$/);
          let mathContent = mathContentMatch ? mathContentMatch[1].trim() : processedLine.replace(/\$\$/g, '').trim();
          
          // Ensure operator commands have \displaystyle for proper rendering in display math
          // This is a safety check in case processMathExpressions didn't add it
          const operatorCommands = ['\\lim', '\\partial', '\\frac', '\\sum', '\\prod', '\\int', '\\oint'];
          const needsDisplayStyle = operatorCommands.some(cmd => mathContent.includes(cmd));
          if (needsDisplayStyle && !mathContent.trim().startsWith('\\displaystyle')) {
            mathContent = `\\displaystyle ${mathContent}`;
          }
          
          elements.push(
            <div key={`math-block-${index}`} className="math-block" style={{ margin: '1em 0', textAlign: 'left' }}>
              <span className="math-display">$${mathContent}$$</span>
            </div>
          );
        } else {
          // For normal format: remove brackets, convert LaTeX to Unicode, display as centered text
          let processedLine = trimmedLine;
          // Remove square brackets
          processedLine = processedLine.replace(/\[([^\]]+)\]/g, (match, content) => {
            const trimmed = content.trim();
            // Check if it's a link
            const matchIndex = processedLine.indexOf(match);
            const afterMatch = processedLine.substring(matchIndex + match.length);
            if (/^\s*\(/.test(afterMatch)) return match; // Keep links
            // Remove brackets from math-like content
            if (/[≥≤∈∉∑∏∫√\d\s=<>\\\^_\{\}\(\)]/.test(trimmed) && trimmed.length > 2) {
              return trimmed;
            }
            return match;
          });
          // Convert LaTeX to Unicode
          processedLine = convertLatexToUnicode(processedLine);
          
          elements.push(
            <div key={`math-block-${index}`} className="math-block" style={{ margin: '1em 0', textAlign: 'center', fontFamily: 'monospace' }}>
              {processedLine}
            </div>
          );
        }
        return;
      }

      // Regular paragraphs
      flushList();
      // Process based on format
      let processedLine = trimmedLine;
      if (contentFormat === 'math') {
        processedLine = processMathExpressions(trimmedLine, true, false);
      }
      // For normal format, conversion happens in parseInlineFormatting
      elements.push(
        <p key={index} className="structured-paragraph">
          {parseInlineFormatting(processedLine, contentFormat === 'math', contentFormat === 'normal')}
        </p>
      );
    });

    flushList();
    flushTable();

    // Ensure we always return at least one element
    if (elements.length === 0) {
      return [<p key="empty" className="structured-paragraph">Content could not be parsed</p>];
    }

    return elements;
  };

  // Parse inline formatting like **bold** and *italic* with robust code preservation

  const parseInlineFormatting = (text: string, enableMath: boolean = false, convertToUnicode: boolean = false) => {
    if (!text) return text;

    let formattedText = text;

    // Convert LaTeX to Unicode if requested (for normal format)
    if (convertToUnicode) {
      formattedText = convertLatexToUnicode(formattedText);
      // Also remove square brackets from math-like content
      formattedText = formattedText.replace(/\[([^\]]+)\]/g, (match, content) => {
        const trimmed = content.trim();
        // Check if it's a link
        const matchIndex = formattedText.indexOf(match);
        const afterMatch = formattedText.substring(matchIndex + match.length);
        if (/^\s*\(/.test(afterMatch)) return match; // Keep links
        // Remove brackets from math-like content
        if (/[≥≤∈∉∑∏∫√\d\s=<>]/.test(trimmed) && trimmed.length > 2) {
          return trimmed; // Remove brackets
        }
        return match;
      });
    }

    // Process math expressions first (before HTML escaping) - only if math is enabled
    if (enableMath) {
      formattedText = processMathExpressions(formattedText, true, false);
    }

    // Escape HTML entities first to prevent XSS
      formattedText = formattedText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    // Links [text](url) - Process before other formatting to avoid conflicts
      formattedText = formattedText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="structured-link" target="_blank" rel="noopener noreferrer">$1</a>');

    // Strikethrough (~~text~~)
      formattedText = formattedText.replace(/~~(.*?)~~/g, '<span class="structured-strikethrough">$1</span>');

    // Bold text (**text**)
      formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<span class="structured-bold">$1</span>');

    // Italic text (*text* or _text_) - but avoid matching **bold** patterns
      formattedText = formattedText.replace(/(?<!\*)\*(?!\*)([^*]+?)(?<!\*)\*(?!\*)/g, '<span class="structured-italic">$1</span>');
      formattedText = formattedText.replace(/(?<!_)_([^_]+?)_(?!_)/g, '<span class="structured-italic">$1</span>');

    // Inline code (`code`) - preserve code exactly
    formattedText = formattedText.replace(/`([^`\n]+)`/g, (_match, code) => {
      // For inline code, we need to escape HTML but preserve the code structure
      const escapedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      return `<code class="structured-inline-code">${escapedCode}</code>`;
    });

    // Handle line breaks within paragraphs
      formattedText = formattedText.replace(/\n/g, '<br>');

    // Return as dangerouslySetInnerHTML to render HTML
    return <span dangerouslySetInnerHTML={{ __html: formattedText }} />;
  };

  // Render content based on format
  const renderMarkdown = (text: string, format: string = 'normal') => {
    if (!text || text.trim() === '') {
      return <div className="notes-structured">No content available</div>;
    }

    if (format === 'code') {
      // For code format, display raw text
      return (
        <div className="notes-structured">
          <pre
            style={{
              whiteSpace: 'pre',
              background: '#1e1e1e',
              color: '#d4d4d4',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #333',
              fontFamily: 'monospace',
              fontSize: '14px',
              lineHeight: '1.4',
              margin: '1rem 0',
              overflowX: 'auto',
              display: 'block',
              width: '100%'
            }}
          >
            {text}
          </pre>
        </div>
      );
    } else {
      // For 'normal', 'math', and any other formats, use MarkdownRenderer
      return (
        <div className="notes-structured">
          <MarkdownRenderer content={text} />
        </div>
      );
    }
  };


  const sectionsOrder = () => {
    // Conditional sections based on mode
    const allSections = ["featuredVideo", "driveResources", "notes", "questions"];

    return allSections.filter(section => {
      switch (mode) {
        case "deep":
          return true; // Show all sections
        case "normal":
          return section !== "notes"; // Hide notes section
        case "rush":
          return section !== "notes" && section !== "featuredVideo"; // Hide notes and video
        default:
          return true;
      }
    });
  };

  const renderSection = (section: string) => {
    // Load section on demand when first accessed (don't auto-focus on PDFs/PPTs/videos)
    if (!loadedSections.has(section) && contentData && !isLoadingContent) {
      // Mark section as loaded immediately when accessed
      setLoadedSections(prev => new Set([...prev, section]));
    }

    // Show loading animation if content is still loading and section hasn't loaded yet
    if (isLoadingContent && !loadedSections.has(section)) {
      return (
        <section className="section" key={`${section}-loading`}>
          <h2 className="section-title">
            {section === "featuredVideo" && "Video Content"}
            {section === "driveResources" && "Presentation & Resources"}
            {section === "notes" && "Understanding the Concept"}
            {section === "questions" && "Practice Questions"}
          </h2>
          <div className="section-loading">
            <div className="section-loading-spinner"></div>
            <span className="section-loading-text">Loading...</span>
          </div>
        </section>
      );
    }

    switch (section) {
      case "featuredVideo":
        const hasVideos = contentData.videos && contentData.videos.length > 0;
        return (
          <section className="section" key="featuredVideo">
            <div className="section-header">
            <h2 className="section-title">Video Content</h2>
              {isAdmin && hasVideos && (
                <button
                  className="section-delete-btn"
                  onClick={async () => {
                    try {
                      // Delete all videos for this subtopic
                      if (!selectedSubtopic) return;
                      const contentItems = await getSubtopicContent(parseInt(selectedSubtopic.id));
                      const videoItems = contentItems.data.filter((item: any) => item.contentType === 'video');
                      for (const item of videoItems) {
                        await deleteSubtopicContent(item.id);
                      }
                      loadContentData();
                    } catch (error) {
                      console.error('Error deleting videos:', error);
                    }
                  }}
                  title="Delete all videos"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              )}
            </div>
            {contentData.videos && contentData.videos.length > 0 && (
              <div className="videos-container">
                {contentData.videos.map((video: any) => {
                  const videoId = `video-${video.id}`;
                  return (
                    <div className="video-item" key={video.id}>
                      {isAdmin && (
                        <button
                          className="video-delete-btn"
                          onClick={async () => {
                            try {
                              await deleteSubtopicContent(video.id);
                              loadContentData();
                            } catch (error) {
                              console.error('Error deleting video:', error);
                            }
                          }}
                          title="Delete video"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      )}
            <div className="video-card compact centered-content">
              <div className="video-wrapper small">
                          {loadingVideos.has(videoId) && (
                            <div className="video-loading">
                              <div className="video-loading-spinner"></div>
                              <span className="video-loading-text">Loading video...</span>
                            </div>
                          )}
                          {playingVideos[videoId] ? (
                  <iframe
                              src={`https://www.youtube.com/embed/${getYoutubeId(video.youtubeUrl)}?autoplay=1&rel=0&modestbranding=1&showinfo=0&playsinline=1${isIOS() ? '&mute=1' : ''}`}
                    allow={isIOS() ? "autoplay; encrypted-media; fullscreen; picture-in-picture; muted" : "autoplay; encrypted-media; fullscreen; picture-in-picture"}
                    allowFullScreen
                              onLoad={() => {
                                setLoadingVideos(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(videoId);
                                  return newSet;
                                });
                              }}
                              style={{
                                opacity: loadingVideos.has(videoId) ? 0 : 1,
                                transition: 'opacity 0.3s ease-in-out'
                              }}
                  />
                ) : (
                  <div
                    className="video-placeholder"
                              onClick={() => handlePlayVideo(videoId)}
                            >
                              <img
                                src={getYoutubeThumbnail(video.youtubeUrl)}
                                alt={video.title || "Video thumbnail"}
                                onError={(e) => {
                                  const img = e.target as HTMLImageElement;
                                  const currentSrc = img.src;
                                  const videoId = getYoutubeId(video.youtubeUrl);

                                  if (!videoId) {
                                    // Hide image if no video ID
                                    img.style.display = 'none';
                                    return;
                                  }

                                  const baseUrl = `https://img.youtube.com/vi/${videoId}`;

                                  // If maxresdefault failed, try sddefault once
                                  if (currentSrc.includes('maxresdefault')) {
                                    img.src = `${baseUrl}/sddefault.jpg`;
                                  } else {
                                    // sddefault also failed - hide the image completely
                                    img.style.display = 'none';
                                  }
                                }}
                                onLoad={(e) => {
                                  const img = e.target as HTMLImageElement;
                                  const videoId = getYoutubeId(video.youtubeUrl);

                                  if (!videoId) return;

                                  // Check if this might be YouTube's default thumbnail (very small dimensions)
                                  // YouTube's default thumbnail is usually 120x90
                                  if (img.naturalWidth <= 130 && img.naturalHeight <= 100) {
                                    // This is likely YouTube's default placeholder - hide it
                                    img.style.display = 'none';
                                  }
                                }}
                    style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  borderRadius: '8px'
                    }}
                              />
                    <div className="play-icon">
                      <svg width="72" height="72" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="8,5 19,12 8,19" />
                      </svg>
                    </div>
                              {video.title && (
                                <div className="video-title-overlay">{video.title}</div>
                              )}
                  </div>
                )}
              </div>
            </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Video Button for Admin - always show for admins */}
            {isAdmin && (
              <div className="content-add-section">
                {!showContentAddForm.visible || showContentAddForm.section !== 'featuredVideo' ? (
                  <button
                    className="content-add-btn"
                    onClick={() => {
                      setShowContentAddForm({ section: 'featuredVideo', visible: true });
                      setContentAddFormData({ contentType: 'video', title: '', content: '', resourceType: '', contentFormat: 'normal' });
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="23 7 16 12 23 17 23 7"/>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                    </svg>
                    Add Video
                  </button>
                ) : (
                  <div className="content-add-form">
                    <div className="add-form-row">
                      <input
                        type="text"
                        placeholder="Video Title"
                        value={contentAddFormData.title}
                        onChange={(e) => setContentAddFormData({...contentAddFormData, title: e.target.value})}
                        className="content-form-input"
                      />
                      <input
                        type="url"
                        placeholder="YouTube Video URL"
                        value={contentAddFormData.content}
                        onChange={(e) => setContentAddFormData({...contentAddFormData, content: e.target.value})}
                        className="content-form-input"
                      />
                    </div>
                    <div className="add-form-buttons">
                      <button
                        className="add-form-submit"
                        onClick={async () => {
                          if (selectedSubtopic) {
                            try {
                              await createSubtopicContent(parseInt(selectedSubtopic.id), {
                                contentType: 'video',
                                contentOrder: 1,
                                title: contentAddFormData.title,
                                content: contentAddFormData.content
                              });
                              // Refresh content
                              loadContentData();
                              setShowContentAddForm({ section: '', visible: false });
                            } catch (error) {
                              console.error('Error adding video:', error);
                            }
                          }
                        }}
                        disabled={!contentAddFormData.title.trim() || !contentAddFormData.content.trim()}
                      >
                        Add
                      </button>
                      <button
                        className="add-form-cancel"
                        onClick={() => setShowContentAddForm({ section: '', visible: false })}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        );
      case "driveResources":
        const hasDriveResources = contentData.driveResources && contentData.driveResources.length > 0;
        return (
          <section className="section" key="driveResources">
            <div className="section-header">
              <h2 className="section-title resources-section-title">Presentation & Resources</h2>
              {isAdmin && hasDriveResources && (
                <button
                  className="section-delete-btn"
                  onClick={async () => {
                    try {
                      // Delete all drive resources for this subtopic
                      if (!selectedSubtopic) return;
                      const contentItems = await getSubtopicContent(parseInt(selectedSubtopic.id));
                      const driveItems = contentItems.data.filter((item: any) => item.contentType === 'drive');
                      for (const item of driveItems) {
                        await deleteSubtopicContent(item.id);
                      }
                      loadContentData();
                    } catch (error) {
                      console.error('Error deleting drive resources:', error);
                    }
                  }}
                  title="Delete all resources"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              )}
            </div>
            <div className="drive-resources-container">
              {contentData.driveResources && Array.isArray(contentData.driveResources) && contentData.driveResources.map((res: any, index: number) => {
                const isOpen = openResources.has(res.id);
                // FIX: PDF DETECTION - Infer from URL extension (most reliable)
                // ❌ Don't rely on backend metadata that might be wrong
                // ✅ Check if URL ends with .pdf
                const isPdf = res.url?.toLowerCase().endsWith('.pdf') || false;

                return (
                  <div className="resource-item" key={index}>
                    {!isOpen ? (
                      // Preview mode - clickable to open
                      <div
                        className="resource-preview"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // On mobile, for PDFs: open directly in native PDF viewer
                          if (isMobile() && isPdf) {
                            const embeddedUrl = getEmbeddedUrl(res.url, isPdf);
                            window.open(embeddedUrl, '_blank', 'noopener,noreferrer');
                            return;
                          }
                          // On mobile, for PPTs: open with Google Docs/Drive viewer (OS may offer to open Slides app)
                          if (isMobile() && !isPdf) {
                            const embeddedUrl = getEmbeddedUrl(res.url, isPdf);
                            window.open(embeddedUrl, '_blank', 'noopener,noreferrer');
                            return;
                          }
                          // On desktop, open inline first
                          setLoadingResources(prev => new Set([...prev, res.id]));
                          setOpenResources(prev => new Set([...prev, res.id]));
                        }}
                      >
                        <div className="resource-preview-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10,9 9,9 8,9"/>
                          </svg>
                        </div>
                        <div className="resource-preview-content">
                          <h3 className="resource-preview-title">
                            {res.title || (isPdf ? 'PDF Document' : 'Presentation')}
                          </h3>
                          <p className="resource-preview-desc">
                            Click to view {isPdf ? 'PDF document' : 'presentation slides'}
                          </p>
                        </div>
                        <div className="resource-preview-arrow">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6"/>
                          </svg>
                        </div>
                      </div>
                    ) : (
                      // Open mode - show iframe with close option
                      <>
                        <div className="resource-item-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                            {res.title && <h3 className="resource-title">{res.title}</h3>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {isAdmin && (
                              <button
                                className="resource-delete-btn"
                                onClick={async () => {
                                  try {
                                    await deleteSubtopicContent(res.id);
                                    loadContentData();
                                  } catch (error) {
                                    console.error('Error deleting resource:', error);
                                  }
                                }}
                                title="Delete resource"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                              </button>
                            )}
                            <div className="resource-close-btn-container">
                              <button
                                className="resource-fullscreen-btn"
                                onClick={() => {
                                  setPlayingVideos({}); // Pause all videos when entering resource fullscreen
                                  // Exit fullscreen and unlock orientation for mobile
                                  handlePauseVideo();
                                  setLoadingResources(prev => new Set([...prev, res.id])); // Show loading for fullscreen
                                  setFullscreenResource(res.id);
                                }}
                                title="Fullscreen (Alt+S)"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                                </svg>
                              </button>
                              <button
                                className="resource-close-btn"
                                onClick={() => {
                                  setOpenResources(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(res.id);
                                    return newSet;
                                  });
                                }}
                                title="Alt+X"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <line x1="18" y1="6" x2="6" y2="18"/>
                                  <line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="resource-frame-wrapper">
                          {loadingResources.has(res.id) && (
                            <div className="resource-loading">
                              <div className="resource-loading-spinner"></div>
                              <span className="resource-loading-text">Loading resource...</span>
                            </div>
                          )}
                          {(() => {
                            const embeddedUrl = getEmbeddedUrl(res.url, isPdf);
                            return (
                              <div>
                                <iframe
                                  className="resource-frame"
                                  src={embeddedUrl}
                                  allow="autoplay"
                                  title={res.title}
                                  onLoad={() => setLoadingResources(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(res.id);
                                    return newSet;
                                  })}
                                  onError={(e) => {
                                    // Fallback: Try direct iframe with original URL
                                    const iframe = e.target as HTMLIFrameElement;
                                    iframe.src = res.url;
                                  }}
                                  style={{
                                    opacity: loadingResources.has(res.id) ? 0 : 1,
                                    transition: 'opacity 0.3s ease-in-out'
                                  }}
                                />
                              </div>
                            );
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {/* Add Content Button for Admin - always show for admins */}
              {isAdmin && (
                <div className="content-add-section">
                  {!showContentAddForm.visible || showContentAddForm.section !== 'driveResources' ? (
                    <button
                      className={`content-add-btn ${addResourceStatus === 'success' ? 'success' : addResourceStatus === 'error' ? 'error' : ''}`}
                      onClick={() => {
                        setShowContentAddForm({ section: 'driveResources', visible: true });
                        setContentAddFormData({ contentType: 'drive', title: '', content: '', resourceType: 'ppt', contentFormat: 'normal' });
                        setAddResourceStatus('idle'); // Reset status when opening form
                      }}
                      disabled={addResourceStatus === 'loading'}
                    >
                      {addResourceStatus === 'loading' && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="loading-spinner">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="31.416" strokeDashoffset="31.416">
                            <animate attributeName="stroke-dashoffset" values="31.416;0" dur="1s" repeatCount="indefinite"/>
                          </circle>
                        </svg>
                      )}
                      {addResourceStatus === 'success' && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                      {addResourceStatus === 'error' && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="15" y1="9" x2="9" y2="15"/>
                          <line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                      )}
                      {addResourceStatus === 'idle' && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 5v14M5 12h14"/>
                        </svg>
                      )}
                      {addResourceStatus === 'loading' ? 'Adding...' :
                       addResourceStatus === 'success' ? 'Success!' :
                       addResourceStatus === 'error' ? 'Try Again' :
                       'Add Resource'}
                    </button>
                  ) : (
                    <div className="content-add-form">
                      <div className="add-form-row">
                        <input
                          type="text"
                          placeholder="Resource Title"
                          value={contentAddFormData.title}
                          onChange={(e) => setContentAddFormData({...contentAddFormData, title: e.target.value})}
                          className="content-form-input"
                        />
                      </div>
                      <div className="add-form-row">
                        <select
                          value={contentAddFormData.resourceType}
                          onChange={(e) => setContentAddFormData({...contentAddFormData, resourceType: e.target.value})}
                          className="content-form-select"
                        >
                          <option value="ppt">PowerPoint Presentation (PPT)</option>
                          <option value="pdf">PDF Document</option>
                        </select>
                      </div>
                      <div className="add-form-row">
                        <input
                          type="url"
                          placeholder="Resource URL (Google Drive link)"
                          value={contentAddFormData.content}
                          onChange={(e) => setContentAddFormData({...contentAddFormData, content: e.target.value})}
                          className="content-form-input"
                        />
                      </div>
                      <div className="add-form-buttons">
                        <button
                          className={`add-form-submit ${addResourceStatus === 'success' ? 'success' : addResourceStatus === 'error' ? 'error' : ''}`}
                          onClick={handleAddResource}
                          disabled={!contentAddFormData.title.trim() || !contentAddFormData.content.trim() || addResourceStatus === 'loading'}
                        >
                          {addResourceStatus === 'loading' && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="loading-spinner">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="31.416" strokeDashoffset="31.416">
                                <animate attributeName="stroke-dashoffset" values="31.416;0" dur="1s" repeatCount="indefinite"/>
                              </circle>
                            </svg>
                          )}
                          {addResourceStatus === 'success' && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                          {addResourceStatus === 'error' && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/>
                              <line x1="15" y1="9" x2="9" y2="15"/>
                              <line x1="9" y1="9" x2="15" y2="15"/>
                            </svg>
                          )}
                          {addResourceStatus === 'loading' ? 'Adding...' :
                           addResourceStatus === 'success' ? 'Added!' :
                           addResourceStatus === 'error' ? 'Failed' :
                           'Add'}
                        </button>
                        <button
                          className="add-form-cancel"
                          onClick={() => setShowContentAddForm({ section: '', visible: false })}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        );
      case "notes":
        const hasNotes = contentData.notes && contentData.notes.trim() !== "";
        return (
          <section className="section notes" key="notes">
            <div className="section-header">
              <h2 className="section-title">Understanding the Concept</h2>
              {isAdmin && hasNotes && (
                <button
                  className="section-delete-btn"
                  onClick={async () => {
                    try {
                      // Delete all notes for this subtopic
                      if (!selectedSubtopic) return;
                      const contentItems = await getSubtopicContent(parseInt(selectedSubtopic.id));
                      const notesItems = contentItems.data.filter((item: any) => item.contentType === 'notes');
                      for (const item of notesItems) {
                        await deleteSubtopicContent(item.id);
                      }
                      loadContentData();
                    } catch (error) {
                      console.error('Error deleting notes:', error);
                    }
                  }}
                  title="Delete all notes"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              )}
            </div>
            <div className="notes-container centered-content" ref={notesRef}>
              {contentData.notesItems && contentData.notesItems.length > 0 ? (
                contentData.notesItems.map((noteItem: any) => (
                  <div key={noteItem.id} className="note-item-wrapper">
                    {isAdmin && (
                      <button
                        className="note-delete-btn"
                        onClick={async () => {
                          try {
                            await deleteSubtopicContent(noteItem.id);
                            loadContentData();
                          } catch (error) {
                            console.error('Error deleting note:', error);
                          }
                        }}
                        title="Delete note"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    )}
                    <div className="note-content">{renderMarkdown(noteItem.content, noteItem.metadata?.format || 'normal')}</div>
                  </div>
                ))
              ) : (
                renderMarkdown(contentData.notes || '', contentData.notesMetadata?.format || 'normal')
              )}
            </div>

            {/* Add Content Button for Admin - always show for admins */}
            {isAdmin && (
              <div className="content-add-section">
                {!showContentAddForm.visible || showContentAddForm.section !== 'notes' ? (
                  <button
                    className="content-add-btn"
                    onClick={() => {
                      setShowContentAddForm({ section: 'notes', visible: true });
                      setContentAddFormData({ contentType: 'notes', title: '', content: '', resourceType: '', contentFormat: 'normal' });
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                    Add Notes
                  </button>
                ) : (
                  <div className="content-add-form">
                    <div className="add-form-row">
                      <input
                        type="text"
                        placeholder="Notes Title"
                        value={contentAddFormData.title}
                        onChange={(e) => setContentAddFormData({...contentAddFormData, title: e.target.value})}
                        className="content-form-input"
                      />
                      <textarea
                        placeholder="Notes Content"
                        value={contentAddFormData.content}
                        onChange={(e) => setContentAddFormData({...contentAddFormData, content: e.target.value})}
                        className="content-form-textarea"
                        rows={4}
                      />
                      <div className="content-format-selector">
                        <label>Content Format:</label>
                        <select
                          value={contentAddFormData.contentFormat}
                          onChange={(e) => setContentAddFormData({...contentAddFormData, contentFormat: e.target.value as 'normal' | 'math' | 'code'})}
                          className="content-form-select"
                        >
                          <option value="normal">Normal (ChatGPT-style formatting)</option>
                          <option value="math">Math (LaTeX/MathJax rendering)</option>
                          <option value="code">Code/Algorithm</option>
                        </select>
                      </div>
                    </div>
                    <div className="add-form-buttons">
                      <button
                        className="add-form-submit"
                        onClick={async () => {
                          if (selectedSubtopic) {
                            try {
                              // For code format, content is handled specially by renderer
                              const processedContent = contentAddFormData.content;

                              await createSubtopicContent(parseInt(selectedSubtopic.id), {
                                contentType: 'notes',
                                contentOrder: 1,
                                title: contentAddFormData.title,
                                content: processedContent,
                                metadata: { format: contentAddFormData.contentFormat }
                              });
                              // Refresh content
                              loadContentData();
                              setShowContentAddForm({ section: '', visible: false });
                            } catch (error) {
                              console.error('Error adding content:', error);
                            }
                          }
                        }}
                        disabled={!contentAddFormData.title.trim() || !contentAddFormData.content.trim()}
                      >
                        Add
                      </button>
                      <button
                        className="add-form-cancel"
                        onClick={() => setShowContentAddForm({ section: '', visible: false })}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        );
      case "questions":
        const hasQuestions = contentData.questions && contentData.questions.length > 0;
        return (
          <section className="section" key="questions">
            <div className="section-header">
              <h2 className="section-title">Practice Questions</h2>
              {isAdmin && hasQuestions && (
                <button
                  className="section-delete-btn"
                  onClick={async () => {
                    try {
                      // Delete all questions for this subtopic
                      if (!selectedSubtopic) return;
                      const contentItems = await getSubtopicContent(parseInt(selectedSubtopic.id));
                      const questionItems = contentItems.data.filter((item: any) => item.contentType === 'question');
                      for (const item of questionItems) {
                        await deleteSubtopicContent(item.id);
                      }
                      loadContentData();
                    } catch (error) {
                      console.error('Error deleting questions:', error);
                    }
                  }}
                  title="Delete all questions"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              )}
            </div>
            <div className="questions-widget">
              <div className="qa-widget-list">
                {contentData.questions && Array.isArray(contentData.questions) && contentData.questions.map((q: any, index: number) => (
                  <div className="qa-widget-item" key={index}>
                    {isAdmin && (
                      <button
                        className="qa-delete-btn"
                        onClick={async () => {
                          try {
                            await deleteSubtopicContent(q.id);
                            loadContentData();
                          } catch (error) {
                            console.error('Error deleting question:', error);
                          }
                        }}
                        title="Delete question"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    )}
                    <details className="qa-widget-details">
                      <summary className="qa-widget-question">
                        <div className="question-content">
                          <span className="question-number">{index + 1}.</span>
                          <span className="question-text">
                            <div className="notes-container">
                              {renderMarkdown(q.question, 'normal')}
                            </div>
                          </span>
                        </div>
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="dropdown-arrow"
                        >
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </summary>
                      <div className="qa-widget-answer">
                        <div className="notes-container">
                          {renderMarkdown(q.answer, q.metadata?.format || 'normal')}
                        </div>
                      </div>
                    </details>
                  </div>
                ))}
              </div>

              {/* Add Q&A Button for Admin - always show for admins */}
              {isAdmin && (
                <div className="content-add-section">
                  {!showContentAddForm.visible || showContentAddForm.section !== 'questions' ? (
                    <button
                      className="content-add-btn"
                      onClick={() => {
                        setShowContentAddForm({ section: 'questions', visible: true });
                        setContentAddFormData({ contentType: 'question', title: '', content: '', resourceType: '', contentFormat: 'normal' });
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <path d="M12 17h.01"></path>
                      </svg>
                      Add Q&A
                    </button>
                  ) : (
                    <div className="content-add-form">
                      <div className="add-form-row">
                        <input
                          type="text"
                          placeholder="Question"
                          value={contentAddFormData.title}
                          onChange={(e) => setContentAddFormData({...contentAddFormData, title: e.target.value})}
                          className="content-form-input"
                        />
                        <textarea
                          placeholder="Answer"
                          value={contentAddFormData.content}
                          onChange={(e) => setContentAddFormData({...contentAddFormData, content: e.target.value})}
                          className="content-form-textarea"
                          rows={4}
                        />
                        <div className="content-format-selector">
                          <label>Content Format:</label>
                          <select
                            value={contentAddFormData.contentFormat}
                            onChange={(e) => setContentAddFormData({...contentAddFormData, contentFormat: e.target.value as 'normal' | 'math' | 'code'})}
                            className="content-form-select"
                          >
                            <option value="normal">Normal (ChatGPT-style formatting)</option>
                            <option value="math">Math (LaTeX/MathJax rendering)</option>
                            <option value="code">Code/Algorithm</option>
                          </select>
                        </div>
                      </div>
                      <div className="add-form-buttons">
                        <button
                          className="add-form-submit"
                          onClick={async () => {
                            if (selectedSubtopic) {
                              try {
                                // For code format, answer is handled specially by renderer
                                const processedAnswer = contentAddFormData.content;

                                await createSubtopicContent(parseInt(selectedSubtopic.id), {
                                  contentType: 'question', // Backend expects 'question' not 'questions'
                                  contentOrder: 1,
                                  title: contentAddFormData.title, // Question goes in title
                                  content: '', // Empty content
                                  metadata: {
                                    answer: processedAnswer,
                                    format: contentAddFormData.contentFormat
                                  } // Answer and format go in metadata
                                });
                                // Refresh content
                                loadContentData();
                                setShowContentAddForm({ section: '', visible: false });
                              } catch (error) {
                                console.error('Error adding content:', error);
                              }
                            }
                          }}
                          disabled={!contentAddFormData.title.trim() || !contentAddFormData.content.trim()}
                        >
                          Add
                        </button>
                        <button
                          className="add-form-cancel"
                          onClick={() => setShowContentAddForm({ section: '', visible: false })}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        );
      default: return null;
    }
  };

  // Render fullscreen resource if one is selected
  // HARD GUARD: Prevent recursive ContentView rendering
  if (fullscreenResource) {
    const resources = contentData?.driveResources || [];
    const currentIndex = resources.findIndex((res: any) => res.id === fullscreenResource);
    const resource = resources[currentIndex];

    // Safety check to prevent infinite recursion
    if (!resource) {
      console.error("Resource not found for fullscreen:", fullscreenResource);
      return null;
    }
    const hasMultipleResources = resources.length > 1;
    // FIX: PDF DETECTION - Infer from URL extension (most reliable)
    // ❌ Don't rely on backend metadata that might be wrong
    // ✅ Check if URL ends with .pdf
    const isPdf = resource?.url?.toLowerCase().endsWith('.pdf') || false;

    const navigateToResource = (direction: 'prev' | 'next') => {
      if (!hasMultipleResources) return;

      let newIndex;
      if (direction === 'prev') {
        newIndex = currentIndex > 0 ? currentIndex - 1 : resources.length - 1;
      } else {
        newIndex = currentIndex < resources.length - 1 ? currentIndex + 1 : 0;
      }

      setFullscreenResource(resources[newIndex].id);
    };

    if (resource) {
      return (
        <div className="resource-fullscreen-mode">
          <div className="resource-fullscreen-header">
            {hasMultipleResources && (
              <div className="resource-nav-buttons">
              <button
                className="resource-nav-btn resource-nav-prev"
                onClick={() => navigateToResource('prev')}
                title="Previous Resource"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
              <button
                className="resource-nav-btn resource-nav-next"
                onClick={() => navigateToResource('next')}
                title="Next Resource"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
              </div>
            )}
            <div className="resource-fullscreen-title">
              {resource.title || 'Resource'}
              {hasMultipleResources && (
                <span className="resource-counter">
                  {currentIndex + 1} of {resources.length}
                </span>
            )}
            </div>
            <button
              className="resource-fullscreen-exit-btn"
              onClick={() => setFullscreenResource(null)}
              title="Exit Fullscreen (Alt+S)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3M3 16h3a2 2 0 0 0 2 2v3"/>
              </svg>
            </button>
          </div>
          <div className="resource-fullscreen-content">
            {loadingResources.has(resource.id) && (
              <div className="resource-fullscreen-loading">
                <div className="resource-loading-spinner"></div>
                <span className="resource-loading-text">Loading resource...</span>
              </div>
            )}
            {(() => {
              const embeddedUrl = getEmbeddedUrl(resource.url, isPdf);
              return (
                <div>
                  <iframe
                    className="resource-fullscreen-iframe"
                    src={embeddedUrl}
                    allow="autoplay; fullscreen; presentation"
                    allowFullScreen
                    title={resource.title}
                    onLoad={() => setLoadingResources(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(resource.id);
                      return newSet;
                    })}
                    onError={(e) => {
                      // Fallback: Try direct iframe with original URL
                      const iframe = e.target as HTMLIFrameElement;
                      iframe.src = resource.url;
                    }}
                    style={{
                      opacity: loadingResources.has(resource.id) ? 0 : 1,
                      transition: 'opacity 0.3s ease-in-out'
                    }}
                  />
                </div>
              );
            })()}
          </div>
        </div>
      );
    }
  }

  return (
    <div className={`content-view login-style ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      {!isFullscreen && (
      <Header
        onMenuToggle={handleMenuToggle}
        onNavigate={handleNavigate}
        currentMode={mode}
        onModeChange={handleModeChange}
        onAdminToggle={() => setShowAdminPanel(!showAdminPanel)}
        onFullscreenToggle={handleFullscreenToggle}
        isFullscreen={isFullscreen}
        hasContent={!!contentData}
        sidebarCollapsed={sidebarCollapsed}
      />
      )}

      {/* Fullscreen Exit Button - Rendered via Portal to avoid fullscreen container interference */}
      {isFullscreen && createPortal(
        <button
          className="fullscreen-exit-btn"
          onClick={handleFullscreenToggle}
          title="Exit Fullscreen"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>,
        document.body
      )}

      {/* Google Slides Download Popup */}
      {showGoogleSlidesPopup && (
        <div className="modal-overlay" onClick={() => setShowGoogleSlidesPopup(false)}>
          <div className="modal-content google-slides-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Google Slides Required</h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowGoogleSlidesPopup(false)}
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="slides-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
              </div>
              <p>To view PowerPoint presentations, you need Google Slides installed on your device.</p>
              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setShowGoogleSlidesPopup(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={() => {
                    // Open Google Play/App Store for Google Slides
                    const userAgent = navigator.userAgent.toLowerCase();
                    if (userAgent.includes('android')) {
                      window.open('https://play.google.com/store/apps/details?id=com.google.android.apps.docs.editors.slides', '_blank');
                    } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
                      window.open('https://apps.apple.com/app/google-slides/id879478102', '_blank');
                    } else {
                      // Fallback for other devices
                      window.open('https://www.google.com/slides/about/', '_blank');
                    }
                    setShowGoogleSlidesPopup(false);
                  }}
                >
                  Download Google Slides
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {!isFullscreen && (() => {
        console.log('Calculating sidebar - selectedCourse:', selectedCourse, 'topics:', topics, 'courses:', courses);
        const sidebarMode = selectedTopic ? "subtopics" : selectedCourse ? "topics" : "courses";
        const sidebarItems = selectedTopic ? subtopics : selectedCourse ? topics : courses;
        console.log('Sidebar mode:', sidebarMode, 'Items count:', sidebarItems?.length || 0, 'Items:', sidebarItems);

        return (
          <Sidebar
            isCollapsed={sidebarCollapsed}
            mode={sidebarMode}
            items={sidebarItems}
            onItemClick={
              selectedTopic ? handleSubtopicClick :
              selectedCourse ? handleTopicClick :
              handleCourseClick
            }
            selectedItemId={
              selectedTopic
                ? (selectedSubtopic ? selectedSubtopic.id : undefined)
                : selectedCourse
                  ? selectedCourse.id
                  : undefined
            }
            onBackClick={
              selectedTopic ? handleBackToTopics :
              selectedCourse ? handleBackToCourses :
              undefined
            }
            topicName={selectedTopic ? selectedTopic.name : undefined}
            courseName={selectedCourse ? selectedCourse.name : undefined}
            isLoading={
              (selectedTopic ? isLoadingSubtopics :
               selectedCourse ? isLoadingTopics :
               isLoadingCourses)
            }
            onDeleteItem={isAdmin ? handleDeleteItem : undefined}
            onEditItem={isAdmin ? handleEditSubtopic : undefined}
            onAddItem={isAdmin ? handleAddItem : undefined}
            showAddForm={showAddForm}
            addFormData={addFormData}
            onAddFormChange={setAddFormData}
            onAddSubmit={handleAddSubmit}
            onCancelAdd={() => setShowAddForm({ mode: '', visible: false })}
            onCloseSidebar={() => setSidebarCollapsed(true)}
          />
        );
      })()}


      <div className={`content-main ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${selectedSubtopic ? "scroll-enabled" : "scroll-disabled"}`}>
        {selectedSubtopic && (
          <div className="content-header">
            <h1 className="fade-in">{selectedSubtopic.name}</h1>
          </div>
        )}
        {!contentData && selectedSubtopic && (
          <div className="content-loading section-loading">
            <div className="section-loading-spinner"></div>
            <span className="section-loading-text">Loading content...</span>
          </div>
        )}
        {!selectedSubtopic && (
          <div className="content-placeholder">
            <h2>Select a Course to Start Learning</h2>
            <p>Choose a course from the sidebar to explore topics and detailed content.</p>
            <div className="placeholder-steps">
              <div className="step">
                <span className="step-number">1</span>
                <span>Select a course from the sidebar</span>
              </div>
              <div className="step">
                <span className="step-number">2</span>
                <span>Choose a topic to explore</span>
              </div>
              <div className="step">
                <span className="step-number">3</span>
                <span>Select a subtopic for content</span>
              </div>
              <div className="step">
                <span className="step-number">4</span>
                <span>Access videos, notes, and practice questions</span>
              </div>
            </div>
          </div>
        )}
        {contentData && Array.isArray(sectionsOrder()) && sectionsOrder().map((section) => renderSection(section))}

        {/* Admin Panel - Only show for admin users */}
        {isAdmin && showAdminPanel && (
          <div className="admin-panel">
            <div className="admin-panel-header">
              <h3>Admin Panel</h3>
              <button
                className="admin-close-btn"
                onClick={() => setShowAdminPanel(false)}
              >
                ✕
              </button>
            </div>

            <div className="admin-tabs">
              {['colleges', 'departments', 'semesters'].map((tab) => (
                <button
                  key={tab}
                  className={`admin-tab ${adminMode === tab ? 'active' : ''}`}
                  onClick={() => setAdminMode(tab as any)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div className="admin-content">
              {adminMode === 'colleges' && (
                <div className="admin-form">
                  <h4>Add College</h4>
                  <input
                    type="text"
                    placeholder="College Name"
                    value={adminFormData.name}
                    onChange={(e) => setAdminFormData({...adminFormData, name: e.target.value})}
                  />
                  <button className="admin-submit-btn" onClick={handleAdminSubmit}>Add College</button>
                </div>
              )}

              {adminMode === 'departments' && (
                <div className="admin-form">
                  <h4>Add Department</h4>
                  <select
                    value={adminFormData.collegeId}
                    onChange={(e) => setAdminFormData({...adminFormData, collegeId: e.target.value})}
                  >
                    <option value="">Select College</option>
                    {Array.isArray(adminColleges) && adminColleges.map((college: any) => (
                      <option key={college.id} value={college.id}>
                        {college.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Department Name"
                    value={adminFormData.name}
                    onChange={(e) => setAdminFormData({...adminFormData, name: e.target.value})}
                  />
                  <button className="admin-submit-btn" onClick={handleAdminSubmit}>Add Department</button>
                </div>
              )}

              {adminMode === 'semesters' && (
                <div className="admin-form">
                  <h4>Add Semester</h4>
                  <select
                    value={adminFormData.collegeId}
                    onChange={(e) => setAdminFormData({...adminFormData, collegeId: e.target.value, departmentId: ''})}
                  >
                    <option value="">Select College First</option>
                    {Array.isArray(adminColleges) && adminColleges.map((college: any) => (
                      <option key={college.id} value={college.id}>
                        {college.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={adminFormData.departmentId}
                    onChange={(e) => setAdminFormData({...adminFormData, departmentId: e.target.value})}
                    disabled={!adminFormData.collegeId}
                  >
                    <option value="">
                      {adminFormData.collegeId ? 'Select Department' : 'Select College First'}
                    </option>
                    {Array.isArray(adminDepartments) && adminDepartments.map((department: any) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Semester Name (e.g SEMESTER 1)"
                    value={adminFormData.name}
                    onChange={(e) => setAdminFormData({...adminFormData, name: e.target.value})}
                  />
                  <button className="admin-submit-btn" onClick={handleAdminSubmit}>Add Semester</button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div> 
  );
};

export default ContentView;

