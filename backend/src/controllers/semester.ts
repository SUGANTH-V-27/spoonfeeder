import { Request,Response } from "express";
import pool from "../db/connection";

  export const getsemesters = async (_req:Request,res:Response) =>{
    try{
    const departmentIdParam = _req.query.departmentId as string;
    const departmentNameParam = _req.query.departmentName as string;
    const collegeNameParam = _req.query.collegeName as string;

    let query: string;
    let params: any[];

    if (departmentIdParam) {
      // Get by department ID
      const departmentId = parseInt(departmentIdParam);
      if(isNaN(departmentId)){
          return res.status(400).json({ error:"Invalid department ID"});
      }
      query = "SELECT id, department_id as \"departmentId\", name FROM semesters WHERE department_id = $1 ORDER BY id";
      params = [departmentId];
    } else if (departmentNameParam && collegeNameParam) {
      // Get by department and college names (case-insensitive, trim whitespace)
      query = `
        SELECT s.id, s.department_id as "departmentId", s.name
        FROM semesters s
        JOIN departments d ON s.department_id = d.id
        JOIN colleges c ON d.college_id = c.id
        WHERE LOWER(TRIM(d.name)) = LOWER(TRIM($1)) AND LOWER(TRIM(c.name)) = LOWER(TRIM($2))
        ORDER BY s.id
      `;
      params = [departmentNameParam.trim(), collegeNameParam.trim()];
    } else {
      return res.status(400).json({ error: "Either departmentId or (departmentName and collegeName) parameters are required" });
    }

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No semesters found for the given criteria" });
    }
    return res.json(result.rows);
  }catch(err)
  {
    console.error("Failed to fetch the semesters",err);
    res.status(500).json({error:"Internal server error"});
  }
};

export const addSemester = async (req: Request, res: Response) => {
  try{
    const { name, departmentId } = req.body;
  
    // Validate required fields
    if (!name || !departmentId) {
      return res
        .status(400)
        .json({ error: "Both name and departmentId are required" });
    }
  
    const newSemester = await pool.query(
      "INSERT INTO semesters (name,department_id) VALUES ($1,$2) RETURNING id, department_id as \"departmentId\", name",
      [name, departmentId]
    );
  
    return res.status(201).json(newSemester.rows[0]);
  }catch(err)
  {
    console.error("Error adding the semesters:",err);
    res.status(500).json({error:"Internal server error"});
  }
};

export const deleteSemester = async(req: Request, res: Response) => {
  try{
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Semester ID is required" });
    }

    const result = await pool.query(
      "DELETE FROM semesters WHERE id = $1 RETURNING id, name",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Semester not found" });
    }

    res.json({ message: "Semester deleted successfully", semester: result.rows[0] });
  }catch(error){
    console.error("Error deleting semester");
    res.status(500).json({error:"Internal server error"});
  }
};