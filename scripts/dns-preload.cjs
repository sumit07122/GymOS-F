const dns = require("dns");
const resolver = new dns.Resolver();
resolver.setServers(["8.8.8.8", "1.1.1.1"]);

const origLookup = dns.lookup;
dns.lookup = function (hostname, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }
  if (hostname && (hostname.includes("neon.tech") || hostname.includes("resend.com") || hostname.includes("resend.dev"))) {
    return resolver.resolve4(hostname, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        return origLookup(hostname, options, callback);
      }
      if (options && options.all) {
        callback(null, addresses.map((a) => ({ address: a, family: 4 })));
      } else {
        callback(null, addresses[0], 4);
      }
    });
  }
  return origLookup(hostname, options, callback);
};

