"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const pineconeClient_1 = require("../services/pineconeClient");
/**
 * Check the Pinecone index status and print the information.
 */
function checkIndex() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const stats = yield pineconeClient_1.index.describeIndexStats();
            console.log("Pinecone Index Info:", JSON.stringify(stats, null, 2));
        }
        catch (error) {
            console.error("Pinecone Connection Error:", error);
        }
    });
}
checkIndex();
