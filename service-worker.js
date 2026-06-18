const CACHE_NAME = 'module-editor-v1';
const ASSETS = [
  './', './code.html', './settings.html', './manifest.json', './modlang.json'
];
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
const wasmInstance = new WebAssembly.Instance(wasmModule, {});
const {addTwo} = wasmInstance.exports;
for (let i = 0; i < 10; i++){
  console.log(addTwo(i, i));
}