import {OrgSpace as SpaceDocType} from "../../lib/cmsDocTypes";
import {RegistrationInfoFields as RegistrationInfoFieldsDocType} from "../../lib/docTypes";
import * as firebaseAdmin from "firebase-admin";
import {SpaceItem} from "./item.entity";
import {ISubCollection, SubCollection} from "fireorm";
import {Exclude} from "class-transformer";
import {CreateSpaceDto} from "./dto/createSpace.dto";
import {SpaceTemplate} from "../spaceTemplates/spaceTemplate.entity";
import {UpdateSpaceDto} from "./dto/updateSpace.dto";
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";

export class RegistrationInfoFields implements RegistrationInfoFieldsDocType {
  @ApiProperty()
  email: boolean;
  @ApiProperty()
  phone: boolean;
  @ApiProperty()
  fullName: boolean;
}

export class Space implements SpaceDocType {
  @ApiProperty()
  id!: string;
  @ApiPropertyOptional({type: Date})
  created?: firebaseAdmin.firestore.Timestamp;
  @ApiProperty()
  description: string
  @ApiPropertyOptional()
  enableSharding?: boolean
  @ApiPropertyOptional()
  infoFields?: RegistrationInfoFields
  @ApiPropertyOptional()
  isLiveStreamActive?: boolean
  @ApiPropertyOptional()
  isPublic?: boolean
  @ApiProperty()
  name: string
  @ApiPropertyOptional()
  persistentLiveStream?: string
  @Exclude()
  rooms: string[]
  @ApiProperty()
  spaceTemplateId: string
  @ApiProperty()
  thumb: string
  @Exclude()
  ueId: string
  @ApiPropertyOptional({type: Date})
  updated?: firebaseAdmin.firestore.Timestamp;
  @ApiPropertyOptional()
  disableComms?: boolean

  @Exclude()
  @SubCollection(SpaceItem, "spaceItems")
  items?: ISubCollection<SpaceItem>;

  static ofDto(createSpaceDto: CreateSpaceDto, spaceTemplate: SpaceTemplate) {
    const space = new Space();
    space.created = firebaseAdmin.firestore.Timestamp.now();
    space.updated = firebaseAdmin.firestore.Timestamp.now();
    space.thumb = createSpaceDto.thumb || spaceTemplate.thumb;
    space.persistentLiveStream = createSpaceDto.persistentLiveStream;
    space.disableComms = createSpaceDto.disableComms;
    space.isLiveStreamActive = createSpaceDto.isLiveStreamActive;
    space.infoFields = createSpaceDto.infoFields;
    space.spaceTemplateId = createSpaceDto.spaceTemplateId;
    space.enableSharding = createSpaceDto.enableSharding;
    space.isPublic = createSpaceDto.isPublic;
    space.name = createSpaceDto.name;
    space.ueId = spaceTemplate.ueId;
    return space;
  }

  static ofUpdateDto(updateSpaceDto: UpdateSpaceDto, spaceId: string) {
    const space = new Space();
    space.id = spaceId;
    space.updated = firebaseAdmin.firestore.Timestamp.now();
    if (updateSpaceDto.thumb != undefined) space.thumb = updateSpaceDto.thumb;
    if (updateSpaceDto.persistentLiveStream != undefined) space.persistentLiveStream = updateSpaceDto.persistentLiveStream;
    if (updateSpaceDto.disableComms != undefined) space.disableComms = updateSpaceDto.disableComms;
    if (updateSpaceDto.isLiveStreamActive != undefined) space.isLiveStreamActive = updateSpaceDto.isLiveStreamActive;
    if (updateSpaceDto.infoFields != undefined) space.infoFields = updateSpaceDto.infoFields;
    if (updateSpaceDto.enableSharding != undefined) space.enableSharding = updateSpaceDto.enableSharding;
    if (updateSpaceDto.isPublic != undefined) space.isPublic = updateSpaceDto.isPublic;
    if (updateSpaceDto.name != undefined) space.name = updateSpaceDto.name;
    return space;
  }
}
