const fs = require(`fs`);
const md5hash = require('md5-file')
const getpath = require(`path`);
const ps = require(`child_process`);

const args = require('minimist')(process.argv.slice(2), {'--':true});

var config = {
    debug_no_store_archive: false,
    debug_remove_old_files: true,
    debug_check_all_files: true,
    debug_check_only_this_extentions: ['.mp4'],
    debug_delete_package_files_after_zipping: true,
};
console.log(`==============================`);
console.log(`Duplicate Files (un)packer 1.0`);
console.log(`==============================`);

checkargs();
function checkargs(){
    if (typeof args.p !== 'undefined' && typeof args.u !== 'undefined' || 
        typeof args.pack !== 'undefined' && typeof args.unpack !== 'undefined'){
        console.log(`something wrong. retry`);
        return false;
    } else {
        if (typeof args.p !== 'undefined' || typeof args.pack !== 'undefined' ){
            console.log(`Action: packing`);
        }
        if (typeof args.u !== 'undefined' || typeof args.unpack !== 'undefined'){
            console.log(`Action: unpacking`);
        }
    }
    var output = '';
    var input = '';

    if (typeof args.i !== 'undefined' || typeof args.in !== 'undefined' || typeof args.input !== 'undefined') {
        if (typeof args.i !== 'undefined') input = args.i;
        if (typeof args.in !== 'undefined') input = args.in;
        if (typeof args.input !== 'undefined') input = args.input;
        console.log(`Input: `, input);
    } else {
        console.log(`set source. retry`);
        return false;
    }

    if (typeof args.o !== 'undefined' || typeof args.out !== 'undefined' || typeof args.output !== 'undefined') {
        if (typeof args.o !== 'undefined') output = args.o;
        if (typeof args.out !== 'undefined') output = args.out;
        if (typeof args.output !== 'undefined') output = args.output;
        console.log(`Output:`, output);
    } else {
        console.log(`set destination. retry`);
        return false;
    }
    console.log(`==============================`);
    
    if (typeof args.p !== 'undefined' || typeof args.pack !== 'undefined'){
        if (config.debug_remove_old_files == true){
            console.log(`clear old archive files..`);
            try{fs.rmSync(`${input}\\${output}_skipped.log`);} catch (e){}
            try{fs.rmSync(`${input}\\${output}_info.json`);} catch (e){}
            try{fs.rmSync(`${input}\\${output}.pk`);} catch (e){}
            try{fs.rmSync(`${input}\\${output}_zip_filelist.txt`);} catch (e){}
            try{fs.rmSync(`${input}\\${output}.zip`);} catch (e){}
        }
        pack(input, output);    //(packpath, archivename);
        zip(input, output);
        function zip(path, filename){
            console.log(`starting zippping..`);
            if (fs.existsSync(`${path}\\${filename}_skipped.log`)) {
                //make file list
                let skippedFileList = fs.readFileSync(`${path}\\${filename}_skipped.log`);
                skippedFileList = skippedFileList.toString(`utf-8`).split(`\n`);
                for (let skippedfilepath of skippedFileList){
                    if (skippedfilepath.length>0){
                        fs.appendFileSync(`${path}\\${filename}_zip_filelist.txt`, `${path}\\${skippedfilepath}\n`);
                    }
                }
                fs.appendFileSync(`${path}\\${filename}_zip_filelist.txt`, `${path}\\${filename}_skipped.log\n`);
            }

            if (fs.existsSync(`${path}\\${filename}_info.json`) && fs.existsSync(`${path}\\${filename}.pk`)) {
                fs.appendFileSync(`${path}\\${filename}_zip_filelist.txt`, `${path}\\${filename}_info.json\n`);
                fs.appendFileSync(`${path}\\${filename}_zip_filelist.txt`, `${path}\\${filename}.pk\n`);
            } else {
                console.error(`package files not exists!`);
                return false
            }
            
            ps.execSync(`rar a -m0 -ep1 "${path}\\${filename}.zip" @"${path}\\${filename}_zip_filelist.txt"`);

            console.log(`finish zip.`)
        }
        if (config.debug_delete_package_files_after_zipping == true){
            clearfiles(input, output);
        }

        return true;
    }
    if (typeof args.u !== 'undefined' || typeof args.unpack !== 'undefined'){
        try{
            unpack(input, output);  //(archivepath, unpackpath);
        } catch (e){
            if (e.code === 'ENOENT') {
                console.error (`You invalid. retry`);
                console.error(e);
            } else {
                console.error(e);
            }
        }
        if (config.debug_delete_package_files_after_zipping == true){
            clearfiles(getpath.dirname(input), getpath.basename(input,getpath.extname(input)));
        }
        return true;
    }
}

