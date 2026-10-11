import {readFile,stat} from 'node:fs/promises';
import {backupModuleUrls} from './backup-modules.mjs';

const [action,filename,...extra]=process.argv.slice(2);
try{
  if(!['validate','plan'].includes(action)||!filename||extra.length)throw new Error('Usage: pnpm backup:validate <file> or pnpm backup:plan <file>');
  const urls=await backupModuleUrls();
  const {MAX_BACKUP_BYTES}=await import(urls.format);
  if((await stat(filename)).size>MAX_BACKUP_BYTES)throw new Error('Backup exceeds the supported size.');
  const {validateBackup}=await import(urls.validator);
  const backup=validateBackup(await readFile(filename,'utf8'));
  const result=action==='plan'?(await import(urls['restore-plan'])).buildRestorePlan(backup):{valid:true,format:backup.format,version:backup.version,createdAt:backup.createdAt,schema:backup.schema,counts:backup.counts};
  console.log(JSON.stringify(result,null,2));
}catch(error){console.error(error.code?'Unable to read backup file.':error.message);process.exitCode=1;}
