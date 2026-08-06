import request from "supertest";
import express from "express";
import knowledgeRouter from "../src/routes/knowledge";
import KnowledgeSource from "../src/models/KnowledgeSource";
import { ingestKnowledgeSource, deleteKnowledgeSourceVectors } from "../src/services/knowledgeBase";

// Mock middleware
jest.mock("../src/middleware/auth", () => ({
  authenticateJWT: (req: any, res: any, next: any) => next(),
  requireAdmin: (req: any, res: any, next: any) => next(),
}));

// Mock models and services
jest.mock("../src/models/KnowledgeSource");
jest.mock("../src/services/knowledgeBase", () => ({
  ingestKnowledgeSource: jest.fn(),
  deleteKnowledgeSourceVectors: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use("/api/knowledge", knowledgeRouter);

describe("Knowledge Admin Routes", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/knowledge", () => {
    it("returns paginated sources", async () => {
      const mockSources = [{ _id: "1", title: "Source 1" }];
      const leanMock = jest.fn().mockResolvedValue(mockSources);
      const limitMock = jest.fn().mockReturnValue({ lean: leanMock });
      const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
      const sortMock = jest.fn().mockReturnValue({ skip: skipMock });
      const selectMock = jest.fn().mockReturnValue({ sort: sortMock });

      (KnowledgeSource.find as jest.Mock).mockReturnValue({
        select: selectMock,
      });
      (KnowledgeSource.countDocuments as jest.Mock).mockResolvedValue(1);

      const res = await request(app).get("/api/knowledge?page=1&limit=10");
      expect(res.status).toBe(200);
      expect(res.body.sources).toEqual(mockSources);
      expect(res.body.pagination.total).toBe(1);
    });
  });

  describe("POST /api/knowledge", () => {
    it("validates required fields", async () => {
      const res = await request(app).post("/api/knowledge").send({});
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it("creates a new source and ingests it", async () => {
      (KnowledgeSource.findOne as jest.Mock).mockResolvedValue(null);
      
      const mockSave = jest.fn().mockResolvedValue(true);
      
      // We have to mock the constructor of KnowledgeSource
      (KnowledgeSource as unknown as jest.Mock).mockImplementation(() => ({
        _id: "new-id",
        title: "Test",
        content: "Content",
        sourceType: "bio",
        save: mockSave,
      }));

      (ingestKnowledgeSource as jest.Mock).mockResolvedValue({ chunkCount: 5 });

      const res = await request(app).post("/api/knowledge").send({
        title: "Test",
        content: "Content",
        sourceType: "bio"
      });

      expect(res.status).toBe(201);
      expect(res.body.chunkCount).toBe(5);
      expect(mockSave).toHaveBeenCalledTimes(2);
      expect(ingestKnowledgeSource).toHaveBeenCalledWith(expect.objectContaining({
        title: "Test",
        sourceType: "bio"
      }));
    });
  });

  describe("DELETE /api/knowledge/:id", () => {
    it("deletes a source and its vectors", async () => {
      (KnowledgeSource.findById as jest.Mock).mockResolvedValue({ _id: "123" });
      (KnowledgeSource.findByIdAndDelete as jest.Mock).mockResolvedValue(true);
      (deleteKnowledgeSourceVectors as jest.Mock).mockResolvedValue(true);

      const res = await request(app).delete("/api/knowledge/123");
      expect(res.status).toBe(200);
      expect(deleteKnowledgeSourceVectors).toHaveBeenCalledWith("123");
      expect(KnowledgeSource.findByIdAndDelete).toHaveBeenCalledWith("123");
    });

    it("returns 404 if not found", async () => {
      (KnowledgeSource.findById as jest.Mock).mockResolvedValue(null);
      const res = await request(app).delete("/api/knowledge/999");
      expect(res.status).toBe(404);
    });
  });
  
  describe("POST /api/knowledge/sync", () => {
    it("syncs manifest items", async () => {
      const mockSources = [{
        externalId: "ext-1",
        title: "Test",
        content: "Content",
        sourceType: "bio"
      }];
      
      (KnowledgeSource.findOne as jest.Mock).mockResolvedValue(null);
      (ingestKnowledgeSource as jest.Mock).mockResolvedValue({ chunkCount: 2 });
      
      const mockSave = jest.fn().mockResolvedValue(true);
      (KnowledgeSource as unknown as jest.Mock).mockImplementation(() => ({
        _id: "ext-1-id",
        title: "Test",
        content: "Content",
        sourceType: "bio",
        save: mockSave,
      }));

      const res = await request(app).post("/api/knowledge/sync").send({ sources: mockSources });
      expect(res.status).toBe(200);
      expect(res.body.synced).toBe(1);
      expect(res.body.results[0].externalId).toBe("ext-1");
    });
  });
});
