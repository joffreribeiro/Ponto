README — Como marcar um usuário como ADMIN (passo-a-passo)

Este guia descreve PASSO-A-PASSO (Windows PowerShell) como marcar `joffre.ribeiro@gmail.com` com o custom claim `admin: true` no Firebase. Você não precisa ser desenvolvedor, siga os passos cuidadosamente.

ATENÇÃO: não compartilhe o arquivo `serviceAccountKey.json` (chave privada). Guarde em local seguro e apague quando não for mais necessário.

1) Baixar a chave da Service Account
- Abra o Firebase Console: https://console.firebase.google.com/ → selecione o projeto `ponto-68b4a`.
- Vá em Configurações do Projeto (engrenagem) → "Service accounts" → "Generate new private key".
- Baixe o arquivo JSON e copie para a pasta do projeto local (vamos usar `tools/`):
  - Salve o arquivo como `e:\MEUS DOCUMENTOS\OneDrive\Documentos\Ponto\tools\serviceAccountKey.json`

2) Preparar ambiente Node.js (uma vez)
- Se tiver Node.js instalado, pule esta etapa. Caso contrário baixe e instale o Node.js (LTS) em: https://nodejs.org/

3) Instalar dependência e executar o script
- Abra o PowerShell e execute:

```powershell
cd "e:\MEUS DOCUMENTOS\OneDrive\Documentos\Ponto\tools"
npm init -y
npm install firebase-admin
# Certifique-se de ter copiado serviceAccountKey.json para esta pasta
node set-admin-claim.js joffre.ribeiro@gmail.com
```

- Saída esperada: aparece o UID do usuário e mensagem confirmando que o claim `admin` foi definido.

4) Atualizar regras do Firestore (Console)
- Vá no Console Firebase → Firestore Database → Rules e substitua pelo bloco abaixo e clique em Publish:

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /ponto/{userId} {
      allow read, write: if request.auth != null && (request.auth.uid == userId || request.auth.token.admin == true);
    }
  }
}
```

Explicação: o dono do documento (uid igual) ou qualquer usuário com o claim `admin==true` pode ler/gravar.

5) Forçar refresh do token no navegador e verificar claim
- Abra o site servido via HTTP (ex.: `python -m http.server` na raiz do projeto) e entre com o usuário `joffre.ribeiro@gmail.com` (se criou senha no Auth), ou use o fluxo de login no app.
- Abra DevTools → Console e execute (adaptar se usar login anônimo ou outro método):

```javascript
// Se estiver autenticado via SDK modular
const { getAuth } = await import('https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js');
const auth = getAuth();
await auth.currentUser.getIdToken(true); // força refresh
const idTokenResult = await auth.currentUser.getIdTokenResult();
console.log(idTokenResult.claims);
```
- Procure `admin: true` nas claims.

6) Remover admin (se necessário)
- Re-utilize o script Node.js e chame:

```javascript
// alterar setAdminByEmail para setCustomUserClaims(user.uid, {})
// ou crie script separado que receba UID e rode:
admin.auth().setCustomUserClaims(uid, {});
```

7) Segurança e limpeza
- Depois de usar, armazene o `serviceAccountKey.json` em local seguro (ou delete se preferir).
- Não comite o arquivo no Git.

Se quiser, eu posso:
- Adicionar instruções adicionais ao `index-refatorado.html` para mostrar controles admin no frontend.
- Criar um pequeno botão no UI "Sincronizar agora" que só aparece para admins.

Boa sorte — se quiser eu aplico a próxima alteração no código (por exemplo, mostrar painel admin no app) ou mostro como testar passo-a-passo com prints do console.