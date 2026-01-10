import { Request,Response } from "express";
import pool from "../db/connection";

// GET: Return all departments for a specific college (by ID or name)
export const getDepartments = async(_req:Request,res:Response) =>{
  try{
    const collegeIdParam = _req.query.collegeId as string;
    const collegeNameParam = _req.query.collegeName as string;

    let query: string;
    let params: any[];

    if (collegeIdParam) {
      // Get by college ID
      const collegeId = parseInt(collegeIdParam);
      if(isNaN(collegeId)){
          return res.status(400).json({ error:"Invalid college ID"});
      }
      query = "SELECT id, college_id as \"collegeId\", name FROM departments WHERE college_id = $1 ORDER BY id";
      params = [collegeId];
    } else if (collegeNameParam) {
      // Get by college name (case-insensitive, trim whitespace)
      query = `
        SELECT d.id, d.college_id as "collegeId", d.name
        FROM departments d
        JOIN colleges c ON d.college_id = c.id
        WHERE LOWER(TRIM(c.name)) = LOWER(TRIM($1))
        ORDER BY d.id
      `;
      params = [collegeNameParam.trim()];
    } else {
      return res.status(400).json({ error: "Either collegeId or collegeName parameter is required" });
    }

    const result = await pool.query(query, params);
    if (!result.rows || result.rows.length === 0) {
      return res.json([]); // empty list is fine
    }
    return res.json(result.rows);
  }catch(err)
  {
    console.error("Failed to fetch departments", err);
    res.status(500).json({error:"Internal server error"});
  }
};

// POST: Add a new department to a college
export const addDepartment = async (req: Request, res: Response) => {
  try{
    const { name, collegeId } = req.body;
    if (!name || !collegeId) {
      return res.status(400).json({ error: "Both name and collegeId are required" });
    }
    const newDept = await pool.query(
      "INSERT INTO departments (name, college_id) VALUES ($1, $2) RETURNING id, college_id as \"collegeId\", name",
      [name, collegeId]
    );
  
    res.status(201).json(newDept.rows[0]);
  }catch(err){
    console.error("Failed to add departments ",err);
    res.status(500).json({error:"Internal server error"});
  }
};

export const deleteDepartment = async(req: Request, res: Response) => {
  try{
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Department ID is required" });
    }

    const result = await pool.query(
      "DELETE FROM departments WHERE id = $1 RETURNING id, name",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Department not found" });
    }

    res.json({ message: "Department deleted successfully", department: result.rows[0] });
  }catch(error){
    console.error("Error deleting department");
    res.status(500).json({error:"Internal server error"});
  }
};