"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const knowledge_1 = __importDefault(require("../src/routes/knowledge"));
const KnowledgeSource_1 = __importDefault(
  require("../src/models/KnowledgeSource"),
);
const knowledgeBase_1 = require("../src/services/knowledgeBase");
// Mock middleware
jest.mock("../src/middleware/auth", () => ({
  authenticateJWT: jest.fn((req, res, next) => next()),
  requireAdmin: jest.fn((req, res, next) => next()),
}));
// Mock models and services
jest.mock("../src/models/KnowledgeSource");
jest.mock("../src/services/knowledgeBase", () => ({
  ingestKnowledgeSource: jest.fn(),
  deleteKnowledgeSourceVectors: jest.fn(),
}));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use("/api/knowledge", knowledge_1.default);
describe("Knowledge Admin Routes", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe("Authorization", () => {
    it("rejects unauthenticated requests", () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const auth = require("../src/middleware/auth");
        auth.authenticateJWT.mockImplementationOnce((req, res) =>
          res.status(401).json({ message: "Unauthorized" }),
        );
        const res = yield (0, supertest_1.default)(app).get("/api/knowledge");
        expect(res.status).toBe(401);
      }));
    it("rejects non-admin requests", () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const auth = require("../src/middleware/auth");
        auth.requireAdmin.mockImplementationOnce((req, res) =>
          res
            .status(403)
            .json({ message: "Unauthorized: Admin access required" }),
        );
        const res = yield (0, supertest_1.default)(app).get("/api/knowledge");
        expect(res.status).toBe(403);
      }));
  });
  describe("GET /api/knowledge", () => {
    it("returns paginated sources", () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const mockSources = [{ _id: "1", title: "Source 1" }];
        const leanMock = jest.fn().mockResolvedValue(mockSources);
        const limitMock = jest.fn().mockReturnValue({ lean: leanMock });
        const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
        const sortMock = jest.fn().mockReturnValue({ skip: skipMock });
        const selectMock = jest.fn().mockReturnValue({ sort: sortMock });
        KnowledgeSource_1.default.find.mockReturnValue({
          select: selectMock,
        });
        KnowledgeSource_1.default.countDocuments.mockResolvedValue(1);
        const res = yield (0, supertest_1.default)(app).get(
          "/api/knowledge?page=1&limit=10",
        );
        expect(res.status).toBe(200);
        expect(res.body.sources).toEqual(mockSources);
        expect(res.body.pagination.total).toBe(1);
      }));
  });
  describe("POST /api/knowledge", () => {
    it("validates required fields", () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app)
          .post("/api/knowledge")
          .send({});
        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
      }));
    it("creates a new source and ingests it", () =>
      __awaiter(void 0, void 0, void 0, function* () {
        KnowledgeSource_1.default.findOne.mockResolvedValue(null);
        const mockSave = jest.fn().mockResolvedValue(true);
        // We have to mock the constructor of KnowledgeSource
        KnowledgeSource_1.default.mockImplementation(() => ({
          _id: "new-id",
          title: "Test",
          content: "Content",
          sourceType: "bio",
          save: mockSave,
        }));
        knowledgeBase_1.ingestKnowledgeSource.mockResolvedValue({
          chunkCount: 5,
        });
        const res = yield (0, supertest_1.default)(app)
          .post("/api/knowledge")
          .send({
            title: "Test",
            content: "Content",
            sourceType: "bio",
          });
        expect(res.status).toBe(201);
        expect(res.body.chunkCount).toBe(5);
        expect(mockSave).toHaveBeenCalledTimes(2);
        expect(knowledgeBase_1.ingestKnowledgeSource).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Test",
            sourceType: "bio",
          }),
        );
      }));
  });
  describe("DELETE /api/knowledge/:id", () => {
    it("deletes a source and its vectors", () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const sourceId = "507f1f77bcf86cd799439011";
        KnowledgeSource_1.default.findById.mockResolvedValue({ _id: sourceId });
        KnowledgeSource_1.default.findByIdAndDelete.mockResolvedValue(true);
        knowledgeBase_1.deleteKnowledgeSourceVectors.mockResolvedValue(true);
        const res = yield (0, supertest_1.default)(app).delete(
          `/api/knowledge/${sourceId}`,
        );
        expect(res.status).toBe(200);
        expect(
          knowledgeBase_1.deleteKnowledgeSourceVectors,
        ).toHaveBeenCalledWith(sourceId);
        expect(
          KnowledgeSource_1.default.findByIdAndDelete,
        ).toHaveBeenCalledWith(sourceId);
      }));
    it("returns 400 if id is invalid", () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app).delete(
          "/api/knowledge/123",
        );
        expect(res.status).toBe(400);
        expect(
          knowledgeBase_1.deleteKnowledgeSourceVectors,
        ).not.toHaveBeenCalled();
        expect(
          KnowledgeSource_1.default.findByIdAndDelete,
        ).not.toHaveBeenCalled();
      }));
    it("returns 404 if not found", () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const sourceId = "507f1f77bcf86cd799439011";
        KnowledgeSource_1.default.findById.mockResolvedValue(null);
        const res = yield (0, supertest_1.default)(app).delete(
          `/api/knowledge/${sourceId}`,
        );
        expect(res.status).toBe(404);
      }));
  });
  describe("POST /api/knowledge/sync", () => {
    it("syncs manifest items", () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const mockSources = [
          {
            externalId: "ext-1",
            title: "Test",
            content: "Content",
            sourceType: "bio",
          },
        ];
        KnowledgeSource_1.default.findOne.mockResolvedValue(null);
        knowledgeBase_1.ingestKnowledgeSource.mockResolvedValue({
          chunkCount: 2,
        });
        const mockSave = jest.fn().mockResolvedValue(true);
        KnowledgeSource_1.default.mockImplementation(() => ({
          _id: "ext-1-id",
          title: "Test",
          content: "Content",
          sourceType: "bio",
          save: mockSave,
        }));
        const res = yield (0, supertest_1.default)(app)
          .post("/api/knowledge/sync")
          .send({ sources: mockSources });
        expect(res.status).toBe(200);
        expect(res.body.synced).toBe(1);
        expect(res.body.results[0].externalId).toBe("ext-1");
      }));
  });
});
