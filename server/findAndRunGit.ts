import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function findGit() {
  const possiblePaths = [
    'C:\\Program Files\\Git\\cmd\\git.exe',
    'C:\\Program Files\\Git\\bin\\git.exe',
    'C:\\Program Files (x86)\\Git\\cmd\\git.exe',
    'C:\\Users\\USER\\AppData\\Local\\Programs\\Git\\cmd\\git.exe',
    'C:\\Users\\USER\\AppData\\Local\\Programs\\Git\\bin\\git.exe',
  ];

  // Also search GitHub Desktop app dirs
  const ghDesktop = 'C:\\Users\\USER\\AppData\\Local\\GitHubDesktop';
  if (fs.existsSync(ghDesktop)) {
    const entries = fs.readdirSync(ghDesktop);
    for (const e of entries) {
      if (e.startsWith('app-')) {
        possiblePaths.push(path.join(ghDesktop, e, 'resources', 'app', 'git', 'cmd', 'git.exe'));
        possiblePaths.push(path.join(ghDesktop, e, 'resources', 'app', 'git', 'bin', 'git.exe'));
      }
    }
  }

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

const gitPath = findGit();
console.log('Found Git at:', gitPath);
if (gitPath) {
  const runGit = (cmd: string) => {
    console.log(`\n> git ${cmd}`);
    try {
      const out = execSync(`"${gitPath}" ${cmd}`, { cwd: 'C:\\Users\\USER\\.gemini\\antigravity\\scratch\\deung-sati', encoding: 'utf8' });
      console.log(out);
      return out;
    } catch (err: any) {
      console.error(err.stdout || err.message);
      return null;
    }
  };

  runGit('status');
  runGit('branch --show-current');
  runGit('remote -v');
  runGit('log -1 --oneline');
}
