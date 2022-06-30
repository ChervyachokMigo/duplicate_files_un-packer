const fs = require(`fs`);
const getpath = require(`path`);
const args = require('minimist')(process.argv.slice(2), {'--':true});
var keypress = require('keypress');
var colors = require("cli-color");

console.log(args.json);
var source = args.json;

function json2array(json){
    var result = [];
    var keys = Object.keys(json);
    keys.forEach(function(key){
        result.push(json[key]);
    });
    return result;
}

function readJson(source){
    let filename = getpath.basename(source, getpath.extname(source));
    let jsonpath = `${getpath.dirname(source)}\\${filename}.json`;
    console.log(`Filelist set: ${jsonpath}`);
    let jsonfile = fs.readFileSync(jsonpath);
    let files = JSON.parse(jsonfile);
    files = json2array(files);
    for(let i in files){
        files[i].pathes = json2array(files[i].pathes);
    }
    return files
}

var ux = {
    cursor_offset: 0,
    cursor_offset_local: 0,
    display_files_max: 35,
}
var files = readJson(source);

files = files.sort((a,b)=>{
    return getpath.basename(a.pathes[0].path).localeCompare(getpath.basename(b.pathes[0].path))
});

if (files.length<ux.display_files_max){
    ux.display_files_max = files.length;
}

keypress(process.stdin);
 
// listen for the "keypress" event
process.stdin.on('keypress', function (ch, key) {

  if (key){
        if (key.name == 'down') {
            if (key.ctrl == true){
                ux.cursor_offset+=ux.display_files_max;
            } if (key.shift == true) {
                ux.cursor_offset+=5;
            } else {
                ux.cursor_offset++;
            }
            if (ux.cursor_offset + ux.display_files_max > files.length) {
                ux.cursor_offset = files.length - ux.display_files_max ;
            }
            if (ux.cursor_offset >= files.length - ux.display_files_max) {
                if (files.length-ux.cursor_offset-ux.cursor_offset_local>1){
                    ux.cursor_offset_local++;
                }
            }
        }
        if (key.name == 'up') {
            if (ux.cursor_offset_local>0){
                ux.cursor_offset_local--;
            } else {
                if (key.ctrl == true){
                    ux.cursor_offset-=ux.display_files_max;
                } if (key.shift == true) {
                    ux.cursor_offset-=5;
                } else {
                    ux.cursor_offset--;
                }
                
                if(ux.cursor_offset<0) ux.cursor_offset = 0;
            }
        }
        if (key.name == 'escape'){
            process.stdin.pause();
        }
    }
    refresh();
    //console.log('got "keypress"', key);
    function refresh(){
        console.clear();
        console.log(`\n`,colors.blueBright(`filename`), colors.blueBright(`copies`));
        for(let i = ux.cursor_offset; i < ux.display_files_max+ux.cursor_offset; i++){
            if (i == (ux.cursor_offset+ ux.cursor_offset_local)){
                console.log(colors.white(files[i].pathes[0].path), files[i].pathes.length);
            } else {
                console.log(colors.blackBright(files[i].pathes[0].path), files[i].pathes.length);
            }
        }
        console.log(colors.blackBright([`${ux.cursor_offset_local}`, `${ux.cursor_offset}`]));
    }
});

process.stdin.setRawMode(true);
process.stdin.resume();

 
