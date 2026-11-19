// Where the AquaSite API lives. Override for a single visit with ?api=https://...
(() => {
  const override = new URLSearchParams(location.search).get('api');
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  window.AQUASITE_API = (override || (local ? 'http://localhost:8080' : 'https://api.markuspetersen.com')).replace(/\/$/, '');
})();
