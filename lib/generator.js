/**
 Generate the documentation using templates and save it to html files
 @module generator
 **/


/**
 * Module dependencies and local variables.
 */
var db = require('./db.js'),
    fs = require('fs'),
    path = require('path'),
    util = require('util'),
    processDir = path.dirname(module.filename),
    outputDir = './',
    database = {
        host:null,
        user:null,
        password:null,
        dbName:null
    },
    templates = {
        css:loadTemplate('default_style.css'),
        html:{
            tablesPage:loadTemplate('tables.html'),
            tablesItem:loadTemplate('tables_table_item.html'),
            tablesItemFields:loadTemplate('tables_table_item_fields.html'),
            tablesItemIndexes:loadTemplate('tables_table_item_indexes.html'),
            tableOfContentsItem:loadTemplate('table_of_contents_item.html'),
            proceduresPage:loadTemplate('procedures.html'),
            proceduresItem:loadTemplate('procedures_procedure_item.html'),
            proceduresItemParams:loadTemplate('procedures_procedure_item_params.html')
        }
    };

/**
 * Load a template file
 * @param   {String}    fileName    A filename inside the templates folder
 * @return  {String}    The template file content
 * @private
 */
function loadTemplate(fileName) {
    return fs.readFileSync(util.format('%s/../templates/%s', processDir, fileName), 'utf8');
}

/**
 * Replace template key with value and return the updated template
 * @param   {String}    template    Template content to search and replace
 * @param   {String}    key         The key to search
 * @param   {String}    value       The value to use for the key replacement
 * @return  {String}    Updated template
 * @private
 */
function replaceTemplateKey(template, key, value) {
    var regex = new RegExp(util.format('{%s}', key), 'gm');
    return template.replace(regex, value);
}

/**
 * Set the database connection details
 * @param   {String}    host            Database host address
 * @param   {String}    user            Database username
 * @param   {String}    password        Database password
 * @param   {String}    databaseName    Database name
 * @public
 */
function setDatabase(host, user, password, databaseName) {
    database.host = host;
    database.user = user;
    database.password = password;
    database.dbName = databaseName;
}

/**
 * Replace the style (css) template
 * @param   {String}    filePath    A path to a css file
 * @public
 */
function setStyleTemplate(filePath) {
    templates.css = fs.readFileSync(filePath);
}

/**
 * Set a directory to output the generated html files
 * @param   {String}    path    A directory path
 * @public
 */
function setOutputDirectory(path) {
    if (fs.existsSync(path) && fs.statSync(path).isDirectory()) {
        outputDir = path;
    }
    else {
        throw util.format('%s is not a valid directory', path);
    }
}

/**
 * Generate the documentation and save it to html files
 * @public
 */
