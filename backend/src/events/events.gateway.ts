import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_sale')
  handleJoinSale(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { saleId: number },
  ) {
    if (data?.saleId) {
      const room = `sale_${data.saleId}`;
      client.join(room);
      this.logger.log(`Client ${client.id} joined ${room}`);
      return { event: 'joined_sale', data: { room, success: true } };
    }
  }

  @SubscribeMessage('leave_sale')
  handleLeaveSale(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { saleId: number },
  ) {
    if (data?.saleId) {
      const room = `sale_${data.saleId}`;
      client.leave(room);
      this.logger.log(`Client ${client.id} left ${room}`);
    }
  }

  @SubscribeMessage('join_admin_dashboard')
  handleJoinAdmin(@ConnectedSocket() client: Socket) {
    client.join('admin_dashboard');
    this.logger.log(`Client ${client.id} joined admin_dashboard room`);
    return { event: 'joined_admin', data: { success: true } };
  }

  // Helper broadcast functions called from Payments & Sales services
  emitPaymentUpdate(saleId: number, payload: any) {
    const room = `sale_${saleId}`;
    this.server.to(room).emit('payment_updated', payload);
    // Also broadcast to all connected POS / admin monitors
    this.server.emit('global_payment_updated', payload);
    this.server.to('admin_dashboard').emit('dashboard_stats_updated', payload);
    this.logger.log(`Emitted payment_updated for sale ${saleId} to room ${room}`);
  }

  emitDashboardUpdate(payload: any) {
    this.server.to('admin_dashboard').emit('dashboard_stats_updated', payload);
  }
}
