// ============================================================
// Path: apps/api/src/common/utils/otp.util.ts
// ============================================================

import * as crypto from 'crypto';

export class OtpUtil {
  // Generate a numeric OTP (default 6 digits)
  static generate(length = 6): string {
    const max = Math.pow(10, length);
    const num = crypto.randomInt(0, max);
    return num.toString().padStart(length, '0');
  }

  // Hash OTP before saving (in case DB leaks)
  static hash(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }
}