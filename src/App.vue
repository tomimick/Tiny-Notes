<template>
  <header>
  <div class="navi">
      <span @click="onHome">Diary {{title}}</span>
      <input type="text" v-model="search" autocomplete="off"
            placeholder="Search" />
      <span>
          <a href="#" @click="onSettingsOpen">&#9881;</a>
          <a href="#" @click="onAdd">New</a>
      </span>
  </div>
  <div class="taglist"  v-if="mode!='settings'">
  <span v-for="(item, index) in tags" :key="index" @click="onSelectTag(item)"
        :class="[item, { active: tag_selected == item }]">
    {{item}}
  </span>
  </div>
  </header>

  <main>
  <div class="items" v-if="mode=='list'">
      <div v-for="(item, index) in items" :key="index"
        :class="['item', item.tag, {open: item.id == note_selected.id}]"
        @click="onToggle(item)">
         <span><b>{{item.tag}}</b> {{epoch_to_text(item.created)}}</span>
         <a href="#" @click.stop="onEdit(item)"
            v-show="item.id == note_selected.id">Edit</a>
        {{item.text}}
      </div>
  </div>

  <div class="editview" v-if="mode=='edit'">
    <textarea ref="textbody" v-model="body"></textarea>

    <div class="buttonrow">
        <span>
        <button @click="onDelete" v-if="note_selected.id" class="del">Delete</button>
        <button @click="onCancelEdit">Cancel</button>
        <button @click="onSave" class="action">Save</button>
        </span>
        <span class="daydelta">
        <span class="daydelta" v-show="delta">
        Day delta {{delta}}
        </span>
        <button @click="delta-=1">-</button>
        <button @click="delta+=1">+</button>
        </span>
    </div>
  </div>

  <div class="settingsview" v-if="mode=='settings'">
      <h2>Settings</h2>
      <h3>Tags</h3>
      <p><input type="text" v-model="edit_taglist"/></p>

      <h3>Styling</h3>
      <p>Custom CSS, including tag colors.</p>
      <textarea v-model="edit_style"></textarea>

      Add new tag style <input type="color" @change="onAddColor" />

      <h3>Data transfer</h3>
      <p>There are {{notecount}} notes in the database.</p>
      <button @click="onDownload">Export</button>
      Import: <input type="file" name="files[]" @change="onImportFile" />

      <hr/>

      <button @click="onSettingsCancel">Cancel</button>
      <button @click="onSettingsSave" class="action">Save</button>
  </div>

  </main>

  <ReloadPrompt />
</template>

<script>
import ReloadPrompt from './ReloadPrompt.vue'
import {open_db, insert_note, update_note, query_notes, delete_note,
    get_keyval, get_keyval_list, save_keyval, import_json,
    get_count} from './db.js'
import {download, build_export, epoch_to_text} from './util.js'

const default_taglist = ["tag1", "tag2", "tag3"];
const default_css = `body {
    font-size: 15px;
}
.tagname {
    background: #ddd;
}
`;


