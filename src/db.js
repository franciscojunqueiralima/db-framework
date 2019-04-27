const { Pool } = require("pg");
const adodb = require("./ado/index.js");

// config
const dbEngine = process.env.DB_ENGINE;
let poolPg;
let connAdo;

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
        connAdo = adodb.open(`Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${process.env.DB_NAME};Jet OLEDB:Database Password=${process.env.DB_PASSWORD};`);
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
                let data = await connAdo.query(comandoSql.query);
                return data;
        }
    } catch (err) {
        throw err;
    }
};

// execute
const execute = async (dao) => {    
    if (dbEngine === "pg") {
        const results = [];
        const client = await poolPg.connect();

        try {                                
            await client.query('BEGIN');
            
            for await (const comandoSql of dao.comandosSql) {
                comandoSql.tratarParametrosPg();

                const { rows } = await client.query(comandoSql.query, comandoSql.parametros);            
                results.push(rows);
            }        
            
            await client.query('COMMIT');        

            return results;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {        
            client.release();          
        }
    }
};

module.exports = {    
    query,
    execute    
};