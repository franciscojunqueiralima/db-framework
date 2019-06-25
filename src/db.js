const { Pool } = require("pg");
const adodb = require("./ado/index.js");

let poolPg;
let clientAdo;

const atualizarVariaveisDb = () => {
    switch (process.env.DB_ENGINE) {
        case "pg":
            poolPg = new Pool({
                user: process.env.DB_USER,
                host: process.env.DB_HOST,
                database: process.env.DB_NAME,
                password: process.env.DB_PASSWORD,
                port: process.env.DB_PORT
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
        throw err;
    }
};

const execute = async (sqlTransaction) => {
    switch (process.env.DB_ENGINE) {
        case "pg":
            const clientPg = await poolPg.connect();

            try {
                await clientPg.query("BEGIN");

                for await (let sqlCommand of sqlTransaction.sqlCommands) {
                    sqlCommand.handlePgParameters();
                    await clientPg.query(
                        sqlCommand.query,
                        sqlCommand.parameters
                    );
                }

                await clientPg.query("COMMIT");
                return;
            } catch (err) {
                await clientPg.query("ROLLBACK");
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

atualizarVariaveisDb();

module.exports = {
    atualizarVariaveisDb,
    query,
    execute
};
