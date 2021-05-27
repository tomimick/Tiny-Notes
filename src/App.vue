<template>
  <header>
  <div class="navi">
      <span>Diary {{title}}</span>
      <input type="text" v-model="search" autocomplete="off" />
      <span>
          <a href="#" @click="onSettingsOpen">&#9776;</a>
          <a href="#" @click="onAdd">New</a>
      </span>
  </div>
  <div class="taglist"  v-if="mode!='settings'">
  <span v-for="(item, index) in tags" :key="index" @click="onSelectTag(item)"
        :style="{ backgroundColor: item.color }"
        :class="{ active: tag_selected == item.name }">
    {{item.name}}
  </span>
  </div>
  </header>

  <main>
  <div class="items" v-if="mode=='list'">
      <div v-for="(item, index) in items" :key="index" class="item"
        :style="{ backgroundColor: get_tag_color(item.tag)}"
        :class="{ open: item.id == note_selected.id }" @click="onToggle(item)">
         <span>{{item.tag}} {{epoch_to_text(item.created)}}</span>
         <a href="#" @click.stop="onEdit(item)"
            v-show="item.id == note_selected.id">Edit</a>
        {{item.text}}
      </div>
  </div>

  <div class="edit" v-if="mode=='edit'">
    <textarea ref="textbody" v-model="body"></textarea>

    <div class="buttonrow">
        <span>
        <button @click="onDelete" v-if="note_selected.id">Delete</button>
        <button @click="onCancelEdit">Cancel</button>
        <button @click="onSave" class="action">Save</button>
        </span>
        <span>
        <button @click="delta-=1">-</button>
        <button @click="delta+=1">+</button>
        {{delta}}
        </span>
    </div>
  </div>

  <div class="settings" v-if="mode=='settings'">
      <h2>Settings</h2>
      <h3>Tags</h3>
      <p>{{tags}}</p>

      <input type="color" />

      <h3>Export</h3>
      <button @click="onDownload">Export notes</button>

      <hr/>

      <button @click="onSettingsCancel">Cancel</button>
      <button @click="onSettingsSave" class="action">Save</button>
  </div>

  </main>

  <ReloadPrompt />
</template>

<script>
import ReloadPrompt from './ReloadPrompt.vue'
import {open_db, insert_note, update_note, query_notes, delete_note} from './db.js'
import {download, build_export, epoch_to_text} from './util.js'


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
            tags:[
                {name:"tag1", color:"#fff"},
                {name:"tag2", color:"#bdf6a6"},
                {name:"tag3", color:"#ffb1aa"},
                ],
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
        async reload() {
            let t = this;
            t.items = await query_notes(t.tag_selected, t.search);
        },
        get_tag_color(tag) {
            for (let item of this.tags) {
                if (tag == item.name)
                    return item.color;
            }
        },
        onAdd() {
            let t = this;
            t.body = '';
            t.delta = 0;
            t.tag_selected = '';
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
            this.tag_selected = (this.tag_selected == tag.name) ? '' : tag.name;
            this.reload();
        },
        async onSave() {
            let t = this;
            //let text = prompt("kerro");
            let text = t.body;
            let tag = t.tag_selected || 'life';
            if (t.note_selected.id) {
                await update_note(t.note_selected.id, tag, text, t.delta);
            } else {
                await insert_note(tag, text);
            }
            t.reload();
            t.mode = 'list';
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
            t.mode = 'list';
            t.reload();
        },
        async onDownload() {
            let t = this;
            let items = await query_notes();
            let txt = build_export(items);
            download(txt);

        },
        clearSelection() {
            this.note_selected = {id:0,text:''};
        },
        onSettingsOpen() {
            let t = this;
            t.mode = 'settings';
        },
        onSettingsCancel() {
            let t = this;
            t.mode = 'list';
        },
        onSettingsSave() {
            let t = this;
            t.mode = 'list';
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
    background: #55f;
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
    padding-top: 78px;
}

.item {
    padding: 5px;
    border-bottom: 1px dotted #caa;
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
    background: #fff;
    padding: 5px;
    padding-left: 0;
    user-select: none;
    overflow-x: auto;
}
.taglist span {
    padding: 3px 6px;
}
.taglist span.active {
    border: 2px solid #000;
}

.edit textarea {
    width: 98%;
    height: 300px;
    padding: 5px;
    margin: 1%;
    font-size: 110%;
    border: 0;
}
button {
    margin-right: 15px;
    padding: 4px 10px;
}
button.action {
    background: #b6ceff;
    border: 1px solid blue;
}

.buttonrow {
	display: flex;
    justify-content: space-between;
}

.settings {
    xtext-align: center;
}

h3 {
    margin-top: 24px;
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

