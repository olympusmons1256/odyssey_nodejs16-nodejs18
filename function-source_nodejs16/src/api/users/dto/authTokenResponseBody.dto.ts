import {ApiProperty} from "@nestjs/swagger";

export class UserTokenResponseBody {
  @ApiProperty()
  customToken: string
  constructor(token: string) {
    this.customToken = token;
  }
}
