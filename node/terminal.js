/*
This file is part of node-cpanel.
Copyright (C) 2015  Artur Fogiel

node-cpanel is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

node-cpanel is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with node-cpanel.  If not, see <http://www.gnu.org/licenses/>.
*/

var http = require('http');
var fs   = require('fs');
var child_process = require('child_process');
var exec = child_process.exec;

var express = require('express');
var app = express();
// DEBUG FLAG
var DEBUG = true

var output = ""
/**
* @fn sys_cmd(cmd, res)
* @brief Executes system (bash) commands.
* 
* @param cmd Command to execute
* @param res Reference to response strean
*/
function sys_cmd(cmd, res) {
  res = typeof res !== 'undefined' ? res : null;
  
  child = exec(cmd, function (error, stdout, stderr) {
    output = stdout;
    if(DEBUG) {
      console.log('stdout: ' + stdout);
      console.log('stderr: ' + stderr);
    }
    if (error !== null) {
      console.log('exec error: ' + error);
    }
    // Replace newline with <br>
    output = output.replace(/(\n|\r)/g, "<br>");

    if(res) {
      res.send(output);
    }
  });
}
/**
* @fn readDirCallback(err, files)
*/
function readDirCallback(err, files) {
  if(err) throw err;

  var this_path = this.path
  var this_res  = this.res
  var files_dir = [];
  files.forEach(function(entry) {
    // Get file information
    var stats = fs.statSync(this_path + "/" + entry)
    var type = "file"
    if(stats.isDirectory()) { type = "dir" }
    var item_size = stats.size;
    var size_unit = " B";
    if(item_size > 1024) { item_size = (item_size / 1024); size_unit = " KB"; }
    if(item_size > 1024) { item_size = (item_size / 1024); size_unit = " MB"; }
    files_dir.push({name: entry, type: type, size: item_size.toFixed(2) + size_unit});
  });

  this.res.contentType('application/json');
  this.res.send(JSON.stringify(files_dir));
}
/**
* @brief List directory contents
* @param res Response stream reference
*/
function listDirectory(path, res) {
  console.log("path: " + path)
  fs.readdir(path, readDirCallback.bind({res: res, path: path}));
}
/**
* @fn exec_terminal(req, res)
* @brief Sends result of terminal commands
*/
function exec_terminal_handler(req, res) {
  var body = "";
  req.on('data', function(chunk) {
    body += chunk;
  });

  req.on('end', function() {
    console.log("Received: " + body)
    var cmd = decodeURIComponent(body).replace("c=", "")
    cmd = cmd.replace(/%20/g, " ")
    console.log("cmd: " + cmd)
    sys_cmd(cmd, res);
  });
}
/**
* @fn list_files(req, res)
* @brief List files at selected path
*/
function list_files_handler(req, res) {
  var body = "";
  req.on('data', function(chunk) {
    body += chunk;
  });

  req.on('end', function() {
    var path = decodeURIComponent(body).replace("p=", "")
    path = path.replace(/%20/g, " ")
    
    listDirectory(path, res);
  });
}
/**
* @fn send_file_handler(req, res)
*/
function send_file_handler(req, res) {
  var body = "";
  req.on('data', function(chunk) {
    body += chunk;
  });

  req.on('end', function() {
    var path = decodeURIComponent(body).replace("f=", "")
    path = path.replace(/%20/g, " ");
    console.log("Sending file: " + path);
    res.download(path);
  });
}
/**
* @class ArchiveManager
* @brief Manages creation of archives
* 
* Creates tar, gzip, xz archives
*/
function ArchiveManager(path) {
  this.archive_path = path;
  this.files_added = 0;
  //this.files_list = fs.createWriteStream('files_list.txt');
}

ArchiveManager.prototype.add_file = function(file_path) {
  var cmd = ''
  if(this.files_added == 0) {
    cmd = 'tar -cvf ' + this.archive_path + ' ' + file_path;
    this.files_added += 1;
  } else {
    cmd = 'tar -f ' + this.archive_path + ' -r ' + file_path;
    this.files_added += 1;
  }
  child_process.execSync(cmd, {stdio:[0,1,2]});
};
/**
* @fn pack_files_handler(req, res)
*/
function pack_files_handler(req, res) {
  var body = "";
  req.on('data', function(chunk) {
    body += chunk;
  });

  req.on('end', function() {
    var pack_list = decodeURIComponent(body).replace("f=", "")
    decoded_list = JSON.parse(pack_list);
    am = new ArchiveManager("/tmp/Archive.tar");
    decoded_list.forEach(function(entry) {
      am.add_file(entry);
    });
    res.send("OK");
  });
}
///////////////////////////
// ROUTERS CONFIGURATION //
///////////////////////////
app.post('/terminal', exec_terminal_handler);
app.post('/send_file', send_file_handler);
app.post('/files', list_files_handler);
app.post('/pack', pack_files_handler);

app.get('/', function(req, res) {
  res.send('Node works !');
});
//////////////////
// STARTING APP //
//////////////////
var server = app.listen(8777, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});