import { Request,Response } from "express";
import pool, { queryWithTimeout } from "../db/connection";
import { bumpGlobalCacheVersion } from "../services/cacheVersion";

export const getSubtopicContent = async (_req:Request,res:Response)=>{
    try{
        const subtopicId = parseInt(_req.params.subtopicId);

        if(isNaN(subtopicId)){
            return res.status(400).json({error:"Invalid subtopic id"});
        }

        const result = await queryWithTimeout(
            'SELECT id, subtopic_id as "subtopicId", content_type as "contentType",content_order as "contentOrder", parent_content_id as "parentContentId",title, content, metadata , created_at FROM subtopic_content WHERE subtopic_id = $1 ORDER BY content_order ASC',
            [subtopicId]
        );

        res.json(result.rows);
    }catch(err)
    {
        console.error("Error fetching the contents:",err);
        res.status(500).json({error:"Internal server error"});
    }
};

export const addSubtopicContent = async (_req:Request,res:Response)=>{
    try{
        const subtopicId = parseInt(_req.params.subtopicId);

        if(isNaN(subtopicId))
        {
            return res.status(400).json({error:"Invalid subtopic id"});
        }

        const {contentType, contentOrder, parentContentId, title, content, metadata} = _req.body;

        if(!contentType || !contentOrder){
            return res.status(400).json({error:"contentType and contentOrder are required"});
        }

        const result = await queryWithTimeout(
            'INSERT INTO subtopic_content (subtopic_id, content_type, content_order, parent_content_id, title, content, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, subtopic_id as "subtopicId", content_type as "contentType", content_order as "contentOrder", parent_content_id as "parentContentId", title, content, metadata',
            [subtopicId, contentType, contentOrder, parentContentId, title, content, metadata]
        );

        // Content changes must reflect everywhere, bump global cache version
        await bumpGlobalCacheVersion();
        res.status(201).json(result.rows[0]);
    }catch(err)
    {
        console.error("Error adding the contents:",err);
        res.status(500).json({error:"Internal server error"});
    }
};

export const deleteSubtopicContent = async(req: Request, res: Response) => {
  try{
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Content ID is required" });
    }

    const result = await queryWithTimeout(
      "DELETE FROM subtopic_content WHERE id = $1 RETURNING id, title",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Content not found" });
    }

    // Content changes must reflect everywhere, bump global cache version
    await bumpGlobalCacheVersion();
    res.json({ message: "Content deleted successfully", content: result.rows[0] });
  }catch(error){
    console.error("Error deleting content");
    res.status(500).json({error:"Internal server error"});
  }
};