#!/usr/bin/env node

var program = require('commander'),
    generator = require('../lib/generator.js');

program
    .version('0.1.0')
    .option('-h, --host [value]', 'DB host address')
    .option('-u, --user [value]', 'DB username')
    .option('-p, --pass [value]', 'DB password')
    .option('-d, --database [value]', 'DB name')
    .option('-o, --out [path]', '[optional] output folder, default to ./')
    .option('-s, --style [path]', '[optional] path to style(css) file')
    .parse(process.argv);

if(!program.host){
    console.log('Missing host parameter');
    process.exit(1);
}

if(!program.user){
    console.log('Missing user parameter');
    process.exit(1);
}

if(!program.pass){
    console.log('Missing pass parameter');
    process.exit(1);
}

if(!program.database){
    console.log('Missing database parameter');
    process.exit(1);
}

generator.setDatabase(program.host, program.user, program.pass, program.database);

if(program.out){
    generator.setOutputDirectory(program.out);
}

if(program.style){
    generator.setStyleTemplate(program.style);
}

generator.generate();