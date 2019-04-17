"use strict";
Promise = require('bluebird')

var exec = require('child_process').exec,
  host_platform = process.platform,
  logging = require('./logging'),
  vBoxManageBinary,
  vbox_version,
  known_OS_types = {
    WINDOWS: 'windows',
    MAC: 'mac',
    LINUX: 'linux'
  };


// Host operating system
if (/^win/.test(host_platform)) {

  // Path may not contain VBoxManage.exe but it provides this environment variable
  var vBoxInstallPath = process.env.VBOX_INSTALL_PATH || process.env.VBOX_MSI_INSTALL_PATH;
  vBoxManageBinary = '"' + vBoxInstallPath + '\\VBoxManage.exe' + '" ';

} else {

  // Mac OS X and most Linux  use the same binary name, in the path
  vBoxManageBinary = 'vboxmanage ';

} 

exec(vBoxManageBinary + ' --version', (error, stdout, stderr) => {
  // e.g., "4.3.38r106717" or "5.0.20r106931"
  vbox_version = stdout.split(".")[0];
  logging.info("Virtualbox version detected as %s", vbox_version);
});
function command(cmd) {
  return new Promise((resolve,reject )=> {
    exec(cmd, (err, stdout, stderr)  =>{
      if (!err && stderr && cmd.indexOf("pause") !== -1 && cmd.indexOf("savestate") !== -1) {
        err = new Error(stderr);
        reject(err);
      }
      resolve(stdout);
    });
  });
}

function vboxcontrol(cmd) {
  return new Promise( (resolve, reject) =>{
    command('VBoxControl ' + cmd)
    .then(stdout => {
      resolve(stdout);
    })
    .catch((error) => {
      reject(error);
    });
  });
}

function vboxmanage(cmd) {
  return new Promise( (resolve,reject) =>{
  command(vBoxManageBinary + cmd).then((stdout)=> {
    resolve(stdout);
  }).catch((error)=> {
    reject(error);
    });
  });
}

function pause(vmname) {
  return  new Promise( (resolve,reject) => {
    logging.info('Pausing VM "%s"', vmname);
    vboxmanage('controlvm "' + vmname + '" pause')
    .then((stdout)=> {
      resolve(stdout);
  })
    .catch((error)=> {
      reject(error);
    });
  });
}

function list() {
  return new Promise( (resolve, reject) => {
  logging.info('Listing VMs');
  vboxmanage('list "runningvms"').then((stdout) => {
    var _list = {};
    var _runningvms = parse_listdata(stdout);
    vboxmanage('list "vms"').then((full_stdout) => {
      var _all = parse_listdata(full_stdout);
      var _keys = Object.keys(_all);
      for (var _i = 0; _i < _keys.length; _i += 1) {
        var _key = _keys[_i];
        if (_runningvms[_key]) {
          _all[_key].running = true;
        } else {
          _all[_key].running = false;
        }
      }
      resolve(_all);
    }).catch((error) => {
      reject(error)
    });
  }).catch((error) => {
    reject(error);
  });
  
});
}

function parse_listdata(raw_data) {
  var _raw = raw_data.split(/\r?\n/g);
  var _data = {};
  if (_raw.length > 0) {
    for (var _i = 0; _i < _raw.length; _i += 1) {
      var _line = _raw[_i];
      if (_line === '') {
        continue;
      }
      // "centos6" {64ec13bb-5889-4352-aee9-0f1c2a17923d}
      var rePattern = /^"(.+)" \{(.+)\}$/;
      var arrMatches = _line.match(rePattern);
      // {'64ec13bb-5889-4352-aee9-0f1c2a17923d': 'centos6'}
      if (arrMatches && arrMatches.length === 3) {
        _data[arrMatches[2].toString()] = {
          name: arrMatches[1].toString()
        };
      }
    }
  }
  return _data;
}

function reset(vmname) {
  return new Promise( (resolve,reject) => {
    logging.info('Resetting VM "%s"', vmname);
    vboxmanage('controlvm "' + vmname + '" reset')
    .then((stdout)=> {
      resolve(stdout);
    })
    .catch((error)=> {
      reject(error);
    }); 
  })
}

function resume(vmname) {
  return new Promise( (resolve,reject) => {
    logging.info('Resuming VM "%s"', vmname);
    vboxmanage('controlvm "' + vmname + '" resume')
    .then((stdout)=> {
        resolve(stdout);
    })
    .catch((error) => {
      reject(error);
    });
  });
}

