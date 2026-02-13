const path = require('path');

const backendRoot = path.resolve(__dirname, '..', '..');
const uploadsDir = path.join(backendRoot, 'uploads');
const uploadsSubdir = (...parts) => path.join(uploadsDir, ...parts);

module.exports = {
  backendRoot,
  uploadsDir,
  uploadsSubdir,
};

