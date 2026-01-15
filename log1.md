Name:             zk-backend-57f64c6d86-rc7jd
Namespace:        default
Priority:         0
Service Account:  default
Node:             aks-default-92378540-vmss000000/10.224.0.4
Start Time:       Thu, 15 Jan 2026 09:39:56 +0100
Labels:           app=zk-backend
                  pod-template-hash=57f64c6d86
Annotations:      <none>
Status:           Running
IP:               10.244.0.241
IPs:
  IP:           10.244.0.241
Controlled By:  ReplicaSet/zk-backend-57f64c6d86
Containers:
  zk-backend:
    Container ID:   containerd://2e69b889bb9a20cf2f09d6b04d0969b389b9f0f0e4bcaaa74cb0980ba7f0edda
    Image:          nonzzo/zk-rollup-backend:7abb8a19e93e3b97ac9cf309a99b5c4dedfef3d6
    Image ID:       docker.io/nonzzo/zk-rollup-backend@sha256:a193b909bbba0dcd84d9a5f11f6eca925fcfab4dc0bedfcbce38d35ac9ccdd87
    Port:           3000/TCP
    Host Port:      0/TCP
    State:          Waiting
      Reason:       CrashLoopBackOff
    Last State:     Terminated
      Reason:       Error
      Exit Code:    1
      Started:      Thu, 15 Jan 2026 09:45:55 +0100
      Finished:     Thu, 15 Jan 2026 09:45:55 +0100
    Ready:          False
    Restart Count:  6
    Environment:
      DATABASE_URL:     postgres://admin:password@postgres:5432/zkrollup
      SEPOLIA_RPC_URL:  <set to the key 'SEPOLIA_RPC_URL' in secret 'backend-secrets'>  Optional: false
      PRIVATE_KEY:      <set to the key 'PRIVATE_KEY' in secret 'backend-secrets'>      Optional: false
      ROLLUP_ADDRESS:   <set to the key 'ROLLUP_ADDRESS' in secret 'backend-secrets'>   Optional: false
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-npbbq (ro)
Conditions:
  Type                        Status
  PodReadyToStartContainers   True 
  Initialized                 True 
  Ready                       False 
  ContainersReady             False 
  PodScheduled                True 
Volumes:
  kube-api-access-npbbq:
    Type:                    Projected (a volume that contains injected data from multiple sources)
    TokenExpirationSeconds:  3607
    ConfigMapName:           kube-root-ca.crt
    Optional:                false
    DownwardAPI:             true
QoS Class:                   BestEffort
Node-Selectors:              <none>
Tolerations:                 node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                             node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Events:
  Type     Reason     Age                     From               Message
  ----     ------     ----                    ----               -------
  Normal   Scheduled  9m1s                    default-scheduler  Successfully assigned default/zk-backend-57f64c6d86-rc7jd to aks-default-92378540-vmss000000
  Normal   Pulling    9m1s                    kubelet            Pulling image "nonzzo/zk-rollup-backend:7abb8a19e93e3b97ac9cf309a99b5c4dedfef3d6"
  Normal   Pulled     8m54s                   kubelet            Successfully pulled image "nonzzo/zk-rollup-backend:7abb8a19e93e3b97ac9cf309a99b5c4dedfef3d6" in 6.895s (6.895s including waiting). Image size: 178999241 bytes.
  Warning  BackOff    3m16s (x26 over 8m48s)  kubelet            Back-off restarting failed container zk-backend in pod zk-backend-57f64c6d86-rc7jd_default(b23a82fd-b5f6-43f9-946a-50ed152a52f4)
  Normal   Created    3m3s (x7 over 8m54s)    kubelet            Created container: zk-backend
  Normal   Started    3m3s (x7 over 8m54s)    kubelet            Started container zk-backend
  Normal   Pulled     3m3s (x6 over 8m49s)    kubelet            Container image "nonzzo/zk-rollup-backend:7abb8a19e93e3b97ac9cf309a99b5c4dedfef3d6" already present on machine


====== postgres logs======

Name:             postgres-858fd54fb8-ddjch
Namespace:        default
Priority:         0
Service Account:  default
Node:             aks-default-92378540-vmss000000/10.224.0.4
Start Time:       Thu, 15 Jan 2026 09:39:58 +0100
Labels:           app=postgres
                  pod-template-hash=858fd54fb8
Annotations:      <none>
Status:           Running
IP:               10.244.0.134
IPs:
  IP:           10.244.0.134
