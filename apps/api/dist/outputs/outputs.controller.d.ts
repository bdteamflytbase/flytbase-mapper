import { OutputsService } from './outputs.service';
export declare class OutputsController {
    private readonly svc;
    constructor(svc: OutputsService);
    listByProject(orgId: string, projectId: string): Promise<any[]>;
    getDownload(orgId: string, id: string): Promise<{
        url: string;
    }>;
    getTiles(orgId: string, id: string): Promise<{
        tile_url: string;
    }>;
}
