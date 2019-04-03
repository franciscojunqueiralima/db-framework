const { Pool } = require("pg");

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

const executarComandoSql = async (comandoSql) => {    
    try {        
        comandoSql.tratarParametrosPg();

        const { command, rows } = await pool.query(comandoSql.query, comandoSql.parametros);
        if (command === "SELECT") {
            return rows;
        } else {
            return [];
        }

        return results;
    } catch (err) {
        throw err;
    }    
};

const executarComandosSql = async (dao) => {    
    const results = [];        
    const client = await pool.connect();

    try {                                
        await client.query('BEGIN');
        
        for await (const comandoSql of dao.comandosSql) {
            comandoSql.tratarParametrosPg();

            const { command, rows } = await client.query(comandoSql.query, comandoSql.parametros);            
            if (command === "SELECT") {
                results.push(rows);
            }            
        }        
        
        await client.query('COMMIT');        

        return results;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {        
        client.release();          
    }
};

module.exports = {    
    executarComandoSql,
    executarComandosSql    
}


// const mysql = require("mysql2/promise");
// const pool = mysql.createPool({
//     host: "localhost", 
//     user: "orlasoft-node", 
//     password: "457320318", 
//     database: "Cinema", 
//     connectionLimit: 10, 
//     multipleStatements: true
// });
// const [rows, fields] = await pool.query(comandoSql.query, comandoSql.parametros);

// const executarComandosSql = async (dao) => {    
//     const results = [];        
//     const connection = await pool.getConnection();

//     try {                                
//         await connection.query('START TRANSACTION');

//         try {
//             await asyncForEach(dao.comandosSql, (async (comandoSql) => {                                
//                 const [rows, fields] = await connection.query(comandoSql.query, comandoSql.parametros);
//                 results.push(rows);                
//             }));           
            
//             await connection.query('COMMIT');
//         } catch (err) {            
//             await connection.query('ROLLBACK');
//             throw err;
//         }

//         return results;
//     } catch (err) {
//         throw err;
//     } finally {
//         if (connection) {            
//             connection.release();
//         }        
//     }
// };