function start(vmname, use_gui) {
   return new Promise( (resolve,reject) => {
    var start_opts = ' --type ';
    if ((typeof use_gui) === 'function') {
      callback = use_gui;
      use_gui = false;
    }
    start_opts += (use_gui ? 'gui' : 'headless');
    logging.info('Starting VM "%s" with options: ', vmname, start_opts);
    vboxmanage('-nologo startvm "' + vmname + '"' + start_opts)
    .then(stdout => {
      resolve(stdout);
  })
    .catch((error) => {
      if (error && /VBOX_E_INVALID_OBJECT_STATE/.test(error.message)) {
        error = undefined;
      }
      reject(error);
    });
  });
}

function stop(vmname) {
  return new Promise( (resolve,reject) => {
    logging.info('Stopping VM "%s"', vmname);
    vboxmanage('controlvm "' + vmname + '" savestate')
    .then(stdout => {
      resolve(stdout);
    })
    .catch((error)=> {
      reject(error);
    });
  });
}

function savestate(vmname) {
  return  new Promise( (resolve,reject) => {
    logging.info('Saving State (alias to stop) VM "%s"', vmname);
    stop(vmname)
    .then(stdout => {
      resolve(stdout);
  })
  .catch((error)=> {
    reject(error);
  });
});
}

function vmExport(vmname, output) {
  return new Promise( (resolve,reject) => {
    logging.info('Exporting VM "%s"', vmname);
    vboxmanage('export "' + vmname + '" --output "' + output + '"',)
    .then(stdout => {
      resolve(stdout);
  })
  .catch((error)=>{
      reject(error);
    });
  });
}

function poweroff(vmname) {
  return new Promise( (reject,resolve) => { 
    logging.info('Powering off VM "%s"', vmname);
    vboxmanage('controlvm "' + vmname + '" poweroff')
    .then(stdout => {
        resolve(stdout);
    })
  .catch(error => {
    reject(error);
    });
  });
}

function acpipowerbutton(vmname) {
  return new Promise( (resolve,reject) => {
    logging.info('ACPI power button VM "%s"', vmname);
    vboxmanage('controlvm "' + vmname + '" acpipowerbutton')
    .then(stdout => {
      resolve(stdout);
  }).catch(error => {
      reject(error);
    });
  });
}

function acpisleepbutton(vmname) {
  return new Promise( (resolve,reject) =>{
    logging.info('ACPI sleep button VM "%s"', vmname);
    vboxmanage('controlvm "' + vmname + '" acpisleepbutton')
    .then(stdout => {
        resolve(stdout);
    }).catch(error => {
      reject(error);
    });
  });
}
function modify(vname, properties) {
  return new Promise( (resolve,reject) => {
    logging.info('Modifying VM %s', vname);
    var args = [vname];
    for (var property in properties) {
      if (properties.hasOwnProperty(property)) {
        var value = properties[property];
        args.push('--' + property);
      if (Array.isArray(value)) {
        Array.prototype.push.apply(args, value);
      }
      else {
        args.push(value.toString());
      }
    }
  }

  var cmd = 'modifyvm ' + args.map((arg) => {
    return '"' + arg + '"';
  }).join(' ');

  vboxmanage(cmd)
  .then(stdout => {
    resolve(stdout);
  }).catch(error => {
    reject(error);
    });
  });
}

function snapshotList(vmname) {
  return  new Promise( (resolve,reject) => {
    logging.info('Listing snapshots for VM "%s"', vmname);
    vboxmanage('snapshot "' + vmname + '" list --machinereadable')
    .then(stdout => {
      var s;
      var snapshots = [];
      var currentSnapshot;
      var lines = (stdout || '').split(require('os').EOL);
      lines.forEach((line) => {
      line.trim().replace(/^(CurrentSnapshotUUID|SnapshotName|SnapshotUUID).*\="(.*)"$/, (l, k, v) => {
        if (k === 'CurrentSnapshotUUID') {
          currentSnapshot = v;
        }
        else if (k === 'SnapshotName') {
          s = {
            'name': v
          };
          snapshots.push(s);
        }
        else {
          s.uuid = v;
        }
      });
    });

    resolve(snapshots, currentSnapshot);
  }).catch(error => {
    reject(error);
    });
  });
}

