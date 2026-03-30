// set-admin-claim.js
// Uso: node set-admin-claim.js joffre.ribeiro@gmail.com
// Coloque aqui o arquivo de service account JSON com o nome serviceAccountKey.json

const admin = require('firebase-admin');
const path = require('path');

if (process.argv.length < 3) {
  console.error('Usage: node set-admin-claim.js <email>');
  process.exit(1);
}

const email = process.argv[2];
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch (err) {
  console.error(`Não foi possível carregar ${serviceAccountPath}. Coloque o JSON da Service Account com esse nome nessa pasta.`);
  console.error(err.message || err);
  process.exit(2);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function setAdminByEmail(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    console.log('UID encontrado:', user.uid);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log(`Custom claim 'admin' definido para ${email} (uid=${user.uid})`);
    process.exit(0);
  } catch (err) {
    console.error('Erro:', err.message || err);
    process.exit(3);
  }
}

setAdminByEmail(email);
