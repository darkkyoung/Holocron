import {tmpdir} from 'node:os';
import {isAbsolute,relative,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

export const projectRoot=fileURLToPath(new URL('../',import.meta.url));
const configured=process.env.HOLOCRON_BROWSER_QA_ARTIFACT_DIR;
if(configured&&!isAbsolute(configured))throw new Error('Browser QA artifact directory must be absolute');
export const artifactRoot=resolve(configured??resolve(tmpdir(),'holocron-assistant-browser-qa'));
const inside=(parent,child)=>{const path=relative(parent,child);return path===''||(path!=='..'&&!path.startsWith(`..${sep}`)&&!isAbsolute(path));};
if(inside(projectRoot,artifactRoot)||inside(artifactRoot,projectRoot)){
  throw new Error('Browser QA artifacts must be outside the repository, in a separate temporary directory');
}
export const artifactPath=(name)=>resolve(artifactRoot,name);
