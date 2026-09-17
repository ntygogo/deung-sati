import { execSync } from 'child_process';

const gitPath = 'C:\\Users\\USER\\AppData\\Local\\GitHubDesktop\\app-3.6.4\\resources\\app\\git\\cmd\\git.exe';
const cwd = 'C:\\Users\\USER\\.gemini\\antigravity\\scratch\\deung-sati';

function run(cmd: string) {
  console.log(`\n=== RUNNING: git ${cmd} ===`);
  try {
    const out = execSync(`"${gitPath}" ${cmd}`, { cwd, encoding: 'utf8' });
    console.log(out);
    return out;
  } catch (err: any) {
    console.log(err.stdout || err.message);
    return err.stdout || null;
  }
}

console.log('------------------------------------------------------------');
console.log('DEUNG SATI: GITHUB PREVIEW DEPLOYMENT SCRIPT');
console.log('------------------------------------------------------------');

// 1. Verify current branch
const branch = run('branch --show-current')?.trim();
console.log('Current branch:', branch);

if (branch !== 'preview/unified-architecture-v2') {
  console.error('ERROR: Not on preview/unified-architecture-v2. Aborting for safety.');
  process.exit(1);
}

// 2. Check if .env is tracked (Critical safety)
const trackedEnv = run('ls-files .env')?.trim();
if (trackedEnv) {
  console.error('CRITICAL SAFETY ALERT: .env is tracked! Aborting.');
  process.exit(1);
} else {
  console.log('✅ Safety check passed: .env is NOT tracked in git.');
}

// 3. Check status
const statusBefore = run('status --porcelain')?.trim();
console.log('Status before staging:\n', statusBefore || '(Clean)');

// 4. Stage source changes
run('add src/ server/ api/ package.json tsconfig.json vite.config.ts README.md');

// 5. Check staged diff
const stagedDiff = run('diff --staged --name-only')?.trim();
if (stagedDiff) {
  console.log('Staged files to commit:\n', stagedDiff);
  // Ensure no .env in staged
  if (stagedDiff.includes('.env')) {
    console.error('CRITICAL ERROR: .env is in staged files! Aborting.');
    process.exit(1);
  }
  run('commit -m "Fix chat duplicates, Thai QA and exercise discovery"');
} else {
  console.log('No new changes to commit. Using latest commit on branch.');
}

// 6. Push strictly to preview/unified-architecture-v2
console.log('\n--> Pushing to origin preview/unified-architecture-v2 ...');
run('push origin preview/unified-architecture-v2');

// 7. Post-push verification
console.log('\n============================================================');
console.log('POST-DEPLOYMENT STATUS REPORT');
console.log('============================================================');
const lastCommit = run('log -1 --oneline')?.trim();
const statusAfter = run('status')?.trim();

console.log('Pushed Commit:', lastCommit);
console.log('Branch Name:', branch);
console.log('Git Status:\n', statusAfter);
console.log('Working Tree Clean:', !statusAfter?.includes('Changes not staged') && !statusAfter?.includes('Changes to be committed'));
console.log('============================================================');