function clearfiles(input, output){
    console.log(`clearing folder..`);
    try{fs.rmSync(`${input}\\${output}_skipped.log`);} catch (e){}
    try{fs.rmSync(`${input}\\${output}_info.json`);} catch (e){}
    try{fs.rmSync(`${input}\\${output}.pk`);} catch (e){}
    try{fs.rmSync(`${input}\\${output}_zip_filelist.txt`);} catch (e){}
    console.log(`finish clear.`)
}


function pack(path, archivename){
    console.log(`pack started...`);
    var startpath = path;
    function readdirRecursive(_path, archivename){
        var files = [];
        var dir = fs.readdirSync(_path);
        for (let file of dir){
            var nowpath = `${_path}\\${file}`;
            if (fs.statSync(nowpath).isDirectory()){
                var subfiles = readdirRecursive(nowpath, startpath);
                files = [...files, ...subfiles];
            } else {
                try{
                    let size = fs.statSync(nowpath).size; 
                    if (size < 2000000000){
                        let md5file = md5hash.sync(nowpath);
                        files.push({path: nowpath.substring(startpath.length+1), size: size, md5: md5file});
                    } else {
                        fs.appendFileSync(`${startpath}\\${archivename}_skipped.log`, `${nowpath.substring(startpath.length+1)}\n`);
                    }
                } catch (e){
                    console.log(e);
                }
            }
        }
        return files;
    }
    var AllFiles = readdirRecursive(path, archivename);
    var filesdata = compareArrs(AllFiles, AllFiles);
    archiveStore(path, archivename, filesdata);
    console.log(`pack finished.`);
}

function compareArrs(FirstArray, SecondArray){
    var _uniqueFiles = [];
    var _similarFiles = [];

    function addSimilarFile(addfile){
        var canadd = false;
        for(copies of _similarFiles){
            for (file of copies){
                if (addfile.md5 === file.md5){
                    if (addfile.path !== file.path){
                        canadd = true;
                    } else {
                        return 'skip';
                    }
                }
            }
            if (canadd === true){
                copies.push(addfile);
                return 'add';  
            }
        }

        _similarFiles.push([addfile]);
        return 'new';
    };

    function compareFiles(FirstFile, SecondFile){
        if (FirstFile.path !== SecondFile.path){
            if (FirstFile.md5 === SecondFile.md5){
                if (FirstFile.size === SecondFile.size) {
                    return true;
                }
            }
        }
        return false;
    };

    for (var i = 0; i<FirstArray.length; i++){
        let found = false
        for (var k = 0; k<SecondArray.length; k++){
            if (config.debug_check_all_files || config.debug_check_only_this_extentions.indexOf(getpath.extname(FirstArray[i].path)) > -1 ){
                if (compareFiles(FirstArray[i], SecondArray[k])){
                    let res = addSimilarFile(FirstArray[i]);
                    /*if (res === 'new'){
                        console.log(`new similar files:`, FirstArray[i].path);
                    }
                    if (res === 'add'){
                        console.log(`add similar files`,  FirstArray[i].path);
                    }
                    if (res === 'skip'){
                        console.log(`skip similar files`, FirstArray[i].path);
                    }*/
                    found = true;
                }
            }
        }
        if (found === false){
            _uniqueFiles.push(FirstArray[i]);
        }
    };

    return {unique: _uniqueFiles, similar: _similarFiles};
}

