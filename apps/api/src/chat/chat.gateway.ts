// ============================================================
// Path: apps/api/src/chat/chat.gateway.ts
// ============================================================

import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

interface AuthSocket extends Socket {
  userId?: string;
  username?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN?.split(',') ?? true,
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chat: ChatService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ----------------------------------------------------------
  // Auth on connection
  // ----------------------------------------------------------
  async handleConnection(client: AuthSocket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.headers?.authorization?.replace('Bearer ', '') as string | undefined);

      if (!token) throw new UnauthorizedException();

      const payload: any = await this.jwt.verifyAsync(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });

      client.userId = payload.sub;
      client.username = payload.username;

      this.logger.log(`🔌 Connected: ${payload.username} (${client.id})`);
      client.emit('connected', { userId: payload.sub, username: payload.username });
    } catch (err) {
      this.logger.warn(`❌ Socket auth failed: ${(err as Error).message}`);
      client.emit('unauthorized', { message: 'আপনি লগইন করা নেই' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthSocket) {
    this.logger.log(`🔌 Disconnected: ${client.username ?? 'unknown'} (${client.id})`);
  }

  // ----------------------------------------------------------
  // join_conversation
  // ----------------------------------------------------------
  @SubscribeMessage('join_conversation')
  async onJoin(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      if (!client.userId) return { ok: false, error: 'unauthorized' };
      await this.chat.ensureParticipant(client.userId, data.conversationId);
      client.join(`conv:${data.conversationId}`);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  @SubscribeMessage('leave_conversation')
  onLeave(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`conv:${data.conversationId}`);
    return { ok: true };
  }

  // ----------------------------------------------------------
  // send_message (text)
  // ----------------------------------------------------------
  @SubscribeMessage('send_message')
  async onSend(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody()
    data: { conversationId: string; content?: string; type: 'TEXT' | 'IMAGE'; imageUrl?: string },
  ) {
    try {
      if (!client.userId) return { ok: false, error: 'unauthorized' };

      const result = await this.chat.sendMessage(client.userId, {
        conversationId: data.conversationId,
        content: data.content,
        type: data.type,
        imageUrl: data.imageUrl,
      });

      // Broadcast to room
      this.server
        .to(`conv:${data.conversationId}`)
        .emit('new_message', result.data);

      return { ok: true, data: result.data };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  // ----------------------------------------------------------
  // typing indicator
  // ----------------------------------------------------------
  @SubscribeMessage('typing')
  onTyping(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) return;
    client.to(`conv:${data.conversationId}`).emit('typing', {
      conversationId: data.conversationId,
      userId: client.userId,
      username: client.username,
    });
  }

  @SubscribeMessage('stop_typing')
  onStopTyping(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) return;
    client.to(`conv:${data.conversationId}`).emit('stop_typing', {
      conversationId: data.conversationId,
      userId: client.userId,
    });
  }

  // ----------------------------------------------------------
  // mark_read
  // ----------------------------------------------------------
  @SubscribeMessage('mark_read')
  async onMarkRead(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) return;
    await this.chat.markRead(client.userId, data.conversationId);
    client.to(`conv:${data.conversationId}`).emit('read_receipt', {
      conversationId: data.conversationId,
      userId: client.userId,
    });
  }

  // ----------------------------------------------------------
  // delete_message
  // ----------------------------------------------------------
  @SubscribeMessage('delete_message')
  async onDelete(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { messageId: string; conversationId: string },
  ) {
    try {
      if (!client.userId) return { ok: false, error: 'unauthorized' };
      await this.chat.deleteMessage(client.userId, data.messageId);
      this.server
        .to(`conv:${data.conversationId}`)
        .emit('message_deleted', { id: data.messageId, conversationId: data.conversationId });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }
  // ----------------------------------------------------------
  // WebRTC CALL SIGNALING
  // ----------------------------------------------------------

  @SubscribeMessage('call_invite')
  async onCallInvite(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody()
    data: {
      conversationId: string;
      callId: string;
      callType: 'audio' | 'video';
    },
  ) {
    try {
      if (!client.userId) {
        return { ok: false, error: 'unauthorized' };
      }

      await this.chat.ensureParticipant(
        client.userId,
        data.conversationId,
      );

      client.to(`conv:${data.conversationId}`).emit('call_invite', {
        conversationId: data.conversationId,
        callId: data.callId,
        callType: data.callType,
        callerId: client.userId,
        callerUsername: client.username,
      });

      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: (e as Error).message,
      };
    }
  }

  @SubscribeMessage('call_accept')
  async onCallAccept(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody()
    data: {
      conversationId: string;
      callId: string;
    },
  ) {
    if (!client.userId) {
      return { ok: false, error: 'unauthorized' };
    }

    try {
      await this.chat.ensureParticipant(
        client.userId,
        data.conversationId,
      );

      client.to(`conv:${data.conversationId}`).emit('call_accept', {
        conversationId: data.conversationId,
        callId: data.callId,
        userId: client.userId,
      });

      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: (e as Error).message,
      };
    }
  }

  @SubscribeMessage('call_reject')
  async onCallReject(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody()
    data: {
      conversationId: string;
      callId: string;
    },
  ) {
    if (!client.userId) {
      return { ok: false, error: 'unauthorized' };
    }

    client.to(`conv:${data.conversationId}`).emit('call_reject', {
      conversationId: data.conversationId,
      callId: data.callId,
      userId: client.userId,
    });

    return { ok: true };
  }

  @SubscribeMessage('webrtc_offer')
  async onWebrtcOffer(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody()
    data: {
      conversationId: string;
      callId: string;
      targetUserId?: string;
      offer: RTCSessionDescriptionInit;
    },
  ) {
    if (!client.userId) {
      return { ok: false, error: 'unauthorized' };
    }

    try {
      await this.chat.ensureParticipant(
        client.userId,
        data.conversationId,
      );

      const payload = {
        conversationId: data.conversationId,
        callId: data.callId,
        fromUserId: client.userId,
        offer: data.offer,
      };

      if (data.targetUserId) {
        this.server.sockets.sockets.forEach((socket) => {
          const target = socket as AuthSocket;

          if (target.userId === data.targetUserId) {
            target.emit('webrtc_offer', payload);
          }
        });
      } else {
        client.to(`conv:${data.conversationId}`).emit(
          'webrtc_offer',
          payload,
        );
      }

      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: (e as Error).message,
      };
    }
  }

  @SubscribeMessage('webrtc_answer')
  async onWebrtcAnswer(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody()
    data: {
      conversationId: string;
      callId: string;
      targetUserId: string;
      answer: RTCSessionDescriptionInit;
    },
  ) {
    if (!client.userId) {
      return { ok: false, error: 'unauthorized' };
    }

    try {
      await this.chat.ensureParticipant(
        client.userId,
        data.conversationId,
      );

      this.server.sockets.sockets.forEach((socket) => {
        const target = socket as AuthSocket;

        if (target.userId === data.targetUserId) {
          target.emit('webrtc_answer', {
            conversationId: data.conversationId,
            callId: data.callId,
            fromUserId: client.userId,
            answer: data.answer,
          });
        }
      });

      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: (e as Error).message,
      };
    }
  }

  @SubscribeMessage('webrtc_ice_candidate')
  async onIceCandidate(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody()
    data: {
      conversationId: string;
      callId: string;
      targetUserId: string;
      candidate: RTCIceCandidateInit;
    },
  ) {
    if (!client.userId) {
      return { ok: false, error: 'unauthorized' };
    }

    try {
      await this.chat.ensureParticipant(
        client.userId,
        data.conversationId,
      );

      this.server.sockets.sockets.forEach((socket) => {
        const target = socket as AuthSocket;

        if (target.userId === data.targetUserId) {
          target.emit('webrtc_ice_candidate', {
            conversationId: data.conversationId,
            callId: data.callId,
            fromUserId: client.userId,
            candidate: data.candidate,
          });
        }
      });

      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: (e as Error).message,
      };
    }
  }

  @SubscribeMessage('call_end')
  async onCallEnd(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody()
    data: {
      conversationId: string;
      callId: string;
    },
  ) {
    if (!client.userId) {
      return { ok: false, error: 'unauthorized' };
    }

    try {
      await this.chat.ensureParticipant(
        client.userId,
        data.conversationId,
      );

      client.to(`conv:${data.conversationId}`).emit('call_end', {
        conversationId: data.conversationId,
        callId: data.callId,
        userId: client.userId,
      });

      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: (e as Error).message,
      };
    }
  }


}