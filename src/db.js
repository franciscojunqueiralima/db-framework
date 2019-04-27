const { Pool } = require("pg");
const adodb = require("./ado/index.js");

// config
const dbEngine = process.env.DB_ENGINE;
let poolPg;
let clientAdo;

switch (dbEngine) {
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
        clientAdo = adodb.open(`Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${process.env.DB_NAME};Jet OLEDB:Database Password=${process.env.DB_PASSWORD};`);
        break;    
}

// query
const query = async (comandoSql) => {
    try {        
        switch (dbEngine) {
            case "pg":
                comandoSql.tratarParametrosPg();
                let { rows } = await poolPg.query(comandoSql.query, comandoSql.parametros);
                return rows;

            case "ado":
                comandoSql.tratarParametrosAdo();
                let data = await clientAdo.query(comandoSql.query);
                return data;
        }
    } catch (err) {
        throw err;
    }
};

// execute
const execute = async (dao) => {        
    switch (dbEngine) {
        case "pg":
            const clientPg = await poolPg.connect();

            try {
                await clientPg.query('BEGIN');

                for await (let comandoSql of dao.comandosSql) {
                    comandoSql.tratarParametrosPg();
                    await clientPg.query(comandoSql.query, comandoSql.parametros);                                
                }        
                
                await clientPg.query('COMMIT');
                return;
            } catch (err) {
                await clientPg.query('ROLLBACK');
                throw err;
            } finally {        
                clientPg.release();          
            }
                        
        case "ado":            
            try {           
                const sqls = [];
                
                for (let comandoSql of dao.comandosSql) {
                    comandoSql.tratarParametrosAdo();                    
                    sqls.push(comandoSql.query);
                }
                                
                await clientAdo.executeTrans(sqls);
                return;
            } catch (err) {                
                throw err;
            }
    }            
};

module.exports = {    
    query,
    execute    
};