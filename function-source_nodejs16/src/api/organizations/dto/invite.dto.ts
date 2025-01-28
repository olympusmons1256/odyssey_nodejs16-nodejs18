import {ArrayMaxSize, IsEmail, IsNotEmpty, Validate, ValidateNested, ValidatorConstraint, ValidatorConstraintInterface} from "class-validator";
import {ApiProperty} from "@nestjs/swagger";
import {OrganizationRoles, ORGANIZATION_ROLES} from "../../../lib/docTypes";
import {Type} from "class-transformer";

@ValidatorConstraint({name: "organizationRole", async: false})
export class IsOrganizationRole implements ValidatorConstraintInterface {
  validate(text: string) {
    console.debug("Validating organization roles");
    return ORGANIZATION_ROLES.map((v) => v.toString()).includes(text);
  }
  defaultMessage() {
    // here you can provide default error message if validation failed
    return "Field ($value) is not a valid organization role. Try one of these: " + ORGANIZATION_ROLES.map((v) => "\"" + v + "\"").join(",");
  }
}

export class InviteUserToOrganizationDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  email: string;
  @ApiProperty()
  @IsNotEmpty()
  @Validate(IsOrganizationRole)
  organizationRole: OrganizationRoles;
}

export class InviteUsersToOrganizationDto {
  @ApiProperty({type: [InviteUserToOrganizationDto], maxItems: 10})
  @IsNotEmpty()
  @ArrayMaxSize(10)
  @ValidateNested({each: true})
  @Type(() => InviteUserToOrganizationDto)
  users: InviteUserToOrganizationDto[];
  @ApiProperty({required: false})
  sendInviteEmails?: boolean = false;
  @ApiProperty({required: false})
  inviterName?: string;
}

export class InviteUserToSpaceDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class InviteUsersToSpaceDto {
  @ApiProperty({type: [InviteUserToSpaceDto], maxItems: 10})
  @IsNotEmpty()
  @ArrayMaxSize(10)
  @ValidateNested({each: true})
  @Type(() => InviteUserToSpaceDto)
  users: InviteUserToSpaceDto[];
  @ApiProperty({required: false})
  sendInviteEmails?: boolean = false;
  @ApiProperty({required: false})
  inviterName?: string;
}

export interface IInviteUserResultDto {
  email: string
  statusCode: number
  inviteLink?: string
  inviteId?: string
  error?: string
}

export class InviteUserResultDto implements IInviteUserResultDto {
  @ApiProperty()
  email: string
  @ApiProperty()
  statusCode: number
  @ApiProperty({required: false})
  inviteLink?: string
  @ApiProperty({required: false})
  inviteId?: string
  @ApiProperty({required: false})
  error?: string

  constructor(
    email: string,
    statusCode: number,
    inviteLink?: string,
    inviteId?: string,
    error?: string,
  ) {
    this.email = email;
    this.statusCode = statusCode;
    this.inviteLink = inviteLink;
    this.inviteId = inviteId;
    this.error = error;
  }
}

export interface IInviteUsersResultDto {
  results: IInviteUserResultDto[]
  errorCount: number
}

export class InviteUsersResultDto implements IInviteUsersResultDto {
  @ApiProperty({type: [InviteUserResultDto]})
  results: InviteUserResultDto[]
  @ApiProperty()
  errorCount: number

  constructor(
    results: InviteUserResultDto[]
  ) {
    this.results = results;
    this.errorCount = results.reduce((acc, result) => result.error == undefined ? acc : acc + 1, 0);
  }
}

