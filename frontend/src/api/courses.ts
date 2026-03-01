import api from "./api";
import { invalidateCachePattern } from "../utils/cacheManager";

// Get courses by semesterId
export const getCourses = (semesterId: number) =>
  api.get(`/courses?semesterId=${semesterId}`);

// Get all courses (admin)
export const getAllCourses = () => api.get("/courses");

// Create a new course
export const createCourse = (name: string, semesterId: number) =>
  api.post("/courses", { name, semesterId }).then(response => {
    // Invalidate course cache for this semester when new course is created
    invalidateCachePattern(`courses_cache_${semesterId}`);
    return response;
  });

// Update a course
export const updateCourse = (id: number, name: string) =>
  api.put(`/courses/${id}`, { name }).then(response => {
    // Invalidate course-related caches when course is updated
    invalidateCachePattern(`courses_cache_`);
    invalidateCachePattern(`topics_cache_`); // Topics might be affected
    return response;
  });

// Delete a course
export const deleteCourse = (id: number) =>
  api.delete(`/courses/${id}`).then(response => {
    // Invalidate course-related caches when course is deleted
    invalidateCachePattern(`courses_cache_`);
    invalidateCachePattern(`topics_cache_${id}`); // Topics for this course
    invalidateCachePattern(`subtopics_cache_`); // All subtopics might be affected
    return response;
  });