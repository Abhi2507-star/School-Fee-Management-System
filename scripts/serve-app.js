import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const htmlFile = path.join(projectRoot, 'swami_vivekanand_sfms.html');

const PORT = Number(process.env.APP_PORT || 8080);
const HOST = process.env.APP_HOST || '0.0.0.0';

if (!fs.existsSync(htmlFile)) {
  console.error(`[ERROR] Application file not found: ${htmlFile}`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  // Always serve the SFMS application HTML
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  fs.createReadStream(htmlFile).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log('====================================================================');
  console.log('  SWAMI VIVEKANAND SIKSHAN SANSTHAN (SFMS)');
  console.log('  School Fee Management System — Local-First Running');
  console.log('====================================================================');
  console.log(`  Application URL : http://localhost:${PORT}`);
  console.log('--------------------------------------------------------------------');
  console.log('  Default Login Credentials:');
  console.log('    1. Administrator (पूर्ण प्रशासनिक अधिकार):');
  console.log('       Username : admin.svss');
  console.log('       Password : Admin@SVSS#2026');
  console.log('    2. Fee Collector / Cashier (शुल्क संग्रहकर्ता):');
  console.log('       Username : collector.svss');
  console.log('       Password : Collector@SVSS#2026');
  console.log('====================================================================');

  // Open default browser on Windows
  exec(`start http://localhost:${PORT}`);
});