export default {
    name: 'app',
    components: {
        'ReloadPrompt': ReloadPrompt,
    },
    data() {
        return {
            items:[],
            mode:'list',
            search:'',
            note_selected:{id:0,text:''},
            tag_selected:'',
            body:'',
            delta:0,
            tags:[],
            edit_taglist:'',
            edit_style:'',
            notecount:0,
        }
    },
    watch: {
        search: function (val) {
            this.reload();
        },
    },
    async mounted() {
        await open_db();
        this.reload();
    },
    computed: {
       title: function() {
            const count = this.items.length;
            return `${count}`;
       },
    },
    methods: {
        epoch_to_text,
        async reload(skipmode) {
            let t = this;
            t.items = await query_notes(t.tag_selected, t.search);

            // read config
            t.tags = get_keyval_list("taglist", default_taglist);
            document.getElementById("customstyle").innerHTML = get_keyval("css", default_css);

            if (!skipmode)
                t.mode = 'list';
        },
        onHome() {
            let t = this;
            t.search = '';
            t.tag_selected = '';
            t.reload();
        },
        onAdd() {
            let t = this;
            t.body = '';
            t.delta = 0;
            t.mode = 'edit';
            t.clearSelection();

            setTimeout(() => {
                t.$refs.textbody.focus();
            }, 50);
        },
        onEdit(note) {
            let t = this;
            t.delta = 0;
            t.body = t.note_selected.text;
            t.tag_selected = t.note_selected.tag;
            t.mode = 'edit';
        },
        onToggle(item) {
            this.note_selected = (this.note_selected.id == item.id) ? {id:0,text:''} : item;
            //console.debug("toggle", this.note_selected);
        },
        onSelectTag(tag) {
            this.tag_selected = (this.tag_selected == tag) ? '' : tag;
            this.reload(true);
        },
        async onSave() {
            let t = this;
            //let text = prompt("kerro");
            let text = t.body;
            let tag = t.tag_selected || '';
            if (t.note_selected.id) {
                await update_note(t.note_selected.id, tag, text, t.delta);
            } else {
                await insert_note(tag, text, t.delta);
            }
            t.reload();
        },
        onCancelEdit() {
            let t = this;
            t.mode = 'list';
        },
        onDelete() {
            let t = this;
            if (!t.note_selected.id)
                return;

            if (!confirm("Delete?"))
                return;

            delete_note(t.note_selected.id);
            t.reload();
        },
        async onDownload() {
            let t = this;
            let items = await query_notes(null, null, 100000);
            let txt = build_export(items, t.tags, get_keyval("css"));
            download(txt);

        },
        clearSelection() {
            this.note_selected = {id:0,text:''};
        },
        async onSettingsOpen() {
            let t = this;
            const is_list = t.mode == 'list';
            t.mode = is_list ? 'settings' : 'list';
            if (is_list) {
                // opening settings, populate page
                t.edit_taglist = t.tags.join(", ");
                t.edit_style = get_keyval("css", default_css);
                t.notecount = await get_count();
            }
        },
        onSettingsCancel() {
            let t = this;
            t.mode = 'list';
        },
        onSettingsSave() {
            let t = this;
            save_keyval("taglist", t.edit_taglist);
            save_keyval("css", t.edit_style);
            t.reload();
        },
        onAddColor(e) {
            let t = this;
            const val = e.target.value;
            let style = `
.tagname {
    background: ${val};
}
`;
            t.edit_style += style;
        },
        async onImportFile(e) {
            let t = this;
            const file = e.target.files[0];
            const reader = new FileReader();

              // read the file content
              reader.onload = async e => {
                    let body = e.target.result;
                    let inputjson;

                    try {
                        inputjson = JSON.parse(body);
                    } catch {
                        alert("json format error!");
                        return;
                    }

                    let len = inputjson.length;
                    if (!confirm(`Do you want to import ${len} items?`)) {
                        alert("Cancelled");
                        return;
                    }

                    let count = await import_json(inputjson);
                    alert(`Imported ${count} notes.`);

                    t.onHome();
              };
              reader.readAsText(file);
        },
    }
}
</script>

<style>
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}
body {
    font-size: 15px;
}
a {
    text-decoration: none;
}

#app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

header {
    position: fixed;
    width: 100%;
    background: #5f7dff;
    font-weight: bold;
}
header .navi {
    padding: 10px;
	display: flex;
    justify-content: space-between;
    color: #fff;
    font-size: 18px;
    user-select: none;
}

header input {
    outline: none;
    border: none;
    width: 30%;
    padding: 2px 6px;
}
header a {
    margin-left: 20px;
    color: #fff;
}

main {
    padding-top: 85px;
}

.item {
    padding: 5px;
    border-bottom: 1px dashed #777;
    max-height: 40px;
    overflow: hidden;
}
.item.open {
    max-height: none;
    white-space: pre-line;
    border: 2px solid #000;
}
.item span {
    color: #22a;
    float: right;
    font-size: 70%;
}
.item a {
    color: #33f;
    float: right;
    clear: both;
}

.taglist {
    /*border-bottom: 1px solid #555;*/
    background: #5f7dff;
    /*padding: 7px;
    padding-left: 0;*/
    user-select: none;
    overflow-x: auto;
    white-space: nowrap;
}
.taglist span {
    padding: 8px 6px;
    display: inline-block;
}
.taglist span.active {
    border: 2px solid #000;
    padding: 6px 6px;
}

.editview {
    margin: 2%;
}

.editview textarea {
    width: 100%;
    height: 300px;
    padding: 5px;
    font-size: 110%;
    border: 0;
}
button {
    margin-right: 10px;
    padding: 6px 12px;
    border: 1px solid #888;
}
button.action {
    background: #b6ceff;
    border: 1px solid blue;
}
button.del {
    background: #ffabab;
    border: 1px solid red;
}
.daydelta button {
    margin: 0;
    margin-left: 4px;
}


.buttonrow {
	display: flex;
    justify-content: space-between;
}

.settingsview {
    margin: 2%;
    margin-top: -30px;
}
.settingsview textarea {
    width: 98%;
    height: 200px;
    padding: 5px;
}
.settingsview input[type=text] {
    width: 98%;
    padding: 4px;
}

h3 {
    margin-top: 18px;
}

hr {
    margin: 50px 0 10px;
    border: 0;
    border-bottom: 1px dashed #aaa;
}

@media screen and (min-width: 1000px) {
    /* emulate mobile screen */
    body {
        width: 50%;
        margin: 0 auto;
    }
    header {
        width: 50%;
    }

}

</style>

