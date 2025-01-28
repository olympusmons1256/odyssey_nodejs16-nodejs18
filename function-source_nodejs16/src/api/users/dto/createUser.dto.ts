import * as firebaseAdmin from "firebase-admin";
import {AvatarClothingSettings as AvatarClothingSettingsDocType, RootUser as RootUserDocType, UserOrganization, UserSpace} from "../../../lib/docTypes";
import {IsEmpty} from "class-validator";
import {ApiProperty} from "@nestjs/swagger";

export class AvatarClothingSettings implements AvatarClothingSettingsDocType {
  @ApiProperty()
  ueId: string;
  @ApiProperty({required: false})
  shaderItem?: string;
  @ApiProperty({required: false})
  shaderColor?: string;
}

export class CreateUserDto implements RootUserDocType {
  @IsEmpty()
  created: firebaseAdmin.firestore.Timestamp;
  @IsEmpty()
  updated: firebaseAdmin.firestore.Timestamp;
  @ApiProperty({required: false})
  name?: string;
  @IsEmpty()
  bot?: boolean;
  @IsEmpty()
  email: string;
  @ApiProperty({required: false})
  avatarReadyPlayerMeImg?: string;
  @IsEmpty()
  pending?: boolean;
  @ApiProperty({required: false})
  bodyShape?: string;
  @ApiProperty({required: false})
  bodyHeight?: string;
  @IsEmpty()
  roomInvites?: string[];
  @IsEmpty()
  additionalInfo?: { email?: string; phone?: string; fullName?: string; };
  @ApiProperty({required: false})
  avatarReadyPlayerMeUrl?: string;
  @IsEmpty()
  followingOrganizationIds?: string[];
  @IsEmpty()
  userSpaces?: UserSpace[];
  @ApiProperty({required: false})
  clothingTop?: AvatarClothingSettings;
  @ApiProperty({required: false})
  clothingShoes?: AvatarClothingSettings;
  @ApiProperty({required: false})
  clothingBottom?: AvatarClothingSettings;
  @IsEmpty()
  userOrganizations?: UserOrganization[];
}
