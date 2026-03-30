import { io, Socket } from 'socket.io-client';
import { getOrgId } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', { withCredentials: true, transports: ['websocket', 'polling'] });
    socket.on('connect', () => {
      const orgId = getOrgId();
      if (orgId) socket!.emit('subscribe_org', { org_id: orgId });
    });
  }
  return socket;
}

export function subscribeJob(jobId: string) {
  getSocket().emit('subscribe_job', { job_id: jobId });
}
