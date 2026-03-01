import { Response,Request } from "express";
import pool from "../db/connection";
import { bumpGlobalCacheVersion } from "../services/cacheVersion";

  export const getCourse = async(req: Request, res: Response) => {
    try{
    const semesterIdParam = req.query.semesterId;
    if (!semesterIdParam) {
      return res.status(400).json({ error: "semesterId query parameter is required" });
    }

    const semesterId = parseInt(semesterIdParam as string, 10);
    if (isNaN(semesterId)) {
      return res.status(400).json({ error: "semesterId must be a number" });
    }

    const result = await pool.query(
      "SELECT id,semester_id as \"semesterId\",name FROM courses WHERE semester_id = $1 ORDER BY id",
      [semesterId]
    );
    return res.json(result.rows);
  }catch(err)
  {
    console.error("Error fetching courses:",err);
    res.status(500).json({error:"Internal server error"});
  }
  };
  export const addCourse = async (req: Request, res: Response) => {
    try{
    const { name, semesterId } = req.body;
    // 1) Validate required fields
    if (!name || !semesterId) {
      return res
        .status(400)
        .json({ error: "Both name and semesterId are required" });
    }
  
    // 2) Build the new course/subject object
    const newCourse = await pool.query(
      "INSERT INTO courses (name,semester_id) VALUES ($1,$2) RETURNING id,semester_id as \"semesterId\", name",
      [name,semesterId]
    );
    // Courses affect hierarchy, bump global cache version
    await bumpGlobalCacheVersion();
    return res.status(201).json(newCourse.rows[0]);
  }catch(err)
  {
    console.error("Error adding courses:",err);
    res.status(500).json({error:"Internal server error"});
  }
  };

export const deleteCourse = async(req: Request, res: Response) => {
  try{
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Course ID is required" });
    }

    const result = await pool.query(
      "DELETE FROM courses WHERE id = $1 RETURNING id, name",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Courses affect hierarchy, bump global cache version
    await bumpGlobalCacheVersion();
    res.json({ message: "Course deleted successfully", course: result.rows[0] });
  }catch(error){
    console.error("Error deleting course");
    res.status(500).json({error:"Internal server error"});
  }
};