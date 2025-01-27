import * as firebaseAdmin from "firebase-admin";
import {ApiPropertyOptional} from "@nestjs/swagger";
import {IsEmpty} from "class-validator";
import {RootUser as RootUserDocType, UserOrganization, UserSpace} from "../../../lib/docTypes";
import {AvatarClothingSettings} from "./createUser.dto";

export class UpdateUserDto implements RootUserDocType {
  @IsEmpty()
  id?: string;
  @IsEmpty()
  created: firebaseAdmin.firestore.Timestamp;
  @IsEmpty()
  updated: firebaseAdmin.firestore.Timestamp;
  @ApiPropertyOptional()
  name?: string;
  @IsEmpty()
  bot?: boolean;
  @IsEmpty()
  email: string;
  @ApiPropertyOptional()
  avatarReadyPlayerMeImg?: string;
  @IsEmpty()
  pending?: boolean;
  @ApiPropertyOptional()
  bodyShape?: string;
  @ApiPropertyOptional()
  bodyHeight?: string;
  @IsEmpty()
  roomInvites?: string[];
  @IsEmpty()
  additionalInfo?: { email?: string; phone?: string; fullName?: string; };
  @ApiPropertyOptional()
  avatarReadyPlayerMeUrl?: string;
  @IsEmpty()
  followingOrganizationIds?: string[];
  @IsEmpty()
  userSpaces?: UserSpace[];
  @ApiPropertyOptional()
  clothingTop?: AvatarClothingSettings;
  @ApiPropertyOptional()
  clothingShoes?: AvatarClothingSettings;
  @ApiPropertyOptional()
  clothingBottom?: AvatarClothingSettings;
  @IsEmpty()
  userOrganizations?: UserOrganization[];
}
