import {AvatarTypes} from "../../../lib/cmsDocTypes";
import {IsNotEmpty} from "class-validator";
import * as docTypes from "../../../lib/docTypes";
import {ApiProperty} from "@nestjs/swagger";

export class RegistrationInfoFields implements docTypes.RegistrationInfoFields {
  @ApiProperty()
  email: boolean;
  @ApiProperty()
  phone: boolean;
  @ApiProperty()
  fullName: boolean;
}

export class CreateSpaceDto {
  @ApiProperty()
  avatarType?: AvatarTypes;
  @ApiProperty()
  description: string;
  @ApiProperty()
  enableSharding?: boolean;
  @ApiProperty()
  infoFields?: RegistrationInfoFields;
  @ApiProperty()
  isLiveStreamActive?: boolean;
  @ApiProperty()
  isPublic?: boolean;
  @ApiProperty()
  name: string;
  @ApiProperty()
  persistentLiveStream?: string;
  @ApiProperty()
  @IsNotEmpty()
  spaceTemplateId: string;
  @ApiProperty()
  thumb: string;
  @ApiProperty()
  disableComms?: boolean;
}
