"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const secret_manager_1 = require("@google-cloud/secret-manager");
(async () => {
    const client = new secret_manager_1.SecretManagerServiceClient();
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
//# sourceMappingURL=readGcloudSecret.js.map