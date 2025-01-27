import {HttpException, Injectable, NestMiddleware} from "@nestjs/common";
import {Request, Response, NextFunction} from "express";

@Injectable()
export class ClientCredentialsAuthParamsMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    /* Change `client_id` & client_secret params to `username` & `password`
    so that passport-local will work */

    // Remove any existing username or password params
    if (req.body.username != undefined && req.body.client_id == undefined) {
      return next(new HttpException("Unauthorized", 401));
    }
    if (req.body.password != undefined && req.body.client_secret == undefined) {
      return next(new HttpException("Unauthorized", 401));
    }

    // Copy client_id to username
    if (req.body.client_id) {
      req.body.username = req.body.client_id;
    }
    // Copy client_secret to password
    if (req.body.client_secret) {
      req.body.password = req.body.client_secret;
    }

    next();
  }
}

