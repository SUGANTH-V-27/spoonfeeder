import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import api from '../api/api';
import { getCourses } from '../api/courses';
import { getTopics } from '../api/topics';
import { getSubtopics, getSubtopicContent } from '../api/subtopics';
import { getCachedData, setCachedData, invalidateCache, clearAllCache } from '../utils/cacheManager';

export interface HierarchyData {
  college: string;
  department: string;
  semester: string;
  collegeId: number | null;
  departmentId: number | null;
  semesterId: number | null;
}

export interface Topic {
  id: string;
  name: string;
  label: string; // Add label for compatibility with Sidebar
  description?: string;
}

export interface Course {
  id: string;
  name: string;
  label: string; // Add label for compatibility with Sidebar
  semesterId?: string;
}

export interface Subtopic {
  id: string;
  name: string;
  label: string; // Add label for compatibility with Sidebar
  description?: string;
  contentId?: string;
}

interface HierarchyContextType {
  hierarchy: HierarchyData | null;
  selectedCourse: Course | null;
  selectedTopic: Topic | null;
  selectedSubtopic: Subtopic | null;
  courses: Course[];
  topics: Topic[];
  subtopics: Subtopic[];
  setHierarchy: (hierarchy: HierarchyData) => void;
  setSelectedCourse: (course: Course | null) => void;
  setSelectedTopic: (topic: Topic | null) => void;
  setSelectedSubtopic: (subtopic: Subtopic | null) => void;
  loadCourses: () => Promise<void>;
  loadTopics: (courseId: string) => Promise<void>;
  loadSubtopics: (topicId: string) => Promise<void>;
  loadContent: (subtopicId: string) => Promise<any>;
  clearTopicCache: (courseId: string) => void;
  clearSubtopicCache: (topicId: string) => void;
}

const HierarchyContext = createContext<HierarchyContextType | undefined>(undefined);

export const useHierarchy = () => {
  const context = useContext(HierarchyContext);
  if (context === undefined) {
    throw new Error('useHierarchy must be used within a HierarchyProvider');
  }
  return context;
};

interface HierarchyProviderProps {
  children: ReactNode;
}

