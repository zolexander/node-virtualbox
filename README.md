# node-virtualbox

![NPM version](https://badge.fury.io/js/virtualbox.svg)
[![david-dm badge](https://david-dm.org/Node-Virtualization/node-virtualbox/status.svg)](https://github.com/Node-Virtualization/node-virtualbox/blob/master/package.json)
[![Build Status](https://travis-ci.org/Node-Virtualization/node-virtualbox.svg?branch=master)](https://travis-ci.org/Node-Virtualization/node-virtualbox)

A JavaScript library to interact with [VirtualBox](https://www.virtualbox.org/) virtual machines.

# Table of Contents
- [Installation](#installation)
- [Controlling Power and State](#controlling-power-and-state)
	- [Starting a cold machine: Two ways](#starting-a-cold-machine-two-ways)
	- [Stopping a machine](#stopping-a-machine)
	- [Pausing, Saving and Resuming a machine](#pausing-saving-and-resuming-a-machine)
- [Controlling the guest OS](#controlling-the-guest-os)
	- [A note about security :warning:](#a-note-about-security)
	- [Running programs in the guest](#running-programs-in-the-guest)
		- [Executing commands as Administrators on Windows guests](#executing-commands-as-administrators-on-windows-guests)
	- [Killing programs in the guest](#killing-programs-in-the-guest)
	- [Sending keystrokes to a virtual machine](#sending-keystrokes-to-a-virtual-machine)
- [Meta information about machine](#meta-information-about-machine)
- [Putting it all together](#putting-it-all-together)
- [Available Methods](#available-methods)
- [Troubleshooting](#troubleshooting)
- [More Examples](#more-examples)
- [License (MIT)](#license)
- [Contributing](#contributing)

# Installation

Obtain the package

```bash
$ npm install virtualbox [--save] [-g]
```

and then use it

```javascript
var virtualbox = require('virtualbox');
```

The general formula for commands is:

> virtualbox. **API command** ( "**registered vm name**", **[parameters]**).then(**[stdout]** => {}).catch(error => {});

Available API commands are listed at the end of this document.

# Controlling Power and State

`node-virtualbox` provides convenience methods to command the guest machine's power state in the customary ways.

## Starting a cold machine: Two ways

Virtual machines will _start headless by default_, but you can pass a boolean parameter to start them with a GUI:

```javascript
virtualbox.start("machine_name", true).then(stdout => {
    console.log("Virtual Machine has started WITH A GUI!");
}).catch(error => {
  throw error;
});
```

So as not to break pre-0.1.0 implementations, the old method still works (which also defaults to headless):

```javascript
virtualbox.start("machine_name").then( stdout => {
    console.log("Virtual Machine has started HEADLESS!");
}).catch (error => {
  if (error) throw error;
});
```

## Stopping a machine

**Note:** For historical reasons, `.stop` is an alias to `.savestate`.

```javascript
virtualbox.stop("machine_name").then( () => {
    console.log("Virtual Machine has been saved");
}).catch(error => {
  if (error) throw error;
});
```

To halt a machine completely, you can use `poweroff` or `acpipowerbutton`:

```javascript
virtualbox.poweroff("machine_name").then( ()=> {
  console.log("Virtual Machine has been powered off!");
}).catch( error => {
 throw error;
});
```

```javascript
virtualbox.acpipowerbutton("machine_name", () => {
  console.log("Virtual Machine's ACPI power button was pressed.");
}).catch(error => {
  throw error;
});
```

## Pausing, Saving and Resuming a machine

Noting the caveat above that `.stop` is actually an alias to `.savestate`...

```javascript
virtualbox.pause("machine_name").then( ()=> {
  console.log("Virtual Machine is now paused!");
}).catch(error => {
  throw error;
};
```

```javascript
virtualbox.savestate("machine_name").then( () => {
  console.log("Virtual Machine is now paused!");
}).catch(error => {
  throw error;
});
```

And, in the same family, `acpisleepbutton`:

```javascript
virtualbox.acpisleepbutton("machine_name").then ( () => {
  console.log("Virtual Machine's ACPI sleep button signal was sent.");
}).catch(error => {
  throw error;
});
```

Note that you should probably _resume_ a machine which is in one of the above three states.

```javascript
virtualbox.resume("machine_name").then( () => {
  console.log("Virtual Machine is now paused!");
}).catch( error => {
  throw error;
});
```

And, of course, a reset button method:

```javascript
virtualbox.reset("machine_name").then (() => {
  console.log("Virtual Machine's reset button was pressed!");
}).catch ( error => {
  throw error;
});
```


## Export a machine

You can export with `export` method:

```javascript
virtualbox.export("machine_name", "output").then ( () => 
  console.log("Virtual Machine was exported!");
}).then ( error => {
  throw error;
});
```

## Snapshot Manage

You can show snapshot list with `snapshotList` method:

```javascript
virtualbox.snapshotList("machine_name").then ( (snapshotList,currentSnapshotUUID)) {
  if(snapshotList) {
    console.log(JSON.stringify(snapshotList), JSON.stringify(currentSnapshotUUID));
  }
}).catch(error => {
  throw error;
});
```

And, you can take a snapshot:

```javascript
virtualbox.snapshotTake("machine_name", "snapshot_name".then( uuid => {
	console.log('Snapshot has been taken!');
	console.log('UUID: ', uuid);
}).catch( error => {
  throw error;
});
```

Or, delete a snapshot:

```javascript
virtualbox.snapshotDelete("machine_name", "snapshot_name").then (() =>{
	console.log('Snapshot has been deleted!');
}).catch( error => {
  throw error;
});
```

Or, restore a snapshot:

```javascript
virtualbox.snapshotRestore("machine_name", "snapshot_name").then ( () =>{
	console.log('Snapshot has been restored!');
}).catch(error => {
  throw error;
});
```

# Controlling the guest OS

## A note about security :warning:

`node-virtualbox` is not opinionated: we believe that _you know best_ what _you_ need to do with _your_ virtual machine. Maybe that includes issuing `sudo rm -rf /` for some reason.

To that end, the `virtualbox` APIs provided by this module _take absolutely no steps_ to prevent you shooting yourself in the foot.

:warning: Therefore, if you accept user input and pass it to the virtual machine, you should take your own steps to filter input before it gets passed to `virtualbox`.

For more details and discussion, see [issue #29](https://github.com/Node-Virtualization/node-virtualbox/issues/29).

## Running programs in the guest

This method takes an options object with the name of the virtual machine, the path to the binary to be executed and any parameters to pass:

```javascript
var options = {
  vm: "machine_name",
  cmd: "C:\\Program Files\\Internet Explorer\\iexplore.exe",
  params: "https://google.com"
}

virtualbox.exec(options).then(stdout => {
    console.log('Started Internet Explorer...');
}).catch(error => {
  throw error;
});
```

### Executing commands as Administrators on Windows guests

Pass username and password information in an `options` object:

```javascript
var options = {
  vm: "machine_name",
  user:"Administrator",
  password: "123456",
  cmd: "C:\\Program Files\\Internet Explorer\\iexplore.exe",
  params: "https://google.com"
};
```

## Killing programs in the guest

Tasks can be killed in the guest as well. In Windows guests this calls `taskkill.exe /im` and on Linux, BSD and OS X (Darwin) guests, it calls `killall` with the user own permissions:

```javascript
virtualbox.kill({
    vm: "machine_name",
    cmd: "iexplore.exe"
}.then( () => {
    console.log('Terminated Internet Explorer.');
}).catch(error => {
  throw error;
});
```

## Sending keystrokes to a virtual machine

Keyboard scan code sequences can be piped directly to a virtual machine's console:

```javascript
var SCAN_CODES = virtualbox.SCAN_CODES;
var sequence = [
  { key: 'SHIFT', type: 'make',  code: SCAN_CODES['SHIFT']},
  { key: 'A',     type: 'make',  code: SCAN_CODES['A']},
  { key: 'SHIFT', type: 'break', code: SCAN_CODES.getBreakCode('SHIFT')},
  { key: 'A',     type: 'break', code: SCAN_CODES.getBreakCode('A')}
];

virtualbox.keyboardputscancode("machine_name", sequence).then( () => {
    console.log('Sent SHIFT A');
}).catch(error => {
  throw error;
});
```

# Meta information about machine

List all registered machines, returns an array:

```javascript
virtualbox.list.then(machines => {
  // Act on machines
}).catch(error => {
  throw error;
});
```

Obtaining a guest property by [key name](https://www.virtualbox.org/manual/ch04.html#guestadd-guestprops):

```javascript
var options = {
  vm: "machine_name",
  key: "/VirtualBox/GuestInfo/Net/0/V4/IP"
}

virtualbox.guestproperty.get(options).then(machines  => {
  // Act on machines
}).catch(error => {
  throw error;
});
```

Obtaining an extra property by key name:

```javascript
var options = {
  vm: "machine_name",
  key: "GUI/Fullscreen"
}

virtualbox.extradata.get(options).then(value => {
  console.log('Virtual Machine "%s" extra "%s" value is "%s"', options.vm, options.key, value);
}).catch(error => {
  throw error;
});
```

Writing an extra property by key name:

```javascript
var options = {
  vm: "machine_name",
  key: "GUI/Fullscreen",
  value: "true"
}

virtualbox.extradata.set(options).then ( () => {
  console.log('Set Virtual Machine "%s" extra "%s" value to "%s"', options.vm, options.key, options.value);
}).catch(error =>{ 
  throw error;
});
```

# Putting it all together

```javascript
var virtualbox = require('virtualbox');

virtualbox.start("machine_name").then( () => {
    console.log('VM "w7" has been successfully started');
    virtualbox.exec({
        vm: "machine_name",
        cmd: "C:\\Program Files\\Internet Explorer\\iexplore.exe",
        params: "http://google.com"
    }.then ( () =>{
        console.log('Running Internet Explorer...');
    }).catch(error => {
      throw error
    });

}).catch(error => {
  throw error;
};
```

# Available Methods

`virtualbox`

- `.pause({vm:"machine_name"}).then(() => {}).catch(error =>{}`
- `.reset({vm:"machine_name"}).then(() => {}).catch(error =>{}`
- `.resume({vm:"machine_name"}).then(() => {}).catch(error =>{}`
- `.start({vm:"machine_name"}).then(() => {}).catch(error =>{}` and `.start({vm:"machine_name"}).then(() => {}).catch(error =>{}`
- `.stop({vm:"machine_name"}).then(() => {}).catch(error =>{}`
- `.savestate({vm:"machine_name"}).then(() => {}).catch(error =>{}`
- `.export({vm:"machine_name"}, {output: "output"}).then(() => {}).catch(error =>{}`
- `.poweroff({vm:"machine_name"}).then(() => {}).catch(error =>{}`
- `.acpisleepbutton({vm:"machine_name"}).then(() => {}).catch(error =>{}`
- `.acpipowerbutton({vm:"machine_name"}).then(() => {}).catch(error =>{}`
- `.guestproperty.get({vm:"machine_name", property: "propname"}).then((result) => {}).catch(error =>{}`
- `.exec(){vm: "machine_name", cmd: "C:\\Program Files\\Internet Explorer\\iexplore.exe", params: "http://google.com"}).then((result) => {}).catch(error =>{}`
- `.exec(){vm: "machine_name", user:"Administrator", password: "123456", cmd: "C:\\Program Files\\Internet Explorer\\iexplore.exe", params: "http://google.com"}).then((result) => {}).catch(error =>{}`
- `.keyboardputscancode("machine_name", [scan_codes]).then(() => {}).catch(error =>{}`
- `.kill({vm:"machine_name"}).then(() => {}).catch(error =>{}`
- `.list().then((result) => {}).catch(error =>{}`
- `.isRunning({vm:"machine_name"}).then(() => {}).catch(error =>{}`
- `.snapshotList({vm:"machine_name"}).then((result) => {}).catch(error =>{}`
- `.snapshotTake({vm:"machine_name"}, {vm:"snapshot_name"}).then(() => {}).catch(error =>{}`
- `.snapshotDelete({vm:"machine_name"}, {vm:"snapshot_UUID"}).then(() => {}).catch(error =>{}`
- `.snapshotRestore({vm:"machine_name"}, {vm:"snapshot_UUID"}).then(() => {}).catch(error =>{}`
- `.extradata.get({vm:"machine_name", key:"keyname"}).then(() => {}).catch(error =>{}`
- `.extradata.set({vm:"machine_name", key:"keyname", value:"val"}).then(() => {}).catch(error =>{}`

# Troubleshooting

- Make sure that Guest account is enabled on the VM.
- VMs start headlessly by default: if you're having trouble with executing a command, start the VM with GUI and observe the screen after executing same command.
- To avoid having "Concurrent guest process limit is reached" error message, execute your commands as an administrator.
- Don't forget that this whole thing is asynchronous, and depends on the return of `vboxmanage` _not_ the actual running state/runlevel of services within the guest. See <https://github.com/Node-Virtualization/node-virtualbox/issues/9>

# More Examples

- [npm tests](https://github.com/Node-Virtualization/node-virtualbox/tree/master/test)

# License

[MIT](https://github.com/Node-Virtualization/node-virtualbox/blob/master/LICENSE)

# Contributing

Please do!

- [File an issue](https://github.com/Node-Virtualization/node-virtualbox/issues)
- [Fork](https://github.com/Node-Virtualization/node-virtualbox#fork-destination-box) and send a pull request.

Please abide by the [Contributor Code of Conduct](https://github.com/Node-Virtualization/node-virtualbox/blob/master/code_of_conduct.md).