function snapshotTake(vmname, name, /*optional*/ description, /*optional*/ live) {
  return new Promise( (resolve,reject) => {
    logging.info('Taking snapshot for VM "%s"', vmname);
    if(typeof description === 'function') {
      callback = description;
      description = undefined;
    }
    else if(typeof live === 'function') {
      callback = live;
      live = false;
    }
  var cmd = 'snapshot ' + JSON.stringify(vmname) + ' take ' + JSON.stringify(name);
  if(description) {
    cmd += ' --description ' + JSON.stringify(description);
  }
  if(live === true) {
    cmd += ' --live';
  }

    vboxmanage(cmd).then(stdout => {
    var uuid;
    stdout.trim().replace(/UUID\: ([a-f0-9\-]+)$/, (l, u) =>{
      uuid = u;
    });
    resolve(uuid);
  })
  .catch(error => {
    reject(error);
    });
  });
}

function snapshotDelete(vmname, uuid) {
  return  new Promise( (resolve,reject) => {
    logging.info('Deleting snapshot "%s" for VM "%s"', uuid, vmname);
    var cmd = 'snapshot ' + JSON.stringify(vmname) + ' delete ' + JSON.stringify(uuid);
    vboxmanage(cmd).then(stdout => {
    resolve(stdout);
  }).catch(error => {
    promise.reject(error);
    });
  });
}

function snapshotRestore(vmname, uuid) {
  return  new Promise( (resolve,reject) => {
    logging.info('Restoring snapshot "%s" for VM "%s"', uuid, vmname);
    var cmd = 'snapshot ' + JSON.stringify(vmname) + ' restore ' + JSON.stringify(uuid);
    vboxmanage(cmd).then(stdout => {
      resolve(stdout);
  }).catch(error => {
      reject(error);
    });
  });
}
function isRunning(vmname) {
  return new Promise((resolve,reject) => {
    var cmd = 'list runningvms';
    var isrunning = false;
    vboxmanage(cmd).then(stdout => {
      logging.info('Checking virtual machine "%s" is running or not', vmname);
      if (stdout.indexOf(vmname) === -1) {
        isrunning = false;
      }else {
        isrunning = true;
      }
        resolve(isrunning);
    }).catch(error => {
      reject(error);
    });
  });
} 
function keyboardputscancode(vmname, codes) {
  return new Promise( (resolve,reject) => {
    var codeStr = codes.map(function(code) {
    var s = code.toString(16);
    if (s.length === 1) {
      s = '0' + s;
    }
    return s;
  }).join(' ');
  logging.info('Sending VM "%s" keyboard scan codes "%s"', vmname, codeStr);
  vboxmanage('controlvm "' + vmname + '" keyboardputscancode ' + codeStr)
  .then(stdout => {
    resolve(stdout);
  })
  .catch(error => {
    reject(error);
    });
  });
}

function vmExec(options) {
  return new Promise( (resolve,reject) => {
    var vm = options.vm || options.name || options.vmname || options.title,
    username = options.user || options.username || 'Guest',
    password = options.pass || options.passwd || options.password,
    path = options.path || options.cmd || options.command || options.exec || options.execute || options.run,
    params = options.params || options.parameters || options.args;

    if (Array.isArray(params)) {
      params = params.join(" ");
    }
    if (params === undefined) {
      params = "";
    }
    guestproperty.os(vm).then(os_type => {
      var cmd = 'guestcontrol "' + vm + '"';
      var runcmd = ' execute  --image ';
    //Version equaling was a verry bad idea
    if (vbox_version >= 5) {
      runcmd = ' run ';
    }
    switch (os_type) {
      case known_OS_types.WINDOWS:
        path = path.replace(/\\/g, '\\\\');
        cmd += runcmd + ' "cmd.exe" --username ' + username + (password ? ' --password ' + password : '') + ' -- "/c" "' + path + '" "' + params + '"';
        break;
      case known_OS_types.MAC:
        cmd += runcmd + ' "/usr/bin/open -a" --username ' + username + (password ? ' --password ' + password : '') + ' -- "/c" "' + path + '" "' + params + '"';
        break;
      case known_OS_types.LINUX:
        cmd += runcmd + ' "/bin/bash" --username ' + username + (password ? ' --password ' + password : '') + ' -- "-c" "' + path + '" "' + params + '"';
        break;
      default:
        break;
    }

    logging.info('Executing command "vboxmanage %s" on VM "%s" detected OS type "%s"', cmd, vm, os_type);

    vboxmanage(cmd).then(stdout => {
      resolve(stdout);
    }).catch(error => {
      reject(error);
    
    });
  
  }).catch(error => {
    reject(error);
    });
  });
}
function vmKill(options) {
  return new Promise( (resolve,reject) => {
    options = options || {};
    var vm = options.vm || options.name || options.vmname || options.title,
    path = options.path || options.cmd || options.command || options.exec || options.execute || options.run,
    image_name = options.image_name || path,
    cmd = 'guestcontrol "' + vm + '" process kill';
    guestproperty.os(vm).then(os_type => {
      switch (os_type) {
        case known_OS_types.WINDOWS:
          vmExec({
            vm: vm,
            user: options.user,
            password: options.password,
            path: 'C:\\Windows\\System32\\taskkill.exe /im ',
            params: image_name
        }).then(stdout => {
            resolve(stdout)})
          .catch(error => {
              reject(error);
          });
        break;
      case known_OS_types.MAC:
      case known_OS_types.LINUX:
        vmExec({
          vm: vm,
          user: options.user,
          password: options.password,
          path: 'killall ',
          params: image_name
        })
        .then(stdout => {
            resolve(stdout);
        })
        .catch(error => {
            reject(error);
        });
        break;
      }
    });
  });
}