function generate() {
    var tables = {},
        procedures = {};

    /**
     * Callback handle for getting the database stored procedures parameters list
     * On success saving the stored procedures html file
     * @param   {Error}     err     An error object
     * @param   {Array}     result  A database record list
     * @private
     */
    function onGetProceduresParams(err, result) {
        if (err) {
            throw err;
        }
        else {
            var params,
                splitParams;
            for (var i = 0, len = result.length; i < len; i++) {
                if (procedures[result[i]['name']]) {
                    params = result[i]['param_list'].toString().replace(/(\n|\r\n|\r|\n\r)/gm, '').split(',');
                    for (var j = 0, plen = params.length; j < plen; j++) {
                        splitParams = params[j].trim().split(/[\s]+/);
                        if (splitParams.length < 3) {
                            splitParams.unshift('n/a');
                        }
                        procedures[result[i]['name']].params.push(splitParams);
                    }

                }
            }

            db.disconnect();

            var page = templates.html.proceduresPage,
                tableOfContentsItem,
                tableOfContentsItems = '',
                procedureItems = '',
                procedureItem,
                paramItems,
                paramItem;

            for (var procedureName in procedures) {
                if (procedures.hasOwnProperty(procedureName)) {

                    paramItems = '';
                    for (var param in procedures[procedureName].params) {
                        if (procedures[procedureName].params.hasOwnProperty(param)) {
                            paramItem = templates.html.proceduresItemParams;
                            paramItem = replaceTemplateKey(paramItem, 'param_name', procedures[procedureName].params[param][1] || 'n/a');
                            paramItem = replaceTemplateKey(paramItem, 'param_direction', procedures[procedureName].params[param][0] || 'n/a');
                            paramItem = replaceTemplateKey(paramItem, 'param_type', procedures[procedureName].params[param][2] || 'n/a');

                            paramItems += paramItem;
                        }
                    }

                    tableOfContentsItem = templates.html.tableOfContentsItem;
                    tableOfContentsItem = replaceTemplateKey(tableOfContentsItem, 'item_name', procedureName);

                    tableOfContentsItems += tableOfContentsItem;

                    procedureItem = templates.html.proceduresItem;
                    procedureItem = replaceTemplateKey(procedureItem, 'item_name', procedureName);
                    procedureItem = replaceTemplateKey(procedureItem, 'procedure_create_date', procedures[procedureName].createTime);
                    procedureItem = replaceTemplateKey(procedureItem, 'collation', procedures[procedureName].collation);
                    procedureItem = replaceTemplateKey(procedureItem, 'procedure_comment', procedures[procedureName].comment);
                    procedureItem = replaceTemplateKey(procedureItem, 'params', paramItems);


                    procedureItems += procedureItem;
                }
            }

            page = replaceTemplateKey(page, 'db_name', db.getDatabaseName());
            page = replaceTemplateKey(page, 'css_style', templates.css);
            page = replaceTemplateKey(page, 'table_of_contents', tableOfContentsItems);
            page = replaceTemplateKey(page, 'procedures', procedureItems);


            fs.writeFile(util.format('%s%s_procedures.html', outputDir, db.getDatabaseName()), page, function (err) {
                if (err) {
                    throw err;
                }
            });
        }
    }

    /**
     * Callback handle for getting the database stored procedures list
     * On success getting the stored procedures parameters
     * @param   {Error}     err     An error object
     * @param   {Array}     result  A database record list
     * @private
     */
    function onGetProcedures(err, result) {
        if (err) {
            throw err;
        }
        else {
            for (var i = 0, len = result.length; i < len; i++) {
                procedures[result[i]['ROUTINE_NAME']] = {
                    createTime:result[i]['CREATED'],
                    collation:result[i]['COLLATION_CONNECTION'],
                    comment:result[i]['ROUTINE_COMMENT'],
                    params:[]
                }
            }

            db.getProceduresParams(onGetProceduresParams);
        }
    }

    /**
     * Callback handle for getting the database tables indexes list
     * On success getting the stored procedures and saving the tables html file
     * @param   {Error}     err     An error object
     * @param   {Array}     result  A database record list
     * @private
     */
    function onGetIndexes(err, result) {
        if (err) {
            throw err;
        }
        else {
            for (var i = 0, len = result.length; i < len; i++) {
                if (tables[result[i]['TABLE_NAME']]) {
                    tables[result[i]['TABLE_NAME']].indexes[result[i]['INDEX_NAME']] = {
                        columns:result[i]['COLUMNS']
                    }
                }
            }

            var page = templates.html.tablesPage,
                tableOfContentsItem,
                tableOfContentsItems = '',
                tableItem,
                tableItems = '',
                fieldItem,
                fieldItems,
                indexItem,
                indexItems;

            for (var tableName in tables) {
                if (tables.hasOwnProperty(tableName)) {

                    fieldItems = '';
                    for (var field in tables[tableName].fields) {
                        if (tables[tableName].fields.hasOwnProperty(field)) {
                            fieldItem = templates.html.tablesItemFields;
                            fieldItem = replaceTemplateKey(fieldItem, 'field_name', field);
                            fieldItem = replaceTemplateKey(fieldItem, 'field_type', tables[tableName].fields[field].fieldType);
                            fieldItem = replaceTemplateKey(fieldItem, 'field_collation', tables[tableName].fields[field].collation);
                            fieldItem = replaceTemplateKey(fieldItem, 'field_nullable', tables[tableName].fields[field].nullable);
                            fieldItem = replaceTemplateKey(fieldItem, 'field_key', tables[tableName].fields[field].fieldKey);
                            fieldItem = replaceTemplateKey(fieldItem, 'field_default', tables[tableName].fields[field].fieldDefault);
                            fieldItem = replaceTemplateKey(fieldItem, 'field_extra', tables[tableName].fields[field].extra);
                            fieldItem = replaceTemplateKey(fieldItem, 'field_comment', tables[tableName].fields[field].comment);

                            fieldItems += fieldItem;
                        }
                    }

                    indexItems = '';
                    for (var index in tables[tableName].indexes) {
                        if (tables[tableName].indexes.hasOwnProperty(index)) {
                            indexItem = templates.html.tablesItemIndexes;
                            indexItem = replaceTemplateKey(indexItem, 'index_name', index);
                            indexItem = replaceTemplateKey(indexItem, 'columns', tables[tableName].indexes[index].columns);

                            indexItems += indexItem;
                        }
                    }

                    tableOfContentsItem = templates.html.tableOfContentsItem;
                    tableOfContentsItem = replaceTemplateKey(tableOfContentsItem, 'item_name', tableName);

                    tableOfContentsItems += tableOfContentsItem;

                    tableItem = templates.html.tablesItem;
                    tableItem = replaceTemplateKey(tableItem, 'item_name', tableName);
                    tableItem = replaceTemplateKey(tableItem, 'table_comment', tables[tableName].comment);
                    tableItem = replaceTemplateKey(tableItem, 'fields', fieldItems);
                    tableItem = replaceTemplateKey(tableItem, 'indexes', indexItems);

                    tableItems += tableItem;
                }
            }

            page = replaceTemplateKey(page, 'db_name', db.getDatabaseName());
            page = replaceTemplateKey(page, 'css_style', templates.css);
            page = replaceTemplateKey(page, 'table_of_contents', tableOfContentsItems);
            page = replaceTemplateKey(page, 'tables', tableItems);


            fs.writeFile(util.format('%s%s_tables.html', outputDir, db.getDatabaseName()), page, function (err) {
                if (err) {
                    throw err;
                }
            });

            db.getProcedures(onGetProcedures);
        }
    }

    /**
     * Callback handle for getting the database table columns list
     * On success getting the tables indexes
     * @param   {Error}     err     An error object
     * @param   {Array}     result  A database record list
     * @private
     */
    function onGetFields(err, result) {
        if (err) {
            throw err;
        }
        else {
            for (var i = 0, len = result.length; i < len; i++) {
                if (tables[result[i]['TABLE_NAME']]) {
                    tables[result[i]['TABLE_NAME']].fields[result[i]['COLUMN_NAME']] = {
                        position:result[i]['ORDINAL_POSITION'],
                        fieldDefault:result[i]['COLUMN_DEFAULT'],
                        nullable:result[i]['IS_NULLABLE'],
                        charMaxLength:result[i]['CHARACTER_MAXIMUM_LENGTH'],
                        collation:result[i]['COLLATION_NAME'],
                        fieldType:result[i]['COLUMN_TYPE'],
                        fieldKey:result[i]['COLUMN_KEY'],
                        extra:result[i]['EXTRA'],
                        comment:result[i]['COLUMN_COMMENT']
                    }
                }
            }

            db.getIndexes(onGetIndexes);
        }
    }

    /**
     * Callback handle for getting the database table list.
     * On success getting the tables fields (columns)
     * @param   {Error}     err     An error object
     * @param   {Array}     result  A database record list
     * @private
     */
    function onGetTables(err, result) {
        if (err) {
            throw err;
        }
        else {
            for (var i = 0, len = result.length; i < len; i++) {
                tables[result[i]['TABLE_NAME']] = {
                    engine:result[i]['ENGINE'],
                    createTime:result[i]['CREATE_TIME'],
                    collation:result[i]['TABLE_COLLATION'],
                    comment:result[i]['TABLE_COMMENT'],
                    fields:{},
                    indexes:{}
                }
            }

            db.getFields(onGetFields);
        }

    }

    if (!database.host || !database.user || !database.password || !database.dbName) {
        throw 'invalid database details: ' + util.inspect(database, false, 2, false);
    }
    else {
        db.connect(database.host, database.user, database.password, database.dbName);
        db.getTables(onGetTables);
    }

}

exports.setDatabase = setDatabase;
exports.setStyleTemplate = setStyleTemplate;
exports.setOutputDirectory = setOutputDirectory;
exports.generate = generate;