import {createServer} from 'node:http';
import {readFile, mkdtemp, rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const candidates=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].filter(Boolean);
const chrome=candidates.find(existsSync);
if(!chrome)throw new Error('Visual smoke requires Chrome/Chromium on the runner');

const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://127.0.0.1').pathname;
  const relative=pathname==='/'?'index.html':pathname.slice(1);
  const path=resolve(root,relative);
  if(path!==root && !path.startsWith(root+sep)){res.writeHead(403).end();return}
  const bytes=await readFile(path);
  res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'}).end(bytes);
 }catch{res.writeHead(404).end('Not found')}
});
const profile=await mkdtemp(join(tmpdir(),'precision-gauge-browser-'));
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port;
 const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--disable-extensions','--no-first-run','--window-size=1280,1000',
  '--virtual-time-budget=12000','--user-data-dir='+profile,
  '--dump-dom','http://127.0.0.1:'+port+'/tests/browser-fixture.html'];
 const result=await new Promise((resolve,reject)=>{
  const child=spawn(chrome,args,{stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';
  child.stdout.on('data',buf=>stdout+=buf);
  child.stderr.on('data',buf=>stderr+=buf);
  const timeout=setTimeout(()=>{child.kill('SIGKILL');reject(Error('Chrome smoke timeout'))},40000);
  child.on('error',error=>{clearTimeout(timeout);reject(error)});
  child.on('close',code=>{clearTimeout(timeout);resolve({code,stdout,stderr})});
 });
 const match=result.stdout.match(/<pre id="results" data-status="(ok|fail)">([\s\S]*?)<\/pre>/);
 if(result.code!==0 || !match || match[1]!=='ok'){
  throw Error('Browser smoke failed: '+(match?.[2]||result.stderr.slice(-3000)||result.stdout.slice(-1000)));
 }
 console.log('Chrome UI smoke\n'+match[2].replaceAll('&amp;','&'));
}finally{
 await new Promise(resolve=>server.close(resolve));
 await rm(profile,{recursive:true,force:true});
}
