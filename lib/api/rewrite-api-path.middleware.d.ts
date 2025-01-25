import { NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
export declare class RewriteApiPathMiddleware implements NestMiddleware {
    use(req: Request, _res: Response, next: NextFunction): void;
}
