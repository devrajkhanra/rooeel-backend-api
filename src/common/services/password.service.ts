import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { IPasswordService } from '../interfaces/password.interface';

@Injectable()
export class PasswordService implements IPasswordService {
    private readonly saltRounds = 10;

    async hash(password: string): Promise<string> {
        return bcrypt.hash(password, this.saltRounds);
    }

    async compare(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    /**
     * Generates a cryptographically random 12-character password.
     * Uses base64url alphabet — safe to copy-paste, no ambiguous chars.
     */
    generateRandom(length = 12): string {
        // base64url gives ~6 bits/char; we need more bytes than chars
        return crypto
            .randomBytes(Math.ceil(length * 0.75))
            .toString('base64url')
            .slice(0, length);
    }
}
