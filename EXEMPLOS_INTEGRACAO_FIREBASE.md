# 📚 Exemplos de Integração Firebase - Guia de Implementação

Este arquivo contém exemplos práticos de como integrar o Firebase com suas funções existentes em `app-refatorado.js`.

---

## 📌 Índice

1. [Funções de Salvar Básicas](#funções-de-salvar-básicas)
2. [Registros de Ponto](#registros-de-ponto)
3. [Eventos e Férias](#eventos-e-férias)
4. [Atividades](#atividades)
5. [Acordos](#acordos)
6. [Exemplo Completo](#exemplo-completo)

---

## Funções de Salvar Básicas

### Padrão Geral

**ANTES** (apenas localStorage):
```javascript
function salvarAlgo() {
  // ... seu código ...
  AppState.save();
  // ... refresh UI ...
}
```

**DEPOIS** (com Firebase):
```javascript
async function salvarAlgo() {
  // ... seu código ...
  AppState.save();
  
  // 👇 NOVO: Adicionar esta linha
  await salvarNoFirebase('entidade', AppState.dados.entidade);
  
  // ... refresh UI ...
}
```

---

## Registros de Ponto

### Exemplo 1: Salvar Registro

**Função Original em `app-refatorado.js`:**
```javascript
function salvarRegistro() {
  try {
    const data = dateBrToIso(document.getElementById('dataRegistro').value);
    const entrada = document.getElementById('entradaRegistro').value;
    const saidaAlmoco = document.getElementById('saidaAlmocoRegistro').value;
    const retornoAlmoco = document.getElementById('retornoAlmocoRegistro').value;
    const saida = document.getElementById('saidaRegistro').value;
    const observacoes = document.getElementById('observacoesRegistro').value;

    const registro = { data, entrada, saidaAlmoco, retornoAlmoco, saida, observacoes };

    const erros = Validators.validateRegistro(registro);
    if (erros.length > 0) {
      Notifications.error(erros.join(' • '));
      return;
    }

    const idxExistente = AppState.dados.registros.findIndex(r => r.data === data);
    if (idxExistente >= 0) {
      AppState.dados.registros[idxExistente] = registro;
    } else {
      AppState.dados.registros.push(registro);
    }

    AppState.save();  // ← Está aqui
    atualizarDashboard();
    renderizarTabelaRegistros();
    fecharModalRegistro();
    Notifications.success('✅ Registro salvo com sucesso!');
  } catch (error) {
    console.error('Erro ao salvar registro:', error);
    Notifications.error('Erro ao salvar: ' + error.message);
  }
}
```

**Modificação - Adicione `async` e o await:**

```javascript
async function salvarRegistro() {  // ← Adicione "async"
  try {
    const data = dateBrToIso(document.getElementById('dataRegistro').value);
    const entrada = document.getElementById('entradaRegistro').value;
    const saidaAlmoco = document.getElementById('saidaAlmocoRegistro').value;
    const retornoAlmoco = document.getElementById('retornoAlmocoRegistro').value;
    const saida = document.getElementById('saidaRegistro').value;
    const observacoes = document.getElementById('observacoesRegistro').value;

    const registro = { data, entrada, saidaAlmoco, retornoAlmoco, saida, observacoes };

    const erros = Validators.validateRegistro(registro);
    if (erros.length > 0) {
      Notifications.error(erros.join(' • '));
      return;
    }

    const idxExistente = AppState.dados.registros.findIndex(r => r.data === data);
    if (idxExistente >= 0) {
      AppState.dados.registros[idxExistente] = registro;
    } else {
      AppState.dados.registros.push(registro);
    }

    AppState.save();
    
    // 👇 NOVO: Sincronizar com Firebase
    if (currentUser) {
      await salvarNoFirebase('registros', AppState.dados.registros);
    }
    
    atualizarDashboard();
    renderizarTabelaRegistros();
    fecharModalRegistro();
    Notifications.success('✅ Registro salvo com sucesso!');
  } catch (error) {
    console.error('Erro ao salvar registro:', error);
    Notifications.error('Erro ao salvar: ' + error.message);
  }
}
```

### Exemplo 2: Excluir Registro

**Função Original:**
```javascript
function excluirRegistro(index) {
  try {
    Notifications.confirm(
      'Deseja realmente excluir este registro?',
      () => {
        AppState.dados.registros.splice(index, 1);
        Storage.saveDebounced(AppState.dados);  // ← Está aqui
        atualizarDashboard();
        renderizarTabelaRegistros();
        Notifications.success('🗑️ Registro deletado.');
      }
    );
  } catch (error) {
    console.error('Erro ao excluir registro:', error);
    Notifications.error('Erro ao deletar: ' + error.message);
  }
}
```

**Modificação:**

```javascript
function excluirRegistro(index) {
  try {
    Notifications.confirm(
      'Deseja realmente excluir este registro?',
      async () => {  // ← Adicione "async"
        AppState.dados.registros.splice(index, 1);
        Storage.saveDebounced(AppState.dados);
        
        // 👇 NOVO: Sincronizar com Firebase
        if (currentUser) {
          await salvarNoFirebase('registros', AppState.dados.registros);
        }
        
        atualizarDashboard();
        renderizarTabelaRegistros();
        Notifications.success('🗑️ Registro deletado.');
      }
    );
  } catch (error) {
    console.error('Erro ao excluir registro:', error);
    Notifications.error('Erro ao deletar: ' + error.message);
  }
}
```

---

## Eventos e Férias

### Exemplo 3: Salvar Evento

**Função Original:**
```javascript
function salvarEvento() {
  try {
    const tipoEvento = document.getElementById('tipoEvento').value;
    const descricaoEvento = document.getElementById('descricaoEvento').value;
    const dataInicioEvento = document.getElementById('dataInicioEvento').value;
    const dataFimEvento = document.getElementById('dataFimEvento').value;
    const impactoEvento = document.getElementById('impactoEvento').value;

    const evento = {
      tipoEvento,
      descricaoEvento,
      dataInicioEvento,
      dataFimEvento: dataFimEvento || dataInicioEvento,
      impactoEvento
    };

    const erros = Validators.validateEvento(evento);
    if (erros.length > 0) {
      throw new Error(erros.join('; '));
    }

    if (AppState.eventoEmEdicao != null) {
      AppState.dados.eventos[AppState.eventoEmEdicao] = evento;
      AppState.eventoEmEdicao = null;
    } else {
      AppState.dados.eventos.push(evento);
    }

    AppState.save();  // ← Está aqui
    renderizarEventos();
    renderizarAcordos();
    gerarTimesheetAcordo();
    limparEvento();
    fecharModalEvento();
    mostrarAlertaGlobal('Evento salvo com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao salvar evento:', error);
    mostrarAlertaGlobal(error.message, 'error');
  }
}
```

**Modificação:**

```javascript
async function salvarEvento() {  // ← Adicione "async"
  try {
    const tipoEvento = document.getElementById('tipoEvento').value;
    const descricaoEvento = document.getElementById('descricaoEvento').value;
    const dataInicioEvento = document.getElementById('dataInicioEvento').value;
    const dataFimEvento = document.getElementById('dataFimEvento').value;
    const impactoEvento = document.getElementById('impactoEvento').value;

    const evento = {
      tipoEvento,
      descricaoEvento,
      dataInicioEvento,
      dataFimEvento: dataFimEvento || dataInicioEvento,
      impactoEvento
    };

    const erros = Validators.validateEvento(evento);
    if (erros.length > 0) {
      throw new Error(erros.join('; '));
    }

    if (AppState.eventoEmEdicao != null) {
      AppState.dados.eventos[AppState.eventoEmEdicao] = evento;
      AppState.eventoEmEdicao = null;
    } else {
      AppState.dados.eventos.push(evento);
    }

    AppState.save();
    
    // 👇 NOVO: Sincronizar com Firebase
    if (currentUser) {
      await salvarNoFirebase('eventos', AppState.dados.eventos);
    }
    
    renderizarEventos();
    renderizarAcordos();
    gerarTimesheetAcordo();
    limparEvento();
    fecharModalEvento();
    mostrarAlertaGlobal('Evento salvo com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao salvar evento:', error);
    mostrarAlertaGlobal(error.message, 'error');
  }
}
```

### Exemplo 4: Deletar Evento

```javascript
function deletarEventoConfirmado() {
  try {
    if (AppState.eventoSelecionado === null) return;
    
    AppState.dados.eventos.splice(AppState.eventoSelecionado, 1);
    AppState.eventoSelecionado = null;
    AppState.save();
    
    // 👇 NOVO: Sincronizar com Firebase
    if (currentUser) {
      await salvarNoFirebase('eventos', AppState.dados.eventos);  // Requer async!
    }
    
    renderizarEventos();
    gerarTimesheetAcordo();
    fecharModalEvento();
    mostrarAlertaGlobal('Evento deletado.', 'success');
  } catch (error) {
    console.error('Erro ao deletar evento:', error);
    mostrarAlertaGlobal(error.message, 'error');
  }
}
```

---

## Atividades

### Exemplo 5: Salvar Atividade

**Função Original:**
```javascript
function salvarAtividade() {
  const modal = document.getElementById('modalAtividade');
  const editId = modal && modal.dataset.editId ? modal.dataset.editId : null;
  
  const titulo = document.getElementById('atividadeTitulo').value.trim();
  if (!titulo) { Notifications.warning('Título é obrigatório'); return; }

  const obj = {
    id: editId || ('ativ-' + Date.now()),
    titulo,
    descricao: document.getElementById('atividadeDescricao').value.trim(),
    responsavel: document.getElementById('atividadeResponsavel').value.trim(),
    status: document.getElementById('atividadeStatus').value,
    progresso: Number(document.getElementById('atividadeProgresso').value || 0)
  };

  let list = AppState.dados.atividades || [];
  
  if (editId) {
    const idx = list.findIndex(x => x.id === editId);
    if (idx >= 0) {
      list[idx] = Object.assign({}, list[idx], obj);
    }
  } else {
    list.push(obj);
  }

  AppState.dados.atividades = list;
  AppState.save();  // ← Está aqui
  fecharModalAtividade();
  renderizarAtividades();
  Notifications.success('Atividade salva');
}
```

**Modificação:**

```javascript
async function salvarAtividade() {  // ← Adicione "async"
  const modal = document.getElementById('modalAtividade');
  const editId = modal && modal.dataset.editId ? modal.dataset.editId : null;
  
  const titulo = document.getElementById('atividadeTitulo').value.trim();
  if (!titulo) { Notifications.warning('Título é obrigatório'); return; }

  const obj = {
    id: editId || ('ativ-' + Date.now()),
    titulo,
    descricao: document.getElementById('atividadeDescricao').value.trim(),
    responsavel: document.getElementById('atividadeResponsavel').value.trim(),
    status: document.getElementById('atividadeStatus').value,
    progresso: Number(document.getElementById('atividadeProgresso').value || 0)
  };

  let list = AppState.dados.atividades || [];
  
  if (editId) {
    const idx = list.findIndex(x => x.id === editId);
    if (idx >= 0) {
      list[idx] = Object.assign({}, list[idx], obj);
    }
  } else {
    list.push(obj);
  }

  AppState.dados.atividades = list;
  AppState.save();
  
  // 👇 NOVO: Sincronizar com Firebase
  if (currentUser) {
    await salvarNoFirebase('atividades', AppState.dados.atividades);
  }
  
  fecharModalAtividade();
  renderizarAtividades();
  Notifications.success('Atividade salva');
}
```

### Exemplo 6: Remover Atividade

```javascript
async function removerAtividade(idOrIdx) {  // ← Adicione "async"
  let list = AppState.dados.atividades || [];
  if (!list.length) return;
  const id = idOrIdx;
  const idx = list.findIndex(x => x.id === id);
  if (idx >= 0) {
    Notifications.confirm('Deseja excluir esta atividade?', async () => {  // ← Adicione "async"
      list.splice(idx, 1);
      AppState.dados.atividades = list;
      AppState.save();
      
      // 👇 NOVO: Sincronizar com Firebase
      if (currentUser) {
        await salvarNoFirebase('atividades', AppState.dados.atividades);
      }
      
      renderizarAtividades();
    });
  }
}
```

---

## Acordos

### Exemplo 7: Salvar Acordo

```javascript
async function salvarAcordo() {  // ← Adicione "async"
  try {
    // ... código de coleta de dados ...
    
    AppState.dados.acordos[AppState.acordoEmEdicaoIndex] = acordo;
    AppState.save();
    
    // 👇 NOVO: Sincronizar com Firebase
    if (currentUser) {
      await salvarNoFirebase('acordos', AppState.dados.acordos);
    }
    
    // ... atualizar UI ...
    mostrarAlertaGlobal('Acordo salvo com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao salvar acordo:', error);
    mostrarAlertaGlobal(error.message, 'error');
  }
}
```

---

## Exemplo Completo

### Integração Completa de Uma Função

Aqui está um exemplo real e completo de como uma função de salvar deveria ficar após integração com Firebase:

```javascript
/**
 * Salva um registro de ponto (entrada/saída)
 * Integra com Firebase para sincronização entre dispositivos
 */
async function salvarRegistro() {
  try {
    // ========== COLETA DE DADOS ==========
    const data = dateBrToIso(document.getElementById('dataRegistro').value);
    const entrada = document.getElementById('entradaRegistro').value;
    const saidaAlmoco = document.getElementById('saidaAlmocoRegistro').value;
    const retornoAlmoco = document.getElementById('retornoAlmocoRegistro').value;
    const saida = document.getElementById('saidaRegistro').value;
    const observacoes = document.getElementById('observacoesRegistro').value;
    const periodoEvento = document.getElementById('registroPeriodoEvento') ? 
      document.getElementById('registroPeriodoEvento').value : '';

    // ========== VALIDAÇÃO ==========
    const registro = { data, entrada, saidaAlmoco, retornoAlmoco, saida, observacoes, periodoEvento };
    const erros = Validators.validateRegistro(registro);
    if (erros.length > 0) {
      Notifications.error(erros.join(' • '));
      return;
    }

    // ========== PERSISTÊNCIA LOCAL ==========
    const idxExistente = AppState.dados.registros.findIndex(r => r.data === data);
    if (idxExistente >= 0) {
      AppState.dados.registros[idxExistente] = registro;
    } else {
      AppState.dados.registros.push(registro);
    }
    AppState.save();

    // ========== PERSISTÊNCIA REMOTA (FIREBASE) ==========
    if (currentUser) {
      console.log('Sincronizando registros com Firebase...');
      const sucesso = await salvarNoFirebase('registros', AppState.dados.registros);
      if (sucesso) {
        console.log('✅ Registros sincronizados com sucesso!');
      } else {
        console.warn('⚠️ Falha ao sincronizar, tentando novamente...');
        // Pode implementar retry automático aqui
      }
    } else {
      console.warn('Usuário não autenticado, dados salvos apenas localmente');
    }

    // ========== ATUALIZAR INTERFACE ==========
    atualizarDashboard();
    renderizarTabelaRegistros();
    gerarTimesheetAcordo();
    fecharModalRegistro();
    
    // ========== FEEDBACK AO USUÁRIO ==========
    Notifications.success('✅ Registro salvo com sucesso!');
    
  } catch (error) {
    console.error('Erro ao salvar registro:', error);
    Notifications.error('Erro ao salvar: ' + error.message);
  }
}
```

---

## Checklist de Integração

Para cada função que você modifique, verifique:

- [ ] Adicionei `async` no `function`?
- [ ] Adicionei `await` no `salvarNoFirebase`?
- [ ] Adicionei a verificação `if (currentUser)`?
- [ ] A função de erro trata a promise corretamente?
- [ ] Testei em dois navegadores simultaneamente?
- [ ] Os dados aparecem no Firebase Console?
- [ ] A sincronização funciona em tempo real?

---

## Dicas de Debugging

### 1. Verificar se Firebase está conectado

No console do navegador (F12):
```javascript
console.log(firebase);  // Deve mostrar objeto
console.log(currentUser);  // Deve mostrar seu usuário
console.log(database);  // Deve mostrar referência do database
```

### 2. Verificar se dados foram salvos

No console:
```javascript
firebase.database().ref('users/' + currentUser.uid + '/registros').once('value')
  .then(snapshot => console.log(snapshot.val()));
```

### 3. Monitorar mudanças em tempo real

```javascript
firebase.database().ref('users/' + currentUser.uid + '/registros').on('value', 
  snapshot => console.log('Dados atualizados:', snapshot.val())
);
```

---

## Próximos Passos

1. ✅ Integrar `salvarRegistro()`
2. ✅ Integrar `salvarEvento()` / `deletarEventoConfirmado()`
3. ✅ Integrar `salvarAtividade()` / `removerAtividade()`
4. ✅ Integrar funções de salvar acordos
5. ✅ Testar sincronização entre dispositivos
6. ⏭️ Implementar indicador visual de sincronização
7. ⏭️ Implementar fila offline para writes
8. ⏭️ Implementar resolução de conflitos avançada

---

_Atualizado em 28/01/2025_
