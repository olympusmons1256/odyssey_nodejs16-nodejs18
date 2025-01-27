import {isOdysseyStaffEmail} from "../lib/misc";

type TestInput = [string, boolean];
([
  ["max@newgameplus.live", true],
  ["bram@odyssey.stream", true],
  ["Bram+testing23984724.Horton@newgameplus.live", true],
  ["bram@newgamplus.live", false],
  ["bram@odyssee.stream", false],
  ["martin@tpnevents.com", false],
] as TestInput[]).forEach(([email, expectation]) => (isOdysseyStaffEmail(email) != expectation) && console.error(`Email failed test ${email}. Should ${expectation ? "" : "not"} match`));
