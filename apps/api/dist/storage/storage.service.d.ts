export declare class StorageService {
    private readonly logger;
    private readonly client;
    private readonly bucket;
    private readonly endpoint;
    constructor();
    getBucket(): string;
    getPresignedUrl(key: string, expiresIn?: number): Promise<string>;
    getPublicUrl(key: string): Promise<string>;
    checkExists(key: string): Promise<boolean>;
}
