#!/bin/sh
firebase functions:delete --force rooms.newRoomAddId rooms.onCreateRoomAddToSpace rooms.onCreateSpaceAddNewRoom rooms.onCreateRoomCreateHistoricRoom
firebase deploy -f --only functions:rooms.creates

firebase functions:delete --force rooms.onUpdateRoomStateReact rooms.onUpdateSpaceUpdateRooms rooms.onUpdateRoomUpdateHistoricRoom rooms.onUpdateRoomUpdateShards
firebase deploy -f --only functions:rooms.updates

firebase functions:delete --force rooms.deletedRoomDeleteShards rooms.deletedRoomRemoveShardFromOriginal rooms.deletedRoomDeleteGameServer rooms.deletedRoomDeleteSubcollections rooms.onDeleteRoomRemoveFromSpace
firebase deploy -f --only functions:rooms.deletes

firebase functions:delete --force users.addVisitor users.createOrgUser users.createRtdbUserDeviceStatus users.createSpaceUser users.createUser users.createUserAddAvatar users.sendSignInLink
firebase deploy -f --only functions:users.creates

firebase functions:delete --force users.updateRtdbUserDeviceStatus users.updateUserAvatarClothing users.updateUserDenormalizeParticipants users.updateUserDeviceStatus users.updateUsersOrganizationRole users.updateUsersSpaceRole
firebase deploy -f --only functions:users.updates

firebase functions:delete --force users.deleteDevice users.deleteOrganizationUser users.deleteRtdbUserDeviceStatus users.deleteSpaceUser users.deleteUserDeviceStatus users.deletedUserDeleteSubcollections
firebase deploy -f --only functions:users.deletes

firebase functions:delete --force rooms.newParticipantDenormalize rooms.newParticipantIncrementCount rooms.newParticipantNewRoomShard rooms.newParticipantNewDeployments rooms.newParticipantAddHistory rooms.newDeploymentNewStreamingSession
firebase deploy -f --only functions:participants.creates

firebase functions:delete --force rooms.updateDeploymentStateReact rooms.onUpdateParticipantCountScaleGameServer rooms.afkCheck
firebase deploy -f --only functions:participants.updates

firebase functions:delete --force rooms.deletedParticipantDenormalize rooms.deletedParticipantDecrementCount rooms.deletedParticipantDeprovisionDeployments rooms.deletedParticipantAddHistory
firebase deploy -f --only functions:participants.deletes

firebase functions:delete --force invites.createNewInviteLink invites.inviteOrganizationUser invites.inviteSpaceGuest
firebase deploy -f --only functions:invites.creates

firebase functions:delete --force invites.acceptInvite invites.rejectInvite
firebase deploy -f --only functions:invites.updates

firebase functions:delete --force invites.getInviteLinkFromInvitePath invites.getDataFromInvite
firebase deploy -f --only functions:invites.reads

firebase functions:delete --force invites.deletedOrganizationInviteSubcollections invites.deletedSpaceInviteSubcollections
firebase deploy -f --only functions:invites.deletes
