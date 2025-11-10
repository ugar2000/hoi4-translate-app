"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.posteditHandler = posteditHandler;
async function posteditHandler(msg, ctx) {
    return ctx.resources.batcher.enqueue(msg);
}
