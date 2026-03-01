import api from "./api";
import { invalidateCache, invalidateCachePattern } from "../utils/cacheManager";

// Get subtopics by topicId
export const getSubtopics = (topicId: number) =>
  api.get(`/subtopics?topicId=${topicId}`);

// Create a new subtopic
export const createSubtopic = (name: string, topicId: number) =>
  api.post("/subtopics", { name, topicId }).then(response => {
    // Invalidate subtopic cache for this topic when new subtopic is created
    invalidateCache(`subtopics_cache_${topicId}`);
    return response;
  });

// Delete a subtopic
export const deleteSubtopic = (id: number) =>
  api.delete(`/subtopics/${id}`).then(response => {
    // Invalidate subtopic caches - we don't know which topic this subtopic belonged to
    // so we invalidate all subtopic caches (admin operation, so it's acceptable)
    invalidateCachePattern(`subtopics_cache_`);
    return response;
  });

// Update a subtopic
export const updateSubtopic = (id: number, name: string, topicId?: number) =>
  api.put(`/subtopics/${id}`, { name }).then(response => {
    // Invalidate subtopic cache for the topic when subtopic is updated
    if (topicId) {
      invalidateCache(`subtopics_cache_${topicId}`);
    } else {
      // If topicId not provided, invalidate all subtopic caches
      invalidateCachePattern(`subtopics_cache_`);
    }
    return response;
  });

// Get subtopic content
export const getSubtopicContent = (subtopicId: number) =>
  api.get(`/subtopics/${subtopicId}/content`);

// Create subtopic content
export const createSubtopicContent = (subtopicId: number, contentData: any) =>
  api.post(`/subtopics/${subtopicId}/content`, contentData).then(response => {
    // Invalidate content cache when new content is created
    invalidateCache(`content_cache_${subtopicId}`);
    return response;
  });

// Update subtopic content
export const updateSubtopicContent = (id: number, contentData: any, subtopicId?: number) =>
  api.put(`/subtopic-content/${id}`, contentData).then(response => {
    // Invalidate content cache when content is updated
    if (subtopicId) {
      invalidateCache(`content_cache_${subtopicId}`);
    } else {
      invalidateCachePattern(`content_cache_`);
    }
    return response;
  });

// Delete subtopic content
export const deleteSubtopicContent = (id: number) =>
  api.delete(`/subtopic-content/${id}`).then(response => {
    // Invalidate content caches when content is deleted
    invalidateCachePattern(`content_cache_`);
    return response;
  });
