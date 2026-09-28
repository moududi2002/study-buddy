import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  health() {
    return {
      success: true,
      message: '🐱 Study Buddy API চলছে ঠিকঠাক!',
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    };
  }
}