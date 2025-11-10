export declare class CreateFileJobDto {
    key: string;
    sourcePath: string;
    bucket?: string;
    contentType?: string;
    operation?: 'create' | 'update';
}
