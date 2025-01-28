import {Exclude} from "class-transformer";
import {Collection} from "fireorm";
import {SpaceTemplate as SpaceTemplateDocType} from "../../lib/cmsDocTypes";
import * as firebaseAdmin from "firebase-admin";
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";

@Collection("spaceTemplates")
export class SpaceTemplate implements SpaceTemplateDocType {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  type: string;
  @Exclude()
  ueId: string;
  @ApiProperty()
  thumb: string;
  @ApiProperty()
  public: boolean;
  @ApiPropertyOptional({type: Date})
  created?: firebaseAdmin.firestore.Timestamp;
  @Exclude()
  orgOwner: string[];
  @Exclude()
  pakState: "not-packaged" | "ready";
  @ApiPropertyOptional({type: Date})
  updated?: firebaseAdmin.firestore.Timestamp;
  @ApiProperty()
  description: string;
}
