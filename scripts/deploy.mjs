import { execFileSync } from 'node:child_process';
execFileSync('npm', ['run', 'build'], { stdio: 'inherit' });
execFileSync('systemctl', ['--user', 'restart', 'receipt-workspace'], { stdio: 'inherit' });