export const HierarchyProvider: React.FC<HierarchyProviderProps> = ({ children }) => {
  const [hierarchy, setHierarchy] = useState<HierarchyData | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState<Subtopic | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);

  // Global cache version check - ensures all devices invalidate their local
  // caches when an admin updates any hierarchy/content.
  useEffect(() => {
    const checkGlobalCacheVersion = async () => {
      try {
        const storedRaw = localStorage.getItem('cache_global_version');
        const storedVersion = storedRaw ? parseInt(storedRaw, 10) || 0 : 0;

        const response = await api.get('/cache-version');
        const serverVersion = Number(response.data?.version ?? 0);

        if (!Number.isFinite(serverVersion) || serverVersion <= 0) {
          return;
        }

        if (serverVersion > storedVersion) {
          console.log('Global cache version changed, clearing all local caches', {
            storedVersion,
            serverVersion,
          });
          // Clear all smart caches (courses/topics/subtopics/content) for this browser
          clearAllCache();
          localStorage.setItem('cache_global_version', serverVersion.toString());
        } else if (!storedVersion) {
          // First time we see a valid server version, just store it
          localStorage.setItem('cache_global_version', serverVersion.toString());
        }
      } catch (error) {
        console.error('Failed to check global cache version', error);
      }
    };

    checkGlobalCacheVersion();
  }, []);

  // Load hierarchy from localStorage on mount
  useEffect(() => {
    const savedHierarchy = localStorage.getItem('hierarchy');
    console.log('HierarchyContext - Loading from localStorage:', savedHierarchy);
    if (savedHierarchy) {
      const parsed = JSON.parse(savedHierarchy);
      console.log('HierarchyContext - Parsed hierarchy:', parsed);
      console.log('HierarchyContext - Semester value:', parsed.semester);
      setHierarchy(parsed);
    }
  }, []);

  const loadCourses = useCallback(async () => {
    if (!hierarchy) {
      console.log('loadCourses - No hierarchy available');
      return;
    }

    console.log('loadCourses - Current hierarchy:', hierarchy);
    console.log('loadCourses - Semester value:', hierarchy.semester);

    try {
      // Use the stored semester ID directly
      console.log('loadCourses - Using semester ID:', hierarchy.semesterId);

      if (hierarchy.semesterId) {
        const cacheKey = `courses_cache_${hierarchy.semesterId}`;

        // Check smart cache first
        const cachedCourses = getCachedData<any[]>(cacheKey);
        if (cachedCourses) {
          console.log('HierarchyContext - Loading courses from cache:', cachedCourses);
          setCourses(cachedCourses);
          return;
        }

        console.log('loadCourses - Fetching courses for semester ID:', hierarchy.semesterId);
        const response = await getCourses(hierarchy.semesterId);
        console.log('loadCourses - Courses received:', response.data);

        // Transform API response to include label field for Sidebar compatibility
        const transformedCourses = response.data.map((course: any) => ({
          ...course,
          label: course.name || course.label,
          id: course.id.toString()
        }));

        // Store in smart cache
        setCachedData(cacheKey, transformedCourses);

        console.log('loadCourses - Setting courses:', transformedCourses);
        setCourses(transformedCourses);
      } else {
        console.error('loadCourses - No semester ID available');
        setCourses([]);
      }
    } catch (error) {
      console.error('loadCourses - Failed to load courses:', error);
      setCourses([]);
    }
  }, [hierarchy]);

  const loadTopics = async (courseId: string) => {
    const cacheKey = `topics_cache_${courseId}`;

    // Check smart cache first (works for both admin and non-admin users)
    const cachedTopics = getCachedData<any[]>(cacheKey);
    if (cachedTopics) {
      console.log('HierarchyContext - Loading topics from cache:', cachedTopics);
      setTopics(cachedTopics);
      return;
    }

    // If not in cache, fetch from API
    try {
      const response = await getTopics(parseInt(courseId));
      // Transform API response to include label field for Sidebar compatibility
      const transformedTopics = response.data.map((topic: any) => ({
        ...topic,
        label: topic.name || topic.label,
        id: topic.id.toString()
      }));

      // Store in smart cache (works for both admin and non-admin users)
      setCachedData(cacheKey, transformedTopics);

      console.log('HierarchyContext - Setting topics:', transformedTopics);
      setTopics(transformedTopics);
      console.log('HierarchyContext - Topics set, current topics state should be:', transformedTopics);
    } catch (error) {
      console.error('Failed to load topics:', error);
      setTopics([]);
    }
  };

  const loadSubtopics = async (topicId: string) => {
    const cacheKey = `subtopics_cache_${topicId}`;

    // Check smart cache first (works for both admin and non-admin users)
    const cachedSubtopics = getCachedData<any[]>(cacheKey);
    if (cachedSubtopics) {
      console.log('HierarchyContext - Loading subtopics from cache:', cachedSubtopics);
      setSubtopics(cachedSubtopics);
      return;
    }

    // If not in cache, fetch from API
    try {
      // Clear previous subtopics first
      setSubtopics([]);
      const response = await getSubtopics(parseInt(topicId));
      // Transform API response to include label field for Sidebar compatibility
      const transformedSubtopics = response.data.map((subtopic: any) => ({
        ...subtopic,
        label: subtopic.name || subtopic.label,
        name: subtopic.name || subtopic.label,
        id: subtopic.id.toString()
      }));

      // Store in smart cache (works for both admin and non-admin users)
      setCachedData(cacheKey, transformedSubtopics);

      setSubtopics(transformedSubtopics);
    } catch (error) {
      console.error('Failed to load subtopics:', error);
      setSubtopics([]);
    }
  };

  const loadContent = async (subtopicId: string) => {
    try {
      const response = await getSubtopicContent(parseInt(subtopicId));
      return response.data;
    } catch (error) {
      console.error('Failed to load content:', error);
      // Return null instead of fallback data
      return null;
    }
  };

  const handleSetHierarchy = useCallback((newHierarchy: HierarchyData) => {
    console.log('Setting hierarchy to localStorage and state:', newHierarchy);
    // Update localStorage immediately
    localStorage.setItem('hierarchy', JSON.stringify(newHierarchy));
    // Update state
    setHierarchy(newHierarchy);
  }, []);

  // Load courses when hierarchy changes
  useEffect(() => {
    if (hierarchy) {
      loadCourses();
    } else {
      setCourses([]);
    }
  }, [hierarchy]); // Only depend on hierarchy, loadCourses is stable

  // Clear cache for admin users when they modify data
  const clearTopicCache = (courseId: string) => {
    const cacheKey = `topics_cache_${courseId}`;
    invalidateCache(cacheKey);
    console.log(`Admin cleared topic cache for course ${courseId}`);
  };

  const clearSubtopicCache = (topicId: string) => {
    const cacheKey = `subtopics_cache_${topicId}`;
    invalidateCache(cacheKey);
    console.log(`Admin cleared subtopic cache for topic ${topicId}`);
  };

  const value: HierarchyContextType = {
    hierarchy,
    selectedCourse,
    selectedTopic,
    selectedSubtopic,
    courses,
    topics,
    subtopics,
    setHierarchy: handleSetHierarchy,
    setSelectedCourse,
    setSelectedTopic,
    setSelectedSubtopic,
    loadCourses,
    loadTopics,
    loadSubtopics,
    loadContent,
    clearTopicCache,
    clearSubtopicCache,
  };

  console.log('HierarchyContext - Providing value with topics:', topics);

  return (
    <HierarchyContext.Provider value={value}>
      {children}
    </HierarchyContext.Provider>
  );
};
