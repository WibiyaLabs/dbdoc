/**
 Data access layer, perform the db operations
 @module db
 **/


/**
 * Module dependencies and local variables.
 */
var mysql = require('mysql'),
    util = require('util'),
    connection,
    databaseName;

/**
 * Handles DB connection errors. Reconnect on connection lost error
 * @param   {Error}     err     An error object
 * @private
 */
function onConnectionError(err) {
    if (err.fatal) {
        if (err.code !== 'PROTOCOL_CONNECTION_LOST') {
            throw err;
        }

        connection = mysql.createConnection(connection.config);
        connection.connect();
    }
}

/**
 * Connection event handler.
 * @param   {Error}     err     An error object
 * @private
 */
function onConnect(err) {
    if (err) {
        throw err;
    }
    else {
        connection.on('error', onConnectionError);
    }
}

/**
 * Connect to database
 * @param   {String}    host        Database host address
 * @param   {String}    user        Database username
 * @param   {String}    password    Database password
 * @param   {String}    database    Database name
 * @public
 */
function connect(host, user, password, database) {
    databaseName = database;
    connection = mysql.createConnection({'host':host, 'user':user, 'password':password, 'database':database});
    connection.connect(onConnect);
}

/**
 * Disconnect from database
 * @param   {Function}  callback    A callback function
 * @public
 */
function disconnect(callback) {
    connection.end(callback);
}

/**
 * Get the used database
 * @return  {String}    Database name
 * @public
 */
function getDatabaseName() {
    return databaseName;
}

/**
 * Change the used database
 * @param   {String}    database    Database name
 * @param   {Function}  callback    A callback function
 * @public
 */
function changeDatabase(database, callback) {
    connection.changeUser({'database':database}, function (err) {
        if (err) {
            throw err;
        }
        else {
            callback();
        }
    });
}

/**
 * Execute sql query
 * @param   {String}    statement   Sql query statement
 * @param   {Function}  callback    A callback function - callback(err, result)
 * @private
 */
function query(statement, callback) {
    connection.query(statement, callback);
}

/**
 * Get a list of tables for the current database
 * @param   {Function}  callback    A callback function - callback(err, result)
 * @public
 */
function getTables(callback) {
    var statement = util.format("SELECT TABLES.TABLE_NAME, TABLES.ENGINE, TABLES.CREATE_TIME, TABLES.TABLE_COLLATION, " +
        "TABLES.TABLE_COMMENT FROM information_schema.TABLES WHERE `TABLES`.`TABLE_SCHEMA` = '%s';", databaseName);

    query(statement, callback);
}

/**
 * Get tables columns for the current database
 * @param   {Function}  callback    A callback function - callback(err, result)
 * @public
 */
function getFields(callback) {
    var statement = util.format("SELECT COLUMNS.TABLE_NAME, COLUMNS.COLUMN_NAME, COLUMNS.ORDINAL_POSITION, " +
        "COLUMNS.COLUMN_DEFAULT, COLUMNS.IS_NULLABLE, COLUMNS.DATA_TYPE, COLUMNS.CHARACTER_MAXIMUM_LENGTH, " +
        "COLUMNS.NUMERIC_PRECISION, COLUMNS.COLLATION_NAME, COLUMNS.COLUMN_TYPE, COLUMNS.COLUMN_KEY, COLUMNS.EXTRA, " +
        "COLUMNS.COLUMN_COMMENT FROM information_schema.COLUMNS WHERE COLUMNS.TABLE_SCHEMA = '%s';", databaseName);

    query(statement, callback);
}

/**
 * Get tables indexes for the current database
 * @param   {Function}  callback    A callback function - callback(err, result)
 * @public
 */
function getIndexes(callback) {
    var statement = util.format("SELECT STATISTICS.TABLE_NAME, STATISTICS.INDEX_NAME, " +
        "GROUP_CONCAT(STATISTICS.COLUMN_NAME ORDER BY STATISTICS.SEQ_IN_INDEX) AS COLUMNS " +
        "FROM information_schema.STATISTICS WHERE STATISTICS.TABLE_SCHEMA = '%s' GROUP BY 1,2;", databaseName);

    query(statement, callback);
}

/**
 * Get list of stored procedures for the current database
 * @param   {Function}  callback    A callback function - callback(err, result)
 * @public
 */
function getProcedures(callback) {
    var statement = util.format("SELECT ROUTINES.ROUTINE_NAME, ROUTINES.CREATED,ROUTINES.ROUTINE_COMMENT, " +
        "ROUTINES.COLLATION_CONNECTION FROM information_schema.ROUTINES WHERE ROUTINES.ROUTINE_SCHEMA = '%s';", databaseName);

    query(statement, callback);
}

/**
 * Get list of stored procedures parameters for the current database
 * @param   {Function}  callback    A callback function - callback(err, result)
 * @public
 */
function getProceduresParams(callback) {
    var statement = util.format("SELECT proc.name, proc.param_list FROM mysql.proc WHERE proc.db = '%s'", databaseName);

    query(statement, callback);
}

exports.connect = connect;
exports.disconnect = disconnect;
exports.getDatabaseName = getDatabaseName;
exports.changeDatabase = changeDatabase;
exports.getTables = getTables;
exports.getFields = getFields;
exports.getIndexes = getIndexes;
exports.getProcedures = getProcedures;
exports.getProceduresParams = getProceduresParams;