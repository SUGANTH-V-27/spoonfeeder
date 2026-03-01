import { Request, Response } from "express";
import pool from "../db/connection";
import { bumpGlobalCacheVersion } from "../services/cacheVersion";

export const getTopics = async(req: Request, res: Response) => {
  try{
  const courseIdParam = req.query.courseId;
  const collegeParam = req.query.college;
  const departmentParam = req.query.department;
  const semesterParam = req.query.semester;

  if (courseIdParam) {
    // Get topics by courseId (existing functionality)
    const courseId = parseInt(courseIdParam as string, 10);
    if (isNaN(courseId)) {
      return res.status(400).json({ error: "courseId must be a number" });
    }

    const result = await pool.query(
      "SELECT id,course_id as \"courseId\",name FROM topics WHERE course_id = $1 ORDER BY id",
      [courseId]
    );
    return res.json(result.rows);
  } else if (collegeParam && departmentParam && semesterParam) {
    // Get topics by college/department/semester (new functionality for frontend compatibility)
    const result = await pool.query(`
      SELECT t.id, t.course_id as "courseId", t.name
      FROM topics t
      JOIN courses c ON t.course_id = c.id
      JOIN semesters s ON c.semester_id = s.id
      JOIN departments d ON s.department_id = d.id
      JOIN colleges col ON d.college_id = col.id
      WHERE col.name = $1 AND d.name = $2 AND s.name = $3
      ORDER BY t.id
    `, [collegeParam, departmentParam, semesterParam]);

    return res.json(result.rows);
  } else {
    return res
      .status(400)
      .json({ error: "Either courseId or college+department+semester parameters are required" });
  }
  }catch(err)
  {
    console.error("Error fetching topics:",err);
    res.status(500).json({error:"Internal server error"});
  }
};

// POST /api/topics  body: { "name": "...", "courseId": 1 }
export const addTopic = async(req: Request, res: Response) => {
  try{
  const { name, courseId } = req.body;

  if (!name || !courseId) {
    return res
      .status(400)
      .json({ error: "Both name and courseId are required" });
  }

  const newTopic = await pool.query(
    "INSERT INTO topics (name,course_id) VALUES ($1,$2) RETURNING id,course_id as \"courseId\", name",
    [name,courseId]
  );
  // Topics affect hierarchy/content, bump global cache version
  await bumpGlobalCacheVersion();
  return res.status(201).json(newTopic.rows[0]);
  }
  catch(err)
  {
    console.error("Error adding topics:",err);
    res.status(500).json({error:"Internal server error"});
  }
};

export const deleteTopic = async(req: Request, res: Response) => {
  try{
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Topic ID is required" });
    }

  const result = await pool.query(
      "DELETE FROM topics WHERE id = $1 RETURNING id, name",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Topic not found" });
    }

  // Topics affect hierarchy/content, bump global cache version
  await bumpGlobalCacheVersion();
  res.json({ message: "Topic deleted successfully", topic: result.rows[0] });
  }catch(error){
    console.error("Error deleting topic");
    res.status(500).json({error:"Internal server error"});
  }
};