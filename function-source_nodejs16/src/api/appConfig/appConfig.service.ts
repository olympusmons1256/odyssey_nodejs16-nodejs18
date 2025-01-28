import * as functions from "firebase-functions";
import {Injectable} from "@nestjs/common";
import * as crypto from "crypto";

@Injectable()
export class AppConfigService {
  // NOTE: Checks if NEST is running on a server port, which is only used for local development
  public static checkTestListeningMode() {
    return process.env.NEST_PORT != undefined && process.env.NEST_PORT != null && !isNaN(+process.env.NEST_PORT);
  }

  public static getJwtSigningKey() {
    try {
      const signingKeyBase64Encoded = functions.config().restapi.jwtprivatekeypembase64;
      const signingKey = Buffer.from(signingKeyBase64Encoded, "base64").toString("ascii");
      return signingKey;
    } catch (e: any) {
      if (AppConfigService.checkTestListeningMode() == true) {
        // NOTE: If in local development mode, use a hardcoded key
        const pemKey = Buffer.from("LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFb3dJQkFBS0NBUUVBeVUzQmFrbUg5aERKNVlpWWxHV0ZiZnFLazJDKzVVNGtEOWE2QTQzVzNrNTJrR1IwClBaNXQrOEg4Q3p1anZ3OUVKQTA4UUM4aHJYUi9wbjlHeDVRdlVZYi9QQktDRC9BRzB1T3hwNHlNeCtvZmpjZW8KMkk2aU5MSHJBVXVkRW5xT0FBaTVjMlBjMlNjSUc3MldLU2pqa21ueHhGZGZHK3Z2bjNhZ3lPU1ZKQjhXYmdLYwozVENpY3FEOVVMcWJPZ0hBTUExY2Vod1VTKyt3QXNJZ3pVaFN0ZkIwc1R2N3BnZHNaZUZWTkFrUWVOcGFqSEkwCk5kWVlkcnFKcnZJOEhyOU5hRFJmTHFhQ1BYcWFhOWJlQmZMUnpYRDNQcy92K05WZVdGaTJNUW43K2IxZUR4K1gKZ01oQk5maEdZNFR4SFVwdzJTWFFjWTJ4WTc4MUVMNHJnVEFTRHdJREFRQUJBb0lCQURIUDdORjVPb3lZSU8yTQpmSDBVRmcxZDF0YWJOUUdXOFhOOTVlK2xOSXMwRFVDenF0UG9sVHljQnR0Y3VhczRndHNNNzJET2lOM2NHdzQvCkptdVNicGNVK2FtS3h1WmN0Y09QbGxGb2hSbWZCSW5YNHg4YlJHWVh0SmhRZHFDdzlOeHJURUNTY0g3SG1za0sKZzlMUmpHYVprcnJNQi92bnlSYkRpd3ZMREdDd1pCUTFuOHBPUUNsMWRWUTA2ZHJiaitEZGh1TWNqLzhFMUpjcwpPcVQrQy9CdFYrZFpYc2JqMEh5L09sUlNUNGx4djNYelRYSURmcjA2WDJ3VE1XMmFpZWlLU0hTYUoyQzVhUUhkCk5RT1R6NGRqZm1Ibk1ibzJISFNPeml6RmZYeHNrOW1vVkR6M2RldWF4dmNJaExEdVJab2lVZjRwemQrMmxyRlMKV25RNmpRRUNnWUVBOFY1bjhxa2pPNEZGdFZiUkloN2JPbTA2N3hwSTh6VkhzQW5mOWkwRFlsT1lieG5yOE9rbwpTMWJQa2p3cXdkUnU4djNBNTk1VE5IdzZlQ0trWDBNNzNzcU1YM3d4OGwwMzIrekNmV3BUSk8vdUx1VHA3RzR2ClZTVjBTZ09oQTJQS0F1dzliM2hjb0R5ZXN0eGJjTG5nZjJKVzJUMHNteDJDRjJLSEhnUFBBWUVDZ1lFQTFZR2QKV1RUN3FzdVNOQ044L2NwSjJ3T1J3WjBWTFA5b0Jwb3J2MXQ2ck9CTGk3YUVYc2NmZzQzVnJlS29ab3ZGOURidApPeVZnVHJvbnVHbnRzKzJHa0w1a3AvNFBhQUMwUDc4KzlER1hzNkpnWTRVMHRsK3FoajZCcjVzTVpmL0xTWHZoCnF5MXhjSmJWdVRJMTVkWlY5elFwWHBnNmNVbW9MM0RxNjdyMXU0OENnWUFzSjU0U2VUaVZ5U2RNYmk1aDlJMGMKV2lFZTNvc2IydEpiZE9NQXNPbGVrblpmVkxtaDM3VmNXdXdzRDArdkY4S1lOeTJUL1VyeFhneUFMNjRzTXl0LwpyVVFTcjdDZmFzZ3VObGk2QXJwbEZuTlhKczlZVGl2Z2dyS01XNitYNUNodmNuSW1zemtXb3lCUkRoaTRQWGpCCk5PYzRaSVdGZHRkMm1iS29IZ0EvZ1FLQmdBT0ZqTXZnNU5uUFc4MENYTmh1MHNNTER3ZHJpT0xpSDV3a1JONTIKS3RMWkxFWFVyK0JFVm8rNzhpOVpFc0FHUkRDZ0MwK3pjU0E3VDlacDRPTGI0eUZXRXFEMnZ0aFBVcW5PaE1KUQpZeGt5YjNhVXh1YlBNeWZkdGhQb2NjN281amlERTVqWU9ndktZU0laNHV1MG1seG1mdHd4bEowend0TnRnR0o5CkJmcWZBb0dCQUxqQTRhV0xmUUtMQ1VxSy9YbzI4SzhFeGV3dklyNHQ0R0tIZ3pZTFdheVUwOG1iY1BqaU1sUWgKOEN4MllveW5Bck5LYnlxYVMwOEtHbEttVnk0LzQ0Z2dUdkFuNnE2TGJLTWV0L0NYZ0FkWm1rN3h4UzdIbXNoSQphcXM3NXJ1cmhiSU9QYlFGS2YvRlZHNXZ6TkFudDB4OVhSRGZnV2ZvdWJkbkpWY3kzbjZKCi0tLS0tRU5EIFJTQSBQUklWQVRFIEtFWS0tLS0tCg==", "base64").toString("ascii");
        const hash = crypto.createHash("sha256").update(pemKey).digest("hex");
        console.log(`Using insecure signing key: ${hash}`);
        return pemKey;
      }
      console.error("Failed to get REST API signing key from firebase functions config");
      throw e;
    }
  }

