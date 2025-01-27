import * as firebaseAdmin from "firebase-admin";
import {Collection} from "fireorm";
import {Exclude} from "class-transformer";
import {AvatarClothingSettings, CreateUserDto} from "../dto/createUser.dto";
import {UpdateUserDto} from "../dto/updateUser.dto";
import {RootUser as RootUserDocType, UserOrganization, UserSpace} from "../../../lib/docTypes";
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";

@Collection("users")
export class User implements RootUserDocType {
  @ApiProperty()
  id!: string;
  @ApiProperty({type: Date})
  created: firebaseAdmin.firestore.Timestamp;
  @ApiProperty({type: Date})
  updated: firebaseAdmin.firestore.Timestamp;
  @ApiPropertyOptional()
  name?: string;
  @Exclude()
  bot?: boolean;
  @Exclude()
  email: string;
  @Exclude()
  avatarReadyPlayerMeImg?: string;
  @Exclude()
  pending?: boolean;
  @ApiPropertyOptional()
  bodyShape?: string;
  @ApiPropertyOptional()
  bodyHeight?: string;
  @Exclude()
  roomInvites?: string[];
  @Exclude()
  additionalInfo?: { email?: string; phone?: string; fullName?: string; };
  @Exclude()
  avatarReadyPlayerMeUrl?: string;
  @Exclude()
  followingOrganizationIds?: string[];
  @Exclude()
  userSpaces?: UserSpace[];
  @ApiPropertyOptional()
  clothingTop?: AvatarClothingSettings;
  @ApiPropertyOptional()
  clothingShoes?: AvatarClothingSettings;
  @ApiPropertyOptional()
  clothingBottom?: AvatarClothingSettings;
  @Exclude()
  userOrganizations?: UserOrganization[];

  static ofDto(createUserDto: CreateUserDto) {
    const user = new User();
    user.updated = firebaseAdmin.firestore.Timestamp.now();
    user.created = firebaseAdmin.firestore.Timestamp.now();
    user.userSpaces = [];
    user.pending = false;
    user.additionalInfo = {};
    user.email = createUserDto.email;
    user.bot = false;

    user.name = createUserDto.name;
    user.avatarReadyPlayerMeImg = createUserDto.avatarReadyPlayerMeImg;
    user.bodyShape = createUserDto.bodyShape;
    user.bodyHeight = createUserDto.bodyHeight;
    user.roomInvites = createUserDto.roomInvites;
    user.avatarReadyPlayerMeUrl = createUserDto.avatarReadyPlayerMeUrl;
    user.clothingTop = createUserDto.clothingTop;
    user.clothingShoes = createUserDto.clothingShoes;
    user.clothingBottom = createUserDto.clothingBottom;
    return user;
  }

  static ofUpdateDto(updateUserDto: UpdateUserDto, userId: string) {
    const user = new User();
    user.id = userId;
    user.bot = false;
    user.updated = firebaseAdmin.firestore.Timestamp.now();
    if (updateUserDto.updated != undefined) user.updated = updateUserDto.updated;
    if (updateUserDto.name != undefined) user.name = updateUserDto.name;
    if (updateUserDto.avatarReadyPlayerMeImg != undefined) user.avatarReadyPlayerMeImg = updateUserDto.avatarReadyPlayerMeImg;
    if (updateUserDto.bodyShape != undefined) user.bodyShape = updateUserDto.bodyShape;
    if (updateUserDto.bodyHeight != undefined) user.bodyHeight = updateUserDto.bodyHeight;
    if (updateUserDto.additionalInfo != undefined) user.additionalInfo = updateUserDto.additionalInfo;
    if (updateUserDto.avatarReadyPlayerMeUrl != undefined) user.avatarReadyPlayerMeUrl = updateUserDto.avatarReadyPlayerMeUrl;
    if (updateUserDto.clothingTop != undefined) user.clothingTop = updateUserDto.clothingTop;
    if (updateUserDto.clothingShoes != undefined) user.clothingShoes = updateUserDto.clothingShoes;
    if (updateUserDto.clothingBottom != undefined) user.clothingBottom = updateUserDto.clothingBottom;
    return user;
  }
}
