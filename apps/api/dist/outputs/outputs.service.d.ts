import { Model } from 'mongoose';
import { Output } from './output.schema';
import { StorageService } from '../storage/storage.service';
export declare class OutputsService {
    private model;
    private readonly storage;
    constructor(model: Model<Output>, storage: StorageService);
    listByProject(orgId: string, projectId: string): Promise<any[]>;
    getDownloadUrl(orgId: string, outputId: string): Promise<string>;
    getTileUrl(orgId: string, outputId: string): Promise<string>;
}
