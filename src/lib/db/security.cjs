const {randomBytes,scrypt,timingSafeEqual,createHash}=require('node:crypto');const {promisify}=require('node:util');const derive=promisify(scrypt);
const hashToken=value=>createHash('sha256').update(value).digest('hex');
async function hashPassword(password){if(typeof password!=='string'||password.length<12||password.length>128)throw Error('Kata sandi harus 12–128 karakter.');const salt=randomBytes(16).toString('hex'),key=await derive(password,salt,64);return `scrypt$${salt}$${key.toString('hex')}`;}
async function verifyPassword(password,hash){if(typeof password!=='string'||password.length>128||!/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(hash||''))return false;const [,salt,expected]=hash.split('$'),actual=await derive(password,salt,64);return timingSafeEqual(actual,Buffer.from(expected,'hex'));}
const newSessionToken=()=>randomBytes(32).toString('base64url');
module.exports={hashPassword,verifyPassword,hashToken,newSessionToken};
