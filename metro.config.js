const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite sul web gira su wa-sqlite, che arriva come modulo WASM: senza
// queste due righe Metro non lo impacchetta e il bundle web non si costruisce.
// Sul nativo non cambia niente.
config.resolver.assetExts.push('wasm');

// wa-sqlite usa SharedArrayBuffer, che i browser concedono solo a pagine
// isolate: da qui gli header che il dev server deve mandare.
config.server = config.server ?? {};
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  return middleware(req, res, next);
};

module.exports = config;