var guestproperty = {
  get: function(options) {
    return new Promise((resolve,reject) => {
      var vm = options.vm || options.name || options.vmname || options.title,
      key = options.key,
      value = options.defaultValue || options.value;
      guestproperty.os(vm).then(os_type => {
        var cmd = 'guestproperty get "' + vm + '" ' + key;
        vboxmanage(cmd).then(stdout => {
          var value = stdout.substr(stdout.indexOf(':') + 1).trim();
          if (value === 'No value set!') {
            value = undefined;
          }
          resolve(value);
      });
    }).catch(error => {
      reject(error);
    });
  });
},

  os_type: null, // cached

  os: function(vmname) {
    return  new Promise(  (resolve,reject) => {
      var cmd =vBoxManageBinary + ' showvminfo -machinereadable ' + vmname;
      command(cmd).then(stdout => {
      if (stdout.indexOf('ostype="Windows') !== -1) {
        guestproperty.os_type = known_OS_types.WINDOWS;
      } else if (stdout.indexOf('ostype="MacOS') !== -1) {
        guestproperty.os_type = known_OS_types.MAC;
      } else {
        guestproperty.os_type = known_OS_types.LINUX;
      }
      logging.debug('Detected guest OS as: ' + guestproperty.os_type);
      if (guestproperty.os_type) {
        resolve(guestproperty.os_type)
      }
    }).catch(error => {
      reject(error);
      });
    });
  }
};

var extradata =  {
  get: function(options) {
    return new Promise( (resolve,reject) => {
      var vm = options.vm || options.name || options.vmname || options.title,
      key = options.key,
      value = options.defaultValue || options.value;
      var cmd = 'getextradata "' + vm + '" "' + key + '"';
      vboxmanage(cmd).then(stdout => {
        var value = stdout.substr(stdout.indexOf(':') + 1).trim();
        if (value === 'No value set!') {
          value = undefined;
        }
        resolve(value);
    }).catch(error => {
        reject(error);
    });
    });
  },

  set: function(options) {
    return  new Promise( (resolve,reject) => {
      var vm = options.vm || options.name || options.vmname || options.title,
      key = options.key,
      value = options.defaultValue || options.value;
      var cmd = 'setextradata "' + vm + '" "' + key + '" "' + value + '"';
      vboxmanage(cmd).then(stdout => {
      resolve(stdout);
    }).catch(error => {
        reject(stdout);
      });
    });
  }
};

module.exports = {
  'exec': vmExec,
  'kill': vmKill,
  'list': list,
  'pause': pause,
  'reset': reset,
  'resume': resume,
  'start': start,
  'stop': stop,
  'savestate': savestate,
  'export': vmExport,
  'poweroff': poweroff,
  'acpisleepbutton': acpisleepbutton,
  'acpipowerbutton': acpipowerbutton,
  'modify': modify,
  'guestproperty': guestproperty,
  'keyboardputscancode': keyboardputscancode,
  'snapshotList': snapshotList,
  'snapshotTake': snapshotTake,
  'snapshotDelete': snapshotDelete,
  'snapshotRestore': snapshotRestore,
  'isRunning': isRunning,
  'extradata': extradata,

  'SCAN_CODES': require('./scan-codes')
};
