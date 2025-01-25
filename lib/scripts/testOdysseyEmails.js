"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const misc_1 = require("../lib/misc");
[
    ["max@newgameplus.live", true],
    ["bram@odyssey.stream", true],
    ["Bram+testing23984724.Horton@newgameplus.live", true],
    ["bram@newgamplus.live", false],
    ["bram@odyssee.stream", false],
    ["martin@tpnevents.com", false],
].forEach(([email, expectation]) => ((0, misc_1.isOdysseyStaffEmail)(email) != expectation) && console.error(`Email failed test ${email}. Should ${expectation ? "" : "not"} match`));
//# sourceMappingURL=testOdysseyEmails.js.map