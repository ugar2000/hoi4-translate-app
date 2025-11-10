export type ObjectRef = {
    bucket: string;
    key: string;
};
export declare function parseObjectRef(ref: string): ObjectRef;
export declare function buildStageRef(stage: string, fileId: string, lineIdx: number, bucket: string): string;
