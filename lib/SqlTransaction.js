const _ = require("lodash");
const db = require("./db");

class SqlTransaction {
    constructor(sqlCommands) {
        this.sqlCommands = sqlCommands || [];
    }

    add(sqlCommand) {
        if (_.isArray(sqlCommand)) {
            for (let command of sqlCommand) {
                this.sqlCommands.push(command);
            }
        } else if (_.isObject(sqlCommand)) {
            this.sqlCommands.push(sqlCommand);
        }
    }

    execute() {
        return db.execute(this);
    }
}

module.exports = SqlTransaction;
