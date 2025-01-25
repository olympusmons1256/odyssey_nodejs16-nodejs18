
```typescript
type DeploymentState =
| "new" // Has just been created
| "provisioning" // Provisioning resources
| "failed-provisioning" // Something in the deployment of resources failed
| "timed-out-provisioning" // Timed out during deployment of resources
| "pending" // All resources provisioned but not yet allocated (e.g. pod state _Pending_)
| "creating" // All resources allocated and waiting for ready (e.g. container images being pulled)
| "running"  // All resources running aka all pods ready
| "deprovisioning" // In the process of removing all resources
| "failed-deprovisioning" // Something in the process of resource deletion failed
| "timed-out-deprovisioning" // Timed out during deletion of resources
| "deprovisioned" // All resources deleted
```

```typescript
interface Participant {
  created: admin.firestore.Timestamp
  updated: admin.firestore.Timestamp
  userId: string
  deviceId: string
  workloadClusterProviders: Array<"gke" | "coreweave">
  workloadClusterProvider: "gke" | "coreweave"
  state: DeploymentState
}
```

```typescript
interface Deployment {
  id: $(uuid)-gke
  created: admin.firestore.Timestamp
  updated: admin.firestore.Timestamp
  userId: string
  deviceId: string
  state: DeploymentState
  statesChanges : Array<[DeploymentState, number]>
  signallingUrl: string
  took: number
  workloadClusterProvider: "gke"
}
```


1. New participant (created by frontend)

```typescript
interface Participant {
  // id: mhvXdrZT4jP5T8vBxuvm75
  created: 16737842987
  updated: 16737842987
  userId: "jalksdjfklsajf"
  deviceId: "lajkljalkb"
}
```
2. Update participant from backend


```typescript
interface Participant {
  // id: mhvXdrZT4jP5T8vBxuvm75
  created: 16737842987
  updated: 16737841786
  userId: "jalksdjfklsajf"
  deviceId: "lajkljalkb"
  state: "new"
  workloadClusterProviders: ["gke", "coreweave"]
}
```

3. Create new deployments
  + onUpdate of Participant
  1. if `state == new`
  2. Check for existing Deployments matching deviceId / userId combination
  3. Create new Deployments, from Participant

```typescript
interface Deployment {
  // id: mhvXdrZT4jP5T8vBxuvm75-gke
  created: 16737843191
  updated: 16737843191
  userId: "jalksdjfklsajf"
  deviceId: "lajkljalkb"
  state: "new"
  stateChanges : [
    ["new", 16737843191 ]
  ]
  workloadClusterProvider: "gke"
}
```

```typescript
interface Deployment {
  // id: mhvXdrZT4jP5T8vBxuvm75-coreweave
  created: 16737843279
  updated: 16737843279
  userId: "jalksdjfklsajf"
  deviceId: "lajkljalkb"
  state: "new"
  stateChanges : [
    ["new", 16737843279 ]
  ]
  workloadClusterProvider: "coreweave"
}
```

4. States change based on provisioning state, updating the timestamp of each state

In this case, the coreweave session completed first

```typescript
interface Deployment {
  // id: mhvXdrZT4jP5T8vBxuvm75-coreweave
  created: 16737843279
  updated: 16737850279
  userId: "jalksdjfklsajf"
  deviceId: "lajkljalkb"
  state: "running"
  signallingUrl: "https://odyssey-client-lkuui89auasdf.ingress.whatever.coreweave.com"
  stateChanges : [
    [ "new", 16737843279 ],
    [ "pending", 16737845279 ],
    [ "creating", 16737850279 ],
    [ "running", 16737850279 ]
  ]
  workloadClusterProvider: "coreweave"
}
```

```typescript
interface Deployment {
  // id: mhvXdrZT4jP5T8vBxuvm75-gke
  created: 16737843191
  updated: 16737859887
  userId: "jalksdjfklsajf"
  deviceId: "lajkljalkb"
  state: "failed-provisioning"
  stateChanges : [
    [ "new", 16737843191 ],
    [ "failed-provisioning", 16737845279 ]
  ]
  workloadClusterProvider: "gke"
}
```

5. Choose winner
  + onUpdate of Deployment
  + lookup all deployments
  + determine winner if one exists
  + if (state == "running")
  + if this deployment is the winner
    + set
      - participant.state == "running"
      - participant.signallingUrl == signallingUrl
      - participant.workloadClusterProvider = workloadClusterProvider
    + set all other deployments
      state = "deprovisioning"
  + else if (state != "running")
  + if a winner exists
    + set all other deployments
      state = "deprovisioning"

```typescript
interface Participant {
  // id: mhvXdrZT4jP5T8vBxuvm75
  created: 16737842987
  updated: 16737851355
  userId: "jalksdjfklsajf"
  deviceId: "lajkljalkb"
  state: "running"
  signallingUrl: "https://odyssey-client-lkuui89auasdf.ingress.whatever.coreweave.com"
  workloadClusterProvider: "coreweave"
  workloadClusterProviders: ["gke", "coreweave"]
}
```

6. Set loser to deprovisioning

7. On (state == "deprovisioning")
  - Deprovision resources
  - Set state == "deprovisioned"