Controlled By:  ReplicaSet/postgres-858fd54fb8
Containers:
  postgres:
    Container ID:   containerd://729e1c31f28ccd29ebe11572196fbda80ce7534dfaff4f92fd0b3a625e436566
    Image:          postgres:15-alpine
    Image ID:       docker.io/library/postgres@sha256:b3968e348b48f1198cc6de6611d055dbad91cd561b7990c406c3fc28d7095b21
    Port:           5432/TCP
    Host Port:      0/TCP
    State:          Waiting
      Reason:       CrashLoopBackOff
    Last State:     Terminated
      Reason:       Error
      Exit Code:    1
      Started:      Thu, 15 Jan 2026 09:51:20 +0100
      Finished:     Thu, 15 Jan 2026 09:51:20 +0100
    Ready:          False
    Restart Count:  7
    Environment:
      POSTGRES_USER:      admin
      POSTGRES_PASSWORD:  password
      POSTGRES_DB:        zkrollup
    Mounts:
      /var/lib/postgresql/data from postgres-storage (rw)
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-csmfh (ro)
Conditions:
  Type                        Status
  PodReadyToStartContainers   True 
  Initialized                 True 
  Ready                       False 
  ContainersReady             False 
  PodScheduled                True 
Volumes:
  postgres-storage:
    Type:       PersistentVolumeClaim (a reference to a PersistentVolumeClaim in the same namespace)
    ClaimName:  postgres-pvc
    ReadOnly:   false
  kube-api-access-csmfh:
    Type:                    Projected (a volume that contains injected data from multiple sources)
    TokenExpirationSeconds:  3607
    ConfigMapName:           kube-root-ca.crt
    Optional:                false
    DownwardAPI:             true
QoS Class:                   BestEffort
Node-Selectors:              <none>
Tolerations:                 node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                             node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Events:
  Type     Reason                  Age                  From                     Message
  ----     ------                  ----                 ----                     -------
  Normal   Scheduled               12m                  default-scheduler        Successfully assigned default/postgres-858fd54fb8-ddjch to aks-default-92378540-vmss000000
  Normal   SuccessfulAttachVolume  12m                  attachdetach-controller  AttachVolume.Attach succeeded for volume "pvc-9e3947ea-e8f9-4162-b5ec-353e97dcf387"
  Normal   Pulling                 12m                  kubelet                  Pulling image "postgres:15-alpine"
  Normal   Pulled                  12m                  kubelet                  Successfully pulled image "postgres:15-alpine" in 4.864s (4.864s including waiting). Image size: 109148447 bytes.
  Warning  BackOff                 112s (x49 over 11m)  kubelet                  Back-off restarting failed container postgres in pod postgres-858fd54fb8-ddjch_default(7d4667c1-48b1-4b41-86aa-d6c5383b3658)
  Normal   Created                 63s (x8 over 12m)    kubelet                  Created container: postgres
  Normal   Started                 63s (x8 over 12m)    kubelet                  Started container postgres
  Normal   Pulled                  63s (x7 over 12m)    kubelet                  Container image "postgres:15-alpine" already present on machine


===== backend logs =====

node:internal/modules/cjs/loader:1386
  throw err;
  ^

Error: Cannot find module 'dotenv'
Require stack:
- /app/src/api.js
    at Function._resolveFilename (node:internal/modules/cjs/loader:1383:15)
    at defaultResolveImpl (node:internal/modules/cjs/loader:1025:19)
    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1030:22)
    at Function._load (node:internal/modules/cjs/loader:1192:37)
    at TracingChannel.traceSync (node:diagnostics_channel:328:14)
    at wrapModuleLoad (node:internal/modules/cjs/loader:237:24)
    at Module.require (node:internal/modules/cjs/loader:1463:12)
    at require (node:internal/modules/helpers:147:16)
    at Object.<anonymous> (/app/src/api.js:1:1)
    at Module._compile (node:internal/modules/cjs/loader:1706:14) {
  code: 'MODULE_NOT_FOUND',
  requireStack: [ '/app/src/api.js' ]
}

Node.js v22.22.0

======= postgres logs ======



The files belonging to this database system will be owned by user "postgres".
This user must also own the server process.

The database cluster will be initialized with locale "en_US.utf8".
The default database encoding has accordingly been set to "UTF8".
The default text search configuration will be set to "english".

Data page checksums are disabled.

initdb: error: directory "/var/lib/postgresql/data" exists but is not empty
initdb: detail: It contains a lost+found directory, perhaps due to it being a mount point.
initdb: hint: Using a mount point directly as the data directory is not recommended.
Create a subdirectory under the mount point.
