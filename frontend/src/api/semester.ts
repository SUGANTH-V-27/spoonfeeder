import api from "./api";

// Get all semesters
export const getSemesters = () => api.get("/semesters");

// Get semesters by departmentId
export const getSemestersByDepartment = (departmentId: number) =>
  api.get(`/semesters?departmentId=${departmentId}`);

// Get semesters by department and college IDs
export const getSemestersByIds = (departmentId: number, collegeId: number) =>
  api.get(`/semesters?departmentId=${departmentId}&collegeId=${collegeId}`);

// Create a semester
export const createSemester = (name: string, departmentId: number) =>
  api.post("/semesters", { name, departmentId });

// Delete a semester
export const deleteSemester = (id: number) =>
  api.delete(`/semesters/${id}`);