
/* API to IndexedDB, basic CRUD of notes. */

import { openDB } from 'idb';

// https://github.com/jakearchibald/idb

const DB_NAME = 'my_notes_db'
const STORE_NAME = 'notes'

let db_;

export async function open_db() {

    const version = 1;

    const db = await openDB(DB_NAME, version, {
        upgrade(db, oldVersion, newVersion, transaction) {
          switch (oldVersion) {
            case 0:
              // first schema version
              const store = db.createObjectStore(STORE_NAME, {
                keyPath: 'id',
                autoIncrement: true,
              });
              store.createIndex('created', 'created');
              break;
            case 1:
              // 2nd schema...
              break
          }
        }
      });
    db_ = db;
    console.debug("db", db);
    return db;
}

export async function query_notes(tag, search) {

    if (search)
        search = search.toLowerCase();

    console.debug("query", tag, search);

    const MAX = 50;
    let range = null;
    let direction = "prev";

    /*let cursor = await db_.transaction(STORE_NAME).store.openCursor(
        range, direction);*/
    let cursor = await db_.transaction(STORE_NAME, "readonly").store.index("created").openCursor(range, direction);

    let items = [];
    while (cursor && items.length < MAX) {
        //console.log(cursor.key, cursor.value);
        let item = cursor.value;
        if ( (!tag && !search) ||
             (tag && !search && item.tag.includes(tag))  ||
             (search && !tag && item.text.toLowerCase().includes(search)) ||
             (item.text.toLowerCase().includes(search) && item.tag.includes(tag)) ) {
            items.push(item);
        }

        cursor = await cursor.continue();
    }
    return items;
}

export async function insert_note(tag, text) {

    const start = parseInt(Date.now()/1000);
    let item = {"text":text, "created":start, "tag":tag};

    await db_.add(STORE_NAME, item);
}

export async function update_note(id, tag, text, delta_days) {

    let item = await db_.get(STORE_NAME, id);
    if (!item)
        return;

    item.tag = tag;
    item.text = text;
    //delete item.id;

    if (delta_days) {
        const SECS_DAY = 60*60*24;
        item.created += delta_days * SECS_DAY;
    }

    console.debug("update", item, id);
    await db_.put(STORE_NAME, item);
}

export async function delete_note(key) {

    console.debug("delete", key);

    await db_.delete(STORE_NAME, key);
}

