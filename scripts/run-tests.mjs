import {execFileSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
// Plain tsc + node:test avoids tsx's failing Windows user-info lookup in sandboxes.
execFileSync(process.execPath,['node_modules/typescript/bin/tsc','-p','tsconfig.test.json'],{stdio:'inherit',windowsHide:true});
const files=readdirSync('.test-build/tests').filter(f=>f.endsWith('.test.js')).map(f=>'.test-build/tests/'+f);
execFileSync(process.execPath,['--test',...files],{stdio:'inherit',windowsHide:true});
