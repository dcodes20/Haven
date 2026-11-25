(function () {
  var DB_NAME = 'haven-media', DB_VERSION = 1, STORE_NAME = 'media';
  var subscribers = [], objectUrls = {};
  var channel = typeof window.BroadcastChannel === 'function' ? new window.BroadcastChannel('haven-media') : null;

  function openDatabase() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error('Browser storage is not available.')); return; }
      var request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function () {
        var db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error('Could not open browser storage.')); };
      request.onblocked = function () { reject(new Error('Browser storage is busy in another tab.')); };
    });
  }

  function transact(mode, operation) {
    return openDatabase().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx, result, settled = false;
        function fail(error) {
          if (settled) return;
          settled = true; db.close();
          reject(error || new Error('Browser storage transaction failed.'));
        }
        try {
          tx = db.transaction(STORE_NAME, mode);
          tx.oncomplete = function () {
            if (settled) return;
            settled = true; db.close(); resolve(result);
          };
          tx.onerror = function () { fail(tx.error); };
          tx.onabort = function () { fail(tx.error); };
          operation(tx.objectStore(STORE_NAME), function (value) { result = value; });
        } catch (error) {
          if (tx) {
            try { tx.abort(); } catch (abortError) { fail(error); }
          } else fail(error);
        }
      });
    });
  }

  function broadcastChange() {
    if (channel) channel.postMessage('changed');
  }

  if (channel) {
    channel.addEventListener('message', function (event) {
      if (event.data !== 'changed') return;
      subscribers.slice().forEach(function (callback) { callback(); });
    });
  }

  function makeId() {
    return 'media-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }

  function list() {
    return transact('readonly', function (store, setResult) {
      var request = store.getAll();
      request.onsuccess = function () {
        setResult(request.result.sort(function (a, b) { return b.createdAt - a.createdAt; }));
      };
    });
  }

  function add(files) {
    var valid = Array.prototype.slice.call(files || []).filter(function (file) {
      return /^(image|video)\//.test(file.type);
    });
    if (!valid.length) return Promise.resolve([]);

    var now = Date.now();
    var records = valid.map(function (file, index) {
      return {
        id: makeId(),
        name: file.name.replace(/\.[^.]+$/, '') || 'New memory',
        type: file.type,
        size: file.size,
        createdAt: now + index,
        blob: file
      };
    });
    return transact('readwrite', function (store, setResult) {
      records.forEach(function (record) { store.add(record); });
      setResult(records);
    }).then(function () {
      broadcastChange();
      return records;
    });
  }

  function remove(ids) {
    ids = Array.prototype.slice.call(ids || []);
    if (!ids.length) return Promise.resolve();
    return transact('readwrite', function (store) {
      ids.forEach(function (id) { store.delete(id); });
    }).then(broadcastChange);
  }

  function restore(records) {
    records = Array.prototype.slice.call(records || []);
    if (!records.length) return Promise.resolve();
    return transact('readwrite', function (store) {
      records.forEach(function (record) {
        store.put({
          id: record.id,
          name: record.name,
          type: record.type,
          size: record.size,
          createdAt: record.createdAt,
          blob: record.blob
        });
      });
    }).then(broadcastChange);
  }

  function mediaUrl(record) {
    if (!objectUrls[record.id]) objectUrls[record.id] = URL.createObjectURL(record.blob);
    return objectUrls[record.id];
  }

  function today(record) {
    var date = new Date(record.createdAt), now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  }

  function when(record) {
    var date = new Date(record.createdAt), now = new Date();
    if (today(record)) return 'Today';
    var yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    if (date.getFullYear() === yesterday.getFullYear() && date.getMonth() === yesterday.getMonth() && date.getDate() === yesterday.getDate()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  function toItem(record) {
    return {
      id: record.id,
      name: record.name,
      type: record.type,
      size: record.size,
      createdAt: record.createdAt,
      blob: record.blob,
      url: mediaUrl(record),
      when: when(record),
      video: record.type.indexOf('video/') === 0,
      file: true,
      dur: ''
    };
  }

  function subscribe(callback) {
    subscribers.push(callback);
    return function () {
      var index = subscribers.indexOf(callback);
      if (index > -1) subscribers.splice(index, 1);
    };
  }

  window.addEventListener('pagehide', function () {
    Object.keys(objectUrls).forEach(function (id) { URL.revokeObjectURL(objectUrls[id]); });
    objectUrls = {};
    if (channel) channel.close();
  });

  window.HavenMediaStore = {
    add: add,
    list: list,
    mediaItem: toItem,
    remove: remove,
    restore: restore,
    subscribe: subscribe,
    isToday: today
  };
})();
