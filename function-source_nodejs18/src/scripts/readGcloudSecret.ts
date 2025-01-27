import {SecretManagerServiceClient} from "@google-cloud/secret-manager";

(async () => {
  const client = new SecretManagerServiceClient();
  const secrets = await client.listSecrets({
    // parent: "ngp-odyssey-testing",
    parent: "projects/285777766823",
  });
  console.debug(secrets);
  const r = await client.getSecret({
    name: "projects/285777766823/secrets/STRIPE_SECRETKEY",
  });
  console.debug(r);
})();
