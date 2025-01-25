// prices
const objectGbPerMonth = 0.026;
// const objectGbPerMonth = 0.03;
const downloadPerGb = 0.12;
// const downloadPerGb = 0;
const cpuPerHour = 0.035;
const pvcPerMonth = 0.07;

// sizes
const projectSizeGb = 20;
const packagedSizeGb = projectSizeGb * 0.5;
const buildTimeHours = (projectSizeGb / 10 > 1) ? projectSizeGb / 10 : 1;
const buildCpus = 16;
const regionCount = 3;
const volumeCopyCpus = 2;
const volumeCopyTimeHours = packagedSizeGb / (30 * volumeCopyCpus);
console.debug({
  buildTimeHours,
  volumeCopyTimeHours,
});

// dependencies
const packageDownloadCost = packagedSizeGb * downloadPerGb;
const projectDownloadCost = projectSizeGb * downloadPerGb;
console.debug({
  packageDownloadCost,
  projectDownloadCost,
});

// ongoings
const projectStorageCostMonth = projectSizeGb * objectGbPerMonth;
const packageStorageCostMonth = packagedSizeGb * objectGbPerMonth;
const pvcCostMonthly = regionCount * pvcPerMonth * packagedSizeGb;
console.debug({
  projectStorageCostMonth,
  packageStorageCostMonth,
  pvcCostMonthly,
});

// build & volume copy
const builderCost = (buildTimeHours * buildCpus * cpuPerHour) + projectDownloadCost;
const volumeCopyDownloadCost = regionCount * packageDownloadCost;
const volumeCopyComputeCost = volumeCopyCpus * regionCount * cpuPerHour * volumeCopyTimeHours;
console.debug({
  builderCost,
  volumeCopyDownloadCost,
  volumeCopyComputeCost,
});

// Final result
const monthly = projectStorageCostMonth + packageStorageCostMonth + pvcCostMonthly;
const buildCost = builderCost + volumeCopyDownloadCost + volumeCopyComputeCost;
console.log(`FINAL: Build: ${buildCost}, Monthly: ${monthly}`);

