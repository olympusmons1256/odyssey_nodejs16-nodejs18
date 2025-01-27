/* eslint-disable camelcase */
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";
import {IsNotEmpty} from "class-validator";

export class PostTokenRequestBody {
  @ApiProperty()
  client_id: string
  @ApiProperty()
  client_secret: string
  @ApiProperty()
  @IsNotEmpty()
  grant_type: string
  @ApiPropertyOptional()
  scope?: string
}

export class PostTokenResponseBody {
  @ApiProperty()
  @IsNotEmpty()
  access_token: string
  @ApiProperty()
  @IsNotEmpty()
  token_type: "bearer"
  @ApiPropertyOptional()
  @IsNotEmpty()
  scope?: string
  @ApiPropertyOptional()
  refresh_token?: string

  constructor(
    access_token: string,
    scope?: string,
    refresh_token?: string
  ) {
    this.access_token = access_token;
    this.token_type = "bearer";
    this.scope = scope;
    this.refresh_token = refresh_token;
  }
}
