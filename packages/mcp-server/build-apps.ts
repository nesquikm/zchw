import { execSync } from 'child_process';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appsDir = join(__dirname, 'apps');
const apps = readdirSync(appsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

for (const app of apps) {
  console.log(`Building MCP App: ${app}`);
  execSync(`npx vite build`, {
    env: { ...process.env, VITE_UI_ENTRY: app },
    stdio: 'inherit',
    cwd: __dirname,
  });
}
