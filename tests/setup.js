// Os arquivos de lógica (dateUtils.js, calculations.js, validators.js) são scripts
// clássicos carregados via <script> no browser, sem module system: eles se enxergam
// pelo escopo global compartilhado do documento. Para reaproveitá-los em Node/Vitest
// sem reescrever o app, expomos DateUtils em `global` antes de carregar calculations.js,
// que referencia `DateUtils` como identificador solto (igual ao browser).
import DateUtils from '../dateUtils.js';
global.DateUtils = DateUtils;
