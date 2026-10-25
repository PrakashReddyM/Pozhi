// Type definitions for CSRF middleware
import { Request } from 'express';

declare global {
    namespace Express {
        interface Request {
            csrfToken(): string;
        }
    }
}

export { };
