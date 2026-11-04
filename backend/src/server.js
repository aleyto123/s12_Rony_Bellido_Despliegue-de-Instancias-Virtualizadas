const { start } = require('./app');

start().catch((error) => {
  console.error('No se pudo iniciar la API:', error);
  process.exitCode = 1;
});
