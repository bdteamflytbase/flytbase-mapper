import {
  WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/' })
export class JobsGateway {
  @WebSocketServer() server: Server;

  @SubscribeMessage('subscribe_job')
  handleSubscribe(@MessageBody() data: { job_id: string }, @ConnectedSocket() client: Socket) {
    client.join(`job:${data.job_id}`);
  }

  @SubscribeMessage('subscribe_org')
  handleSubscribeOrg(@MessageBody() data: { org_id: string }, @ConnectedSocket() client: Socket) {
    client.join(`org:${data.org_id}`);
  }

  emitJobUpdate(orgId: string, payload: {
    job_id: string; project_id: string; status: string;
    stage: string; progress: number; message: string;
  }) {
    this.server.to(`org:${orgId}`).emit('job:update', payload);
    this.server.to(`job:${payload.job_id}`).emit('job:update', payload);
  }

  emitJobCompleted(orgId: string, jobId: string, projectId: string) {
    this.server.to(`org:${orgId}`).emit('job:completed', { job_id: jobId, project_id: projectId });
  }

  emitJobFailed(orgId: string, jobId: string, projectId: string, error: string) {
    this.server.to(`org:${orgId}`).emit('job:failed', { job_id: jobId, project_id: projectId, error });
  }
}
