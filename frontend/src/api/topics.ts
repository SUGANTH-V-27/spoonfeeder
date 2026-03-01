import api from "./api";
import { invalidateCache, invalidateCachePattern } from "../utils/cacheManager";

// Get topics by courseId
export const getTopics = (courseId: number) =>
  api.get(`/topics?courseId=${courseId}`);

// Get topics by college/department/semester (for frontend compatibility)
export const getTopicsByHierarchy = (college: string, department: string, semester: string) =>
  api.get('/topics', {
    params: { college, department, semester }
  });

// Create a new topic
export const createTopic = (name: string, courseId: number) =>
  api.post("/topics", { name, courseId }).then(response => {
    // Invalidate topic cache for this course when new topic is created
    invalidateCache(`topics_cache_${courseId}`);
    return response;
  });

// Update a topic
export const updateTopic = (id: number, name: string, courseId: number) =>
  api.put(`/topics/${id}`, { name, courseId }).then(response => {
    // Invalidate topic cache for the course when topic is updated
    invalidateCache(`topics_cache_${courseId}`);
    return response;
  });

// Delete a topic
export const deleteTopic = (id: number) =>
  api.delete(`/topics/${id}`).then(response => {
    // Invalidate topic caches - we don't know which course this topic belonged to
    // so we invalidate all topic caches (admin operation, so it's acceptable)
    invalidateCachePattern(`topics_cache_`);
    invalidateCachePattern(`subtopics_cache_`); // Subtopics are affected
    return response;
  });