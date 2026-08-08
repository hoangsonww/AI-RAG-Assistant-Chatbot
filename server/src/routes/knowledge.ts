import express, { Response } from "express";
import { authenticateJWT, requireAdmin, AuthRequest } from "../middleware/auth";
import KnowledgeSource, {
  KnowledgeSourceType,
} from "../models/KnowledgeSource";
import {
  ingestKnowledgeSource,
  deleteKnowledgeSourceVectors,
} from "../services/knowledgeBase";
import mongoose from "mongoose";

const VALID_SOURCE_TYPES: KnowledgeSourceType[] = [
  "resume",
  "note",
  "link",
  "project",
  "bio",
  "other",
];

const normalizeTags = (tags: any): string[] => {
  return tags
    ? Array.isArray(tags)
      ? tags
      : String(tags)
          .split(",")
          .map((t: string) => t.trim())
    : [];
};

const isValidObjectIdGuard = (id: string, res: Response): boolean => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: "Invalid id format" });
    return false;
  }
  return true;
};

const router = express.Router();

// All routes require authentication + admin role
router.use(authenticateJWT, requireAdmin);

/**
 * @swagger
 * /api/knowledge:
 *   get:
 *     summary: List all knowledge sources.
 *     description: Returns a paginated list of knowledge sources. Supports filtering by source type and search term. Admin access required.
 *     tags:
 *       - Knowledge
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of results per page (max 100).
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [resume, note, link, project, bio, other]
 *         description: Filter by source type.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term matched against title and tags.
 *     responses:
 *       200:
 *         description: Paginated list of knowledge sources (content field excluded).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sources:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/KnowledgeSource'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Admin access required.
 *       500:
 *         description: Server error.
 */
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(
      1,
      Math.min(100, parseInt(req.query.limit as string) || 20),
    );
    const type = req.query.type as string | undefined;
    const search = req.query.search as string | undefined;

    const filter: Record<string, any> = {};
    if (type) filter.sourceType = type;
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { title: { $regex: escapedSearch, $options: "i" } },
        { tags: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    const [sources, total] = await Promise.all([
      KnowledgeSource.find(filter)
        .select("-content")
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      KnowledgeSource.countDocuments(filter),
    ]);

    res.json({
      sources,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/knowledge/{id}:
 *   get:
 *     summary: Get a single knowledge source, including its full content.
 *     description: Returns the complete source document (unlike the list endpoint, content is included). Admin access required.
 *     tags:
 *       - Knowledge
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the knowledge source.
 *     responses:
 *       200:
 *         description: The knowledge source, with content.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KnowledgeSource'
 *       400:
 *         description: Invalid id format.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Admin access required.
 *       404:
 *         description: Knowledge source not found.
 *       500:
 *         description: Server error.
 */
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectIdGuard(req.params.id, res)) return;

    const source = await KnowledgeSource.findById(req.params.id).lean();
    if (!source) {
      return res.status(404).json({ message: "Knowledge source not found" });
    }

    res.json({ source });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/knowledge:
 *   post:
 *     summary: Create a new knowledge source.
 *     description: Saves the source to MongoDB, chunks and embeds the content into Pinecone, and optionally ingests entities into Neo4j. Admin access required.
 *     tags:
 *       - Knowledge
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - sourceType
 *             properties:
 *               title:
 *                 type: string
 *                 example: Son Nguyen Profile
 *               content:
 *                 type: string
 *                 example: Full text content to embed.
 *               sourceType:
 *                 type: string
 *                 enum: [resume, note, link, project, bio, other]
 *                 example: bio
 *               sourceUrl:
 *                 type: string
 *                 example: https://example.com
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [profile, bio]
 *               externalId:
 *                 type: string
 *                 example: profile
 *     responses:
 *       201:
 *         description: Knowledge source created and embedded.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 source:
 *                   $ref: '#/components/schemas/KnowledgeSource'
 *                 chunkCount:
 *                   type: integer
 *       400:
 *         description: Validation error.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Admin access required.
 *       409:
 *         description: A source with the given externalId already exists.
 *       500:
 *         description: Server error.
 */
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, sourceType, sourceUrl, tags, externalId } =
      req.body;

    // Validation
    const errors: { field: string; message: string }[] = [];
    if (!title?.trim())
      errors.push({ field: "title", message: "Title is required" });
    if (!content?.trim())
      errors.push({ field: "content", message: "Content is required" });
    if (!sourceType?.trim())
      errors.push({ field: "sourceType", message: "sourceType is required" });
    if (
      sourceType &&
      !VALID_SOURCE_TYPES.includes(sourceType as KnowledgeSourceType)
    ) {
      errors.push({
        field: "sourceType",
        message: `Must be one of: ${VALID_SOURCE_TYPES.join(", ")}`,
      });
    }
    if (errors.length) return res.status(400).json({ errors });

    // Check externalId uniqueness if provided
    if (externalId) {
      const existing = await KnowledgeSource.findOne({ externalId });
      if (existing) {
        return res
          .status(409)
          .json({
            message: `A source with externalId "${externalId}" already exists`,
          });
      }
    }

    // Save to MongoDB first to get the _id for vector IDs
    const source = new KnowledgeSource({
      title: title.trim(),
      content: content.trim(),
      sourceType,
      sourceUrl: sourceUrl?.trim(),
      tags: normalizeTags(tags),
      externalId: externalId?.trim() || undefined,
      chunkCount: 0,
    });

    try {
      await source.save();
    } catch (saveError: any) {
      if (saveError.code === 11000) {
        return res
          .status(409)
          .json({
            message: `A source with externalId "${externalId}" already exists`,
          });
      }
      throw saveError;
    }

    // Embed and ingest into Pinecone (+ Neo4j if configured)
    try {
      const { chunkCount } = await ingestKnowledgeSource({
        sourceId: String(source._id),
        title: source.title,
        content: source.content,
        sourceType: source.sourceType,
        sourceUrl: source.sourceUrl,
      });

      source.chunkCount = chunkCount;
      await source.save();

      res.status(201).json({ source, chunkCount });
    } catch (ingestError: any) {
      // Roll back so the list never shows an unsearchable source.
      await KnowledgeSource.findByIdAndDelete(source._id).catch(() => {});
      await deleteKnowledgeSourceVectors(String(source._id)).catch(() => {});
      throw ingestError;
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/knowledge/{id}:
 *   patch:
 *     summary: Update a knowledge source and re-embed.
 *     description: Updates any field on the source, deletes old Pinecone vectors, and re-embeds the updated content. Admin access required.
 *     tags:
 *       - Knowledge
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the knowledge source.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               sourceType:
 *                 type: string
 *                 enum: [resume, note, link, project, bio, other]
 *               sourceUrl:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               externalId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Source updated and re-embedded.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 source:
 *                   $ref: '#/components/schemas/KnowledgeSource'
 *                 chunkCount:
 *                   type: integer
 *       400:
 *         description: Validation error.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Admin access required.
 *       404:
 *         description: Knowledge source not found.
 *       409:
 *         description: externalId conflict.
 *       500:
 *         description: Server error.
 */
router.patch("/:id", async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectIdGuard(req.params.id, res)) return;

    const source = await KnowledgeSource.findById(req.params.id);
    if (!source)
      return res.status(404).json({ message: "Knowledge source not found" });

    const { title, content, sourceType, sourceUrl, tags, externalId } =
      req.body;

    if (
      sourceType &&
      !VALID_SOURCE_TYPES.includes(sourceType as KnowledgeSourceType)
    ) {
      return res.status(400).json({
        errors: [
          {
            field: "sourceType",
            message: `Must be one of: ${VALID_SOURCE_TYPES.join(", ")}`,
          },
        ],
      });
    }

    // Check externalId uniqueness if changed
    if (externalId && externalId !== source.externalId) {
      const conflict = await KnowledgeSource.findOne({
        externalId,
        _id: { $ne: source._id },
      });
      if (conflict) {
        return res
          .status(409)
          .json({
            message: `A source with externalId "${externalId}" already exists`,
          });
      }
    }

    let needsReembed = false;

    // Apply field updates
    if (title?.trim() && source.title !== title.trim()) {
      source.title = title.trim();
      needsReembed = true;
    }
    if (content?.trim() && source.content !== content.trim()) {
      source.content = content.trim();
      needsReembed = true;
    }
    if (sourceType && source.sourceType !== sourceType) {
      source.sourceType = sourceType;
      needsReembed = true;
    }
    if (sourceUrl !== undefined && source.sourceUrl !== sourceUrl?.trim()) {
      source.sourceUrl = sourceUrl?.trim();
      needsReembed = true;
    }
    if (tags !== undefined) {
      source.tags = normalizeTags(tags);
    }
    if (externalId !== undefined)
      source.externalId = externalId?.trim() || undefined;

    let chunkCount = source.chunkCount;

    if (needsReembed) {
      // Re-embed with replaceExisting = true (deletes old vectors first)
      const ingestionResult = await ingestKnowledgeSource({
        sourceId: String(source._id),
        title: source.title,
        content: source.content,
        sourceType: source.sourceType,
        sourceUrl: source.sourceUrl,
        replaceExisting: true,
      });
      chunkCount = ingestionResult.chunkCount;
      source.chunkCount = chunkCount;
    }

    await source.save();

    res.json({ source, chunkCount });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/knowledge/{id}:
 *   delete:
 *     summary: Delete a knowledge source.
 *     description: Removes the source from MongoDB, Pinecone vectors, and Neo4j graph nodes. Admin access required.
 *     tags:
 *       - Knowledge
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the knowledge source.
 *     responses:
 *       200:
 *         description: Knowledge source deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Knowledge source deleted successfully
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Admin access required.
 *       404:
 *         description: Knowledge source not found.
 *       500:
 *         description: Server error.
 */
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectIdGuard(req.params.id, res)) return;

    const source = await KnowledgeSource.findById(req.params.id);
    if (!source)
      return res.status(404).json({ message: "Knowledge source not found" });

    await deleteKnowledgeSourceVectors(String(source._id));
    await KnowledgeSource.findByIdAndDelete(req.params.id);

    res.json({ message: "Knowledge source deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/knowledge/{id}/reindex:
 *   post:
 *     summary: Force re-index a knowledge source.
 *     description: Deletes existing Pinecone vectors and re-embeds the source content without changing any metadata. Admin access required.
 *     tags:
 *       - Knowledge
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the knowledge source.
 *     responses:
 *       200:
 *         description: Source re-indexed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Source re-indexed successfully
 *                 chunkCount:
 *                   type: integer
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Admin access required.
 *       404:
 *         description: Knowledge source not found.
 *       500:
 *         description: Server error.
 */
router.post("/:id/reindex", async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectIdGuard(req.params.id, res)) return;

    const source = await KnowledgeSource.findById(req.params.id);
    if (!source)
      return res.status(404).json({ message: "Knowledge source not found" });

    const { chunkCount } = await ingestKnowledgeSource({
      sourceId: String(source._id),
      title: source.title,
      content: source.content,
      sourceType: source.sourceType,
      sourceUrl: source.sourceUrl,
      replaceExisting: true,
    });

    source.chunkCount = chunkCount;
    await source.save();

    res.json({ message: "Source re-indexed successfully", chunkCount });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/knowledge/sync:
 *   post:
 *     summary: Bulk upsert knowledge sources from a manifest payload.
 *     description: Accepts a JSON manifest and upserts each source by externalId. Creates new sources or updates existing ones. Equivalent to the CLI manifest sync. Admin access required.
 *     tags:
 *       - Knowledge
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sources
 *             properties:
 *               sources:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - externalId
 *                     - title
 *                     - content
 *                     - sourceType
 *                   properties:
 *                     externalId:
 *                       type: string
 *                       example: profile
 *                     title:
 *                       type: string
 *                       example: Son Nguyen Profile
 *                     content:
 *                       type: string
 *                     sourceType:
 *                       type: string
 *                       enum: [resume, note, link, project, bio, other]
 *                     sourceUrl:
 *                       type: string
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: string
 *     responses:
 *       200:
 *         description: Sync results with per-source status.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 synced:
 *                   type: integer
 *                   example: 2
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       externalId:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [created, updated]
 *                       chunkCount:
 *                         type: integer
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       externalId:
 *                         type: string
 *                       error:
 *                         type: string
 *       400:
 *         description: Missing or empty sources array.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Admin access required.
 *       500:
 *         description: Server error.
 */
const MAX_SYNC_SOURCES = 50;
router.post("/sync", async (req: AuthRequest, res: Response) => {
  try {
    const { sources } = req.body;
    if (!Array.isArray(sources) || sources.length === 0) {
      return res
        .status(400)
        .json({ message: "Body must contain a non-empty `sources` array" });
    }
    if (sources.length > MAX_SYNC_SOURCES) {
      return res.status(400).json({
        message: `Manifest exceeds the limit of ${MAX_SYNC_SOURCES} sources per request`,
      });
    }

    const results: {
      externalId: string;
      status: "created" | "updated";
      chunkCount: number;
    }[] = [];
    const errors: { externalId: string; error: string }[] = [];

    for (const entry of sources) {
      const { externalId, title, content, sourceType, sourceUrl, tags } = entry;

      if (!externalId || !title || !content || !sourceType) {
        errors.push({
          externalId: externalId ?? "(missing)",
          error:
            "Missing required fields: externalId, title, content, sourceType",
        });
        continue;
      }

      try {
        let source = await KnowledgeSource.findOne({ externalId });
        const isNew = !source;

        if (!source) {
          source = new KnowledgeSource({
            title,
            content,
            sourceType,
            sourceUrl,
            tags: normalizeTags(tags),
            externalId,
            chunkCount: 0,
          });
          await source.save();
        } else {
          source.title = title;
          source.content = content;
          source.sourceType = sourceType;
          source.sourceUrl = sourceUrl;
          if (tags !== undefined) {
            source.tags = normalizeTags(tags);
          }
        }

        const { chunkCount } = await ingestKnowledgeSource({
          sourceId: String(source._id),
          title: source.title,
          content: source.content,
          sourceType: source.sourceType,
          sourceUrl: source.sourceUrl,
          replaceExisting: !isNew,
        });

        source.chunkCount = chunkCount;
        await source.save();

        results.push({
          externalId,
          status: isNew ? "created" : "updated",
          chunkCount,
        });
      } catch (err: any) {
        errors.push({ externalId, error: err.message });
      }
    }

    if (results.length === 0 && errors.length > 0) {
      return res
        .status(500)
        .json({
          message: "All manifest entries failed to sync",
          synced: 0,
          results,
          errors,
        });
    }

    res.json({ synced: results.length, results, errors });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
