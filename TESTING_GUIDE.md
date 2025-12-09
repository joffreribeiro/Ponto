# 🧪 Guia de Testes - Validação Robusta

## 🎯 Como Testar a Refatoração

### Pré-requisito
Abra seu navegador com **Developer Tools** (F12)

---

## 1️⃣ Testar Validadores

### Teste 1: Validar Registro Válido

**Console:**
```javascript
Validators.validateRegistro({
    data: '2025-01-15',
    entrada: '09:00',
    saida: '18:00',
    saidaAlmoco: '12:00',
    retornoAlmoco: '13:00',
    observacoes: 'Dia normal'
});
```

**Resultado Esperado:**
```
[] // Array vazio = sem erros ✅
```

---

### Teste 2: Validar Registro com Erros

**Console:**
```javascript
Validators.validateRegistro({
    data: '15/01/2025',      // ❌ Formato errado
    entrada: '25:00',         // ❌ Hora inválida
    saida: '09:00',           // ❌ Saída antes da entrada
    saidaAlmoco: '',
    retornoAlmoco: '',
    observacoes: ''
});
```

**Resultado Esperado:**
```
[
    "Data inválida (use formato YYYY-MM-DD)",
    "Hora de entrada inválida (use formato HH:MM)",
    "Hora de saída deve ser posterior à entrada"
]
// 3 erros específicos ✅
```

---

### Teste 3: Validar Período

**Console:**
```javascript
// ❌ Período inválido
Validators.validatePeriodo({
    inicio: '2025-12-31',
    fim: '2025-01-01',    // Fim antes do início!
    minutosExtras: -10    // Negativo!
});
```

**Resultado Esperado:**
```
[
    "Data de fim não pode ser anterior à de início",
    "Minutos extras deve ser um número não-negativo"
]
```

---

### Teste 4: Validar Evento

**Console:**
```javascript
// Evento válido
Validators.validateEvento({
    tipoEvento: 'feriado',
    descricaoEvento: 'Natal',
    dataInicioEvento: '2025-12-25',
    dataFimEvento: '2025-12-25',
    impactoEvento: 'folga',
    acordoIndex: 0
});
```

**Resultado Esperado:**
```
[] // Sem erros ✅
```

---

## 2️⃣ Testar Utilitários de Data

### Teste 1: Normalizar Datas

**Console:**
```javascript
console.log(DateUtils.normalize('01/02/2025'));      // "2025-02-01"
console.log(DateUtils.normalize('01-02-2025'));      // "2025-02-01"
console.log(DateUtils.normalize('2025/02/01'));      // "2025-02-01"
console.log(DateUtils.normalize('2025-2-1'));        // "2025-02-01"
```

**Resultado Esperado:**
```
"2025-02-01"
"2025-02-01"
"2025-02-01"
"2025-02-01"
// Todos retornam o mesmo formato! ✅
```

---

### Teste 2: Converter Horas para Minutos

**Console:**
```javascript
console.log(DateUtils.timeToMinutes('09:00'));    // 540
console.log(DateUtils.timeToMinutes('09:30'));    // 570
console.log(DateUtils.timeToMinutes('18:00'));    // 1080
console.log(DateUtils.timeToMinutes('23:59'));    // 1439
```

**Resultado Esperado:**
```
540
570
1080
1439
// Conversões corretas ✅
```

---

### Teste 3: Converter Minutos para Horas

**Console:**
```javascript
console.log(DateUtils.minutesToTime(540));     // "09:00"
console.log(DateUtils.minutesToTime(570));     // "09:30"
console.log(DateUtils.minutesToTime(1080));    // "18:00"
console.log(DateUtils.minutesToTime(-60));     // "-01:00"
```

**Resultado Esperado:**
```
"09:00"
"09:30"
"18:00"
"-01:00"
// Horas negativas também funcionam! ✅
```

---

### Teste 4: Dia Útil

**Console:**
```javascript
const seg = new Date(2025, 1, 3);  // Segunda
const sex = new Date(2025, 1, 7);  // Sexta
const sab = new Date(2025, 1, 8);  // Sábado
const dom = new Date(2025, 1, 9);  // Domingo

console.log(DateUtils.isBusinessDay(seg));  // true
console.log(DateUtils.isBusinessDay(sex));  // true
console.log(DateUtils.isBusinessDay(sab));  // false
console.log(DateUtils.isBusinessDay(dom));  // false
```

---

## 3️⃣ Testar Persistência

### Teste 1: Carregar Dados

**Console:**
```javascript
const dados = Storage.load();
console.log(dados);
```

**Resultado Esperado:**
```
{
    registros: [...],
    configuracoes: {...},
    eventos: [...],
    acordos: [...]
}
// Estrutura de dados completa ✅
```

---

### Teste 2: Validar Estrutura

**Console:**
```javascript
const dadosValidos = Storage.getDefaultData();
console.log(Storage.isValidDataStructure(dadosValidos));  // true

const dadosInvalidos = {registros: 'string'};
console.log(Storage.isValidDataStructure(dadosInvalidos)); // false
```

---

### Teste 3: Exportar e Importar

