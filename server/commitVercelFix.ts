import { execSync } from 'child_process';

const gitPath = 'C:\\Users\\USER\\AppData\\Local\\GitHubDesktop\\app-3.6.4\\resources\\app\\git\\cmd\\git.exe';
const cwd = 'C:\\Users\\USER\\.gemini\\antigravity\\scratch\\deung-sati';

function run(cmd: string) {
  console.log(`\n=== RUNNING: git ${cmd} ===`);
  const out = execSync(`"${gitPath}" ${cmd}`, { cwd, encoding: 'utf8' });
  console.log(out);
  return out;
}

run('branch --show-current');
run('add api/ src/ server/ tsconfig.app.json tsconfig.node.json vite.config.ts');
run('diff --staged --name-only');
run('commit -m "Fix Vercel serverless import resolution and remove runtime .ts extensions"');
run('log -1 --oneline');
run('status');
