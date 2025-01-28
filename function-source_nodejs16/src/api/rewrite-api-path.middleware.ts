import {Injectable, NestMiddleware} from "@nestjs/common";
import {Request, Response, NextFunction} from "express";

@Injectable()
export class RewriteApiPathMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    req.url = req.url.replace(/^\/api/, "");
    next();
  }
}