  public static getJwtVerifyKey() {
    try {
      const verifyKeyBase64Encoded = functions.config().restapi.jwtpublickeypembase64;
      const verifyKey = Buffer.from(verifyKeyBase64Encoded, "base64").toString("ascii");
      return verifyKey;
    } catch (e: any) {
      if (AppConfigService.checkTestListeningMode() == true) {
        // NOTE: If in local development mode, use a hardcoded key
        const pemKey = Buffer.from("LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUF5VTNCYWttSDloREo1WWlZbEdXRgpiZnFLazJDKzVVNGtEOWE2QTQzVzNrNTJrR1IwUFo1dCs4SDhDenVqdnc5RUpBMDhRQzhoclhSL3BuOUd4NVF2ClVZYi9QQktDRC9BRzB1T3hwNHlNeCtvZmpjZW8ySTZpTkxIckFVdWRFbnFPQUFpNWMyUGMyU2NJRzcyV0tTamoKa21ueHhGZGZHK3Z2bjNhZ3lPU1ZKQjhXYmdLYzNUQ2ljcUQ5VUxxYk9nSEFNQTFjZWh3VVMrK3dBc0lnelVoUwp0ZkIwc1R2N3BnZHNaZUZWTkFrUWVOcGFqSEkwTmRZWWRycUpydkk4SHI5TmFEUmZMcWFDUFhxYWE5YmVCZkxSCnpYRDNQcy92K05WZVdGaTJNUW43K2IxZUR4K1hnTWhCTmZoR1k0VHhIVXB3MlNYUWNZMnhZNzgxRUw0cmdUQVMKRHdJREFRQUIKLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg==", "base64").toString("ascii");
        const hash = crypto.createHash("sha256").update(pemKey).digest("hex");
        console.log(`Using insecure verify key: ${hash}`);
        return pemKey;
      }
      console.error("Failed to get REST API verify key from firebase functions config");
      throw e;
    }
  }
}
