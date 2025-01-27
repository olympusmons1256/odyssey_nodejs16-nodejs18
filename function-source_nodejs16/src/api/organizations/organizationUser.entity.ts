import {OrganizationRoles, OrganizationUser as OrganizationUserDocType} from "../../lib/docTypes";
import * as firebaseAdmin from "firebase-admin";
import {Exclude} from "class-transformer";
import {ApiProperty, ApiResponseProperty} from "@nestjs/swagger";
import {CreateUserDto} from "../users/dto/createUser.dto";
import {UpdateUserDto} from "../users/dto/updateUser.dto";

export class OrganizationUser implements OrganizationUserDocType {
  @ApiProperty()
  id!: string;
  @Exclude()
  bot?: boolean;
  @Exclude()
  email: string;
  @ApiProperty()
  avatarReadyPlayerMeImg?: string;
  @ApiResponseProperty()
  role: OrganizationRoles;
  @ApiProperty({type: Date})
  created: firebaseAdmin.firestore.Timestamp;
  @ApiProperty({type: Date})
  updated: firebaseAdmin.firestore.Timestamp;
  @ApiProperty({required: false})
  name?: string

  static ofDto(createOrganizationUserDto: CreateUserDto, userId: string) {
    const organizationUser = new OrganizationUser();
    organizationUser.id = userId;
    organizationUser.created = firebaseAdmin.firestore.Timestamp.now();
    organizationUser.updated = firebaseAdmin.firestore.Timestamp.now();
    organizationUser.role = "org_viewer";
    organizationUser.bot = false;
    organizationUser.email = "noreply+" + userId + "@odyssey.stream";
    organizationUser.name = createOrganizationUserDto.name;
    return organizationUser;
  }

  static ofUpdateDto(updateUserDto: UpdateUserDto, userId: string) {
    const organizationUser = new OrganizationUser();
    organizationUser.id = userId;
    organizationUser.updated = firebaseAdmin.firestore.Timestamp.now();
    if (updateUserDto.name != undefined) organizationUser.name = updateUserDto.name;
    return organizationUser;
  }
}
