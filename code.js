if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service.js').catch(err => console.error('Service Worker failed', err));
  });
}
const INPUT = document.getElementById('input');
const OVERLAY = document.getElementById('overlay');
const LINES = document.getElementById('lines');
const TREE = document.getElementById('treeItems');
const TREE_LIST = document.getElementById('treeList');
const ACTIVE_LINE_BAND = document.getElementById('active-line-band');
const POS_READOUT = document.getElementById('posReadout');
const LINE_READOUT = document.getElementById('lineReadout');
const BYTE_READOUT = document.getElementById('byteReadout');
const WASM_STATUS = document.getElementById('wasmStatus');
const ACTIVE_FILE_LABEL = document.getElementById('activeFileLabel');
const CONSOLE_DRAWER = document.getElementById('consoleDrawer');
const CONSOLE_LOG = document.getElementById('consoleLog');
const MenuItems = Array.from(document.querySelectorAll('ul.menu > li'));
document.getElementById('menu').addEventListener('click', () => TREE.classList.toggle('open'));
let activePath = null, dirHandle = null, fileHandle = {}, fileElements = {}, wasmInst = null, isDirty = false;
const completions = {
  keywords: ['new', 'def', 'ret', 'tef', 'if', 'loop', 'end', 'break', 'continue', 'import', 'and', 'or', 'not', 'ref'],
  types: ['bool', 'int', 'float', 'char', 'wchar'],
  funcs: ['input', 'print', 'len', 'sizeof', 'typeof', 'alignof']
};
const tokenRegex = new RegExp(['!.*$', '("(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\')', `\\b(${completions.keywords.join('|')})\\b`, `\\b(${completions.types.join('|')})\\b`, `\\b(${completions.funcs.join('|')})\\b`].join('|'), 'gm');
const kwSet = new Set(completions.keywords);
const typeSet = new Set(completions.types);
const funcSet = new Set(completions.funcs);
function closeMenus(exceptItem = null){
  MenuItems.forEach((item) => {
    if (item !== exceptItem)
      item.classList.remove('open');
  });
}
MenuItems.forEach((item) => {
  const subMenu = item.querySelector(':scope > ul');
  if (!subMenu) return;
  item.addEventListener('click', (e) => {
    if (e.target.closest(':scope > li')){
      closeMenus(); return;
    }
    e.stopPropagation();
    const nextState = !item.classList.contains('open');
    closeMenus(item);
    item.classList.toggle('open', nextState);
  });
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('ul.menu'))
    closeMenus();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape')
    closeMenus();
});
function appendLog(msg, isError = false) {
  const time = new Date().toTimeString().split(' ')[0];
  const prefix = isError ? '[ERR]' : '[OUT]';
  CONSOLE_LOG.textContent += `[${time}] ${prefix} ${msg}\n`;
  CONSOLE_LOG.scrollTop = CONSOLE_LOG.scrollHeight;
}
function clearConsole() {CONSOLE_LOG.textContent = '';}
function toggleConsole(forceOpen = null) {
  if (typeof forceOpen === 'boolean')
    CONSOLE_DRAWER.classList.toggle('open', forceOpen);
  else
    CONSOLE_DRAWER.classList.toggle('open');
}
function escapeHtml(text) {return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');}
function applyColor(text) {
  let lastIndex = 0, out = ''; tokenRegex.lastIndex = 0;
  for (const match of text.matchAll(tokenRegex)) {
    const index = match.index ?? 0, full = match[0];
    if (index > lastIndex)
      out += escapeHtml(text.slice(lastIndex, index));
    if (match[1])
      out += `<span style="color:#64748b;font-style:italic;">${escapeHtml(full)}</span>`;
    else if (match[2])
      out += `<span style="color:#f59e0b;">${escapeHtml(full)}</span>`;
    else if (kwSet.has(full))
      out += `<span style="color:#fb7185;">${escapeHtml(full)}</span>`;
    else if (typeSet.has(full))
      out += `<span style="color:#22d3ee;">${escapeHtml(full)}</span>`;
    else if (funcSet.has(full))
      out += `<span style="color:#a3e635;">${escapeHtml(full)}</span>`;
    else {out += escapeHtml(full);}
    lastIndex = index + full.length;
  }
  if (lastIndex < text.length)
    out += escapeHtml(text.slice(lastIndex));
  return out;
}
function getCurrentLineIndex() {return INPUT.value.slice(0, INPUT.selectionStart ?? 0).split('\n').length - 1;}
function updateTelemetry() {
  const val = INPUT.value;
  const pos = INPUT.selectionStart ?? 0;
  const before = val.slice(0, pos);
  const linesBefore = before.split('\n');
  const lineNum = linesBefore.length;
  const colNum = linesBefore[linesBefore.length - 1].length + 1;
  const totalLines = val.split('\n').length;
  const byteLen = new TextEncoder().encode(val).length;
  POS_READOUT.textContent = `${lineNum}:${colNum}`;
  LINE_READOUT.textContent = String(totalLines);
  BYTE_READOUT.textContent = String(byteLen);
  const lineHeight = 16 * 1.6;
  const paddingTop = 14;
  const yPos = paddingTop + (lineNum - 1) * lineHeight - INPUT.scrollTop;
  ACTIVE_LINE_BAND.style.transform = `translateY(${yPos - paddingTop}px)`;
  Array.from(LINES.children).forEach((el, idx) => {el.classList.toggle('active-line', idx === lineNum - 1);});
}
function Linenum() {
  const lineCount = INPUT.value.split('\n').length;
  const activeIdx = getCurrentLineIndex();
  LINES.innerHTML = Array.from({ length: lineCount }, (_, i) => `<div class="${i === activeIdx ? 'active-line' : ''}">${i + 1}</div>`).join('');
}
function writeString(str) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  const ptr = wasmInst.exports.allocate_buffer(bytes.length + 1);
  const memory = new Uint8Array(wasmInst.exports.memory.buffer);
  memory.set(bytes, ptr);
  memory[ptr + bytes.length] = 0;
  return { ptr, len: bytes.length };
}
function readString(ptr, len) {
  const memory = new Uint8Array(wasmInst.exports.memory.buffer);
  const bytes = memory.subarray(ptr, ptr + len);
      return new TextDecoder().decode(bytes);
}
async function initCompiler() {
  try {
    const response = await fetch('./code.wasm');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = await response.arrayBuffer();
    const results = await WebAssembly.instantiate(bytes, {env: {debuggerlog: (ptr, len) => appendLog(readString(ptr, len))}});
    wasmInst = results.instance;
    WASM_STATUS.textContent = 'READY';
    WASM_STATUS.style.color = '#22d3ee';
  } catch (err) {
    WASM_STATUS.textContent = 'OFFLINE';
    WASM_STATUS.style.color = '#fb7185';
  }
}
function compileCode(source) {
  if (!wasmInst) throw new Error('WASM compiler instance is not initialized.');
  if (isDirty === true) saveCurrentFile();
  const { ptr, len } = writeString(source);
  const resultPtr = wasmInst.exports.compile(ptr, len);
  const memView = new DataView(wasmInst.exports.memory.buffer);
  const resPtr = memView.getUint32(resultPtr, true);
  const resLen = memView.getUint32(resultPtr + 4, true);
  const output = readString(resPtr, resLen);
  wasmInst.exports.free_buffer(ptr);
  wasmInst.exports.free_buffer(resPtr);
  wasmInst.exports.free_buffer(resultPtr);
  return output;
}
async function Compiler() {
  toggleConsole(true);
  const code = INPUT.value;
  try {
    const result = compileCode(code);
    console.log('Successfully Compiled: ', result);
    appendLog(`Compiled successfully: ${result}`);
  } catch (err) {
    console.error('Compilation Error: ', err);
    appendLog(String(err), true);
  }
}
async function scanDirectory(dir, parentElement, currentPath) {
  const dirs = [], files = [];
  for await (const entry of dir.values()) {
    if (entry.kind === 'directory')
      dirs.push(entry);
    else
      files.push(entry);
  }
  for (const subDir of dirs) {
    const relPath = currentPath ? `${currentPath}/${subDir.name}` : subDir.name;
    await scanDirectory(subDir, parentElement, relPath);
  }
  for (const entry of files) {
    const relPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
    fileHandle[relPath] = entry;
    const fileDiv = document.createElement('div');
    fileDiv.className = 'file-item';
    fileDiv.textContent = entry.name;
    fileDiv.title = relPath;
    fileElements[relPath] = fileDiv;
    fileDiv.addEventListener('click', () => {loadFile(relPath); TREE.classList.remove('open');});
    parentElement.appendChild(fileDiv);
  }
}
async function selectFolder() {
  if (!('showDirectoryPicker' in window)) {
    alert('Cannot function a File System Access API.');
    return;
  }
  try {
    dirHandle = await window.showDirectoryPicker();
    TREE_LIST.innerHTML = '';
    fileHandle = {};
    fileElements = {};
    activePath = null;
    await scanDirectory(dirHandle, TREE_LIST, '');
    TREE.classList.add('open');
  } catch (err) {
    if (err.name !== 'AbortError') console.error(err);
  }
}
async function loadFile(path) {
  const handle = fileHandle[path];
  if (!handle) return;
  try {
    const file = await handle.getFile();
    INPUT.value = await file.text();
    if (activePath && fileElements[activePath]) fileElements[activePath].classList.remove('active');
    activePath = path;
    ACTIVE_FILE_LABEL.textContent = path;
    if (fileElements[activePath]) fileElements[activePath].classList.add('active');
    OVERLAY.innerHTML = applyColor(INPUT.value);
    Linenum();
    updateTelemetry();
  } catch (err) {
    alert(`Failed to load file: ${err.message}`);
  }
}
async function saveCurrentFile() {
  if (!activePath || !fileHandle[activePath]) return;
  try {
    const writable = await fileHandle[activePath].createWritable();
    await writable.write(INPUT.value);
    await writable.close();
    appendLog(`Saved ${activePath}`);
  } catch (err) {
    console.error(`Failed to save: ${err}`);
    appendLog(`Save failed: ${err}`, true);
  }
}
INPUT.addEventListener('input', () => {
  OVERLAY.innerHTML = applyColor(INPUT.value);
  Linenum();
  updateTelemetry();
});
INPUT.addEventListener('click', updateTelemetry);
INPUT.addEventListener('keyup', updateTelemetry);
INPUT.addEventListener('scroll', () => {
  OVERLAY.scrollTop = INPUT.scrollTop;
  OVERLAY.scrollLeft = INPUT.scrollLeft;
  LINES.scrollTop = INPUT.scrollTop;
  updateTelemetry();
});
INPUT.addEventListener('keydown', async (e) => {
  isDirty = true;
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = INPUT.selectionStart;
    const end = INPUT.selectionEnd;
    INPUT.value = INPUT.value.substring(0, start) + '  ' + INPUT.value.substring(end);
    INPUT.selectionStart = INPUT.selectionEnd = start + 2;
    OVERLAY.innerHTML = applyColor(INPUT.value);
    Linenum();
    updateTelemetry();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    await saveCurrentFile();
    isDirty = false;
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
    e.preventDefault();
    TREE.classList.toggle('open');
  }
  if (e.altKey && e.key.toLowerCase() === 'e'){
    e.preventDefault();
    if (isDirty === false){
      window.close();
    }
  }
});
initCompiler();
updateTelemetry();