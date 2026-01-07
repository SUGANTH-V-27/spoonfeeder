import { Router } from "express";
import { getHealth } from "../controllers/health";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/admin";
import { getColleges, addCollege, deleteCollege } from "../controllers/colleges";
import { addDepartment, getDepartments, deleteDepartment } from "../controllers/department";
import { getsemesters, addSemester, deleteSemester } from "../controllers/semester";
import { getCourse, addCourse, deleteCourse } from "../controllers/course";
import { getTopics, addTopic, deleteTopic } from "../controllers/topics";
import { getSubtopics, addSubtopic, deleteSubtopic, updateSubtopic } from "../controllers/subtopics";
import { register, login, forgotPassword, resetPassword } from "../controllers/auth";
import { getSubtopicContent, addSubtopicContent, deleteSubtopicContent } from "../controllers/subtopicContent";

const router = Router();
router.get("/health", getHealth);


router.post("/auth/register", register);
router.post("/auth/login", login);
router.post("/auth/forgot-password", forgotPassword);
router.post("/auth/reset-password/:token", resetPassword);
router.get("/colleges", requireAuth, getColleges);
router.post("/colleges", requireAdmin, addCollege);
router.delete("/colleges/:id", requireAdmin, deleteCollege);
router.get("/departments", requireAuth, getDepartments);
router.post("/departments", requireAdmin, addDepartment);
router.delete("/departments/:id", requireAdmin, deleteDepartment);
router.get("/semesters", requireAuth, getsemesters);
router.post("/semesters", requireAdmin, addSemester);
router.delete("/semesters/:id", requireAdmin, deleteSemester);
router.get("/courses", requireAuth, getCourse);
router.post("/courses", requireAdmin, addCourse);
router.delete("/courses/:id", requireAdmin, deleteCourse);
router.get("/topics", requireAuth, getTopics);
router.post("/topics", requireAdmin, addTopic);
router.delete("/topics/:id", requireAdmin, deleteTopic);
router.get("/subtopics", requireAuth, getSubtopics);
router.post("/subtopics", requireAdmin, addSubtopic);
router.put("/subtopics/:id", requireAdmin, updateSubtopic);
router.delete("/subtopics/:id", requireAdmin, deleteSubtopic);
router.get("/subtopics/:subtopicId/content", requireAuth, getSubtopicContent);
router.post("/subtopics/:subtopicId/content", requireAdmin, addSubtopicContent);
router.delete("/subtopic-content/:id", requireAdmin, deleteSubtopicContent);

export { router as fullRouter };
