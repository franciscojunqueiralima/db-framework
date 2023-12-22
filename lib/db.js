const Pool = require('pg-pool');
const adodb = require("./ado/index.js");

let poolPg;
let clientAdo;

const updateDbVariables = () => {
    switch (process.env.DB_ENGINE) {
        case "pg":
            poolPg = new Pool({
                user: process.env.DB_USER,
                host: process.env.DB_HOST,
                database: process.env.DB_NAME,
                password: process.env.DB_PASSWORD,
                port: process.env.DB_PORT,
                connectionTimeoutMillis: 1000
            });
            break;
        case "ado":
            clientAdo = adodb.open(
                `Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${
                    process.env.DB_NAME
                };Jet OLEDB:Database Password=${process.env.DB_PASSWORD};`
            );
            break;
    }
};

const query = async (sqlCommand) => {
    try {
        switch (process.env.DB_ENGINE) {
            case "pg":
                if (process.env.DB_AUTO_ALIAS) {
                    sqlCommand.handleAutoAliasFields();
                }

                sqlCommand.handlePgParameters();
                let { rows } = await poolPg.query(
                    sqlCommand.query,
                    sqlCommand.parameters
                );
                return rows;

            case "ado":
                sqlCommand.handleAdoParameters();
                let data = await clientAdo.query(sqlCommand.query);
                return data;
        }
    } catch (err) {
        if (sqlCommand) {
            console.log("Query: ", sqlCommand.query);
            console.log("Parameters: ", sqlCommand.parameters);
        }

        throw err;
    }
};

const execute = async (sqlTransaction) => {
    let currentSqlCommand;
    let result = [];

    switch (process.env.DB_ENGINE) {
        case "pg":
            const clientPg = await poolPg.connect();

            try {
                await clientPg.query("BEGIN");

                for await (let sqlCommand of sqlTransaction.sqlCommands) {
                    sqlCommand.handlePgParameters();
                    currentSqlCommand = sqlCommand;
                    let { rows } = await clientPg.query(
                        sqlCommand.query,
                        sqlCommand.parameters
                    );

                    if (sqlCommand.query.startsWith("select")) {
                        result.push(rows);
                    }
                }

                await clientPg.query("COMMIT");
                return result;
            } catch (err) {
                await clientPg.query("ROLLBACK");

                if (currentSqlCommand) {
                    console.log("Query: ", currentSqlCommand.query);
                    console.log("Parameters: ", currentSqlCommand.parameters);
                }

                throw err;
            } finally {
                clientPg.release();
            }

        case "ado":
            try {
                const sqls = [];

                for (let sqlCommand of sqlTransaction.sqlCommands) {
                    sqlCommand.handleAdoParameters();                    
                    sqls.push(sqlCommand.query);
                }

                await clientAdo.executeTrans(sqls);
                return;
            } catch (err) {
                throw err;
            }
    }
};

updateDbVariables();

module.exports = {
    updateDbVariables,
    query,
    execute
};
