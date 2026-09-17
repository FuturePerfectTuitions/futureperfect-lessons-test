// Production student portal runtime configuration.
window.FPT_V2_CONFIG = Object.freeze({
  environment: "production",
  workerBaseUrl: "https://fpt-portal-v2-worker.futureperfectlessons.workers.dev"
});

document.write('<script src="assets/personalise-portal.js"></script>');

// Step 10 preparation only: the practice link stays hidden unless the Portal Worker
// confirms current L3 Maths 11+ eligibility. This branch is not production-deployed.
document.write('<link rel="stylesheet" href="assets/step10-practice-link.css">');
document.write('<script src="assets/step10-practice-link.js"></script>');

if (/\/phase11\.html$/.test(window.location.pathname)) {
  document.write('<script src="assets/phase11-vr-howto.js"></script>');
}
