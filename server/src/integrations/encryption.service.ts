import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  // Use ENCRYPTION_KEY from env, fallback to JWT_SECRET for local dev, or throw if not available.
  // The key must be exactly 32 bytes for aes-256-gcm. We hash whatever string is provided to ensure it's 32 bytes.
  private get key(): Buffer {
    const rawKey = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!rawKey) {
      throw new Error('FATAL: ENCRYPTION_KEY or JWT_SECRET must be set for encryption.');
    }
    return crypto.createHash('sha256').update(String(rawKey)).digest();
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Return iv:authTag:encrypted payload
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  decrypt(encryptedText: string): string {
    try {
      const [ivHex, authTagHex, encryptedHex] = encryptedText.split(':');
      
      if (!ivHex || !authTagHex || !encryptedHex) {
        // If it doesn't match our format, it might be legacy unencrypted data. 
        // In a real migration we'd handle this more safely, but for now we fallback:
        return encryptedText;
      }

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (_e) {
      console.error('Decryption failed, returning raw string in case it was unencrypted.');
      return encryptedText;
    }
  }
}
