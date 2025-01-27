import {Collection} from "fireorm";
import {Exclude} from "class-transformer";
import {AuthClient as AuthClientDocType} from "../lib/docTypes";
import * as firebaseAdmin from "firebase-admin";
import {ApiProperty} from "@nestjs/swagger";

@Collection("authClients")
export class AuthClient implements AuthClientDocType {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  name: string;
  @ApiProperty({type: Date})
  created: firebaseAdmin.firestore.Timestamp;
  @ApiProperty({type: Date})
  updated: firebaseAdmin.firestore.Timestamp;
  @Exclude()
  secret: string;
  @ApiProperty()
  organizationId: string;
}
