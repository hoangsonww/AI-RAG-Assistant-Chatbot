"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ephemeralStore = void 0;
exports.createEphemeralConversation = createEphemeralConversation;
const uuid_1 = require("uuid");
/**
 * Ephemeral conversation store for temporary conversations.
 * This is a simple in-memory store, which will be reset when the server restarts.
 * It is not suitable for production use.
 */
exports.ephemeralStore = {};
function createEphemeralConversation() {
    const newId = (0, uuid_1.v4)();
    exports.ephemeralStore[newId] = [];
    return newId;
}
