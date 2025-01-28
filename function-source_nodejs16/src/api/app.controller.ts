import {Controller, Request, Post, UseGuards, Body, BadRequestException} from "@nestjs/common";
import {AuthService} from "./auth/auth.service";
import {Public} from "./auth/public.decorator";
import {AuthGuard} from "@nestjs/passport";
import {PostTokenRequestBody, PostTokenResponseBody} from "./auth/token.dto";
import {ApiResponse, ApiTags} from "@nestjs/swagger";

@Controller()
export class AppController {
  constructor(private authService: AuthService) {}

  @Public()
  @UseGuards(AuthGuard(["local", "basic"]))
  @ApiTags("auth")
  @ApiResponse({type: PostTokenResponseBody})
  @Post("auth/token")
  async token(
  @Body() body: PostTokenRequestBody,
    @Request() req: any
  ) {
    if (body.grant_type != "client_credentials") throw new BadRequestException("Value of 'grant_type' must be 'client_credentials'");
    if (body.scope != undefined && body.scope != "organization") throw new BadRequestException("Value of 'scope' must be 'organization'");
    return this.authService.token(req.user, body.grant_type, body.scope);
  }
}
