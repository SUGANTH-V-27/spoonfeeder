import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getCourses } from '../api/courses';
import { getTopics } from '../api/topics';
import { getSubtopics, getSubtopicContent } from '../api/subtopics';
import { useAuth } from '../context/AuthContext';

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
  const { isAdmin } = useAuth();
  const [hierarchy, setHierarchy] = useState<HierarchyData | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState<Subtopic | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);

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
        console.log('loadCourses - Fetching courses for semester ID:', hierarchy.semesterId);
        const response = await getCourses(hierarchy.semesterId);
        console.log('loadCourses - Courses received:', response.data);
        
        // Transform API response to include label field for Sidebar compatibility
        const transformedCourses = response.data.map((course: any) => ({
          ...course,
          label: course.name || course.label,
          id: course.id.toString()
        }));
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
    // Skip cache for admin users to ensure instant updates
    if (!isAdmin) {
      // Check sessionStorage cache first (only for non-admin users)
      try {
        const cacheKey = `topics_cache_${courseId}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const cachedTopics = JSON.parse(cached);
          setTopics(cachedTopics);
          return;
        }
      } catch (error) {
        console.error('Error reading topics from cache:', error);
      }
    }

    // If not in cache or admin user, fetch from API
    try {
      const response = await getTopics(parseInt(courseId));
      // Transform API response to include label field for Sidebar compatibility
      const transformedTopics = response.data.map((topic: any) => ({
        ...topic,
        label: topic.name || topic.label,
        id: topic.id.toString()
      }));

      // Store in sessionStorage cache only for non-admin users
      if (!isAdmin) {
        try {
          const cacheKey = `topics_cache_${courseId}`;
          sessionStorage.setItem(cacheKey, JSON.stringify(transformedTopics));
        } catch (error) {
          console.error('Error writing topics to cache:', error);
        }
      }

      console.log('HierarchyContext - Setting topics:', transformedTopics);
      setTopics(transformedTopics);
      console.log('HierarchyContext - Topics set, current topics state should be:', transformedTopics);
    } catch (error) {
      console.error('Failed to load topics:', error);
      setTopics([]);
    }
  };

  const loadSubtopics = async (topicId: string) => {
    // Skip cache for admin users to ensure instant updates
    if (!isAdmin) {
      // Check sessionStorage cache first (only for non-admin users)
      try {
        const cacheKey = `subtopics_cache_${topicId}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const cachedSubtopics = JSON.parse(cached);
          setSubtopics(cachedSubtopics);
          return;
        }
      } catch (error) {
        console.error('Error reading subtopics from cache:', error);
      }
    }

    // If not in cache or admin user, fetch from API
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

      // Store in sessionStorage cache only for non-admin users
      if (!isAdmin) {
        try {
          const cacheKey = `subtopics_cache_${topicId}`;
          sessionStorage.setItem(cacheKey, JSON.stringify(transformedSubtopics));
        } catch (error) {
          console.error('Error writing subtopics to cache:', error);
        }
      }

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
    if (isAdmin) {
      try {
        const cacheKey = `topics_cache_${courseId}`;
        sessionStorage.removeItem(cacheKey);
      } catch (error) {
        console.error('Error clearing topic cache:', error);
      }
    }
  };

  const clearSubtopicCache = (topicId: string) => {
    if (isAdmin) {
      try {
        const cacheKey = `subtopics_cache_${topicId}`;
        sessionStorage.removeItem(cacheKey);
      } catch (error) {
        console.error('Error clearing subtopic cache:', error);
      }
    }
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
