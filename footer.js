// footer.js — Future Perfect Tuitions portal footer (auto year + links)
(function () {
  const el = document.getElementById("siteFooter");
  if (!el) return;

  const year = new Date().getFullYear();

  el.innerHTML = `
    <div class="footerInner">
      <div class="footerCopy">© Future Perfect Tuitions ${year}</div>
      <div class="footerLinks">
        <a href="privacy.html">Privacy</a>
        <span class="footerSep">|</span>
        <a href="terms.html">Terms</a>
      </div>
    </div>
  `;
})();
