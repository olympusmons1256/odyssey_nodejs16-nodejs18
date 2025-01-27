1. New participant is created

DONE onCreate of Participant

	1. resolve workloadClusterProviders of user
	2. if Gke is one, resolve Gke accelerator
	3. denormalize participant details as item in relevant gkeParticipants document list

/system/operations/gkeParticipants/nvidia-tesla-p100
/system/operations/gkeParticipants/nvidia-tesla-t4

Denormalized GkeParticipant
```ts
{
	export interface GkeParticipantDenormalized {
		created: admin.firestore.Timestamp
		updated: admin.firestore.Timestamp
		userId: string
		deviceId: string
	}

	export interface GkeParticipantsDenormalized {
    updated: admin.firestore.Timestamp
    participants: Array<GkeParticipantDenormalized>
	}
}
```

onUpdate of /system/operations/gkeParticipantsDenormalized/nvidia-tesla-t4

1. Resolve GKE cluster with GPU type (e.g. tesla T4)
2. Scale GKE cluster to new number

onDelete of Participant

1. Resolve GKE accelerator from user/system/organization configuration
2. Delete denormalized participant details item from gkeParticipants

onUpdate of minP100NodeCount
onUpdate of minT4NodeCount