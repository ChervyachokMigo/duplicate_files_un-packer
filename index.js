const fs = require(`fs`);
const fsu = require(`fs-extra`);
const md5hash = require('md5-file')
const getpath = require(`path`);
const ps = require(`child_process`);

const args = require('minimist')(process.argv.slice(2), {'--':true});
const sevenzip = `${getpath.dirname(process.argv[1])}\\7za`;

var config = {
    debug_no_store_archive: false,
    debug_remove_old_files: true,
    debug_check_all_files: true,
    debug_check_only_this_extentions: ['.mp4'],
    debug_delete_package_files_after_un_zipping: true,
    debug_extended_output: false, 
};

console.log(`==============================`);
console.log(`Duplicate Files (un)packer 1.0`);
console.log(`==============================`);

var folder_total_size = 0;
var zip_total_size = 0;

checkargs();

function checkargs(){
    if (typeof args.verbose !== `undefined`){
        config.debug_extended_output = true;
    }

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

        input = normalize(input);
        output = normalize(output);

        if (getpath.isAbsolute(output) === false){
            output = `${getpath.dirname(input)}\\${output}`;
            console.log(`Output set: ${output}`);
        }

        console.log(`Archive name set: ${getpath.basename(output , getpath.extname(output))}`);

        //create directories
        if (!fs.existsSync(`${output}`)) {
            fs.mkdirSync(`${output}`, {recursive: true}); 
        }

        console.log(`process starting...`);

        if (config.debug_remove_old_files == true){
            console.log(`clear old archive files..`);
            clearfiles(output, getpath.basename(output , getpath.extname(output)));
            deletefile(`${output}\\${getpath.basename(output , getpath.extname(output))}.zip`);
        }
        
        pack(input, output);    //(packpath, archivename);
        zip(input, output);

        if (config.debug_delete_package_files_after_un_zipping == true){
            clearfiles(output, getpath.basename(output , getpath.extname(output)));
        }

        var total_compress = folder_total_size - zip_total_size;
        var total_compress_procents = (1 - zip_total_size / folder_total_size) * 100; 

        console.log(`==============================`);
        console.log(`folder size: ${folder_total_size/1000000} MB`);
        console.log(`zip size: ${zip_total_size/1000000} MB`);
        console.log(`total compress: ${total_compress/1000000}  MB`);
        console.log(`compress effecienty: ${total_compress_procents} %`);
        console.log(`==============================`);

        console.log(`process complete.`);

        return true;
    }
    if (typeof args.u !== 'undefined' || typeof args.unpack !== 'undefined'){
        
        input = normalize(input);
        output = normalize(output);

        if (getpath.isAbsolute(output) === false){
            output = `${getpath.dirname(input)}\\${output}`;
            console.log(`Output set: ${output}`);
        }

        console.log(`process starting...`);

        try{
            var unpackresult = unpack(input, output);  //(archivepath, unpackpath);
            if (unpackresult == false){
                return false;
            }
        } catch (e){
            if (e.code === 'ENOENT') {
                console.error (`You invalid. retry`);
            } 
            console.error(e);
        }

        if (config.debug_delete_package_files_after_un_zipping == true){
            clearfiles(output, getpath.basename(input, getpath.extname(input)));
        }

        console.log(`process complete.`);

        return true;
    }
}

function clearfiles(dest, archivename){
    console.log(`clearing folder..`);
    deletefile(`${dest}\\${archivename}_skipped.log`);
    deletefile(`${dest}\\${archivename}_info.json`);
    deletefile(`${dest}\\${archivename}.pk`);
    deletefile(`${dest}\\${archivename}_zip_filelist.txt`);
    console.log(`finish clear.`)
}

function deletefile(pathname){
    try{ fs.rmSync(pathname); console.log(`deleted:`, pathname); } catch (e){
        //console.log(e);
    };
}

