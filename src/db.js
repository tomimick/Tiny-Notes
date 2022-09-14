
/* API to IndexedDB, basic CRUD of notes. Keyvalues to localstorage. */

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

export async function query_notes(tag, search, count, year) {

    if (search)
        search = search.toLowerCase();

    console.debug("query", tag, search);

    const MAX = count || 200;
    let range = null;
    let direction = "prev";

    if (year) {
        // year specified, set lower, upper limits
        year = parseInt(year);
        const t1 = new Date(year, 0, 1);
        const t2 = new Date(year+1, 0, 1);
        range = IDBKeyRange.bound(t1.getTime()/1000, t2.getTime()/1000);
    }

    /*let cursor = await db_.transaction(STORE_NAME).store.openCursor(
        range, direction);*/
    let cursor = await db_.transaction(STORE_NAME, "readonly").store.index("created").openCursor(range, direction);

    let items = [];
    while (cursor && items.length < MAX) {
        //console.log(cursor.key, cursor.value);
        let item = cursor.value;
        if ( (!tag && !search) ||
             (tag && !search && item.tag && item.tag.includes(tag))  ||
             (search && !tag && item.text.toLowerCase().includes(search)) ||
             (item.text.toLowerCase().includes(search) && item.tag && item.tag.includes(tag)) ) {
            items.push(item);
        }

        cursor = await cursor.continue();
    }
    return items;
}

export async function insert_note(tag, text, delta_days) {

    const start = parseInt(Date.now()/1000);
    let item = {"text":text, "created":start, "tag":tag};
    item.created += add_delta_days(delta_days);

    await db_.add(STORE_NAME, item);
}

export async function update_note(id, tag, text, delta_days) {

    let item = await db_.get(STORE_NAME, id);
    if (!item)
        return;

    item.tag = tag;
    item.text = text;
    item.created += add_delta_days(delta_days);

    console.debug("update", item, id);
    await db_.put(STORE_NAME, item);
}

export async function delete_note(key) {

    console.debug("delete", key);

    await db_.delete(STORE_NAME, key);
}

export async function get_count() {

    let store = await db_.transaction(STORE_NAME, "readonly").store;
    return await store.count();
}

// import a json array of items
export async function import_json(jsondata) {
    let count = 0;

    for (let item of jsondata) {
        //console.debug(item);
        if (!item.text)
            continue;

        // if no time, set now
        if (!item.created)
            item.created = parseInt(Date.now()/1000);

        delete item.id;

        await db_.add(STORE_NAME, item);
        count += 1;
    }
    return count;
}

function add_delta_days(days) {
    days = days || 0;
    const SECS_DAY = 60*60*24;
    return days * SECS_DAY;
}

export function get_keyval(key, defval) {
    return localStorage.getItem(key) || defval;
}

export function get_keyval_list(key, defvalue) {
    let val = localStorage.getItem(key);
    if (val) {
        let list = val.split(",");
        list = list.map(x => x.trim());
        return list;
    } else {
        return defvalue;
    }
}

export function save_keyval(key, val) {
    localStorage.setItem(key, val);
}

export function save_keyval_list(key, list) {
    let val = list.join(", ");
    localStorage.setItem(key, val);
}

