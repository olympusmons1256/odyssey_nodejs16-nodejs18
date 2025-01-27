const staticSignallingProxy = "https://ingress.odyssey-testing.newgameplus.live/signalling-proxy";
const host = "odyssey-client-fg7tjichbdmzmkm7vlwm0mdkapj3-hibkxnpcb7ikfuaxlly.tenant-newgame.ord1.ingress.coreweave.cloud";
// console.log(staticSignallingProxy + "/" + host.replace("(.*?)\\.(.*)", "$1/$2"));
console.log(staticSignallingProxy + "/" + host.replace(new RegExp("(.*?)\\.(.*)"), "$1/$2"));
//# sourceMappingURL=test-replace.js.map