function pack(source, dest){
    var archivename = getpath.basename(dest,getpath.extname(dest));
    console.log(`pack started...`);
    function readdirRecursive(_path){
        var files = [];
        var dir = fs.readdirSync(_path);
        for (let file of dir){
            var nowpath = `${_path}\\${file}`;
            if (config.debug_extended_output == true){
                console.log(`checking: ${file}`);
            }
            if (fs.statSync(nowpath).isDirectory()){
                var subfiles = readdirRecursive(nowpath);
                files = [...files, ...subfiles];
            } else {
                try{
                    let size = fs.statSync(nowpath).size;
                    folder_total_size += size;
                    if (size < 2000000000){
                        let md5file = md5hash.sync(nowpath);
                        files.push({path: nowpath.substring(source.length+1), size: size, md5: md5file});
                    } else {
                        console.log(`skipped large file: `, nowpath);
                        fs.appendFileSync(`${dest}\\${archivename}_skipped.log`, `${nowpath.substring(source.length+1)}\n`, `utf-8`);
                    }
                } catch (e){
                    console.log(e);
                }
            }
        }
        return files;
    }
    console.log(`scanning folder: `, source);
    var AllFiles = readdirRecursive(source, archivename);
    console.log(`found ${AllFiles.length} files`);
    var filesdata = compareFilelistArrays(AllFiles, AllFiles);
    archiveStore(source, dest, archivename, filesdata);
    console.log(`pack finished.`);
}

function zip(source, dest){
    var filename = getpath.basename(dest,getpath.extname(dest));
    console.log(`starting zippping..`, `${dest}\\${filename}.zip`);
    var skippedFileList = '';
    if (fs.existsSync(`${dest}\\${filename}_skipped.log`)) {
        //make file list
        skippedFileList = fs.readFileSync(`${dest}\\${filename}_skipped.log`, `utf-8`);
        skippedFileList = skippedFileList.toString(`utf-8`).split(`\n`);
        for (let filenum in skippedFileList){
            if (skippedFileList[filenum].length>0){
                skippedFileList[filenum] = `"${source}\\${skippedFileList[filenum]}"`;
                if (config.debug_extended_output == true){
                    console.log(`add skipped large file: ${skippedFileList[filenum]}`)
                }
            }
        }
        skippedFileList = skippedFileList.join(" ");

        fs.appendFileSync(`${dest}\\${filename}_zip_filelist.txt`, `${dest}\\${filename}_skipped.log\n`);
    }
    

    if (fs.existsSync(`${dest}\\${filename}_info.json`) && fs.existsSync(`${dest}\\${filename}.pk`)) {
        fs.appendFileSync(`${dest}\\${filename}_zip_filelist.txt`, `${dest}\\${filename}_info.json\n`);
        fs.appendFileSync(`${dest}\\${filename}_zip_filelist.txt`, `${dest}\\${filename}.pk\n`);
    } else {
        console.error(`package files not exists!`);
        return false
    }
    
    ps.execSync(`cd /D "${dest}" && "${sevenzip}" a -mx0 "${dest}\\${filename}.zip" -ir@"${dest}\\${filename}_zip_filelist.txt" ${skippedFileList}`);

    zip_total_size = fs.statSync(`${dest}\\${filename}.zip`).size;

    console.log(`finish zipping.` );
}

function unzip(source, dest){
    console.log(`unzipping started...`);
    ps.execSync(`"${sevenzip}" x -y "${source}" -o"${dest}`);
    console.log(`unzip finished.`);
}

function compareFilelistArrays(FirstArray, SecondArray){
    var _uniqueFiles = [];
    var _similarFiles = [];

    console.log(`comparing files...`);

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

    var duplicateFilesCounter = 0; 
    for (var i = 0; i<FirstArray.length; i++){
        let found = false;
        for (var k = 0; k<SecondArray.length; k++){
            if (config.debug_check_all_files || config.debug_check_only_this_extentions.indexOf(getpath.extname(FirstArray[i].path)) > -1 ){
                if (compareFiles(FirstArray[i], SecondArray[k])){
                    let res = addSimilarFile(FirstArray[i]);
                    if (res === 'new'){
                        //console.log(`new similar files:`, FirstArray[i].path);
                    }
                    if (res === 'add'){
                        duplicateFilesCounter++;
                        //console.log(`add similar files`,  FirstArray[i].path);
                    }
                    if (res === 'skip'){
                        //console.log(`skip similar files`, FirstArray[i].path);
                    }
                    found = true;
                }
            }
        }
        if (found === false){
            _uniqueFiles.push(FirstArray[i]);
        }
    };

    console.log(`found ${duplicateFilesCounter} duplicate files.`);

    return {unique: _uniqueFiles, similar: _similarFiles};
}