function archiveStore(path, archivename, archivedata){
    var jsondata = [];

    function appendJsonData(filesdata){
        for (let files of filesdata){
            let size = files.length>1?files[0].size:files.size;
            let filePath = files.length>1?files[0].path:files.path;
            if (size < 2000000000){
                if (config.debug_no_store_archive == false){
                    let data = fs.readFileSync(`${path}\\${filePath}`);
                    fs.appendFileSync(`${path}\\${archivename}.pk`,data);
                }
                let pathes = files.length>1?{... files}:{... [files]};
                jsondata.push({pathes: pathes, size: size});
            } else {
                fs.appendFileSync(`${path}\\${archivename}_skipped.log`, `${filePath}\n`);
            }
        }
    }

    appendJsonData(archivedata.unique);
    appendJsonData(archivedata.similar);

    fs.writeFileSync(`${path}\\${archivename}_info.json`, JSON.stringify({... jsondata}), {encoding:'utf-8'});
};

function unpack(source, dest){

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
        let jsonpath = `${getpath.dirname(source)}\\${filename}_info.json`;
        console.log(`Filelist set: ${jsonpath}`);
        let jsonfile = fs.readFileSync(jsonpath);
        let files = JSON.parse(jsonfile);
        files = json2array(files);
        for(let i in files){
            files[i].pathes = json2array(files[i].pathes);
        }
        return files
    }

    source = normalize(source);
    dest = normalize(dest);

    if (getpath.isAbsolute(dest) === false){
        dest = `${getpath.dirname(source)}\\${dest}`;
        console.log(`Output set: ${dest}`);
    }

    //create directories
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, {recursive: true}); 
    }

    unzip(source, dest)
    function unzip(source, dest){
        console.log(`unzipping started...`);
        ps.execSync(`rar x -y -r -o+ "${source}" "${getpath.dirname(source)}"`);
        console.log(`unzip finished.`);
    }
    
    var files = readJson(source);

    console.log(`unpack started...`);
    var readedsize = 0;
    for(let num in files){
        let size = files[num].size;
        let pathes = files[num].pathes;
        let FirstFilePath = pathes[0].path;
        //console.log(pathes)

        //create directories
        if (!fs.existsSync(getpath.dirname(`${dest}\\${FirstFilePath}`))) {
            fs.mkdirSync(getpath.dirname(`${dest}\\${FirstFilePath}`), {recursive: true}); 
        }

        //readfile  
        let fd = fs.openSync(source, 'r');
        let buffer =  Buffer.alloc(size);
        fs.readSync(fd, buffer, 0 , size, readedsize);
        readedsize += size;
        fs.writeFileSync( `${dest}\\${FirstFilePath}`, buffer);

        if (pathes.length>1){
            for (let i in pathes){
                if (i>0){
                    let SecondFilePath = pathes[i].path;
                    //create directories
                    if (fs.existsSync(getpath.dirname(`${dest}\\${SecondFilePath}`)) === false) {
                        fs.mkdirSync(getpath.dirname(`${dest}\\${SecondFilePath}`), {recursive: true}); 
                    }
                    //copyfile
                    fs.copyFileSync( `${dest}\\${FirstFilePath}`, `${dest}\\${SecondFilePath}`);
                }
            }
        }
    }
    console.log(`unpack finished.`);
}

function normalize(str){
    //str = str.replaceAll('"', '');
    str = str.replaceAll(/\/{2,}/g,'\\');
    str = str.replace(/\\{2,}/g,'\\');
    if (str.endsWith(`\\`)){
        str = str.substr(0,str.length-1);
    }
    if (str.startsWith(`\\`)){
        str = str.substr(1,str.length-1);
    }
    str = str.trim()
    return str;
}