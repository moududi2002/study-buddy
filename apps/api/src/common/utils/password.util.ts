// ============================================================
// Path: apps/api/src/common/utils/password.util.ts
// ============================================================

import * as argon2 from 'argon2';

export class PasswordUtil {
  static async hash(plain: string): Promise<string> {
    return argon2.hash(plain, {
      type: argon2.argon2id,
      memoryCost: 19456, // 19 MiB
      timeCost: 2,
      parallelism: 1,
    });
  }

  static async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}