function archiveStore(source, dest, archivename, archivedata){
    var jsondata = [];
    console.log(`saving archive: `, `${dest}\\${archivename}.pk`);

    console.log(`saving ${archivedata.unique.length+archivedata.similar.length} files`);

    function saveArchive(filesdata){
        for (let files of filesdata){

            let size = files.length>1?files[0].size:files.size;
            let filePath = files.length>1?files[0].path:files.path;

            if (config.debug_no_store_archive == false){
                if (config.debug_extended_output == true){
                    console.log(`add file to package: ${filePath}`);
                }
                let data = fs.readFileSync(`${source}\\${filePath}`);
                fs.appendFileSync(`${dest}\\${archivename}.pk`,data);
            }

            let pathes = files.length>1?{... files}:{... [files]};
            jsondata.push({pathes: pathes, size: size});
        }
    }

    saveArchive(archivedata.unique);
    saveArchive(archivedata.similar);

    console.log(`saving filelist: `, `${dest}\\${archivename}_info.json`);
    fs.writeFileSync(`${dest}\\${archivename}_info.json`, JSON.stringify({... jsondata}), {encoding:'utf-8'});
};

function unpack(source, dest){
    let archivename = getpath.basename(source, getpath.extname(source));

    function json2array(json){
        var result = [];
        var keys = Object.keys(json);
        keys.forEach(function(key){
            result.push(json[key]);
        });
        return result;
    }

    function readJson(archivename, dest){
        
        let jsonpath = '';
        jsonpath = `${dest}\\${archivename}_info.json`;
        
        console.log(`Loading filelist: ${jsonpath}`);
        let jsonfile = fs.readFileSync(jsonpath);
        let files = JSON.parse(jsonfile);
        files = json2array(files);
        for(let i in files){
            files[i].pathes = json2array(files[i].pathes);
        }
        return files
    }

    //create directories
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, {recursive: true}); 
    }

    if (getpath.extname(source) === `.zip`){
        unzip(source, dest);
    } else {
        console.log(`Wrong input: ${source}`);
        return false;
    }
    
    var files = readJson(archivename, dest);

    console.log(`unpack started...`);
    console.log(`found ${files.length} files`);
    var readedsize = 0;
    for(let num in files){
        let size = files[num].size;
        let pathes = files[num].pathes;
        let FirstFilePath = pathes[0].path;

        if (config.debug_extended_output == true){
            console.log(`unpacking file: ${FirstFilePath}`);
        }

        //create directories
        if (!fs.existsSync(getpath.dirname(`${dest}\\${FirstFilePath}`))) {
            fs.mkdirSync(getpath.dirname(`${dest}\\${FirstFilePath}`), {recursive: true}); 
        }

        //readfile  
        let fd = fs.openSync(`${dest}\\${archivename}.pk`, 'r');
        let buffer =  Buffer.alloc(size);
        fs.readSync(fd, buffer, 0 , size, readedsize);
        fs.closeSync(fd);
        readedsize += size;
        fs.writeFileSync( `${dest}\\${FirstFilePath}`, buffer);

        //copyng duplicates
        if (pathes.length>1){
            for (let i in pathes){
                if (i>0){
                    let SecondFilePath = pathes[i].path;
                    if (config.debug_extended_output == true){
                        console.log(`copying file ${SecondFilePath}`);
                    }
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

function restorePathes(input, output){
    console.log(`restoring pathes...`);
    var skippedFileList;
    var mainpath = `${getpath.dirname(input)}`;
    var archivename = `${getpath.basename(input, getpath.extname(input))}`;
    
    if (fs.existsSync(`${mainpath}\\${archivename}_skipped.log`)) {
        skippedFileList = fs.readFileSync(`${mainpath}\\${archivename}_skipped.log`,`utf-8`);
        skippedFileList = skippedFileList.split(`\n`)
        console.log(skippedFileList);
        for (let file of skippedFileList){
            if (file.length>0){
                fsu.moveSync(`${mainpath}\\${file}`, `${mainpath}\\${output}\\${file}`);
                
            }
        }
        cleanEmptyFoldersRecursively(mainpath);
    }
    console.log(`restored.`);
}

//from https://gist.github.com/jakub-g/5903dc7e4028133704a4
function cleanEmptyFoldersRecursively(folder) {
    var isDir = fs.statSync(folder).isDirectory();
    if (!isDir) {
      return;
    }
    var files = fs.readdirSync(folder);
    if (files.length > 0) {
      files.forEach(function(file) {
        var fullPath = getpath.join(folder, file);
        cleanEmptyFoldersRecursively(fullPath);
      });

      files = fs.readdirSync(folder);
    }

    if (files.length == 0) {
      fs.rmdirSync(folder);
      return;
    }
  }

function normalize(str){
    str = str.toString();
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