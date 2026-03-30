import { Server, Socket } from 'socket.io';
export declare class JobsGateway {
    server: Server;
    handleSubscribe(data: {
        job_id: string;
    }, client: Socket): void;
    handleSubscribeOrg(data: {
        org_id: string;
    }, client: Socket): void;
    emitJobUpdate(orgId: string, payload: {
        job_id: string;
        project_id: string;
        status: string;
        stage: string;
        progress: number;
        message: string;
    }): void;
    emitJobCompleted(orgId: string, jobId: string, projectId: string): void;
    emitJobFailed(orgId: string, jobId: string, projectId: string, error: string): void;
}
