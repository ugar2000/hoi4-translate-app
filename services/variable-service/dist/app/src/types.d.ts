export interface Variable {
    hash: string;
    value: string;
}
export interface SeparationResult {
    processedText: string;
    variables: Variable[];
}
export interface QueueItem {
    hash: string;
    variable: string;
}
