
/* Build a json string of all notes. */
export function build_export(itemlist) {

    let data = [];
    for (let item of itemlist) {
        data.push(JSON.stringify(item)+"\n");
    }
    return "["+ data.toString() + "]";
}

/* Invoke download function for the content. */
export function download(body) {
    let d = new Date();
    let iso = d.toISOString().substr(0,10);
    let filename = `diary-export-${iso}.txt`;

    let element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(body));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

export function epoch_to_text(secs) {
    let zero = new Date();
    var d = new Date(secs*1000); // - 60000 * zero.getTimezoneOffset());
    let txt = d.toLocaleDateString('fi');
    //txt = txt.substr(0,5);
    return txt;
}
