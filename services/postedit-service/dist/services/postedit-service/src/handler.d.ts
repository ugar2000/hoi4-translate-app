import { HandlerContext, HandlerResult } from '../../../packages/redisx/worker';
import { LineMsg } from '../../../packages/streams/schema';
import { PosteditBatcher } from './batcher';
export type PosteditResources = {
    batcher: PosteditBatcher;
};
export declare function posteditHandler(msg: LineMsg, ctx: HandlerContext<PosteditResources>): Promise<HandlerResult>;