**Console:**
```javascript
const dados = Storage.load();
const json = Storage.export(dados);
console.log(json.substring(0, 100));  // Primeiros 100 caracteres

// Depois importar
const restaurado = Storage.import(json);
console.log(Storage.isValidDataStructure(restaurado)); // true
```

---

## 4️⃣ Testar Cálculos

### Teste 1: Calcular Dia Detalhado

**Console:**
```javascript
const registro = {
    data: '2025-01-15',
    entrada: '09:00',
    saida: '18:00',
    saidaAlmoco: '12:00',
    retornoAlmoco: '13:00',
    observacoes: ''
};

const regra = {
    almocoMin: 60,
    tolAlmoco: 5,
    tolSaida: 5
};

const calc = Calculations.calculateDayDetail(registro, 0, regra);
console.log(calc);
```

**Resultado Esperado:**
```
{
    trabalhadas: 480,      // 8 horas = 480 minutos
    saldo: 0,              // 8h - 8h = 0
    temRegistro: true,
    status: 'ok',
    detalhes: {
        entrada: 540,      // 09:00
        saida: 1080,       // 18:00
        duracaoAlmoco: 60,
        carga: 480,
        minutosExtras: 0
    }
}
```

---

### Teste 2: Dia com Hora Extra

**Console:**
```javascript
const registroExtra = {
    data: '2025-01-15',
    entrada: '09:00',
    saida: '19:00',       // 1 hora extra
    saidaAlmoco: '12:00',
    retornoAlmoco: '13:00',
    observacoes: ''
};

const calc = Calculations.calculateDayDetail(registroExtra, 0, regra);
console.log(calc.saldo);   // 60 (1 hora = 60 minutos)
console.log(calc.status);  // "extra"
```

---

### Teste 3: Totalizações de Período

**Console:**
```javascript
const dados = Storage.load();
const totais = Calculations.calculatePeriodTotals(
    dados.registros,
    dados.eventos,
    dados.acordos
);
console.log(totais);
```

**Resultado Esperado:**
```
{
    totalTrabalhadas: 4320,    // Total em minutos
    totalSaldo: 180,           // Total de saldo
    horasExtras: 240,
    horasFaltas: 60,
    horasAcordo: 0,
    diasComExtra: 1,
    diasComFalta: 1,
    diasProcessados: 2
}
```

---

## 5️⃣ Teste da Aplicação Completa

### Teste UI: Adicionar Registro

1. Abra **index-refatorado.html**
2. Clique em **"+ Novo Registro"**
3. Preencha os campos:
   - Data: 2025-12-09 (ou hoje)
   - Entrada: 09:00
   - Saída: 18:00
   - Almoço: 12:00 a 13:00
4. Clique em **"Salvar"**

**Resultado Esperado:**
- ✅ Mensagem de sucesso
- ✅ Registro aparece na tabela
- ✅ Dashboard atualiza
- ✅ Dados salvos em localStorage

---

### Teste UI: Validação de Erro

1. Clique em **"+ Novo Registro"**
2. Preencha errado:
   - Data: 09/12/2025 (formato errado)
   - Entrada: 25:00 (hora inválida)
   - Saída: 09:00 (antes da entrada)
3. Clique em **"Salvar"**

**Resultado Esperado:**
- ✅ Mensagem de erro específica
- ✅ Erros listados claramente
- ✅ Registro NÃO é salvo
- ✅ Modal permanece aberto

---

## 🔍 Checklist Final

Antes de usar em produção:

- [ ] ✅ Todos os testes de validação passaram
- [ ] ✅ Utilitários de data funcionam com múltiplos formatos
- [ ] ✅ Persistência carrega e salva corretamente
- [ ] ✅ Cálculos retornam valores esperados
- [ ] ✅ UI responde com mensagens de erro claras
- [ ] ✅ Dashboard atualiza corretamente
- [ ] ✅ Dados persistem após refresh da página
- [ ] ✅ Sem erros no console (F12 > Console)

---

## 🐛 Troubleshooting

### "ReferenceError: Validators is not defined"
**Solução**: Verifique se `validators.js` está carregado em `index-refatorado.html` na ordem correta.

### "Dados não são salvos"
**Solução**: 
1. Verifique localStorage: `console.log(localStorage.getItem('controle_ponto_avancado_v1'))`
2. Verifique se `Storage.save()` retorna `true`

### "Hora convertida incorretamente"
**Solução**: Use sempre o formato **HH:MM** (24 horas, com zero à esquerda)
```javascript
DateUtils.timeToMinutes('9:00');    // ❌ Pode falhar
DateUtils.timeToMinutes('09:00');   // ✅ Correto
```

### "Validação não funciona"
**Solução**: Verifique se os dados têm o formato correto:
```javascript
// Data DEVE ser YYYY-MM-DD
// Hora DEVE ser HH:MM
// Números DEVEM ser números, não strings
```

---

## 📞 Contato para Problemas

Se encontrar problemas que não consigo resolver:

1. Abra Developer Tools (F12)
2. Vá até a aba **Console**
3. Copie o erro completo
4. Verifique em **MODULARIZATION.md** se há solução

---

**Versão**: 1.0  
**Data**: 2025-12-09  
**Status**: ✅ Pronto para testes
